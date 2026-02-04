/*
 Frontend glue for Titi Golden Taste
 - mobile menu toggle
 - products fetch + render with loader and error handling
 - initialize Leaflet map with a marker for the restaurant
 - lightweight helpers only (keeps responsibilities small)
*/

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
                        const btn = document.createElement('button'); btn.textContent = '×'; btn.style.cssText = 'position:absolute;right:6px;top:6px;border:none;background:transparent;font-size:14px;cursor:pointer;';
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

    // Normalize image URLs to absolute paths and provide robust fallback
    function normalizeImageUrl(src) {
        if (!src) return (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
        // If already absolute from webroot
        if (src.startsWith('/')) {
            // Check if the file exists by using the correct base path
            if (src.includes('/assets/images/default.jpg')) {
                return (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
            }
            return src;
        }
        // If starts with assets or images, prefix with webroot assets
        if (src.startsWith('assets/') || src.startsWith('images/')) {
            return (window.ASSETS_BASE_URL || '/assets') + '/' + src;
        }
        // Otherwise treat as relative to assets
        return (window.ASSETS_BASE_URL || '/assets') + '/images/' + src;
    }

    // Create an img element with fallback handling (prevents infinite loops)
    function createImgWithFallback(src, alt) {
        const img = document.createElement('img');
        img.alt = alt || '';
        const normalized = normalizeImageUrl(src);
        img.src = normalized;
        // mark to avoid replacing more than once
        img.dataset.tgtFallback = '0';
        img.addEventListener('error', function () {
            if (img.dataset.tgtFallback === '1') return; // already applied
            img.dataset.tgtFallback = '1';
            const def = window.DEFAULT_IMAGE || ((window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg');
            // Only set fallback if it's different from current src to prevent loops
            if (img.src !== def && !img.src.includes('default.jpg')) {
                console.warn('Image not found, using default:', img.src);
                img.src = def;
            }
        });
        return img;
    }

    // Create a product-card DOM node
    function createProductCard(product) {
        // Vérifier que le produit existe et a un ID
        if (!product || !product.id) {
            console.warn('Produit invalide ou sans ID:', product);
            return null;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('tabindex','0');
        // Standardized data-* attributes required by product selection flow
        card.dataset.id = product.id;
        card.dataset.name = product.name || '';
        card.dataset.price = product.price || 0;
        
        // Gestion simplifiée des images
        let imageUrl = '/assets/images/default.jpg';
        if (product.image_url) {
            if (Array.isArray(product.image_url)) {
                imageUrl = product.image_url[0] || imageUrl;
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
                imageUrl = product.images[0] || imageUrl;
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
        card.dataset.image = normalizeImageUrl(imageUrl);

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
        price.textContent = (product.price ? product.price + ' FCFA' : '—');

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
            showOrderModal({ id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price), image: card.dataset.image, type: 'product' });
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

        // Build gallery using safe img elements with normalized URLs
        const galleryEl = document.createElement('div');
        galleryEl.className = 'tgt-modal-gallery';
        (function buildGallery() {
            if (product.images) {
                try {
                    const arr = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                    if (Array.isArray(arr) && arr.length) {
                        arr.forEach(src => {
                            const img = createImgWithFallback(normalizeImageUrl(src), product.name || '');
                            galleryEl.appendChild(img);
                        });
                        return;
                    }
                } catch (e) {}
            }
            if (product.image_url) {
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
        const priceLabel = (window.App && typeof window.App.formatMoney === 'function') ? window.App.formatMoney(priceVal) : (priceVal ? (priceVal + ' FCFA') : '—');
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
                                <label for="tgtModalQty">Quantité</label>
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

        // Event listeners
        modal.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => modal.remove()));
        modal.querySelector('.tgt-modal-backdrop').addEventListener('click', () => modal.remove());
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
                window.addToCartFromHome(item);
            } else {
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: item }));
            }
            modal.remove();
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
            <div class="tgt-modal-backdrop"></div>
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
                            <label>Quantité</label>
                            <input type="number" id="orderQty" value="1" min="1" />
                        </div>
                        <div class="form-row">
                            <label>Total</label>
                            <p id="orderTotal"></p>
                        </div>
                        <div class="form-row">
                            <label>Adresse de livraison</label>
                            <input type="text" id="orderAddress" placeholder="Rue et numéro" />
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
        `;

        document.body.appendChild(modal);

        // Fill content
        const imgContainer = modal.querySelector('.order-image');
        const imgEl = createImgWithFallback(item.image, item.name || '');
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'cover';
        imgContainer.appendChild(imgEl);
        modal.querySelector('.order-title').textContent = item.name || '';
        modal.querySelector('.order-price').textContent = (item.price ? item.price + ' FCFA' : '—');

        const qty = modal.querySelector('#orderQty');
        const total = modal.querySelector('#orderTotal');
        function updateTotal() {
            const q = Number(qty.value) || 1;
            total.textContent = ((Number(item.price) || 0) * q + 1000) + ' FCFA'; // include delivery fee
        }
        qty.addEventListener('input', updateTotal);
        updateTotal();

        // Event listeners (support both generic .modal-close and our .tgt-modal-close)
        modal.querySelectorAll('.modal-close, .tgt-modal-close').forEach(b => b.addEventListener('click', () => modal.remove()));
        modal.querySelector('.tgt-modal-backdrop').addEventListener('click', () => modal.remove());

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

                (window.LoadingSystem || { show: ()=>{}, hide: ()=>{} }).show('Création de la commande...');
                // Use existing createOrder helper
                const res = await createOrder(orderData);
                (window.LoadingSystem || { show: ()=>{}, hide: ()=>{} }).hide();
                // Support API shape: { success, data: { order | id }, message }
                const orderObj = res && (res.data?.order || (res.data && (res.data.id ? res.data : null)) || res.order || null);
                if (res && res.success && orderObj) {
                    ToastSystem.show('success', 'Commande créée', 'Votre commande a été créée');
                    // Optionally open order details or show id
                    modal.remove();
                } else {
                    ToastSystem.show('error', 'Erreur', (res && (res.message || (res.data && res.data.message))) || 'Impossible de créer la commande');
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
        
        // Si on a déjà les produits en cache et que c'est "all", filtrer côté client
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

    // Fonction pour créer une carte de menu (plats du restaurant)
    function createMenuCard(menuItem) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('tabindex', '0');
        card.dataset.id = menuItem.id || '';
        card.dataset.name = menuItem.name || '';
        card.dataset.price = menuItem.price || 0;
        card.dataset.image = normalizeImageUrl(menuItem.image_url || menuItem.image || '');

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
        price.textContent = (menuItem.price ? menuItem.price + ' FCFA' : '—');

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
            showOrderModal({ id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price), image: card.dataset.image, type: 'menu' });
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

    function renderProducts(items, containerId) {
        const root = document.getElementById(containerId);
        if (!root) return;

        if (!Array.isArray(items)) items = [];

        if (items.length === 0) {
            root.innerHTML = '<div class="menu-card"><p>Aucun élément disponible pour le moment.</p></div>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'products-grid';

        items.forEach(item => {
            // Utiliser createMenuCard pour les plats du menu, createProductCard pour les produits boutique
            let card;
            if (item.type === 'menu' || containerId === 'allMenuContainer') {
                card = createMenuCard(item);
            } else {
                card = createProductCard(item);
            }
            
            // Ajouter la carte seulement si elle n'est pas null
            if (card) {
                grid.appendChild(card);
            }
        });

        root.innerHTML = '';
        root.appendChild(grid);
    }

    // Charger le menu du jour
    async function loadMenuOfTheDay() {
        const root = document.getElementById('menuContainer');
        if (!root) return;
        root.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement du menu...</p></div>';

        try {
            const res = await fetch(`${API_BASE_URL}/menu/menu-du-jour.php`);
            const json = await res.json();

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

            // Afficher le menu du jour avec mise en page gourmet
            const container = document.createElement('div');
            container.className = 'menu-of-day-card';

            const imgWrap = document.createElement('div');
            imgWrap.className = 'menu-of-day-image';
            const rawImg = (menu.image_url || menu.image || '').toString();
            const bust = (menu.updated_at || menu.id || '').toString();
            const sep = rawImg.includes('?') ? '&' : '?';
            const imgSrc = rawImg ? `${rawImg}${bust ? `${sep}v=${encodeURIComponent(bust)}` : ''}` : '';
            const img = createImgWithFallback(imgSrc, menu.name || '');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            imgWrap.appendChild(img);

            const info = document.createElement('div');
            info.className = 'menu-of-day-info';
            const title = document.createElement('h2');
            title.textContent = menu.name || '';
            const desc = document.createElement('p');
            desc.className = 'menu-of-day-desc';
            desc.textContent = menu.description || '';
            const meta = document.createElement('div');
            meta.className = 'menu-of-day-meta';
            const price = document.createElement('div');
            price.className = 'menu-of-day-price';
            price.textContent = (menu.price ? menu.price + ' FCFA' : '—');

            const actions = document.createElement('div');
            actions.className = 'menu-of-day-actions';
            const orderBtn = document.createElement('button');
            orderBtn.className = 'btn btn-primary';
            orderBtn.textContent = 'Commander ce menu';
            orderBtn.addEventListener('click', () => showOrderModal({ id: menu.id, name: menu.name, price: menu.price, image: menu.image_url || menu.image || '', type: 'menu' }));
            actions.appendChild(orderBtn);

            info.appendChild(title);
            info.appendChild(desc);
            meta.appendChild(price);
            info.appendChild(meta);
            info.appendChild(actions);

            container.appendChild(imgWrap);
            container.appendChild(info);

            root.innerHTML = '';
            root.appendChild(container);
        } catch (err) {
            console.error('Erreur chargement menu du jour:', err);
            root.innerHTML = '<div class="menu-card"><p>Impossible de charger le menu du jour.</p></div>';
        }
    }

    // Charger tous les plats du menu avec filtres par catégorie
    async function loadAllMenuItems(category = 'all') {
        const root = document.getElementById('allMenuContainer');
        if (!root) return;

        root.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement de la carte...</p></div>';

        try {
            const url = `${API_BASE_URL}/menu/all.php` + (category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '');
            const res = await fetch(url);
            const json = await res.json();

            let items = [];
            if (json && json.success && Array.isArray(json.data)) {
                items = json.data;
            } else if (Array.isArray(json)) {
                items = json;
            }

            // Ajouter le type 'menu' à chaque élément
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
            const json = await res.json();

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
        // Cette fonction est conservée pour compatibilité mais ne charge plus automatiquement
        // Les fonctions spécifiques sont appelées séparément
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

        // Gestion des boutons de catégorie du menu
        menuButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const category = (this.dataset.category || 'all').toString().toLowerCase();
                
                // Mettre à jour l'état visuel
                menuButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Mapping des catégories pour le filtrage
                const categoryMap = {
                    'plats': ['plat', 'plats', 'plats principaux'],
                    'entrees': ['entrée', 'entrées', 'entrees'],
                    'desserts': ['dessert', 'desserts'],
                    'boissons': ['boisson', 'boissons']
                };

                // Filtrer côté client si on a déjà les données, sinon charger depuis l'API
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
                    // Charger depuis l'API si on n'a pas les données ou si on veut recharger
                    loadAllMenuItems(category);
                }
            });
        });

        // Gestion des boutons de catégorie de la boutique
        shopButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const category = (this.dataset.category || 'all').toString().toLowerCase();
                
                // Mettre à jour l'état visuel
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
                const json = await res.json();
                // update UI non-blocking
                if (json && json.status) {
                    liveEl.className = 'status ' + (json.status || 'loading');
                    const txt = liveEl.querySelector('.status-text');
                    if (txt) txt.textContent = json.message || (json.status === 'open' ? 'Ouvert' : 'Fermé');
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
        const map = L.map(el, { scrollWheelZoom: false, zoomControl: false }).setView([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        }).addTo(map);

        // Add zoom control positioned at bottom-left and vertical
        L.control.zoom({ position: 'bottomleft' }).addTo(map);

        const marker = L.marker([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng]).addTo(map);
        marker.bindPopup('<strong>Titi Golden Taste</strong><br>123 Avenue de la Gastronomie, Abidjan').openPopup();

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
            const json = await res.json();

            let items = [];
            if (json && json.success && Array.isArray(json.data)) {
                items = json.data.slice(0, 6); // Limiter à 6 produits
            } else if (Array.isArray(json)) {
                items = json.slice(0, 6);
            }

            if (items.length === 0) {
                root.innerHTML = '<div class="menu-card"><p>Aucun produit en vedette pour le moment.</p></div>';
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'products-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;';

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
        
        // Initialiser la carte seulement si l'élément existe
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
                return ''; // No dashboard for clients
            })();
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
                <a href="#" class="dropdown-item" data-action="profile"><i class="fas fa-user"></i> Profil</a>
                <a href="boutique.html" class="dropdown-item" data-action="shop"><i class="fas fa-store"></i> Accéder à la boutique</a>
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item text-danger" data-action="logout"><i class="fas fa-sign-out-alt"></i> Déconnexion</a>
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
                    openProfileModal();
                } else if (action === 'shop') {
                    // Allow normal navigation to boutique
                    return;
                }
            });
        }
    }

    // Close login modal handlers
    document.addEventListener('DOMContentLoaded', function () {
        const modal = document.getElementById('loginModal');
        if (!modal) return;
        const closeBtn = document.getElementById('loginModalClose') || modal.querySelector('.modal-close');
        function hideModal(el) {
            try {
                const active = document.activeElement;
                if (active && el.contains(active)) {
                    try { active.blur(); } catch (e) {}
                }
            } catch (e) {}
            el.style.display = 'none';
            el.setAttribute('aria-hidden', 'true');
        }

        if (closeBtn) closeBtn.addEventListener('click', () => { hideModal(modal); });
        // click outside to close
        modal.addEventListener('click', function (e) {
            if (e.target === modal) { hideModal(modal); }
        });
        // hidden by default
        hideModal(modal);
    });

    // Expose key functions globally so inline scripts can reuse them and avoid duplicate initialization
    try { window.initMap = initMap; } catch (e) {}
    try { window.initCategoryFilter = initCategoryFilter; } catch (e) {}
    try { window.initAuthProfile = initAuthProfile; } catch (e) {}
    try { window.loadProducts = loadProducts; } catch (e) {}

})();

// Quick login modal handler (works when auths.js is not included)
document.addEventListener('DOMContentLoaded', function () {
    try {
        const quickForm = document.getElementById('quickLoginForm');
        const modal = document.getElementById('loginModal');
        if (!quickForm) return;

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

                    // Close modal (blur focused element inside first to avoid ARIA focus warnings)
                    quickForm.reset();
                    if (modal) {
                        try { const active = document.activeElement; if (active && modal.contains(active)) try{active.blur();}catch(e){} } catch(e){}
                        modal.style.display = 'none';
                        modal.setAttribute('aria-hidden','true');
                    }

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
        if (!json || !json.success) { alert(json.message || 'Impossible de récupérer le profil'); return; }
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
                            <img src="${user.avatar || (window.DEFAULT_IMAGE||'/assets/images/default.jpg')}" 
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
                                <span class="tgt-badge tgt-badge-success">Compte vérifié</span>
                                <span class="tgt-badge tgt-badge-muted">${userRole}</span>
                            </div>
                            <div class="tgt-modal-email">${userEmail}</div>
                        </div>

                        <div class="tgt-modal-section">
                            <div class="tgt-section-title">Informations personnelles</div>
                            <div class="profile-form-grid">
                                <div class="form-group">
                                    <label for="editFirstName">Prénom</label>
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
                                    <label for="editPhone">Téléphone</label>
                                    <input type="tel" id="editPhone" name="phone" value="${user.phone || ''}" class="profile-input" placeholder="+223 XX XX XX XX">
                                </div>
                            </div>
                        </div>

                        <div class="tgt-modal-section">
                            <div class="tgt-section-title">Adresse</div>
                            <div class="profile-form-grid">
                                <div class="form-group full-width">
                                    <label for="editAddress">Adresse</label>
                                    <input type="text" id="editAddress" name="address" value="${user.address || ''}" class="profile-input" placeholder="Rue et numéro">
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
                            <div class="tgt-section-title">Sécurité</div>
                            <div class="profile-form-grid">
                                <div class="form-group full-width">
                                    <label for="editPassword">Nouveau mot de passe</label>
                                    <input type="password" id="editPassword" name="password" placeholder="Laisser vide pour ne pas changer" class="profile-input">
                                    <small class="form-hint">Minimum 8 caractères, incluant majuscules, chiffres et caractères spéciaux</small>
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
        modal.querySelectorAll('.modal-close, .tgt-modal-close').forEach(b=>b.addEventListener('click', ()=>modal.remove()));
        modal.querySelector('.tgt-modal-backdrop').addEventListener('click', ()=>modal.remove());

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
                    ToastSystem.show('success', 'Profil mis à jour', 'Vos informations ont été enregistrées');
                    // refresh localStorage user_data
                    const updated = Object.assign({}, user, payload);
                    delete updated.password;
                    localStorage.setItem('user_data', JSON.stringify(updated));
                    try { initAuthProfile(); } catch (e) {}
                    modal.remove();
                } else {
                    ToastSystem.show('error', 'Erreur', j.message || 'Impossible de mettre à jour');
                }
            } catch (err) { console.error(err); ToastSystem.show('error','Erreur','Erreur réseau'); }
        });

    } catch (e) { console.error('openProfileModal error', e); alert('Impossible d\'ouvrir le profil'); }
}
