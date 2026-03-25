(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function normalizeRole(rawRole) {
        const role = String(rawRole || '').trim().toLowerCase();
        if (!role) return 'client';
        if (role === 'super_admin' || role === 'administrator') return 'admin';
        if (role === 'delivery') return 'livreur';
        return role;
    }

    function roleLabel(role) {
        if (role === 'admin') return 'Administration';
        if (role === 'livreur') return 'Livreur';
        return 'Client';
    }

    function getCurrentRole() {
        try {
            const roleFromStorage = localStorage.getItem('user_role');
            if (roleFromStorage) return normalizeRole(roleFromStorage);

            const rawUser = localStorage.getItem('user_data');
            if (!rawUser) return 'client';
            const user = JSON.parse(rawUser);
            return normalizeRole(user.role || user.user_role || user.role_name);
        } catch (e) {
            return 'client';
        }
    }

    function getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    function formatDateTime(input) {
        if (!input) return '';
        const d = new Date(input);
        if (Number.isNaN(d.getTime())) return String(input);
        return d.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getFallbackNotifications(role) {
        const now = new Date().toISOString();
        if (role === 'admin') {
            return [
                {
                    id: 'fb-admin-1',
                    type: 'system',
                    title: 'Tableau de bord',
                    content: 'Connectez-vous pour voir les notifications admin en direct.',
                    created_at: now,
                    read_at: now
                }
            ];
        }
        if (role === 'livreur') {
            return [
                {
                    id: 'fb-driver-1',
                    type: 'delivery',
                    title: 'Livraisons',
                    content: 'Connectez-vous pour afficher vos assignations de livraison.',
                    created_at: now,
                    read_at: now
                }
            ];
        }
        return [
            {
                id: 'fb-client-1',
                type: 'info',
                title: 'Bienvenue',
                content: 'Connectez-vous pour recevoir vos notifications de commande.',
                created_at: now,
                read_at: now
            }
        ];
    }

    async function fetchNotifications(role) {
        const token = getToken();
        if (!token) {
            return {
                role,
                notifications: getFallbackNotifications(role)
            };
        }

        const base = window.API_BASE_URL || 'backend/api';
        const url = `${base}/notifications/list.php?limit=30&role=${encodeURIComponent(role)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const raw = await response.text();
        let json = null;
        try {
            json = raw ? JSON.parse(raw) : null;
        } catch (e) {
            throw new Error('Reponse notifications invalide');
        }

        if (!response.ok || !json || json.success === false) {
            const msg = (json && json.message) ? json.message : `Erreur HTTP ${response.status}`;
            throw new Error(msg);
        }

        const payload = json.data || {};
        const apiRole = normalizeRole(payload.role || role);
        const list = Array.isArray(payload.notifications)
            ? payload.notifications
            : (Array.isArray(json.notifications) ? json.notifications : []);

        return {
            role: apiRole,
            notifications: list
        };
    }

    function renderModalContent(modal, role, notifications) {
        const roleLabelEl = modal.querySelector('#notificationRoleLabel');
        const listEl = modal.querySelector('#notificationList');
        const emptyEl = modal.querySelector('#notificationEmpty');

        if (!listEl || !emptyEl) return;

        if (roleLabelEl) {
            roleLabelEl.textContent = `Type utilisateur: ${roleLabel(role)}`;
        }

        if (!Array.isArray(notifications) || notifications.length === 0) {
            listEl.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';

        listEl.innerHTML = notifications.map((item) => {
            const title = escapeHtml(item.title || 'Notification');
            const content = escapeHtml(item.content || item.message || '');
            const type = escapeHtml(item.type || 'info');
            const createdAt = formatDateTime(item.created_at || item.createdAt || '');
            const unread = !item.read_at;

            return `
                <article class="notification-item ${unread ? 'unread' : ''}">
                    <h4 class="notification-item-title">${title}</h4>
                    <p class="notification-item-content">${content}</p>
                    <div class="notification-item-meta">
                        <span class="notification-type">${type}</span>
                        <span>${createdAt}</span>
                    </div>
                </article>
            `;
        }).join('');
    }

    function updateNotificationBadge(count) {
        const badges = Array.from(document.querySelectorAll('[data-notification-count], #notificationCount'));
        badges.forEach((badge) => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        });
    }

    async function refreshNotifications(modal, options) {
        const role = getCurrentRole();

        try {
            const payload = await fetchNotifications(role);
            const list = Array.isArray(payload.notifications) ? payload.notifications : [];
            const unreadCount = list.filter((n) => !n.read_at).length;
            updateNotificationBadge(unreadCount);
            renderModalContent(modal, payload.role || role, list);
            if (options && options.silent !== true) {
                const toggleBtn = document.getElementById('notificationToggleBtn');
                if (toggleBtn) toggleBtn.dataset.lastRefresh = String(Date.now());
            }
        } catch (error) {
            console.warn('Notifications indisponibles:', error);
            const fallback = getFallbackNotifications(role);
            updateNotificationBadge(fallback.length);
            renderModalContent(modal, role, fallback);
        }
    }

    function openModal(modal, toggleBtn) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        if (typeof window.lockPageScroll === 'function') window.lockPageScroll();
    }

    function closeModal(modal, toggleBtn) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        if (typeof window.unlockPageScroll === 'function') window.unlockPageScroll();
    }

    document.addEventListener('DOMContentLoaded', function () {
        const toggleBtn = document.getElementById('notificationToggleBtn');
        const modal = document.getElementById('notificationModal');
        if (!toggleBtn || !modal) return;

        const closeBtn = document.getElementById('notificationModalClose');

        toggleBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            await refreshNotifications(modal);
            openModal(modal, toggleBtn);
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                closeModal(modal, toggleBtn);
            });
        }

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeModal(modal, toggleBtn);
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal(modal, toggleBtn);
            }
        });

        refreshNotifications(modal, { silent: true }).catch(function () {});
        setInterval(function () {
            refreshNotifications(modal, { silent: true }).catch(function () {});
        }, 45000);
    });
})();
