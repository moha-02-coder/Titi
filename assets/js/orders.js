(function () {
    'use strict';

    const state = {
        orders: [],
        filter: 'all'
    };

    const statusConfig = {
        pending: { label: 'En attente', className: 'status-pending' },
        assigned: { label: 'Assignee', className: 'status-assigned' },
        preparing: { label: 'En preparation', className: 'status-preparing' },
        delivery: { label: 'En livraison', className: 'status-delivery' },
        completed: { label: 'Terminee', className: 'status-completed' },
        cancelled: { label: 'Annulee', className: 'status-cancelled' }
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatMoney(value) {
        const amount = parseInt(value ?? 0, 10) || 0;
        try {
            return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
        } catch (e) {
            return `${amount} FCFA`;
        }
    }

    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getStatusInfo(rawStatus) {
        const key = String(rawStatus || 'pending').toLowerCase();
        const config = statusConfig[key] || statusConfig.pending;
        return {
            key,
            label: config.label,
            className: config.className
        };
    }

    function normalizeOrderList(payload) {
        if (Array.isArray(payload?.orders)) return payload.orders;
        if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
    }

    function getItemsCount(order) {
        const directCount = parseInt(order?.items_count ?? order?.itemsCount ?? 0, 10) || 0;
        if (directCount > 0) return directCount;

        const rawItems = order?.items_json || order?.items || null;
        if (!rawItems) return 0;

        if (Array.isArray(rawItems)) return rawItems.length;
        try {
            const parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
            return Array.isArray(parsed) ? parsed.length : 0;
        } catch (e) {
            return 0;
        }
    }

    function getTotal(order) {
        if (order?.final_price !== undefined && order?.final_price !== null) return parseInt(order.final_price, 10) || 0;
        if (order?.total !== undefined && order?.total !== null) return parseInt(order.total, 10) || 0;
        if (order?.total_price !== undefined && order?.total_price !== null) return parseInt(order.total_price, 10) || 0;
        return 0;
    }

    function paymentLabel(raw) {
        const key = String(raw || 'cash').toLowerCase();
        if (key === 'mobile_money' || key === 'mobile') return 'Mobile Money';
        if (key === 'card') return 'Carte bancaire';
        return 'Paiement a la livraison';
    }

    function getApiUrl() {
        const base = (window.API_BASE_URL || 'backend/api').replace(/\/+$/, '');
        return `${base}/orders/user-orders.php`;
    }

    function getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function setVisibility({ loading, error, empty, list }) {
        const loadingEl = byId('ordersLoading');
        const errorEl = byId('ordersError');
        const emptyEl = byId('ordersEmpty');
        const listEl = byId('ordersList');

        if (loadingEl) loadingEl.style.display = loading ? '' : 'none';
        if (errorEl) errorEl.style.display = error ? '' : 'none';
        if (emptyEl) emptyEl.style.display = empty ? '' : 'none';
        if (listEl) listEl.style.display = list ? '' : 'none';
    }

    function renderAuthRequired() {
        const emptyEl = byId('ordersEmpty');
        if (!emptyEl) return;
        emptyEl.innerHTML = `
            <i class="fas fa-user-lock"></i>
            <h3>Connexion requise</h3>
            <p>Connectez-vous pour voir vos commandes.</p>
            <a href="login.html?redirect=orders" class="btn btn-primary">
                <i class="fas fa-sign-in-alt"></i> Se connecter
            </a>
        `;
    }

    function renderError(message) {
        const errorEl = byId('ordersError');
        if (!errorEl) return;
        const safe = escapeHtml(message || 'Impossible de charger vos commandes.');
        errorEl.innerHTML = `
            <i class="fas fa-triangle-exclamation"></i>
            <h3>Impossible de charger vos commandes</h3>
            <p>${safe}</p>
        `;
    }

    function renderOrders() {
        const listEl = byId('ordersList');
        if (!listEl) return;

        const filterKey = String(state.filter || 'all').toLowerCase();
        const source = Array.isArray(state.orders) ? state.orders : [];
        const filtered = source.filter((order) => {
            if (filterKey === 'all') return true;
            return String(order?.status || '').toLowerCase() === filterKey;
        });

        if (!filtered.length) {
            setVisibility({ loading: false, error: false, empty: true, list: false });
            return;
        }

        listEl.innerHTML = filtered.map((order) => {
            const id = order?.id ?? '';
            const status = getStatusInfo(order?.status);
            const createdAt = formatDate(order?.created_at || order?.createdAt);
            const total = formatMoney(getTotal(order));
            const itemsCount = getItemsCount(order);
            const payment = paymentLabel(order?.payment_method);
            const address = order?.delivery_address || 'Adresse non renseignee';
            const trackHref = id ? `order-confirmation.html?id=${encodeURIComponent(id)}` : 'order-confirmation.html';

            return `
                <article class="order-card">
                    <div class="order-card-head">
                        <div>
                            <h3 class="order-title">Commande #${escapeHtml(id || '-')}</h3>
                            <div class="order-subtitle">${escapeHtml(createdAt)}</div>
                        </div>
                        <span class="order-status ${status.className}">${status.label}</span>
                    </div>
                    <div class="order-card-body">
                        <div class="order-line">
                            <span>Articles</span>
                            <strong>${escapeHtml(itemsCount)}</strong>
                        </div>
                        <div class="order-line">
                            <span>Total</span>
                            <strong>${escapeHtml(total)}</strong>
                        </div>
                        <div class="order-line">
                            <span>Paiement</span>
                            <strong>${escapeHtml(payment)}</strong>
                        </div>
                        <div class="order-line">
                            <span>Livraison</span>
                            <strong>${escapeHtml(address)}</strong>
                        </div>
                    </div>
                    <div class="order-card-actions">
                        <a class="btn btn-primary" href="${trackHref}">
                            <i class="fas fa-receipt"></i> Details
                        </a>
                        <a class="btn btn-outline" href="index.html#order">
                            <i class="fas fa-utensils"></i> Commander encore
                        </a>
                    </div>
                </article>
            `;
        }).join('');

        setVisibility({ loading: false, error: false, empty: false, list: true });
    }

    async function loadOrders() {
        const token = getToken();
        if (!token) {
            renderAuthRequired();
            setVisibility({ loading: false, error: false, empty: true, list: false });
            return;
        }

        setVisibility({ loading: true, error: false, empty: false, list: false });

        try {
            const response = await fetch(getApiUrl(), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const text = await response.text();
            let payload = null;
            try {
                payload = text ? JSON.parse(text) : null;
            } catch (e) {
                throw new Error('Reponse JSON invalide');
            }

            if (!response.ok || (payload && payload.success === false)) {
                throw new Error((payload && payload.message) || `Erreur HTTP ${response.status}`);
            }

            state.orders = normalizeOrderList(payload);
            renderOrders();
        } catch (error) {
            renderError(error?.message || 'Erreur inconnue');
            setVisibility({ loading: false, error: true, empty: false, list: false });
        }
    }

    function bindEvents() {
        const refreshBtn = byId('refreshOrdersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadOrders());
        }

        const filterSelect = byId('orderStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                state.filter = filterSelect.value || 'all';
                renderOrders();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
        loadOrders();
    });
})();

