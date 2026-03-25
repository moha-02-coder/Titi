/**
 * Header scroll hide functionality for mobile
 * Titi Golden Taste Restaurant
 */

(function() {
    'use strict';

    let lastScrollTop = 0;
    let scrollThreshold = 100; // Distance to scroll before hiding/showing
    let isHidden = false;
    let scrollTimer = null;
    let isMobile = false;

    // Check if device is mobile
    function checkMobile() {
        isMobile = window.innerWidth <= 768;
        return isMobile;
    }

    // Initialize header scroll behavior
    function initHeaderScroll() {
        const header = document.querySelector('.header');
        if (!header) return;

        // Set initial state
        checkMobile();
        if (isMobile) {
            header.classList.add('header-visible');
        }

        // Handle scroll events
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);
    }

    // Handle scroll events
    function handleScroll() {
        if (!isMobile) return;

        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const header = document.querySelector('.header');
        
        if (!header) return;

        // Clear existing timer
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }

        // Debounce scroll handling
        scrollTimer = setTimeout(() => {
            // Scrolling down
            if (currentScrollTop > lastScrollTop && currentScrollTop > scrollThreshold) {
                if (!isHidden) {
                    header.classList.remove('header-visible');
                    header.classList.add('header-hidden');
                    isHidden = true;
                    
                    // Adjust body padding to account for hidden header
                    document.body.style.paddingTop = '0';
                }
            }
            // Scrolling up or at top
            else if (currentScrollTop < lastScrollTop || currentScrollTop <= 50) {
                if (isHidden) {
                    header.classList.remove('header-hidden');
                    header.classList.add('header-visible');
                    isHidden = false;
                    
                    // Restore body padding
                    const headerHeight = header.offsetHeight;
                    document.body.style.paddingTop = `${headerHeight}px`;
                }
            }

            lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
        }, 10); // Small delay for smooth performance
    }

    // Handle resize events
    function handleResize() {
        const wasMobile = isMobile;
        checkMobile();
        
        const header = document.querySelector('.header');
        if (!header) return;

        // Reset state when switching between mobile and desktop
        if (wasMobile !== isMobile) {
            if (isMobile) {
                header.classList.remove('header-hidden');
                header.classList.add('header-visible');
                isHidden = false;
                
                // Set proper padding for mobile
                const headerHeight = header.offsetHeight;
                document.body.style.paddingTop = `${headerHeight}px`;
            } else {
                // Desktop: always show header
                header.classList.remove('header-hidden');
                header.classList.remove('header-visible');
                isHidden = false;
                
                // Reset padding for desktop
                const headerHeight = header.offsetHeight;
                document.body.style.paddingTop = `${headerHeight}px`;
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderScroll);
    } else {
        initHeaderScroll();
    }

    // Export for potential external use
    window.TitiHeaderScroll = {
        init: initHeaderScroll,
        hide: () => {
            const header = document.querySelector('.header');
            if (header && isMobile && !isHidden) {
                header.classList.remove('header-visible');
                header.classList.add('header-hidden');
                isHidden = true;
                document.body.style.paddingTop = '0';
            }
        },
        show: () => {
            const header = document.querySelector('.header');
            if (header && isMobile && isHidden) {
                header.classList.remove('header-hidden');
                header.classList.add('header-visible');
                isHidden = false;
                const headerHeight = header.offsetHeight;
                document.body.style.paddingTop = `${headerHeight}px`;
            }
        }
    };

})();
