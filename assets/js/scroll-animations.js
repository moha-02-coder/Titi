// Script d'animation dorée au scroll optimisé pour performances maximales
document.addEventListener('DOMContentLoaded', function() {
    // Configuration optimisée de l'observateur
    const observerOptions = {
        root: null,
        rootMargin: '50px', // Marge pour déclenchement anticipé
        threshold: 0.05 // Seuil plus bas pour déclenchement plus rapide
    };

    // Observateur optimisé avec throttling
    let ticking = false;
    const observer = new IntersectionObserver(function(entries) {
        if (!ticking) {
            requestAnimationFrame(function() {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.classList.contains('scroll-animate')) {
                        // Ajouter la classe d'animation
                        entry.target.classList.add('scroll-animate');
                        
                        // Animation immédiate optimisée
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
                ticking = false;
            });
            ticking = true;
        }
    }, observerOptions);

    // Observer les éléments avec debounce
    let observeTimeout;
    function observeElements() {
        clearTimeout(observeTimeout);
        observeTimeout = setTimeout(() => {
            const menuItems = document.querySelectorAll('.menu-item:not(.scroll-animate), .product-card:not(.scroll-animate)');
            
            menuItems.forEach(item => {
                // État initial optimisé
                item.style.opacity = '0';
                item.style.transform = 'translateY(10px)'; // Moins de translation
                item.style.transition = 'all 0.3s ease'; // Plus rapide
                
                // Observer l'élément
                observer.observe(item);
            });
        }, 100); // Debounce de 100ms
    }

    // Initialisation immédiate
    observeElements();

    // Ré-observer moins fréquemment pour performances
    const observeInterval = setInterval(observeElements, 3000);

    // Nettoyer l'intervalle après 30 secondes
    setTimeout(() => {
        clearInterval(observeInterval);
    }, 30000);

    // Animation des bordures dorées simplifiée
    function animateBorders() {
        const animatedElements = document.querySelectorAll('.scroll-animate:not(.border-animated)');
        
        animatedElements.forEach(element => {
            if (!element.querySelector('.border-glow')) {
                const glow = document.createElement('div');
                glow.className = 'border-glow';
                glow.style.cssText = `
                    position: absolute;
                    top: -1px;
                    left: -1px;
                    right: -1px;
                    bottom: -1px;
                    border-radius: 15px;
                    background: linear-gradient(45deg, 
                        transparent 30%, 
                        rgba(212, 175, 55, 0.5) 50%, 
                        transparent 70%
                    );
                    z-index: -1;
                    animation: borderGlowMove 2s linear infinite;
                    pointer-events: none;
                `;
                element.style.position = 'relative';
                element.appendChild(glow);
                element.classList.add('border-animated');
            }
        });
    }

    // Animation CSS optimisée
    const style = document.createElement('style');
    style.textContent = `
        @keyframes borderGlowMove {
            0% {
                transform: rotate(0deg) scale(1);
                opacity: 0.4;
            }
            50% {
                transform: rotate(180deg) scale(1.05);
                opacity: 0.8;
            }
            100% {
                transform: rotate(360deg) scale(1);
                opacity: 0.4;
            }
        }
        
        /* Optimisations GPU */
        .menu-item, .product-card {
            transform: translateZ(0);
            backface-visibility: hidden;
            perspective: 1000px;
        }
        
        .scroll-animate {
            will-change: transform, opacity;
        }
    `;
    document.head.appendChild(style);

    // Animation des bordures avec intervalle plus long
    const borderInterval = setInterval(animateBorders, 1000);

    // Nettoyer après 20 secondes
    setTimeout(() => {
        clearInterval(borderInterval);
    }, 20000);

    // Nettoyage des observateurs
    document.addEventListener('beforeunload', function() {
        observer.disconnect();
        clearInterval(observeInterval);
        clearInterval(borderInterval);
    });

    console.log('⚡ Animation dorée optimisée activée');
});
