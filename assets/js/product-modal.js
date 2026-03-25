/**
 * Modal de produit/menu avec système de likes intégré
 * Affiche les détails d'un produit avec options de like
 */

class ProductModal {
    constructor() {
        this.currentProduct = null;
        this.isLiked = false;
        this.likesCount = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createModalStyles();
    }

    setupEventListeners() {
        // Écouter les clics sur les cartes produit/menu
        document.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product-card, .menu-item');
            if (productCard && !e.target.closest('.product-actions')) {
                const productId = productCard.dataset.id || productCard.dataset.itemId;
                if (productId) {
                    this.showProductModal(productId);
                }
            }
        });

        // Écouter la fermeture de modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-modal-backdrop') || 
                e.target.classList.contains('product-modal-close')) {
                this.closeModal();
            }
        });

        // Écouter la touche Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async showProductModal(productId) {
        try {
            // Récupérer les détails du produit
            const product = await this.fetchProductDetails(productId);
            if (!product) return;

            this.currentProduct = product;
            
            // Récupérer les informations de like
            await this.loadLikeStatus(productId);
            
            // Créer et afficher la modal
            this.createModal(product);
            
        } catch (error) {
            console.error('Erreur lors de l\'affichage du produit:', error);
            this.showError('Erreur lors du chargement du produit');
        }
    }

    async fetchProductDetails(productId) {
        try {
            // Essayer de récupérer depuis les menus d'abord
            let response = await fetch(`${this.getApiBase()}/menu/get.php?id=${productId}`);
            let product = await response.json();

            if (!product.success) {
                // Essayer depuis les produits
                response = await fetch(`${this.getApiBase()}/products/get.php?id=${productId}`);
                product = await response.json();
            }

            return product.success ? product.data : null;
        } catch (error) {
            console.error('Erreur API:', error);
            return null;
        }
    }

    async loadLikeStatus(productId) {
        try {
            const userId = this.getCurrentUserId();
            const userType = this.getCurrentUserType();

            const response = await fetch(`${this.getApiBase()}/menu/likes.php?action=check_like&menu_item_id=${productId}&user_id=${userId}&user_type=${userType}`);
            const result = await response.json();

            if (result.success) {
                this.isLiked = result.data.is_liked;
                // Récupérer le nombre de likes depuis le produit
                this.likesCount = this.currentProduct.likes_count || 0;
            }
        } catch (error) {
            console.warn('Erreur lors du chargement du statut de like:', error);
        }
    }

    createModal(product) {
        // Supprimer la modal existante
        this.closeModal();

        const modal = document.createElement('div');
        modal.className = 'product-modal';
        modal.innerHTML = this.generateModalHTML(product);

        document.body.appendChild(modal);
        
        // Ajouter les écouteurs d'événements pour cette modal
        this.attachModalEventListeners(modal);

        // Animation d'entrée
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    generateModalHTML(product) {
        const hasImage = product.image_url && product.image_url !== '';
        const hasVideo = product.video_url && product.video_url !== '';
        const mediaHTML = this.generateMediaHTML(product);
        
        return `
            <div class="product-modal-backdrop"></div>
            <div class="product-modal-panel">
                <div class="product-modal-header">
                    <h2 class="product-modal-title">${product.name}</h2>
                    <button class="product-modal-close" aria-label="Fermer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="product-modal-body">
                    <div class="product-modal-media">
                        ${mediaHTML}
                    </div>
                    
                    <div class="product-modal-info">
                        <div class="product-modal-price">
                            <span class="price-label">Prix</span>
                            <span class="price-value">${product.price} FCFA</span>
                        </div>
                        
                        <div class="product-modal-description">
                            <h3>Description</h3>
                            <p>${product.description || 'Aucune description disponible'}</p>
                        </div>
                        
                        <div class="product-modal-meta">
                            <div class="meta-item">
                                <span class="meta-label">Catégorie</span>
                                <span class="meta-value">${product.category || 'Non catégorisé'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Disponibilité</span>
                                <span class="meta-value ${product.is_available ? 'available' : 'unavailable'}">
                                    ${product.is_available ? 'Disponible' : 'Indisponible'}
                                </span>
                            </div>
                            ${product.preparation_time ? `
                                <div class="meta-item">
                                    <span class="meta-label">Temps de préparation</span>
                                    <span class="meta-value">${product.preparation_time} min</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="product-modal-actions">
                    <div class="like-section">
                        <button class="like-btn ${this.isLiked ? 'liked' : ''}" id="modalLikeBtn" data-product-id="${product.id}">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${this.likesCount}</span>
                            <span class="like-text">${this.isLiked ? 'Liké' : 'Like'}</span>
                        </button>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-primary add-to-cart-btn" data-product='${JSON.stringify(product)}'>
                            <i class="fas fa-cart-plus"></i>
                            Ajouter au panier
                        </button>
                        <button class="btn btn-outline order-btn" data-product='${JSON.stringify(product)}'>
                            <i class="fas fa-utensils"></i>
                            Commander maintenant
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateMediaHTML(product) {
        const hasImage = product.image_url && product.image_url !== '';
        const hasVideo = product.video_url && product.video_url !== '';

        if (hasVideo) {
            return `
                <div class="video-container">
                    <video controls poster="${product.image_url || ''}" class="product-video">
                        <source src="${product.video_url}" type="video/mp4">
                        Votre navigateur ne supporte pas les vidéos.
                    </video>
                </div>
            `;
        } else if (hasImage) {
            return `
                <div class="image-container">
                    <img src="${product.image_url}" alt="${product.name}" class="product-image">
                </div>
            `;
        } else {
            return `
                <div class="no-media">
                    <i class="fas fa-image"></i>
                    <p>Pas d'image disponible</p>
                </div>
            `;
        }
    }

    attachModalEventListeners(modal) {
        // Bouton de like
        const likeBtn = modal.querySelector('#modalLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                this.toggleLike();
            });
        }

        // Bouton d'ajout au panier
        const addToCartBtn = modal.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                const product = JSON.parse(addToCartBtn.dataset.product);
                this.addToCart(product);
            });
        }

        // Bouton de commande
        const orderBtn = modal.querySelector('.order-btn');
        if (orderBtn) {
            orderBtn.addEventListener('click', () => {
                const product = JSON.parse(orderBtn.dataset.product);
                this.orderProduct(product);
            });
        }
    }

    async toggleLike() {
        if (!this.currentProduct) return;

        const userId = this.getCurrentUserId();
        const userType = this.getCurrentUserType();
        const productId = this.currentProduct.id;
        const action = this.isLiked ? 'unlike' : 'like';

        try {
            const response = await fetch(`${this.getApiBase()}/menu/likes.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    menu_item_id: productId,
                    user_id: userId,
                    user_type: userType
                })
            });

            const result = await response.json();

            if (result.success) {
                this.isLiked = !this.isLiked;
                this.likesCount = result.data.likes_count;
                this.updateLikeButton();
                this.showNotification(result.message, 'success');
                
                // Émettre un événement pour les autres composants
                window.dispatchEvent(new CustomEvent('product:like_toggled', {
                    detail: {
                        product_id: productId,
                        is_liked: this.isLiked,
                        likes_count: this.likesCount
                    }
                }));
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erreur lors du like:', error);
            this.showNotification('Erreur lors du like', 'error');
        }
    }

    updateLikeButton() {
        const likeBtn = document.querySelector('#modalLikeBtn');
        if (!likeBtn) return;

        likeBtn.classList.toggle('liked', this.isLiked);
        likeBtn.querySelector('.like-count').textContent = this.likesCount;
        likeBtn.querySelector('.like-text').textContent = this.isLiked ? 'Liké' : 'Like';
    }

    addToCart(product) {
        if (typeof window.addToCart === 'function') {
            window.addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                type: 'menu'
            });
            this.showNotification('Produit ajouté au panier', 'success');
        } else {
            this.showNotification('Fonction panier non disponible', 'error');
        }
    }

    orderProduct(product) {
        // Ouvrir la modal de commande avec ce produit
        if (typeof window.showOrderModal === 'function') {
            window.showOrderModal({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image_url,
                type: 'menu'
            });
        } else {
            this.showNotification('Fonction de commande non disponible', 'error');
        }
    }

    closeModal() {
        const modal = document.querySelector('.product-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    getCurrentUserId() {
        return localStorage.getItem('user_id') || 
               sessionStorage.getItem('user_id') || 
               this.generateGuestId();
    }

    generateGuestId() {
        let guestId = sessionStorage.getItem('guest_id');
        if (!guestId) {
            guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('guest_id', guestId);
        }
        return guestId;
    }

    getCurrentUserType() {
        return localStorage.getItem('user_role') || 
               sessionStorage.getItem('user_role') || 
               'customer';
    }

    showNotification(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else if (typeof window.ToastSystem?.show === 'function') {
            window.ToastSystem.show(type, 'Notification', message);
        } else {
            alert(message);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    getApiBase() {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/');
        const projectIndex = pathParts.findIndex(part => part.includes('Titi'));
        
        if (projectIndex !== -1) {
            return '/' + pathParts.slice(0, projectIndex + 1).join('/') + '/backend/api';
        }
        return '/backend/api';
    }

    createModalStyles() {
        if (document.querySelector('#product-modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'product-modal-styles';
        styles.textContent = `
            .product-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .product-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .product-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
            }

            .product-modal-panel {
                position: relative;
                background: white;
                border-radius: 16px;
                max-width: 90vw;
                max-height: 90vh;
                width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.3s ease;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .product-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid #eee;
                background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
                color: white;
                border-radius: 16px 16px 0 0;
            }

            .product-modal-title {
                margin: 0;
                font-size: 1.3rem;
                font-weight: 700;
            }

            .product-modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .product-modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: rotate(90deg);
            }

            .product-modal-body {
                padding: 24px;
            }

            .product-modal-media {
                margin-bottom: 20px;
                text-align: center;
            }

            .product-video {
                width: 100%;
                max-height: 300px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .product-image {
                width: 100%;
                max-height: 300px;
                object-fit: cover;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .no-media {
                padding: 40px;
                background: #f8f9fa;
                border-radius: 8px;
                color: #6c757d;
                text-align: center;
            }

            .no-media i {
                font-size: 3rem;
                margin-bottom: 10px;
            }

            .product-modal-info {
                margin-bottom: 24px;
            }

            .product-modal-price {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 10px;
                padding: 16px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #d4af37;
            }

            .price-label {
                font-weight: 600;
                color: #6c757d;
                text-transform: uppercase;
                font-size: 0.9rem;
            }

            .price-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: #d4af37;
            }

            .product-modal-description h3 {
                margin: 0 0 12px 0;
                font-size: 1.1rem;
                color: #333;
            }

            .product-modal-description p {
                margin: 0;
                line-height: 1.6;
                color: #666;
            }

            .product-modal-meta {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
                margin-top: 16px;
            }

            .meta-item {
                display: flex;
                justify-content: space-between;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #e9ecef;
            }

            .meta-label {
                font-weight: 600;
                color: #6c757d;
                font-size: 0.9rem;
            }

            .meta-value {
                font-weight: 500;
                color: #333;
            }

            .meta-value.available {
                color: #28a745;
            }

            .meta-value.unavailable {
                color: #dc3545;
            }

            .product-modal-actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                padding: 20px 24px;
                border-top: 1px solid #eee;
            }

            .like-section {
                display: flex;
                align-items: center;
            }

            .like-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                border: 2px solid #e9ecef;
                border-radius: 25px;
                background: white;
                color: #666;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.95rem;
                font-weight: 500;
            }

            .like-btn:hover {
                border-color: #ff6b6b;
                color: #ff6b6b;
                transform: translateY(-2px);
            }

            .like-btn.liked {
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                border-color: #ff6b6b;
                color: white;
            }

            .like-btn i {
                font-size: 1.1rem;
                transition: transform 0.3s ease;
            }

            .like-btn:hover i {
                transform: scale(1.2);
            }

            .like-count {
                font-weight: 600;
            }

            .action-buttons {
                display: flex;
                gap: 12px;
            }

            @media (max-width: 768px) {
                .product-modal-panel {
                    width: 95vw;
                    margin: 20px;
                }

                .product-modal-body {
                    padding: 16px;
                }

                .product-modal-actions {
                    flex-direction: column;
                    gap: 12px;
                }

                .action-buttons {
                    width: 100%;
                    justify-content: center;
                }

                .product-modal-meta {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialiser la modal de produit
window.productModal = new ProductModal();

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductModal;
}
