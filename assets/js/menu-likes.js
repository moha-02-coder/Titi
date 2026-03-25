/**
 * Système de Likes et Produits en Vedette pour Titi Golden Taste
 * Permet aux clients d'aimer les menus et gère les produits vedettes
 */

class MenuLikesManager {
    constructor() {
        this.userLikes = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserLikes();
        this.createLikeButtons();
    }

    setupEventListeners() {
        // Écouter les clics sur les boutons de like
        document.addEventListener('click', (e) => {
            if (e.target.closest('.like-btn')) {
                const btn = e.target.closest('.like-btn');
                const menuId = btn.dataset.menuId;
                this.toggleLike(menuId);
            }
            
            if (e.target.closest('.featured-toggle')) {
                const toggle = e.target.closest('.featured-toggle');
                const menuId = toggle.dataset.menuId;
                this.toggleFeatured(menuId);
            }
        });

        // Écouter les changements d'état de l'utilisateur
        window.addEventListener('user:login', () => {
            this.loadUserLikes();
            this.updateAllLikeButtons();
        });

        window.addEventListener('user:logout', () => {
            this.userLikes.clear();
            this.updateAllLikeButtons();
        });
    }

    // Créer les boutons de like pour les items de menu
    createLikeButtons() {
        const observer = new MutationObserver(() => {
            this.addLikeButtonsToMenuItems();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Scan initial
        this.addLikeButtonsToMenuItems();
    }

    // Ajouter des boutons de like aux items de menu
    addLikeButtonsToMenuItems() {
        const menuItems = document.querySelectorAll('.menu-item, .product-card, .menu-card');
        
        menuItems.forEach(item => {
            if (!item.querySelector('.like-section')) {
                const menuId = item.dataset.itemId || item.querySelector('[data-item-id]')?.dataset.itemId;
                
                if (menuId) {
                    const likesCount = item.dataset.likesCount || 0;
                    const isLiked = this.userLikes.has(menuId);
                    
                    const likeSection = document.createElement('div');
                    likeSection.className = 'like-section';
                    likeSection.innerHTML = `
                        <button class="like-btn ${isLiked ? 'liked' : ''}" data-menu-id="${menuId}">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${likesCount}</span>
                        </button>
                    `;
                    
                    // Insérer après les actions existantes
                    const actionsSection = item.querySelector('.item-actions, .card-actions');
                    if (actionsSection) {
                        actionsSection.appendChild(likeSection);
                    } else {
                        item.appendChild(likeSection);
                    }
                }
            }
        });
    }

    // Charger les likes de l'utilisateur
    async loadUserLikes() {
        try {
            const userId = this.getCurrentUserId();
            const userType = this.getCurrentUserType();
            
            if (!userId) return;
            
            // Pour chaque item visible, vérifier le statut de like
            const menuItems = document.querySelectorAll('[data-item-id]');
            const likePromises = [];
            
            menuItems.forEach(item => {
                const menuId = item.dataset.itemId;
                if (menuId) {
                    likePromises.push(
                        this.checkLikeStatus(menuId, userId, userType)
                            .then(result => {
                                if (result.success && result.data.is_liked) {
                                    this.userLikes.set(menuId, true);
                                }
                            })
                    );
                }
            });
            
            await Promise.all(likePromises);
            
        } catch (error) {
            console.warn('Erreur lors du chargement des likes:', error);
        }
    }

    // Vérifier le statut de like d'un menu
    async checkLikeStatus(menuId, userId, userType) {
        return await this.apiCall(`/menu/likes.php?action=check_like&menu_item_id=${menuId}&user_id=${userId}&user_type=${userType}`);
    }

    // Basculer le like d'un menu
    async toggleLike(menuId) {
        const userId = this.getCurrentUserId();
        const userType = this.getCurrentUserType();
        
        if (!userId) {
            // Rediriger vers la connexion ou utiliser session_id pour les invités
            this.showLoginPrompt();
            return;
        }

        const isLiked = this.userLikes.has(menuId);
        const action = isLiked ? 'unlike' : 'like';
        
        try {
            const response = await this.apiCall('/menu/likes.php', {
                action: action,
                menu_item_id: menuId,
                user_id: userId,
                user_type: userType
            }, 'POST');
            
            if (response.success) {
                // Mettre à jour l'état local
                if (isLiked) {
                    this.userLikes.delete(menuId);
                } else {
                    this.userLikes.set(menuId, true);
                }
                
                // Mettre à jour le bouton
                this.updateLikeButton(menuId, response.data.likes_count, !isLiked);
                
                // Afficher une notification
                this.showNotification(response.message, 'success');
                
                // Émettre un événement
                window.dispatchEvent(new CustomEvent('menu:like_toggled', {
                    detail: {
                        menu_id: menuId,
                        is_liked: !isLiked,
                        likes_count: response.data.likes_count
                    }
                }));
                
            } else {
                this.showNotification(response.message, 'error');
            }
            
        } catch (error) {
            this.showNotification('Erreur lors du like: ' + error.message, 'error');
        }
    }

    // Mettre à jour un bouton de like
    updateLikeButton(menuId, likesCount, isLiked) {
        const button = document.querySelector(`.like-btn[data-menu-id="${menuId}"]`);
        if (button) {
            button.classList.toggle('liked', isLiked);
            const countSpan = button.querySelector('.like-count');
            if (countSpan) {
                countSpan.textContent = likesCount;
            }
        }
    }

    // Mettre à jour tous les boutons de like
    updateAllLikeButtons() {
        this.userLikes.forEach((isLiked, menuId) => {
            const button = document.querySelector(`.like-btn[data-menu-id="${menuId}"]`);
            if (button) {
                button.classList.toggle('liked', isLiked);
            }
        });
    }

    // Basculer le statut "vedette" (admin seulement)
    async toggleFeatured(menuId) {
        if (!this.isAdmin()) {
            this.showNotification('Accès non autorisé', 'error');
            return;
        }

        try {
            const toggle = document.querySelector(`.featured-toggle[data-menu-id="${menuId}"]`);
            const isCurrentlyFeatured = toggle?.dataset.featured === 'true';
            
            const response = await this.apiCall('/menu/likes.php', {
                action: 'update_featured',
                menu_item_id: menuId,
                is_featured: !isCurrentlyFeatured
            }, 'POST');
            
            if (response.success) {
                if (toggle) {
                    toggle.dataset.featured = (!isCurrentlyFeatured).toString();
                    toggle.classList.toggle('active', !isCurrentlyFeatured);
                    toggle.innerHTML = !isCurrentlyFeatured ? 
                        '<i class="fas fa-star"></i> Vedette' : 
                        '<i class="far fa-star"></i> Mettre en vedette';
                }
                
                this.showNotification(response.message, 'success');
                
                // Recharger les produits vedettes
                this.loadFeaturedItems();
                
            } else {
                this.showNotification(response.message, 'error');
            }
            
        } catch (error) {
            this.showNotification('Erreur lors de la mise à jour vedette: ' + error.message, 'error');
        }
    }

    // Charger les produits en vedette
    async loadFeaturedItems() {
        try {
            const userId = this.getCurrentUserId();
            const userType = this.getCurrentUserType();
            
            const response = await this.apiCall(`/menu/likes.php?action=featured&user_id=${userId}&user_type=${userType}`);
            
            if (response.success) {
                this.renderFeaturedItems(response.data);
                
                // Émettre un événement
                window.dispatchEvent(new CustomEvent('featured:loaded', {
                    detail: { items: response.data }
                }));
            } else {
                console.warn('Erreur lors du chargement des vedettes:', response.message);
                // Afficher un message par défaut si l'API échoue
                this.renderDefaultFeaturedMessage();
            }
            
        } catch (error) {
            console.warn('Erreur lors du chargement des vedettes:', error);
            // Afficher un message par défaut en cas d'erreur réseau
            this.renderDefaultFeaturedMessage();
        }
    }

    // Afficher un message par défaut pour les vedettes
    renderDefaultFeaturedMessage() {
        const container = document.getElementById('featuredItemsContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="no-featured">
                <i class="fas fa-star"></i>
                <p>Chargement des produits vedettes...</p>
                <small>Veuillez patienter</small>
            </div>
        `;
    }

    // Afficher les produits en vedette
    renderFeaturedItems(items) {
        const container = document.getElementById('featuredItemsContainer');
        if (!container) return;
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="no-featured">
                    <i class="fas fa-star"></i>
                    <p>Aucun produit en vedette pour le moment</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="featured-grid">';
        items.forEach(item => {
            const mediaHtml = item.has_video ? 
                `<div class="video-thumbnail">
                    <i class="fas fa-play"></i>
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : ''}
                </div>` :
                item.image_url ? 
                `<img src="${item.image_url}" alt="${item.name}">` : 
                '<div class="no-image"><i class="fas fa-image"></i></div>';
                
            html += `
                <div class="featured-item" data-item-id="${item.id}" data-likes-count="${item.likes_count}">
                    <div class="featured-badge">
                        <i class="fas fa-star"></i>
                        <span>Vedette</span>
                    </div>
                    <div class="featured-media">
                        ${mediaHtml}
                    </div>
                    <div class="featured-content">
                        <h4>${item.name}</h4>
                        <p>${item.description || ''}</p>
                        <div class="featured-meta">
                            <span class="price">${item.price} FCFA</span>
                            <span class="likes">
                                <i class="fas fa-heart"></i> ${item.likes_count}
                            </span>
                        </div>
                    </div>
                    <div class="featured-actions">
                        <button class="like-btn ${item.is_liked ? 'liked' : ''}" data-menu-id="${item.id}">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${item.likes_count}</span>
                        </button>
                        <button class="btn btn-primary" onclick="window.addToCart({id: ${item.id}})">
                            <i class="fas fa-cart-plus"></i> Commander
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    // Obtenir l'ID de l'utilisateur actuel
    getCurrentUserId() {
        return localStorage.getItem('user_id') || 
               sessionStorage.getItem('user_id') || 
               this.generateGuestId();
    }

    // Générer un ID d'invité
    generateGuestId() {
        let guestId = sessionStorage.getItem('guest_id');
        if (!guestId) {
            guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('guest_id', guestId);
        }
        return guestId;
    }

    // Obtenir le type d'utilisateur actuel
    getCurrentUserType() {
        return localStorage.getItem('user_role') || 
               sessionStorage.getItem('user_role') || 
               'customer';
    }

    // Vérifier si l'utilisateur est admin
    isAdmin() {
        return this.getCurrentUserType() === 'admin';
    }

    // Afficher une invite de connexion
    showLoginPrompt() {
        const modal = document.createElement('div');
        modal.className = 'login-prompt-modal';
        modal.innerHTML = `
            <div class="login-prompt-content">
                <div class="login-prompt-header">
                    <h3><i class="fas fa-heart"></i> Connectez-vous pour aimer</h3>
                    <button class="modal-close" onclick="this.closest('.login-prompt-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="login-prompt-body">
                    <p>Connectez-vous pour pouvoir aimer vos plats préférés et recevoir des recommandations personnalisées.</p>
                    <div class="login-prompt-actions">
                        <button class="btn btn-outline" onclick="this.closest('.login-prompt-modal').remove()">
                            Plus tard
                        </button>
                        <a href="login.html" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt"></i> Se connecter
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
    }

    // Afficher une notification
    showNotification(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback simple
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            
            // Couleurs selon le type
            const colors = {
                success: '#28a745',
                error: '#dc3545',
                info: '#007bff'
            };
            notification.style.background = colors[type] || colors.info;
            
            document.body.appendChild(notification);
            
            // Animation d'entrée
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // Auto-suppression
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    // Appel API générique
    async apiCall(endpoint, data = null, method = 'GET') {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || 'guest_token')
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(this.getApiBase() + endpoint, options);
        return await response.json();
    }

    // Obtenir l'URL de base de l'API
    getApiBase() {
        // Pour le menu likes, adapter le chemin selon le contexte
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/')) {
            // Si on est dans /admin/, remonter d'un niveau
            return '../backend/api';
        } else {
            // Sinon utiliser le chemin relatif depuis la racine
            return '/backend/api';
        }
    }

    // Créer la section des produits vedettes
    createFeaturedSection() {
        const sectionHtml = `
            <section class="section" id="featuredSection">
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="fas fa-star"></i> 
                        Produits en Vedette
                    </h2>
                    <div class="section-subtitle">
                        Les plats préférés de nos clients
                    </div>
                </div>
                <div class="featured-container" id="featuredItemsContainer">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Chargement des vedettes...</p>
                    </div>
                </div>
            </section>
        `;
        
        // Insérer après la section menu
        const menuSection = document.getElementById('menu');
        if (menuSection) {
            menuSection.insertAdjacentHTML('afterend', sectionHtml);
        }
        
        // Charger les vedettes
        this.loadFeaturedItems();
    }
}

// Styles CSS pour le système de likes
const likesStyles = `
<style>
.like-section {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
}

.like-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 15px;
    border: 2px solid #e9ecef;
    border-radius: 25px;
    background: white;
    color: #666;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
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
    transition: transform 0.3s ease;
}

.like-btn:hover i {
    transform: scale(1.2);
}

.like-btn.liked i {
    animation: heartBeat 0.6s ease;
}

.like-count {
    font-weight: 600;
}

.featured-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: linear-gradient(135deg, #d4af37, #f4e4bc);
    color: #333;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 5px;
    z-index: 2;
}

.featured-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.featured-item {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    position: relative;
    transition: transform 0.3s ease;
}

.featured-item:hover {
    transform: translateY(-5px);
}

.featured-media {
    position: relative;
    height: 200px;
    overflow: hidden;
}

.featured-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.video-thumbnail {
    position: relative;
    width: 100%;
    height: 100%;
}

.video-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.video-thumbnail i {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    color: white;
    background: rgba(0,0,0,0.7);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.featured-content {
    padding: 35px;
}

.featured-content h4 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 1.2rem;
}

.featured-content p {
    margin: 0 0 15px 0;
    color: #666;
    line-height: 1.5;
}

.featured-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.price {
    font-weight: 600;
    color: #d4af37;
    font-size: 1.1rem;
}

.likes {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #ff6b6b;
    font-size: 0.9rem;
}

.featured-actions {
    display: flex;
    gap: 10px;
    padding: 0 20px 20px;
}

.featured-actions .like-btn {
    flex: 1;
}

.featured-toggle {
    padding: 6px 12px;
    border: 1px solid #d4af37;
    border-radius: 15px;
    background: white;
    color: #d4af37;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.3s ease;
}

.featured-toggle:hover,
.featured-toggle.active {
    background: #d4af37;
    color: white;
}

.login-prompt-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.login-prompt-modal.show {
    opacity: 1;
    visibility: visible;
}

.login-prompt-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    overflow: hidden;
}

.login-prompt-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.login-prompt-header h3 {
    margin: 0;
    color: #333;
}

.login-prompt-body {
    padding: 35px;
}

.login-prompt-body p {
    margin: 0 0 20px 0;
    color: #666;
    line-height: 1.5;
}

.login-prompt-actions {
    display: flex;
    gap: 10px;
}

.no-featured {
    text-align: center;
    padding: 40px;
    color: #666;
}

.no-featured i {
    font-size: 3rem;
    color: #ddd;
    margin-bottom: 15px;
}

@keyframes heartBeat {
    0% { transform: scale(1); }
    25% { transform: scale(1.3); }
    50% { transform: scale(1); }
    75% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

@media (max-width: 768px) {
    .featured-grid {
        grid-template-columns: 1fr;
    }
    
    .like-section {
        justify-content: center;
    }
    
    .featured-actions {
        flex-direction: column;
    }
    
    .featured-actions .like-btn {
        order: 2;
    }
    
    .featured-actions .btn {
        order: 1;
    }
}
</style>
`;

// Ajouter les styles au document
if (!document.querySelector('#likes-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'likes-styles';
    styleEl.innerHTML = likesStyles;
    document.head.appendChild(styleEl);
}

// Initialiser le gestionnaire de likes
window.likesManager = new MenuLikesManager();

// Créer la section vedettes au chargement
document.addEventListener('DOMContentLoaded', () => {
    window.likesManager.createFeaturedSection();
});

// Exposer les fonctions globales
window.toggleLike = function(menuId) {
    window.likesManager.toggleLike(menuId);
};

window.toggleFeatured = function(menuId) {
    window.likesManager.toggleFeatured(menuId);
};

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuLikesManager;
}
