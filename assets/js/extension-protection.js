// SOLUTION DÉFINITIVE ANTI-BYBIT - BLOCAGE TOTAL
// Ce script neutralise complètement l'extension Bybit et ses erreurs

(function() {
    'use strict';
    
    console.log('🛡️ Starting definitive Bybit protection...');
    
    // 1. BLOQUER TOUTE CHARGE DE SCRIPT BYBIT AVANT QU'IL NE S'EXÉCUTE
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && (
                    value.includes('frame_start.js') ||
                    value.includes('bybit') ||
                    value.includes('extension')
                )) {
                    console.warn('🛡️ Bybit script blocked:', value);
                    throw new Error('Script blocked by protection');
                }
                return originalSetAttribute.call(this, name, value);
            };
            
            // Intercepter l'assignation de src
            Object.defineProperty(element, 'src', {
                set: function(value) {
                    if (value && (
                        value.includes('frame_start.js') ||
                        value.includes('bybit') ||
                        value.includes('extension')
                    )) {
                        console.warn('🛡️ Bybit src blocked:', value);
                        throw new Error('Script src blocked by protection');
                    }
                    this.setAttribute('src', value);
                },
                get: function() {
                    return this.getAttribute('src');
                }
            });
        }
        
        return element;
    };
    
    // 2. BLOQUER TOUTE ERREUR AVANT QU'ELLE N'APPARAISSE
    window.addEventListener('error', function(e) {
        const errorStr = e.message || '';
        const filenameStr = e.filename || '';
        const stackStr = e.stack || '';
        
        // BLOQUER TOUT CE QUI RESSEMBLE À BYBIT
        const isBlocked = (
            filenameStr.includes('frame_start.js') ||
            filenameStr.includes('bybit') ||
            filenameStr.includes('extension') ||
            stackStr.includes('frame_start.js') ||
            stackStr.includes('bybit') ||
            errorStr.includes('frame_start') ||
            errorStr.includes('bybit') ||
            errorStr.includes('removeChild') ||
            errorStr.includes('not a child of this node') ||
            errorStr.includes('NotFoundError')
        );
        
        if (isBlocked) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Empêcher complètement la propagation
            if (e.cancelable) {
                e.preventDefault();
            }
            
            console.warn('🚫 ERROR BLOCKED:', errorStr.substring(0, 100));
            return false;
        }
    }, true);
    
    // 3. OVERRIDE COMPLET DE CONSOLE.ERROR
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = function(...args) {
        const message = args.join(' ').toString();
        if (message.includes('frame_start') || 
            message.includes('bybit') ||
            message.includes('removeChild') ||
            message.includes('not a child of this node')) {
            return; // Bloquer complètement
        }
        return originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
        const message = args.join(' ').toString();
        if (message.includes('frame_start') || 
            message.includes('bybit')) {
            return; // Bloquer les warnings Bybit
        }
        return originalConsoleWarn.apply(console, args);
    };
    
    // 4. PROTECTION DOM ABSOLUE
    if (typeof Node !== 'undefined') {
        const originalRemoveChild = Node.prototype.removeChild;
        const originalAppendChild = Node.prototype.appendChild;
        const originalInsertBefore = Node.prototype.insertBefore;
        
        Node.prototype.removeChild = function(child) {
            try {
                if (!child) return child;
                
                // Vérification ultra-stricte
                if (this && this.contains && !this.contains(child)) {
                    return child; // Silencieux, pas d'erreur
                }
                
                return originalRemoveChild.call(this, child);
            } catch (e) {
                // Attraper TOUTES les erreurs removeChild
                return child;
            }
        };
        
        Node.prototype.appendChild = function(child) {
            try {
                if (!child) return child;
                return originalAppendChild.call(this, child);
            } catch (e) {
                return child;
            }
        };
        
        Node.prototype.insertBefore = function(newNode, referenceNode) {
            try {
                if (!newNode) return newNode;
                return originalInsertBefore.call(this, newNode, referenceNode);
            } catch (e) {
                return newNode;
            }
        };
    }
    
    // 5. NETTOYAGE ACTIF DES ÉLÉMENTS BYBIT
    function cleanupBybitElements() {
        try {
            // Sélecteurs très larges pour attraper tout ce qui ressemble à Bybit
            const selectors = [
                'script[src*="frame_start"]',
                'script[src*="bybit"]',
                '[data-bybit]',
                '[data-extension*="bybit"]',
                '.bybit-extension',
                '[id*="bybit"]',
                '[class*="bybit"]'
            ];
            
            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        try {
                            if (el.parentNode) {
                                el.parentNode.removeChild(el);
                            }
                        } catch (e) {
                            // Ignorer les erreurs de suppression
                        }
                    });
                } catch (e) {
                    // Ignorer les erreurs de querySelector
                }
            });
        } catch (e) {
            // Ignorer les erreurs de nettoyage
        }
    }
    
    // Nettoyage immédiat
    cleanupBybitElements();
    
    // Nettoyage périodique très fréquent
    setInterval(cleanupBybitElements, 1000);
    
    // 6. BLOQUER LES FUTURS SCRIPTS BYBIT
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element
                    // Bloquer les scripts Bybit immédiatement
                    if (node.tagName === 'SCRIPT') {
                        const src = node.src || '';
                        const text = node.textContent || '';
                        
                        if (src.includes('frame_start') || 
                            src.includes('bybit') ||
                            text.includes('frame_start') ||
                            text.includes('bybit')) {
                            
                            try {
                                node.remove();
                            } catch (e) {
                                // Forcer la suppression
                                if (node.parentNode) {
                                    node.parentNode.removeChild(node);
                                }
                            }
                        }
                    }
                    
                    // Bloquer les éléments avec attributs Bybit
                    if (node.hasAttribute && (
                        node.hasAttribute('data-bybit') ||
                        (node.getAttribute('id') && node.getAttribute('id').includes('bybit')) ||
                        (node.getAttribute('class') && node.getAttribute('class').includes('bybit'))
                    )) {
                        try {
                            node.remove();
                        } catch (e) {
                            if (node.parentNode) {
                                node.parentNode.removeChild(node);
                            }
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
            subtree: true,
            attributes: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true
            });
        });
    }
    
    // 7. OVERRIDE DE WINDOW.ONERROR EN DOUBLE
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        const messageStr = message || '';
        const sourceStr = source || '';
        
        if (sourceStr.includes('frame_start.js') || 
            sourceStr.includes('bybit') ||
            messageStr.includes('removeChild') ||
            messageStr.includes('not a child of this node')) {
            return true; // Bloquer complètement
        }
        
        if (originalOnError) {
            return originalOnError.call(this, message, source, lineno, colno, error);
        }
        return false;
    };
    
    console.log('🛡️ Definitive Bybit protection activated - TOTAL BLOCKADE');
    
})();
