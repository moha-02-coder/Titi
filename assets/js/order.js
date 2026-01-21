/**
 * Gestion des commandes - Fonctions spécifiques aux commandes
 */

// ORDER_API_BASE_URL is provided by assets/js/config.js (ORDER_API_BASE_URL = API_BASE_URL + '/orders')

// Gestionnaire pour créer une commande
async function createOrder(orderData) {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        const response = await fetch(`${ORDER_API_BASE_URL}/create.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la création de la commande');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        throw error;
    }
}

// Récupérer les commandes de l'utilisateur
async function getUserOrders(filters = {}) {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        // Construire l'URL avec les filtres
        const queryParams = new URLSearchParams();
        
        // Ajouter les filtres
        if (filters.status) {
            queryParams.append('status', filters.status);
        }
        
        if (filters.start_date) {
            queryParams.append('start_date', filters.start_date);
        }
        
        if (filters.end_date) {
            queryParams.append('end_date', filters.end_date);
        }
        
        if (filters.limit) {
            queryParams.append('limit', filters.limit);
        }
        
        if (filters.page) {
            queryParams.append('page', filters.page);
        }
        
        const queryString = queryParams.toString();
        const url = `${ORDER_API_BASE_URL}/user-orders.php${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des commandes');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        throw error;
    }
}

// Récupérer tous les commandes (pour admin)
async function getAllOrders(filters = {}) {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        // Construire l'URL avec les filtres
        const queryParams = new URLSearchParams();
        
        // Ajouter les filtres
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key]);
            }
        });
        
        const queryString = queryParams.toString();
        const url = `${ORDER_API_BASE_URL}/all-orders.php${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des commandes');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        throw error;
    }
}

// Récupérer les détails d'une commande
async function getOrderDetails(orderId, withItems = false) {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        const url = `${ORDER_API_BASE_URL}/order-details.php?id=${orderId}${withItems ? '&with_items=1' : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des détails de la commande');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la récupération des détails de la commande:', error);
        throw error;
    }
}

// Mettre à jour le statut d'une commande
async function updateOrderStatus(orderId, status, reason = '') {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        const response = await fetch(`${ORDER_API_BASE_URL}/update-status.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                order_id: orderId,
                status: status,
                reason: reason
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        throw error;
    }
}

// Suivre une commande
async function trackOrder(trackingCode = null, orderId = null) {
    try {
        let url = `${ORDER_API_BASE_URL}/track.php`;
        
        if (trackingCode) {
            url += `?tracking_code=${encodeURIComponent(trackingCode)}`;
        } else if (orderId) {
            url += `?order_id=${orderId}`;
        } else {
            throw new Error('Code de suivi ou ID de commande requis');
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors du suivi de la commande');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors du suivi de la commande:', error);
        throw error;
    }
}

// Récupérer les statistiques des commandes
async function getOrderStats(period = 'today') {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        const response = await fetch(`${ORDER_API_BASE_URL}/stats.php?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la récupération des statistiques');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        throw error;
    }
}

// Rechercher des commandes
async function searchOrders(searchTerm, filters = {}) {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        // Construire l'URL avec les filtres
        const queryParams = new URLSearchParams();
        queryParams.append('q', searchTerm);
        
        // Ajouter les filtres supplémentaires
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key]);
            }
        });
        
        const url = `${ORDER_API_BASE_URL}/search.php?${queryParams.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la recherche');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erreur lors de la recherche des commandes:', error);
        throw error;
    }
}

// Exporter les commandes
async function exportOrders(filters = {}, format = 'json') {
    try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            throw new Error('Utilisateur non authentifié');
        }
        
        // Construire l'URL avec les filtres
        const queryParams = new URLSearchParams();
        queryParams.append('format', format);
        
        // Ajouter les filtres
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key]);
            }
        });
        
        const url = `${ORDER_API_BASE_URL}/export.php?${queryParams.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de l\'exportation');
        }
        
        if (format === 'json') {
            return await response.json();
        } else if (format === 'csv') {
            return await response.text();
        } else if (format === 'pdf') {
            return await response.blob();
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'exportation des commandes:', error);
        throw error;
    }
}

// Fonctions d'affichage

// Afficher une commande dans un tableau
function displayOrderRow(order) {
    return `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer_name || 'N/A'}</td>
            <td>${order.items_count || 0} article(s)</td>
            <td>${order.final_price} FCFA</td>
            <td><span class="status-badge status-${order.status}">${getOrderStatusText(order.status)}</span></td>
            <td>${new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewOrderDetails(${order.id})" title="Voir les détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.status === 'pending' ? `
                    <button class="btn-icon btn-success" onclick="updateOrderStatusPrompt(${order.id}, 'confirmed')" title="Confirmer">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="updateOrderStatusPrompt(${order.id}, 'cancelled')" title="Annuler">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// Afficher les détails d'une commande
function displayOrderDetails(order) {
    return `
        <div class="order-details">
            <div class="order-header">
                <h2>Commande #${order.id}</h2>
                <span class="status-badge status-${order.status}">${getOrderStatusText(order.status)}</span>
            </div>
            
            <div class="order-info-grid">
                <div class="info-card">
                    <h3><i class="fas fa-user"></i> Client</h3>
                    <p><strong>Nom:</strong> ${order.customer_name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.customer_email || 'N/A'}</p>
                    <p><strong>Téléphone:</strong> ${order.customer_phone || 'N/A'}</p>
                    <p><strong>Adresse:</strong> ${order.delivery_address || 'N/A'}</p>
                </div>
                
                <div class="info-card">
                    <h3><i class="fas fa-receipt"></i> Commande</h3>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString('fr-FR')}</p>
                    <p><strong>Statut:</strong> ${getOrderStatusText(order.status)}</p>
                    <p><strong>Méthode de paiement:</strong> ${order.payment_method || 'À la livraison'}</p>
                    <p><strong>Notes:</strong> ${order.notes || 'Aucune note'}</p>
                </div>
                
                <div class="info-card">
                    <h3><i class="fas fa-money-bill-wave"></i> Paiement</h3>
                    <p><strong>Sous-total:</strong> ${order.total_price} FCFA</p>
                    <p><strong>Frais de livraison:</strong> ${order.delivery_fee} FCFA</p>
                    <p><strong>Total:</strong> <span class="total-amount">${order.final_price} FCFA</span></p>
                </div>
            </div>
            
            <div class="order-items-section">
                <h3><i class="fas fa-shopping-cart"></i> Articles (${order.items_count || 0})</h3>
                <div class="items-table">
                    ${order.items && order.items.length > 0 ? order.items.map(item => `
                        <div class="item-row">
                            <div class="item-name">${item.item_name}</div>
                            <div class="item-quantity">x${item.quantity}</div>
                            <div class="item-price">${item.unit_price} FCFA</div>
                            <div class="item-total">${item.quantity * item.unit_price} FCFA</div>
                        </div>
                    `).join('') : '<p>Aucun article</p>'}
                </div>
            </div>
            
            <div class="order-actions">
                <button class="btn btn-secondary" onclick="printOrder(${order.id})">
                    <i class="fas fa-print"></i> Imprimer
                </button>
                ${order.status === 'pending' ? `
                <button class="btn btn-success" onclick="updateOrderStatusPrompt(${order.id}, 'confirmed')">
                    <i class="fas fa-check"></i> Confirmer la commande
                </button>
                <button class="btn btn-warning" onclick="updateOrderStatusPrompt(${order.id}, 'preparing')">
                    <i class="fas fa-utensils"></i> Mettre en préparation
                </button>
                <button class="btn btn-danger" onclick="updateOrderStatusPrompt(${order.id}, 'cancelled')">
                    <i class="fas fa-times"></i> Annuler la commande
                </button>
                ` : order.status === 'confirmed' ? `
                <button class="btn btn-warning" onclick="updateOrderStatusPrompt(${order.id}, 'preparing')">
                    <i class="fas fa-utensils"></i> Mettre en préparation
                </button>
                ` : order.status === 'preparing' ? `
                <button class="btn btn-info" onclick="updateOrderStatusPrompt(${order.id}, 'delivery')">
                    <i class="fas fa-truck"></i> Mettre en livraison
                </button>
                ` : order.status === 'delivery' ? `
                <button class="btn btn-success" onclick="updateOrderStatusPrompt(${order.id}, 'completed')">
                    <i class="fas fa-check-circle"></i> Marquer comme livrée
                </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Fonctions utilitaires

function getOrderStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'preparing': 'En préparation',
        'delivery': 'En livraison',
        'completed': 'Terminée',
        'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
}

function generateTrackingCode(orderId) {
    const prefix = 'TGT';
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `${prefix}${date}${String(orderId).padStart(6, '0')}`;
}

function calculateOrderTotal(items) {
    return items.reduce((total, item) => {
        return total + (item.price * (item.quantity || 1));
    }, 0);
}

// Fonctions d'interface utilisateur

async function viewOrderDetails(orderId) {
    try {
        const data = await getOrderDetails(orderId, true);
        
        // Ouvrir un modal avec les détails
        openModal('Détails de la commande', displayOrderDetails(data.order));
        
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}

async function updateOrderStatusPrompt(orderId, newStatus) {
    const statusText = getOrderStatusText(newStatus);
    
    if (newStatus === 'cancelled') {
        const reason = prompt(`Raison de l'annulation (optionnel):`);
        if (reason === null) return; // Annulé par l'utilisateur
        
        try {
            await updateOrderStatus(orderId, newStatus, reason);
            showNotification(`Commande ${newStatus === 'cancelled' ? 'annulée' : 'mise à jour'} avec succès`, 'success');
            // Recharger les données si nécessaire
            if (typeof reloadOrders === 'function') {
                reloadOrders();
            }
        } catch (error) {
            showNotification(`Erreur: ${error.message}`, 'error');
        }
    } else {
        if (confirm(`Voulez-vous vraiment marquer cette commande comme "${statusText}" ?`)) {
            try {
                await updateOrderStatus(orderId, newStatus);
                showNotification(`Commande marquée comme "${statusText}"`, 'success');
                // Recharger les données si nécessaire
                if (typeof reloadOrders === 'function') {
                    reloadOrders();
                }
            } catch (error) {
                showNotification(`Erreur: ${error.message}`, 'error');
            }
        }
    }
}

function openModal(title, content) {
    // Créer le modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Ajouter les styles si nécessaire
    if (!document.querySelector('#modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-overlay {
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
            
            .modal {
                background: white;
                border-radius: 10px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                animation: modalFadeIn 0.3s ease;
            }
            
            @keyframes modalFadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .modal-header {
                padding: 20px;
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
                padding: 20px;
            }
            
            .modal-footer {
                padding: 20px;
                border-top: 1px solid #e0e0e0;
                text-align: right;
            }
            
            .order-details {
                padding: 10px;
            }
            
            .order-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .status-badge {
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 500;
            }
            
            .status-pending { background: #fff3cd; color: #856404; }
            .status-confirmed { background: #cce5ff; color: #004085; }
            .status-preparing { background: #d4edda; color: #155724; }
            .status-delivery { background: #d1ecf1; color: #0c5460; }
            .status-completed { background: #d4edda; color: #155724; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
            
            .order-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .info-card {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #d4af37;
            }
            
            .info-card h3 {
                margin-top: 0;
                color: #1a1a1a;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .info-card p {
                margin: 5px 0;
            }
            
            .order-items-section {
                margin-top: 20px;
            }
            
            .items-table {
                border: 1px solid #e0e0e0;
                border-radius: 5px;
                overflow: hidden;
            }
            
            .item-row {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1fr;
                padding: 10px;
                border-bottom: 1px solid #e0e0e0;
                align-items: center;
            }
            
            .item-row:last-child {
                border-bottom: none;
            }
            
            .item-name {
                font-weight: 500;
            }
            
            .total-amount {
                font-size: 1.2rem;
                font-weight: bold;
                color: #d4af37;
            }
            
            .order-actions {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .btn-icon {
                background: none;
                border: none;
                cursor: pointer;
                padding: 5px;
                margin: 0 2px;
                border-radius: 4px;
                color: #666;
            }
            
            .btn-icon:hover {
                background: #f0f0f0;
            }
            
            .btn-success { color: #28a745; }
            .btn-danger { color: #dc3545; }
            .btn-warning { color: #ffc107; }
            .btn-info { color: #17a2b8; }
            .btn-secondary { background: #6c757d; color: white; }
        `;
        document.head.appendChild(styles);
    }
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function printOrder(orderId) {
    // Ouvrir une fenêtre d'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Commande #${orderId}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #d4af37; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                .total { font-size: 1.2em; font-weight: bold; text-align: right; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Titi Golden Taste</h1>
                <p>Commande #${orderId}</p>
                <p>${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <div class="no-print">
                <button onclick="window.print()">Imprimer</button>
                <button onclick="window.close()">Fermer</button>
            </div>
            <div id="order-content">
                Chargement des détails...
            </div>
            <script>
                async function loadOrderDetails() {
                    try {
                        const response = await fetch('${ORDER_API_BASE_URL}/order-details.php?id=${orderId}');
                        const data = await response.json();
                        
                        if (data.success) {
                            const order = data.order;
                            document.getElementById('order-content').innerHTML = \`
                                <div class="info-grid">
                                    <div class="info-card">
                                        <h3>Client</h3>
                                        <p><strong>Nom:</strong> \${order.customer_name || 'N/A'}</p>
                                        <p><strong>Adresse:</strong> \${order.delivery_address || 'N/A'}</p>
                                    </div>
                                    <div class="info-card">
                                        <h3>Commande</h3>
                                        <p><strong>Date:</strong> \${new Date(order.created_at).toLocaleString('fr-FR')}</p>
                                        <p><strong>Statut:</strong> \${order.status}</p>
                                    </div>
                                </div>
                                
                                <h3>Articles</h3>
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th>Article</th>
                                            <th>Quantité</th>
                                            <th>Prix unitaire</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        \${order.items ? order.items.map(item => \`
                                            <tr>
                                                <td>\${item.item_name}</td>
                                                <td>\${item.quantity}</td>
                                                <td>\${item.unit_price} FCFA</td>
                                                <td>\${item.quantity * item.unit_price} FCFA</td>
                                            </tr>
                                        \`).join('') : '<tr><td colspan="4">Aucun article</td></tr>'}
                                    </tbody>
                                </table>
                                
                                <div class="total">
                                    <p>Sous-total: \${order.total_price} FCFA</p>
                                    <p>Frais de livraison: \${order.delivery_fee} FCFA</p>
                                    <p><strong>Total: \${order.final_price} FCFA</strong></p>
                                </div>
                            \`;
                        }
                    } catch (error) {
                        document.getElementById('order-content').innerHTML = 'Erreur lors du chargement des détails';
                    }
                }
                
                loadOrderDetails();
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les écouteurs d'événements pour les pages de commandes
    
    // Si on est sur une page avec un formulaire de commande
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Récupérer les données du formulaire
            const formData = new FormData(this);
            const orderData = {
                items: JSON.parse(localStorage.getItem('cart') || '[]'),
                delivery_address: formData.get('address') || '',
                notes: formData.get('notes') || '',
                payment_method: formData.get('payment_method') || 'cash'
            };
            
            try {
                const result = await createOrder(orderData);
                
                if (result.success) {
                    showNotification('Commande créée avec succès!', 'success');
                    
                    // Vider le panier
                    localStorage.removeItem('cart');
                    
                    // Rediriger vers la page de confirmation
                    if (result.order && result.order.id) {
                        setTimeout(() => {
                            window.location.href = `order-confirmation.html?id=${result.order.id}`;
                        }, 1500);
                    }
                }
            } catch (error) {
                showNotification(`Erreur: ${error.message}`, 'error');
            }
        });
    }
});

// Exporter les fonctions pour un usage global
window.createOrder = createOrder;
window.getUserOrders = getUserOrders;
window.getAllOrders = getAllOrders;
window.getOrderDetails = getOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.trackOrder = trackOrder;
window.getOrderStats = getOrderStats;
window.searchOrders = searchOrders;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatusPrompt = updateOrderStatusPrompt;
window.printOrder = printOrder;
window.openModal = openModal;
window.closeModal = closeModal;