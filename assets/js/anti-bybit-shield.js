// Script de protection anti-Bybit - Version maximale
// Doit être injecté directement dans le HTML avant tout autre script

(function() {
    'use strict';
    
    // Créer une barrière immédiate contre les erreurs
    const originalError = window.onerror;
    const originalConsoleError = console.error;
    
    // Override de window.onerror - première ligne de défense
    window.onerror = function(message, source, lineno, colno, error) {
        const messageStr = message || '';
        const sourceStr = source || '';
        
        // Filtrer agressivement Bybit et frame_start.js
        if (sourceStr.includes('frame_start.js') || 
            sourceStr.includes('bybit') ||
            messageStr.includes('removeChild') ||
            messageStr.includes('not a child of this node') ||
            messageStr.includes('NotFoundError')) {
            
            console.warn('🛡️ Bybit error blocked:', message);
            return true; // Empêcher la propagation
        }
        
        // Appeler l'original si ce n'est pas une erreur Bybit
        if (originalError) {
            return originalError.call(this, message, source, lineno, colno, error);
        }
        return false;
    };
    
    // Override de console.error pour filtrer les messages Bybit
    console.error = function(...args) {
        const messageStr = args.join(' ').toString();
        
        if (messageStr.includes('frame_start.js') || 
            messageStr.includes('bybit') ||
            messageStr.includes('removeChild') ||
            messageStr.includes('not a child of this node')) {
            console.warn('🛡️ Bybit console.error blocked:', messageStr);
            return;
        }
        
        return originalConsoleError.apply(console, args);
    };
    
    // Protection DOM immédiate
    if (typeof Node !== 'undefined') {
        const originalRemoveChild = Node.prototype.removeChild;
        
        Node.prototype.removeChild = function(child) {
            try {
                if (!child) return child;
                
                // Vérification stricte de la parenté
                if (this && this.contains && !this.contains(child)) {
                    console.warn('🛡️ Invalid removeChild blocked');
                    return child;
                }
                
                return originalRemoveChild.call(this, child);
            } catch (e) {
                if (e.message && e.message.includes('not a child of this node')) {
                    console.warn('🛡️ removeChild error prevented');
                    return child;
                }
                throw e;
            }
        };
    }
    
    // Intercepter les scripts qui pourraient être injectés par Bybit
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    // Vérifier si c'est un script suspect
                    if (node.tagName === 'SCRIPT') {
                        const src = node.src || '';
                        const content = node.textContent || '';
                        
                        if (src.includes('frame_start.js') || 
                            src.includes('bybit') ||
                            content.includes('frame_start') ||
                            content.includes('bybit')) {
                            
                            console.warn('🛡️ Bybit script blocked:', src);
                            try {
                                node.parentNode.removeChild(node);
                            } catch (e) {
                                // Ignorer
                            }
                        }
                    }
                    
                    // Vérifier les attributs suspects
                    if (node.hasAttribute && node.hasAttribute('data-bybit')) {
                        console.warn('🛡️ Bybit element blocked');
                        try {
                            node.parentNode.removeChild(node);
                        } catch (e) {
                            // Ignorer
                        }
                    }
                }
            });
        });
    });
    
    // Démarrer l'observation
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        // Si le body n'est pas encore prêt, attendre
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    
    // Nettoyage immédiat des éléments Bybit existants
    setTimeout(function() {
        try {
            const bybitElements = document.querySelectorAll('[data-bybit], [data-extension], .bybit-extension, script[src*="frame_start"], script[src*="bybit"]');
            bybitElements.forEach(function(el) {
                try {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                } catch (e) {
                    // Ignorer
                }
            });
        } catch (e) {
            // Ignorer
        }
    }, 100);
    
    console.log('🛡️ Anti-Bybit shield activated - Maximum protection');
})();
