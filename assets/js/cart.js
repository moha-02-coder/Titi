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
        const count = cart.reduce((sum, it) => sum + (parseInt(it.quantity ?? 1, 10) || 1), 0);
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? 'flex' : 'none';
    }
}

function readCart() {
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        return Array.isArray(cart) ? cart : [];
    } catch (e) {
        return [];
    }
}

function writeCart(cart) {
    localStorage.setItem('cart', JSON.stringify(Array.isArray(cart) ? cart : []));
}

function getItemKey(item) {
    const id = item && (item.id ?? item.item_id ?? item.product_id ?? '');
    const type = (item && (item.type || item.item_type || item.source)) ? String(item.type || item.item_type || item.source) : 'product';
    return `${type}:${id}`;
}

function formatMoney(value) {
    const n = parseInt(value ?? 0, 10) || 0;
    return `${n} FCFA`;
}

function normalizeCartItem(item) {
    const it = item || {};
    const id = it.id ?? it.item_id ?? it.product_id ?? null;
    const type = (it.type || it.item_type || it.source || (it.is_product ? 'product' : 'menu') || 'product').toString();
    const qty = parseInt(it.quantity ?? 1, 10) || 1;
    return {
        id,
        type,
        name: it.name || it.item_name || 'Article',
        price: parseInt(it.price ?? it.unit_price ?? 0, 10) || 0,
        image_url: it.image_url || it.image || it.main_image || '',
        quantity: qty
    };
}

function resolveImageUrl(src) {
    const s = (src || '').toString().trim();
    if (!s) return (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
    if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
    if (s.startsWith('/')) {
        // Handle default image path correctly
        if (s.includes('/assets/images/default.jpg')) {
            return (window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
        }
        return s;
    }
    return s;
}

function computeTotals(cart) {
    const subtotal = cart.reduce((sum, it) => sum + ((parseInt(it.price ?? 0, 10) || 0) * (parseInt(it.quantity ?? 1, 10) || 1)), 0);
    const delivery = 1000;
    return { subtotal, delivery, total: subtotal + delivery };
}

function renderCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (!sidebar) return;
    const itemsEl = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');
    const subtotalEl = document.getElementById('cartSubtotal');
    const deliveryEl = document.getElementById('cartDelivery');
    const totalEl = document.getElementById('cartTotal');

    const cart = readCart();
    if (!itemsEl || !emptyEl || !footer) return;

    if (!cart.length) {
        itemsEl.style.display = 'none';
        footer.style.display = 'none';
        emptyEl.style.display = '';
        itemsEl.innerHTML = '';
        updateCartCountLocal();
        return;
    }

    emptyEl.style.display = 'none';
    itemsEl.style.display = '';
    footer.style.display = '';

    itemsEl.innerHTML = cart.map(it => {
        const key = escapeHtml(getItemKey(it));
        const img = resolveImageUrl(it.image_url);
        const qty = parseInt(it.quantity ?? 1, 10) || 1;
        const line = (parseInt(it.price ?? 0, 10) || 0) * qty;
        return `
            <div class="cart-item" data-key="${key}">
                <div class="cart-item-left">
                    <img class="cart-item-img" src="${img}" alt="${escapeHtml(it.name || '')}" onerror="this.onerror=null;this.src='${(window.ASSETS_BASE_URL || '/assets') + '/images/default.jpg'}';" />
                </div>
                <div class="cart-item-main">
                    <div class="cart-item-title">${escapeHtml(it.name || '')}</div>
                    <div class="cart-item-meta">
                        <span class="cart-item-price">${formatMoney(it.price || 0)}</span>
                        <span class="cart-item-line">${formatMoney(line)}</span>
                    </div>
                    <div class="cart-item-actions">
                        <button class="cart-qty-btn" type="button" data-action="dec" aria-label="Diminuer">-</button>
                        <span class="cart-qty">${qty}</span>
                        <button class="cart-qty-btn" type="button" data-action="inc" aria-label="Augmenter">+</button>
                        <button class="cart-remove" type="button" data-action="remove" aria-label="Supprimer"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const totals = computeTotals(cart);
    if (subtotalEl) subtotalEl.textContent = formatMoney(totals.subtotal);
    if (deliveryEl) deliveryEl.textContent = formatMoney(totals.delivery);
    if (totalEl) totalEl.textContent = formatMoney(totals.total);
    updateCartCountLocal();
}

function openCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    try { document.body.classList.add('cart-open'); } catch (e) {}
    renderCart();
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    try { document.body.classList.remove('cart-open'); } catch (e) {}
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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

    // Ajouter au panier (déduplication + quantité)
    const it = normalizeCartItem(item);
    if (!it.id) return false;
    const cart = readCart();
    const key = getItemKey(it);
    const idx = cart.findIndex(x => getItemKey(x) === key);
    if (idx >= 0) {
        cart[idx].quantity = (parseInt(cart[idx].quantity ?? 1, 10) || 1) + (parseInt(it.quantity ?? 1, 10) || 1);
    } else {
        cart.push(it);
    }
    writeCart(cart);

    // Mettre à jour le compteur
    updateCartCountLocal();

    // Rafraîchir l'UI si présente
    try { renderCart(); } catch (e) {}

    // Afficher une notification
    if (typeof showNotification === 'function') showNotification(`${it.name} ajouté au panier!`, 'success');
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
    try { renderCart(); } catch (e) {}

    const floatingBtn = document.getElementById('cartFloatingBtn');
    if (floatingBtn) floatingBtn.addEventListener('click', openCart);
    const closeBtn = document.getElementById('cartClose');
    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    const overlay = document.getElementById('cartOverlay');
    if (overlay) overlay.addEventListener('click', closeCart);
    const contBtn = document.getElementById('continueShopping');
    if (contBtn) contBtn.addEventListener('click', closeCart);

    const itemsEl = document.getElementById('cartItems');
    if (itemsEl) {
        itemsEl.addEventListener('click', (e) => {
            const target = e.target;
            const row = target && target.closest ? target.closest('.cart-item') : null;
            if (!row) return;
            const key = row.getAttribute('data-key') || '';
            const btn = target && target.closest ? target.closest('button[data-action]') : null;
            const action = btn ? btn.getAttribute('data-action') : '';
            if (!action) return;

            const cart = readCart();
            const idx = cart.findIndex(x => escapeHtml(getItemKey(x)) === key);
            if (idx < 0) return;
            const qty = parseInt(cart[idx].quantity ?? 1, 10) || 1;
            if (action === 'inc') cart[idx].quantity = qty + 1;
            if (action === 'dec') cart[idx].quantity = Math.max(1, qty - 1);
            if (action === 'remove') cart.splice(idx, 1);
            writeCart(cart);
            renderCart();
        });
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
        // Le flux existant de commande se fait via order.js / wizard, on redirige vers la section commander
        try {
            closeCart();
            const p = window.location.pathname || '';
            if (p.endsWith('/boutique.html') || p.endsWith('boutique.html')) {
                window.location.href = 'index.html#order';
            } else {
                window.location.hash = '#order';
            }
        } catch (e) {
            window.location.href = 'index.html#order';
        }
    });
});