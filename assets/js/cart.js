/**
 * Gestion du panier (source unique)
 */

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

function resolvePrimitiveId(rawId) {
    if (rawId && typeof rawId === 'object') {
        return rawId.id ?? rawId.item_id ?? rawId.product_id ?? null;
    }
    return rawId ?? null;
}

function getItemKey(item) {
    const id = resolvePrimitiveId(item && (item.id ?? item.item_id ?? item.product_id ?? null));
    const type = (item && (item.type || item.item_type || item.source))
        ? String(item.type || item.item_type || item.source)
        : 'product';
    return `${type}:${id ?? ''}`;
}

function formatMoney(value) {
    const n = parseInt(value ?? 0, 10) || 0;
    return `${n} FCFA`;
}

function normalizeCartItem(item) {
    const it = item || {};
    const id = resolvePrimitiveId(it.id ?? it.item_id ?? it.product_id ?? null);
    const type = (it.type || it.item_type || it.source || (it.is_product ? 'product' : 'menu') || 'product').toString();
    const qty = Math.max(1, parseInt(it.quantity ?? it.qty ?? 1, 10) || 1);
    const imageUrl = extractImageValue(it.image_url ?? it.image ?? it.main_image ?? it.images ?? '');

    return {
        id,
        type,
        source: String(it.source || ''),
        name: it.name || it.item_name || 'Article',
        price: parseInt(it.price ?? it.unit_price ?? 0, 10) || 0,
        image_url: imageUrl,
        description: it.description || '',
        quantity: qty
    };
}

function extractImageValue(raw) {
    if (Array.isArray(raw)) {
        const first = raw.find((x) => String(x || '').trim() !== '');
        return first ? String(first).trim() : '';
    }
    if (raw && typeof raw === 'object') {
        const candidate = raw.url || raw.image_url || raw.path || raw.src || '';
        return String(candidate || '').trim();
    }
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('[') && s.endsWith(']')) {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed) && parsed.length) {
                const first = parsed.find((x) => String(x || '').trim() !== '');
                return first ? String(first).trim() : '';
            }
        } catch (e) {}
    }
    return s;
}

function getProjectRootPath() {
    const pathname = (window.location && window.location.pathname) ? window.location.pathname : '/';
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return '';
    if (parts[0].includes('.')) return '';
    return '/' + parts[0];
}

function resolveImageUrl(src) {
    const s = extractImageValue(src);
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;

    const assetsBase = (window.ASSETS_BASE_URL || '/assets').replace(/\/+$/, '');
    if (s.startsWith('/assets/')) {
        return assetsBase + s.slice('/assets'.length);
    }
    if (s.startsWith('assets/')) {
        return assetsBase + s.slice('assets'.length);
    }
    if (s.startsWith('/')) return s;

    const projectRoot = getProjectRootPath();
    if (s.startsWith('uploads/') || s.startsWith('backend/') || s.startsWith('storage/')) {
        return `${projectRoot}/${s}`.replace(/\/{2,}/g, '/');
    }

    return s;
}

function getDefaultCartImageUrl() {
    const root = getProjectRootPath();
    const inferredAssets = root ? `${root}/assets` : '/assets';
    const assetsBase = ((window.ASSETS_BASE_URL || inferredAssets) + '').replace(/\/+$/, '');
    return `${assetsBase}/images/default.jpg`;
}

function renderItemImage(src, name) {
    const img = resolveImageUrl(src);
    const alt = escapeHtml(name || 'Article');
    if (!img) {
        return `<div class="cart-item-img cart-item-img-placeholder"><i class="fas fa-image"></i></div>`;
    }
    const fallback = escapeHtml(getDefaultCartImageUrl());
    return `<img class="cart-item-img" src="${escapeHtml(img)}" alt="${alt}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}';" />`;
}

function collectSelectedCartItems() {
    const raw = readCart()
        .map(normalizeCartItem)
        .filter((it) => it.id !== null && it.id !== undefined && String(it.id).trim() !== '');

    const byKey = new Map();
    raw.forEach((it) => {
        const key = getItemKey(it);
        const existing = byKey.get(key);
        if (existing) {
            existing.quantity += Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
            if (!existing.image_url && it.image_url) existing.image_url = it.image_url;
            if (!existing.description && it.description) existing.description = it.description;
            if (!existing.source && it.source) existing.source = it.source;
        } else {
            byKey.set(key, { ...it });
        }
    });

    const items = Array.from(byKey.values());
    const imageById = new Map();

    try {
        if (window.orderManager && Array.isArray(window.orderManager.menu)) {
            window.orderManager.menu.forEach((m) => {
                const id = String(m?.id ?? '');
                const img = extractImageValue(m?.image_url ?? m?.image ?? m?.images ?? '');
                if (id && img) imageById.set(id, img);
            });
        }
    } catch (e) {}

    try {
        const rawSelected = JSON.parse(localStorage.getItem('tgt_selected_menus') || '[]');
        if (Array.isArray(rawSelected)) {
            rawSelected.forEach((m) => {
                const id = String(m?.id ?? m?.item_id ?? m?.product_id ?? '');
                const img = extractImageValue(m?.image_url ?? m?.image ?? m?.images ?? '');
                if (id && img) imageById.set(id, img);
            });
        }
    } catch (e) {}

    items.forEach((it) => {
        if (!it.image_url) {
            const fallback = imageById.get(String(it.id));
            if (fallback) it.image_url = fallback;
        }
    });

    return items;
}

function persistSelectedCartItems(items) {
    const normalized = (Array.isArray(items) ? items : []).map(normalizeCartItem);
    writeCart(normalized);
}

function computeTotals(items, modeOverride) {
    const cartItems = Array.isArray(items) ? items : [];
    const subtotal = cartItems.reduce((sum, it) => {
        const price = parseInt(it.price ?? 0, 10) || 0;
        const qty = parseInt(it.quantity ?? 1, 10) || 1;
        return sum + (price * qty);
    }, 0);

    const deliveryMode = modeOverride || localStorage.getItem('delivery_mode') || 'standard';
    let delivery = 0;

    if (deliveryMode === 'express') {
        delivery = 2000;
    } else if (deliveryMode === 'standard' || deliveryMode === 'delivery') {
        delivery = subtotal > 10000 ? 0 : 1000;
    } else if (deliveryMode === 'pickup') {
        delivery = 0;
    }

    return { subtotal, delivery, total: subtotal + delivery };
}

function getDeliveryModeFromRadio() {
    const selected = document.querySelector('input[name="deliveryType"]:checked');
    if (!selected) return localStorage.getItem('delivery_mode') || 'standard';
    return selected.value === 'pickup' ? 'pickup' : 'standard';
}

function syncDeliveryRadios() {
    const mode = localStorage.getItem('delivery_mode') || 'standard';
    const selectedValue = mode === 'pickup' ? 'pickup' : 'delivery';

    document.querySelectorAll('input[name="deliveryType"]').forEach((radio) => {
        radio.checked = radio.value === selectedValue;
    });
}

function getPaymentConfig(mode) {
    const key = String(mode || '').toLowerCase();
    if (key === 'card') return { mode: 'card', label: 'Carte bancaire', apiMethod: 'card' };
    if (key === 'mobile_money' || key === 'mobile') return { mode: 'mobile_money', label: 'Mobile Money', apiMethod: 'mobile_money' };
    return { mode: 'cash', label: 'Paiement a la livraison', apiMethod: 'cash' };
}

function getPaymentModeFromRadio() {
    const selected = document.querySelector('input[name="cartPaymentType"]:checked');
    if (!selected) return getPaymentConfig(localStorage.getItem('cart_payment_mode')).mode;
    return getPaymentConfig(selected.value).mode;
}

function syncPaymentRadios() {
    const mode = getPaymentConfig(localStorage.getItem('cart_payment_mode')).mode;
    document.querySelectorAll('input[name="cartPaymentType"]').forEach((radio) => {
        radio.checked = getPaymentConfig(radio.value).mode === mode;
    });
}

function updateCartCountLocal() {
    const cart = collectSelectedCartItems();
    const count = cart.reduce((sum, it) => sum + (parseInt(it.quantity ?? 1, 10) || 1), 0);

    const counters = Array.from(document.querySelectorAll('[data-cart-count], #cartCount'));
    counters.forEach((el) => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-flex' : 'none';
    });

    if (window.App && typeof window.App.updateCartCount === 'function') {
        try { window.App.updateCartCount(); } catch (e) {}
    }
}

function ensureSingleCartDom() {
    try {
        const primarySidebar = document.getElementById('cartSidebar');
        const primaryOverlay = document.getElementById('cartOverlay');

        document.querySelectorAll('#cartSidebar').forEach((node, idx) => {
            if (idx > 0) node.remove();
        });
        document.querySelectorAll('#cartOverlay').forEach((node, idx) => {
            if (idx > 0) node.remove();
        });

        Array.from(document.querySelectorAll('.cart-sidebar'))
            .filter((node) => node !== primarySidebar)
            .forEach((node) => node.remove());

        Array.from(document.querySelectorAll('.cart-overlay'))
            .filter((node) => node !== primaryOverlay)
            .forEach((node) => node.remove());
    } catch (e) {
        console.warn('ensureSingleCartDom failed', e);
    }
}

function escapeHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderCart() {
    ensureSingleCartDom();

    const sidebar = document.getElementById('cartSidebar');
    if (!sidebar) return;

    const itemsEl = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');
    const subtotalEl = document.getElementById('cartSubtotal');
    const deliveryEl = document.getElementById('cartDelivery');
    const totalEl = document.getElementById('cartTotal');
    const deliveryModeLabelEl = document.getElementById('cartDeliveryModeLabel');
    const paymentModeLabelEl = document.getElementById('cartPaymentModeLabel');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const continueBtn = document.getElementById('continueShopping');

    if (!itemsEl || !emptyEl || !footer) return;

    syncDeliveryRadios();
    syncPaymentRadios();
    const deliveryMode = getDeliveryModeFromRadio();
    const paymentCfg = getPaymentConfig(getPaymentModeFromRadio());

    const items = collectSelectedCartItems();

    if (!items.length) {
        itemsEl.style.display = 'none';
        footer.style.display = 'none';
        emptyEl.style.display = '';
        itemsEl.innerHTML = '';
        if (checkoutBtn) checkoutBtn.disabled = true;
        updateCartCountLocal();
        return;
    }

    emptyEl.style.display = 'none';
    itemsEl.style.display = '';
    footer.style.display = '';
    if (checkoutBtn) checkoutBtn.disabled = false;

    if (continueBtn) continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Poursuivre ma commande';

    itemsEl.innerHTML = items.map((it) => {
        const key = encodeURIComponent(getItemKey(it));
        const qty = parseInt(it.quantity ?? 1, 10) || 1;
        const line = (parseInt(it.price ?? 0, 10) || 0) * qty;
        const sourceLabel = (it.type || '').toLowerCase().includes('menu') ? 'Menu' : 'Produit';
        const imageHtml = renderItemImage(it.image_url, it.name);

        return `
            <article class="cart-item" data-key="${key}">
                <div class="cart-item-left">
                    <div class="cart-item-img-container">
                        ${imageHtml}
                        <span class="cart-item-source">${sourceLabel}</span>
                    </div>
                </div>
                <div class="cart-item-main">
                    <div class="cart-item-title">${escapeHtml(it.name || '')}</div>
                    <div class="cart-item-meta">
                        <span class="cart-item-price">${formatMoney(it.price || 0)}</span>
                        <span class="cart-item-line">${formatMoney(line)}</span>
                    </div>
                    ${it.description ? `<div class="cart-item-description">${escapeHtml(it.description)}</div>` : ''}
                    <div class="cart-item-quantity-display">
                        <span class="cart-item-quantity">Quantité: ${qty}</span>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    const totals = computeTotals(items, deliveryMode);
    if (subtotalEl) subtotalEl.textContent = formatMoney(totals.subtotal);
    if (deliveryEl) deliveryEl.textContent = formatMoney(totals.delivery);
    if (totalEl) totalEl.textContent = formatMoney(totals.total);
    if (deliveryModeLabelEl) deliveryModeLabelEl.textContent = (deliveryMode === 'pickup') ? 'Retrait sur place' : 'Livraison a domicile';
    if (paymentModeLabelEl) paymentModeLabelEl.textContent = paymentCfg.label;

    updateCartCountLocal();
}

function openCart() {
    ensureSingleCartDom();

    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');

    if (sidebar) {
        sidebar.classList.add('open');
        sidebar.setAttribute('aria-hidden', 'false');
    }

    if (overlay) {
        overlay.classList.add('open');
        overlay.classList.add('active');
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
    }

    try { document.body.classList.add('cart-open'); } catch (e) {}
    // Verrouiller le scroll de la page tant que le panier est ouvert
    try {
        if (typeof window.lockPageScroll === 'function') {
            window.lockPageScroll();
        }
    } catch (e) {}
    
    renderCart();
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');

    if (sidebar) {
        sidebar.classList.remove('open');
        sidebar.setAttribute('aria-hidden', 'true');
    }

    if (overlay) {
        overlay.classList.remove('open');
        overlay.classList.remove('active');
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    }

    try { document.body.classList.remove('cart-open'); } catch (e) {}
    // Restaurer le scroll quand le panier se ferme
    try {
        if (typeof window.syncPageScrollLock === 'function') {
            window.syncPageScrollLock();
        } else if (typeof window.unlockPageScroll === 'function') {
            window.unlockPageScroll();
        }
    } catch (e) {}
}

window.openCart = openCart;
window.closeCart = closeCart;
window.renderCart = renderCart;
window.updateCartCountLocal = updateCartCountLocal;

window.addToCart = function (item) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        localStorage.setItem('pending_cart_item', JSON.stringify(item));
        window.location.href = 'login.html?redirect=home&message=connectez-vous pour ajouter au panier';
        return false;
    }

    const it = normalizeCartItem(item);
    if (!it.id) return false;

    const items = collectSelectedCartItems();
    const key = getItemKey(it);
    const idx = items.findIndex((x) => getItemKey(x) === key);
    if (idx >= 0) {
        items[idx].quantity += Math.max(1, parseInt(it.quantity ?? 1, 10) || 1);
    } else {
        items.push(it);
    }

    persistSelectedCartItems(items);
    updateCartCountLocal();
    try { renderCart(); } catch (e) {}

    if (typeof showNotification === 'function') {
        showNotification(`${it.name} ajoute au panier`, 'success');
    }

    return true;
};

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

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
            .notification.show { transform: translateX(0); }
            .notification.success { border-left: 4px solid #28a745; color: #155724; background: #d4edda; }
            .notification.error { border-left: 4px solid #dc3545; color: #721c24; background: #f8d7da; }
            .notification.info { border-left: 4px solid #007bff; color: #004085; background: #cce5ff; }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.showNotification = showNotification;

window.addToCartFromHome = function (idOrItem, product) {
    let item = null;

    if (product && typeof product === 'object') {
        item = product;
    } else if (idOrItem && typeof idOrItem === 'object') {
        item = idOrItem;
    } else if (idOrItem !== null && idOrItem !== undefined && idOrItem !== '') {
        item = { id: idOrItem };
    }

    if (!item) return false;
    return window.addToCart(item);
};

document.addEventListener('tgt:add-to-cart', function (ev) {
    try {
        const product = ev && ev.detail ? ev.detail : null;
        if (!product) return;
        window.addToCartFromHome(product.id || product.product_id || null, product);
    } catch (e) {
        console.error('Erreur handling tgt:add-to-cart', e);
    }
});

async function handleCheckout(checkoutBtn) {
    const cart = collectSelectedCartItems();
    if (!cart.length) {
        showNotification('Ajoutez au moins un article avant de commander.', 'error');
        return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
        closeCart();
        window.location.href = 'login.html?redirect=home&message=connectez-vous pour passer commande';
        return;
    }

    const deliveryMode = getDeliveryModeFromRadio();
    const paymentCfg = getPaymentConfig(getPaymentModeFromRadio());
    localStorage.setItem('delivery_mode', deliveryMode);
    localStorage.setItem('cart_payment_mode', paymentCfg.mode);
    const totals = computeTotals(cart, deliveryMode);
    const deliveryLabel = deliveryMode === 'pickup' ? 'Retrait sur place' : 'Livraison a domicile';

    const orderData = {
        items: cart,
        customizations: {},
        delivery: {
            type: deliveryMode === 'pickup' ? 'pickup' : 'delivery',
            label: deliveryLabel,
            price: totals.delivery
        },
        payment: {
            type: paymentCfg.mode,
            label: paymentCfg.label
        },
        payment_method: paymentCfg.apiMethod,
        contact: {},
        total: totals.total,
        user_token: token
    };

    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

    try {
        const response = await fetch('backend/api/orders/create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const text = await response.text();
        let result = {};
        try {
            result = text ? JSON.parse(text) : {};
        } catch (e) {
            throw new Error('Reponse serveur invalide');
        }

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Erreur lors de la commande');
        }

        persistSelectedCartItems([]);
        localStorage.removeItem('order_cart_items');
        closeCart();
        renderCart();
        showNotification('Commande envoyee avec succes.', 'success');

        const orderId = result.order_id || result.id || (result.order && result.order.id) || '';
        setTimeout(() => {
            window.location.href = `order-confirmation.html${orderId ? `?id=${orderId}` : ''}`;
        }, 900);
    } catch (error) {
        console.error('Erreur commande:', error);
        showNotification('Erreur lors de l envoi de la commande. Veuillez reessayer.', 'error');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<i class="fas fa-lock"></i> Lancer la commande';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.__tgtCartBootstrapped) {
        try { updateCartCountLocal(); } catch (e) {}
        try { renderCart(); } catch (e) {}
        return;
    }
    window.__tgtCartBootstrapped = true;

    ensureSingleCartDom();
    try { updateCartCountLocal(); } catch (e) {}
    try { renderCart(); } catch (e) {}

    const floatingBtn = document.getElementById('cartFloatingBtn');
    if (floatingBtn && floatingBtn.dataset.cartBound !== '1') {
        floatingBtn.dataset.cartBound = '1';
        floatingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    }

    const headerCartButtons = [
        document.getElementById('cartToggleBtn'),
        document.getElementById('cartIcon')
    ].filter(Boolean);

    headerCartButtons.forEach((btn) => {
        if (btn.dataset.cartBound === '1') return;
        btn.dataset.cartBound = '1';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    });

    const closeBtn = document.getElementById('cartClose');
    if (closeBtn && closeBtn.dataset.cartBound !== '1') {
        closeBtn.dataset.cartBound = '1';
        closeBtn.addEventListener('click', closeCart);
    }

    const overlay = document.getElementById('cartOverlay');
    if (overlay && overlay.dataset.cartBound !== '1') {
        overlay.dataset.cartBound = '1';
        overlay.addEventListener('click', closeCart);
    }

    const continueBtn = document.getElementById('continueShopping');
    if (continueBtn && continueBtn.dataset.cartBound !== '1') {
        continueBtn.dataset.cartBound = '1';
        continueBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Poursuivre ma commande';
        continueBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const cart = collectSelectedCartItems();
            if (!cart.length) {
                showNotification('Ajoutez au moins un article avant de commander.', 'error');
                return;
            }
            
            // Sauvegarder les articles du panier pour la page de commande
            localStorage.setItem('order_cart_items', JSON.stringify(cart));
            
            closeCart();
            showNotification('Redirection vers la page de commande...', 'info');
            
            setTimeout(() => {
                window.location.href = 'index.html#order';
            }, 500);
        });
    }

    document.querySelectorAll('input[name="deliveryType"]').forEach((radio) => {
        if (radio.dataset.cartBound === '1') return;
        radio.dataset.cartBound = '1';
        radio.addEventListener('change', () => {
            localStorage.setItem('delivery_mode', radio.value === 'pickup' ? 'pickup' : 'standard');
            renderCart();
        });
    });

    document.querySelectorAll('input[name="cartPaymentType"]').forEach((radio) => {
        if (radio.dataset.cartBound === '1') return;
        radio.dataset.cartBound = '1';
        radio.addEventListener('change', () => {
            const cfg = getPaymentConfig(radio.value);
            localStorage.setItem('cart_payment_mode', cfg.mode);
            renderCart();
        });
    });

    const itemsEl = document.getElementById('cartItems');
    if (itemsEl && itemsEl.dataset.cartBound !== '1') {
        itemsEl.dataset.cartBound = '1';
        itemsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            const row = e.target.closest('.cart-item');
            if (!btn || !row) return;

            const key = decodeURIComponent(row.getAttribute('data-key') || '');
            if (!key) return;

            const action = btn.getAttribute('data-action') || '';
            const items = collectSelectedCartItems();
            const idx = items.findIndex((x) => getItemKey(x) === key);
            if (idx < 0) return;

            const qty = Math.max(1, parseInt(items[idx].quantity ?? 1, 10) || 1);
            if (action === 'inc') items[idx].quantity = qty + 1;
            if (action === 'dec') items[idx].quantity = Math.max(1, qty - 1);
            if (action === 'remove') items.splice(idx, 1);

            persistSelectedCartItems(items);
            renderCart();
        });
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn && checkoutBtn.dataset.cartBound !== '1') {
        checkoutBtn.dataset.cartBound = '1';
        checkoutBtn.innerHTML = '<i class="fas fa-lock"></i> Lancer la commande';
        checkoutBtn.addEventListener('click', () => handleCheckout(checkoutBtn));
    }
});

window.addEventListener('storage', (e) => {
    if (e.key === 'cart' || e.key === 'delivery_mode' || e.key === 'cart_payment_mode') {
        try { updateCartCountLocal(); } catch (err) {}
        try { renderCart(); } catch (err) {}
    }
});



