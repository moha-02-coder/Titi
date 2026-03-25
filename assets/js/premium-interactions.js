/**
 * Titi Golden Taste - Premium Interactions & Animations
 * Script d'interactions avancées pour les sections menu, produits, commande et contact
 */

class TitiGoldenInteractions {
    constructor() {
        this.init();
    }

    init() {
        this.setupMenuInteractions();
        this.setupFeaturedProducts();
        this.setupOrderWizard();
        this.setupContactForm();
        this.setupScrollAnimations();
        this.setupLazyLoading();
        this.setupVideoInteractions();
    }

    // === MENU INTERACTIONS ===
    setupMenuInteractions() {
        // Animation des cartes menu au scroll
        const menuCards = document.querySelectorAll('.menu-card');
        this.observeElements(menuCards, (card) => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });

        // Gestion des médias (vidéo/image)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.video-overlay')) {
                this.handleVideoPlay(e.target.closest('.menu-card'));
            }
        });

        // Hover effects pour les cartes
        menuCards.forEach(card => {
            card.addEventListener('mouseenter', () => this.animateCardHover(card, true));
            card.addEventListener('mouseleave', () => this.animateCardHover(card, false));
        });
    }

    handleVideoPlay(card) {
        const video = card.querySelector('video');
        const overlay = card.querySelector('.video-overlay');
        
        if (video) {
            if (video.paused) {
                video.play();
                overlay.style.opacity = '0';
            } else {
                video.pause();
                overlay.style.opacity = '1';
            }
        }
    }

    animateCardHover(card, isHover) {
        const media = card.querySelector('.menu-media-container img, .menu-media-container video');
        const badge = card.querySelector('.menu-badge');
        
        if (isHover) {
            if (media) {
                media.style.transform = 'scale(1.1)';
                media.style.filter = 'brightness(1.1)';
            }
            if (badge) {
                badge.style.transform = 'scale(1.1)';
            }
        } else {
            if (media) {
                media.style.transform = 'scale(1)';
                media.style.filter = 'brightness(1)';
            }
            if (badge) {
                badge.style.transform = 'scale(1)';
            }
        }
    }

    // === FEATURED PRODUCTS ===
    setupFeaturedProducts() {
        // Carousel functionality
        this.setupCarousel();
        
        // Star rating interactions
        this.setupStarRatings();
        
        // Hero product animations
        this.setupHeroProduct();
    }

    setupCarousel() {
        const carousel = document.querySelector('.featured-carousel');
        if (!carousel) return;

        const container = carousel.querySelector('.carousel-container');
        const prevBtn = carousel.querySelector('.carousel-btn.prev');
        const nextBtn = carousel.querySelector('.carousel-btn.next');
        
        let currentIndex = 0;
        const items = container.querySelectorAll('.featured-product-card');
        const itemWidth = items[0]?.offsetWidth + 24 || 324; // width + gap

        const updateCarousel = () => {
            container.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
        };

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex = Math.max(0, currentIndex - 1);
                updateCarousel();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentIndex = Math.min(items.length - 1, currentIndex + 1);
                updateCarousel();
            });
        }

        // Auto-scroll
        setInterval(() => {
            currentIndex = (currentIndex + 1) % items.length;
            updateCarousel();
        }, 5000);
    }

    setupStarRatings() {
        document.querySelectorAll('.star-rating').forEach(rating => {
            const stars = rating.querySelectorAll('.star');
            
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    this.setStarRating(rating, index + 1);
                });
                
                star.addEventListener('mouseenter', () => {
                    this.previewStarRating(rating, index + 1);
                });
            });
            
            rating.addEventListener('mouseleave', () => {
                this.resetStarPreview(rating);
            });
        });
    }

    setStarRating(rating, value) {
        const stars = rating.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
        
        // Animation feedback
        rating.style.transform = 'scale(1.1)';
        setTimeout(() => {
            rating.style.transform = 'scale(1)';
        }, 200);
    }

    previewStarRating(rating, value) {
        const stars = rating.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.style.color = 'var(--gold)';
            } else {
                star.style.color = '#ddd';
            }
        });
    }

    resetStarPreview(rating) {
        const stars = rating.querySelectorAll('.star');
        stars.forEach(star => {
            if (star.classList.contains('filled')) {
                star.style.color = 'var(--gold)';
            } else {
                star.style.color = '#ddd';
            }
        });
    }

    setupHeroProduct() {
        const heroProduct = document.querySelector('.hero-product');
        if (!heroProduct) return;

        const media = heroProduct.querySelector('.hero-product-media img');
        if (media) {
            media.addEventListener('load', () => {
                media.style.animation = 'fadeIn 0.8s ease-out';
            });
        }
    }

    // === ORDER WIZARD ===
    setupOrderWizard() {
        const wizard = document.querySelector('.order-wizard');
        if (!wizard) return;

        this.currentStep = 1;
        this.orderData = {
            items: [],
            customizations: {},
            customerInfo: {}
        };

        this.setupWizardSteps();
        this.setupMenuSelection();
        this.setupCustomization();
        this.setupOrderSummary();
    }

    setupWizardSteps() {
        const nextBtns = document.querySelectorAll('.btn-next');
        const prevBtns = document.querySelectorAll('.btn-prev');
        const submitBtn = document.querySelector('.btn-submit');

        nextBtns.forEach(btn => {
            btn.addEventListener('click', () => this.nextStep());
        });

        prevBtns.forEach(btn => {
            btn.addEventListener('click', () => this.prevStep());
        });

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitOrder());
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.updateWizardDisplay();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateWizardDisplay();
        }
    }

    updateWizardDisplay() {
        // Update progress steps
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
            } else if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            }
        });

        // Show/hide steps
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.classList.remove('active');
            if (index + 1 === this.currentStep) {
                setTimeout(() => step.classList.add('active'), 100);
            }
        });
    }

    validateCurrentStep() {
        // Validation logic for each step
        switch (this.currentStep) {
            case 1:
                return this.orderData.items.length > 0;
            case 2:
                return true; // Customizations are optional
            case 3:
                return this.validateCustomerInfo();
            default:
                return true;
        }
    }

    setupMenuSelection() {
        const selectableItems = document.querySelectorAll('.menu-item-selectable');
        
        selectableItems.forEach(item => {
            item.addEventListener('click', () => {
                this.toggleMenuItem(item);
            });
        });
    }

    toggleMenuItem(item) {
        const itemId = item.dataset.itemId;
        const itemName = item.dataset.itemName;
        const itemPrice = parseFloat(item.dataset.itemPrice);

        item.classList.toggle('selected');
        
        const index = this.orderData.items.findIndex(i => i.id === itemId);
        if (index > -1) {
            this.orderData.items.splice(index, 1);
        } else {
            this.orderData.items.push({ id: itemId, name: itemName, price: itemPrice });
        }
        
        this.updateSelectedItemsList();
    }

    updateSelectedItemsList() {
        const listContainer = document.getElementById('selectedItemsList');
        if (!listContainer) return;

        if (this.orderData.items.length === 0) {
            listContainer.innerHTML = '<p style="color: rgba(255,255,255,0.6);">Aucun plat sélectionné</p>';
        } else {
            listContainer.innerHTML = this.orderData.items.map(item => `
                <div class="selected-item">
                    <span class="selected-item-name">${item.name}</span>
                    <span class="selected-item-price">${item.price.toLocaleString()} FCFA</span>
                </div>
            `).join('');
        }
    }

    setupCustomization() {
        const options = document.querySelectorAll('.custom-option input');
        
        options.forEach(option => {
            option.addEventListener('change', () => {
                this.updateCustomizations();
            });
        });
    }

    updateCustomizations() {
        const checkedOptions = document.querySelectorAll('.custom-option input:checked');
        this.orderData.customizations = Array.from(checkedOptions).map(option => ({
            name: option.dataset.name || option.nextElementSibling.textContent,
            price: parseFloat(option.dataset.price || 0)
        }));
        
        this.updateOrderSummary();
    }

    setupOrderSummary() {
        this.updateOrderSummary();
    }

    updateOrderSummary() {
        const summaryContainer = document.querySelector('.order-summary');
        if (!summaryContainer) return;

        const subtotal = this.orderData.items.reduce((sum, item) => sum + item.price, 0);
        const customTotal = this.orderData.customizations.reduce((sum, item) => sum + item.price, 0);
        const total = subtotal + customTotal;

        // Update summary HTML
        const itemsHtml = this.orderData.items.map(item => `
            <div class="summary-item">
                <span class="summary-item-name">${item.name}</span>
                <span class="summary-item-price">${item.price.toLocaleString()} FCFA</span>
            </div>
        `).join('');

        const customHtml = this.orderData.customizations.map(item => `
            <div class="summary-item">
                <span class="summary-item-name">${item.name}</span>
                <span class="summary-item-price">+${item.price.toLocaleString()} FCFA</span>
            </div>
        `).join('');

        summaryContainer.innerHTML = `
            <h3 class="summary-title">Récapitulatif de la commande</h3>
            ${itemsHtml}
            ${customHtml}
            <div class="summary-total">
                <span class="summary-total-label">Total</span>
                <span class="summary-total-price">${total.toLocaleString()} FCFA</span>
            </div>
        `;
    }

    validateCustomerInfo() {
        const requiredFields = ['name', 'email', 'phone'];
        let isValid = true;

        requiredFields.forEach(field => {
            const input = document.querySelector(`[name="${field}"]`);
            const formGroup = input?.closest('.form-group');
            
            if (!input || !input.value.trim()) {
                formGroup?.classList.add('error');
                isValid = false;
            } else {
                formGroup?.classList.remove('error');
                formGroup?.classList.add('success');
            }
        });

        return isValid;
    }

    async submitOrder() {
        if (!this.validateCurrentStep()) return;

        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.classList.add('loading');

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showNotification('Commande effectuée avec succès!', 'success');
            this.resetOrderWizard();
        } catch (error) {
            this.showNotification('Erreur lors de la commande. Veuillez réessayer.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
        }
    }

    resetOrderWizard() {
        this.currentStep = 1;
        this.orderData = { items: [], customizations: {}, customerInfo: {} };
        this.updateWizardDisplay();
        this.updateSelectedItemsList();
        this.updateOrderSummary();
        
        // Reset form
        document.querySelectorAll('.menu-item-selectable').forEach(item => {
            item.classList.remove('selected');
        });
        
        document.querySelectorAll('.custom-option input').forEach(option => {
            option.checked = false;
        });
    }

    // === CONTACT FORM ===
    setupContactForm() {
        const form = document.querySelector('.contact-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleContactSubmit(form);
        });

        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
                const formGroup = input.closest('.form-group');
                formGroup?.classList.remove('error');
            });
        });
    }

    validateField(field) {
        const formGroup = field.closest('.form-group');
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (!value) {
            isValid = false;
            errorMessage = 'Ce champ est requis';
        } else if (field.type === 'email' && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Veuillez entrer une adresse email valide';
        } else if (field.name === 'phone' && !this.isValidPhone(value)) {
            isValid = false;
            errorMessage = 'Veuillez entrer un numéro de téléphone valide';
        }

        if (!isValid) {
            formGroup?.classList.add('error');
            formGroup?.classList.remove('success');
            const errorElement = formGroup?.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = errorMessage;
            }
        } else {
            formGroup?.classList.remove('error');
            formGroup?.classList.add('success');
        }

        return isValid;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.length >= 8;
    }

    async handleContactSubmit(form) {
        const submitBtn = form.querySelector('.form-submit');
        submitBtn.classList.add('loading');

        try {
            // Validate all fields
            const inputs = form.querySelectorAll('input, textarea');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!this.validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                throw new Error('Veuillez corriger les erreurs dans le formulaire');
            }

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showNotification('Message envoyé avec succès! Nous vous contacterons bientôt.', 'success');
            form.reset();
            
            // Remove success classes
            inputs.forEach(input => {
                const formGroup = input.closest('.form-group');
                formGroup?.classList.remove('success');
            });
            
        } catch (error) {
            this.showNotification(error.message || 'Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
        }
    }

    // === SCROLL ANIMATIONS ===
    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        this.observeElements(animatedElements, (element) => {
            const animation = element.dataset.animate;
            element.classList.add('animated', animation);
        });
    }

    // === LAZY LOADING ===
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    // === VIDEO INTERACTIONS ===
    setupVideoInteractions() {
        const videos = document.querySelectorAll('.menu-media-container video');
        
        videos.forEach(video => {
            video.addEventListener('mouseenter', () => {
                if (video.paused) {
                    video.play();
                }
            });
            
            video.addEventListener('mouseleave', () => {
                if (!video.paused) {
                    video.pause();
                }
            });
        });
    }

    // === UTILITIES ===
    observeElements(elements, callback) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        callback(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            elements.forEach(element => observer.observe(element));
        } else {
            // Fallback
            elements.forEach(callback);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TitiGoldenInteractions();
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    .animated {
        animation-duration: 0.8s;
        animation-fill-mode: both;
    }
    
    .animated.fadeIn {
        animation-name: fadeIn;
    }
    
    .animated.slideInUp {
        animation-name: slideInUp;
    }
    
    .animated.slideInLeft {
        animation-name: slideInLeft;
    }
    
    .animated.slideInRight {
        animation-name: slideInRight;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .menu-card {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .featured-product-card {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .info-card {
        opacity: 1;
        transform: translateY(30px);
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    img.lazy {
        opacity: 0;
        transition: opacity 0.3s;
    }
    
    img.loaded {
        opacity: 1;
    }
`;
document.head.appendChild(style);
