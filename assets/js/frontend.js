/*
 Frontend glue for Titi Golden Taste
 - mobile menu toggle
 - products fetch + render with loader and error handling
 - initialize Leaflet map with a marker for the restaurant
 - lightweight helpers only (keeps responsibilities small)
*/

// Gestionnaire d'erreurs global pour les extensions tierces
window.addEventListener('error', function(e) {
    // Ignorer les erreurs spÃƒÂ©cifiques aux extensions (Bybit, etc.)
    if (e.filename && (
        e.filename.includes('frame_start.js') ||
        e.filename.includes('bybit') ||
        e.filename.includes('extension') ||
        e.filename.includes('chrome-extension') ||
        e.filename.includes('moz-extension')
    )) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('Extension error blocked:', e.message);
        return false;
    }
    
    // Ignorer les erreurs de removeChild sur des nÃ…â€œuds non existants
    if (e.message && e.message.includes('removeChild') && e.message.includes('not a child of this node')) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('DOM manipulation error blocked:', e.message);
        return false;
    }
}, true);

// Protection supplÃƒÂ©mentaire pour les manipulations DOM
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function(child) {
    try {
        return originalRemoveChild.call(this, child);
    } catch (e) {
        if (e.message && e.message.includes('not a child of this node')) {
            console.warn('removeChild error prevented:', e.message);
            return child;
        }
        throw e;
    }
};

// Protection pour removeChild sur Element
const originalElementRemoveChild = Element.prototype.removeChild;
Element.prototype.removeChild = function(child) {
    try {
        return originalElementRemoveChild.call(this, child);
    } catch (e) {
        if (e.message && e.message.includes('not a child of this node')) {
            console.warn('Element.removeChild error prevented:', e.message);
            return child;
        }
        throw e;
    }
};

(function () {
    'use strict';

    // Ensure a minimal global ToastSystem exists to avoid runtime ReferenceError
    if (typeof window !== 'undefined' && typeof window.ToastSystem === 'undefined') {
        (function (w) {
            const id = 'tgt-fallback-toast-container';
            function ensure() {
                let c = document.getElementById(id);
                if (c) return c;
                c = document.createElement('div');
                c.id = id;
                c.style.cssText = 'position:fixed;right:18px;top:18px;z-index:21000;display:flex;flex-direction:column;gap:10px;max-width:360px;';
                document.body.appendChild(c);
                return c;
            }
            w.ToastSystem = {
                show(type, title, message, duration = 5000) {
                    try {
                        const c = ensure();
                        const t = document.createElement('div');
                        t.style.cssText = 'background:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12);border-left:4px solid #D4AF37;position:relative;';
                        t.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">${title||''}</div><div style="font-size:13px;color:#333;">${message||''}</div>`;
                        const btn = document.createElement('button'); btn.textContent = 'x'; btn.style.cssText = 'position:absolute;right:6px;top:6px;border:none;background:transparent;font-size:14px;cursor:pointer;';
                        btn.addEventListener('click', ()=>{ try{ t.remove(); }catch(e){} });
                        t.appendChild(btn);
                        c.appendChild(t);
                        setTimeout(()=>{ try{ t.remove(); }catch(e){} }, duration);
                        return { dismiss: ()=>{ try{ t.remove(); }catch(e){} } };
                    } catch (e) { console.warn('fallback ToastSystem failed', e); return { dismiss: ()=>{} }; }
                }
            };
        })(window);
    }

    // Default restaurant coords (Bamako, Mali)
    const RESTAURANT_COORDS = { lat: 12.6392, lng: -8.0029 };

    function initMobileMenu() {
        const btn = document.getElementById('mobileMenuBtn');
        const mobileNav = document.getElementById('mobileNav');
        const closeBtn = document.getElementById('mobileNavClose');
        if (!btn || !mobileNav) return;

        btn.addEventListener('click', () => {
            mobileNav.classList.add('open');
        });
        if (closeBtn) closeBtn.addEventListener('click', () => mobileNav.classList.remove('open'));

        // close when clicking outside
        document.addEventListener('click', (ev) => {
            if (!mobileNav.classList.contains('open')) return;
            const inside = mobileNav.contains(ev.target) || btn.contains(ev.target);
            if (!inside) mobileNav.classList.remove('open');
        });
    }

    // Normalize image URLs to absolute paths without fallback
    function normalizeImageUrl(src) {
        if (!src) return '';

        const value = String(src).trim();
        if (!value) return '';

        if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
            return value;
        }

        const assetsBase = (window.ASSETS_BASE_URL || '/assets').replace(/\/+$/, '');

        if (value === 'default.jpg') {
            return assetsBase + '/images/default.jpg';
        }

        if (value.startsWith('/')) {
            if (value.startsWith('/assets/') && assetsBase !== '/assets') {
                return assetsBase + value.slice('/assets'.length);
            }
            return value;
        }

        if (value.startsWith('assets/')) {
            return assetsBase + value.slice('assets'.length);
        }

        if (value.startsWith('images/')) {
            return assetsBase + '/' + value;
        }

        return assetsBase + '/images/' + value;
    }

    function withCacheBust(url, bust) {
        const cleanUrl = (url || '').toString().trim();
        if (!cleanUrl) return '';
        const b = (bust || '').toString().trim();
        if (!b) return cleanUrl;
        const sep = cleanUrl.includes('?') ? '&' : '?';
        return cleanUrl + sep + 'v=' + encodeURIComponent(b);
    }

    async function parseJsonSafely(response, contextLabel) {
        const text = await response.text();
        if (!text || !text.trim()) return null;
        try {
            return JSON.parse(text);
        } catch (err) {
            const snippet = text.slice(0, 180);
            throw new Error((contextLabel || 'API') + ' JSON invalide: ' + snippet);
        }
    }

    function startOrderFromItem(rawItem) {
        const item = (rawItem && typeof rawItem === 'object') ? rawItem : null;
        if (!item) return;

        const id = item.id ?? item.menu_id ?? item.product_id ?? null;
        if (!id) return;

        const qty = Math.max(1, parseInt(item.qty ?? item.quantity ?? 1, 10) || 1);
        const price = parseInt(item.price ?? item.unit_price ?? 0, 10) || 0;

        const selectedItem = {
            id,
            name: item.name || item.title || 'Article',
            qty,
            quantity: qty,
            unit_price: price,
            price,
            image_url: item.image_url || item.image || '',
            type: String(item.type || (item.is_product ? 'product' : 'menu') || 'menu')
        };

        try {
            localStorage.setItem('tgt_selected_menus', JSON.stringify([selectedItem]));
            localStorage.setItem('tgt_order_autostep', JSON.stringify({
                step: 2,
                source: 'commander',
                item_id: id
            }));
        } catch (e) {}

        const hasOrderSection = !!document.getElementById('order');
        if (hasOrderSection && typeof window.nextStep === 'function') {
            try { window.location.hash = '#order'; } catch (e) {}
            setTimeout(() => {
                try { window.nextStep(2); } catch (e) {}
            }, 120);
            return;
        }

        window.location.href = 'index.html#order';
    }

    window.startOrderFromItem = startOrderFromItem;
    // Create an img element without fallback
    function createImgWithFallback(src, alt) {
        const img = document.createElement('img');
        img.alt = alt || '';
        
        // Ne crÃƒÂ©er l'image que si src existe
        if (src && src.trim() !== '') {
            const normalized = normalizeImageUrl(src);
            img.src = normalized;
            img.dataset.tgtFallback = '0';
            img.addEventListener('error', function () {
                if (img.dataset.tgtFallback === '1') {
                    img.style.display = 'none';
                    return;
                }
                img.dataset.tgtFallback = '1';
                const fallback = window.DEFAULT_IMAGE || normalizeImageUrl('default.jpg');
                if (fallback && fallback !== img.src) {
                    img.src = fallback;
                } else {
                    img.style.display = 'none';
                }
            });
        } else {
            // Cacher l'image si pas de source
            img.style.display = 'none';
        }
        
        return img;
    }

    // Create a product-card DOM node
    function createProductCard(product) {
        // VÃƒÂ©rifier que le produit existe et a un ID
        if (!product || !product.id) {
            return null;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('tabindex','0');
        // Standardized data-* attributes required by product selection flow
        card.dataset.id = product.id;
        card.dataset.name = product.name || '';
        card.dataset.price = product.price || 0;
        
        // Gestion des images sans fallback par dÃƒÂ©faut
        let imageUrl = '';
        if (product.image_url) {
            if (Array.isArray(product.image_url)) {
                imageUrl = product.image_url[0] || '';
            } else if (typeof product.image_url === 'string') {
                try {
                    const parsed = JSON.parse(product.image_url);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        imageUrl = parsed[0];
                    }
                } catch (e) {
                    imageUrl = product.image_url;
                }
            }
        } else if (product.images) {
            if (Array.isArray(product.images)) {
                imageUrl = product.images[0] || '';
            } else if (typeof product.images === 'string') {
                try {
                    const parsed = JSON.parse(product.images);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        imageUrl = parsed[0];
                    }
                } catch (e) {
                    imageUrl = product.images;
                }
            }
        }
        
        // Ne mettre l'image que si elle existe
        if (imageUrl) {
            const normalized = normalizeImageUrl(imageUrl);
            const bust = product.updated_at || product.updatedAt || product.id || '';
            card.dataset.image = withCacheBust(normalized, bust);
        } else {
            card.dataset.image = '';
        }

        const imgWrap = document.createElement('div');
        imgWrap.className = 'product-image';
        const imgEl = createImgWithFallback(card.dataset.image, product.name || '');
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'cover';
        imgWrap.appendChild(imgEl);

        const content = document.createElement('div');
        content.className = 'product-content';

        const title = document.createElement('h3');
        title.textContent = product.name || 'Produit';

        const desc = document.createElement('p');
        desc.className = 'product-desc';
        desc.textContent = product.description ? (product.description.length > 120 ? product.description.slice(0, 117) + '...' : product.description) : '';

        const price = document.createElement('div');
        price.className = 'product-price';
        price.textContent = (product.price ? product.price + ' FCFA' : '-');

        const meta = document.createElement('div');
        meta.className = 'product-meta';
        const stock = document.createElement('div');
        stock.className = product.stock > 0 ? 'in-stock' : 'out-of-stock';
        stock.textContent = product.stock > 0 ? 'En stock' : 'Rupture';
        meta.appendChild(stock);

        const actions = document.createElement('div');
        actions.className = 'product-actions';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = 'Ajouter';
        addBtn.disabled = !(product.stock > 0);
        addBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (typeof window.addToCartFromHome === 'function') {
                window.addToCartFromHome(product.id || product.product_id || null, product);
            } else {
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: product }));
            }
        });

        const orderBtn = document.createElement('button');
        orderBtn.className = 'btn btn-primary';
        orderBtn.textContent = 'Commander';
        orderBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            startOrderFromItem({ id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price), image_url: card.dataset.image, type: 'product' });
        });

        actions.appendChild(addBtn);
        actions.appendChild(orderBtn);

        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(price);
        content.appendChild(meta);
        content.appendChild(actions);

        card.appendChild(imgWrap);
        card.appendChild(content);

        // Open product modal on click anywhere on card (except Add button)
        card.addEventListener('click', (e) => {
            if (e.target === addBtn || addBtn.contains(e.target) || e.target === orderBtn || orderBtn.contains(e.target)) return;
            showProductModal(product);
        });

        // Keyboard accessibility: Enter/Space opens modal
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showProductModal(product);
            }
        });
        return card;
    }

    // Show a modal with full product details
    function showProductModal(product) {
        // Remove existing modal
        const existing = document.getElementById('tgtProductModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'tgtProductModal';
        modal.className = 'tgt-modal';

        // Build gallery using safe img elements without fallback
        const galleryEl = document.createElement('div');
        galleryEl.className = 'tgt-modal-gallery';
        (function buildGallery() {
            if (product.images) {
                try {
                    const arr = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                    if (Array.isArray(arr) && arr.length) {
                        arr.forEach(src => {
                            if (src && src.trim() !== '') {
                                const img = createImgWithFallback(normalizeImageUrl(src), product.name || '');
                                galleryEl.appendChild(img);
                            }
                        });
                        return;
                    }
                } catch (e) {}
            }
            if (product.image_url && product.image_url.trim() !== '') {
                const img = createImgWithFallback(normalizeImageUrl(product.image_url), product.name || '');
                galleryEl.appendChild(img);
                return;
            }
            const placeholder = document.createElement('div');
            placeholder.className = 'placeholder-img';
            placeholder.innerHTML = '<i class="fas fa-utensils"></i>';
            galleryEl.appendChild(placeholder);
        })();

        const typeLabelRaw = product.type || product.source || (product.is_product ? 'boutique' : 'restaurant') || 'restaurant';
        const priceVal = parseInt(product.price ?? 0, 10) || 0;
        const priceLabel = (window.App && typeof window.App.formatMoney === 'function') ? window.App.formatMoney(priceVal) : (priceVal ? (priceVal + ' FCFA') : '-');
        const isInStock = (product.in_stock === true) || (String(product.in_stock).toLowerCase() === '1') || ((parseInt(product.stock ?? product.stock_quantity ?? 0, 10) || 0) > 0);
        const stockLabel = isInStock ? 'En stock' : 'Rupture';
        const categoryLabel = (product.category || product.category_name || '').toString().trim();
        const safeName = (product.name || product.title || '').toString().trim();
        const safeDesc = (product.description || '').toString().trim();

        // escape helpers (escapeHtml is defined globally in app.js)
        const esc = (typeof escapeHtml === 'function') ? escapeHtml : (s => String(s ?? ''));
        const typeLabel = esc(typeLabelRaw);
        const safeNameHtml = esc(safeName);
        const categoryHtml = esc(categoryLabel);

        modal.innerHTML = `
            <div class="tgt-modal-backdrop"></div>
            <div class="tgt-modal-panel">
                <button class="tgt-modal-close" aria-label="Fermer">&times;</button>
                <div class="tgt-modal-body product-modal">
                    <div class="tgt-modal-gallery">` + galleryEl.innerHTML + `</div>
                    <div class="tgt-modal-info">
                        <div class="tgt-modal-head">
                            <h3 class="tgt-modal-title">${safeNameHtml}</h3>
                            <div class="tgt-modal-badges">
                                <span class="tgt-badge ${isInStock ? 'tgt-badge-success' : 'tgt-badge-danger'}">${stockLabel}</span>
                                ${categoryLabel ? `<span class="tgt-badge tgt-badge-muted">${categoryHtml}</span>` : ''}
                                <span class="tgt-badge tgt-badge-gold">${typeLabel}</span>
                            </div>
                            <div class="tgt-modal-price">${priceLabel}</div>
                        </div>

                        <div class="tgt-modal-section">
                            <div class="tgt-section-title">Description</div>
                            <div class="tgt-modal-desc">${safeDesc ? esc(safeDesc) : '<span class="muted">Aucune description disponible.</span>'}</div>
                        </div>

                        <div class="tgt-modal-actions">
                            <div class="tgt-qty">
                                <label for="tgtModalQty">Quantite</label>
                                <input id="tgtModalQty" type="number" min="1" value="1" />
                            </div>
                            <button class="btn btn-primary modal-add" ${!isInStock ? 'disabled' : ''}>Ajouter au panier</button>
                            <button class="btn btn-outline modal-close">Fermer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (typeof lockPageScroll === 'function') lockPageScroll();

        const closeModal = () => {
            modal.remove();
            if (typeof syncPageScrollLock === 'function') syncPageScrollLock();
        };

        // Event listeners
        modal.querySelectorAll('.modal-close, .tgt-modal-close').forEach((btn) => btn.addEventListener('click', closeModal));
        modal.querySelector('.tgt-modal-backdrop').addEventListener('click', closeModal);
        const addBtn = modal.querySelector('.modal-add');
        if (addBtn) addBtn.addEventListener('click', () => {
            if (addBtn.disabled) return;
            const qty = parseInt(modal.querySelector('#tgtModalQty')?.value || '1', 10) || 1;
            const item = {
                id: product.id || product.product_id || null,
                name: safeName,
                price: priceVal,
                quantity: qty,
                type: product.type || (product.is_product ? 'product' : 'menu') || 'product',
                image_url: product.image_url || product.main_image || product.image || ''
            };
            if (typeof window.addToCartFromHome === 'function') {
                window.addToCartFromHome(item.id || null, item);
            } else {
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: item }));
            }
            closeModal();
        });
    }

    // Show an order modal prefilled for selected product/menu and handle submission
    function showOrderModal(item) {
        // item: { id, name, price, image, type }
        const existing = document.getElementById('tgtOrderModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'tgtOrderModal';
        modal.className = 'tgt-modal';

        modal.innerHTML = `
        <div class="tgt-modal-backdrop">
            <div class="tgt-modal-panel">
                <button class="tgt-modal-close" aria-label="Fermer">&times;</button>
                <div class="tgt-modal-body order-modal">
                    <div class="order-left">
                        <div class="order-image"></div>
                    </div>
                    <div class="order-right">
                        <h3 class="order-title"></h3>
                        <p class="order-price"></p>
                        <div class="form-row">
                            <label>Quantite</label>
                            <input type="number" id="orderQty" value="1" min="1" />
                        </div>
                        <div class="form-row">
                            <label>Total</label>
                            <p id="orderTotal"></p>
                        </div>
                        <div class="form-row">
                            <label>Adresse de livraison</label>
                            <input type="text" id="orderAddress" placeholder="Rue et numero" />
                        </div>
                        <div class="form-row">
                            <label>Quartier</label>
                            <input type="text" id="orderQuarter" placeholder="Quartier" value="" />
                        </div>
                        <div class="form-row">
                            <label>Instructions</label>
                            <textarea id="orderNotes" rows="2" placeholder="Instructions pour le livreur..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-outline modal-close">Annuler</button>
                            <button class="btn btn-primary" id="confirmOrderBtn">Confirmer la commande</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.appendChild(modal);
        if (typeof lockPageScroll === 'function') lockPageScroll();

        const closeOrderModal = () => {
            modal.remove();
            if (typeof syncPageScrollLock === 'function') syncPageScrollLock();
        };

        // Fill content
        const imgContainer = modal.querySelector('.order-image');
        const imgEl = createImgWithFallback(item.image, item.name || '');
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'cover';
        imgContainer.appendChild(imgEl);
        modal.querySelector('.order-title').textContent = item.name || '';
        modal.querySelector('.order-price').textContent = (item.price ? item.price + ' FCFA' : '-');

        const qty = modal.querySelector('#orderQty');
        const total = modal.querySelector('#orderTotal');
        function updateTotal() {
            const q = Number(qty.value) || 1;
            total.textContent = ((Number(item.price) || 0) * q + 1000) + ' FCFA'; // include delivery fee
        }
        qty.addEventListener('input', updateTotal);
        updateTotal();

        // Event listeners (support both generic .modal-close and our .tgt-modal-close)
        modal.querySelectorAll('.modal-close, .tgt-modal-close').forEach(b => b.addEventListener('click', closeOrderModal));
        modal.querySelector('.tgt-modal-backdrop').addEventListener('click', closeOrderModal);

        const confirmBtn = modal.querySelector('#confirmOrderBtn');
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    // Ask user to login
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal) {
                        loginModal.style.display = 'flex';
                        loginModal.setAttribute('aria-hidden','false');
                        if (typeof lockPageScroll === 'function') lockPageScroll();
                    } else {
                        alert('Veuillez vous connecter pour passer commande.');
                    }
                    confirmBtn.disabled = false;
                    return;
                }

                const orderData = {
                    items: [
                        { id: item.id || null, name: item.name || '', price: Number(item.price) || 0, type: item.type || item.type || 'product' }
                    ],
                    delivery_address: modal.querySelector('#orderAddress').value || '',
                    delivery_quarter: modal.querySelector('#orderQuarter').value || '',
                    notes: modal.querySelector('#orderNotes').value || '',
                    payment_method: 'cash'
                };

                (window.LoadingSystem || { show: ()=>{}, hide: ()=>{} }).show('Creation de la commande...');
                // Use existing createOrder helper
                const res = await createOrder(orderData);
                (window.LoadingSystem || { show: ()=>{}, hide: ()=>{} }).hide();
                // Support API shape: { success, data: { order | id }, message }
                const orderObj = res && (res.data?.order || (res.data && (res.data.id ? res.data : null)) || res.order || null);
                if (res && res.success && orderObj) {
                    ToastSystem.show('success', 'Commande creee', 'Votre commande a ete creee');
                    // Optionally open order details or show id
                    closeOrderModal();
                } else {
                    ToastSystem.show('error', 'Erreur', (res && (res.message || (res.data && res.data.message))) || 'Impossible de creer la commande');
                    confirmBtn.disabled = false;
                }
            } catch (err) {
                (window.LoadingSystem || { show: ()=>{}, hide: ()=>{} }).hide();
                console.error(err);
                ToastSystem.show('error', 'Erreur', err.message || 'Erreur lors de la commande');
                confirmBtn.disabled = false;
            }
        });
    }

    // Load boutique products for a specific category (uses cache when possible)
    async function loadBoutiqueCategory(category = 'all') {
        const root = document.getElementById('productsContainer');
        if (!root) return;
        
        // Si on a dÃƒÂ©jÃƒÂ  les produits en cache et que c'est "all", filtrer cÃƒÂ´tÃƒÂ© client
        if (Array.isArray(__tgt_products) && __tgt_products.length && category === 'all') {
            renderProducts(__tgt_products, 'productsContainer');
            return;
        }

        // Sinon, charger depuis l'API
        await loadBoutiqueProducts(category);
    }

    // Cached products to support client-side filtering without refetching
    let __tgt_products = []; // Produits boutique
    let __tgt_menu_items = []; // Plats du menu

    // Fonction pour crÃƒÂ©er une carte de menu (plats du restaurant)
    function createMenuCard(menuItem) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('tabindex', '0');
        card.dataset.id = menuItem.id || '';
        card.dataset.name = menuItem.name || '';
        card.dataset.price = menuItem.price || 0;
        {
            const normalized = normalizeImageUrl(menuItem.image_url || menuItem.image || '');
            const bust = menuItem.updated_at || menuItem.updatedAt || menuItem.id || '';
            card.dataset.image = withCacheBust(normalized, bust);
        }

        const imgWrap = document.createElement('div');
        imgWrap.className = 'product-image';
        const imgEl = createImgWithFallback(card.dataset.image, menuItem.name || '');
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'cover';
        imgWrap.appendChild(imgEl);

        const content = document.createElement('div');
        content.className = 'product-content';

        const title = document.createElement('h3');
        title.textContent = menuItem.name || 'Plat';

        const desc = document.createElement('p');
        desc.className = 'product-desc';
        desc.textContent = menuItem.description ? (menuItem.description.length > 120 ? menuItem.description.slice(0, 117) + '...' : menuItem.description) : '';

        const price = document.createElement('div');
        price.className = 'product-price';
        price.textContent = (menuItem.price ? menuItem.price + ' FCFA' : '-');

        const meta = document.createElement('div');
        meta.className = 'product-meta';
        const category = document.createElement('div');
        category.className = 'menu-category';
        category.textContent = menuItem.category || '';
        meta.appendChild(category);

        const actions = document.createElement('div');
        actions.className = 'product-actions';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = 'Ajouter';
        addBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (typeof window.addToCartFromHome === 'function') {
                window.addToCartFromHome(menuItem.id || null, { ...menuItem, type: 'menu' });
            } else {
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: { ...menuItem, type: 'menu' } }));
            }
        });

        const orderBtn = document.createElement('button');
        orderBtn.className = 'btn btn-primary';
        orderBtn.textContent = 'Commander';
        orderBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            startOrderFromItem({ id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price), image_url: card.dataset.image, type: 'menu' });
        });

        actions.appendChild(addBtn);
        actions.appendChild(orderBtn);

        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(price);
        content.appendChild(meta);
        content.appendChild(actions);

        card.appendChild(imgWrap);
        card.appendChild(content);

        // Ouvrir modal au clic
        card.addEventListener('click', (e) => {
            if (e.target === addBtn || addBtn.contains(e.target) || e.target === orderBtn || orderBtn.contains(e.target)) return;
            showProductModal({ ...menuItem, type: 'menu' });
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showProductModal({ ...menuItem, type: 'menu' });
            }
        });

        return card;
    }

    function renderProducts(items, targetId) {
        const root = document.getElementById(targetId);
        if (!root) return;

        if (!Array.isArray(items) || !items.length) {
            root.innerHTML = '<div class="menu-card"><p>Aucun produit disponible.</p></div>';
            return;
        }

        const targetIsGrid = root.classList && root.classList.contains('products-grid');
        const container = targetIsGrid ? root : document.createElement('div');
        if (!targetIsGrid) {
            container.className = 'products-grid';
        }

        container.innerHTML = '';

        items.forEach(item => {
            // Utiliser createMenuCard pour les plats du menu, createProductCard pour les produits boutique
            const card = item && (item.type === 'menu' || item.is_menu) ? createMenuCard(item) : createProductCard(item);
            if (card) container.appendChild(card);
        });

        if (!targetIsGrid) {
            root.innerHTML = '';
            root.appendChild(container);
        }
    }

    // Charger le menu du jour
    async function loadMenuOfTheDay() {
        const root = document.getElementById('menuContainer');
        if (!root) return;
        root.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement du menu...</p></div>';

        try {
            const res = await fetch(`${API_BASE_URL}/menu/menu-du-jour.php`);
            const json = await parseJsonSafely(res, 'menu/menu-du-jour.php');

            let menu = null;
            if (json && json.success && json.data) {
                menu = json.data;
            } else if (json && json.menu) {
                menu = Array.isArray(json.menu) ? json.menu[0] : json.menu;
            }

            if (!menu) {
                root.innerHTML = '<div class="menu-card"><p>Aucun menu du jour disponible pour le moment.</p></div>';
                return;
            }

            // Afficher le menu du jour avec le nouveau design compact et animé
            const menuCard = createMenuCard(menu);
            
            // Ajouter le badge spécial "Menu du jour"
            const badgeSpecial = document.createElement('div');
            badgeSpecial.className = 'badge-special';
            badgeSpecial.textContent = 'Menu du jour';
            menuCard.appendChild(badgeSpecial);
            
            root.innerHTML = '';
            root.appendChild(menuCard);
        } catch (err) {
            console.error('Erreur chargement menu du jour:', err);
            root.innerHTML = '<div class="menu-card"><p>Impossible de charger le menu du jour.</p></div>';
        }
    }

    // Charger tous les plats du menu avec filtres par catÃƒÂ©gorie
    async function loadAllMenuItems(category = 'all') {
        const root = document.getElementById('allMenuContainer');
        if (!root) return;

        root.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement de la carte...</p></div>';

        try {
            const url = `${API_BASE_URL}/menu/all.php` + (category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '');
            const res = await fetch(url);
            const json = await parseJsonSafely(res, 'menu/all.php');

            let items = [];
            if (json && json.success && Array.isArray(json.data)) {
                items = json.data;
            } else if (Array.isArray(json)) {
                items = json;
            }

            // Ajouter le type 'menu' ÃƒÂ  chaque ÃƒÂ©lÃƒÂ©ment
            items = items.map(item => ({ ...item, type: 'menu' }));

            __tgt_menu_items = items;
            renderProducts(items, 'allMenuContainer');
        } catch (err) {
            console.error('Erreur chargement menu:', err);
            root.innerHTML = '<div class="menu-card"><p>Impossible de charger la carte.</p></div>';
        }
    }

    // Charger les produits boutique
    async function loadBoutiqueProducts(category = 'all') {
        const root = document.getElementById('productsContainer');
        if (!root) return;

        root.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement des produits...</p></div>';

        try {
            const url = `${API_BASE_URL}/shop/boutique.php` + (category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '');
            const res = await fetch(url);
            const json = await parseJsonSafely(res, 'shop/boutique.php');

            let items = [];
            if (json && json.success && Array.isArray(json.data)) {
                items = json.data;
            } else if (Array.isArray(json)) {
                items = json;
            }

            __tgt_products = items;
            renderProducts(items, 'productsContainer');
        } catch (err) {
            console.error('Erreur chargement produits boutique:', err);
            root.innerHTML = '<div class="menu-card"><p>Impossible de charger les produits.</p></div>';
        }
    }

    async function loadProducts() {
        // Cette fonction est conservÃƒÂ©e pour compatibilitÃƒÂ© mais ne charge plus automatiquement
        // Les fonctions spÃƒÂ©cifiques sont appelÃƒÂ©es sÃƒÂ©parÃƒÂ©ment
        const allMenuContainer = document.getElementById('allMenuContainer');
        const productsContainer = document.getElementById('productsContainer');
        
        if (allMenuContainer) {
            loadAllMenuItems();
        }
        if (productsContainer) {
            loadBoutiqueProducts();
        }
    }

    function initCategoryFilter() {
        // Support both global menu category buttons and shop category buttons
        const menuButtons = Array.from(document.querySelectorAll('.category-btn'));
        const shopButtons = Array.from(document.querySelectorAll('.category-filter-btn'));
        const allButtons = menuButtons.concat(shopButtons);
        
        if (!allButtons || !allButtons.length) return;

        // Gestion des boutons de catÃƒÂ©gorie du menu
        menuButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const category = (this.dataset.category || 'all').toString().toLowerCase();
                
                // Mettre ÃƒÂ  jour l'ÃƒÂ©tat visuel
                menuButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Mapping des catÃƒÂ©gories pour le filtrage
                const categoryMap = {
                    'plats': ['plat', 'plats', 'plats principaux'],
                    'entrees': ['entree', 'entrees', 'entrée', 'entrées'],
                    'desserts': ['dessert', 'desserts'],
                    'boissons': ['boisson', 'boissons']
                };

                // Filtrer cÃƒÂ´tÃƒÂ© client si on a dÃƒÂ©jÃƒÂ  les donnÃƒÂ©es, sinon charger depuis l'API
                if (Array.isArray(__tgt_menu_items) && __tgt_menu_items.length && category !== 'all') {
                    const validCategories = categoryMap[category] || [category];
                    const filtered = __tgt_menu_items.filter(item => {
                        const cat = ((item.category || '') + '').toLowerCase().trim();
                        return validCategories.some(validCat => cat === validCat || cat.includes(validCat));
                    });
                    renderProducts(filtered, 'allMenuContainer');
                } else if (category === 'all' && Array.isArray(__tgt_menu_items) && __tgt_menu_items.length) {
                    renderProducts(__tgt_menu_items, 'allMenuContainer');
                } else {
                    // Charger depuis l'API si on n'a pas les donnÃƒÂ©es ou si on veut recharger
                    loadAllMenuItems(category);
                }
            });
        });

        // Gestion des boutons de catÃƒÂ©gorie de la boutique
        shopButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const category = (this.dataset.category || 'all').toString().toLowerCase();
                
                // Mettre ÃƒÂ  jour l'ÃƒÂ©tat visuel
                shopButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Charger les produits boutique avec le filtre
                loadBoutiqueCategory(category);
            });
        });
    }

    // Optimize live status polling: call once on load and then poll every 60s
    (function initLiveStatus() {
        const liveEl = document.getElementById('live-status');
        if (!liveEl) return;
        let timer = null;
        async function fetchLive() {
            try {
                const res = await fetch(`${API_BASE_URL}/live.php`);
                if (!res.ok) return;
                const json = await parseJsonSafely(res, 'live.php');
                // update UI non-blocking
                if (json && json.status) {
                    liveEl.className = 'status ' + (json.status || 'loading');
                    const txt = liveEl.querySelector('.status-text');
                    if (txt) txt.textContent = json.message || (json.status === 'open' ? 'Ouvert' : 'Ferme');
                }
            } catch (e) {
                console.warn('Live status fetch failed:', e);
            }
        }
        // Initial call
        fetchLive();
        // Poll every 60s
        timer = setInterval(fetchLive, 60000);
        // expose to window for potential cleanup
        window.__tgt_live_timer = timer;
    })();

    function initMap() {
        const el = document.getElementById('restaurantMap');
        if (!el || typeof L === 'undefined') return;
        // If a map was already initialized on this element, reuse it
        if (el.__tgt_map) {
            try { el.__tgt_map.invalidateSize(); } catch (e) {}
            return el.__tgt_map;
        }

        // Create map and store reference on the element to avoid double-init errors
        const map = L.map(el, { scrollWheelZoom: false, zoomControl: false }).setView([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        }).addTo(map);

        // Add zoom control positioned at bottom-left and vertical
        L.control.zoom({ position: 'bottomleft' }).addTo(map);

        const markerIcon = L.divIcon({
            className: 'tgt-map-marker',
            iconSize: [54, 54],
            iconAnchor: [27, 27],
            popupAnchor: [0, -22],
            html: '<div class="tgt-map-marker-pin"><i class="fas fa-location-dot"></i></div>'
        });

        L.circle([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng], {
            radius: 180,
            color: '#d4af37',
            weight: 1.5,
            fillColor: '#d4af37',
            fillOpacity: 0.08
        }).addTo(map);

        const marker = L.marker([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(
            '<div class="tgt-map-popup">' +
                '<div class="tgt-map-popup-title">Titi Golden Taste</div>' +
                '<div class="tgt-map-popup-line">Avenue de l\'Indépendance</div>' +
                '<div class="tgt-map-popup-line">Badalabougou, Bamako</div>' +
                '<div class="tgt-map-popup-line">Mali</div>' +
                '<a class="tgt-map-popup-action" href="https://www.google.com/maps/dir/?api=1&destination=12.6392,-8.0029" target="_blank" rel="noopener">Itinéraire</a>' +
            '</div>'
        ).openPopup();

        el.__tgt_map = map;

        // Make map invalidateSize when visible (helpful when inside tabs or hidden containers)
        setTimeout(() => map.invalidateSize(), 300);
        return map;
    }

    // Charger les produits en vedette (pour la page restaurant)
    async function loadFeaturedProducts() {
        const root = document.getElementById('featuredProductsContainer');
        if (!root) return;

        root.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement des produits...</p></div>';

        try {
            // Charger seulement 6 produits en vedette
            const url = `${API_BASE_URL}/shop/boutique.php?limit=6`;
            const res = await fetch(url);
            const json = await parseJsonSafely(res, 'shop/boutique.php?limit=6');

            let items = [];
            if (json && json.success && Array.isArray(json.data)) {
                items = json.data.slice(0, 6); // Limiter ÃƒÂ  6 produits
            } else if (Array.isArray(json)) {
                items = json.slice(0, 6);
            }

            if (items.length === 0) {
                root.innerHTML = '<div class="menu-card"><p>Aucun produit en vedette pour le moment.</p></div>';
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'products-grid featured-products-list';

            items.forEach(p => {
                grid.appendChild(createProductCard(p));
            });

            root.innerHTML = '';
            root.appendChild(grid);
        } catch (err) {
            console.error('Erreur chargement produits vedette:', err);
            root.innerHTML = '<div class="menu-card"><p>Impossible de charger les produits.</p></div>';
        }
    }

    // Public init
    document.addEventListener('DOMContentLoaded', function () {
        initMobileMenu();
        
        // Charger le menu du jour (seulement sur index.html)
        if (document.getElementById('menuContainer')) {
            loadMenuOfTheDay();
        }
        
        // Charger tous les plats du menu (seulement sur index.html)
        if (document.getElementById('allMenuContainer')) {
            loadAllMenuItems();
        }
        
        // Charger les produits boutique (seulement sur boutique.html ou si productsContainer existe)
        if (document.getElementById('productsContainer')) {
            loadBoutiqueProducts();
        }
        
        // Charger les produits en vedette (seulement sur index.html)
        if (document.getElementById('featuredProductsContainer')) {
            loadFeaturedProducts();
        }
        
        initCategoryFilter();
        
        // Initialiser la carte seulement si l'ÃƒÂ©lÃƒÂ©ment existe
        if (document.getElementById('restaurantMap')) {
            initMap();
        }

        // Expose functions so other scripts can call them
        window.loadProducts = loadProducts;
        window.loadMenuOfTheDay = loadMenuOfTheDay;
        window.loadAllMenuItems = loadAllMenuItems;
        window.loadBoutiqueProducts = loadBoutiqueProducts;
        
        // Refresh cart counter if cart helper is available
        try { if (typeof window.updateCartCountLocal === 'function') window.updateCartCountLocal(); } catch (e) {}
        // Initialize header profile/login behavior
        try { if (typeof initAuthProfile === 'function') initAuthProfile(); } catch (e) {}
        // Adjust body padding so content flows under fixed header
        try { adjustBodyForHeader(); } catch (e) {}
    });

    // Ensure body has top padding equal to header height so content flows under header
    function adjustBodyForHeader() {
        const header = document.querySelector('.header');
        if (!header) return;
        const setPadding = () => {
            const h = header.offsetHeight || 110;
            try { document.body.style.paddingTop = ''; } catch (e) {}
            document.documentElement.style.setProperty('--header-offset', h + 'px');
            document.documentElement.classList.add('has-fixed-header');
        };
        setPadding();
        window.addEventListener('resize', setPadding);
        // If header changes size (dynamic), observe and adjust
        try {
            const obs = new ResizeObserver(() => setPadding());
            obs.observe(header);
        } catch (e) {}
    }

    // Login modal wiring: intercept .btn-login clicks to show inline modal if present
    document.addEventListener('click', function (ev) {
        const target = ev.target.closest && ev.target.closest('[data-login-modal="true"]');
        if (!target) return;
        const modal = document.getElementById('loginModal');
        if (!modal) return; // allow normal navigation if no inline modal
        ev.preventDefault();
        // show modal
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        if (typeof lockPageScroll === 'function') lockPageScroll();
    });

    // Wire header profile behavior: when logged in, convert login button into profile/dashboard shortcut
    function initAuthProfile() {
        const userData = localStorage.getItem('user_data');
        const userRole = localStorage.getItem('user_role');

        // Handle admin links visibility
        try {
            const adminLinks = Array.from(document.querySelectorAll('a[href="admin/dashboard.html"], a[href="./admin/dashboard.html"], a[href="/admin/dashboard.html"], a.btn-admin'));
            adminLinks.forEach(a => {
                if (userRole && userRole.toString() === 'admin') a.style.display = '';
                else a.style.display = 'none';
            });
        } catch (e) {}

        if (userData && userRole) {
            let parsed = null;
            try { parsed = JSON.parse(userData); } catch (e) { parsed = null; }
            const name = parsed && (parsed.name || parsed.full_name || parsed.first_name) ? (parsed.name || parsed.full_name || parsed.first_name) : 'Mon compte';
            
            // Hide register button when logged in
            const reg = document.querySelector('.nav-auth .btn-register') || document.querySelector('.btn-register');
            if (reg) reg.style.display = 'none';

            // Find or create the login/profile element
            let loginEl = document.querySelector('.nav-auth [data-login-modal="true"]') || document.querySelector('[data-login-modal="true"]');
            
            // If no login element found, look for any auth button to replace
            if (!loginEl) {
                loginEl = document.querySelector('.nav-auth .btn-login') || document.querySelector('.btn-login');
            }
            
            // If still no element, create one in the nav-auth
            if (!loginEl) {
                const navAuth = document.querySelector('.nav-auth');
                if (navAuth) {
                    loginEl = document.createElement('a');
                    loginEl.setAttribute('data-login-modal', 'true');
                    loginEl.className = 'btn-login';
                    navAuth.appendChild(loginEl);
                }
            }
            
            if (!loginEl) return;

            // Clear existing content and convert to profile button
            loginEl.innerHTML = '';
            loginEl.classList.add('btn-profile');
            loginEl.classList.remove('btn-login');
            
            // If loginEl is a link, remove navigation to allow dropdown/button behavior
            try { 
                if (loginEl.tagName && loginEl.tagName.toLowerCase() === 'a') { 
                    loginEl.removeAttribute('href'); 
                    loginEl.setAttribute('role','button'); 
                } 
            } catch (e) {}
            
            const wrapper = document.createElement('div');
            wrapper.className = 'profile-wrapper';

            const profileBtn = document.createElement('button');
            profileBtn.className = 'btn profile-btn';
            
            // Add user avatar or default icon
            const avatar = document.createElement('img');
            avatar.className = 'profile-avatar';
            const userAvatar = parsed && (parsed.avatar || parsed.image_url);
            if (userAvatar) {
                avatar.src = userAvatar;
            } else {
                avatar.src = (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
            }
            avatar.alt = 'Avatar';
            avatar.onerror = function() {
                if (this.dataset.tgtFallback === '1') return;
                this.dataset.tgtFallback = '1';
                const fallback = (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
                if (this.src !== fallback) {
                    this.src = fallback;
                }
            };
            profileBtn.appendChild(avatar);
            
            const txt = document.createElement('span');
            txt.textContent = name;
            profileBtn.appendChild(txt);

            const dropdown = document.createElement('div');
            dropdown.className = 'profile-dropdown';
            const role = (userRole || '').toString().toLowerCase();
            const dashboardItem = (() => {
                // Only show dashboard for admin and livreur roles, not for clients
                if (role === 'admin') return `<a href="admin/dashboard.html" class="dropdown-item" data-action="dashboard"><i class="fas fa-tachometer-alt"></i> Aller au dashboard</a>`;
                if (role === 'livreur') return `<a href="delivery/dashboard.html" class="dropdown-item" data-action="dashboard"><i class="fas fa-tachometer-alt"></i> Aller au dashboard</a>`;
                return '';
            })();
            const path = (window.location.pathname || '').toLowerCase();
            const onBoutique = path.endsWith('/boutique.html') || path.endsWith('boutique.html');
            const switchHref = onBoutique ? 'index.html' : 'boutique.html';
            const switchLabel = onBoutique ? 'Acceder au restaurant' : 'Acceder a la boutique';
            const switchIcon = onBoutique ? 'fa-utensils' : 'fa-store';

            dropdown.innerHTML = `
                <div class="profile-header">
                    <img src="${userAvatar || (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg'}" alt="Profile" class="dropdown-avatar">
                    <div class="profile-info">
                        <div class="profile-name">${name}</div>
                        <div class="profile-email">${parsed && parsed.email ? parsed.email : ''}</div>
                    </div>
                </div>
                <div class="dropdown-divider"></div>
                ${dashboardItem}
                <a href="profile.html" class="dropdown-item" data-action="profile"><i class="fas fa-user"></i> Profil</a>
                <a href="${switchHref}" class="dropdown-item" data-action="switch"><i class="fas ${switchIcon}"></i> ${switchLabel}</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item text-danger" data-action="logout"><i class="fas fa-sign-out-alt"></i> Deconnexion</a>
            `;

            wrapper.appendChild(profileBtn);
            wrapper.appendChild(dropdown);
            loginEl.appendChild(wrapper);

            // Toggle dropdown
            profileBtn.addEventListener('click', function (ev) {
                ev.stopPropagation();
                dropdown.classList.toggle('open');
            });

            // Close dropdown on outside click
            document.addEventListener('click', function () { dropdown.classList.remove('open'); });

            // Dropdown actions
            dropdown.addEventListener('click', function (e) {
                const a = e.target.closest && e.target.closest('.dropdown-item');
                if (!a) return;
                const action = a.dataset.action;
                if (action === 'dashboard') {
                    // allow normal navigation
                    return;
                } else if (action === 'logout') {
                    e.preventDefault();
                    // Call logout endpoint if available, then clear session
                    try {
                        fetch((window.API_BASE_URL || '') + '/auth/logout.php', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
                    } catch (err) {}
                    localStorage.clear();
                    window.location.href = 'login.html';
                } else if (action === 'profile') {
                    e.preventDefault();
                    window.location.href = 'profile.html';
                } else if (action === 'switch') {
                    // Allow normal navigation to the contextual page
                    return;
                }
            });
        }
    }

    // Close login modal handlers
    // document.addEventListener('DOMContentLoaded', function () {
    //     const modal = document.getElementById('loginModal');
    //     if (!modal) return;
    //     const closeBtn = document.getElementById('loginModalClose') || modal.querySelector('.modal-close');
    //     function hideModal(el) {
    //         try {
    //             const active = document.activeElement;
    //             if (active && el.contains(active)) {
    //                 try { active.blur(); } catch (e) {}
    //             }
    //         } catch (e) {}
    //         el.style.display = 'none';
    //         el.setAttribute('aria-hidden', 'true');
    //         if (typeof unlockPageScroll === 'function') unlockPageScroll();
    //     }

    //     if (closeBtn) closeBtn.addEventListener('click', () => { hideModal(modal); });
    //     // click outside to close
    //     modal.addEventListener('click', function (e) {
    //         if (e.target === modal) { hideModal(modal); }
    //     });
    //     // hidden by default
    //     hideModal(modal);
    // });

    // Expose key functions globally so inline scripts can reuse them and avoid duplicate initialization
    try { window.initMap = initMap; } catch (e) {}
    try { window.initCategoryFilter = initCategoryFilter; } catch (e) {}
    try { window.initAuthProfile = initAuthProfile; } catch (e) {}
    try { window.loadProducts = loadProducts; } catch (e) {}

})();

// Modal scroll management
const __modalLockState = {
    locked: false,
    scrollY: 0,
    bodyPaddingRight: ''
};

function isModalNodeVisible(node) {
    if (!node) return false;
    if (node.classList.contains('show') || node.classList.contains('open') || node.classList.contains('active')) return true;
    if (node.getAttribute('aria-hidden') === 'false') return true;

    const inlineDisplay = (node.style && node.style.display) ? node.style.display.toLowerCase() : '';
    if (inlineDisplay === 'flex' || inlineDisplay === 'block' || inlineDisplay === 'grid') return true;

    const computed = window.getComputedStyle(node);
    if (!computed) return false;
    return computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0';
}

function hasActiveModalLayer() {
    const selector = '.modal, .tgt-modal, .product-modal, .login-prompt-modal, .terms-modal, .modal-overlay, .video-player-modal, .batch-sync-modal, .live-modal, .media-modal, .video-modal, .order-details-modal, .cart-sidebar.open, .cart-overlay.open, .cart-overlay.active';
    return Array.from(document.querySelectorAll(selector)).some(isModalNodeVisible);
}

function lockPageScroll() {
    if (__modalLockState.locked) return;
    __modalLockState.scrollY = window.scrollY || window.pageYOffset || 0;
    __modalLockState.bodyPaddingRight = document.body.style.paddingRight || '';
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.top = `-${__modalLockState.scrollY}px`;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    __modalLockState.locked = true;
}

// function unlockPageScroll(force = false) {
//     if (!force && hasActiveModalLayer()) return;
//     if (!__modalLockState.locked) return;

//     const restoreY = __modalLockState.scrollY || 0;
//     document.body.classList.remove('modal-open');
//     document.documentElement.classList.remove('modal-open');
//     document.body.style.top = '';
//     document.body.style.paddingRight = __modalLockState.bodyPaddingRight;
//     __modalLockState.locked = false;
    
//     // Utiliser requestAnimationFrame pour éviter la récursion
//     requestAnimationFrame(() => {
//         window.scrollTo(0, restoreY);
//     });
// }

// function syncPageScrollLock() {
//     if (hasActiveModalLayer()) lockPageScroll();
//     else unlockPageScroll(true);
// }

// window.lockPageScroll = lockPageScroll;
// window.unlockPageScroll = (force = false) => unlockPageScroll(force);
// window.syncPageScrollLock = syncPageScrollLock;

// document.addEventListener('DOMContentLoaded', function () {
//     let __tgtScrollLockSyncing = false;
//     let __tgtScrollLockSyncQueued = false;

//     function guardedSyncScrollLock() {
//         if (__tgtScrollLockSyncing) return;
//         __tgtScrollLockSyncing = true;
//         try {
//             syncPageScrollLock();
//         } finally {
//             setTimeout(() => {
//                 __tgtScrollLockSyncing = false;
//             }, 0);
//         }
//     }

//     guardedSyncScrollLock();
//     if (!document.body) return;
//     const modalObserver = new MutationObserver(() => {
//         if (__tgtScrollLockSyncQueued) return;
//         __tgtScrollLockSyncQueued = true;
//         window.requestAnimationFrame(() => {
//             __tgtScrollLockSyncQueued = false;
//             guardedSyncScrollLock();
//         });
//     });
//     modalObserver.observe(document.body, {
//         childList: true,
//         subtree: true,
//         attributes: true,
//         attributeFilter: ['class', 'style', 'aria-hidden']
//     });
// });

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    
    // Focus management
    setTimeout(() => {
        const firstFocusable = modal.querySelector('button, input, select, textarea, a[href]');
        if (firstFocusable) firstFocusable.focus();
    }, 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    unlockPageScroll();
}

// Quick login modal handler (works when auths.js is not included)
document.addEventListener('DOMContentLoaded', function () {
    try {
        const quickForm = document.getElementById('quickLoginForm');
        const modal = document.getElementById('loginModal');
        const closeBtn = document.getElementById('loginModalClose');
        
        if (!quickForm) return;

        // Close modal handlers
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                closeModal('loginModal');
            });
        }
        
        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal('loginModal');
                }
            });
        }
        
        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal('loginModal');
            }
        });

        // Open modal for login links
        document.querySelectorAll('[data-login-modal="true"]').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                openModal('loginModal');
            });
        });

        quickForm.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            const emailInput = quickForm.querySelector('input[type="email"]');
            const passInput = quickForm.querySelector('input[type="password"]');
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passInput ? passInput.value : '';
            if (!email || !password) {
                alert('Veuillez saisir votre email et mot de passe');
                return;
            }

            try {
                const url = (window.API_BASE_URL || 'backend/api') + '/auth/login.php';
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });
                const json = await resp.json();
                if (json && json.success && json.data) {
                    const payload = json.data;
                    try {
                        localStorage.setItem('auth_token', payload.token);
                        localStorage.setItem('user_data', JSON.stringify(payload.user));
                        localStorage.setItem('user_role', payload.user.role || 'client');
                        localStorage.setItem('user_id', payload.user.id || payload.user.id);
                        const expiry = Date.now() + ((payload.expires_in || 7*24*60*60) * 1000);
                        localStorage.setItem('token_expiry', expiry.toString());
                    } catch (e) { console.warn('Could not persist session to localStorage', e); }

                    // Close modal
                    quickForm.reset();
                    closeModal('loginModal');

                    // Call auth controller or update header
                    try {
                        if (window.authController && typeof window.authController.handleLoginSuccess === 'function') {
                            window.authController.handleLoginSuccess(payload);
                        }
                    } catch (e) { console.warn('authController callback failed', e); }

                    // Show welcome toast and reload to update header/UI
                    try { if (typeof initAuthProfile === 'function') initAuthProfile(); } catch (e) {}
                    try {
                        const user = payload.user || {};
                        const displayName = user.last_name || user.lastName || user.family_name || user.name || user.first_name || '';
                        ToastSystem.show('success', 'Bienvenue ' + (displayName || '').trim(), 'Connexion réussie', 1200);
                    } catch (e) {}
                    const role = ((payload.user && payload.user.role) ? String(payload.user.role) : 'client').toLowerCase();
                    let targetUrl = '';
                    if (role === 'admin' || role === 'super_admin') targetUrl = 'admin/dashboard.html';
                    if (role === 'livreur' || role === 'delivery') targetUrl = 'delivery/dashboard.html';
                    setTimeout(() => {
                        try { if (typeof initAuthProfile === 'function') initAuthProfile(); } catch (e) {}
                        if (targetUrl) {
                            window.location.href = targetUrl + '?_t=' + Date.now();
                        } else {
                            window.location.reload();
                        }
                    }, 900);
                    return;
                }

                const msg = (json && (json.message || (json.data && json.data.message))) || 'Échec de la connexion';
                alert(msg);
            } catch (err) {
                console.error('Quick login error', err);
                alert('Erreur lors de la connexion');
            }
        });
    } catch (e) { console.warn('Quick login init failed', e); }
});

// Ensure header/profile is initialized on page load when possible
document.addEventListener('DOMContentLoaded', function () {
    try { if (window && typeof window.initAuthProfile === 'function') window.initAuthProfile(); } catch (e) {}
});

// Profile modal: open and allow editing current user's profile
async function openProfileModal() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) { alert('Veuillez vous connecter'); return; }
        const url = (window.API_BASE_URL || 'backend/api') + '/auth/profile.php';
        const resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        const json = await resp.json();
        if (!json || !json.success) { alert(json.message || 'Impossible de recuperer le profil'); return; }
        const user = json.data.user;

        // Build modal
        const existing = document.getElementById('tgtProfileModal'); if (existing) existing.remove();
        const modal = document.createElement('div'); modal.id = 'tgtProfileModal'; modal.className = 'tgt-modal';
        modal.innerHTML = `
            <div class="tgt-modal-backdrop"></div>
            <div class="tgt-modal-panel profile-modal-panel">
                <button class="tgt-modal-close" aria-label="Fermer">&times;</button>
                <div class="tgt-modal-body product-modal">
                    <div class="tgt-modal-gallery">
                        <div class="profile-avatar-section">
                            <img src="${user.avatar || (window.DEFAULT_IMAGE||'/Titi/assets/images/default.jpg')}" 
                                 alt="Profile Avatar" id="modalAvatar" class="profile-modal-avatar">
                            <div class="avatar-upload-overlay">
                                <i class="fas fa-camera"></i>
                                <span>Changer la photo</span>
                            </div>
                        </div>
                    </div>
                    <div class="tgt-modal-info">
                        <div class="tgt-modal-head">
                            <h3 class="tgt-modal-title">${(user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : (user.name || user.full_name || 'Utilisateur')}</h3>
                            <div class="tgt-modal-badges">
                                <span class="tgt-badge tgt-badge-success">Compte verifie</span>
                                <span class="tgt-badge tgt-badge-muted">${userRole}</span>
                            </div>
                            <div class="tgt-modal-email">${userEmail}</div>
                        </div>

                        <div class="tgt-modal-section">
                            <div class="tgt-section-title">Informations personnelles</div>
                            <div class="profile-form-grid">
                                <div class="form-group">
                                    <label for="editFirstName">Prenom</label>
                                    <input type="text" id="editFirstName" name="first_name" value="${user.first_name || ''}" class="profile-input">
                                </div>
                                <div class="form-group">
                                    <label for="editLastName">Nom</label>
                                    <input type="text" id="editLastName" name="last_name" value="${user.last_name || ''}" class="profile-input">
                                </div>
                                <div class="form-group">
                                    <label for="editEmail">Email</label>
                                    <input type="email" id="editEmail" name="email" value="${userEmail}" readonly class="profile-input readonly">
                                </div>
                                <div class="form-group">
                                    <label for="editPhone">Telephone</label>
                                    <input type="tel" id="editPhone" name="phone" value="${user.phone || ''}" class="profile-input" placeholder="+223 XX XX XX XX">
                                </div>
                            </div>
                        </div>

                        <div class="tgt-modal-section">
                            <div class="tgt-section-title">Adresse</div>
                            <div class="profile-form-grid">
                                <div class="form-group full-width">
                                    <label for="editAddress">Adresse</label>
                                    <input type="text" id="editAddress" name="address" value="${user.address || ''}" class="profile-input" placeholder="Rue et numero">
                                </div>
                                <div class="form-group">
                                    <label for="editCity">Ville</label>
                                    <input type="text" id="editCity" name="city" value="${user.city || 'Bamako'}" class="profile-input">
                                </div>
                                <div class="form-group">
                                    <label for="editQuarter">Quartier</label>
                                    <input type="text" id="editQuarter" name="quarter" value="${user.quarter || ''}" class="profile-input" placeholder="Ex: Badalabougou">
                                </div>
                            </div>
                        </div>

                        <div class="tgt-modal-section">
                            <div class="tgt-section-title">Securite</div>
                            <div class="profile-form-grid">
                                <div class="form-group full-width">
                                    <label for="editPassword">Nouveau mot de passe</label>
                                    <input type="password" id="editPassword" name="password" placeholder="Laisser vide pour ne pas changer" class="profile-input">
                                    <small class="form-hint">Minimum 8 caracteres, incluant majuscules, chiffres et caracteres speciaux</small>
                                </div>
                            </div>
                        </div>

                        <div class="tgt-modal-actions">
                            <button type="button" class="btn btn-outline modal-close">Annuler</button>
                            <button type="button" class="btn btn-primary" id="saveProfileBtn">
                                <i class="fas fa-save"></i> Enregistrer les modifications
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof lockPageScroll === 'function') lockPageScroll();

        const closeProfileModal = () => {
            modal.remove();
            if (typeof syncPageScrollLock === 'function') syncPageScrollLock();
        };

        modal.querySelectorAll('.modal-close, .tgt-modal-close').forEach((b) => b.addEventListener('click', closeProfileModal));
        modal.querySelector('.tgt-modal-backdrop').addEventListener('click', closeProfileModal);

        // Save profile functionality
        modal.querySelector('#saveProfileBtn').addEventListener('click', async () => {
            const payload = {
                first_name: document.getElementById('editFirstName').value.trim(),
                last_name: document.getElementById('editLastName').value.trim(),
                email: document.getElementById('editEmail').value.trim(),
                phone: document.getElementById('editPhone').value.trim(),
                address: document.getElementById('editAddress').value.trim(),
                city: document.getElementById('editCity').value.trim(),
                quarter: document.getElementById('editQuarter').value.trim(),
                password: document.getElementById('editPassword').value
            };
            try {
                const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
                const j = await r.json();
                if (j && j.success) {
                    ToastSystem.show('success', 'Profil mis a jour', 'Vos informations ont ete enregistrees');
                    // refresh localStorage user_data
                    const updated = Object.assign({}, user, payload);
                    delete updated.password;
                    localStorage.setItem('user_data', JSON.stringify(updated));
                    try { initAuthProfile(); } catch (e) {}
                    closeProfileModal();
                } else {
                    ToastSystem.show('error', 'Erreur', j.message || 'Impossible de mettre a jour');
                }
            } catch (err) { console.error(err); ToastSystem.show('error','Erreur','Erreur reseau'); }
        });

    } catch (e) { console.error('openProfileModal error', e); alert('Impossible d\'ouvrir le profil'); }
}





