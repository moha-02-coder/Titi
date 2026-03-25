/**
 * Titi Golden Taste - Main JavaScript File
 * Centralisation de tout le JavaScript frontend
 * Version: 1.0.0
 */

(function() {
    'use strict';

    // Configuration globale
    window.TitiConfig = {
        apiBaseUrl: window.API_BASE_URL || 'backend/api',
        assetsUrl: 'assets',
        version: '1.0.0'
    };

    // État global de l'application
    window.TitiState = {
        cart: [],
        user: null,
        notifications: [],
        modals: {
            profile: false,
            cart: false,
            login: false
        }
    };

    // Classes utilitaires
    class Utils {
        static debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        static formatPrice(price) {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF',
                minimumFractionDigits: 0
            }).format(price);
        }

        static showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        static validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        static sanitizeString(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    }

    // Gestionnaire de dropdowns unifié
    class DropdownManager {
        constructor() {
            this.dropdowns = new Map();
            this.init();
        }

        init() {
            document.addEventListener('click', this.handleOutsideClick.bind(this));
            document.addEventListener('keydown', this.handleEscape.bind(this));
        }

        register(id, toggleBtn, menu) {
            this.dropdowns.set(id, { toggleBtn, menu, isOpen: false });
            
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle(id);
            });
        }

        toggle(id) {
            const dropdown = this.dropdowns.get(id);
            if (!dropdown) return;

            // Fermer tous les autres dropdowns
            this.dropdowns.forEach((other, otherId) => {
                if (otherId !== id && other.isOpen) {
                    this.close(otherId);
                }
            });

            if (dropdown.isOpen) {
                this.close(id);
            } else {
                this.open(id);
            }
        }

        open(id) {
            const dropdown = this.dropdowns.get(id);
            if (!dropdown) return;

            dropdown.menu.classList.add('show');
            dropdown.menu.setAttribute('aria-hidden', 'false');
            dropdown.toggleBtn.classList.add('active');
            dropdown.isOpen = true;
            
            // Ajouter la classe au body
            document.body.classList.add('dropdown-open');
        }

        close(id) {
            const dropdown = this.dropdowns.get(id);
            if (!dropdown) return;

            dropdown.menu.classList.remove('show');
            dropdown.menu.setAttribute('aria-hidden', 'true');
            dropdown.toggleBtn.classList.remove('active');
            dropdown.isOpen = false;
            
            // Retirer la classe si aucun dropdown n'est ouvert
            const hasOpenDropdown = Array.from(this.dropdowns.values()).some(d => d.isOpen);
            if (!hasOpenDropdown) {
                document.body.classList.remove('dropdown-open');
            }
        }

        handleOutsideClick(e) {
            const clickedInside = Array.from(this.dropdowns.values()).some(dropdown => {
                return dropdown.toggleBtn.contains(e.target) || dropdown.menu.contains(e.target);
            });

            if (!clickedInside) {
                this.dropdowns.forEach((dropdown, id) => {
                    if (dropdown.isOpen) {
                        this.close(id);
                    }
                });
            }
        }

        handleEscape(e) {
            if (e.key === 'Escape') {
                this.dropdowns.forEach((dropdown, id) => {
                    if (dropdown.isOpen) {
                        this.close(id);
                    }
                });
            }
        }
    }

    // Gestionnaire de modaux
    class ModalManager {
        constructor() {
            this.modals = new Map();
            this.init();
        }

        init() {
            document.addEventListener('keydown', this.handleEscape.bind(this));
        }

        register(id, modal, closeBtn) {
            this.modals.set(id, { modal, closeBtn, isOpen: false });
            
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close(id);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close(id);
                }
            });
        }

        open(id) {
            const modalData = this.modals.get(id);
            if (!modalData || modalData.isOpen) return;

            modalData.modal.style.display = 'flex';
            modalData.modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            modalData.isOpen = true;
            
            // Focus management
            setTimeout(() => {
                const firstFocusable = modalData.modal.querySelector('button, input, select, textarea, a[href]');
                if (firstFocusable) firstFocusable.focus();
            }, 100);
        }

        close(id) {
            const modalData = this.modals.get(id);
            if (!modalData || !modalData.isOpen) return;

            modalData.modal.style.display = 'none';
            modalData.modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            modalData.isOpen = false;
        }

        handleEscape(e) {
            if (e.key === 'Escape') {
                this.modals.forEach((modalData, id) => {
                    if (modalData.isOpen) {
                        this.close(id);
                    }
                });
            }
        }
    }

    // Gestionnaire du panier
    class CartManager {
        constructor() {
            this.items = [];
            this.isOpen = false;
            this.init();
        }

        init() {
            this.loadFromStorage();
            this.updateUI();
        }

        loadFromStorage() {
            const stored = localStorage.getItem('titi_cart');
            if (stored) {
                try {
                    this.items = JSON.parse(stored);
                } catch (e) {
                    console.error('Erreur lors du chargement du panier:', e);
                    this.items = [];
                }
            }
        }

        saveToStorage() {
            localStorage.setItem('titi_cart', JSON.stringify(this.items));
        }

        addItem(item) {
            const existingItem = this.items.find(i => i.id === item.id);
            if (existingItem) {
                existingItem.quantity += item.quantity || 1;
            } else {
                this.items.push({ ...item, quantity: item.quantity || 1 });
            }
            
            this.saveToStorage();
            this.updateUI();
            Utils.showToast('Article ajouté au panier', 'success');
        }

        removeItem(itemId) {
            this.items = this.items.filter(item => item.id !== itemId);
            this.saveToStorage();
            this.updateUI();
            Utils.showToast('Article retiré du panier', 'info');
        }

        updateQuantity(itemId, quantity) {
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.quantity = Math.max(1, quantity);
                this.saveToStorage();
                this.updateUI();
            }
        }

        getTotal() {
            return this.items.reduce((total, item) => {
                return total + (item.price * item.quantity);
            }, 0);
        }

        getCount() {
            return this.items.reduce((count, item) => count + item.quantity, 0);
        }

        updateUI() {
            const count = this.getCount();
            const total = this.getTotal();
            
            // Mettre à jour les compteurs
            const cartCounts = document.querySelectorAll('[data-cart-count]');
            cartCounts.forEach(el => {
                el.textContent = count;
            });

            // Mettre à jour les totaux
            const totalElements = document.querySelectorAll('[data-cart-total]');
            totalElements.forEach(el => {
                el.textContent = Utils.formatPrice(total);
            });
        }
    }

    // Initialisation principale
    class App {
        constructor() {
            this.dropdownManager = new DropdownManager();
            this.modalManager = new ModalManager();
            this.cartManager = new CartManager();
        }

        init() {
            // Attendre que le DOM soit prêt
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupComponents());
            } else {
                this.setupComponents();
            }
        }

        setupComponents() {
            this.setupDropdowns();
            this.setupModals();
            this.setupCart();
            this.setupForms();
            this.setupNavigation();
        }

        setupDropdowns() {
            // Dropdown profil
            const profileToggle = document.getElementById('profileToggleBtn');
            const profileMenu = document.getElementById('profileDropdownMenu');
            if (profileToggle && profileMenu) {
                this.dropdownManager.register('profile', profileToggle, profileMenu);
            }

            // Le panier est géré par cart.js qui applique sa propre logique.
            // On évite d'enregistrer le sidebar dans DropdownManager afin de ne pas ajouter
            // de classe .show incompatible et ne pas provoquer de conflits.
            // const cartToggle = document.getElementById('cartToggleBtn');
            // const cartSidebar = document.getElementById('cartSidebar');
            // if (cartToggle && cartSidebar) {
            //     this.dropdownManager.register('cart', cartToggle, cartSidebar);
            // }

            // Dropdown boutique/shop (si présent)
            const shopToggle = document.getElementById('shopDropdownBtn');
            const shopMenu = document.getElementById('shopDropdownMenu');
            if (shopToggle && shopMenu) {
                this.dropdownManager.register('shop', shopToggle, shopMenu);
            }
        }

        setupModals() {
            // Modal login
            const loginModal = document.getElementById('loginModal');
            const loginClose = document.getElementById('loginModalClose');
            if (loginModal && loginClose) {
                this.modalManager.register('login', loginModal, loginClose);

                // open login modal from any toggle button that has data-login-modal
                document.querySelectorAll('[data-login-modal]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.modalManager.open('login');
                    });
                });
            }

            // Modal notifications
            const notifModal = document.getElementById('notificationModal');
            const notifClose = document.getElementById('notificationModalClose');
            if (notifModal && notifClose) {
                this.modalManager.register('notifications', notifModal, notifClose);

                const notifToggle = document.getElementById('notificationToggleBtn');
                if (notifToggle) {
                    notifToggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.modalManager.open('notifications');
                    });
                }
            }
        }

        setupCart() {
            // Initialiser le panier
            this.cartManager.init();
        }

        setupForms() {
            // Formulaire de contact
            const contactForm = document.getElementById('contactForm');
            if (contactForm) {
                contactForm.addEventListener('submit', this.handleContactForm.bind(this));
            }

            // Formulaire de login rapide
            const quickLoginForm = document.getElementById('quickLoginForm');
            if (quickLoginForm) {
                quickLoginForm.addEventListener('submit', this.handleQuickLogin.bind(this));
            }
        }

        setupNavigation() {
            // Navigation mobile
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const mobileNav = document.getElementById('mobileNav');
            
            if (mobileMenuBtn && mobileNav) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileNav.classList.toggle('show');
                    document.body.classList.toggle('mobile-nav-open');
                });
            }
        }

        handleContactForm(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Validation
            if (!data.name || !data.email || !data.message) {
                Utils.showToast('Veuillez remplir tous les champs obligatoires', 'error');
                return;
            }

            if (!Utils.validateEmail(data.email)) {
                Utils.showToast('Veuillez entrer une adresse email valide', 'error');
                return;
            }

            // Simuler l'envoi
            Utils.showToast('Message envoyé avec succès', 'success');
            e.target.reset();
        }

        async handleQuickLogin(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const email = formData.get('email');
            const password = formData.get('password');

            if (!email || !password) {
                Utils.showToast('Veuillez saisir votre email et mot de passe', 'error');
                return;
            }

            try {
                const response = await fetch(`${TitiConfig.apiBaseUrl}/auth/login.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();
                
                if (result.success) {
                    Utils.showToast('Connexion réussie', 'success');
                    this.modalManager.close('login');
                    // Recharger la page pour mettre à jour l'UI
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    Utils.showToast(result.message || 'Erreur de connexion', 'error');
                }
            } catch (error) {
                console.error('Erreur de connexion:', error);
                Utils.showToast('Erreur lors de la connexion', 'error');
            }
        }
    }

    // Exposer les classes globalement
    window.Utils = Utils;
    window.DropdownManager = DropdownManager;
    window.ModalManager = ModalManager;
    window.CartManager = CartManager;

    // Initialiser l'application
    const app = new App();
    app.init();

})();
