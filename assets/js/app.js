/**
 * Application principale Titi Golden Taste
 */

// Create App namespace
window.App = window.App || {};

// Fonction utilitaire pour faire des requêtes API
async function fetchAPI(endpoint) {
    const base = window.API_BASE_URL || 'titi-golden-taste/backend/api';
    try {
        console.log(`Fetching: ${base}/${endpoint}`);
        const response = await fetch(`${base}/${endpoint}`);
        
        console.log(`Response status: ${response.status} for ${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const json = await response.json();
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
        console.error(`Erreur lors de la récupération de ${endpoint}:`, error);
        throw error;
    }
}

// Fonction pour mettre à jour le statut live (DÉFINIE GLOBALEMENT)
window.updateLiveStatus = async function() {
    const statusElement = document.getElementById('live-status');
    const messageElement = document.getElementById('status-message');
    
    if (!statusElement) {
        console.error('Element live-status non trouvé');
        return;
    }
    
    try {
        statusElement.className = 'status loading';
        const statusText = statusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Vérification...';
        }
        
        if (messageElement) {
            messageElement.textContent = '';
        }
        
        const data = await fetchAPI('live.php');
        console.log('Live status data:', data);
        
        // Mettre à jour le statut
        statusElement.className = `status ${data.status}`;
        if (statusText) {
            statusText.textContent = 
                data.status === 'open' ? 'Ouvert' : 
                data.status === 'closed' ? 'Fermé' : 'En attente';
        }
        
        // Mettre à jour le message
        if (messageElement) {
            messageElement.textContent = data.message || '';
        }
        
    } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
        statusElement.className = 'status closed';
        const statusText = statusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Hors ligne';
        }
        if (messageElement) {
            messageElement.textContent = 'Impossible de vérifier le statut';
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
                <h3>Poulet braisé</h3>
                <p class="menu-description">Servi avec alloco et sauce maison</p>
                <div class="menu-price">3500 FCFA <span>(TTC)</span></div>
                <button class="btn" onclick="addToCartFromHome({
                    id: 1,
                    name: 'Poulet braisé',
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
                        <p class="product-description">Sauce pimentée préparée avec des ingrédients frais</p>
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
                        <h3>Attiéké traditionnel</h3>
                        <div class="product-price">2000 FCFA</div>
                        <span class="in-stock">En stock</span>
                        <p class="product-description">Paquet de 1kg d'attieké frais</p>
                        <button class="btn" style="margin-top: 15px; width: 100%;" 
                                onclick="addToCartFromHome({
                                    id: 2,
                                    name: 'Attiéké traditionnel',
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

// Obtenir l'icône du produit
function getProductIcon(category) {
    const icons = {
        'sauce': 'wine-bottle',
        'accompagnement': 'utensils',
        'condiment': 'oil-can',
        'épice': 'mortar-pestle',
        'snack': 'cookie-bite',
        'boisson': 'wine-glass-alt'
    };
    return icons[category] || 'shopping-bag';
}

// Fonction pour simuler l'ajout au panier depuis la page d'accueil
App.addToCartFromHome = function(item) {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        // Stocker l'article et rediriger vers la connexion
        localStorage.setItem('pending_cart_item', JSON.stringify(item));
        window.location.href = 'login.html?redirect=home&message=connectez-vous pour ajouter au panier';
        return;
    }
    
    // Ajouter au panier (simulation)
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Afficher une notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i> 
        ${item.name} ajouté au panier!
    `;
    
    document.body.appendChild(notification);
    
    // Mettre à jour le compteur du panier
    updateCartCount();
    
    // Supprimer la notification après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Mettre à jour le compteur du panier
App.updateCartCount = function() {
    const cartCount = window.$find(window.DOM_SELECTORS.cartCount) || document.getElementById('cartCount');
    if (cartCount) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = cart.length;
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? 'flex' : 'none';
    }
};

// Créer l'icône du panier si elle n'existe pas
App.createCartIcon = function() {
    // Idempotent: if already present do nothing
    const existing = window.$find([window.DOM_SELECTORS.cartIcon.replace('#','')]) || document.getElementById('cartIcon');
    if (existing) return;

    const headerContainer = window.$find(window.DOM_SELECTORS.headerContainer);
    if (!headerContainer) return; // nothing to do on pages without header

    const cartLink = document.createElement('a');
    cartLink.href = 'dashboard.html#new-order';
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

    // Handle pending cart item after login redirect
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('redirect') === 'home' && localStorage.getItem('pending_cart_item')) {
            const item = JSON.parse(localStorage.getItem('pending_cart_item'));
            localStorage.removeItem('pending_cart_item');
            if (window.addToCart && typeof window.addToCart === 'function') {
                if (window.addToCart(item)) {
                    if (window.showNotification) window.showNotification('Article ajouté à votre panier!', 'success');
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
window.addToCartFromHome = function(item) { return App.addToCartFromHome(item); };
window.updateCartCount = function() { if (typeof App.updateCartCount === 'function') return App.updateCartCount(); };

// Simple wizard navigation helpers used by inline buttons
window.nextStep = function(step) {
    try {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('wizardStep' + step);
        if (target) target.classList.add('active');
    } catch (e) { console.error('nextStep error', e); }
};

window.prevStep = function(step) {
    try {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('wizardStep' + step);
        if (target) target.classList.add('active');
    } catch (e) { console.error('prevStep error', e); }
};

// Initialize App once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { App.init(); });
} else {
    App.init();
}