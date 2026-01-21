/*
 Frontend glue for Titi Golden Taste
 - mobile menu toggle
 - products fetch + render with loader and error handling
 - initialize Leaflet map with a marker for the restaurant
 - lightweight helpers only (keeps responsibilities small)
*/

(function () {
    'use strict';

    // Default restaurant coords (Abidjan - adjust as needed)
    const RESTAURANT_COORDS = { lat: 5.30966, lng: -4.01266 };

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

    // Create a product-card DOM node
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('tabindex','0');
        card.dataset.productId = product.id || product.product_id || '';

        const img = document.createElement('div');
        img.className = 'product-image';
        if (product.image_url) {
            img.style.backgroundImage = `url(${product.image_url})`;
            img.style.backgroundSize = 'cover';
            img.style.backgroundPosition = 'center';
            img.textContent = '';
        } else if (product.images) {
            try {
                const arr = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(arr) && arr.length) {
                    img.style.backgroundImage = `url(${arr[0]})`;
                    img.style.backgroundSize = 'cover';
                    img.style.backgroundPosition = 'center';
                    img.textContent = '';
                } else {
                    img.innerHTML = '<i class="fas fa-utensils"></i>';
                }
            } catch (e) {
                img.innerHTML = '<i class="fas fa-utensils"></i>';
            }
        } else {
            img.innerHTML = '<i class="fas fa-utensils"></i>';
        }

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

        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';

        const stock = document.createElement('div');
        stock.className = product.stock > 0 ? 'in-stock' : 'out-of-stock';
        stock.textContent = product.stock > 0 ? 'En stock' : 'Rupture';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = 'Ajouter';
        addBtn.disabled = !(product.stock > 0);
        addBtn.addEventListener('click', () => {
            if (typeof window.addToCartFromHome === 'function') {
                window.addToCartFromHome(product.id || product.product_id || null, product);
            } else {
                // fallback: emit a custom event
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: product }));
            }
        });

        footer.appendChild(stock);
        footer.appendChild(addBtn);

        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(price);
        content.appendChild(footer);

        card.appendChild(img);
        card.appendChild(content);

        // Open product modal on click anywhere on card (except Add button)
        card.addEventListener('click', (e) => {
            if (e.target === addBtn || addBtn.contains(e.target)) return;
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

        const imagesHtml = (() => {
            if (product.images) {
                try {
                    const arr = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                    if (Array.isArray(arr) && arr.length) return arr.map(src => `<img src="${src}" alt=""/>`).join('');
                } catch (e) {}
            }
            if (product.image_url) return `<img src="${product.image_url}" alt=""/>`;
            return `<div class="placeholder-img"><i class="fas fa-utensils"></i></div>`;
        })();

        const typeLabel = product.type || product.source || (product.is_product ? 'boutique' : 'restaurant') || 'restaurant';

        modal.innerHTML = `
            <div class="tgt-modal-backdrop"></div>
            <div class="tgt-modal-panel">
                <button class="tgt-modal-close" aria-label="Fermer">&times;</button>
                <div class="tgt-modal-body">
                    <div class="tgt-modal-gallery">${imagesHtml}</div>
                    <div class="tgt-modal-info">
                        <h3>${product.name || ''}</h3>
                        <div class="tgt-modal-meta">
                            <span class="tgt-product-type">${typeLabel}</span>
                            <span class="tgt-product-price">${product.price ? product.price + ' FCFA' : '—'}</span>
                        </div>
                        <p class="tgt-modal-desc">${product.description || ''}</p>
                        <div class="tgt-modal-actions">
                            <button class="btn btn-primary modal-add">Ajouter au panier</button>
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
            if (typeof window.addToCartFromHome === 'function') {
                window.addToCartFromHome(product.id || product.product_id || null, product);
            } else {
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: product }));
            }
            modal.remove();
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
        card.dataset.menuId = menuItem.id || '';

        const img = document.createElement('div');
        img.className = 'product-image';
        if (menuItem.image_url) {
            img.style.backgroundImage = `url(${menuItem.image_url})`;
            img.style.backgroundSize = 'cover';
            img.style.backgroundPosition = 'center';
            img.textContent = '';
        } else {
            img.innerHTML = '<i class="fas fa-utensils"></i>';
        }

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

        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';

        const category = document.createElement('div');
        category.className = 'menu-category';
        category.textContent = menuItem.category || '';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn';
        addBtn.textContent = 'Ajouter';
        addBtn.addEventListener('click', () => {
            if (typeof window.addToCartFromHome === 'function') {
                window.addToCartFromHome(menuItem.id || null, { ...menuItem, type: 'menu' });
            } else {
                document.dispatchEvent(new CustomEvent('tgt:add-to-cart', { detail: { ...menuItem, type: 'menu' } }));
            }
        });

        footer.appendChild(category);
        footer.appendChild(addBtn);

        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(price);
        content.appendChild(footer);

        card.appendChild(img);
        card.appendChild(content);

        // Ouvrir modal au clic
        card.addEventListener('click', (e) => {
            if (e.target === addBtn || addBtn.contains(e.target)) return;
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
            if (item.type === 'menu' || containerId === 'allMenuContainer') {
                grid.appendChild(createMenuCard(item));
            } else {
                grid.appendChild(createProductCard(item));
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

            // Afficher le menu du jour
            const card = createMenuCard({ ...menu, type: 'menu' });
            root.innerHTML = '';
            root.appendChild(card);
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

    function initMap() {
        const el = document.getElementById('restaurantMap');
        if (!el || typeof L === 'undefined') return;
        // If a map was already initialized on this element, reuse it
        if (el.__tgt_map) {
            try { el.__tgt_map.invalidateSize(); } catch (e) {}
            return el.__tgt_map;
        }

        // Create map and store reference on the element to avoid double-init errors
        const map = L.map(el, { scrollWheelZoom: false }).setView([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        }).addTo(map);

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
    });

    // Login modal wiring: intercept .btn-login clicks to show inline modal if present
    document.addEventListener('click', function (ev) {
        const target = ev.target.closest && ev.target.closest('.btn-login');
        if (!target) return;
        const modal = document.getElementById('loginModal');
        if (!modal) return; // allow normal navigation if no inline modal
        ev.preventDefault();
        // show modal
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    });

    // Close login modal handlers
    document.addEventListener('DOMContentLoaded', function () {
        const modal = document.getElementById('loginModal');
        if (!modal) return;
        const closeBtn = document.getElementById('loginModalClose') || modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); });
        // click outside to close
        modal.addEventListener('click', function (e) {
            if (e.target === modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
        });
        // hidden by default
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden','true');
    });

    // Expose key functions globally so inline scripts can reuse them and avoid duplicate initialization
    try { window.initMap = initMap; } catch (e) {}
    try { window.initCategoryFilter = initCategoryFilter; } catch (e) {}
    try { window.loadProducts = loadProducts; } catch (e) {}

})();
