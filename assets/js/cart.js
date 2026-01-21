/**
 * Gestion simplifiée du panier
 */

// Met à jour le compteur du panier (utilise App si disponible)
function updateCartCountLocal() {
    if (window.App && typeof window.App.updateCartCount === 'function') {
        return window.App.updateCartCount();
    }
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = cart.length;
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Fonction pour ajouter au panier
window.addToCart = function(item) {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        // Rediriger vers la connexion
        localStorage.setItem('pending_cart_item', JSON.stringify(item));
        window.location.href = 'login.html?redirect=home&message=connectez-vous pour ajouter au panier';
        return false;
    }
    
    // Ajouter au panier
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Mettre à jour le compteur
    updateCartCountLocal();
    
    // Afficher une notification
    if (typeof showNotification === 'function') showNotification(`${item.name} ajouté au panier!`, 'success');
    return true;
}

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Ajouter les styles si nécessaire
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 8px;
                background: white;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateX(150%);
                transition: transform 0.3s ease;
                z-index: 10000;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification.success {
                border-left: 4px solid #28a745;
                color: #155724;
                background: #d4edda;
            }
            
            .notification.error {
                border-left: 4px solid #dc3545;
                color: #721c24;
                background: #f8d7da;
            }
            
            .notification.info {
                border-left: 4px solid #007bff;
                color: #004085;
                background: #cce5ff;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Expose local helpers for App and inline code
window.showNotification = showNotification;

// If page was redirected with a pending cart item, handle it on App.init
if (new URLSearchParams(window.location.search).get('redirect') === 'home' && localStorage.getItem('pending_cart_item')) {
    // We don't auto-add now; App.init will call updateCartCountLocal and the pending logic
}

// Provide a fallback used by the product cards/modal to add items from the home view
window.addToCartFromHome = function(id, product) {
    // prefer full product object if provided
    const item = product || (id ? { id } : null);
    if (!item) return false;
    return window.addToCart(item);
};

// Listen for the custom event emitted by frontend when user clicks 'Ajouter'
document.addEventListener('tgt:add-to-cart', function (ev) {
    try {
        const product = ev && ev.detail ? ev.detail : null;
        if (!product) return;
        window.addToCartFromHome(product.id || product.product_id || null, product);
    } catch (e) {
        console.error('Erreur handling tgt:add-to-cart', e);
    }
});

// Ensure visible cart count is correct on load
document.addEventListener('DOMContentLoaded', function () {
    try { updateCartCountLocal(); } catch (e) {}
});