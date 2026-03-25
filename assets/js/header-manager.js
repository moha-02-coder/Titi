/**
 * Script pour la gestion améliorée du header
 * Cache le header au défilement et lors de l'ouverture du panier
 */

function getPageContext() {
    const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
    const file = path.split('/').pop() || '';
    if (file.includes('boutique')) return 'boutique';
    if (file.includes('index') || file === '' || file === 'titi') return 'restaurant';
    // fallback: use hash/ids
    if (document.getElementById('shop') || document.getElementById('productsContainer')) return 'boutique';
    return 'restaurant';
}

function buildNotificationModal() {
    return `
        <div class="modal notification-modal" id="notificationModal" aria-hidden="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-bell"></i> Notifications</h3>
                    <button class="modal-close" id="notificationModalClose" type="button" aria-label="Fermer les notifications">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="notification-role" id="notificationRoleLabel"></div>
                    <div class="notification-list" id="notificationList"></div>
                    <div class="notification-empty" id="notificationEmpty" style="display: none;">
                        <i class="fas fa-bell-slash"></i>
                        <p>Aucune notification pour le moment.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function buildSharedHeader(context) {
    const isRestaurant = context === 'restaurant';
    const isBoutique = context === 'boutique';

    const menuNavItem = isRestaurant
        ? ''
        : `<li><a href="index.html#menu" class="nav-link"><i class="fas fa-utensils"></i> Menu</a></li>`;

    const shopNavItem = isBoutique
        ? ''
        : `
                        <li class="shop-dropdown">
                            <a class="shop-btn ${isBoutique ? 'active' : ''}" id="shopDropdownBtn" href="boutique.html">
                                <i class="fas fa-store"></i>
                                <span>Boutique</span>
                            </a>
                            <div class="shop-dropdown-menu" id="shopDropdownMenu" role="menu" aria-hidden="true">
                                <a class="shop-dropdown-item" href="boutique.html" role="menuitem">
                                    <i class="fas fa-store"></i> Voir la boutique
                                </a>
                                <div class="shop-dropdown-divider"></div>
                                <a class="shop-dropdown-item" href="index.html#featured-products" role="menuitem">
                                    <i class="fas fa-star"></i> Produits en vedette
                                </a>
                            </div>
                        </li>`;

    return `
        <div class="container">
            <div class="header-content">
                <div class="logo-container">
                    <h1 class="logo">Titi Golden Taste</h1>
                    <p class="slogan">${isBoutique ? "Boutique & Produits africains" : "L'excellence culinaire malienne"}</p>
                </div>
                <nav class="nav">
                    <ul>
                        <li><a href="index.html" class="nav-link ${isRestaurant ? 'active' : ''}"><i class="fas fa-home"></i> Accueil</a></li>
                        ${menuNavItem}
                        ${shopNavItem}
                        <li><a href="index.html#order" class="nav-link"><i class="fas fa-shopping-cart"></i> Commander</a></li>
                        <li><a href="index.html#location" class="nav-link"><i class="fas fa-map-marker-alt"></i> Nous trouver</a></li>
                        <li><a href="index.html#contact" class="nav-link"><i class="fas fa-phone"></i> Contact</a></li>
                        <li class="nav-profile">
                            <button class="profile-toggle-btn" id="profileToggleBtn" type="button" aria-label="Mon profil" aria-haspopup="menu" aria-controls="profileDropdownMenu" aria-expanded="false">
                                <i class="fas fa-user-circle"></i>
                                <span class="profile-name" id="profileName">Mon compte</span>
                            </button>
                            <div class="profile-dropdown-menu" id="profileDropdownMenu" role="menu" aria-hidden="true">
                                <div class="profile-header">
                                    <div class="profile-avatar">
                                        <i class="fas fa-user-circle"></i>
                                    </div>
                                    <div class="profile-info">
                                        <div class="profile-name-display" id="profileNameDisplay">Invite</div>
                                        <div class="profile-email" id="profileEmail">non connecte</div>
                                    </div>
                                </div>
                                <div class="profile-dropdown-divider"></div>
                                <a class="profile-dropdown-item dashboard-link" href="admin/dashboard.html" id="dashboardLink" role="menuitem" style="display: none;">
                                    <i class="fas fa-tachometer-alt"></i> Tableau de bord
                                </a>
                                <a class="profile-dropdown-item" href="profile.html" id="profileLink" role="menuitem" style="display: none;">
                                    <i class="fas fa-user"></i> Mon profil
                                </a>
                                <a class="profile-dropdown-item" href="orders.html" id="ordersLink" role="menuitem" style="display: none;">
                                    <i class="fas fa-clipboard-list"></i> Mes commandes
                                </a>
                                <div class="profile-dropdown-divider"></div>
                                <a class="profile-dropdown-item" href="#" id="logoutLink" role="menuitem" style="display: none;">
                                    <i class="fas fa-sign-out-alt"></i> Deconnexion
                                </a>
                                <a class="profile-dropdown-item" href="login.html" id="loginLink" role="menuitem">
                                    <i class="fas fa-sign-in-alt"></i> Connexion
                                </a>
                                <a class="profile-dropdown-item" href="register.html" id="registerLink" role="menuitem">
                                    <i class="fas fa-user-plus"></i> Inscription
                                </a>
                            </div>
                        </li>
                        <li class="nav-notifications">
                            <button class="notif-toggle-btn nav-icon-btn" id="notificationToggleBtn" type="button" aria-haspopup="dialog" aria-controls="notificationModal" aria-expanded="false">
                                <i class="fas fa-bell"></i>
                                <span class="notif-count" id="notificationCount" data-notification-count style="display: none;">0</span>
                            </button>
                        </li>
                        <li class="nav-cart">
                            <button class="cart-toggle-btn nav-icon-btn" id="cartToggleBtn" type="button" aria-label="Ouvrir le panier">
                                <i class="fas fa-shopping-basket"></i>
                                <span class="cart-count" id="cartCount" data-cart-count>0</span>
                            </button>
                        </li>
                    </ul>
                </nav>
                <button class="mobile-menu-btn" id="mobileMenuBtn" type="button" aria-label="Menu">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </div>
    `;
}

function buildSharedFooter() {
    const year = new Date().getFullYear();
    return `
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h3>Titi Golden Taste</h3>
                    <p class="footer-description">
                        Restaurant premium et boutique specialises dans la cuisine et les produits maliens authentiques.
                    </p>
                    <p class="footer-brand-line">Saveurs africaines, service moderne, qualite constante.</p>
                    <div class="footer-social">
                        <a class="social-link" href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a class="social-link" href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                        <a class="social-link" href="#" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
                        <a class="social-link" href="#" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    </div>
                </div>

                <div class="footer-col">
                    <h4>Liens rapides</h4>
                    <ul class="footer-links">
                        <li><a href="index.html">Accueil</a></li>
                        <li><a href="index.html#menu">Notre menu</a></li>
                        <li><a href="boutique.html">Boutique</a></li>
                        <li><a href="index.html#order">Commander</a></li>
                        <li><a href="index.html#location">Nous trouver</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h4>Infos pratiques</h4>
                    <ul class="footer-contact-list">
                        <li><i class="fas fa-map-marker-alt"></i> Badalabougou, Bamako</li>
                        <li><i class="fas fa-phone"></i> +223 76 01 23 45</li>
                        <li><i class="fas fa-envelope"></i> contact@titigoldentaste.com</li>
                    </ul>
                    <div class="footer-hours">
                        <strong>Horaires</strong>
                        <span>Lun - Sam: 10h00 - 22h00</span>
                        <span>Dim: 12h00 - 20h00</span>
                    </div>
                </div>

                <div class="footer-col">
                    <h4>Newsletter</h4>
                    <p class="footer-description">Recevez nos offres speciales et nouveautes chaque semaine.</p>
                    <form class="newsletter-form" onsubmit="event.preventDefault();">
                        <input type="email" placeholder="Votre email" aria-label="Votre email">
                        <button type="submit" class="btn">OK</button>
                    </form>
                    <p class="footer-note">Paiement securise, livraison rapide, support 7j/7.</p>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="footer-bottom-content">
                    <p class="copyright">&copy; ${year} Titi Golden Taste, Bamako - Mali. Tous droits reserves.</p>
                    <div class="footer-legal">
                        <a href="#">CGU</a>
                        <a href="#">Confidentialite</a>
                        <a href="#">Mentions legales</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function ensureNotificationModal() {
    if (document.getElementById('notificationModal')) return;
    const host = document.createElement('div');
    host.innerHTML = buildNotificationModal().trim();
    const modal = host.firstElementChild;
    if (modal) document.body.appendChild(modal);
}

function injectSharedHeaderFooter() {
    try {
        if (window.__tgtSharedHeaderFooterInjected) {
            return;
        }
        const header = document.querySelector('header.header');
        const footer = document.querySelector('footer.footer');
        if (!header && !footer) return;

        const ctx = getPageContext();

        if (header) {
            header.innerHTML = buildSharedHeader(ctx);
        }
        if (footer) {
            footer.innerHTML = buildSharedFooter();
        }
        ensureNotificationModal();

        try { window.__tgtSharedHeaderFooterInjected = true; } catch (e) {}
    } catch (e) {
        // Keep silent to not break page
    }
}

function scrollToHashTarget() {
    try {
        const hash = (window.location && window.location.hash) ? window.location.hash : '';
        if (!hash || hash.length < 2) return;
        const id = hash.slice(1);
        const target = document.getElementById(id);
        if (!target) return;

        const header = document.querySelector('.header');
        const headerH = header ? header.offsetHeight : 0;

        const top = target.getBoundingClientRect().top + window.pageYOffset - Math.max(0, headerH) - 10;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } catch (e) {
        // ignore
    }
}

function adaptMobileNav(context) {
    try {
        const isRestaurant = context === 'restaurant';
        const isBoutique = context === 'boutique';
        const mobileNav = document.getElementById('mobileNav');
        if (!mobileNav) return;
        const links = Array.from(mobileNav.querySelectorAll('a.mobile-nav-link'));
        links.forEach((a) => {
            const href = (a.getAttribute('href') || '').toLowerCase();
            if (isRestaurant && href.includes('#menu')) {
                a.style.display = 'none';
            }
            if (isBoutique && href.includes('boutique.html')) {
                a.style.display = 'none';
            }
        });
    } catch (e) {
        // ignore
    }
}

class HeaderManager {
    constructor() {
        this.header = null;
        this.lastScrollY = 0;
        this.scrollThreshold = 100;
        this.isCartOpen = false;
        this.ticks = false;
        this.init();
    }

    init() {
        this.header = document.querySelector('.header');
        if (!this.header) return;

        this.setupScrollListener();
        this.setupCartListener();
        this.setupResizeListener();
        this.setupDropdowns();
        
        // Initialiser l'état du header
        this.updateHeaderState();
    }

    setupScrollListener() {
        // Utiliser requestAnimationFrame pour optimiser les performances
        window.addEventListener('scroll', () => {
            if (!this.ticks) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    this.ticks = false;
                });
                this.ticks = true;
            }
        }, { passive: true });
    }

    setupCartListener() {
        // Écouter l'ouverture/fermeture du panier
        const cartObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const cartSidebar = document.querySelector('.cart-sidebar');
                    if (cartSidebar) {
                        this.isCartOpen = cartSidebar.classList.contains('open');
                        this.updateCartState();
                    }
                }
            });
        });

        // Observer le panier
        const cartSidebar = document.querySelector('.cart-sidebar');
        if (cartSidebar) {
            cartObserver.observe(cartSidebar, { attributes: true });
        }

        // Écouter les clics sur les boutons panier
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cart-floating-btn') || 
                e.target.closest('.cart-toggle') ||
                e.target.closest('[onclick*="cart"]')) {
                // Attendre un peu que le panier s'ouvre
                setTimeout(() => {
                    const cartSidebar = document.querySelector('.cart-sidebar');
                    this.isCartOpen = cartSidebar && cartSidebar.classList.contains('open');
                    this.updateCartState();
                }, 100);
            }
        });
    }

    setupResizeListener() {
        // Ajuster le padding du body lors du redimensionnement
        window.addEventListener('resize', () => {
            this.updateBodyPadding();
        });
    }

    setupDropdowns() {
        this.setupProfileDropdown();
        this.setupShopDropdown();
        this.setupNotificationDropdown();
    }

    setupProfileDropdown() {
        const profileBtn = document.getElementById('profileToggleBtn');
        const profileMenu = document.getElementById('profileDropdownMenu');
        if (!profileBtn || !profileMenu) return;

        const closeProfile = () => {
            profileMenu.classList.remove('show');
            profileMenu.setAttribute('aria-hidden', 'true');
            profileBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('dropdown-open');
        };

        const openProfile = () => {
            profileMenu.classList.add('show');
            profileMenu.setAttribute('aria-hidden', 'false');
            profileBtn.setAttribute('aria-expanded', 'true');
            document.body.classList.add('dropdown-open');
        };

        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (profileMenu.classList.contains('show')) closeProfile();
            else openProfile();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-profile')) closeProfile();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeProfile();
        });

        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    localStorage.removeItem('user_role');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('token_expiry');
                } catch (err) {}
                closeProfile();
                window.location.href = 'login.html';
            });
        }

        this.syncProfileState();
        window.addEventListener('storage', () => this.syncProfileState());
    }

    setupShopDropdown() {
        const shopBtn = document.getElementById('shopDropdownBtn');
        const shopMenu = document.getElementById('shopDropdownMenu');
        if (!shopBtn || !shopMenu) return;

        const closeShop = () => {
            shopMenu.classList.remove('open');
            shopMenu.setAttribute('aria-hidden', 'true');
            shopBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('dropdown-open');
        };

        const openShop = () => {
            shopMenu.classList.add('open');
            shopMenu.setAttribute('aria-hidden', 'false');
            shopBtn.setAttribute('aria-expanded', 'true');
            document.body.classList.add('dropdown-open');
        };

        shopBtn.addEventListener('click', (e) => {
            if (!shopBtn.classList.contains('active')) return;
            e.preventDefault();
            e.stopPropagation();
            if (shopMenu.classList.contains('open')) closeShop();
            else openShop();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.shop-dropdown')) closeShop();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeShop();
        });
    }

    setupNotificationDropdown() {
        const notifBtn = document.getElementById('notificationToggleBtn');
        const notifModal = document.getElementById('notificationModal');
        const notifCloseBtn = document.getElementById('notificationModalClose');
        if (!notifBtn || !notifModal) return;

        const closeNotif = () => {
            notifModal.classList.remove('show');
            notifModal.setAttribute('aria-hidden', 'true');
            notifBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('dropdown-open');

            try {
                if (typeof window.syncPageScrollLock === 'function') window.syncPageScrollLock();
                else if (typeof window.unlockPageScroll === 'function') window.unlockPageScroll();
            } catch (e) {}
        };

        const openNotif = () => {
            notifModal.classList.add('show');
            notifModal.setAttribute('aria-hidden', 'false');
            notifBtn.setAttribute('aria-expanded', 'true');
            document.body.classList.add('dropdown-open');
        };

        notifBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (notifModal.classList.contains('show')) closeNotif();
            else openNotif();
        });

        if (notifCloseBtn) {
            notifCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeNotif();
            });
        }
    }

    syncProfileState() {
        const profileName = document.getElementById('profileName');
        const profileNameDisplay = document.getElementById('profileNameDisplay');
        const profileEmail = document.getElementById('profileEmail');
        const dashboardLink = document.getElementById('dashboardLink');
        const profileLink = document.getElementById('profileLink');
        const ordersLink = document.getElementById('ordersLink');
        const logoutLink = document.getElementById('logoutLink');
        const loginLink = document.getElementById('loginLink');
        const registerLink = document.getElementById('registerLink');

        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('user_data') || 'null');
        } catch (e) {
            user = null;
        }

        const isLoggedIn = !!localStorage.getItem('auth_token');
        const fullName = user
            ? (user.name || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim())
            : '';
        const displayName = fullName || 'Mon compte';
        const email = user ? (user.email || 'Connecte') : 'non connecte';
        const role = String((user && user.role) || localStorage.getItem('user_role') || '').toLowerCase();
        const canAccessDashboard = role === 'admin' || role === 'super_admin' || role === 'livreur' || role === 'delivery';
        const dashboardHref = (role === 'livreur' || role === 'delivery') ? 'delivery/dashboard.html' : 'admin/dashboard.html';

        if (profileName) profileName.textContent = displayName;
        if (profileNameDisplay) profileNameDisplay.textContent = displayName || 'Invite';
        if (profileEmail) profileEmail.textContent = email;

        if (dashboardLink) {
            dashboardLink.style.display = (isLoggedIn && canAccessDashboard) ? '' : 'none';
            dashboardLink.href = dashboardHref;
        }
        if (profileLink) profileLink.style.display = isLoggedIn ? '' : 'none';
        if (ordersLink) ordersLink.style.display = isLoggedIn ? '' : 'none';
        if (logoutLink) logoutLink.style.display = isLoggedIn ? '' : 'none';
        if (loginLink) loginLink.style.display = isLoggedIn ? 'none' : '';
        if (registerLink) registerLink.style.display = isLoggedIn ? 'none' : '';
    }

    handleScroll() {
        const currentScrollY = window.scrollY;
        const headerHeight = this.header.offsetHeight;

        // Déterminer la direction du scroll
        const scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';
        const scrollDistance = Math.abs(currentScrollY - this.lastScrollY);

        // Ne réagir que si le scroll est significatif
        if (scrollDistance < 5) {
            this.lastScrollY = currentScrollY;
            return;
        }

        // Logique de cache/affichage du header
        if (scrollDirection === 'down' && currentScrollY > this.scrollThreshold) {
            // Scroll vers le bas - cacher le header
            if (!this.isCartOpen) {
                this.hideHeader();
            }
        } else if (scrollDirection === 'up') {
            // Scroll vers le haut - montrer le header
            this.showHeader();
        }

        // Gérer l'état quand on est en haut de page
        if (currentScrollY <= 10) {
            this.showHeader();
        }

        this.lastScrollY = currentScrollY;
        this.updateBodyPadding();
    }

    hideHeader() {
        if (this.header && !this.header.classList.contains('header-hidden')) {
            this.header.classList.remove('header-visible');
            this.header.classList.add('header-hidden');
            
            // Ajouter la classe au body pour le CSS
            document.body.classList.add('header-hidden');
            document.body.classList.remove('header-visible');
        }
    }

    showHeader() {
        if (this.header && !this.header.classList.contains('header-visible')) {
            this.header.classList.remove('header-hidden');
            this.header.classList.add('header-visible');
            
            // Ajouter la classe au body pour le CSS
            document.body.classList.remove('header-hidden');
            document.body.classList.add('header-visible');
        }
    }

    updateCartState() {
        if (this.isCartOpen) {
            // Cacher le header quand le panier est ouvert
            document.body.classList.add('cart-open');
            this.hideHeader();
        } else {
            // Restaurer l'état normal du header
            document.body.classList.remove('cart-open');
            this.handleScroll(); // Recalculer l'état du header
        }
    }

    updateHeaderState() {
        // Initialiser l'état visible au chargement
        this.header.classList.add('header-visible');
        document.body.classList.add('header-visible');
        this.updateBodyPadding();
    }

    updateBodyPadding() {
        const headerHeight = this.header ? this.header.offsetHeight : 110;
        const isHidden = this.header && this.header.classList.contains('header-hidden');
        
        if (isHidden) {
            document.body.style.paddingTop = '0';
        } else {
            document.body.style.paddingTop = `${headerHeight}px`;
        }
    }

    // Méthodes publiques pour contrôler manuellement le header
    forceHide() {
        this.hideHeader();
    }

    forceShow() {
        this.showHeader();
    }

    toggle() {
        if (this.header.classList.contains('header-hidden')) {
            this.showHeader();
        } else {
            this.hideHeader();
        }
    }
}

// Gestion améliorée du dropdown du profil


// Gestion du dropdown Shop


document.addEventListener('DOMContentLoaded', function() {
    // Inject shared header/footer before wiring managers
    injectSharedHeaderFooter();

    try {
        const ctx = getPageContext();
        adaptMobileNav(ctx);
    } catch (e) {}

    // Initialiser le header manager
    window.headerManager = new HeaderManager();

    // Ensure hash scroll happens after header injection + body padding adjustments
    setTimeout(() => {
        scrollToHashTarget();
    }, 60);
    
    // Initialiser le dropdown manager
    // les dropdown sont désormais gérés globalement par app.js
    // window.profileDropdown = new ProfileDropdownManager();
    // window.shopDropdown = new ShopDropdownManager();

    // Gestionnaire global pour fermer tous les dropdowns
    document.addEventListener('click', function(e) {
        const isClickInsideDropdown = e.target.closest('.nav-profile') || 
                                      e.target.closest('.shop-dropdown') || 
                                      e.target.closest('.nav-notifications') ||
                                      e.target.closest('.notification-modal') ||
                                      e.target.closest('.profile-dropdown-menu') ||
                                      e.target.closest('.shop-dropdown-menu');
        
        if (!isClickInsideDropdown) {
            // Fermer tous les dropdowns
            document.body.classList.remove('dropdown-open');
            
            // Fermer le dropdown profil
            const profileMenu = document.getElementById('profileDropdownMenu');
            if (profileMenu) {
                profileMenu.classList.remove('show');
                profileMenu.setAttribute('aria-hidden', 'true');
                const profileBtn = document.getElementById('profileToggleBtn');
                if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
            }
            
            // Fermer le dropdown shop
            const shopMenu = document.getElementById('shopDropdownMenu');
            if (shopMenu) {
                shopMenu.classList.remove('open');
                shopMenu.setAttribute('aria-hidden', 'true');
                const shopBtn = document.getElementById('shopDropdownBtn');
                if (shopBtn) shopBtn.setAttribute('aria-expanded', 'false');
            }
            
            // Fermer le modal notifications
            const notifModal = document.getElementById('notificationModal');
            if (notifModal) {
                notifModal.classList.remove('show');
                notifModal.setAttribute('aria-hidden', 'true');
                const notifBtn = document.getElementById('notificationToggleBtn');

                try {
                    if (typeof window.syncPageScrollLock === 'function') window.syncPageScrollLock();
                    else if (typeof window.unlockPageScroll === 'function') window.unlockPageScroll();
                } catch (e) {}
                if (notifBtn) notifBtn.setAttribute('aria-expanded', 'false');
            }
            
            // Restaurer l'état du scroll après fermeture
            setTimeout(() => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.height = '';
            }, 50);
        }
    });

    // Gestionnaire pour la touche Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Forcer la fermeture de tous les dropdowns
            document.body.classList.remove('dropdown-open');
            
            // Fermer tous les dropdowns avec Escape
            const profileMenu = document.getElementById('profileDropdownMenu');
            if (profileMenu && profileMenu.classList.contains('show')) {
                profileMenu.classList.remove('show');
                profileMenu.setAttribute('aria-hidden', 'true');
                const profileBtn = document.getElementById('profileToggleBtn');
                if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
            }
            
            const shopMenu = document.getElementById('shopDropdownMenu');
            if (shopMenu && shopMenu.classList.contains('open')) {
                shopMenu.classList.remove('open');
                shopMenu.setAttribute('aria-hidden', 'true');
                const shopBtn = document.getElementById('shopDropdownBtn');
                if (shopBtn) shopBtn.setAttribute('aria-expanded', 'false');
            }
            
            const notifModal = document.getElementById('notificationModal');
            if (notifModal && notifModal.classList.contains('show')) {
                notifModal.classList.remove('show');
                notifModal.setAttribute('aria-hidden', 'true');
                const notifBtn = document.getElementById('notificationToggleBtn');
                if (notifBtn) notifBtn.setAttribute('aria-expanded', 'false');
            }
            
            // Restaurer l'état du scroll après fermeture
            setTimeout(() => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.height = '';
            }, 50);
        }
    });
    
    // Exposer les méthodes globalement si nécessaire
    window.toggleHeader = () => window.headerManager.toggle();
    window.hideHeader = () => window.headerManager.forceHide();
    window.showHeader = () => window.headerManager.forceShow();
});

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HeaderManager };
}


