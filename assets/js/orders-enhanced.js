/**
 * Enhanced Orders Page Management with Role Support
 * Gestion améliorée des commandes avec support des rôles (client, livreur, admin)
 */

class EnhancedOrdersManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentFilter = 'all';
        this.deliveryFilter = 'all';
        this.userRole = null;
        this.isLoading = false;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserRole();
        this.loadOrders();
        this.startAutoRefresh();
    }

    bindEvents() {
        const filterSelect = document.getElementById('orderStatusFilter');
        const refreshBtn = document.getElementById('refreshOrdersBtn');

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterOrders();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadOrders(true);
            });
        }
    }

    async loadUserRole() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.showError('Utilisateur non connecté');
                this.renderAuthRequired();
                return;
            }

            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/user/profile.php`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    this.userRole = data.user.role;
                    this.updateUIForRole();
                }
            }
        } catch (error) {
            console.error('Erreur loadUserRole:', error);
            this.userRole = 'client'; // Par défaut
            this.updateUIForRole();
        }
    }

    updateUIForRole() {
        const roleInfo = document.getElementById('userRoleInfo');
        const ordersHead = document.querySelector('.orders-page-head p');
        
        // Nettoyer les filtres et options précédents
        this.clearRoleSpecificElements();
        
        if (this.userRole === 'delivery') {
            // Livreur : voir les commandes qui lui sont assignées
            if (roleInfo) {
                roleInfo.textContent = 'Espace livreur : gérez vos livraisons assignées.';
            }
            if (ordersHead) {
                ordersHead.textContent = 'Suivez les commandes qui vous sont assignées et gérez vos livraisons.';
            }
            
            // Ajouter un filtre spécial pour les livreurs
            this.addDeliveryFilter();
            
            // Filtrer par défaut les commandes assignées
            this.currentFilter = 'assigned';
            const filterSelect = document.getElementById('orderStatusFilter');
            if (filterSelect) {
                filterSelect.value = 'assigned';
            }
            
        } else if (this.userRole === 'admin') {
            // Admin : voir toutes les commandes avec options supplémentaires
            if (roleInfo) {
                roleInfo.textContent = 'Panel d\'administration : gestion complète des commandes.';
            }
            if (ordersHead) {
                ordersHead.textContent = 'Administration : suivez toutes les commandes et gérez le système.';
            }
            
            // Ajouter des options d'administration
            this.addAdminOptions();
            
        } else {
            // Client : comportement normal
            if (roleInfo) {
                roleInfo.textContent = 'Espace client : suivez vos commandes et votre historique.';
            }
            if (ordersHead) {
                ordersHead.textContent = 'Suivez l\'état de vos commandes et consultez votre historique.';
            }
        }
    }

    clearRoleSpecificElements() {
        // Supprimer les éléments spécifiques aux rôles
        const deliveryFilter = document.querySelector('.delivery-filter');
        const adminOptions = document.querySelector('.admin-options');
        
        if (deliveryFilter) deliveryFilter.remove();
        if (adminOptions) adminOptions.remove();
    }

    addDeliveryFilter() {
        const actionsContainer = document.querySelector('.orders-page-actions');
        if (!actionsContainer) return;

        // Ajouter un filtre pour les commandes assignées au livreur
        const deliveryFilter = document.createElement('div');
        deliveryFilter.className = 'delivery-filter';
        deliveryFilter.innerHTML = `
            <label class="orders-filter-label">Mes livraisons:</label>
            <select id="deliveryFilter" class="orders-filter-select">
                <option value="all">Toutes</option>
                <option value="assigned">Assignées</option>
                <option value="preparing">En préparation</option>
                <option value="delivery">En livraison</option>
                <option value="completed">Livrées</option>
            </select>
        `;

        actionsContainer.insertBefore(deliveryFilter, actionsContainer.firstChild.nextSibling);
        
        // Ajouter l'écouteur d'événements
        const deliveryFilterSelect = document.getElementById('deliveryFilter');
        if (deliveryFilterSelect) {
            deliveryFilterSelect.addEventListener('change', (e) => {
                this.deliveryFilter = e.target.value;
                this.filterOrders();
            });
        }
    }

    addAdminOptions() {
        const actionsContainer = document.querySelector('.orders-page-actions');
        if (!actionsContainer) return;

        // Ajouter des boutons d'administration
        const adminOptions = document.createElement('div');
        adminOptions.className = 'admin-options';
        adminOptions.innerHTML = `
            <button type="button" id="exportOrdersBtn" class="btn btn-outline">
                <i class="fas fa-download"></i> Exporter
            </button>
            <button type="button" id="assignDeliveryBtn" class="btn btn-primary">
                <i class="fas fa-truck"></i> Assigner livreur
            </button>
        `;

        actionsContainer.appendChild(adminOptions);
        
        // Ajouter les écouteurs d'événements
        document.getElementById('exportOrdersBtn').addEventListener('click', () => this.exportOrders());
        document.getElementById('assignDeliveryBtn').addEventListener('click', () => this.showAssignDeliveryModal());
    }

    async loadOrders(forceRefresh = false) {
        if (this.isLoading && !forceRefresh) return;

        this.setLoading(true);
        this.hideError();

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.showError('Veuillez vous connecter pour voir vos commandes');
                this.renderAuthRequired();
                return;
            }

            // Construire l'URL en fonction du rôle
            let apiUrl = `${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/list.php`;
            if (this.userRole === 'delivery') {
                apiUrl = `${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/delivery-orders.php`;
            }

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des commandes');
            }

            const data = await response.json();
            
            if (data.success) {
                this.orders = data.orders || [];
                this.filterOrders();
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }
        } catch (error) {
            console.error('Erreur loadOrders:', error);
            this.showError('Impossible de charger vos commandes. Veuillez réessayer.');
        } finally {
            this.setLoading(false);
        }
    }

    filterOrders() {
        // Filtrer en fonction du rôle et des filtres actifs
        if (this.userRole === 'delivery') {
            // Pour les livreurs, filtrer par statut de livraison ET par filtre de livraison
            this.filteredOrders = this.orders.filter(order => {
                const statusMatch = this.currentFilter === 'all' || order.status === this.currentFilter;
                const deliveryMatch = this.deliveryFilter === 'all' || 
                    (this.deliveryFilter === 'assigned' && order.status === 'assigned') ||
                    (this.deliveryFilter === 'preparing' && order.status === 'preparing') ||
                    (this.deliveryFilter === 'delivery' && order.status === 'delivery') ||
                    (this.deliveryFilter === 'completed' && order.status === 'completed');
                
                return statusMatch && deliveryMatch;
            });
        } else {
            // Pour les clients et admins, filtrage normal
            if (this.currentFilter === 'all') {
                this.filteredOrders = [...this.orders];
            } else {
                this.filteredOrders = this.orders.filter(order => order.status === this.currentFilter);
            }
        }
        
        this.renderOrders();
    }

    renderOrders() {
        const container = document.getElementById('ordersList');
        const emptyContainer = document.getElementById('ordersEmpty');

        if (!container) return;

        if (this.filteredOrders.length === 0) {
            container.style.display = 'none';
            if (emptyContainer) {
                emptyContainer.style.display = 'block';
                emptyContainer.querySelector('h3').textContent = 'Aucune commande trouvée';
                emptyContainer.querySelector('p').textContent = this.getEmptyMessage();
            }
            return;
        }

        if (emptyContainer) {
            emptyContainer.style.display = 'none';
        }
        container.style.display = 'grid';

        container.innerHTML = this.filteredOrders.map(order => this.renderOrderCard(order)).join('');
        
        // Ajouter les événements aux cartes de commande
        this.bindOrderEvents();
    }

    getEmptyMessage() {
        if (this.userRole === 'delivery') {
            return 'Aucune livraison assignée pour le moment.';
        } else if (this.userRole === 'admin') {
            return 'Aucune commande dans le système.';
        } else {
            return 'Commencez par ajouter des plats ou produits à votre panier.';
        }
    }

    renderOrderCard(order) {
        const statusConfig = this.getStatusConfig(order.status);
        const progressPercentage = this.calculateProgress(order.status);
        const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <div class="order-number">
                            <span class="order-label">Commande</span>
                            <span class="order-id">#${String(order.id).padStart(6, '0')}</span>
                        </div>
                        <div class="order-date">
                            <i class="fas fa-calendar"></i>
                            <span>${orderDate}</span>
                        </div>
                    </div>
                    <div class="order-status">
                        <span class="status-badge ${statusConfig.class}">
                            <i class="fas ${statusConfig.icon}"></i>
                            ${statusConfig.label}
                        </span>
                    </div>
                </div>

                <div class="order-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-steps">
                        ${this.renderProgressSteps(order.status)}
                    </div>
                </div>

                <div class="order-content">
                    <div class="order-items-preview">
                        ${this.renderItemsPreview(order.items)}
                    </div>
                    
                    <div class="order-details">
                        <div class="order-totals">
                            <div class="total-row">
                                <span>Sous-total:</span>
                                <span>${this.formatMoney(order.subtotal || 0)}</span>
                            </div>
                            <div class="total-row">
                                <span>Livraison:</span>
                                <span>${this.formatMoney(order.delivery_price || 0)}</span>
                            </div>
                            <div class="total-row main-total">
                                <span>Total:</span>
                                <span>${this.formatMoney(order.total || 0)}</span>
                            </div>
                        </div>
                        
                        <div class="order-delivery">
                            <div class="delivery-info">
                                <i class="fas ${order.delivery_type === 'pickup' ? 'fa-store' : 'fa-truck'}"></i>
                                <span>${order.delivery_type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}</span>
                            </div>
                            ${order.delivery_address ? `
                                <div class="delivery-address">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${order.delivery_address}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="order-actions">
                    ${this.renderActionButtons(order)}
                </div>

                <div class="order-details-panel" id="order-details-${order.id}" style="display: none;">
                    ${this.renderOrderDetails(order)}
                </div>
            </div>
        `;
    }

    renderProgressSteps(currentStatus) {
        const steps = [
            { key: 'pending', label: 'En attente', icon: 'fa-clock' },
            { key: 'assigned', label: 'Assignée', icon: 'fa-user-check' },
            { key: 'preparing', label: 'En préparation', icon: 'fa-utensils' },
            { key: 'delivery', label: 'En livraison', icon: 'fa-truck' },
            { key: 'completed', label: 'Terminée', icon: 'fa-check-circle' }
        ];

        const currentStepIndex = steps.findIndex(step => step.key === currentStatus);

        return steps.map((step, index) => `
            <div class="progress-step ${index <= currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'active' : ''}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-label">${step.label}</div>
            </div>
        `).join('');
    }

    renderItemsPreview(items) {
        if (!items || items.length === 0) return '<span class="no-items">Aucun article</span>';
        
        const previewItems = items.slice(0, 3);
        const remainingCount = items.length - 3;

        return `
            <div class="items-list">
                ${previewItems.map(item => `
                    <div class="item-preview">
                        ${item.image_url ? `
                            <img src="${item.image_url}" alt="${item.name}" class="item-image">
                        ` : `
                            <div class="item-image-placeholder">
                                <i class="fas fa-utensils"></i>
                            </div>
                        `}
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-quantity">x${item.quantity || 1}</div>
                        </div>
                    </div>
                `).join('')}
                ${remainingCount > 0 ? `
                    <div class="more-items">
                        +${remainingCount} article${remainingCount > 1 ? 's' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderOrderDetails(order) {
        return `
            <div class="order-details-content">
                <div class="details-section">
                    <h4><i class="fas fa-receipt"></i> Articles commandés</h4>
                    <div class="items-details">
                        ${(order.items || []).map(item => `
                            <div class="item-detail">
                                ${item.image_url ? `
                                    <img src="${item.image_url}" alt="${item.name}" class="item-detail-image">
                                ` : ''}
                                <div class="item-detail-info">
                                    <div class="item-detail-name">${item.name}</div>
                                    ${item.description ? `<div class="item-detail-description">${item.description}</div>` : ''}
                                    <div class="item-detail-meta">
                                        <span class="item-detail-price">${this.formatMoney(item.price || 0)}</span>
                                        <span class="item-detail-quantity">x${item.quantity || 1}</span>
                                        <span class="item-detail-total">${this.formatMoney((item.price || 0) * (item.quantity || 1))}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="details-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Informations de livraison</h4>
                    <div class="delivery-details">
                        <div class="detail-row">
                            <span>Type:</span>
                            <span>${order.delivery_type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}</span>
                        </div>
                        ${order.delivery_address ? `
                            <div class="detail-row">
                                <span>Adresse:</span>
                                <span>${order.delivery_address}</span>
                            </div>
                        ` : ''}
                        ${order.customer_phone ? `
                            <div class="detail-row">
                                <span>Téléphone:</span>
                                <span>${order.customer_phone}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${order.notes ? `
                    <div class="details-section">
                        <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                        <div class="order-notes">${order.notes}</div>
                    </div>
                ` : ''}

                <div class="details-section">
                    <h4><i class="fas fa-info-circle"></i> Suivi de la commande</h4>
                    <div class="tracking-info">
                        <div class="detail-row">
                            <span>Commande créée:</span>
                            <span>${new Date(order.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                        ${order.assigned_at ? `
                            <div class="detail-row">
                                <span>Assignée:</span>
                                <span>${new Date(order.assigned_at).toLocaleString('fr-FR')}</span>
                            </div>
                        ` : ''}
                        ${order.preparing_at ? `
                            <div class="detail-row">
                                <span>En préparation:</span>
                                <span>${new Date(order.preparing_at).toLocaleString('fr-FR')}</span>
                            </div>
                        ` : ''}
                        ${order.delivery_at ? `
                            <div class="detail-row">
                                <span>En livraison:</span>
                                <span>${new Date(order.delivery_at).toLocaleString('fr-FR')}</span>
                            </div>
                        ` : ''}
                        ${order.completed_at ? `
                            <div class="detail-row">
                                <span>Terminée:</span>
                                <span>${new Date(order.completed_at).toLocaleString('fr-FR')}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderActionButtons(order) {
        let buttons = '';
        
        if (this.userRole === 'delivery') {
            // Actions pour les livreurs
            if (order.status === 'assigned') {
                buttons += `
                    <button class="btn btn-primary btn-sm" onclick="enhancedOrdersManager.startDelivery('${order.id}')">
                        <i class="fas fa-play"></i> Commencer livraison
                    </button>
                `;
            }
            
            if (order.status === 'delivery') {
                buttons += `
                    <button class="btn btn-success btn-sm" onclick="enhancedOrdersManager.completeDelivery('${order.id}')">
                        <i class="fas fa-check"></i> Livrer
                    </button>
                `;
            }
            
        } else if (this.userRole === 'admin') {
            // Actions pour les admins
            if (order.status === 'pending') {
                buttons += `
                    <button class="btn btn-danger btn-sm" onclick="enhancedOrdersManager.cancelOrder('${order.id}')">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="enhancedOrdersManager.assignDelivery('${order.id}')">
                        <i class="fas fa-truck"></i> Assigner livreur
                    </button>
                `;
            }
            
            if (order.status === 'completed') {
                buttons += `
                    <button class="btn btn-outline btn-sm" onclick="enhancedOrdersManager.viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i> Voir détails
                    </button>
                `;
            }
        } else {
            // Actions pour les clients
            if (order.status === 'pending') {
                buttons += `
                    <button class="btn btn-danger btn-sm" onclick="enhancedOrdersManager.cancelOrder('${order.id}')">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                `;
            }
            
            if (order.status === 'delivery') {
                buttons += `
                    <button class="btn btn-success btn-sm" onclick="enhancedOrdersManager.confirmDelivery('${order.id}')">
                        <i class="fas fa-check"></i> Confirmer réception
                    </button>
                `;
            }
            
            if (order.status === 'completed') {
                buttons += `
                    <button class="btn btn-primary btn-sm" onclick="enhancedOrdersManager.reorder('${order.id}')">
                        <i class="fas fa-redo"></i> Recommander
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="enhancedOrdersManager.rateOrder('${order.id}')">
                        <i class="fas fa-star"></i> Noter
                    </button>
                `;
            }
        }
        
        return buttons;
    }

    getStatusConfig(status) {
        const configs = {
            pending: { label: 'En attente', icon: 'fa-clock', class: 'status-pending' },
            assigned: { label: 'Assignée', icon: 'fa-user-check', class: 'status-assigned' },
            preparing: { label: 'En préparation', icon: 'fa-utensils', class: 'status-preparing' },
            delivery: { label: 'En livraison', icon: 'fa-truck', class: 'status-delivery' },
            completed: { label: 'Terminée', icon: 'fa-check-circle', class: 'status-completed' },
            cancelled: { label: 'Annulée', icon: 'fa-times-circle', class: 'status-cancelled' }
        };
        
        return configs[status] || configs.pending;
    }

    calculateProgress(status) {
        const progressMap = {
            pending: 20,
            assigned: 40,
            preparing: 60,
            delivery: 80,
            completed: 100,
            cancelled: 0
        };
        
        return progressMap[status] || 0;
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount || 0);
    }

    toggleOrderDetails(orderId) {
        const detailsPanel = document.getElementById(`order-details-${orderId}`);
        if (detailsPanel) {
            const isVisible = detailsPanel.style.display !== 'none';
            detailsPanel.style.display = isVisible ? 'none' : 'block';
            
            // Fermer les autres panneaux de détails
            document.querySelectorAll('.order-details-panel').forEach(panel => {
                if (panel.id !== `order-details-${orderId}`) {
                    panel.style.display = 'none';
                }
            });
        }
    }

    async cancelOrder(orderId) {
        if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/cancel.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_id: orderId })
            });

            const data = await response.json();
            if (data.success) {
                this.showNotification('Commande annulée avec succès', 'success');
                this.loadOrders();
            } else {
                throw new Error(data.message || 'Erreur lors de l\'annulation');
            }
        } catch (error) {
            console.error('Erreur cancelOrder:', error);
            this.showNotification('Erreur lors de l\'annulation de la commande', 'error');
        }
    }

    async confirmDelivery(orderId) {
        if (!confirm('Confirmez-vous avoir reçu cette commande ?')) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/confirm-delivery.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_id: orderId })
            });

            const data = await response.json();
            if (data.success) {
                this.showNotification('Livraison confirmée. Merci !', 'success');
                this.loadOrders();
            } else {
                throw new Error(data.message || 'Erreur lors de la confirmation');
            }
        } catch (error) {
            console.error('Erreur confirmDelivery:', error);
            this.showNotification('Erreur lors de la confirmation de livraison', 'error');
        }
    }

    async startDelivery(orderId) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/start-delivery.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_id: orderId })
            });

            const data = await response.json();
            if (data.success) {
                this.showNotification('Livraison démarrée', 'success');
                this.loadOrders();
            } else {
                throw new Error(data.message || 'Erreur lors du démarrage');
            }
        } catch (error) {
            console.error('Erreur startDelivery:', error);
            this.showNotification('Erreur lors du démarrage de la livraison', 'error');
        }
    }

    async completeDelivery(orderId) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/complete-delivery.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_id: orderId })
            });

            const data = await response.json();
            if (data.success) {
                this.showNotification('Livraison terminée avec succès', 'success');
                this.loadOrders();
            } else {
                throw new Error(data.message || 'Erreur lors de la finalisation');
            }
        } catch (error) {
            console.error('Erreur completeDelivery:', error);
            this.showNotification('Erreur lors de la finalisation de la livraison', 'error');
        }
    }

    async assignDelivery(orderId) {
        // Afficher un modal pour choisir le livreur
        this.showNotification('Fonctionnalité d\'assignation bientôt disponible', 'info');
    }

    reorder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // Ajouter les articles au panier
        if (typeof window.addToCart === 'function') {
            (order.items || []).forEach(item => {
                for (let i = 0; i < (item.quantity || 1); i++) {
                    window.addToCart(item);
                }
            });
            
            this.showNotification('Articles ajoutés au panier', 'success');
            
            // Rediriger vers la page de commande
            setTimeout(() => {
                window.location.href = 'index.html#order';
            }, 1000);
        } else {
            this.showNotification('Fonctionnalité non disponible', 'error');
        }
    }

    rateOrder(orderId) {
        // Ouvrir un modal de notation
        this.showNotification('Fonctionnalité de notation bientôt disponible', 'info');
    }

    exportOrders() {
        // Exporter les commandes en CSV
        this.showNotification('Export CSV bientôt disponible', 'info');
    }

    viewOrderDetails(orderId) {
        this.toggleOrderDetails(orderId);
    }

    showAssignDeliveryModal() {
        this.showNotification('Modal d\'assignation bientôt disponible', 'info');
    }

    bindOrderEvents() {
        // Les événements sont déjà gérés par les onclick dans le HTML
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const loadingEl = document.getElementById('ordersLoading');
        const listEl = document.getElementById('ordersList');
        
        if (loadingEl) {
            loadingEl.style.display = isLoading ? 'block' : 'none';
        }
        if (listEl) {
            listEl.style.display = isLoading ? 'none' : 'grid';
        }
    }

    showError(message = 'Une erreur est survenue') {
        const errorEl = document.getElementById('ordersError');
        const listEl = document.getElementById('ordersList');
        
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.querySelector('p').textContent = message;
        }
        if (listEl) {
            listEl.style.display = 'none';
        }
    }

    hideError() {
        const errorEl = document.getElementById('ordersError');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    renderAuthRequired() {
        const container = document.getElementById('ordersList');
        const emptyContainer = document.getElementById('ordersEmpty');
        
        if (container) {
            container.style.display = 'none';
        }
        if (emptyContainer) {
            emptyContainer.style.display = 'block';
            emptyContainer.innerHTML = `
                <i class="fas fa-user-lock"></i>
                <h3>Connexion requise</h3>
                <p>Connectez-vous pour voir vos commandes.</p>
                <a href="login.html?redirect=orders" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Se connecter
                </a>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Créer une notification simple
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

    startAutoRefresh() {
        // Rafraîchir toutes les 30 secondes
        this.refreshInterval = setInterval(() => {
            this.loadOrders();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialiser le gestionnaire de commandes amélioré
let enhancedOrdersManager;

document.addEventListener('DOMContentLoaded', function() {
    // S'assurer que le header est injecté
    if (typeof injectSharedHeaderFooter === 'function') {
        injectSharedHeaderFooter();
    }
    
    enhancedOrdersManager = new EnhancedOrdersManager();
});

// Nettoyer lors du déchargement de page
window.addEventListener('beforeunload', function() {
    if (enhancedOrdersManager) {
        enhancedOrdersManager.stopAutoRefresh();
    }
});
