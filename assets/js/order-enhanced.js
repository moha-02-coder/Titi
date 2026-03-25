/**
 * Enhanced Order Manager
 * Gestionnaire de commande amélioré avec navigation fluide et design responsive
 */

class EnhancedOrderManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.selectedItems = [];
        this.orderData = {
            items: [],
            customizations: {},
            delivery: {},
            payment: {},
            notes: ''
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadMenuItems();
        this.updateNavigation();
    }

    setupEventListeners() {
        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                if (e.target.classList.contains('prev')) {
                    this.previousStep();
                } else if (e.target.classList.contains('next')) {
                    this.nextStep();
                }
            }
            
            // Menu card selection - open modal instead
            if (e.target.closest('.menu-card') && !e.target.closest('.menu-card-select-btn')) {
                const menuCard = e.target.closest('.menu-card');
                const itemId = menuCard.dataset.itemId;
                this.openMenuModal(itemId);
            }
            
            // Remove selected item
            if (e.target.classList.contains('selected-item-remove')) {
                this.removeSelectedItem(e.target.closest('.selected-item').dataset.itemId);
            }
        });

        // Form inputs
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' || e.target.type === 'radio') {
                this.updateCustomizationPrice();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
                this.previousStep();
            } else if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
                this.nextStep();
            }
        });
    }

    async loadMenuItems() {
        try {
            const response = await fetch('backend/api/menu/list.php');
            const data = await response.json();
            
            if (data.success) {
                this.renderMenuItems(data.items || []);
            } else {
                // Fallback menu
                this.renderMenuItems(this.getFallbackMenu());
            }
        } catch (error) {
            console.error('Erreur chargement menu:', error);
            this.renderMenuItems(this.getFallbackMenu());
        }
    }

    getFallbackMenu() {
        return [
            { id: 1, name: 'Thieboudienne', description: 'Riz au poisson sauce maison', price: 3500, category: 'plat', image: 'assets/images/thieboudienne.jpg', badge: 'Populaire' },
            { id: 2, name: 'Mafe Poulet', description: 'Sauce arachide avec poulet tendre', price: 3000, category: 'plat', image: 'assets/images/mafe.jpg', badge: 'Spécialité' },
            { id: 3, name: 'Yassa Poulet', description: 'Poulet mariné au citron et oignons', price: 2800, category: 'plat', image: 'assets/images/yassa.jpg' },
            { id: 4, name: 'Bouillon de Poisson', description: 'Soupe de poisson épicée', price: 2500, category: 'soupe', image: 'assets/images/bouillon.jpg' },
            { id: 5, name: 'Salade Tropicale', description: 'Mélange frais de fruits et légumes', price: 1800, category: 'salade', image: 'assets/images/salade.jpg', badge: 'Végétarien' },
            { id: 6, name: 'Tiakri', description: 'Dessert au mil et yaourt', price: 1200, category: 'dessert', image: 'assets/images/tiakri.jpg', badge: 'Dessert' }
        ];
    }

    renderMenuItems(items) {
        const container = document.getElementById('menuSelectionGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="menu-selection-enhanced">
                ${items.map(item => this.renderMenuItem(item)).join('')}
            </div>
        `;
    }

    renderMenuItem(item) {
        const isSelected = this.selectedItems.some(selected => selected.id === item.id);
        
        return `
            <div class="menu-card ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
                <div class="menu-card-header">
                    <img src="${item.image || 'assets/images/default.jpg'}" 
                         alt="${item.name}" 
                         class="menu-card-image"
                         onerror="this.src='assets/images/default.jpg'">
                    ${item.badge ? `<span class="menu-card-badge">${item.badge}</span>` : ''}
                </div>
                <div class="menu-card-content">
                    <h3 class="menu-card-title">${item.name}</h3>
                    <p class="menu-card-description">${item.description}</p>
                    <div class="menu-card-footer">
                        <span class="menu-card-price">${this.formatMoney(item.price)}</span>
                        <button class="menu-card-select-btn" onclick="enhancedOrderManager.toggleMenuItem(${item.id})">
                            ${isSelected ? 'Retirer' : 'Sélectionner'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleMenuItem(itemId) {
        const item = this.findMenuItem(itemId);
        if (!item) return;

        const existingIndex = this.selectedItems.findIndex(selected => selected.id === itemId);
        
        if (existingIndex > -1) {
            this.selectedItems.splice(existingIndex, 1);
        } else {
            this.selectedItems.push({
                ...item,
                quantity: 1,
                customizations: {}
            });
        }

        this.updateSelectedItemsDisplay();
        this.updateMenuItemsDisplay();
        this.updateNavigation();
    }

    findMenuItem(itemId) {
        // Chercher dans les cartes de menu affichées
        const card = document.querySelector(`.menu-card[data-item-id="${itemId}"]`);
        if (card) {
            return {
                id: parseInt(itemId),
                name: card.querySelector('.menu-card-title').textContent,
                description: card.querySelector('.menu-card-description').textContent,
                price: this.parsePrice(card.querySelector('.menu-card-price').textContent),
                image: card.querySelector('.menu-card-image').src
            };
        }
        return null;
    }

    parsePrice(priceText) {
        return parseInt(priceText.replace(/[^\d]/g, '')) || 0;
    }

    updateSelectedItemsDisplay() {
        const container = document.getElementById('selectedItemsList');
        if (!container) return;

        if (this.selectedItems.length === 0) {
            container.innerHTML = `
                <div class="selected-items-summary">
                    <div class="selected-items-header">
                        <h3 class="selected-items-title">Articles sélectionnés</h3>
                        <span class="selected-items-count">0</span>
                    </div>
                    <p style="text-align: center; color: #666; padding: 35px;">
                        Aucun article sélectionné. Choisissez vos plats ci-dessus.
                    </p>
                </div>
            `;
            return;
        }

        const totalPrice = this.selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        container.innerHTML = `
            <div class="selected-items-summary">
                <div class="selected-items-header">
                    <h3 class="selected-items-title">Articles sélectionnés</h3>
                    <span class="selected-items-count">${this.selectedItems.length}</span>
                </div>
                <div class="selected-items-list">
                    ${this.selectedItems.map(item => `
                        <div class="selected-item" data-item-id="${item.id}">
                            <div class="selected-item-info">
                                <div class="selected-item-name">${item.name}</div>
                                <div class="selected-item-price">${this.formatMoney(item.price * item.quantity)}</div>
                            </div>
                            <button class="selected-item-remove" onclick="enhancedOrderManager.removeSelectedItem(${item.id})">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #eee;">
                    <strong>Total:</strong>
                    <strong style="color: var(--primary-color); font-size: 1.2rem;">
                        ${this.formatMoney(totalPrice)}
                    </strong>
                </div>
            </div>
        `;
    }

    updateSelectedDishInfo() {
        const container = document.getElementById('selectedDishInfo');
        if (!container || this.selectedItems.length === 0) return;

        const currentItem = this.selectedItems[0]; // Pour l'instant, on prend le premier plat sélectionné

        container.innerHTML = `
            <div class="selected-dish-header">
                <div class="selected-dish-image">
                    <img src="${currentItem.image_url || 'assets/images/default-image.php'}" alt="${currentItem.name}" />
                </div>
                <div class="selected-dish-details">
                    <h4 class="selected-dish-name">${currentItem.name}</h4>
                    <div class="selected-dish-price">${this.formatMoney(currentItem.price)}</div>
                    <p class="selected-dish-description">${currentItem.description || 'Délicieux plat traditionnel'}</p>
                </div>
            </div>
        `;
    }

    updateMenuItemsDisplay() {
        document.querySelectorAll('.menu-card').forEach(card => {
            const itemId = parseInt(card.dataset.itemId);
            const isSelected = this.selectedItems.some(item => item.id === itemId);
            
            card.classList.toggle('selected', isSelected);
            
            const btn = card.querySelector('.menu-card-select-btn');
            if (btn) {
                btn.textContent = isSelected ? 'Retirer' : 'Sélectionner';
            }
        });
    }

    removeSelectedItem(itemId) {
        this.selectedItems = this.selectedItems.filter(item => item.id !== itemId);
        this.updateSelectedItemsDisplay();
        this.updateMenuItemsDisplay();
        this.updateNavigation();
    }

    updateCustomizationPrice() {
        // Calculer le prix des personnalisations
        let customizationPrice = 0;
        
        document.querySelectorAll('input[data-price]:checked').forEach(input => {
            customizationPrice += parseInt(input.dataset.price) || 0;
        });

        // Mettre à jour l'affichage du prix
        const priceDisplay = document.querySelector('.customization-price');
        if (priceDisplay) {
            priceDisplay.textContent = this.formatMoney(customizationPrice);
        }
    }

    updateNavigation() {
        const prevBtn = document.querySelector('.nav-btn.prev');
        const nextBtn = document.querySelector('.nav-btn.next');
        const stepIndicator = document.querySelector('.step-indicator');
        const stepNumber = document.querySelector('.step-number');

        // Mettre à jour les boutons
        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }

        if (nextBtn) {
            if (this.currentStep === this.totalSteps) {
                nextBtn.innerHTML = '<i class="fas fa-check"></i> Commander';
                nextBtn.onclick = () => this.submitOrder();
            } else {
                nextBtn.innerHTML = 'Suivant <i class="fas fa-arrow-right"></i>';
                nextBtn.onclick = () => this.nextStep();
            }
            
            // Désactiver le bouton suivant si aucune sélection à l'étape 1
            if (this.currentStep === 1 && this.selectedItems.length === 0) {
                nextBtn.disabled = true;
            } else {
                nextBtn.disabled = false;
            }
        }

        // Mettre à jour l'indicateur d'étape
        if (stepIndicator) {
            stepIndicator.textContent = `Étape ${this.currentStep} sur ${this.totalSteps}`;
        }

        if (stepNumber) {
            stepNumber.textContent = this.currentStep;
            // Mettre à jour les classes pour tous les numéros d'étape
            document.querySelectorAll('.step-number').forEach(el => {
                el.classList.remove('active');
            });
            stepNumber.classList.add('active');
        }
    }

    openMenuModal(itemId) {
        const item = this.findMenuItem(itemId);
        if (!item) return;

        const modal = document.getElementById('menuModal');
        const modalTitle = document.getElementById('menuModalTitle');
        const modalBody = document.getElementById('menuModalBody');

        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = item.name;
            modalBody.innerHTML = `
                <div class="menu-modal-content">
                    <div class="menu-modal-image">
                        <img src="${item.image || 'assets/images/default.jpg'}" 
                             alt="${item.name}" 
                             onerror="this.src='assets/images/default.jpg'">
                    </div>
                    <div class="menu-modal-details">
                        <p class="menu-modal-description">${item.description}</p>
                        <div class="menu-modal-price">${this.formatMoney(item.price)}</div>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        }
    }

    orderCurrentMenu() {
        // Trouver l'item du modal actuel
        const modalTitle = document.getElementById('menuModalTitle');
        if (!modalTitle) return;

        const itemName = modalTitle.textContent;
        // Trouver l'item par nom (approximatif)
        const menuCards = document.querySelectorAll('.menu-card');
        let itemId = null;
        
        menuCards.forEach(card => {
            if (card.querySelector('.menu-card-title').textContent === itemName) {
                itemId = card.dataset.itemId;
            }
        });

        if (itemId) {
            this.toggleMenuItem(itemId);
            this.goToStep(2); // Aller directement à la personnalisation
        }
    }

    openMenuModal(itemId) {
        const item = this.findMenuItem(itemId);
        if (!item) return;

        const modal = document.getElementById('menuModal');
        const overlay = document.getElementById('menuModalOverlay');
        const modalTitle = document.getElementById('menuModalTitle');
        const modalBody = document.getElementById('menuModalBody');

        if (modal && modalTitle && modalBody) {
            // Set modal content
            modalTitle.textContent = item.name;
            modalBody.innerHTML = `
                <div class="menu-modal-content">
                    <div class="menu-modal-image">
                        <img src="${item.image || 'assets/images/default.jpg'}" alt="${item.name}" 
                             onerror="this.src='assets/images/default.jpg'">
                    </div>
                    <div class="menu-modal-details">
                        <div class="menu-modal-description">
                            ${item.description || 'Découvrez ce délicieux plat traditionnel.'}
                        </div>
                        <div class="menu-modal-price">
                            ${this.formatMoney(item.price)}
                        </div>
                    </div>
                </div>
            `;

            // Show modal and overlay
            modal.style.display = 'flex';
            if (overlay) {
                overlay.classList.add('active');
            }
            
            // Add modal-open class to body for scroll lock
            document.body.classList.add('modal-open');
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            if (this.validateCurrentStep()) {
                this.saveCurrentStepData();
                this.goToStep(this.currentStep + 1);
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }

    goToStep(stepNumber) {
        // Masquer l'étape actuelle
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });

        // Afficher la nouvelle étape
        const newStep = document.getElementById(`wizardStep${stepNumber}`);
        if (newStep) {
            newStep.classList.add('active');
            
            // Mettre à jour les informations du plat sélectionné pour l'étape 2
            if (stepNumber === 2 && this.selectedItems.length > 0) {
                this.updateSelectedDishInfo();
            }
        }

        this.currentStep = stepNumber;
        this.updateNavigation();
        
        // Scroller en haut de la section
        const wizard = document.querySelector('.order-wizard');
        if (wizard) {
            wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (this.selectedItems.length === 0) {
                    // Rediriger vers la section menu pour sélection
                    const menuSection = document.getElementById('menu');
                    if (menuSection) {
                        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        this.showNotification('Veuillez d\'abord sélectionner un plat dans le menu', 'warning');
                    } else {
                        // Si on est sur une page séparée, rediriger vers index.html#menu
                        window.location.href = 'index.html#menu';
                    }
                    return false;
                }
                break;
            case 2:
                // Validation des personnalisations (optionnel)
                break;
            case 3:
                // Validation des informations de livraison
                const name = document.querySelector('input[name="name"]');
                const phone = document.querySelector('input[name="phone"]');
                const address = document.querySelector('input[name="address"]');
                
                if (!name?.value || !phone?.value || !address?.value) {
                    this.showNotification('Veuillez remplir tous les champs obligatoires', 'error');
                    return false;
                }
                break;
            case 4:
                // Validation du paiement
                const paymentMethod = document.querySelector('input[name="payment_method"]:checked');
                if (!paymentMethod) {
                    this.showNotification('Veuillez choisir une méthode de paiement', 'error');
                    return false;
                }
                break;
        }
        return true;
    }

    saveCurrentStepData() {
        switch (this.currentStep) {
            case 1:
                this.orderData.items = [...this.selectedItems];
                break;
            case 2:
                this.orderData.customizations = this.getCustomizationData();
                break;
            case 3:
                this.orderData.delivery = this.getDeliveryData();
                break;
            case 4:
                this.orderData.payment = this.getPaymentData();
                break;
        }
    }

    getCustomizationData() {
        const data = {};
        
        // Récupérer les suppléments
        data.supplements = [];
        document.querySelectorAll('input[name="supplement"]:checked').forEach(input => {
            data.supplements.push({
                name: input.nextElementSibling.textContent,
                price: parseInt(input.dataset.price) || 0
            });
        });

        // Récupérer la sauce
        const sauce = document.querySelector('input[name="sauce"]:checked');
        if (sauce) {
            data.sauce = {
                name: sauce.nextElementSibling.textContent,
                price: parseInt(sauce.dataset.price) || 0
            };
        }

        // Récupérer la viande
        const viande = document.querySelector('input[name="viande"]:checked');
        if (viande) {
            data.viande = {
                name: viande.nextElementSibling.textContent,
                price: parseInt(viande.dataset.price) || 0
            };
        }

        return data;
    }

    getDeliveryData() {
        const form = document.querySelector('#wizardStep3 form');
        if (!form) return {};

        return {
            name: form.querySelector('input[name="name"]')?.value || '',
            phone: form.querySelector('input[name="phone"]')?.value || '',
            address: form.querySelector('input[name="address"]')?.value || '',
            city: form.querySelector('input[name="city"]')?.value || 'Bamako',
            delivery_type: form.querySelector('input[name="delivery_type"]:checked')?.value || 'delivery',
            notes: form.querySelector('textarea[name="notes"]')?.value || ''
        };
    }

    getPaymentData() {
        const paymentMethod = document.querySelector('input[name="payment_method"]:checked');
        
        return {
            method: paymentMethod?.value || 'cash',
            mobile_money_provider: document.querySelector('select[name="mobile_money_provider"]')?.value || '',
            mobile_money_number: document.querySelector('input[name="mobile_money_number"]')?.value || ''
        };
    }

    async submitOrder() {
        if (!this.validateCurrentStep()) return;

        this.saveCurrentStepData();

        try {
            const token = localStorage.getItem('auth_token');
            const orderData = {
                ...this.orderData,
                total: this.calculateTotal(),
                created_at: new Date().toISOString()
            };

            const response = await fetch('backend/api/orders/create-enhanced.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Commande passée avec succès !', 'success');
                this.resetOrder();
                
                // Rediriger vers la page des commandes
                setTimeout(() => {
                    window.location.href = 'orders.html';
                }, 2000);
            } else {
                throw new Error(result.message || 'Erreur lors de la commande');
            }
        } catch (error) {
            console.error('Erreur submitOrder:', error);
            this.showNotification('Erreur lors de la commande. Veuillez réessayer.', 'error');
        }
    }

    calculateTotal() {
        let total = 0;

        // Total des articles
        this.orderData.items.forEach(item => {
            total += item.price * item.quantity;
        });

        // Total des personnalisations
        if (this.orderData.customizations) {
            Object.values(this.orderData.customizations).forEach(customization => {
                if (Array.isArray(customization)) {
                    customization.forEach(item => {
                        total += item.price || 0;
                    });
                } else if (customization.price) {
                    total += customization.price;
                }
            });
        }

        // Frais de livraison
        if (this.orderData.delivery?.delivery_type === 'delivery') {
            total += 1000; // Frais de livraison fixes
        }

        return total;
    }

    resetOrder() {
        this.currentStep = 1;
        this.selectedItems = [];
        this.orderData = {
            items: [],
            customizations: {},
            delivery: {},
            payment: {},
            notes: ''
        };

        // Réinitialiser les formulaires
        document.querySelectorAll('form').forEach(form => form.reset());
        
        // Revenir à la première étape
        this.goToStep(1);
        
        // Mettre à jour les affichages
        this.updateSelectedItemsDisplay();
        this.updateMenuItemsDisplay();
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount || 0);
    }

    showNotification(message, type = 'info') {
        // Créer une notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Afficher la notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Masquer après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Fonctions pour la personnalisation
function addMoreDishes() {
    // Retourner à l'étape 1 pour ajouter d'autres plats
    if (enhancedOrderManager) {
        enhancedOrderManager.goToStep(1);
    }
}

function removeCurrentDish() {
    // Supprimer le plat actuel et retourner à l'étape 1
    if (enhancedOrderManager) {
        enhancedOrderManager.selectedItems = [];
        enhancedOrderManager.updateSelectedItems();
        enhancedOrderManager.goToStep(1);
        enhancedOrderManager.showNotification('Plat retiré. Sélectionnez un nouveau plat.', 'info');
    }
}

// Initialiser le gestionnaire de commande amélioré
let enhancedOrderManager;

document.addEventListener('DOMContentLoaded', function() {
    enhancedOrderManager = new EnhancedOrderManager();
});

// Fonctions globales pour compatibilité
function nextStep(step) {
    if (enhancedOrderManager) {
        enhancedOrderManager.goToStep(step);
    }
}

function previousStep() {
    if (enhancedOrderManager) {
        enhancedOrderManager.previousStep();
    }
}

// Menu Modal Functions
function openMenuModal(itemId) {
    if (enhancedOrderManager) {
        enhancedOrderManager.openMenuModal(itemId);
    }
}

function closeMenuModal() {
    const modal = document.getElementById('menuModal');
    const overlay = document.getElementById('menuModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
}

function toggleLike() {
    // TODO: Implement like functionality
    if (enhancedOrderManager) {
        enhancedOrderManager.showNotification('Ajouté aux favoris !', 'success');
    }
}

function orderMenu() {
    if (enhancedOrderManager) {
        enhancedOrderManager.orderCurrentMenu();
    }
    closeMenuModal();
}
