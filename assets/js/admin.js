/**
 * Dashboard Admin - Titi Golden Taste
 * Gestion complète du restaurant et de la boutique
 */

(function() {
    'use strict';

    let ASSET_BUST = 0;

    function bustUrl(url) {
        const u = (url || '').toString();
        if (!ASSET_BUST) return u;
        if (!u) return u;
        if (u.startsWith('data:')) return u;
        if (/^https?:\/\//i.test(u)) return u;
        const sep = u.includes('?') ? '&' : '?';
        return `${u}${sep}v=${ASSET_BUST}`;
    }

    function resolveSiteRoot() {
        const p = (window.location && window.location.pathname) ? window.location.pathname : '/';
        return p.replace(/\/admin\/.*/, '/').replace(/\/+$/, '');
    }

    function resolveAssetUrl(raw, fallbackRelative = '../assets/images/default.jpg') {
        const v = (raw || '').toString().trim();
        if (!v) return fallbackRelative;
        if (/^https?:\/\//i.test(v)) return v;
        if (v.startsWith('data:')) return v;
        if (v.startsWith('../') || v.startsWith('./')) return v;

        const root = resolveSiteRoot();
        // avoid noisy 404 for legacy/non-existent asset folders
        if (/^assets\/(images\/menu|images\/menus|images\/products|images\/product)\//i.test(v)) {
            return fallbackRelative;
        }

        if (v.startsWith('/')) {
            // absolute URL within host (keep as-is)
            return bustUrl(v);
        }
        // common relative paths stored in DB: assets/... backend/... etc.
        return bustUrl(`${root}/${v.replace(/^\/+/, '')}`);
    }

    function resolveApiBase(raw) {
        const v = (raw || '').toString().trim() || 'backend/api';
        if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/, '');
        if (v.startsWith('/')) return v.replace(/\/+$/, '');
        const p = (window.location && window.location.pathname) ? window.location.pathname : '/';
        const root = p.replace(/\/admin\/.*/, '/');
        const base = root.replace(/\/+$/, '') + '/' + v.replace(/^\/+/, '');
        return base.replace(/\/+$/, '');
    }

    const API_BASE = resolveApiBase(typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'backend/api');

    const state = {
        menus: [],
        products: [],
        orders: [],
        customers: [],
        drivers: []
    };

    function qs(sel, root = document) { return root.querySelector(sel); }
    function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

    function getToken() {
        return localStorage.getItem('auth_token') || '';
    }

    function getUserData() {
        try {
            return JSON.parse(localStorage.getItem('user_data') || 'null');
        } catch (e) {
            return null;
        }
    }

    function normalizeRole(user) {
        const role = (user && (user.role || user.user_role || user.role_name)) ? (user.role || user.user_role || user.role_name) : '';
        return String(role || '').toLowerCase();
    }

    function toast(type, title, message, duration = 4500) {
        const container = qs('.toast-container');
        if (!container) return;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML = `
            <div class="toast-icon"><i class="${icons[type] || icons.info}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title || ''}</div>
                <div class="toast-message">${message || ''}</div>
            </div>
            <button class="toast-close" type="button" aria-label="Fermer"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(el);
        setTimeout(() => el.classList.add('show'), 10);

        const close = () => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 250);
        };

        const btn = qs('.toast-close', el);
        if (btn) btn.addEventListener('click', close);
        if (duration) setTimeout(close, duration);
    }

    const Modal = {
        open(title, bodyHtml, footerHtml = '') {
            const modal = qs('#adminModal');
            if (!modal) return;
            const t = qs('#adminModalTitle');
            const b = qs('#adminModalBody');
            const f = qs('#adminModalFooter');
            if (t) t.textContent = title || 'Modal';
            if (b) b.innerHTML = bodyHtml || '';
            if (f) f.innerHTML = footerHtml || '';
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('admin-modal-open');
        },
        close() {
            const modal = qs('#adminModal');
            if (!modal) return;
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('admin-modal-open');
        }
    };

    const Confirm = {
        _resolver: null,
        ask(message, title = 'Confirmation') {
            const dialog = qs('#adminConfirm');
            if (!dialog) return Promise.resolve(false);
            const t = qs('#adminConfirmTitle');
            const b = qs('#adminConfirmBody');
            if (t) t.textContent = title;
            if (b) b.innerHTML = `<p>${message || ''}</p>`;
            dialog.setAttribute('aria-hidden', 'false');
            document.body.classList.add('admin-modal-open');
            return new Promise(resolve => {
                this._resolver = resolve;
            });
        },
        close(result) {
            const dialog = qs('#adminConfirm');
            if (!dialog) return;
            dialog.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('admin-modal-open');
            if (this._resolver) {
                this._resolver(!!result);
                this._resolver = null;
            }
        }
    };

    function bindModalCloseHandlers() {
        const closeIf = (el, handler) => {
            if (!el) return;
            el.addEventListener('click', (e) => {
                const t = e.target;
                if (t && (t.dataset.close === 'true' || t.closest('[data-close="true"]'))) {
                    handler();
                }
            });
        };
        closeIf(qs('#adminModal'), () => Modal.close());
        closeIf(qs('#adminConfirm'), () => Confirm.close(false));

        const ok = qs('#adminConfirmOk');
        const cancel = qs('#adminConfirmCancel');
        if (ok) ok.addEventListener('click', () => Confirm.close(true));
        if (cancel) cancel.addEventListener('click', () => Confirm.close(false));
    }

    async function apiFetch(path, options = {}) {
        const token = getToken();
        const headers = Object.assign({}, options.headers || {});
        headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(path, Object.assign({}, options, { headers }));

        let json = null;
        try {
            json = await res.json();
        } catch (e) {
            // ignore
        }
        if (!res.ok) {
            const msg = (json && (json.message || json.error)) ? (json.message || json.error) : `Erreur HTTP ${res.status}`;
            throw new Error(msg);
        }
        return json;
    }

    function debounce(fn, wait = 200) {
        let t;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    function safeText(v) {
        return String(v ?? '').toLowerCase();
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

    function badge(html, cls) {
        return `<span class="badge ${cls}">${html}</span>`;
    }

    function badgeForOrderStatus(status) {
        const s = String(status || '').toLowerCase();
        switch (s) {
            case 'completed':
                return badge('Terminée', 'badge-success');
            case 'delivery':
                return badge('Livraison', 'badge-info');
            case 'preparing':
                return badge('Préparation', 'badge-warning');
            case 'confirmed':
                return badge('Confirmée', 'badge-info');
            case 'cancelled':
                return badge('Annulée', 'badge-danger');
            case 'pending':
            default:
                return badge('En attente', 'badge-muted');
        }
    }

    function badgeForBool(v, yes = 'Oui', no = 'Non') {
        return v ? badge(yes, 'badge-success') : badge(no, 'badge-muted');
    }

    function openJsonModal(title, obj) {
        const body = `<pre style="margin:0;white-space:pre-wrap;word-break:break-word;">${escapeHtml(JSON.stringify(obj, null, 2))}</pre>`;
        const footer = `<button class="btn" type="button" data-close="true">Fermer</button>`;
        Modal.open(title, body, footer);
    }

    function dlRow(label, value) {
        return `
            <div class="detail-item">
                <div class="detail-label">${escapeHtml(label)}</div>
                <div class="detail-value">${value}</div>
            </div>
        `;
    }

    function formatMaybe(v) {
        if (v === null || v === undefined || v === '') return '<span class="muted">-</span>';
        return escapeHtml(String(v));
    }

    function formatBoolBadge(v) {
        return badgeForBool(!!parseInt(v ?? 0, 10), 'Oui', 'Non');
    }

    function openMenuDetails(menu) {
        const title = `Plat #${menu.id}`;
        const img = escapeHtml(resolveAssetUrl(menu.image_url, '../assets/images/default.jpg'));
        const body = `
            <div class="detail-card">
                <div class="detail-head">
                    <img class="detail-image" src="${img}" alt="${escapeHtml(menu.name || 'Plat')}" onerror="this.onerror=null;this.src='../assets/images/default.jpg';">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(menu.name || '-')}</div>
                        <div class="detail-sub">${escapeHtml(menu.category || '-')} • ${formatMoney(menu.price ?? 0)}</div>
                        <div class="detail-badges">
                            ${formatBoolBadge(menu.available)}
                            ${badgeForBool(!!menu.is_today, 'Menu du jour', 'Pas du jour')}
                        </div>
                    </div>
                </div>

                <div class="detail-grid">
                    ${dlRow('ID', formatMaybe(menu.id))}
                    ${dlRow('Catégorie', formatMaybe(menu.category))}
                    ${dlRow('Prix', formatMoney(menu.price ?? 0))}
                    ${dlRow('Disponible', formatBoolBadge(menu.available))}
                    ${dlRow('Menu du jour', formatBoolBadge(menu.is_today))}
                    ${dlRow('Créé le', formatMaybe(formatDate(menu.created_at))) }
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Description</div>
                    <div class="detail-text">${escapeHtml(menu.description || '-') }</div>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn" type="button" data-close="true">Fermer</button>
            <button class="btn btn-danger" type="button" id="deleteMenuFromModal">Supprimer</button>
            <button class="btn btn-primary" type="button" id="editMenuFromModal">Modifier</button>
        `;

        Modal.open(title, body, footer);
        const editBtn = qs('#editMenuFromModal');
        if (editBtn) editBtn.addEventListener('click', () => { Modal.close(); openMenuForm(menu); });
        const delBtn = qs('#deleteMenuFromModal');
        if (delBtn) delBtn.addEventListener('click', async () => { await deleteMenu(menu.id); Modal.close(); });
    }

    function openProductDetails(product) {
        const title = `Produit #${product.id}`;
        const img = escapeHtml(resolveAssetUrl(product.image_url || product.main_image, '../assets/images/default.jpg'));
        const stock = product.stock ?? product.stock_quantity ?? 0;
        const body = `
            <div class="detail-card">
                <div class="detail-head">
                    <img class="detail-image" src="${img}" alt="${escapeHtml(product.name || 'Produit')}" onerror="this.onerror=null;this.src='../assets/images/default.jpg';">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(product.name || '-')}</div>
                        <div class="detail-sub">${escapeHtml(product.category || '-')} • ${formatMoney(product.price ?? 0)}</div>
                        <div class="detail-badges">
                            ${badge(escapeHtml(`Stock: ${stock}`), stock > 0 ? 'badge-success' : 'badge-danger')}
                        </div>
                    </div>
                </div>

                <div class="detail-grid">
                    ${dlRow('ID', formatMaybe(product.id))}
                    ${dlRow('Catégorie', formatMaybe(product.category))}
                    ${dlRow('Prix', formatMoney(product.price ?? 0))}
                    ${dlRow('Stock', formatMaybe(stock))}
                    ${dlRow('Créé le', formatMaybe(formatDate(product.created_at))) }
                </div>

                <div class="detail-section">
                    <div class="detail-section-title">Description</div>
                    <div class="detail-text">${escapeHtml(product.description || '-') }</div>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn" type="button" data-close="true">Fermer</button>
            <button class="btn btn-danger" type="button" id="deleteProductFromModal">Supprimer</button>
            <button class="btn btn-primary" type="button" id="editProductFromModal">Modifier</button>
        `;

        Modal.open(title, body, footer);
        const editBtn = qs('#editProductFromModal');
        if (editBtn) editBtn.addEventListener('click', () => { Modal.close(); openProductForm(product); });
        const delBtn = qs('#deleteProductFromModal');
        if (delBtn) delBtn.addEventListener('click', async () => { await deleteProduct(product.id); Modal.close(); });
    }

    function parseItemsJson(itemsJson) {
        try {
            if (!itemsJson) return [];
            if (Array.isArray(itemsJson)) return itemsJson;
            const v = (typeof itemsJson === 'string') ? JSON.parse(itemsJson) : itemsJson;
            return Array.isArray(v) ? v : [];
        } catch (e) {
            return [];
        }
    }

    function openOrderDetails(order) {
        const title = `Commande #${order.id}`;
        const items = order.items || parseItemsJson(order.items_json);
        const itemsHtml = (Array.isArray(items) && items.length)
            ? `<div class="detail-section">
                    <div class="detail-section-title">Articles</div>
                    <div class="detail-table">
                        <div class="detail-table-head">
                            <div>Article</div><div>Qté</div><div>Prix</div>
                        </div>
                        ${items.map(it => {
                            const name = it.name || it.item_name || '-';
                            const qty = it.quantity ?? it.qty ?? 1;
                            const price = it.price ?? it.unit_price ?? 0;
                            return `<div class="detail-table-row"><div>${escapeHtml(String(name))}</div><div>${escapeHtml(String(qty))}</div><div>${formatMoney(price)}</div></div>`;
                        }).join('')}
                    </div>
               </div>`
            : `<div class="detail-section"><div class="detail-section-title">Articles</div><div class="muted">-</div></div>`;

        const body = `
            <div class="detail-card">
                <div class="detail-head">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(order.customer_name || '-')}</div>
                        <div class="detail-sub">${badgeForOrderStatus(order.status)} • ${formatMoney(order.final_price ?? order.total_price)}</div>
                        <div class="detail-badges">
                            ${order.tracking_code ? badge(escapeHtml(order.tracking_code), 'badge-muted') : ''}
                        </div>
                    </div>
                </div>

                <div class="detail-grid">
                    ${dlRow('ID', formatMaybe(order.id))}
                    ${dlRow('Client', formatMaybe(order.customer_name))}
                    ${dlRow('Téléphone', formatMaybe(order.customer_phone))}
                    ${dlRow('Email', formatMaybe(order.customer_email))}
                    ${dlRow('Adresse', formatMaybe(order.delivery_address))}
                    ${dlRow('Paiement', formatMaybe(order.payment_method))}
                    ${dlRow('Frais livraison', formatMoney(order.delivery_fee ?? 0))}
                    ${dlRow('Total', formatMoney(order.final_price ?? order.total_price ?? 0))}
                    ${dlRow('Créée le', formatMaybe(formatDate(order.created_at)))}
                </div>

                ${itemsHtml}
            </div>
        `;

        const status = (order.status || '').toString().toLowerCase();
        const footerParts = [`<button class="btn" type="button" data-close="true">Fermer</button>`];
        if (status === 'pending') {
            footerParts.push(`<button class="btn btn-danger" type="button" id="rejectOrderFromModal">Refuser</button>`);
            footerParts.push(`<button class="btn btn-primary" type="button" id="acceptOrderFromModal">Accepter</button>`);
        }

        Modal.open(title, body, footerParts.join(''));

        const ensureCatalogLoaded = async () => {
            if (!Array.isArray(state.menus) || state.menus.length === 0) {
                try {
                    const data = await apiFetch(`${API_BASE}/admin/menu.php`);
                    state.menus = Array.isArray(data.menu) ? data.menu : [];
                } catch (e) {}
            }
            if (!Array.isArray(state.products) || state.products.length === 0) {
                try {
                    const data = await apiFetch(`${API_BASE}/admin/products.php`);
                    state.products = Array.isArray(data.data) ? data.data : [];
                } catch (e) {}
            }
        };

        const validateOrderItems = async () => {
            await ensureCatalogLoaded();
            const issues = [];
            const list = Array.isArray(items) ? items : [];
            list.forEach(it => {
                const type = (it.item_type || it.type || '').toString().toLowerCase();
                const id = parseInt(it.item_id ?? it.id ?? 0, 10) || 0;
                const qty = parseInt(it.quantity ?? it.qty ?? 1, 10) || 1;
                if (type === 'menu') {
                    const m = state.menus.find(x => parseInt(x.id, 10) === id);
                    if (!m) {
                        issues.push(`Plat introuvable (ID ${id})`);
                    } else if (!parseInt(m.available ?? 0, 10)) {
                        issues.push(`Plat indisponible: ${m.name || ('ID ' + id)}`);
                    }
                } else {
                    const p = state.products.find(x => parseInt(x.id, 10) === id);
                    const stock = p ? (parseInt(p.stock ?? p.stock_quantity ?? 0, 10) || 0) : 0;
                    if (!p) {
                        issues.push(`Produit introuvable (ID ${id})`);
                    } else if (stock < qty) {
                        issues.push(`Stock insuffisant: ${p.name || ('ID ' + id)} (stock ${stock}, demandé ${qty})`);
                    }
                }
            });
            return issues;
        };

        const updateOrderStatus = async (newStatus, reason = '') => {
            await apiFetch(`${API_BASE}/admin/orders.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: order.id, status: newStatus, reason })
            });
        };

        const acceptBtn = qs('#acceptOrderFromModal');
        if (acceptBtn) acceptBtn.addEventListener('click', async () => {
            const issues = await validateOrderItems();
            if (issues.length) {
                toast('error', 'Impossible', issues.join(' | '));
                return;
            }
            const ok = await Confirm.ask('Accepter cette commande ?', 'Accepter');
            if (!ok) return;
            try {
                await updateOrderStatus('confirmed');
                toast('success', 'Commande', 'Commande acceptée');
                Modal.close();
                await loadOrders();
                await loadStats();
            } catch (e) {
                toast('error', 'Erreur', e.message || 'Impossible de mettre à jour');
            }
        });

        const rejectBtn = qs('#rejectOrderFromModal');
        if (rejectBtn) rejectBtn.addEventListener('click', async () => {
            const ok = await Confirm.ask('Refuser cette commande ?', 'Refuser');
            if (!ok) return;
            try {
                await updateOrderStatus('cancelled', 'Refusée par le restaurant');
                toast('success', 'Commande', 'Commande refusée');
                Modal.close();
                await loadOrders();
                await loadStats();
            } catch (e) {
                toast('error', 'Erreur', e.message || 'Impossible de mettre à jour');
            }
        });
    }

    function openCustomerDetails(u) {
        const title = `Client #${u.id}`;
        const body = `
            <div class="detail-card">
                <div class="detail-head">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`.trim() || '-') }</div>
                        <div class="detail-sub">${escapeHtml(u.email || '-')} • ${escapeHtml(u.phone || '-') }</div>
                        <div class="detail-badges">
                            ${formatBoolBadge(u.verified)}
                            ${badge(escapeHtml(`Commandes: ${u.orders_count ?? 0}`), 'badge-muted')}
                        </div>
                    </div>
                </div>

                <div class="detail-grid">
                    ${dlRow('ID', formatMaybe(u.id))}
                    ${dlRow('Adresse', formatMaybe(u.address))}
                    ${dlRow('Ville', formatMaybe(u.city))}
                    ${dlRow('Quartier', formatMaybe(u.quarter))}
                    ${dlRow('Dernière commande', formatMaybe(formatDate(u.last_order)))}
                    ${dlRow('Total dépensé', formatMoney(u.total_spent ?? 0))}
                    ${dlRow('Créé le', formatMaybe(formatDate(u.created_at)))}
                </div>
            </div>
        `;
        const footer = `
            <button class="btn" type="button" data-close="true">Fermer</button>
            <button class="btn btn-danger" type="button" id="deleteCustomerFromModal">Supprimer</button>
            <button class="btn btn-primary" type="button" id="editCustomerFromModal">Modifier</button>
        `;
        Modal.open(title, body, footer);
        const editBtn = qs('#editCustomerFromModal');
        if (editBtn) editBtn.addEventListener('click', () => { Modal.close(); openUserForm({ ...u, role: 'client' }); });
        const delBtn = qs('#deleteCustomerFromModal');
        if (delBtn) delBtn.addEventListener('click', async () => { await deleteUser(u.id); Modal.close(); });
    }

    function openDriverDetails(d) {
        const title = `Livreur #${d.id}`;
        const st = (d.driver_status || d.status || 'pending').toString().toLowerCase();
        const availableVal = d.driver_available ?? d.available;
        const verified = !!parseInt(d.verified ?? 0, 10);
        const active = !!parseInt(d.active ?? 0, 10);

        const fileUrl = (v) => {
            const s = (v ?? '').toString().trim();
            if (!s) return '';
            if (/^https?:\/\//i.test(s)) return s;
            if (s.startsWith('/')) return s;
            return '../' + s.replace(/^\.\//, '');
        };

        const docBlock = (label, urlValue) => {
            const url = fileUrl(urlValue);
            if (!url) return `<div class="detail-section"><div class="detail-section-title">${escapeHtml(label)}</div><div style="color:#666;">-</div></div>`;
            const safeUrl = escapeHtml(url);
            return `
                <div class="detail-section">
                    <div class="detail-section-title">${escapeHtml(label)}</div>
                    <div style="display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap;">
                        <a href="${safeUrl}" target="_blank" rel="noopener" class="btn" style="padding:8px 10px;">Ouvrir</a>
                        <div style="width:220px; max-width:100%;">
                            <img src="${safeUrl}" alt="${escapeHtml(label)}" style="width:100%; height:auto; border-radius:12px; border:1px solid rgba(0,0,0,0.08);" onerror="this.onerror=null;this.style.display='none';">
                            <div style="margin-top:6px; font-size:12px; color:#666; word-break:break-all;">${safeUrl}</div>
                        </div>
                    </div>
                </div>
            `;
        };

        const addressParts = [d.address, d.quarter, d.city].map(x => (x ?? '').toString().trim()).filter(Boolean);
        const address = addressParts.join(', ');
        const currentAddress = (d.current_address ?? '').toString().trim();

        let stBadge = badge(escapeHtml(st || 'pending'), 'badge-muted');
        if (st === 'approved') stBadge = badge('Approuvé', 'badge-success');
        if (st === 'pending') stBadge = badge('En attente', 'badge-warning');
        if (st === 'rejected') stBadge = badge('Rejeté', 'badge-danger');
        if (st === 'suspended') stBadge = badge('Suspendu', 'badge-danger');

        const body = `
            <div class="detail-card">
                <div class="detail-head">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(`${d.first_name || ''} ${d.last_name || ''}`.trim() || '-') }</div>
                        <div class="detail-sub">${escapeHtml(d.phone || '-')} • ${escapeHtml(d.email || '-') }</div>
                        <div class="detail-badges">
                            ${verified ? badge('Vérifié', 'badge-success') : badge('Non vérifié', 'badge-muted')}
                            ${active ? badge('Actif', 'badge-success') : badge('Bloqué', 'badge-danger')}
                            ${stBadge}
                            ${badgeForBool(!!parseInt(availableVal ?? 0, 10), 'Disponible', 'Indisponible')}
                        </div>
                    </div>
                </div>

                <div class="detail-grid">
                    ${dlRow('ID', formatMaybe(d.id))}
                    ${dlRow('Driver ID', formatMaybe(d.driver_id))}
                    ${dlRow('Véhicule', formatMaybe(d.vehicle_type))}
                    ${dlRow('Marque', formatMaybe(d.vehicle_brand))}
                    ${dlRow('Modèle', formatMaybe(d.vehicle_model))}
                    ${dlRow('Plaque', formatMaybe(d.vehicle_plate))}
                    ${dlRow('Note', formatMaybe(d.rating))}
                    ${dlRow('Livraisons', formatMaybe(d.total_deliveries))}
                    ${dlRow('Adresse', formatMaybe(address || '-'))}
                    ${dlRow('Adresse actuelle', formatMaybe(currentAddress || '-'))}
                    ${dlRow('Créé le', formatMaybe(formatDate(d.created_at)))}
                </div>

                ${docBlock('Photo d\'identité (profil)', d.avatar)}
                ${docBlock('Pièce d\'identité', d.id_document)}
            </div>
        `;

        const footerParts = [`<button class="btn" type="button" data-close="true">Fermer</button>`];
        footerParts.push(`<button class="btn btn-danger" type="button" id="deleteDriverFromModal">Supprimer</button>`);
        footerParts.push(`<button class="btn btn-primary" type="button" id="editDriverFromModal">Modifier</button>`);
        if (st === 'pending' || st === 'rejected') {
            footerParts.push(`<button class="btn btn-danger" type="button" id="rejectDriverFromModal">Rejeter</button>`);
            footerParts.push(`<button class="btn btn-primary" type="button" id="approveDriverFromModal">Approuver</button>`);
        }
        if (active) footerParts.push(`<button class="btn btn-danger" type="button" id="blockDriverFromModal">Bloquer</button>`);
        else footerParts.push(`<button class="btn" type="button" id="unblockDriverFromModal">Débloquer</button>`);

        Modal.open(title, body, footerParts.join(''));

        const postAction = async (userId, action, reason = '') => {
            await apiFetch(`${API_BASE}/admin/drivers.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, action, reason })
            });
        };

        const approveBtn = qs('#approveDriverFromModal');
        if (approveBtn) approveBtn.addEventListener('click', async () => {
            const ok = await Confirm.ask('Approuver ce livreur ?', 'Approuver');
            if (!ok) return;
            await postAction(d.id, 'approve');
            toast('success', 'Livreur', 'Livreur approuvé');
            Modal.close();
            await loadDrivers();
        });
        const rejectBtn = qs('#rejectDriverFromModal');
        if (rejectBtn) rejectBtn.addEventListener('click', async () => {
            const ok = await Confirm.ask('Rejeter ce livreur ?', 'Rejeter');
            if (!ok) return;
            await postAction(d.id, 'reject');
            toast('success', 'Livreur', 'Livreur rejeté');
            Modal.close();
            await loadDrivers();
        });
        const blockBtn = qs('#blockDriverFromModal');
        if (blockBtn) blockBtn.addEventListener('click', async () => {
            const ok = await Confirm.ask('Bloquer ce livreur ?', 'Bloquer');
            if (!ok) return;
            await postAction(d.id, 'block');
            toast('success', 'Livreur', 'Livreur bloqué');
            Modal.close();
            await loadDrivers();
        });
        const unblockBtn = qs('#unblockDriverFromModal');
        if (unblockBtn) unblockBtn.addEventListener('click', async () => {
            const ok = await Confirm.ask('Débloquer ce livreur ?', 'Débloquer');
            if (!ok) return;
            await postAction(d.id, 'unblock');
            toast('success', 'Livreur', 'Livreur débloqué');
            Modal.close();
            await loadDrivers();
        });

        const editBasicBtn = qs('#editDriverFromModal');
        if (editBasicBtn) editBasicBtn.addEventListener('click', () => { Modal.close(); openUserForm({ ...d, role: 'livreur' }); });
        const deleteBtn = qs('#deleteDriverFromModal');
        if (deleteBtn) deleteBtn.addEventListener('click', async () => { await deleteUser(d.id); Modal.close(); });
    }

    function openUserForm(user) {
        const isEdit = !!(user && user.id);
        const role = (user && user.role) ? String(user.role) : 'client';
        const isDriver = role === 'livreur';
        const title = isEdit ? (isDriver ? 'Modifier un livreur' : 'Modifier un client') : (isDriver ? 'Ajouter un livreur' : 'Ajouter un client');

        const body = `
            <form id="userForm" class="admin-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Prénom *</label>
                        <input class="form-input" type="text" name="first_name" value="${isEdit ? escapeHtml(user.first_name || '') : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Nom *</label>
                        <input class="form-input" type="text" name="last_name" value="${isEdit ? escapeHtml(user.last_name || '') : ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email *</label>
                        <input class="form-input" type="email" name="email" value="${isEdit ? escapeHtml(user.email || '') : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Téléphone</label>
                        <input class="form-input" type="text" name="phone" value="${isEdit ? escapeHtml(user.phone || '') : ''}">
                    </div>
                </div>
                ${isEdit ? '' : `
                <div class="form-group">
                    <label>Mot de passe *</label>
                    <input class="form-input" type="password" name="password" required>
                </div>
                `}
                <input type="hidden" name="id" value="${isEdit ? user.id : ''}">
                <input type="hidden" name="role" value="${escapeHtml(role)}">
            </form>
        `;

        const footer = `
            <button class="btn" type="button" data-close="true">Annuler</button>
            <button class="btn btn-primary" type="button" id="saveUserBtn">Enregistrer</button>
        `;

        Modal.open(title, body, footer);
        const btn = qs('#saveUserBtn');
        if (btn) btn.addEventListener('click', async () => {
            await saveUser(isEdit);
        });
    }

    async function saveUser(isEdit) {
        const form = qs('#userForm');
        if (!form) return;
        const fd = new FormData(form);
        const payload = {
            first_name: (fd.get('first_name') || '').toString().trim(),
            last_name: (fd.get('last_name') || '').toString().trim(),
            email: (fd.get('email') || '').toString().trim(),
            phone: (fd.get('phone') || '').toString().trim() || null,
            role: (fd.get('role') || 'client').toString()
        };
        const id = (fd.get('id') || '').toString().trim();
        const password = (fd.get('password') || '').toString();
        if (!isEdit) payload.password = password;

        try {
            if (isEdit) {
                await apiFetch(`${API_BASE}/admin/users.php?id=${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                toast('success', 'Utilisateurs', 'Utilisateur mis à jour');
            } else {
                await apiFetch(`${API_BASE}/admin/users.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                toast('success', 'Utilisateurs', 'Utilisateur créé');
            }
            Modal.close();
            if (payload.role === 'livreur') await loadDrivers();
            else await loadUsers();
            await loadStats();
        } catch (e) {
            toast('error', 'Erreur', e.message || 'Impossible d\'enregistrer');
        }
    }

    async function deleteUser(id) {
        const ok = await Confirm.ask('Supprimer cet utilisateur ? (désactivation)', 'Supprimer');
        if (!ok) return;
        try {
            await apiFetch(`${API_BASE}/admin/users.php?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
            toast('success', 'Utilisateurs', 'Utilisateur supprimé');
            await loadUsers();
            await loadDrivers();
            await loadStats();
        } catch (e) {
            toast('error', 'Erreur', e.message || 'Impossible de supprimer');
        }
    }

    function populateSelectOptions(selectEl, values, allLabel) {
        if (!selectEl) return;
        const current = selectEl.value;
        const uniq = Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
        selectEl.innerHTML = '';
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = allLabel || 'Tous';
        selectEl.appendChild(opt0);
        uniq.forEach(v => {
            const opt = document.createElement('option');
            opt.value = String(v);
            opt.textContent = String(v);
            selectEl.appendChild(opt);
        });
        if (uniq.includes(current)) selectEl.value = current;
    }

    // Vérifier l'authentification et le rôle admin
    function checkAdminAccess() {
        const token = localStorage.getItem('auth_token');
        const userDataStr = localStorage.getItem('user_data');
        
        if (!token || !userDataStr) {
            window.location.href = '../login.html?redirect=admin';
            return false;
        }

        try {
            const userData = JSON.parse(userDataStr);
            const role = normalizeRole(userData);
            const isAdminFlag = !!(userData.is_admin || userData.isAdmin);
            
            // Seuls admin et super_admin peuvent accéder
            if (!isAdminFlag && role !== 'admin' && role !== 'super_admin' && role !== 'administrator') {
                // Rediriger selon le rôle
                if (role === 'livreur' || role === 'delivery') {
                    window.location.href = '../delivery/dashboard.html';
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

    function setAdminName() {
        const user = getUserData() || {};
        const el = qs('#adminName');
        if (!el) return;
        const name = ((user.first_name || user.firstName || 'Admin') + ' ' + (user.last_name || user.lastName || '')).trim();
        el.textContent = name || 'Admin';
    }

    function showSection(sectionId) {
        qsa('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }

        qsa('.admin-menu a[data-target]').forEach(a => a.classList.remove('active'));
        const link = qs(`.admin-menu a[data-target="${sectionId}"]`);
        if (link) link.classList.add('active');

        // Persist last selected section (used when reloading without hash)
        try { localStorage.setItem('admin_last_section', sectionId); } catch (e) {}

        // close mobile sidebar after navigation
        document.body.classList.remove('admin-sidebar-open');
    }

    function setupSidebarToggle() {
        const btn = qs('#adminSidebarToggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
                document.body.classList.toggle('admin-sidebar-open');
            } else {
                document.body.classList.toggle('admin-sidebar-collapsed');
            }
        });

        document.addEventListener('click', (e) => {
            const sidebar = qs('#adminSidebar');
            const toggle = qs('#adminSidebarToggle');
            if (!sidebar || !toggle) return;
            if (!document.body.classList.contains('admin-sidebar-open')) return;
            const t = e.target;
            if (!sidebar.contains(t) && !toggle.contains(t)) {
                document.body.classList.remove('admin-sidebar-open');
            }
        });
    }

    function setupNavigation() {
        qsa('.admin-menu a[data-target]').forEach(link => {
            link.addEventListener('click', function(e) {
                const target = this.dataset.target;
                if (!target) return;
                e.preventDefault();
                // Keep hash in sync so refresh stays on the same section
                try {
                    if (window.history && typeof window.history.replaceState === 'function') {
                        window.history.replaceState(null, '', `#${target}`);
                    } else {
                        window.location.hash = target;
                    }
                } catch (err) {}
                showSection(target);
                loadSectionData(target);
            });
        });

        // Tabs (dashboard mini)
        qsa('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.dataset.tab;
                qsa('.tab-btn').forEach(b => b.classList.remove('active'));
                qsa('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                const tab = document.getElementById(tabId);
                if (tab) tab.classList.add('active');
            });
        });
    }

    function setupHeaderActions() {
        const syncBtn = qs('#syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                const active = qs('.admin-menu a.active[data-target]');
                const target = active ? active.dataset.target : 'dashboard';
                loadStats();
                loadSectionData(target);
            });
        }

        const downloadImagesBtn = qs('#downloadImagesBtn');
        if (downloadImagesBtn) {
            downloadImagesBtn.addEventListener('click', () => window.loadImages());
        }
    }

    function setupCrudButtons() {
        const addMenuBtn = qs('#addMenuBtn');
        if (addMenuBtn) addMenuBtn.addEventListener('click', () => openMenuForm());
        const addProductBtn = qs('#addProductBtn');
        if (addProductBtn) addProductBtn.addEventListener('click', () => openProductForm());

        const addUserBtn = qs('#addUserBtn');
        if (addUserBtn) addUserBtn.addEventListener('click', () => openUserForm({ role: 'client' }));

        const addDriverBtn = qs('#addDriverBtn');
        if (addDriverBtn) addDriverBtn.addEventListener('click', () => openUserForm({ role: 'livreur' }));
    }

    // Charger les statistiques
    async function loadStats() {
        // Orders today + revenue (admin endpoint)
        try {
            const today = await apiFetch(`${API_BASE}/admin/orders.php?today=1&limit=500`);
            const orders = Array.isArray(today.orders) ? today.orders : [];
            state.orders = orders;
            const todayOrdersEl = document.getElementById('todayOrders');
            if (todayOrdersEl) todayOrdersEl.textContent = String(today.count ?? orders.length ?? 0);

            const revenue = orders.reduce((sum, o) => sum + (parseInt(o.final_price ?? o.total_price ?? 0, 10) || 0), 0);
            const revEl = document.getElementById('todayRevenue');
            if (revEl) revEl.textContent = formatMoney(revenue);
        } catch (error) {
            console.error('Error loading orders stats:', error);
        }

        // Products stock count
        try {
            const prod = await apiFetch(`${API_BASE}/admin/products.php`);
            const items = Array.isArray(prod.data) ? prod.data : (Array.isArray(prod.products) ? prod.products : []);
            state.products = items;
            const totalStock = items.reduce((sum, p) => sum + (parseInt(p.stock ?? p.stock_quantity ?? 0, 10) || 0), 0);
            const el = document.getElementById('productsStock');
            if (el) el.textContent = String(totalStock);
        } catch (e) {
            // ignore
        }

        // Drivers active count
        try {
            const d = await apiFetch(`${API_BASE}/admin/drivers.php?available=1&limit=200`);
            const drivers = Array.isArray(d.drivers) ? d.drivers : [];
            state.drivers = drivers;
            const el = document.getElementById('activeDrivers');
            if (el) el.textContent = String(drivers.length);
        } catch (e) {
            // ignore
        }

        // Brief dashboard summaries
        try { renderDashboardRestaurantBrief(); } catch (e) {}
        try { renderDashboardBoutiqueBrief(); } catch (e) {}
    }

    function renderDashboardRestaurantBrief() {
        const el = document.getElementById('restaurantContent');
        if (!el) return;
        const menus = Array.isArray(state.menus) ? state.menus : [];
        const total = menus.length;
        const available = menus.reduce((n, m) => n + (parseInt(m.available ?? 0, 10) ? 1 : 0), 0);
        const today = menus.reduce((n, m) => n + (parseInt(m.is_today ?? 0, 10) ? 1 : 0), 0);

        el.innerHTML = `
            <div class="detail-card">
                <div class="detail-grid">
                    ${dlRow('Plats (total)', formatMaybe(total))}
                    ${dlRow('Plats disponibles', formatMaybe(available))}
                    ${dlRow('Menu du jour', formatMaybe(today))}
                    ${dlRow('Catégories', formatMaybe(new Set(menus.map(m => (m.category || '').trim()).filter(Boolean)).size))}
                </div>
                <div class="detail-section">
                    <div class="detail-section-title">Actions rapides</div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn btn-primary" type="button" id="dashAddMenuBtn">Ajouter un plat</button>
                        <a class="btn" href="#restaurant" id="dashGoRestaurant">Ouvrir la gestion complète</a>
                    </div>
                </div>
            </div>
        `;

        const addBtn = qs('#dashAddMenuBtn');
        if (addBtn) addBtn.addEventListener('click', () => openMenuForm());
    }

    function renderDashboardBoutiqueBrief() {
        const el = document.getElementById('boutiqueContent');
        if (!el) return;
        const items = Array.isArray(state.products) ? state.products : [];
        const total = items.length;
        const totalStock = items.reduce((sum, p) => sum + (parseInt(p.stock ?? p.stock_quantity ?? 0, 10) || 0), 0);
        const outOfStock = items.reduce((n, p) => n + ((parseInt(p.stock ?? p.stock_quantity ?? 0, 10) || 0) <= 0 ? 1 : 0), 0);

        el.innerHTML = `
            <div class="detail-card">
                <div class="detail-grid">
                    ${dlRow('Produits (total)', formatMaybe(total))}
                    ${dlRow('Quantité en stock', formatMaybe(totalStock))}
                    ${dlRow('Rupture de stock', formatMaybe(outOfStock))}
                    ${dlRow('Catégories', formatMaybe(new Set(items.map(p => (p.category || '').trim()).filter(Boolean)).size))}
                </div>
                <div class="detail-section">
                    <div class="detail-section-title">Actions rapides</div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn btn-primary" type="button" id="dashAddProductBtn">Ajouter un produit</button>
                        <a class="btn" href="#boutique" id="dashGoBoutique">Ouvrir la gestion complète</a>
                    </div>
                </div>
            </div>
        `;

        const addBtn = qs('#dashAddProductBtn');
        if (addBtn) addBtn.addEventListener('click', () => openProductForm());
    }

    // Charger les menus
    async function loadMenus() {
        const container = document.getElementById('menuList');
        if (!container) return;

        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

        try {
            const data = await apiFetch(`${API_BASE}/admin/menu.php`);
            const items = Array.isArray(data.menu) ? data.menu : [];
            state.menus = items;
            populateSelectOptions(document.getElementById('menuCategoryFilter'), items.map(m => m.category || ''), 'Toutes les catégories');
            renderMenuTable(applyMenuFilters(items), container);
            updateMeta('menuMeta', items.length, 'plats');
        } catch (error) {
            console.error('Error loading menus:', error);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    function applyMenuFilters(items) {
        const q = safeText(qs('#menuSearch')?.value || '');
        const cat = (qs('#menuCategoryFilter')?.value || '').toString();
        return items.filter(m => {
            const inCat = !cat || String(m.category || '') === cat;
            const hay = `${m.id} ${m.name || ''} ${m.category || ''} ${m.description || ''}`.toLowerCase();
            const inQ = !q || hay.includes(q);
            return inCat && inQ;
        });
    }

    // Afficher les menus dans un tableau
    function renderMenuTable(menus, container) {
        const sorted = [...(menus || [])].sort((a, b) => {
            const ia = parseInt(a?.id ?? 0, 10) || 0;
            const ib = parseInt(b?.id ?? 0, 10) || 0;
            return ia - ib;
        });

        if (sorted.length === 0) {
            container.innerHTML = '<p>Aucun menu disponible</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Prix</th>
                    <th>Catégorie</th>
                    <th>Disponible</th>
                    <th>Menu du jour</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(menu => `
                    <tr class="clickable-row" data-entity="menu" data-id="${menu.id}">
                        <td data-label="ID">${menu.id}</td>
                        <td data-label="Image"><img src="${resolveAssetUrl(menu.image_url, '../assets/images/default.jpg')}" alt="${escapeHtml(menu.name || '')}" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null;this.src='../assets/images/default.jpg';"></td>
                        <td data-label="Nom">${menu.name}</td>
                        <td data-label="Description">${(menu.description || '').substring(0, 50)}...</td>
                        <td data-label="Prix">${menu.price} FCFA</td>
                        <td data-label="Catégorie">${menu.category || '-'}</td>
                        <td data-label="Disponible">${badgeForBool(!!menu.available)}</td>
                        <td data-label="Menu du jour">${badgeForBool(!!menu.is_today)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.appendChild(table);
        container.appendChild(wrap);

        qsa('tbody tr.clickable-row', table).forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.getAttribute('data-id') || '0', 10);
                const item = state.menus.find(m => parseInt(m.id, 10) === id);
                if (item) openMenuDetails(item);
            });
        });
    }

    // Charger les produits
    async function loadProducts() {
        const container = document.getElementById('productsList');
        if (!container) return;

        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

        try {
            const data = await apiFetch(`${API_BASE}/admin/products.php`);
            const items = Array.isArray(data.data) ? data.data : [];
            state.products = items;
            populateSelectOptions(document.getElementById('productCategoryFilter'), items.map(p => p.category || ''), 'Toutes les catégories');
            renderProductsTable(applyProductFilters(items), container);
            updateMeta('productsMeta', items.length, 'produits');
        } catch (error) {
            console.error('Error loading products:', error);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    function applyProductFilters(items) {
        const q = safeText(qs('#productSearch')?.value || '');
        const cat = (qs('#productCategoryFilter')?.value || '').toString();
        return items.filter(p => {
            const inCat = !cat || String(p.category || '') === cat;
            const hay = `${p.id} ${p.name || ''} ${p.category || ''} ${p.description || ''}`.toLowerCase();
            const inQ = !q || hay.includes(q);
            return inCat && inQ;
        });
    }

    // Afficher les produits dans un tableau
    function renderProductsTable(products, container) {
        const sorted = [...(products || [])].sort((a, b) => {
            const ia = parseInt(a?.id ?? 0, 10) || 0;
            const ib = parseInt(b?.id ?? 0, 10) || 0;
            return ia - ib;
        });

        if (sorted.length === 0) {
            container.innerHTML = '<p>Aucun produit disponible</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Prix</th>
                    <th>Catégorie</th>
                    <th>Stock</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(product => `
                    <tr class="clickable-row" data-entity="product" data-id="${product.id}">
                        <td data-label="ID">${product.id}</td>
                        <td data-label="Image"><img src="${resolveAssetUrl(product.image_url || product.main_image, '../assets/images/default.jpg')}" alt="${escapeHtml(product.name || '')}" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null;this.src='../assets/images/default.jpg';"></td>
                        <td data-label="Nom">${product.name}</td>
                        <td data-label="Description">${(product.description || '').substring(0, 50)}...</td>
                        <td data-label="Prix">${product.price} FCFA</td>
                        <td data-label="Catégorie">${product.category || '-'}</td>
                        <td data-label="Stock">${product.stock || product.stock_quantity || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.appendChild(table);
        container.appendChild(wrap);

        qsa('tbody tr.clickable-row', table).forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.getAttribute('data-id') || '0', 10);
                const item = state.products.find(p => parseInt(p.id, 10) === id);
                if (item) openProductDetails(item);
            });
        });
    }

    function openMenuForm(menu) {
        const isEdit = !!menu;
        const title = isEdit ? 'Modifier un plat' : 'Ajouter un plat';
        const rawImg = isEdit ? (menu.image_url || '') : '';
        const currentImg = escapeHtml(rawImg || '');
        const previewSrc = escapeHtml(resolveAssetUrl(rawImg, '../assets/images/default.jpg'));

        const body = `
            <div class="detail-card admin-edit-card">
                <div class="detail-head">
                    <img class="detail-image" src="${previewSrc}" alt="${escapeHtml(isEdit ? (menu.name || 'Plat') : 'Plat')}" onerror="this.onerror=null;this.src='../assets/images/default.jpg';">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(isEdit ? (menu.name || 'Plat') : 'Nouveau plat')}</div>
                        <div class="detail-sub">${escapeHtml(isEdit ? (menu.category || '-') : '-') } • ${formatMoney(isEdit ? (menu.price ?? 0) : 0)}</div>
                        <div class="detail-badges">
                            ${isEdit ? formatBoolBadge(menu.available) : badge('Brouillon', 'badge-muted')}
                            ${isEdit ? badgeForBool(!!menu.is_today, 'Menu du jour', 'Pas du jour') : ''}
                        </div>
                    </div>
                </div>

                <form id="menuForm" class="admin-form" enctype="multipart/form-data">
                    <div class="detail-grid">
                        <div class="form-group">
                            <label>Nom *</label>
                            <input class="form-input" type="text" name="name" value="${isEdit ? escapeHtml(menu.name || '') : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Prix (FCFA) *</label>
                            <input class="form-input" type="number" name="price" min="0" step="50" value="${isEdit ? (menu.price ?? '') : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Catégorie *</label>
                            <input class="form-input" type="text" name="category" value="${isEdit ? escapeHtml(menu.category || '') : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Image</label>
                            <div class="image-field" data-image-field="menu">
                                <div class="image-choice">
                                    <label>
                                        <input type="radio" name="image_mode" value="url" checked>
                                        <span>Lien / Chemin</span>
                                    </label>
                                    <label>
                                        <input type="radio" name="image_mode" value="file">
                                        <span>Uploader depuis le disque</span>
                                    </label>
                                </div>
                                <input class="form-input" type="text" name="image_url" value="${currentImg}" placeholder="https://... ou assets/uploads/...">
                                <input class="form-input" type="file" name="image" accept="image/*" style="display:none;">
                                <img class="image-preview" src="${previewSrc}" alt="Aperçu" onerror="this.onerror=null;this.src='../assets/images/default.jpg';">
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Description</div>
                        <textarea class="form-input" name="description" rows="3">${isEdit ? escapeHtml(menu.description || '') : ''}</textarea>
                    </div>

                    <div class="detail-grid">
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" name="available" ${!isEdit || menu.available ? 'checked' : ''}>
                                <span>Disponible</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" name="is_today" ${isEdit && menu.is_today ? 'checked' : ''}>
                                <span>Menu du jour</span>
                            </label>
                        </div>
                    </div>

                    <input type="hidden" name="id" value="${isEdit ? menu.id : ''}">
                </form>
            </div>
        `;

        const footer = `
            <button class="btn" type="button" data-close="true">Annuler</button>
            <button class="btn btn-primary" type="button" id="saveMenuBtn">Enregistrer</button>
        `;

        Modal.open(title, body, footer);
        initImageField('menu');
        const btn = qs('#saveMenuBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                await saveMenu(isEdit);
            });
        }
    }

    function initImageField(kind) {
        const root = qs(`[data-image-field="${kind}"]`);
        if (!root) return;
        const modeEls = qsa('input[name="image_mode"]', root);
        const urlEl = qs('input[name="image_url"]', root);
        const fileEl = qs('input[type="file"][name="image"]', root);
        const previewEl = qs('.image-preview', root);

        const sync = () => {
            const mode = (qs('input[name="image_mode"]:checked', root)?.value || 'url').toString();
            if (mode === 'file') {
                if (urlEl) urlEl.style.display = 'none';
                if (fileEl) fileEl.style.display = '';
            } else {
                if (urlEl) urlEl.style.display = '';
                if (fileEl) fileEl.style.display = 'none';
            }
        };

        modeEls.forEach(r => r.addEventListener('change', sync));
        if (urlEl && previewEl) {
            urlEl.addEventListener('input', () => {
                const v = (urlEl.value || '').trim();
                previewEl.src = resolveAssetUrl(v, '../assets/images/default.jpg');
            });
        }
        if (fileEl && previewEl) {
            fileEl.addEventListener('change', () => {
                const f = fileEl.files && fileEl.files[0];
                if (f) previewEl.src = URL.createObjectURL(f);
            });
        }

        sync();
    }

    async function saveMenu(isEdit) {
        const form = qs('#menuForm');
        if (!form) return;

        const fd = new FormData(form);
        const id = (fd.get('id') || '').toString().trim();
        const mode = (fd.get('image_mode') || 'url').toString();
        const didUploadFile = mode === 'file' && (fd.get('image') instanceof File) && (fd.get('image') && fd.get('image').name);
        if (mode !== 'file') {
            const url = (fd.get('image_url') || '').toString().trim();
            if (!url) fd.delete('image_url');
            fd.delete('image');
        } else {
            fd.delete('image_url');
            const file = fd.get('image');
            if (!(file instanceof File) || !file || !file.name) {
                fd.delete('image');
            }
        }
        fd.delete('image_mode');

        if (isEdit) {
            fd.set('_method', 'PUT');
            if (id) fd.set('id', id);
        }

        try {
            if (isEdit) {
                await apiFetch(`${API_BASE}/admin/menu.php`, { method: 'POST', body: fd });
                toast('success', 'Menu', 'Plat mis à jour');
            } else {
                await apiFetch(`${API_BASE}/admin/menu.php`, { method: 'POST', body: fd });
                toast('success', 'Menu', 'Plat créé');
            }
            // Bust assets so image previews refresh even when the URL stays the same
            ASSET_BUST = Date.now();
            Modal.close();
            await loadMenus();
            await loadStats();
        } catch (e) {
            toast('error', 'Erreur', e.message || 'Impossible d\'enregistrer');
        }
    }

    async function deleteMenu(id) {
        const ok = await Confirm.ask('Supprimer ce plat ? Cette action est irréversible.', 'Supprimer un plat');
        if (!ok) return;
        try {
            await apiFetch(`${API_BASE}/admin/menu.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            toast('success', 'Menu', 'Plat supprimé');
            await loadMenus();
            await loadStats();
        } catch (e) {
            toast('error', 'Erreur', e.message || 'Impossible de supprimer');
        }
    }

    function openProductForm(product) {
        const isEdit = !!product;
        const title = isEdit ? 'Modifier un produit' : 'Ajouter un produit';
        const rawImg = isEdit ? (product.image_url || product.main_image || '') : '';
        const currentImg = isEdit ? escapeHtml(rawImg) : '';
        const previewSrc = escapeHtml(resolveAssetUrl(rawImg, '../assets/images/default.jpg'));
        const body = `
            <div class="detail-card admin-edit-card">
                <div class="detail-head">
                    <img class="detail-image" src="${previewSrc}" alt="${escapeHtml(isEdit ? (product.name || 'Produit') : 'Produit')}" onerror="this.onerror=null;this.src='../assets/images/default.jpg';">
                    <div class="detail-head-main">
                        <div class="detail-title">${escapeHtml(isEdit ? (product.name || 'Produit') : 'Nouveau produit')}</div>
                        <div class="detail-sub">${escapeHtml(isEdit ? (product.category || '-') : '-') } • ${formatMoney(isEdit ? (product.price ?? 0) : 0)}</div>
                        <div class="detail-badges">
                            ${badge(escapeHtml(`Stock: ${isEdit ? (product.stock ?? product.stock_quantity ?? 0) : 0}`), 'badge-muted')}
                        </div>
                    </div>
                </div>

                <form id="productForm" class="admin-form" enctype="multipart/form-data">
                    <div class="detail-grid">
                        <div class="form-group">
                            <label>Nom *</label>
                            <input class="form-input" type="text" name="name" value="${isEdit ? escapeHtml(product.name || '') : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Prix (FCFA) *</label>
                            <input class="form-input" type="number" name="price" min="0" step="50" value="${isEdit ? (product.price ?? '') : ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Catégorie</label>
                            <input class="form-input" type="text" name="category" value="${isEdit ? escapeHtml(product.category || '') : ''}">
                        </div>
                        <div class="form-group">
                            <label>Stock</label>
                            <input class="form-input" type="number" name="stock" min="0" step="1" value="${isEdit ? (product.stock ?? product.stock_quantity ?? 0) : 0}">
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label>Image</label>
                            <div class="image-field" data-image-field="product">
                                <div class="image-choice">
                                    <label>
                                        <input type="radio" name="image_mode" value="url" checked>
                                        <span>Lien / Chemin</span>
                                    </label>
                                    <label>
                                        <input type="radio" name="image_mode" value="file">
                                        <span>Uploader depuis le disque</span>
                                    </label>
                                </div>
                                <input class="form-input" type="text" name="image_url" value="${currentImg}" placeholder="https://... ou assets/uploads/...">
                                <input class="form-input" type="file" name="image" accept="image/*" style="display:none;">
                                <img class="image-preview" src="${previewSrc}" alt="Aperçu" onerror="this.onerror=null;this.src='../assets/images/default.jpg';">
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-title">Description</div>
                        <textarea class="form-input" name="description" rows="3">${isEdit ? escapeHtml(product.description || '') : ''}</textarea>
                    </div>

                    <input type="hidden" name="id" value="${isEdit ? product.id : ''}">
                </form>
            </div>
        `;

        const footer = `
            <button class="btn" type="button" data-close="true">Annuler</button>
            <button class="btn btn-primary" type="button" id="saveProductBtn">Enregistrer</button>
        `;

        Modal.open(title, body, footer);
        initImageField('product');
        const btn = qs('#saveProductBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                await saveProduct(isEdit);
            });
        }
    }

    async function saveProduct(isEdit) {
        const form = qs('#productForm');
        if (!form) return;

        try {
            const fd = new FormData(form);
            const id = parseInt((fd.get('id') || '0').toString(), 10);
            const mode = (fd.get('image_mode') || 'url').toString();
            const didUploadFile = mode === 'file' && (fd.get('image') instanceof File) && (fd.get('image') && fd.get('image').name);
            if (mode !== 'file') {
                const url = (fd.get('image_url') || '').toString().trim();
                if (!url) fd.delete('image_url');
                fd.delete('image');
            } else {
                fd.delete('image_url');
                const file = fd.get('image');
                if (!(file instanceof File) || !file || !file.name) {
                    fd.delete('image');
                }
            }
            fd.delete('image_mode');

            if (isEdit) {
                fd.set('_method', 'PUT');
                fd.set('id', String(id));
                try {
                    await apiFetch(`${API_BASE}/admin/products.php`, { method: 'POST', body: fd });
                    toast('success', 'Produits', 'Produit mis à jour');
                } catch (e) {
                    toast('error', 'Erreur', e.message || 'Impossible d\'enregistrer');
                }
            } else {
                try {
                    await apiFetch(`${API_BASE}/admin/products.php`, { method: 'POST', body: fd });
                    toast('success', 'Produits', 'Produit créé');
                } catch (e) {
                    toast('error', 'Erreur', e.message || 'Impossible d\'enregistrer');
                }
            }
            // Bust assets so image previews refresh even when the URL stays the same
            ASSET_BUST = Date.now();
            Modal.close();
            await loadProducts();
            await loadStats();
        } catch (e) {
            toast('error', 'Erreur', e.message || 'Impossible d\'enregistrer');
        }
    }

    async function deleteProduct(id) {
        const ok = await Confirm.ask('Supprimer ce produit ? Cette action est irréversible.', 'Supprimer un produit');
        if (!ok) return;
        try {
            await apiFetch(`${API_BASE}/admin/products.php?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
            toast('success', 'Produits', 'Produit supprimé');
            await loadProducts();
            await loadStats();
        } catch (e) {
            toast('error', 'Erreur', e.message || 'Impossible de supprimer');
        }
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // Charger les données d'une section
    function loadSectionData(sectionId) {
        switch(sectionId) {
            case 'restaurant':
                loadMenus();
                break;
            case 'boutique':
                loadProducts();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'users':
                loadUsers();
                break;
            case 'drivers':
                loadDrivers();
                break;
            case 'dashboard':
                loadStats();
                break;
        }
    }

    // Fonctions de chargement
    async function loadOrders() {
        const container = document.getElementById('ordersList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

        try {
            const status = (qs('#ordersStatusFilter')?.value || '').toString();
            const data = await apiFetch(`${API_BASE}/admin/orders.php?${status ? `status=${encodeURIComponent(status)}&` : ''}limit=200`);
            const orders = Array.isArray(data.orders) ? data.orders : [];
            state.orders = orders;
            renderOrdersTable(applyOrdersFilters(orders), container);
            updateMeta('ordersMeta', orders.length, 'commandes');
        } catch (e) {
            console.error('Error loading orders:', e);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    function applyOrdersFilters(items) {
        const q = safeText(qs('#ordersSearch')?.value || '');
        const status = (qs('#ordersStatusFilter')?.value || '').toString();
        return items.filter(o => {
            const inStatus = !status || String(o.status || '') === status;
            const hay = `${o.id} ${o.customer_name || ''} ${o.customer_email || ''} ${o.customer_phone || ''} ${o.tracking_code || ''}`.toLowerCase();
            const inQ = !q || hay.includes(q);
            return inStatus && inQ;
        });
    }

    function renderOrdersTable(orders, container) {
        if (!orders.length) {
            container.innerHTML = '<p>Aucune commande</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Client</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(o => `
                    <tr class="clickable-row" data-entity="order" data-id="${o.id}">
                        <td>${o.id}</td>
                        <td>
                            <div style="font-weight:700;">${escapeHtml(o.customer_name || '-') }</div>
                            <div style="color:#666;font-size:12px;">${escapeHtml(o.customer_email || '')}</div>
                        </td>
                        <td>${formatMoney(o.final_price ?? o.total_price)}</td>
                        <td>${badgeForOrderStatus(o.status)}</td>
                        <td>${formatDate(o.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.appendChild(table);
        container.appendChild(wrap);

        qsa('tbody tr.clickable-row', table).forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.getAttribute('data-id') || '0', 10);
                const item = state.orders.find(o => parseInt(o.id, 10) === id);
                if (item) openOrderDetails(item);
            });
        });
    }

    async function loadUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

        try {
            const search = (qs('#usersSearch')?.value || '').toString().trim();
            const url = `${API_BASE}/admin/customers.php?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`;
            const data = await apiFetch(url);
            const users = Array.isArray(data.customers) ? data.customers : [];
            state.customers = users;
            renderCustomersTable(users, container);
            updateMeta('usersMeta', users.length, 'clients');
        } catch (e) {
            console.error('Error loading users:', e);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    function renderCustomersTable(users, container) {
        if (!users.length) {
            container.innerHTML = '<p>Aucun utilisateur</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Vérifié</th>
                    <th>Commandes</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr class="clickable-row" data-entity="customer" data-id="${u.id}">
                        <td>${u.id}</td>
                        <td>${escapeHtml(`${u.first_name || ''} ${u.last_name || ''}`.trim() || '-') }</td>
                        <td>${escapeHtml(u.email || '-') }</td>
                        <td>${escapeHtml(u.phone || '-') }</td>
                        <td>${badgeForBool(!!u.verified)}</td>
                        <td>${u.orders_count ?? 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.appendChild(table);
        container.appendChild(wrap);

        qsa('tbody tr.clickable-row', table).forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.getAttribute('data-id') || '0', 10);
                const item = state.customers.find(u => parseInt(u.id, 10) === id);
                if (item) openCustomerDetails(item);
            });
        });
    }

    async function loadDrivers() {
        const container = document.getElementById('driversList');
        if (!container) return;
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

        try {
            const search = (qs('#driversSearch')?.value || '').toString().trim();
            const status = (qs('#driversStatusFilter')?.value || '').toString();
            const available = (qs('#driversAvailableFilter')?.value || '').toString();
            const params = new URLSearchParams();
            params.set('limit', '200');
            if (search) params.set('search', search);
            if (status) params.set('status', status);
            if (available) params.set('available', available);
            const data = await apiFetch(`${API_BASE}/admin/drivers.php?${params.toString()}`);
            const drivers = Array.isArray(data.drivers) ? data.drivers : [];
            state.drivers = drivers;
            renderDriversTable(drivers, container);
            updateMeta('driversMeta', drivers.length, 'livreurs');
        } catch (e) {
            console.error('Error loading drivers:', e);
            container.innerHTML = '<p>Erreur lors du chargement</p>';
        }
    }

    function renderDriversTable(drivers, container) {
        if (!drivers.length) {
            container.innerHTML = '<p>Aucun livreur</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Vérifié</th>
                    <th>Compte</th>
                    <th>Statut</th>
                    <th>Disponible</th>
                    <th>Note</th>
                </tr>
            </thead>
            <tbody>
                ${drivers.map(d => {
                    const st = (d.driver_status || d.status || '').toString().toLowerCase();
                    let stBadge = badge(escapeHtml(st || 'livreur'), 'badge-muted');
                    if (st === 'approved') stBadge = badge('Approuvé', 'badge-success');
                    if (st === 'pending') stBadge = badge('En attente', 'badge-warning');
                    if (st === 'rejected') stBadge = badge('Rejeté', 'badge-danger');
                    if (st === 'suspended') stBadge = badge('Suspendu', 'badge-danger');
                    const availableVal = d.driver_available ?? d.available;
                    const rating = d.rating ?? d.driver_rating;
                    const verified = !!parseInt(d.verified ?? 0, 10);
                    const active = !!parseInt(d.active ?? 0, 10);
                    const verifiedBadge = verified ? badge('Oui', 'badge-success') : badge('Non', 'badge-muted');
                    const activeBadge = active ? badge('Actif', 'badge-success') : badge('Bloqué', 'badge-danger');
                    return `
                        <tr class="clickable-row" data-entity="driver" data-id="${d.id}">
                            <td>${d.id}</td>
                            <td>${escapeHtml(`${d.first_name || ''} ${d.last_name || ''}`.trim() || '-') }</td>
                            <td>${escapeHtml(d.phone || '-') }</td>
                            <td>${verifiedBadge}</td>
                            <td>${activeBadge}</td>
                            <td>${stBadge}</td>
                            <td>${badgeForBool(!!parseInt(availableVal ?? 0, 10), 'Oui', 'Non')}</td>
                            <td>${rating ? escapeHtml(String(rating)) : '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;

        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.appendChild(table);
        container.appendChild(wrap);

        qsa('tbody tr.clickable-row', table).forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.getAttribute('data-id') || '0', 10);
                const item = state.drivers.find(x => parseInt(x.id, 10) === id);
                if (item) openDriverDetails(item);
            });
        });
    }

    function updateMeta(id, count, label) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = `${count} ${label}`;
    }

    // Télécharger les images
    window.loadImages = async function() {
        if (!confirm('Télécharger les images depuis internet pour tous les produits et plats ?')) {
            return;
        }

        try {
            const productsRes = await fetch(`${API_BASE}/admin/add-images.php?type=products`);
            const productsData = await productsRes.json();
            
            const menuRes = await fetch(`${API_BASE}/admin/add-images.php?type=menu`);
            const menuData = await menuRes.json();
            
            alert(`Images produits: ${productsData.success ? 'Succès' : 'Erreur'}\nImages menu: ${menuData.success ? 'Succès' : 'Erreur'}`);
        } catch (error) {
            alert('Erreur lors du téléchargement des images');
        }
    };

    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
        // Vérifier l'accès admin
        if (!checkAdminAccess()) {
            return;
        }

        bindModalCloseHandlers();
        setupSidebarToggle();
        setupNavigation();
        setupHeaderActions();
        setupCrudButtons();
        setAdminName();

        // Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.clear();
                window.location.href = '../login.html';
            });
        }

        // Charger les données initiales
        loadStats();

        // Toolbar handlers
        const menuSearch = qs('#menuSearch');
        const menuCategory = qs('#menuCategoryFilter');
        if (menuSearch) menuSearch.addEventListener('input', debounce(() => {
            const container = document.getElementById('menuList');
            if (container) renderMenuTable(applyMenuFilters(state.menus), container);
        }, 200));
        if (menuCategory) menuCategory.addEventListener('change', () => {
            const container = document.getElementById('menuList');
            if (container) renderMenuTable(applyMenuFilters(state.menus), container);
        });

        const productSearch = qs('#productSearch');
        const productCategory = qs('#productCategoryFilter');
        if (productSearch) productSearch.addEventListener('input', debounce(() => {
            const container = document.getElementById('productsList');
            if (container) renderProductsTable(applyProductFilters(state.products), container);
        }, 200));
        if (productCategory) productCategory.addEventListener('change', () => {
            const container = document.getElementById('productsList');
            if (container) renderProductsTable(applyProductFilters(state.products), container);
        });

        const ordersSearch = qs('#ordersSearch');
        const ordersStatus = qs('#ordersStatusFilter');
        if (ordersSearch) ordersSearch.addEventListener('input', debounce(() => {
            const container = document.getElementById('ordersList');
            if (container) renderOrdersTable(applyOrdersFilters(state.orders), container);
        }, 200));
        if (ordersStatus) ordersStatus.addEventListener('change', () => loadOrders());

        const usersSearch = qs('#usersSearch');
        if (usersSearch) usersSearch.addEventListener('input', debounce(() => loadUsers(), 250));

        const driversSearch = qs('#driversSearch');
        const driversStatus = qs('#driversStatusFilter');
        const driversAvail = qs('#driversAvailableFilter');
        if (driversSearch) driversSearch.addEventListener('input', debounce(() => loadDrivers(), 250));
        if (driversStatus) driversStatus.addEventListener('change', () => loadDrivers());
        if (driversAvail) driversAvail.addEventListener('change', () => loadDrivers());

        // Initial section (hash)
        const hash = (window.location.hash || '').replace('#', '');
        let initial = hash || '';
        if (!initial) {
            try { initial = (localStorage.getItem('admin_last_section') || '').toString(); } catch (e) { initial = ''; }
        }
        if (!initial) initial = 'dashboard';
        showSection(initial);
        loadSectionData(initial);
    });

})();
