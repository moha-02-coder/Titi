/* Central config for front-end globals
   - Prevents redeclaration of API base URLs
   - Must be included before other scripts in HTML
*/
(function (w) {
    w.API_BASE_URL = w.API_BASE_URL || 'backend/api';
    w.ORDER_API_BASE_URL = w.ORDER_API_BASE_URL || (w.API_BASE_URL + '/orders');
    w.ASSETS_BASE_URL = w.ASSETS_BASE_URL || '/assets';
    // Expose a normalized default image path with proper base URL resolution
    w.DEFAULT_IMAGE = (w.ASSETS_BASE_URL || '/assets') + '/images/default.jpg';
    // Centralized DOM selectors and helpers for multi-page compatibility
    w.DOM_SELECTORS = w.DOM_SELECTORS || {
        headerContainer: '.header .container',
        nav: '.nav',
        cartIcon: '#cartIcon',
        cartCount: '#cartCount',
        menuContainerIds: ['menu-container','menuContainer','menu-of-the-day','menuSelection','menuSelectionGrid','menu-of-the-day','menuSelectionGrid','menuContainer'],
        productsContainerIds: ['products-container','productsContainer','productsSelection','productsSelectionGrid','products']
    };

    w.$find = function(idsOrSelector) {
        // Accept either a string selector or array of ids
        if (!idsOrSelector) return null;
        if (typeof idsOrSelector === 'string') return document.querySelector(idsOrSelector);
        if (Array.isArray(idsOrSelector)) {
            for (let id of idsOrSelector) {
                // Try id first
                let el = document.getElementById(id);
                if (el) return el;
                // Then try as selector
                el = document.querySelector(id);
                if (el) return el;
            }
        }
        return null;
    };
    // Freeze to avoid accidental overwrite
    try { Object.defineProperty(w, 'API_BASE_URL', { writable: false }); } catch (e) {}
})(window);

// Minimal global LoadingSystem used by various pages/components
(function (w) {
    if (w.LoadingSystem) return;

    class SimpleLoadingSystem {
        constructor() {
            this.el = null;
        }

        _ensure() {
            if (this.el) return;
            const div = document.createElement('div');
            div.id = 'tgt-loading-overlay';
            div.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:20000;';
            div.innerHTML = '<div style="background:#fff;padding:18px 22px;border-radius:12px;display:flex;gap:12px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,0.25);"><div class="spinner small" style="width:28px;height:28px;border-radius:50%;border:4px solid #eee;border-top-color: #D4AF37;animation:spin 1s linear infinite"></div><div id="tgt-loading-msg" style="font-weight:600;color:#111;">Chargement...</div></div>';
            document.body.appendChild(div);
            this.el = div;
            const style = document.createElement('style');
            style.textContent = '@keyframes spin {to {transform:rotate(360deg)}}';
            document.head.appendChild(style);
        }

        show(message = 'Chargement...') {
            try {
                this._ensure();
                const msg = this.el.querySelector('#tgt-loading-msg');
                if (msg) msg.textContent = message;
                this.el.style.display = 'flex';
            } catch (e) { console.warn('LoadingSystem.show failed', e); }
        }

        hide() {
            try { if (this.el) this.el.style.display = 'none'; } catch (e) { /* noop */ }
        }
    }

    try { Object.defineProperty(w, 'LoadingSystem', { value: new SimpleLoadingSystem(), writable: false }); } catch (e) { w.LoadingSystem = new SimpleLoadingSystem(); }
})(window);
