/**
 * Dashboard Livreur - Titi Golden Taste
 * Gestion des livraisons, profil, statistiques, localisation, messagerie
 */

(function() {
    'use strict';

    function resolveApiBase(raw) {
        const v = (raw || '').toString().trim() || 'backend/api';
        if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/, '');
        if (v.startsWith('/')) return v.replace(/\/+$/, '');
        const p = (window.location && window.location.pathname) ? window.location.pathname : '/';
        const root = p.replace(/\/delivery\/.*/, '/');
        const base = root.replace(/\/+$/, '') + '/' + v.replace(/^\/+/, '');
        return base.replace(/\/+$/, '');
    }

    const API_BASE = resolveApiBase(typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'backend/api');
    let map, marker, locationWatchId = null;
    let isOnline = false;
    let pollTimer = null;
    let lastNotifyTs = 0;

    function getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    function toast(text, type = 'info') {
        if (typeof Toastify !== 'function') {
            try { console.log('[toast]', type, text); } catch (e) {}
            return;
        }
        const colors = {
            success: 'linear-gradient(to right, #00b09b, #96c93d)',
            error: 'linear-gradient(to right, #ff416c, #ff4b2b)',
            warning: 'linear-gradient(to right, #f7971e, #ffd200)',
            info: 'linear-gradient(to right, #2193b0, #6dd5ed)'
        };
        Toastify({
            text,
            duration: 2800,
            gravity: 'top',
            position: 'right',
            style: { background: colors[type] || colors.info },
        }).showToast();
    }

    async function apiFetch(path, options = {}) {
        const headers = Object.assign({}, options.headers || {});
        headers['Authorization'] = `Bearer ${getToken()}`;
        const res = await fetch(path, Object.assign({}, options, { headers }));
        let json = null;
        try { json = await res.json(); } catch (e) {}
        if (!res.ok) {
            const msg = (json && (json.message || json.error)) ? (json.message || json.error) : `Erreur HTTP ${res.status}`;
            throw new Error(msg);
        }
        return json;
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatMoney(value) {
        const n = parseInt(value ?? 0, 10) || 0;
        return `${n} FCFA`;
    }

    function formatDate(value) {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return d.toLocaleString('fr-FR');
    }

    // Vérifier l'authentification et le rôle livreur
    function checkDriverAccess() {
        const token = localStorage.getItem('auth_token');
        const userDataStr = localStorage.getItem('user_data');
        
        if (!token || !userDataStr) {
            window.location.href = '../login.html?redirect=delivery';
            return false;
        }

        try {
            const userData = JSON.parse(userDataStr);
            const role = userData.role || userData.role_name || '';
            
            // Seuls livreur et delivery peuvent accéder
            if (role !== 'livreur' && role !== 'delivery') {
                // Rediriger selon le rôle
                if (role === 'admin' || role === 'super_admin') {
                    window.location.href = '../admin/dashboard.html';
                } else {
                    window.location.href = '../index.html';
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.clear();
            window.location.href = '../login.html';
            return false;
        }
    }

    // Wrappers UI (compatibilité avec les onclick du template HTML)
    window.refreshOrders = function() {
        loadAssignedOrders();
        loadAvailableOrders();
        loadStats();
    };

    window.filterOrders = function() {
        // Le backend fournit déjà des filtres (type=history/active/assigned).
        // Ici on recharge simplement l'historique.
        loadOrders();
    };

    window.acceptOrder = async function(orderId) {
        const id = parseInt(orderId, 10);
        if (!id) return;
        try {
            await apiFetch(`${API_BASE}/drivers/order-action.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: id, action: 'accept' })
            });
            toast('Commande acceptée', 'success');
            loadAssignedOrders();
            loadStats();
        } catch (e) {
            toast(e.message || 'Erreur', 'error');
        }
    };

    window.rejectOrder = async function(orderId) {
        const id = parseInt(orderId, 10);
        if (!id) return;
        try {
            await apiFetch(`${API_BASE}/drivers/order-action.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: id, action: 'refuse' })
            });
            toast('Commande refusée', 'warning');
            loadAssignedOrders();
            loadStats();
        } catch (e) {
            toast(e.message || 'Erreur', 'error');
        }
    };

    window.markAllAsRead = function() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        container.querySelectorAll('.message-item.unread').forEach(el => el.classList.remove('unread'));
        toast('Messages marqués comme lus', 'success');
    };

    window.submitSupport = function() {
        const textarea = document.getElementById('supportMessage');
        const msg = (textarea ? textarea.value : '').trim();
        if (!msg) {
            toast('Veuillez saisir un message', 'warning');
            return;
        }
        apiFetch(`${API_BASE}/drivers/send-message.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        }).then(() => {
            if (textarea) textarea.value = '';
            toast('Message envoyé au support', 'success');
            setActiveSection('messages');
            loadMessages();
        }).catch(err => {
            toast(err.message || 'Erreur lors de l\'envoi', 'error');
        });
    };

    window.logout = function() {
        try {
            if (locationWatchId) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
        } catch (e) {}
        localStorage.clear();
        window.location.href = '../login.html';
    };

    window.simulateDelivery = function() {
        toast('Simulation non disponible (mode démo)', 'info');
    };

    window.showRoute = function() {
        toast('Itinéraire non disponible (à connecter à un service de routing)', 'info');
    };

    function setActiveSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        const section = document.getElementById(sectionId);
        if (section) section.classList.add('active');

        document.querySelectorAll('.driver-menu a').forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === `#${sectionId}`) a.classList.add('active');
        });

        try {
            if (window.history && typeof window.history.replaceState === 'function') {
                window.history.replaceState(null, '', `#${sectionId}`);
            } else {
                window.location.hash = sectionId;
            }
        } catch (e) {}

        loadSectionData(sectionId);
    }

    // Charger les statistiques
    async function loadStats() {
        try {
            const data = await apiFetch(`${API_BASE}/drivers/stats.php`);
            const s = data?.data || {};
            const todayDeliveries = document.getElementById('todayDeliveries');
            if (todayDeliveries) todayDeliveries.textContent = s.today_deliveries || 0;
            const todayEarnings = document.getElementById('todayEarnings');
            if (todayEarnings) todayEarnings.textContent = formatMoney(s.today_earnings || 0);
            const ratingEl = document.getElementById('rating');
            if (ratingEl) ratingEl.textContent = (parseFloat(s.rating || 0) || 0).toFixed(1);
            const activeOrder = document.getElementById('activeOrder');
            if (activeOrder) activeOrder.textContent = s.active_orders || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Charger les statistiques détaillées
    async function loadDetailedStats() {
        try {
            const data = await apiFetch(`${API_BASE}/drivers/stats.php`);
            const s = data?.data || {};
            const totalDeliveries = document.getElementById('totalDeliveries');
            if (totalDeliveries) totalDeliveries.textContent = s.total_deliveries || 0;
            const totalEarnings = document.getElementById('totalEarnings');
            if (totalEarnings) totalEarnings.textContent = formatMoney(s.today_earnings || 0);
            const avgTime = document.getElementById('avgTime');
            if (avgTime) avgTime.textContent = (s.avg_delivery_time || 0) + ' min';
            const satisfaction = document.getElementById('satisfaction');
            if (satisfaction) satisfaction.textContent = (s.satisfaction_rate || 0) + '%';
        } catch (error) {
            console.error('Error loading detailed stats:', error);
        }
    }

    // Initialiser la carte
    function initMap() {
        if (map) return;
        
        const mapEl = document.getElementById('map');
        if (!mapEl) return;

        map = L.map('map').setView([12.6392, -8.0029], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Obtenir la position actuelle
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 15);
                marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup('Votre position actuelle').openPopup();
            });
        }
    }

    // Partager la localisation en temps réel
    window.shareLocation = function() {
        if (!navigator.geolocation) {
            toast('La géolocalisation n\'est pas supportée par votre navigateur', 'error');
            return;
        }

        const statusEl = document.getElementById('locationStatus');
        const btn = document.getElementById('locationBtn');

        if (locationWatchId) {
            // Arrêter le partage
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
            if (statusEl) statusEl.innerHTML = '<i class="fas fa-info-circle"></i> Position non partagée';
            if (btn) btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Partager ma position';
            toast('Partage de localisation arrêté', 'info');
            return;
        }

        if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner"></i> Localisation en cours...';
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Localisation...';

        // Démarrer le partage
        locationWatchId = navigator.geolocation.watchPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                
                // Mettre à jour le marqueur
                if (marker) {
                    marker.setLatLng([lat, lng]);
                } else {
                    marker = L.marker([lat, lng]).addTo(map);
                }
                map.setView([lat, lng], 15);

                if (statusEl) {
                    statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:#28a745;"></i> Position partagée (lat: ${escapeHtml(lat.toFixed(5))}, lng: ${escapeHtml(lng.toFixed(5))})`;
                }
                if (btn) btn.innerHTML = '<i class="fas fa-stop"></i> Arrêter le partage';
                
                // Envoyer la position au serveur
                apiFetch(`${API_BASE}/drivers/update-location.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lng })
                }).catch(err => {
                    console.error('Error updating location:', err);
                    toast(err.message || 'Erreur serveur localisation', 'error');
                });
            },
            error => {
                console.error('Geolocation error:', error);
                if (locationWatchId) {
                    try { navigator.geolocation.clearWatch(locationWatchId); } catch (e) {}
                    locationWatchId = null;
                }
                if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur de géolocalisation';
                if (btn) btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Partager ma position';
                toast(error?.message || 'Erreur de géolocalisation', 'warning');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );

        toast('Partage de localisation activé', 'success');
    };

    // Basculer le statut en ligne/hors ligne
    window.toggleStatus = function() {
        isOnline = !isOnline;
        const badge = document.getElementById('statusBadge');
        if (badge) {
            badge.className = `status-badge ${isOnline ? 'online' : 'offline'}`;
            badge.innerHTML = `<i class="fas fa-circle"></i> ${isOnline ? 'En ligne' : 'Hors ligne'}`;
        }

        apiFetch(`${API_BASE}/drivers/update-status.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isOnline ? 'online' : 'offline' })
        }).catch(err => {
            console.error('Error updating status:', err);
            toast(err.message || 'Impossible de mettre à jour le statut', 'error');
            // revert UI
            isOnline = !isOnline;
            const badge2 = document.getElementById('statusBadge');
            if (badge2) {
                badge2.className = `status-badge ${isOnline ? 'online' : 'offline'}`;
                badge2.innerHTML = `<i class="fas fa-circle"></i> ${isOnline ? 'En ligne' : 'Hors ligne'}`;
            }
        });
    };

    // Charger les messages
    async function loadMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Chargement des messages...</p></div>';

        try {
            const data = await apiFetch(`${API_BASE}/drivers/messages.php`);
            const items = Array.isArray(data.data) ? data.data : [];
            renderMessages(items, container);
        } catch (error) {
            console.error('Error loading messages:', error);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    // Afficher les messages
    function renderMessages(messages, container) {
        if (messages.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#666;">Aucun message</p>';
            return;
        }

        // API returns newest first; show oldest -> newest for chat feel
        const ordered = messages.slice().reverse();
        const html = ordered.map(msg => {
            const sender = (msg.sender_name || '').toString().trim() || ((parseInt(msg.sender_id ?? 0, 10) === parseInt(localStorage.getItem('user_id') || '0', 10)) ? 'Moi' : 'Support');
            const initials = sender.split(' ').filter(Boolean).slice(0,2).map(s => s[0]).join('').toUpperCase() || 'S';
            return `
                <div class="message-item">
                    <div class="message-avatar">${escapeHtml(initials)}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <div class="message-sender">${escapeHtml(sender)}</div>
                            <div class="message-time">${escapeHtml(formatDate(msg.created_at))}</div>
                        </div>
                        <div class="message-text">${escapeHtml(msg.content || '')}</div>
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = html;
        try { container.scrollTop = container.scrollHeight; } catch (e) {}
    }

    // Envoyer un message
    window.sendMessage = function() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (!message) return;

        apiFetch(`${API_BASE}/drivers/send-message.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        })
        .then(() => {
            input.value = '';
            toast('Message envoyé', 'success');
            loadMessages();
        })
        .catch(err => {
            console.error('Error sending message:', err);
            toast(err.message || 'Erreur lors de l\'envoi', 'error');
        });
    };

    let currentOrderDetailId = null;

    function safeJsonParse(v) {
        if (!v) return null;
        if (typeof v === 'object') return v;
        try { return JSON.parse(v); } catch (e) { return null; }
    }

    function openOrderDetailModal(order) {
        const modal = document.getElementById('orderDetailModal');
        const body = document.getElementById('orderDetailBody');
        if (!modal || !body) return;

        currentOrderDetailId = parseInt(order?.id || 0, 10) || null;

        const items = safeJsonParse(order?.items_json) || [];
        const itemsHtml = Array.isArray(items) && items.length
            ? `<div style="margin-top:10px;">
                    <div style="font-weight:700;margin-bottom:6px;">Articles</div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${items.map(it => {
                            const n = it?.name ?? '';
                            const q = it?.qty ?? 1;
                            const p = it?.price ?? '';
                            const line = `${escapeHtml(String(n))} x${escapeHtml(String(q))}`;
                            const pr = p !== '' ? formatMoney(p) : '';
                            return `<div style="display:flex; justify-content:space-between; gap:10px;"><div>${line}</div><div style="color:#666;">${escapeHtml(pr)}</div></div>`;
                        }).join('')}
                    </div>
               </div>`
            : '';

        const deliveryFee = order?.delivery_fee ?? 0;
        const total = order?.total_price ?? 0;
        const finalP = order?.final_price ?? total;

        body.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div><div style="color:#666;font-size:12px;">ID Commande</div><div style="font-weight:700;">#${escapeHtml(String(order?.id || ''))}</div></div>
                <div><div style="color:#666;font-size:12px;">Statut</div><div style="font-weight:700;">${escapeHtml(String(order?.status || ''))}</div></div>
                <div><div style="color:#666;font-size:12px;">Client</div><div style="font-weight:700;">${escapeHtml(String(order?.customer_name || '-'))}</div></div>
                <div><div style="color:#666;font-size:12px;">Téléphone</div><div style="font-weight:700;">${escapeHtml(String(order?.customer_phone || '-'))}</div></div>
                <div style="grid-column: 1 / -1;"><div style="color:#666;font-size:12px;">Email</div><div style="font-weight:700;">${escapeHtml(String(order?.customer_email || '-'))}</div></div>
                <div style="grid-column: 1 / -1;"><div style="color:#666;font-size:12px;">Adresse de livraison</div><div style="font-weight:700;">${escapeHtml(String(order?.delivery_address || '-'))}</div></div>
                <div><div style="color:#666;font-size:12px;">Mode de paiement</div><div style="font-weight:700;">${escapeHtml(String(order?.payment_method || '-'))}</div></div>
                <div><div style="color:#666;font-size:12px;">Montant à payer</div><div style="font-weight:700;">${escapeHtml(formatMoney(finalP))}</div></div>
                <div><div style="color:#666;font-size:12px;">Prix commande</div><div style="font-weight:700;">${escapeHtml(formatMoney(total))}</div></div>
                <div><div style="color:#666;font-size:12px;">Frais livraison</div><div style="font-weight:700;">${escapeHtml(formatMoney(deliveryFee))}</div></div>
            </div>
            ${itemsHtml}
        `;

        modal.style.display = 'block';
    }

    function closeOrderDetailModal() {
        const modal = document.getElementById('orderDetailModal');
        if (modal) modal.style.display = 'none';
        currentOrderDetailId = null;
    }

    document.getElementById('closeOrderDetailBtn')?.addEventListener('click', closeOrderDetailModal);
    document.getElementById('orderDetailModal')?.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'orderDetailModal') closeOrderDetailModal();
    });

    document.getElementById('orderDetailAcceptBtn')?.addEventListener('click', async () => {
        if (!currentOrderDetailId) return;
        try {
            await apiFetch(`${API_BASE}/drivers/order-action.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: currentOrderDetailId, action: 'accept' })
            });
            toast('Commande acceptée', 'success');
            closeOrderDetailModal();
            loadAssignedOrders();
            loadOrders();
            loadStats();
        } catch (e) {
            toast(e.message || 'Erreur acceptation', 'error');
        }
    });

    document.getElementById('orderDetailRefuseBtn')?.addEventListener('click', async () => {
        if (!currentOrderDetailId) return;
        try {
            await apiFetch(`${API_BASE}/drivers/order-action.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: currentOrderDetailId, action: 'refuse' })
            });
            toast('Commande refusée', 'warning');
            closeOrderDetailModal();
            loadOrders();
        } catch (e) {
            toast(e.message || 'Erreur refus', 'error');
        }
    });

    // Charger les commandes (disponibles à prendre)
    async function loadOrders() {
        const container = document.getElementById('ordersList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Chargement des commandes...</p></div>';

        try {
            const data = await apiFetch(`${API_BASE}/drivers/available-orders.php?limit=100`);
            const orders = Array.isArray(data?.data?.orders) ? data.data.orders : [];
            if (!orders.length) {
                container.innerHTML = '<p style="text-align:center;color:#666;">Aucune commande disponible.</p>';
                return;
            }
            container.innerHTML = orders.map(o => {
                const status = (o.status || '').toString().toLowerCase();
                const statusClass = status === 'pending' ? 'status-pending' : 'status-accepted';
                return `
                    <div class="order-card" data-order-id="${escapeHtml(String(o.id || ''))}">
                        <div class="order-header">
                            <div class="order-id">Commande #${escapeHtml(o.id)}</div>
                            <div class="order-status ${statusClass}">${escapeHtml(o.status || '-')}</div>
                        </div>
                        <div class="order-details">
                            <div class="order-detail"><i class="fas fa-user"></i><span>${escapeHtml(o.customer_name || '-')}</span></div>
                            <div class="order-detail"><i class="fas fa-phone"></i><span>${escapeHtml(o.customer_phone || '-')}</span></div>
                            <div class="order-detail"><i class="fas fa-money-bill"></i><span>${escapeHtml(formatMoney(o.final_price || o.total_price))}</span></div>
                            <div class="order-detail"><i class="fas fa-clock"></i><span>${escapeHtml(formatDate(o.created_at))}</span></div>
                        </div>
                    </div>
                `;
            }).join('');

            // Click -> open detail modal
            container.querySelectorAll('.order-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = parseInt(card.getAttribute('data-order-id') || '0', 10);
                    const order = orders.find(x => parseInt(x.id || 0, 10) === id);
                    if (order) openOrderDetailModal(order);
                });
            });
        } catch (e) {
            console.error('Error loading orders:', e);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    async function loadAssignedOrders() {
        const container = document.getElementById('pendingOrders');
        if (!container) return;
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Chargement des commandes...</p></div>';
        try {
            const data = await apiFetch(`${API_BASE}/drivers/orders.php?type=assigned&limit=10`);
            const orders = Array.isArray(data?.data?.orders) ? data.data.orders : [];
            if (!orders.length) {
                container.innerHTML = '<p style="text-align:center;color:#666;">Aucune commande assignée.</p>';
                return;
            }

            container.innerHTML = orders.map(o => {
                return `
                    <div class="order-card" data-order-id="${escapeHtml(String(o.id || ''))}">
                        <div class="order-header">
                            <div class="order-id">${escapeHtml(String(o.id || ''))}</div>
                            <div class="order-status status-assigned">Assignée</div>
                        </div>
                        <div class="order-details">
                            <div class="order-detail"><i class="fas fa-user"></i><span>${escapeHtml(o.customer_name || '-')}</span></div>
                            <div class="order-detail"><i class="fas fa-phone"></i><span>${escapeHtml(o.customer_phone || '-')}</span></div>
                            <div class="order-detail"><i class="fas fa-money-bill"></i><span>${escapeHtml(formatMoney(o.final_price || o.total_price))}</span></div>
                            <div class="order-detail"><i class="fas fa-clock"></i><span>${escapeHtml(formatDate(o.updated_at || o.created_at))}</span></div>
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('.order-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = parseInt(card.getAttribute('data-order-id') || '0', 10);
                    const order = orders.find(x => parseInt(x.id || 0, 10) === id);
                    if (order) openOrderDetailModal(order);
                });
            });

        } catch (e) {
            console.error('Error loading assigned orders:', e);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    async function loadAvailableOrders() {
        const container = document.getElementById('ordersList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Chargement des commandes disponibles...</p></div>';
        try {
            // Charger les commandes assignées ET disponibles
            const [assignedData, availableData] = await Promise.all([
                apiFetch(`${API_BASE}/drivers/orders.php?type=assigned&limit=20`),
                apiFetch(`${API_BASE}/drivers/orders.php?type=available&limit=20`)
            ]);
            
            const assignedOrders = Array.isArray(assignedData?.data?.orders) ? assignedData.data.orders : [];
            const availableOrders = Array.isArray(availableData?.data?.orders) ? availableData.data.orders : [];
            
            // Combiner les deux listes
            const allOrders = [...assignedOrders, ...availableOrders];
            
            if (!allOrders.length) {
                container.innerHTML = '<p style="text-align:center;color:#666;">Aucune commande disponible.</p>';
                return;
            }

            container.innerHTML = allOrders.map(o => {
                const isAssigned = assignedOrders.some(a => a.id === o.id);
                const statusClass = isAssigned ? 'status-assigned' : 'status-pending';
                const statusText = isAssigned ? 'Assignée' : 'Disponible';
                
                return `
                    <div class="order-card" data-order-id="${escapeHtml(String(o.id || ''))}">
                        <div class="order-header">
                            <div class="order-id">${escapeHtml(String(o.id || ''))}</div>
                            <div class="order-status ${statusClass}">${statusText}</div>
                        </div>
                        <div class="order-details">
                            <div class="order-detail"><i class="fas fa-user"></i><span>${escapeHtml(o.customer_name || '-')}</span></div>
                            <div class="order-detail"><i class="fas fa-phone"></i><span>${escapeHtml(o.customer_phone || '-')}</span></div>
                            <div class="order-detail"><i class="fas fa-money-bill"></i><span>${escapeHtml(formatMoney(o.final_price || o.total_price))}</span></div>
                            <div class="order-detail"><i class="fas fa-clock"></i><span>${escapeHtml(formatDate(o.updated_at || o.created_at))}</span></div>
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('.order-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = parseInt(card.getAttribute('data-order-id') || '0', 10);
                    const order = allOrders.find(x => parseInt(x.id || 0, 10) === id);
                    if (order) openOrderDetailModal(order);
                });
            });

        } catch (e) {
            console.error('Error loading orders:', e);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    async function syncDriverStatus() {
        try {
            const me = await apiFetch(`${API_BASE}/drivers/me.php`);
            const d = me?.data?.driver || {};
            const available = parseInt(d.available ?? 0, 10) === 1;
            isOnline = available;
            const badge = document.getElementById('statusBadge');
            if (badge) {
                badge.className = `status-badge ${isOnline ? 'online' : 'offline'}`;
                badge.innerHTML = `<i class="fas fa-circle"></i> ${isOnline ? 'En ligne' : 'Hors ligne'}`;
            }
        } catch (e) {
            // ignore
        }
    }

    function startNotificationsPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
            try {
                const data = await apiFetch(`${API_BASE}/drivers/available-orders.php?since=${encodeURIComponent(lastNotifyTs || 0)}&limit=20`);
                const orders = Array.isArray(data?.data?.orders) ? data.data.orders : [];
                const serverTime = parseInt(data?.data?.server_time ?? 0, 10) || Math.floor(Date.now() / 1000);
                lastNotifyTs = serverTime;
                if (orders.length) {
                    // Simple notification (beep)
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.value = 880;
                        gain.gain.value = 0.04;
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        setTimeout(() => { try { osc.stop(); ctx.close(); } catch (e) {} }, 180);
                    } catch (e) {}
                    loadOrders();
                }
            } catch (e) {
                const msg = (e && e.message) ? String(e.message) : '';
                if (msg.toLowerCase().includes('driver_id')) {
                    toast('Schéma DB: colonne orders.driver_id manquante (veuillez exécuter la migration)', 'error');
                }
            }
        }, 10000);
    }

    // Charger le profil (user + driver)
    function loadProfile() {
        apiFetch(`${API_BASE}/drivers/me.php`)
            .then(data => {
                const u = data?.data?.user || {};
                const d = data?.data?.driver || {};
                window.__driverMeCache = { user: u, driver: d };
                
                // Informations personnelles
                const firstName = document.getElementById('firstName');
                if (firstName) firstName.value = u.first_name || '';
                const lastName = document.getElementById('lastName');
                if (lastName) lastName.value = u.last_name || '';
                const email = document.getElementById('email');
                if (email) email.value = u.email || '';
                const phone = document.getElementById('phone');
                if (phone) phone.value = u.phone || '';
                const address = document.getElementById('address');
                if (address) address.value = u.address || '';
                const maritalStatus = document.getElementById('maritalStatus');
                if (maritalStatus) maritalStatus.value = u.marital_status || '';
                const profession = document.getElementById('profession');
                if (profession) profession.value = u.profession || '';

                // Informations livreur
                const driverStatus = document.getElementById('driverStatus');
                if (driverStatus) driverStatus.value = (d.status || '').toString();
                const vehicle = document.getElementById('vehicleType');
                if (vehicle) {
                    vehicle.value = (d.vehicle_type || 'moto');
                    vehicle.setAttribute('disabled', 'disabled');
                }
                const vehicleBrand = document.getElementById('vehicleBrand');
                if (vehicleBrand) vehicleBrand.value = d.vehicle_brand || '';
                const vehicleModel = document.getElementById('vehicleModel');
                if (vehicleModel) vehicleModel.value = d.vehicle_model || '';
                const vehicleYear = document.getElementById('vehicleYear');
                if (vehicleYear) vehicleYear.value = d.vehicle_year ? String(d.vehicle_year) : '';
                const vehiclePlate = document.getElementById('vehiclePlate');
                if (vehiclePlate) vehiclePlate.value = d.vehicle_plate || '';

                // Informations d'identité
                const driverNameEl = document.getElementById('driverName');
                if (driverNameEl) {
                    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Livreur';
                    driverNameEl.textContent = name;
                }
                
                const avatarEl = document.getElementById('driverAvatar');
                if (avatarEl) {
                    const initials = `${u.first_name || ''}${u.last_name || ''}`.substring(0, 2).toUpperCase();
                    if (initials) {
                        avatarEl.innerHTML = initials;
                    } else {
                        avatarEl.innerHTML = '<i class="fas fa-user"></i>';
                    }
                }
                
                const idCardValue = document.getElementById('driverIdDisplay');
                if (idCardValue) {
                    idCardValue.textContent = d.driver_id ? `N° ${d.driver_id}` : 'N° ';
                }
                
                const ratingHeader = document.getElementById('driverRating');
                if (ratingHeader) {
                    const r = (parseFloat(d.rating || 0) || 0).toFixed(1);
                    ratingHeader.innerHTML = `<i class="fas fa-star"></i> ${escapeHtml(r)}`;
                }

                setProfileEditMode(false);
            })
            .catch(err => {
                console.error('Error loading profile:', err);
                toast(err.message || 'Erreur profil', 'error');
            });
    }

    function setInputEnabled(id, enabled) {
        const el = document.getElementById(id);
        if (!el) return;
        if (enabled) el.removeAttribute('disabled');
        else el.setAttribute('disabled', 'disabled');
    }

    function setProfileEditMode(enabled) {
        // Champs autorisés à l'édition
        const editableFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'maritalStatus', 'profession'];
        
        editableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (enabled) {
                    field.removeAttribute('disabled');
                    field.style.background = 'white';
                    field.style.borderColor = 'var(--primary-color)';
                } else {
                    field.setAttribute('disabled', 'disabled');
                    field.style.background = '#f8f9fa';
                    field.style.borderColor = '#e9ecef';
                }
            }
        });

        // Champs jamais éditables
        const nonEditableFields = ['driverStatus', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate'];
        nonEditableFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.setAttribute('disabled', 'disabled');
                field.style.background = '#f8f9fa';
                field.style.borderColor = '#e9ecef';
            }
        });

        // Gestion des boutons
        const editBtn = document.getElementById('editProfileBtn');
        const saveBtn = document.getElementById('saveProfileBtn');
        const cancelBtn = document.getElementById('cancelProfileBtn');
        
        if (editBtn) editBtn.disabled = enabled;
        if (saveBtn) saveBtn.disabled = !enabled;
        if (cancelBtn) cancelBtn.disabled = !enabled;
        
        // Afficher/masquer les boutons
        if (editBtn) editBtn.style.display = enabled ? 'none' : 'inline-flex';
        if (saveBtn) saveBtn.style.display = enabled ? 'inline-flex' : 'none';
        if (cancelBtn) cancelBtn.style.display = enabled ? 'inline-flex' : 'none';
    }

    // Compat onchange="updateStats()" du select
    window.updateStats = function() {
        loadDetailedStats();
    };

    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
        // Événements du profil
        document.getElementById('editProfileBtn')?.addEventListener('click', function() {
            setProfileEditMode(true);
        });

        document.getElementById('cancelProfileBtn')?.addEventListener('click', function() {
            const cache = window.__driverMeCache || {};
            const u = cache.user || {};
            const firstName = document.getElementById('firstName');
            if (firstName) firstName.value = u.first_name || '';
            const lastName = document.getElementById('lastName');
            if (lastName) lastName.value = u.last_name || '';
            const email = document.getElementById('email');
            if (email) email.value = u.email || '';
            const phone = document.getElementById('phone');
            if (phone) phone.value = u.phone || '';
            const address = document.getElementById('address');
            if (address) address.value = u.address || '';
            const maritalStatus = document.getElementById('maritalStatus');
            if (maritalStatus) maritalStatus.value = u.marital_status || '';
            const profession = document.getElementById('profession');
            if (profession) profession.value = u.profession || '';

            setProfileEditMode(false);
        });

        // Sauvegarder le profil (champs autorisés uniquement)
        document.getElementById('profileForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                marital_status: document.getElementById('maritalStatus')?.value || '',
                profession: document.getElementById('profession')?.value || ''
            };

            try {
                const res = await apiFetch(`${API_BASE}/drivers/update-profile.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                window.__driverMeCache = { user: res?.data?.user || formData, driver: (window.__driverMeCache || {}).driver || {} };
                toast('Profil mis à jour', 'success');
                setProfileEditMode(false);
            } catch (error) {
                console.error('Error updating profile:', error);
                toast(error.message || 'Erreur lors de la mise à jour', 'error');
            }
        });

        // Charger les données d'une section
        function loadSectionData(sectionId) {
            switch(sectionId) {
                case 'location':
                    initMap();
                    break;
                case 'messages':
                    loadMessages();
                    break;
                case 'stats':
                    loadDetailedStats();
                    break;
                case 'orders':
                    loadAvailableOrders();
                    break;
                case 'profile':
                    loadProfile();
                    break;
            }
        }

        // Navigation
        window.showSection = function(sectionId) {
            setActiveSection(sectionId);
        };

        // Vérifier l'accès livreur
        if (!checkDriverAccess()) {
            return;
        }

        // Afficher le nom du livreur
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        const driverNameEl = document.getElementById('driverName');
        if (driverNameEl) {
            driverNameEl.textContent = (userData.first_name || 'Livreur') + ' ' + (userData.last_name || '');
        }

        // Navigation
        document.querySelectorAll('.driver-menu a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href') || '';
                if (!href.startsWith('#')) return;
                e.preventDefault();
                const target = href.substring(1);
                setActiveSection(target);
            });
        });

        // Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (locationWatchId) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
            localStorage.clear();
            window.location.href = '../login.html';
        });

        // Restore section from hash
        const initial = (window.location.hash || '').replace('#', '') || 'dashboard';
        setActiveSection(initial);

        // Charger les données initiales
        syncDriverStatus();
        apiFetch(`${API_BASE}/drivers/me.php`).then(me => {
            const u = me?.data?.user || {};
            const d = me?.data?.driver || {};
            const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Livreur';
            const driverNameEl = document.getElementById('driverName');
            if (driverNameEl) driverNameEl.textContent = name;
            const avatarEl = document.getElementById('driverAvatar');
            if (avatarEl) {
                const initials = `${u.first_name || ''}${u.last_name || ''}`.substring(0, 2).toUpperCase();
                avatarEl.textContent = initials;
            }
            const ratingHeader = document.getElementById('driverRating');
            if (ratingHeader) {
                const r = (parseFloat(d.rating || 0) || 0).toFixed(1);
                ratingHeader.innerHTML = `<i class="fas fa-star" style="color:#ffc107;"></i> ${escapeHtml(r)}`;
            }

            // Auto online for approved drivers (keeps UI consistent with DB)
            const drvStatus = (d.status || '').toString().toLowerCase();
            const available = parseInt(d.available ?? 0, 10) === 1;
            if (drvStatus === 'approved' && !available) {
                apiFetch(`${API_BASE}/drivers/update-status.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'online' })
                }).then(() => {
                    isOnline = true;
                    const badge = document.getElementById('statusBadge');
                    if (badge) {
                        badge.className = 'status-badge online';
                        badge.innerHTML = '<i class="fas fa-circle"></i> En ligne';
                    }
                }).catch(() => {});
            }
        }).catch(() => {});
        loadStats();
        loadAssignedOrders();
        startNotificationsPolling();
    });

    // Charger les données d'une section
    function loadSectionData(sectionId) {
        switch(sectionId) {
            case 'location':
                initMap();
                break;
            case 'messages':
                loadMessages();
                break;
            case 'stats':
                loadDetailedStats();
                break;
            case 'orders':
                loadAvailableOrders();
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }

    // Navigation
    window.showSection = function(sectionId) {
        setActiveSection(sectionId);
    };

})();
