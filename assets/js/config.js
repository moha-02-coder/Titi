/* Central config for front-end globals
   - Prevents redeclaration of API base URLs
   - Must be included before other scripts in HTML
*/
(function (w) {
    w.API_BASE_URL = w.API_BASE_URL || 'backend/api';
    w.ORDER_API_BASE_URL = w.ORDER_API_BASE_URL || (w.API_BASE_URL + '/orders');
    w.ASSETS_BASE_URL = w.ASSETS_BASE_URL || '/assets';
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
