(function () {
    'use strict';

    const API_BASE = (window.API_BASE_URL || '').toString().replace(/\/+$/, '');

    function qs(sel, root = document) { return root.querySelector(sel); }

    function getToken() {
        try {
            return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
        } catch (e) {
            return '';
        }
    }

    async function apiFetch(url, options = {}) {
        const token = getToken();
        const headers = new Headers(options.headers || {});
        if (token) headers.set('Authorization', `Bearer ${token}`);

        const res = await fetch(url, {
            ...options,
            headers
        });

        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch (e) { json = null; }

        if (!res.ok) {
            const msg = (json && (json.message || json.error)) ? (json.message || json.error) : (text || `HTTP ${res.status}`);
            throw new Error(msg);
        }
        return json;
    }

    function formatMoney(n) {
        const v = parseInt(n ?? 0, 10) || 0;
        return `${v.toLocaleString('fr-FR')} FCFA`;
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resolveAssetUrl(url) {
        try {
            const raw = (url || '').toString().trim();
            if (!raw) return window.DEFAULT_IMAGE || '';
            if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
            if (raw.startsWith('/')) {
                const base = (window.location && window.location.origin) ? window.location.origin : '';
                return base + raw;
            }
            const basePath = (window.ASSETS_BASE_URL || '').toString().replace(/\/+$/, '');
            if (raw.startsWith('assets/')) return `${(window.location?.origin || '')}${(window.location?.pathname || '').split('/').slice(0,2).join('/')}/${raw}`;
            if (basePath) return `${basePath}/${raw.replace(/^\/+/, '')}`;
            return raw;
        } catch (e) {
            return url;
        }
    }

    function initSidebarFix() {
        const btn = qs('#adminSidebarToggle');
        const overlay = qs('#adminSidebarOverlay');
        const sidebar = qs('#adminSidebar');
        if (!btn || !sidebar) return;

        const isMobile = () => !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

        const close = () => {
            document.body.classList.remove('admin-sidebar-open');
            document.body.classList.remove('admin-no-scroll');
            if (overlay) overlay.setAttribute('aria-hidden', 'true');
        };

        const open = () => {
            document.body.classList.add('admin-sidebar-open');
            document.body.classList.add('admin-no-scroll');
            if (overlay) overlay.setAttribute('aria-hidden', 'false');
        };

        // Capture listener: prevents the existing admin.js bubble listener from firing on mobile.
        btn.addEventListener('click', (e) => {
            if (!isMobile()) return;
            e.preventDefault();
            e.stopPropagation();

            const willOpen = !document.body.classList.contains('admin-sidebar-open');
            if (willOpen) open();
            else close();
        }, true);

        if (overlay) {
            overlay.addEventListener('click', () => close(), { passive: true });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });

        window.addEventListener('resize', () => {
            if (!isMobile()) close();
        });

        // If the sidebar is open and user taps outside (safety net)
        document.addEventListener('click', (e) => {
            if (!document.body.classList.contains('admin-sidebar-open')) return;
            if (!isMobile()) return;
            const t = e.target;
            if (sidebar.contains(t) || btn.contains(t)) return;
            close();
        });
    }

    async function loadDashboardRealData() {
        // Dashboard widgets in dashboard.html
        const popularMenus = qs('#popularMenus');
        const featuredProducts = qs('#featuredProducts');
        const recentSales = qs('#recentSales');
        const customerActivity = qs('#customerActivity');

        // Only run if on dashboard page
        if (!popularMenus && !featuredProducts && !recentSales && !customerActivity) return;
        if (!API_BASE) return;

        // Popular menus: use admin menu endpoint (real DB)
        if (popularMenus) {
            popularMenus.innerHTML = '<div class="loading"><p>Chargement...</p></div>';
            try {
                const data = await apiFetch(`${API_BASE}/admin/menu.php`);
                const items = Array.isArray(data.menu) ? data.menu : [];
                const top = items.slice(0, 6);
                popularMenus.innerHTML = `
                    <div class="mini-items-grid">
                        ${top.map(m => `
                            <div class="mini-item" style="display:flex;gap:12px;align-items:center;" title="${escapeHtml(m.name)}">
                                <img src="${escapeHtml(resolveAssetUrl(m.image_url))}" alt="${escapeHtml(m.name)}" style="width:54px;height:54px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,0.08);background:#f3f3f3;" />
                                <div style="min-width:0;flex:1;">
                                    <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(m.name || '-')}</div>
                                    <div style="color:#666;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(m.category || '-')} • ${escapeHtml(String(m.price || 0))} FCFA</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (e) {
                popularMenus.innerHTML = '<p class="error-message">Impossible de charger les plats</p>';
            }
        }

        // Featured products: use admin products endpoint (real DB)
        if (featuredProducts) {
            featuredProducts.innerHTML = '<div class="loading"><p>Chargement...</p></div>';
            try {
                const data = await apiFetch(`${API_BASE}/admin/products.php`);
                const items = Array.isArray(data.data) ? data.data : (Array.isArray(data.products) ? data.products : []);
                const top = items.slice(0, 6);
                featuredProducts.innerHTML = `
                    <div class="mini-items-grid">
                        ${top.map(p => `
                            <div class="mini-item" style="display:flex;gap:12px;align-items:center;" title="${escapeHtml(p.name)}">
                                <img src="${escapeHtml(resolveAssetUrl(p.image_url || p.main_image))}" alt="${escapeHtml(p.name)}" style="width:54px;height:54px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,0.08);background:#f3f3f3;" />
                                <div style="min-width:0;flex:1;">
                                    <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name || '-')}</div>
                                    <div style="color:#666;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.category || '-')} • ${escapeHtml(String(p.price || 0))} FCFA</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (e) {
                featuredProducts.innerHTML = '<p class="error-message">Impossible de charger les produits</p>';
            }
        }

        // Recent sales: reuse admin orders endpoint (real DB)
        if (recentSales) {
            recentSales.innerHTML = '<div class="loading"><p>Chargement...</p></div>';
            try {
                const data = await apiFetch(`${API_BASE}/admin/orders.php?limit=6`);
                const orders = Array.isArray(data.orders) ? data.orders : [];
                recentSales.innerHTML = `
                    <div style="display:grid;gap:10px;">
                        ${orders.slice(0, 6).map(o => `
                            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:12px;background:#fff;">
                                <div style="min-width:0;">
                                    <div style="font-weight:800;">Commande #${escapeHtml(o.id)}</div>
                                    <div style="color:#666;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(o.customer_name || '-')}${o.customer_email ? ` • ${escapeHtml(o.customer_email)}` : ''}</div>
                                </div>
                                <div style="font-weight:800;white-space:nowrap;">${escapeHtml(formatMoney(o.final_price ?? o.total_price))}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (e) {
                recentSales.innerHTML = '<p class="error-message">Impossible de charger les ventes</p>';
            }
        }

        // Customer activity: reuse admin customers endpoint (real DB)
        if (customerActivity) {
            customerActivity.innerHTML = '<div class="loading"><p>Chargement...</p></div>';
            try {
                const data = await apiFetch(`${API_BASE}/admin/customers.php?limit=6`);
                const users = Array.isArray(data.customers) ? data.customers : [];
                customerActivity.innerHTML = `
                    <div style="display:grid;gap:10px;">
                        ${users.slice(0, 6).map(u => {
                            const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || '-';
                            return `
                                <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:12px;background:#fff;">
                                    <div style="min-width:0;">
                                        <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</div>
                                        <div style="color:#666;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.email || '-') }</div>
                                    </div>
                                    <div style="color:#666;font-size:12px;white-space:nowrap;">${escapeHtml(String(u.orders_count ?? 0))} cmd</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } catch (e) {
                customerActivity.innerHTML = '<p class="error-message">Impossible de charger les clients</p>';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        try { initSidebarFix(); } catch (e) {}
        try { loadDashboardRealData(); } catch (e) {}

        const syncBtn = qs('#syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                try { loadDashboardRealData(); } catch (e) {}
            });
        }
    });
})();
