// Charger toutes les commandes avec pagination
async function loadAllOrders(page = 1, limit = 20, filters = {}) {
    try {
        // Construire l'URL avec les paramètres
        const params = new URLSearchParams({
            page: page,
            limit: limit,
            ...filters
        });
        
        const response = await fetch(`${API_BASE_URL}/orders/all-orders.php?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayOrdersWithPagination(data.orders, data.pagination);
            return data;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        document.getElementById('ordersContainer').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Impossible de charger vos commandes</p>
                <button class="btn" onclick="loadAllOrders()">Réessayer</button>
            </div>
        `;
        throw error;
    }
}

// Afficher les commandes avec pagination
function displayOrdersWithPagination(orders, pagination) {
    const container = document.getElementById('ordersContainer');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <h3>Aucune commande</h3>
                <p>Vous n'avez pas encore passé de commande.</p>
                <a href="#new-order" class="btn">Passer une commande</a>
            </div>
        `;
        return;
    }
    
    // Afficher les commandes
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-info">
                <h4>Commande #${order.id}</h4>
                <div class="order-meta">
                    <span><i class="far fa-calendar"></i> ${new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
                    <span><i class="fas fa-money-bill-wave"></i> ${order.final_price} FCFA</span>
                    <span><i class="fas fa-box"></i> ${order.items_count} article(s)</span>
                    ${order.customer_name && currentUser?.is_admin ? `
                        <span><i class="fas fa-user"></i> ${order.customer_name}</span>
                    ` : ''}
                </div>
            </div>
            <div class="order-status">
                <span class="status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-actions">
                <button class="btn btn-outline" onclick="viewOrderDetails(${order.id})" title="Voir les détails">
                    <i class="fas fa-eye"></i>
                </button>
                ${order.status === 'pending' ? `
                    <button class="btn btn-danger" onclick="cancelOrder(${order.id})" title="Annuler la commande">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    // Ajouter la pagination si nécessaire
    if (pagination.pages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        
        let paginationHtml = `
            <div class="pagination-info">
                Page ${pagination.page} sur ${pagination.pages} - ${pagination.total} commandes
            </div>
            <div class="pagination-controls">
        `;
        
        // Bouton précédent
        if (pagination.page > 1) {
            paginationHtml += `
                <button class="pagination-btn" onclick="loadAllOrders(${pagination.page - 1})">
                    <i class="fas fa-chevron-left"></i> Précédent
                </button>
            `;
        }
        
        // Numéros de page
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="pagination-btn ${i === pagination.page ? 'active' : ''}" 
                        onclick="loadAllOrders(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Bouton suivant
        if (pagination.page < pagination.pages) {
            paginationHtml += `
                <button class="pagination-btn" onclick="loadAllOrders(${pagination.page + 1})">
                    Suivant <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
        
        paginationHtml += '</div>';
        paginationDiv.innerHTML = paginationHtml;
        container.appendChild(paginationDiv);
    }
    
    // Ajouter le CSS pour la pagination
    if (!document.querySelector('#pagination-styles')) {
        const style = document.createElement('style');
        style.id = 'pagination-styles';
        style.textContent = `
            .pagination {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #E0E0E0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .pagination-info {
                color: #666666;
                font-size: 0.9rem;
            }
            
            .pagination-controls {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .pagination-btn {
                padding: 8px 15px;
                border: 1px solid #E0E0E0;
                background: #FFFFFF;
                color: #666666;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 0.9rem;
                min-width: 40px;
                text-align: center;
            }
            
            .pagination-btn:hover {
                border-color: #D4AF37;
                color: #D4AF37;
                background: rgba(212, 175, 55, 0.05);
            }
            
            .pagination-btn.active {
                background: #D4AF37;
                color: #FFFFFF;
                border-color: #D4AF37;
            }
            
            .pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .order-actions {
                display: flex;
                gap: 10px;
            }
            
            .order-actions .btn {
                padding: 8px 12px;
                min-width: auto;
            }
            
            .btn-danger {
                background: rgba(220, 53, 69, 0.1);
                color: #DC3545;
                border: 1px solid #DC3545;
            }
            
            .btn-danger:hover {
                background: #DC3545;
                color: #FFFFFF;
            }
        `;
        document.head.appendChild(style);
    }
}

// Voir les détails d'une commande
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/order-details.php?id=${orderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showOrderDetailsModal(data.order);
        } else {
            showNotification(data.message || 'Erreur lors du chargement des détails', 'error');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des détails:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

// Afficher les détails d'une commande dans un modal
function showOrderDetailsModal(order) {
    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('orderDetailsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'orderDetailsModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
        
        // Style CSS pour le modal des détails
        const style = document.createElement('style');
        style.textContent = `
            .order-details-modal {
                background: #FFFFFF;
                border-radius: 15px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                animation: modalSlideIn 0.3s ease;
            }
            
            .order-details-header {
                padding: 25px;
                border-bottom: 1px solid #E0E0E0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #F8F9FA;
                border-radius: 15px 15px 0 0;
            }
            
            .order-details-header h3 {
                margin: 0;
                color: #1A1A1A;
                font-size: 1.5rem;
            }
            
            .order-details-body {
                padding: 25px;
            }
            
            .order-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #F5F5F5;
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .info-label {
                color: #666666;
                font-size: 0.9rem;
            }
            
            .info-value {
                color: #1A1A1A;
                font-weight: 500;
                font-size: 1.1rem;
            }
            
            .items-list {
                margin-bottom: 30px;
            }
            
            .items-list h4 {
                color: #1A1A1A;
                margin-bottom: 15px;
                font-size: 1.2rem;
            }
            
            .item-row {
                display: flex;
                justify-content: space-between;
                padding: 15px;
                border-bottom: 1px solid #E0E0E0;
                align-items: center;
            }
            
            .item-row:last-child {
                border-bottom: none;
            }
            
            .item-name {
                flex: 1;
                color: #1A1A1A;
            }
            
            .item-quantity {
                margin: 0 20px;
                color: #666666;
            }
            
            .item-price {
                font-weight: 600;
                color: #1A1A1A;
                min-width: 100px;
                text-align: right;
            }
            
            .order-total {
                background: #F8F9FA;
                padding: 35px;
                border-radius: 10px;
                margin-top: 20px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .total-final {
                font-size: 1.3rem;
                font-weight: 700;
                color: #D4AF37;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 2px solid #E0E0E0;
            }
            
            .order-actions {
                display: flex;
                gap: 15px;
                margin-top: 30px;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Formatage de la date
    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Calculer le total des articles
    let itemsTotal = 0;
    const itemsHtml = order.items?.map(item => {
        itemsTotal += item.unit_price * (item.quantity || 1);
        return `
            <div class="item-row">
                <div class="item-name">
                    <strong>${item.item_name}</strong>
                    <div class="item-type">${item.item_type === 'menu' ? 'Menu' : 'Produit'}</div>
                </div>
                <div class="item-quantity">${item.quantity || 1}x</div>
                <div class="item-price">${item.unit_price * (item.quantity || 1)} FCFA</div>
            </div>
        `;
    }).join('') || '<p>Aucun article dans cette commande</p>';
    
    modal.innerHTML = `
        <div class="order-details-modal">
            <div class="order-details-header">
                <h3><i class="fas fa-receipt"></i> Commande #${order.id}</h3>
                <button class="modal-close" onclick="closeModal('orderDetailsModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="order-details-body">
                <div class="order-info-grid">
                    <div class="info-item">
                        <span class="info-label">Date de commande</span>
                        <span class="info-value">${formattedDate}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Statut</span>
                        <span class="info-value status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Méthode de paiement</span>
                        <span class="info-value">${order.payment_method === 'cash' ? 'Paiement à la livraison' : order.payment_method}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Adresse de livraison</span>
                        <span class="info-value">${order.delivery_address || order.customer_address || 'Non spécifiée'}</span>
                    </div>
                    
                    ${order.customer_name ? `
                        <div class="info-item">
                            <span class="info-label">Client</span>
                            <span class="info-value">${order.customer_name}</span>
                        </div>
                        
                        <div class="info-item">
                            <span class="info-label">Téléphone</span>
                            <span class="info-value">${order.customer_phone || 'Non renseigné'}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="items-list">
                    <h4><i class="fas fa-shopping-basket"></i> Articles commandés</h4>
                    ${itemsHtml}
                </div>
                
                <div class="order-total">
                    <div class="total-row">
                        <span>Sous-total</span>
                        <span>${itemsTotal} FCFA</span>
                    </div>
                    <div class="total-row">
                        <span>Frais de livraison</span>
                        <span>${order.delivery_fee || 1000} FCFA</span>
                    </div>
                    <div class="total-row total-final">
                        <span>Total</span>
                        <span>${order.final_price || order.total_price + (order.delivery_fee || 1000)} FCFA</span>
                    </div>
                </div>
                
                ${order.notes ? `
                    <div class="order-notes">
                        <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                        <p>${order.notes}</p>
                    </div>
                ` : ''}
                
                <div class="order-actions">
                    <button class="btn btn-outline" onclick="closeModal('orderDetailsModal')">
                        <i class="fas fa-times"></i> Fermer
                    </button>
                    ${order.status === 'pending' && !currentUser?.is_admin ? `
                        <button class="btn btn-danger" onclick="cancelOrder(${order.id})">
                            <i class="fas fa-ban"></i> Annuler la commande
                        </button>
                    ` : ''}
                    ${currentUser?.is_admin && order.status !== 'completed' && order.status !== 'cancelled' ? `
                        <button class="btn" onclick="updateOrderStatus(${order.id})">
                            <i class="fas fa-edit"></i> Changer le statut
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Annuler une commande
async function cancelOrder(orderId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/update-status.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                order_id: orderId,
                status: 'cancelled',
                user_notes: 'Commande annulée par le client'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Commande annulée avec succès', 'success');
            closeModal('orderDetailsModal');
            // Recharger les commandes
            loadAllOrders();
        } else {
            showNotification(data.message || 'Erreur lors de l\'annulation', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de l\'annulation:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

// Mettre à jour le statut d'une commande (admin seulement)
async function updateOrderStatus(orderId) {
    const statuses = [
        { value: 'pending', label: 'En attente' },
        { value: 'confirmed', label: 'Confirmée' },
        { value: 'preparing', label: 'En préparation' },
        { value: 'delivery', label: 'En livraison' },
        { value: 'completed', label: 'Terminée' },
        { value: 'cancelled', label: 'Annulée' }
    ];
    
    const statusSelect = statuses.map(status => 
        `<option value="${status.value}">${status.label}</option>`
    ).join('');
    
    const notes = prompt('Ajouter une note pour cette mise à jour (optionnel):', '');
    
    if (notes === null) return; // Annulé par l'utilisateur
    
    const status = prompt(`Choisir le nouveau statut:\n\n${statuses.map(s => `${s.value}: ${s.label}`).join('\n')}\n\nEntrez la valeur:`, 'completed');
    
    if (status === null || !statuses.some(s => s.value === status)) {
        showNotification('Statut invalide', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/update-status.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                order_id: orderId,
                status: status,
                admin_notes: notes || ''
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Statut de commande mis à jour', 'success');
            closeModal('orderDetailsModal');
            // Recharger les commandes
            loadAllOrders();
        } else {
            showNotification(data.message || 'Erreur lors de la mise à jour', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

// Fonction utilitaire pour fermer un modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Mettre à jour la fonction loadUserOrders pour utiliser la nouvelle API
async function loadUserOrders() {
    try {
        const data = await loadAllOrders(1, 10);
        document.getElementById('ordersCount').textContent = data.pagination.total || 0;
    } catch (error) {
        // Gestion d'erreur déjà faite dans loadAllOrders
    }
}
// Fonctions supplémentaires pour le dashboard

// Charger les statistiques de l'utilisateur
async function loadUserStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/stats.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUserStats(data.stats);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Afficher les statistiques de l'utilisateur
function displayUserStats(stats) {
    // Vous pouvez ajouter cette section dans le dashboard
    const statsSection = document.getElementById('userStats');
    if (!statsSection) return;
    
    statsSection.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.global.total_orders}</h3>
                    <p>Commandes totales</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.global.total_spent.toLocaleString('fr-FR')} FCFA</h3>
                    <p>Total dépensé</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calculator"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.global.avg_order_value.toLocaleString('fr-FR')} FCFA</h3>
                    <p>Panier moyen</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.summary.active_orders}</h3>
                    <p>Commandes en cours</p>
                </div>
            </div>
        </div>
        
        ${stats.favorites.length > 0 ? `
        <div class="favorites-section">
            <h4><i class="fas fa-heart"></i> Vos préférés</h4>
            <div class="favorites-list">
                ${stats.favorites.map(fav => `
                    <div class="favorite-item">
                        <span class="favorite-name">${fav.item_name}</span>
                        <span class="favorite-count">Commandé ${fav.order_count} fois</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;
}

// Rechercher des commandes
async function searchOrders(searchTerm) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/search.php?q=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.results);
        }
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showNotification('Erreur lors de la recherche', 'error');
    }
}

// Suivre une commande avec code de suivi
async function trackOrder(trackingCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/track.php?tracking_code=${encodeURIComponent(trackingCode)}`);
        
        const data = await response.json();
        
        if (data.success) {
            displayTrackingInfo(data);
        } else {
            showNotification(data.message || 'Code de suivi invalide', 'error');
        }
    } catch (error) {
        console.error('Erreur lors du suivi:', error);
        showNotification('Erreur lors du suivi de la commande', 'error');
    }
}

// Annuler une commande
async function cancelOrder(orderId, reason = '') {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/update-status.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                order_id: orderId,
                status: 'cancelled',
                reason: reason
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Commande annulée avec succès', 'success');
            // Recharger les commandes
            loadUserOrders();
        } else {
            showNotification(data.message || 'Erreur lors de l\'annulation', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de l\'annulation:', error);
        showNotification('Erreur lors de l\'annulation de la commande', 'error');
    }
}

// Voir les détails d'une commande
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/order-details.php?id=${orderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayOrderDetailsModal(data.order);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des détails:', error);
        showNotification('Erreur lors du chargement des détails', 'error');
    }
}

// Afficher les détails d'une commande dans un modal
function displayOrderDetailsModal(order) {
    // Créer le modal
    const modal = document.createElement('div');
    modal.className = 'order-details-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Commande #${order.id}</h3>
                <button class="modal-close" onclick="this.closest('.order-details-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="order-info-section">
                    <div class="info-row">
                        <span class="info-label">Statut:</span>
                        <span class="info-value status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">${new Date(order.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Total:</span>
                        <span class="info-value">${order.final_price} FCFA</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Adresse de livraison:</span>
                        <span class="info-value">${order.delivery_address}</span>
                    </div>
                </div>
                
                <div class="order-items-section">
                    <h4>Articles (${order.items_count})</h4>
                    <div class="items-list">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <div class="item-info">
                                    <span class="item-name">${item.item_name}</span>
                                    <span class="item-type">${item.item_type === 'menu' ? 'Menu' : 'Produit'}</span>
                                </div>
                                <div class="item-quantity">x${item.quantity}</div>
                                <div class="item-price">${item.unit_price * item.quantity} FCFA</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="order-summary">
                    <div class="summary-row">
                        <span>Sous-total:</span>
                        <span>${order.total_price} FCFA</span>
                    </div>
                    <div class="summary-row">
                        <span>Frais de livraison:</span>
                        <span>${order.delivery_fee} FCFA</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span>${order.final_price} FCFA</span>
                    </div>
                </div>
                
                ${order.status === 'pending' ? `
                <div class="order-actions">
                    <button class="btn btn-danger" onclick="cancelOrder(${order.id})">
                        <i class="fas fa-times"></i> Annuler la commande
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Style CSS pour le modal
    const style = document.createElement('style');
    style.textContent = `
        .order-details-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .order-details-modal .modal-content {
            background: white;
            border-radius: 10px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            animation: modalSlideIn 0.3s ease;
        }
        
        @keyframes modalSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
            padding: 35px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #1a1a1a;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            color: #666;
            cursor: pointer;
        }
        
        .modal-body {
            padding: 35px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f5f5f5;
        }
        
        .info-label {
            color: #666;
            font-weight: 500;
        }
        
        .info-value {
            color: #1a1a1a;
        }
        
        .order-items-section {
            margin-top: 20px;
        }
        
        .order-items-section h4 {
            color: #1a1a1a;
            margin-bottom: 15px;
        }
        
        .order-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
            margin-bottom: 8px;
        }
        
        .item-info {
            flex: 1;
        }
        
        .item-name {
            display: block;
            font-weight: 500;
            color: #1a1a1a;
        }
        
        .item-type {
            font-size: 0.8rem;
            color: #666;
            background: #e9ecef;
            padding: 2px 8px;
            border-radius: 10px;
        }
        
        .order-summary {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .summary-row.total {
            font-size: 1.2rem;
            font-weight: bold;
            color: #d4af37;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e0e0e0;
        }
        
        .order-actions {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
    `;
    document.head.appendChild(style);
}

// Mettre à jour l'initialisation pour inclure les nouvelles fonctionnalités
document.addEventListener('DOMContentLoaded', function() {
    // ... code existant ...
    
    // Ajouter un champ de recherche dans le dashboard si nécessaire
    const searchInput = document.getElementById('orderSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchOrders(this.value);
            }
        });
    }
    
    // Ajouter un bouton de suivi
    const trackButton = document.getElementById('trackOrderButton');
    if (trackButton) {
        trackButton.addEventListener('click', function() {
            const trackingCode = prompt('Entrez votre code de suivi:');
            if (trackingCode) {
                trackOrder(trackingCode);
            }
        });
    }
    
    // Charger les statistiques si la section existe
    if (document.getElementById('userStats')) {
        loadUserStats();
    }
});