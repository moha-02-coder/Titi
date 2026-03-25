/**
 * Application principale Titi Golden Taste
 */

// Create App namespace
window.App = window.App || {};

function parseApiJson(text, endpoint) {
    if (!text || !text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch (err) {
        const snippet = text.slice(0, 180);
        throw new Error(`Reponse JSON invalide pour ${endpoint}: ${snippet}`);
    }
}
// Fonction utilitaire pour faire des requÃƒÂªtes API
async function fetchAPI(endpoint) {
    const base = window.API_BASE_URL || 'backend/api';
    try {
        console.log(`Fetching: ${base}/${endpoint}`);
        const response = await fetch(`${base}/${endpoint}`);
        const rawText = await response.text();
        
        console.log(`Response status: ${response.status} for ${endpoint}`);
        
        if (!response.ok) {
            const snippet = (rawText || '').slice(0, 180);
            throw new Error(`Erreur HTTP: ${response.status} (${snippet})`);
        }
        
        const json = parseApiJson(rawText, endpoint);
        console.log(`JSON received for ${endpoint}:`, json);
        // Normalize API response shape: { success, data, message }
        if (json && typeof json === 'object' && json.hasOwnProperty('success')) {
            if (json.success) return json.data;
            // If API returned success:false, throw to be handled by caller
            const msg = json.message || 'Erreur API';
            throw new Error(msg);
        }
        return json;
    } catch (error) {
        console.error(`Erreur lors de la rÃƒÂ©cupÃƒÂ©ration de ${endpoint}:`, error);
        throw error;
    }
}

// Fonction pour mettre ÃƒÂ  jour le statut live (DÃƒâ€°FINIE GLOBALEMENT)
window.updateLiveStatus = async function() {
    const statusElement = document.getElementById('live-status');
    const messageElement = document.getElementById('status-message');
    
    if (!statusElement) { return; }
    
    try {
        statusElement.className = 'status loading';
        const statusText = statusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'VÃƒÂ©rification...';
        }
        
        if (messageElement) {
            messageElement.textContent = '';
        }
        
        const data = await fetchAPI('live.php');
        console.log('Live status data:', data);
        
        // Mettre ÃƒÂ  jour le statut
        statusElement.className = `status ${data.status}`;
        if (statusText) {
            statusText.textContent = 
                data.status === 'open' ? 'Ouvert' : 
                data.status === 'closed' ? 'FermÃƒÂ©' : 'En attente';
        }
        
        // Mettre ÃƒÂ  jour le message
        if (messageElement) {
            messageElement.textContent = data.message || '';
        }
        
    } catch (error) {
        console.error('Erreur lors de la vÃƒÂ©rification du statut:', error);
        statusElement.className = 'status closed';
        const statusText = statusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Hors ligne';
        }
        if (messageElement) {
            messageElement.textContent = 'Impossible de vÃƒÂ©rifier le statut';
        }
    }
}

// Fonction pour charger le menu du jour
App.loadMenu = async function() {
    const menuContainer = window.$find(window.DOM_SELECTORS.menuContainerIds);
    if (!menuContainer) return; // silent on pages without menu
    
    // Afficher le chargement
    menuContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Chargement du menu...</p>
        </div>
    `;
    
    try {
        const data = await fetchAPI('menu/menu-du-jour.php');
        console.log('Menu data:', data);
        
        menuContainer.innerHTML = `
            <h3>${data.name || 'Menu du jour'}</h3>
            <p class="menu-description">${data.description || ''}</p>
            <div class="menu-price">${data.price || 0} FCFA <span>(TTC)</span></div>
            <button class="btn" onclick="addToCartFromHome({
                id: ${data.id || 1},
                name: '${data.name || 'Menu du jour'}',
                price: ${data.price || 0},
                type: 'menu'
            })">
                <i class="fas fa-shopping-cart"></i> Commander maintenant
            </button>
        `;
    } catch (error) {
        console.error('Erreur lors du chargement du menu:', error);
        menuContainer.innerHTML = `
            <div class="menu-card-fallback">
                <h3>Poulet braisÃƒÂ©</h3>
                <p class="menu-description">Servi avec alloco et sauce maison</p>
                <div class="menu-price">3500 FCFA <span>(TTC)</span></div>
                <button class="btn" onclick="addToCartFromHome({
                    id: 1,
                    name: 'Poulet braisÃƒÂ©',
                    price: 3500,
                    type: 'menu'
                })">
                    <i class="fas fa-shopping-cart"></i> Commander maintenant
                </button>
            </div>
        `;
    }
}

// Fonction pour charger les produits
App.loadProducts = async function() {
    const productsContainer = window.$find(window.DOM_SELECTORS.productsContainerIds);
    if (!productsContainer) return; // silent on pages without products
    
    // Afficher le chargement
    productsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Chargement des produits...</p>
        </div>
    `;
    
    try {
        const data = await fetchAPI('shop/index.php?in_stock=1');
        console.log('Products data:', data);
        
        if (!data || data.length === 0) {
            productsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Aucun produit en stock pour le moment.</p>
                </div>
            `;
            return;
        }
        
        productsContainer.innerHTML = data.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <i class="fas fa-${getProductIcon(product.category)}"></i>
                </div>
                <div class="product-content">
                    <h3>${product.name}</h3>
                    <div class="product-price">${product.price} FCFA</div>
                    <span class="${product.in_stock ? 'in-stock' : 'out-of-stock'}">
                        ${product.in_stock ? 'En stock' : 'Rupture'}
                    </span>
                    <p class="product-description">${product.description || ''}</p>
                    ${product.in_stock ? `
                        <button class="btn" style="margin-top: 15px; width: 100%;" 
                                onclick="addToCartFromHome({
                                    id: ${product.id},
                                    name: '${product.name.replace(/'/g, "\\'")}',
                                    price: ${product.price},
                                    type: 'product'
                                })">
                            <i class="fas fa-cart-plus"></i> Ajouter au panier
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        productsContainer.innerHTML = `
            <div class="products-grid">
                <div class="product-card">
                    <div class="product-image">
                        <i class="fas fa-wine-bottle"></i>
                    </div>
                    <div class="product-content">
                        <h3>Sauce piment maison</h3>
                        <div class="product-price">1500 FCFA</div>
                        <span class="in-stock">En stock</span>
                        <p class="product-description">Sauce pimentÃƒÂ©e prÃƒÂ©parÃƒÂ©e avec des ingrÃƒÂ©dients frais</p>
                        <button class="btn" style="margin-top: 15px; width: 100%;" 
                                onclick="addToCartFromHome({
                                    id: 1,
                                    name: 'Sauce piment maison',
                                    price: 1500,
                                    type: 'product'
                                })">
                            <i class="fas fa-cart-plus"></i> Ajouter au panier
                        </button>
                    </div>
                </div>
                
                <div class="product-card">
                    <div class="product-image">
                        <i class="fas fa-utensils"></i>
                    </div>
                    <div class="product-content">
                        <h3>AttiÃƒÂ©kÃƒÂ© traditionnel</h3>
                        <div class="product-price">2000 FCFA</div>
                        <span class="in-stock">En stock</span>
                        <p class="product-description">Paquet de 1kg d'attiekÃƒÂ© frais</p>
                        <button class="btn" style="margin-top: 15px; width: 100%;" 
                                onclick="addToCartFromHome({
                                    id: 2,
                                    name: 'AttiÃƒÂ©kÃƒÂ© traditionnel',
                                    price: 2000,
                                    type: 'product'
                                })">
                            <i class="fas fa-cart-plus"></i> Ajouter au panier
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Obtenir l'icÃƒÂ´ne du produit
function getProductIcon(category) {
    const icons = {
        'sauce': 'wine-bottle',
        'accompagnement': 'utensils',
        'condiment': 'oil-can',
        'ÃƒÂ©pice': 'mortar-pestle',
        'snack': 'cookie-bite',
        'boisson': 'wine-glass-alt'
    };
    return icons[category] || 'shopping-bag';
}

// Fonction fallback pour ajouter au panier depuis la page d'accueil
App.addToCartFromHome = function(idOrItem, product) {
    const item = (product && typeof product === 'object')
        ? product
        : ((idOrItem && typeof idOrItem === 'object')
            ? idOrItem
            : (idOrItem !== null && idOrItem !== undefined && idOrItem !== '' ? { id: idOrItem } : null));

    if (!item) return false;

    // Prefer the shared cart implementation when available
    if (typeof window.addToCart === 'function') {
        return window.addToCart(item);
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
        localStorage.setItem('pending_cart_item', JSON.stringify(item));
        window.location.href = 'login.html?redirect=home&message=connectez-vous pour ajouter au panier';
        return false;
    }

    let cart = [];
    try {
        const raw = JSON.parse(localStorage.getItem('cart') || '[]');
        cart = Array.isArray(raw) ? raw : [];
    } catch (e) { cart = []; }

    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));

    if (typeof window.updateCartCount === 'function') {
        try { window.updateCartCount(); } catch (e) {}
    }

    return true;
}

// Mettre ÃƒÂ  jour le compteur du panier
App.updateCartCount = function() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = (Array.isArray(cart) ? cart : []).reduce((sum, it) => sum + (parseInt(it.quantity ?? 1, 10) || 1), 0);

    const counters = Array.from(document.querySelectorAll('[data-cart-count], #cartCount'));
    counters.forEach((cartCount) => {
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? 'inline-flex' : 'none';
    });
};

App.renderAuthProfile = function() {
    try {
        const token = localStorage.getItem('auth_token');
        const raw = localStorage.getItem('user_data');
        const user = raw ? JSON.parse(raw) : null;
        const roleRaw = (user && (user.role || user.role_name)) ? String(user.role || user.role_name) : '';
        const role = roleRaw.toLowerCase();
        const isLoggedIn = !!token && !!user;

        const name = isLoggedIn ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
        const display = name || user?.email || 'Compte';
        const initials = ((user?.first_name || ' ').trim().slice(0, 1) + (user?.last_name || ' ').trim().slice(0, 1)).toUpperCase().trim() || 'U';
        const dash = (role === 'admin' || role === 'super_admin') ? 'admin/dashboard.html' : ((role === 'livreur' || role === 'delivery') ? 'delivery/dashboard.html' : 'profile.html');

        document.querySelectorAll('.nav-auth').forEach(container => {
            if (!isLoggedIn) {
                container.style.display = '';
                return;
            }
            container.innerHTML = `
                <a href="#" class="btn-login" id="tgtProfileBtn" style="display:inline-flex;align-items:center;gap:10px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);font-weight:800;">${initials}</span>
                    <span style="display:flex;flex-direction:column;line-height:1.1;">
                        <span style="font-weight:700;">${escapeHtml(display)}</span>
                        <span style="font-size:12px;opacity:0.9;">${escapeHtml(roleRaw || 'client')}</span>
                    </span>
                </a>
                <a href="${dash}" class="btn-admin" id="tgtDashboardLink"><i class="fas fa-gauge"></i> Dashboard</a>
                <a href="#" class="btn-register" id="tgtLogoutBtn"><i class="fas fa-sign-out-alt"></i> DÃƒÂ©connexion</a>
            `;
            const logoutBtn = container.querySelector('#tgtLogoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    try { localStorage.clear(); } catch (err) {}
                    window.location.href = 'index.html';
                });
            }
            const profileBtn = container.querySelector('#tgtProfileBtn');
            if (profileBtn) {
                profileBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    try {
                        if (typeof window.openProfileModal === 'function') window.openProfileModal();
                        else window.location.href = dash;
                    } catch (err) {
                        window.location.href = dash;
                    }
                });
            }
        });

        document.querySelectorAll('.mobile-auth').forEach(container => {
            if (!isLoggedIn) {
                container.style.display = '';
                return;
            }
            container.innerHTML = `
                <a href="${dash}" class="btn-login" style="display:flex;gap:10px;align-items:center;">
                    <i class="fas fa-user"></i>
                    <span>${escapeHtml(display)} (${escapeHtml(roleRaw || 'client')})</span>
                </a>
                <a href="#" class="btn-register" id="tgtMobileLogout"><i class="fas fa-sign-out-alt"></i> DÃƒÂ©connexion</a>
            `;
            const logoutBtn = container.querySelector('#tgtMobileLogout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    try { localStorage.clear(); } catch (err) {}
                    window.location.href = 'index.html';
                });
            }
        });
    } catch (e) {
        console.error('renderAuthProfile error', e);
    }
};

function escapeHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// CrÃƒÂ©er l'icÃƒÂ´ne du panier si elle n'existe pas
App.createCartIcon = function() {
    // Prefer native header cart button when present
    if (document.getElementById('cartToggleBtn')) return;
    // Idempotent: if already present do nothing
    const existing = window.$find([window.DOM_SELECTORS.cartIcon.replace('#','')]) || document.getElementById('cartIcon');
    if (existing) return;

    const headerContainer = window.$find(window.DOM_SELECTORS.headerContainer);
    if (!headerContainer) return; // nothing to do on pages without header

    const cartLink = document.createElement('a');
    cartLink.href = '#';
    cartLink.className = 'cart-icon';
    cartLink.id = 'cartIcon';
    cartLink.innerHTML = `
        <i class="fas fa-shopping-cart"></i>
        <span class="cart-count" id="cartCount" style="display: none">0</span>
    `;

    const nav = window.$find(window.DOM_SELECTORS.nav) || document.querySelector('.nav');
    if (nav) {
        // Find a node under headerContainer that is an ancestor of nav, suitable as reference
        let ref = nav;
        while (ref && ref.parentElement && ref.parentElement !== headerContainer) {
            ref = ref.parentElement;
        }
        if (ref && ref.parentElement === headerContainer) {
            headerContainer.insertBefore(cartLink, ref);
            return;
        }
    }
    // fallback
    headerContainer.appendChild(cartLink);
};

// Single initialization entrypoint that is safe when scripts are included multiple times
App.init = function() {
    if (App._initialized) return;
    App._initialized = true;

    // Header / cart
    App.createCartIcon();
    if (typeof App.updateCartCount === 'function') App.updateCartCount();
    if (typeof window.initAuthProfile === 'function') window.initAuthProfile();
    else if (typeof App.renderAuthProfile === 'function') App.renderAuthProfile();

    // Handle pending cart item after login redirect
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('redirect') === 'home' && localStorage.getItem('pending_cart_item')) {
            const item = JSON.parse(localStorage.getItem('pending_cart_item'));
            localStorage.removeItem('pending_cart_item');
            if (window.addToCart && typeof window.addToCart === 'function') {
                if (window.addToCart(item)) {
                    if (window.showNotification) window.showNotification('Article ajoutÃƒÂ© ÃƒÂ  votre panier!', 'success');
                }
            }
        }
    } catch (e) {
        console.error('pending cart handling error', e);
    }

    // Call page-specific loaders silently if present
    if (typeof window.updateLiveStatus === 'function') window.updateLiveStatus();
    if (typeof App.loadMenu === 'function') App.loadMenu();
    if (typeof App.loadProducts === 'function') App.loadProducts();

    // Actualiser le statut toutes les minutes
    setInterval(() => {
        if (typeof updateLiveStatus === 'function') {
            try { updateLiveStatus(); } catch (e) { console.error(e); }
        }
    }, 60000);

    // Smooth scrolling pour les liens d'ancrage
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                window.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
            }
        });
    });

    // Ajouter les animations CSS (only once)
    if (!document.getElementById('app-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'app-dynamic-styles';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
            .cart-icon { position: relative; color: white; font-size: 1.2rem; margin-right: 20px; text-decoration: none; }
            .cart-count { position: absolute; top: -8px; right: -8px; background: #d4af37; color: #1a1a1a; font-size: 0.7rem; font-weight: bold; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .menu-card-fallback { background: white; border-radius: 15px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; }
        `;
        document.head.appendChild(style);
    }
}

// Expose a few legacy globals used by inline handlers for backward compatibility
window.addToCartFromHome = function(idOrItem, product) { return App.addToCartFromHome(idOrItem, product); };
window.updateCartCount = function() { if (typeof App.updateCartCount === 'function') return App.updateCartCount(); };

// Simple wizard navigation helpers used by inline buttons
window.nextStep = function(step) {
    try {
        // If advancing to step 2 and user is not authenticated, persist pending wizard
        const token = localStorage.getItem('auth_token');
        if (Number(step) === 2 && !token) {
            try { localStorage.setItem('tgt_pending_wizard', JSON.stringify({ step: 2, path: window.location.pathname + window.location.search })); } catch (e) {}
            const ret = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `login.html?resume_wizard=1&return=${ret}`;
            return;
        }

        // Basic validation before certain steps
        if (Number(step) === 4) {
            const deliveryMethod = localStorage.getItem('tgt_delivery_method') || document.querySelector('.delivery-option.selected')?.dataset.type || 'delivery';
            if (deliveryMethod === 'delivery') {
                const street = document.getElementById('deliveryStreet')?.value?.trim();
                const city = document.getElementById('deliveryCity')?.value?.trim();
                const quarter = document.getElementById('deliveryQuarter')?.value?.trim();
                const phone = (localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data')).phone : null) || document.getElementById('guestPhone')?.value?.trim();
                const name = (localStorage.getItem('user_data') ? (JSON.parse(localStorage.getItem('user_data')).first_name || '') : '') || document.getElementById('guestFirstName')?.value?.trim();
                if (!name || !phone || !street || !city || !quarter) {
                    try {
                        if (window.ToastSystem && typeof ToastSystem.show === 'function') ToastSystem.show('error', 'Informations manquantes', 'Veuillez remplir votre nom, tÃƒÂ©lÃƒÂ©phone et adresse pour la livraison');
                        else alert('Veuillez remplir votre nom, tÃƒÂ©lÃƒÂ©phone et adresse pour la livraison');
                    } catch(e){ alert('Veuillez remplir votre nom, tÃƒÂ©lÃƒÂ©phone et adresse pour la livraison'); }
                    return;
                }
            }

            const timeMode = document.querySelector('.time-option.selected')?.dataset.time || (localStorage.getItem('tgt_time_mode') || 'asap');
            if (timeMode === 'later') {
                const date = document.getElementById('scheduleDate')?.value;
                const hour = document.getElementById('scheduleHour')?.value;
                if (!date || !hour) {
                    try {
                        if (window.ToastSystem && typeof ToastSystem.show === 'function') ToastSystem.show('error', 'Horaire manquant', 'Veuillez choisir la date et l\'heure de livraison');
                        else alert('Veuillez choisir la date et l\'heure de livraison');
                    } catch(e){ alert('Veuillez choisir la date et l\'heure de livraison'); }
                    return;
                }
                try { localStorage.setItem('tgt_delivery_time', JSON.stringify({ date, hour })); } catch(e){}
            }
        }

        // Activate wizard step
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('wizardStep' + step);
        if (target) target.classList.add('active');

        // Step 2: load customization options + sync summary
        try {
            if (Number(step) === 2) {
                App.loadCustomizationOptions();
                App.updateCustomizationSummary();
            }
        } catch (e) {}

        // Step 4: render recap + payment
        try {
            if (Number(step) === 4) {
                App.updateOrderRecap();
                App.bindPaymentMethods();
            }
        } catch (e) {}

        // Sync top step indicator
        try {
            document.querySelectorAll('.order-steps .step').forEach(s => s.classList.remove('active'));
            const topo = document.getElementById('step' + step);
            if (topo) topo.classList.add('active');
        } catch(e) {}

        try {
            const order = document.getElementById('order');
            if (order) {
                if (window.location.hash !== '#order') {
                    try { window.history.replaceState(null, '', '#order'); } catch (e) { window.location.hash = 'order'; }
                }
                order.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (e) {}
    } catch (e) { console.error('nextStep error', e); }
};

// Step 4: recap & payment
App.getSelectedMenus = function() {
    try {
        const rawSel = localStorage.getItem('tgt_selected_menus');
        if (!rawSel) return [];
        const parsedSel = JSON.parse(rawSel);
        return Array.isArray(parsedSel) ? parsedSel : [];
    } catch (e) {
        return [];
    }
};

App.formatMoney = function(v) {
    const n = parseInt(v ?? 0, 10) || 0;
    return `${n.toLocaleString('fr-FR')} FCFA`;
};

App.getDeliverySnapshot = function() {
    try {
        const method = localStorage.getItem('tgt_delivery_method') || document.querySelector('.delivery-option.selected')?.dataset.type || 'delivery';
        const street = document.getElementById('deliveryStreet')?.value?.trim() || '';
        const city = document.getElementById('deliveryCity')?.value?.trim() || '';
        const quarter = document.getElementById('deliveryQuarter')?.value?.trim() || '';
        const notes = document.getElementById('deliveryNotes')?.value?.trim() || '';
        const address = [street, quarter, city].filter(Boolean).join(', ');

        try { localStorage.setItem('tgt_delivery_address', address); } catch (e) {}

        const timeMode = document.querySelector('.time-option.selected')?.dataset.time || (localStorage.getItem('tgt_time_mode') || 'asap');
        let scheduled = null;
        if (timeMode === 'later') {
            const date = document.getElementById('scheduleDate')?.value || '';
            const hour = document.getElementById('scheduleHour')?.value || '';
            if (date && hour) scheduled = { date, hour };
        }

        return { method, address, notes, timeMode, scheduled };
    } catch (e) {
        return { method: 'delivery', address: '', notes: '', timeMode: 'asap', scheduled: null };
    }
};

App.updateOrderRecap = function() {
    try {
        const itemsWrap = document.getElementById('orderSummaryItems');
        const totalsWrap = document.getElementById('orderTotals');
        const deliveryWrap = document.getElementById('deliveryInfoSummary');
        if (!itemsWrap || !totalsWrap || !deliveryWrap) return;

        const items = App.getSelectedMenus();
        const customization = App.getSelectedCustomization ? App.getSelectedCustomization() : { sides: [], sauces: [], instructions: '' };
        const delivery = App.getDeliverySnapshot();

        // Resolve labels for selected options from chips
        const sideWrap = document.getElementById('sideDishesOptions');
        const sauceWrap = document.getElementById('saucesOptions');
        const optionLabels = [];
        if (sideWrap) {
            (customization.sides || []).forEach(id => {
                const el = sideWrap.querySelector(`.opt-chip[data-kind="side"][data-id="${id}"] .opt-chip-name`);
                if (el) optionLabels.push(el.textContent.trim());
            });
        }
        if (sauceWrap) {
            (customization.sauces || []).forEach(id => {
                const el = sauceWrap.querySelector(`.opt-chip[data-kind="sauce"][data-id="${id}"] .opt-chip-name`);
                if (el) optionLabels.push(el.textContent.trim());
            });
        }

        const itemRows = (items || []).length
            ? (items || []).map(it => {
                const name = escapeHtml(it.name || 'Plat');
                const qty = parseInt(it.qty ?? it.quantity ?? 1, 10) || 1;
                const unit = parseInt(it.unit_price ?? it.price ?? 0, 10) || 0;
                const lineTotal = unit * qty;
                return `
                    <div class="recap-row">
                        <div class="recap-main">
                            <div class="recap-title">${name}</div>
                            <div class="recap-sub">QuantitÃƒÂ©: <strong>${qty}</strong> Ã¢â‚¬Â¢ Prix: ${App.formatMoney(unit)}</div>
                        </div>
                        <div class="recap-amount">${App.formatMoney(lineTotal)}</div>
                    </div>
                `;
            }).join('')
            : '<div class="muted">Aucun article sÃƒÂ©lectionnÃƒÂ©</div>';

        const optionsBlock = optionLabels.length
            ? `<div class="recap-block">
                    <div class="recap-block-title">Options choisies</div>
                    <div class="recap-tags">${optionLabels.map(o => `<span class="recap-tag">${escapeHtml(o)}</span>`).join('')}</div>
               </div>`
            : '';

        const instr = (customization.instructions || '').trim();
        const instrBlock = instr
            ? `<div class="recap-block">
                    <div class="recap-block-title">Instructions</div>
                    <div class="recap-notes">${escapeHtml(instr)}</div>
               </div>`
            : '';

        itemsWrap.innerHTML = `<div class="recap-card">${itemRows}${optionsBlock}${instrBlock}</div>`;

        const subtotal = (items || []).reduce((sum, it) => {
            const qty = parseInt(it.qty ?? it.quantity ?? 1, 10) || 1;
            const unit = parseInt(it.unit_price ?? it.price ?? 0, 10) || 0;
            return sum + (qty * unit);
        }, 0);
        const deliveryFee = delivery.method === 'pickup' ? 0 : 1500;
        const total = subtotal + deliveryFee;

        totalsWrap.innerHTML = `
            <div class="totals-card">
                <div class="totals-row"><span>Sous-total</span><strong>${App.formatMoney(subtotal)}</strong></div>
                <div class="totals-row"><span>Frais de livraison</span><strong>${App.formatMoney(deliveryFee)}</strong></div>
                <div class="totals-row totals-row-total"><span>Total</span><strong>${App.formatMoney(total)}</strong></div>
            </div>
        `;

        const when = delivery.timeMode === 'later' && delivery.scheduled
            ? `${escapeHtml(delivery.scheduled.date)} ÃƒÂ  ${escapeHtml(delivery.scheduled.hour)}`
            : 'DÃƒÂ¨s que possible';

        deliveryWrap.innerHTML = `
            <div class="recap-info">
                <div class="info-line"><span class="info-label">Mode</span><span class="info-value">${delivery.method === 'pickup' ? 'Retrait sur place' : 'Livraison'}</span></div>
                ${delivery.method === 'pickup'
                    ? `<div class="info-line"><span class="info-label">Adresse</span><span class="info-value">Avenue de l'IndÃƒÂ©pendance, Badalabougou, Bamako</span></div>`
                    : `<div class="info-line"><span class="info-label">Adresse</span><span class="info-value">${escapeHtml(delivery.address || 'Ã¢â‚¬â€')}</span></div>`
                }
                <div class="info-line"><span class="info-label">Quand</span><span class="info-value">${when}</span></div>
                ${delivery.notes ? `<div class="info-line"><span class="info-label">Note</span><span class="info-value">${escapeHtml(delivery.notes)}</span></div>` : ''}
            </div>
        `;

        try { localStorage.setItem('tgt_order_total', String(total)); } catch (e) {}
    } catch (e) {
        console.error('updateOrderRecap error', e);
    }
};

App.bindPaymentMethods = function() {
    try {
        const methodsWrap = document.querySelector('#wizardStep4 .payment-methods');
        if (!methodsWrap) return;
        if (methodsWrap.dataset.bound === '1') return;
        methodsWrap.dataset.bound = '1';

        const stored = localStorage.getItem('tgt_payment_method') || 'cash';
        document.querySelectorAll('#wizardStep4 .payment-method').forEach(el => {
            el.classList.toggle('selected', (el.dataset.method || '') === stored);
        });

        methodsWrap.addEventListener('click', function(e) {
            const card = e.target && e.target.closest ? e.target.closest('.payment-method') : null;
            if (!card) return;
            const method = card.dataset.method || 'cash';
            document.querySelectorAll('#wizardStep4 .payment-method').forEach(el => el.classList.remove('selected'));
            card.classList.add('selected');
            try { localStorage.setItem('tgt_payment_method', method); } catch (err) {}
        });
    } catch (e) {
        console.error('bindPaymentMethods error', e);
    }
};

// Auto-refresh recap if step 4 is already visible or when selection changes
document.addEventListener('DOMContentLoaded', function () {
    try {
        if (document.getElementById('wizardStep4')?.classList.contains('active')) {
            try { App.updateOrderRecap(); App.bindPaymentMethods(); } catch (e) {}
        }
        window.addEventListener('tgt:customization:changed', function(){
            if (document.getElementById('wizardStep4')?.classList.contains('active')) {
                try { App.updateOrderRecap(); } catch (e) {}
            }
        });
    } catch (e) {}
});

App.getSelectedCustomization = function() {
    try {
        const raw = localStorage.getItem('tgt_customization');
        const v = raw ? JSON.parse(raw) : null;
        const out = {
            sides: Array.isArray(v?.sides) ? v.sides : [],
            sauces: Array.isArray(v?.sauces) ? v.sauces : [],
            instructions: (v?.instructions || '').toString()
        };
        return out;
    } catch (e) {
        return { sides: [], sauces: [], instructions: '' };
    }
};

App.setSelectedCustomization = function(next) {
    const v = next || {};
    const payload = {
        sides: Array.isArray(v.sides) ? v.sides : [],
        sauces: Array.isArray(v.sauces) ? v.sauces : [],
        instructions: (v.instructions || '').toString()
    };
    try { localStorage.setItem('tgt_customization', JSON.stringify(payload)); } catch (e) {}
};

App.loadCustomizationOptions = async function() {
    try {
        const sideWrap = document.getElementById('sideDishesOptions');
        const sauceWrap = document.getElementById('saucesOptions');
        if (!sideWrap || !sauceWrap) return;

        // Avoid refetch if already loaded
        if (sideWrap.dataset.loaded === '1' && sauceWrap.dataset.loaded === '1') {
            App.bindCustomizationEvents();
            App.updateCustomizationSummary();
            return;
        }

        sideWrap.innerHTML = '<div class="loading" style="padding:16px"><div class="spinner" style="width:26px;height:26px"></div></div>';
        sauceWrap.innerHTML = '<div class="loading" style="padding:16px"><div class="spinner" style="width:26px;height:26px"></div></div>';

        const base = (window.API_BASE_URL || 'backend/api').replace(/\/+$/, '');
        const url = base + '/shop/customization-options.php';
        const res = await fetch(url);
        const json = await res.json();
        if (!json || !json.success) {
            sideWrap.innerHTML = '<div style="color:#666">Aucun accompagnement</div>';
            sauceWrap.innerHTML = '<div style="color:#666">Aucune sauce</div>';
            return;
        }

        const options = Array.isArray(json?.data?.options) ? json.data.options : [];
        const sides = options.filter(o => String(o.type || '').toLowerCase() === 'side');
        const sauces = options.filter(o => String(o.type || '').toLowerCase() === 'sauce');

        const sel = App.getSelectedCustomization();

        sideWrap.innerHTML = sides.length ? sides.map(o => {
            const id = parseInt(o.id, 10);
            const isSelected = sel.sides.includes(id);
            const price = parseInt(o.price ?? 0, 10) || 0;
            return `
                <button type="button" class="opt-chip ${isSelected ? 'selected' : ''}" data-kind="side" data-id="${id}">
                    <span class="opt-chip-name">${escapeHtml(o.name || '')}</span>
                    ${price > 0 ? `<span class="opt-chip-price">+${price} FCFA</span>` : ''}
                </button>
            `;
        }).join('') : '<div style="color:#666">Aucun accompagnement</div>';

        sauceWrap.innerHTML = sauces.length ? sauces.map(o => {
            const id = parseInt(o.id, 10);
            const isSelected = sel.sauces.includes(id);
            const price = parseInt(o.price ?? 0, 10) || 0;
            return `
                <button type="button" class="opt-chip ${isSelected ? 'selected' : ''}" data-kind="sauce" data-id="${id}">
                    <span class="opt-chip-name">${escapeHtml(o.name || '')}</span>
                    ${price > 0 ? `<span class="opt-chip-price">+${price} FCFA</span>` : ''}
                </button>
            `;
        }).join('') : '<div style="color:#666">Aucune sauce</div>';

        sideWrap.dataset.loaded = '1';
        sauceWrap.dataset.loaded = '1';
        App.bindCustomizationEvents();

        // Restore instructions
        const instr = document.getElementById('specialInstructions');
        if (instr && !instr.value) instr.value = sel.instructions || '';
        App.updateCustomizationSummary();
    } catch (e) {
        console.error('loadCustomizationOptions error', e);
    }
};

App.removeCustomizationOption = function(kind, id) {
    try {
        const k = String(kind || '').toLowerCase();
        const optId = parseInt(id || 0, 10) || 0;
        if (!optId || (k !== 'side' && k !== 'sauce')) return;

        const sel = App.getSelectedCustomization();
        const list = k === 'side' ? sel.sides : sel.sauces;
        const idx = list.indexOf(optId);
        if (idx >= 0) list.splice(idx, 1);
        App.setSelectedCustomization(sel);

        // Sync UI chip
        const wrap = document.getElementById(k === 'side' ? 'sideDishesOptions' : 'saucesOptions');
        const chip = wrap ? wrap.querySelector(`.opt-chip[data-kind="${k}"][data-id="${optId}"]`) : null;
        if (chip) chip.classList.remove('selected');

        App.updateCustomizationSummary();
    } catch (e) {
        console.error('removeCustomizationOption error', e);
    }
};

App.bindCustomizationEvents = function() {
    const sideWrap = document.getElementById('sideDishesOptions');
    const sauceWrap = document.getElementById('saucesOptions');
    if (!sideWrap || !sauceWrap) return;

    function toggle(kind, id) {
        const sel = App.getSelectedCustomization();
        const list = kind === 'side' ? sel.sides : sel.sauces;
        const idx = list.indexOf(id);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(id);
        App.setSelectedCustomization(sel);
        App.updateCustomizationSummary();
    }

    [sideWrap, sauceWrap].forEach(wrap => {
        if (wrap.dataset.bound === '1') return;
        wrap.dataset.bound = '1';
        wrap.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('.opt-chip') : null;
            if (!btn) return;
            const kind = btn.getAttribute('data-kind');
            const id = parseInt(btn.getAttribute('data-id') || '0', 10);
            if (!id) return;
            btn.classList.toggle('selected');
            toggle(kind, id);
        });
    });

    const instr = document.getElementById('specialInstructions');
    if (instr && instr.dataset.bound !== '1') {
        instr.dataset.bound = '1';
        instr.addEventListener('input', () => {
            const sel = App.getSelectedCustomization();
            sel.instructions = instr.value || '';
            App.setSelectedCustomization(sel);
            App.updateCustomizationSummary();
        });
    }
};

App.updateCustomizationSummary = function() {
    try {
        const itemsEl = document.getElementById('customizeSelectedItems');
        const optsEl = document.getElementById('customizeSelectedOptions');
        if (!itemsEl || !optsEl) return;

        // Selected items from step1: customize-order.js persists into tgt_selected_menus
        let selected = [];
        try {
            const rawSel = localStorage.getItem('tgt_selected_menus');
            if (rawSel) {
                const parsedSel = JSON.parse(rawSel);
                selected = Array.isArray(parsedSel) ? parsedSel : [];
            }
        } catch (e) {}

        // Fallback to cart if no explicit selection was persisted
        if (!selected || !selected.length) {
            try {
                const raw = localStorage.getItem('cart') || '[]';
                const parsed = JSON.parse(raw);
                selected = Array.isArray(parsed) ? parsed : [];
            } catch (e) { selected = []; }
        }

        const lines = (selected || []).slice(0, 8).map(it => {
            const name = escapeHtml(it.name || it.item_name || 'Article');
            const qty = parseInt(it.qty ?? it.quantity ?? 1, 10) || 1;
            return `<div class="customize-pill"><span>${name}</span><span class="muted">x${qty}</span></div>`;
        }).join('') || '<div class="muted">Aucun plat sÃƒÂ©lectionnÃƒÂ©</div>';
        itemsEl.innerHTML = lines;

        const sel = App.getSelectedCustomization();
        const sideWrap = document.getElementById('sideDishesOptions');
        const sauceWrap = document.getElementById('saucesOptions');
        const selectedOptions = [];

        if (sideWrap) {
            sel.sides.forEach(id => {
                const el = sideWrap.querySelector(`.opt-chip[data-kind="side"][data-id="${id}"] .opt-chip-name`);
                const name = el ? el.textContent.trim() : '';
                selectedOptions.push({ kind: 'side', id, name });
            });
        }
        if (sauceWrap) {
            sel.sauces.forEach(id => {
                const el = sauceWrap.querySelector(`.opt-chip[data-kind="sauce"][data-id="${id}"] .opt-chip-name`);
                const name = el ? el.textContent.trim() : '';
                selectedOptions.push({ kind: 'sauce', id, name });
            });
        }

        const optHtml = selectedOptions.length
            ? selectedOptions.map(o => {
                const label = escapeHtml(o.name || (o.kind === 'side' ? 'Accompagnement' : 'Sauce'));
                return `
                    <div class="customize-pill customize-pill-removable">
                        <span>${label}</span>
                        <button type="button" class="pill-remove" aria-label="Retirer" data-kind="${o.kind}" data-id="${o.id}">Ãƒâ€”</button>
                    </div>
                `;
            }).join('')
            : '<div class="muted">Aucune option sÃƒÂ©lectionnÃƒÂ©e</div>';
        optsEl.innerHTML = optHtml;
    } catch (e) {
        console.error('updateCustomizationSummary error', e);
    }
};

// Keep Step2 summary in sync with Step1 selection changes
document.addEventListener('DOMContentLoaded', function () {
    try {
        window.addEventListener('tgt:customization:changed', function () {
            try { App.updateCustomizationSummary(); } catch (e) {}
        });

        // Allow removing selected options via (x) button in summary
        const optsEl = document.getElementById('customizeSelectedOptions');
        if (optsEl && optsEl.dataset.bound !== '1') {
            optsEl.dataset.bound = '1';
            optsEl.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('.pill-remove') : null;
                if (!btn) return;
                const kind = btn.getAttribute('data-kind');
                const id = parseInt(btn.getAttribute('data-id') || '0', 10);
                App.removeCustomizationOption(kind, id);
            });
        }
    } catch (e) {}
});

window.prevStep = function(step) {
    try {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('wizardStep' + step);
        if (target) target.classList.add('active');

        // sync top indicator
        try {
            document.querySelectorAll('.order-steps .step').forEach(s => s.classList.remove('active'));
            const topo = document.getElementById('step' + step);
            if (topo) topo.classList.add('active');
        } catch(e) {}
    } catch (e) { console.error('prevStep error', e); }
};

// Initialize App once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { App.init(); });
} else {
    App.init();
}

// After load: if login redirected back with resume flag or there's a pending wizard, resume it
document.addEventListener('DOMContentLoaded', function () {
    try {
        const params = new URLSearchParams(window.location.search);
        const pendingRaw = localStorage.getItem('tgt_pending_wizard');
        let pending = null;
        if (pendingRaw) {
            try { pending = JSON.parse(pendingRaw); } catch (e) { pending = null; }
        }

        if (params.get('resume_wizard') === '1' && params.get('return')) {
            // If return param present, clear it from URL and resume
            const returnPath = params.get('return');
            try { history.replaceState(null, '', returnPath); } catch (e) {}
            setTimeout(()=>{ try { nextStep(2); localStorage.removeItem('tgt_pending_wizard'); } catch(e){} }, 300);
            return;
        }

        if (pending && pending.step) {
            // If pending wizard for this path, resume
            if (!pending.path || pending.path === (window.location.pathname + window.location.search)) {
                setTimeout(()=>{ try { nextStep(pending.step); localStorage.removeItem('tgt_pending_wizard'); } catch(e){} }, 300);
            }
        }

        // Direct step opening requested by "Commander" buttons
        const autoStepRaw = localStorage.getItem('tgt_order_autostep');
        if (autoStepRaw) {
            let autoStep = null;
            try { autoStep = JSON.parse(autoStepRaw); } catch (e) { autoStep = null; }
            const step = Number((autoStep && autoStep.step) || autoStepRaw || 0);
            if (step > 0) {
                setTimeout(() => {
                    try { nextStep(step); } catch (e) {}
                    try { localStorage.removeItem('tgt_order_autostep'); } catch (e) {}
                }, 260);
            }
        }
    } catch (e) { console.error('resume wizard', e); }
});

// Initialize order wizard controls (delivery selection, scheduling, prefill)
document.addEventListener('DOMContentLoaded', function () {
    try {
        function initOrderWizard() {
            // Delivery option toggle
            document.querySelectorAll('.delivery-option').forEach(opt => {
                opt.addEventListener('click', function () {
                    document.querySelectorAll('.delivery-option').forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    const type = this.dataset.type || 'delivery';
                    try { localStorage.setItem('tgt_delivery_method', type); } catch(e){}
                    if (type === 'delivery') {
                        document.getElementById('deliveryAddressSection').style.display = '';
                        document.getElementById('pickupInfoSection').style.display = 'none';
                    } else {
                        document.getElementById('deliveryAddressSection').style.display = 'none';
                        document.getElementById('pickupInfoSection').style.display = '';
                    }
                });
            });

            // Time options
            document.querySelectorAll('.time-option').forEach(t => {
                t.addEventListener('click', function () {
                    document.querySelectorAll('.time-option').forEach(x => x.classList.remove('selected'));
                    this.classList.add('selected');
                    const tm = this.dataset.time || 'asap';
                    try { localStorage.setItem('tgt_time_mode', tm); } catch(e){}
                    if (tm === 'later') document.getElementById('scheduleTime').style.display = '';
                    else document.getElementById('scheduleTime').style.display = 'none';
                });
            });

            // Prefill guest/user data if available
            try {
                const raw = localStorage.getItem('user_data');
                if (raw) {
                    const u = JSON.parse(raw);
                    if (u) {
                        if (document.getElementById('guestFirstName')) document.getElementById('guestFirstName').value = u.first_name || '';
                        if (document.getElementById('guestLastName')) document.getElementById('guestLastName').value = u.last_name || '';
                        if (document.getElementById('guestPhone')) document.getElementById('guestPhone').value = u.phone || '';
                        if (document.getElementById('guestEmail')) document.getElementById('guestEmail').value = u.email || '';
                        // delivery address
                        if (document.getElementById('deliveryStreet')) document.getElementById('deliveryStreet').value = u.address || '';
                        if (document.getElementById('deliveryCity')) document.getElementById('deliveryCity').value = u.city || document.getElementById('deliveryCity').value || '';
                        if (document.getElementById('deliveryQuarter')) document.getElementById('deliveryQuarter').value = u.quarter || '';
                    }
                }
            } catch (e) {}

            // If persisted delivery method exists, apply it
            try {
                const dm = localStorage.getItem('tgt_delivery_method');
                if (dm) {
                    const el = document.querySelector(`.delivery-option[data-type="${dm}"]`);
                    if (el) el.click();
                }
            } catch(e){}

            // If persisted time mode exists
            try {
                const tm = localStorage.getItem('tgt_time_mode');
                if (tm) {
                    const el = document.querySelector(`.time-option[data-time="${tm}"]`);
                    if (el) el.click();
                }
            } catch(e){}

            // Place order button handler: validate one more time then dispatch action
            const placeBtn = document.getElementById('placeOrderBtn');
            if (placeBtn) {
                placeBtn.addEventListener('click', async function () {
                    // Trigger nextStep(4) validation by calling nextStep with same step (it will validate before activation)
                    try { nextStep(4); } catch(e){}
                    // If still on step4, proceed to create order (trigger event used by customize-order or call createOrder)
                    const activeStep = document.querySelector('.wizard-step.active')?.id;
                    if (activeStep === 'wizardStep4') {
                        // Dispatch event to submit order (customize-order listens for step 4)
                        window.dispatchEvent(new CustomEvent('tgt:checkout:step', { detail: { step: 4 } }));
                    }
                });
            }
        }

        initOrderWizard();
    } catch (e) { console.error('init order wizard', e); }
});


