/**
 * Panel d'administration
 */

// API base is centralized in assets/js/config.js to avoid redeclaration across pages

// Vérifier les privilèges admin
function checkAdminAuth() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        return false;
    }
    
    try {
        const userData = JSON.parse(user);
        if (!userData.is_admin) {
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    } catch (e) {
        localStorage.clear();
            return false;
    }
}

function showAdminLoginBanner() {
    // Create a small top banner prompting to login for admin features
    if (document.getElementById('adminLoginBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'adminLoginBanner';
    banner.className = 'admin-login-banner';
    banner.innerHTML = `
        <div class="banner-inner">
            <div>Accès administration restreint — <a href="login.html">Connectez-vous</a> pour gérer le site.</div>
            <button id="dismissAdminBanner" class="btn btn-sm">Ignorer</button>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .admin-login-banner{position:fixed;top:0;left:0;right:0;background:#fff3cd;color:#856404;border-bottom:1px solid #ffeeba;padding:10px;z-index:9999;display:flex;justify-content:center}
        .admin-login-banner .banner-inner{width:1100px;max-width:95%;display:flex;justify-content:space-between;align-items:center}
        .admin-login-banner .btn{background:transparent;border:1px solid rgba(0,0,0,0.1);padding:6px 10px;border-radius:6px;cursor:pointer}
        body{padding-top:48px}
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);

    document.getElementById('dismissAdminBanner')?.addEventListener('click', () => {
        banner.remove();
        // remove added padding
        document.body.style.paddingTop = '';
    });
}

// Charger les statistiques
async function loadDashboardStats() {
    try {
        // Statistiques du jour
        const [ordersResponse, revenueResponse, stockResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/orders.php?today=1`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            }),
            fetch(`${API_BASE_URL}/admin/orders.php?revenue_today=1`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            }),
            fetch(`${API_BASE_URL}/admin/products.php?low_stock=1`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            })
        ]);
        
        const orders = await ordersResponse.json();
        const revenue = await revenueResponse.json();
        const stock = await stockResponse.json();
        
        // Mettre à jour l'affichage
        document.getElementById('todayOrders').textContent = orders.count || 0;
        document.getElementById('todayRevenue').textContent = `${revenue.total || 0} FCFA`;
        document.getElementById('lowStock').textContent = stock.count || 0;
        
        // Charger les commandes récentes
        loadRecentOrders();
        
        // Charger les alertes stock
        loadStockAlerts(stock.products || []);
        
        // Initialiser le graphique des revenus
        initRevenueChart();
        
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Charger les commandes récentes
async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders.php?limit=5`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        displayRecentOrders(data.orders || []);
    } catch (error) {
        console.error('Erreur lors du chargement des commandes récentes:', error);
    }
}

// Afficher les commandes récentes
function displayRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune commande récente</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="recent-order-item">
            <div>
                <div class="order-id">Commande #${order.id}</div>
                <div class="order-customer">${order.customer_name}</div>
            </div>
            <div class="order-amount">${order.total_price} FCFA</div>
            <div class="order-status status-${order.status}">${getStatusText(order.status)}</div>
        </div>
    `).join('');
}

// Charger les alertes stock
function loadStockAlerts(products) {
    const container = document.getElementById('stockAlerts');
    
    if (products.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucune alerte stock</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="stock-alert ${product.stock_level <= 0 ? 'out' : 'low'}">
            <div class="stock-product">${product.name}</div>
            <div class="stock-level ${product.stock_level <= 0 ? 'out' : 'low'}">
                ${product.stock_level <= 0 ? 'Rupture' : `Stock bas (${product.stock_level})`}
            </div>
        </div>
    `).join('');
}

// Initialiser le graphique des revenus
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Données de démonstration
    const data = {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
            label: 'Revenus (FCFA)',
            data: [45000, 52000, 48000, 61000, 72000, 85000, 68000],
            backgroundColor: 'rgba(212, 175, 55, 0.2)',
            borderColor: '#D4AF37',
            borderWidth: 2,
            tension: 0.4
        }]
    };
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' FCFA';
                        }
                    }
                }
            }
        }
    });
    
    // Mettre à jour le graphique quand la période change
    document.getElementById('chartPeriod')?.addEventListener('change', function() {
        // Ici, on rechargerait les données réelles depuis l'API
        chart.update();
    });
}

// Gestion des commandes
async function loadOrdersTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        initOrdersTable(data.orders || []);
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
    }
}

// Initialiser DataTable pour les commandes
function initOrdersTable(orders) {
    $('#ordersTable').DataTable({
        data: orders,
        columns: [
            { data: 'id' },
            { 
                data: null,
                render: function(data) {
                    return `${data.customer_first_name} ${data.customer_last_name}`;
                }
            },
            { 
                data: 'total_price',
                render: function(data) {
                    return `${data} FCFA`;
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    return `<span class="status-${data}">${getStatusText(data)}</span>`;
                }
            },
            { 
                data: 'created_at',
                render: function(data) {
                    return new Date(data).toLocaleDateString('fr-FR');
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="table-actions">
                            <button onclick="viewOrderDetails(${data.id})" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="updateOrderStatus(${data.id})" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
        },
        pageLength: 10
    });
}

// Gestion des produits
async function loadProductsTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/products.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        initProductsTable(data.products || []);
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
    }
}

// Initialiser DataTable pour les produits
function initProductsTable(products) {
    $('#productsTable').DataTable({
        data: products,
        columns: [
            { data: 'id' },
            { data: 'name' },
            { data: 'category' },
            { 
                data: 'price',
                render: function(data) {
                    return `${data} FCFA`;
                }
            },
            { 
                data: 'stock',
                render: function(data) {
                    if (data <= 0) {
                        return '<span class="stock-badge out">Rupture</span>';
                    } else if (data <= 5) {
                        return `<span class="stock-badge low">${data}</span>`;
                    }
                    return data;
                }
            },
            { 
                data: 'active',
                render: function(data) {
                    return data ? 
                        '<span class="badge active">Actif</span>' : 
                        '<span class="badge inactive">Inactif</span>';
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="table-actions">
                            <button onclick="editProduct(${data.id})" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="toggleProductStatus(${data.id}, ${data.active})" title="${data.active ? 'Désactiver' : 'Activer'}">
                                <i class="fas fa-power-off"></i>
                            </button>
                            <button onclick="deleteProduct(${data.id})" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
        },
        pageLength: 10
    });
}

// Gestion des clients
async function loadCustomersTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/customers.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        initCustomersTable(data.customers || []);
    } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
    }
}

// Initialiser DataTable pour les clients
function initCustomersTable(customers) {
    $('#customersTable').DataTable({
        data: customers,
        columns: [
            { data: 'id' },
            { 
                data: null,
                render: function(data) {
                    return `${data.first_name} ${data.last_name}`;
                }
            },
            { data: 'email' },
            { data: 'phone' },
            { 
                data: 'orders_count',
                render: function(data) {
                    return data || 0;
                }
            },
            { 
                data: 'last_order',
                render: function(data) {
                    return data ? new Date(data).toLocaleDateString('fr-FR') : 'Jamais';
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="table-actions">
                            <button onclick="viewCustomer(${data.id})" title="Voir">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="editCustomer(${data.id})" title="Modifier">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
        },
        pageLength: 10
    });
}

// Gestion du statut Live
async function loadLiveStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/live.php`);
        const data = await response.json();
        
        displayCurrentStatus(data);
    } catch (error) {
        console.error('Erreur lors du chargement du statut:', error);
    }
}

// Afficher le statut actuel
function displayCurrentStatus(status) {
    const container = document.getElementById('currentStatusDisplay');
    
    const statusClass = status.status;
    const statusText = getStatusText(status.status);
    const statusIcon = getStatusIcon(status.status);
    
    container.innerHTML = `
        <div class="status-icon ${statusClass}">
            <i class="fas ${statusIcon}"></i>
        </div>
        <h4>${statusText}</h4>
        <p>${status.message}</p>
    `;
    
    // Sélectionner le radio bouton correspondant
    document.getElementById(`status${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`).checked = true;
    document.getElementById('statusMessage').value = status.message || '';
}

// Obtenir l'icône du statut
function getStatusIcon(status) {
    const icons = {
        'open': 'fa-door-open',
        'closed': 'fa-door-closed',
        'busy': 'fa-users'
    };
    return icons[status] || 'fa-question-circle';
}

// Mettre à jour le statut
async function updateLiveStatus() {
    const status = document.querySelector('input[name="status"]:checked')?.value;
    const message = document.getElementById('statusMessage').value;
    
    if (!status) {
        showNotification('Veuillez sélectionner un statut', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/update-status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ status, message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Statut mis à jour avec succès', 'success');
            loadLiveStatus();
        } else {
            showNotification(data.message || 'Erreur lors de la mise à jour', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

// Navigation dans l'admin
function setupAdminNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Retirer la classe active de tous les liens
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            
            // Ajouter la classe active au lien cliqué
            this.parentElement.classList.add('active');
            
            // Afficher la section correspondante
            const sectionId = this.getAttribute('data-section');
            showAdminSection(sectionId);
            
            // Mettre à jour le titre et le fil d'Ariane
            updateAdminTitle(sectionId);
            updateBreadcrumb(sectionId);
        });
    });
}

// Afficher une section admin
function showAdminSection(sectionId) {
    // Cacher toutes les sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Charger les données spécifiques à la section
        switch(sectionId) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'orders':
                loadOrdersTable();
                break;
            case 'products':
                loadProductsTable();
                break;
            case 'customers':
                loadCustomersTable();
                break;
            case 'live-status':
                loadLiveStatus();
                break;
        }
    }
}

// Mettre à jour le titre admin
function updateAdminTitle(sectionId) {
    const titles = {
        'dashboard': 'Tableau de bord',
        'orders': 'Toutes les commandes',
        'orders-pending': 'Commandes en attente',
        'orders-preparing': 'Commandes en préparation',
        'orders-delivery': 'Commandes en livraison',
        'menu': 'Gestion du menu',
        'menu-today': 'Menu du jour',
        'products': 'Produits',
        'stock': 'Gestion des stocks',
        'customers': 'Liste des clients',
        'settings': 'Configuration',
        'live-status': 'Statut Live'
    };
    
    document.getElementById('adminTitle').textContent = 
        titles[sectionId] || 'Administration';
}

// Mettre à jour le fil d'Ariane
function updateBreadcrumb(sectionId) {
    const breadcrumb = document.getElementById('breadcrumb');
    const titles = {
        'dashboard': 'Tableau de bord',
        'orders': 'Commandes',
        'products': 'Produits',
        'customers': 'Clients',
        'settings': 'Paramètres',
        'live-status': 'Statut Live'
    };
    
    const sectionTitle = titles[sectionId] || 'Administration';
    breadcrumb.innerHTML = `
        <a href="#dashboard">Admin</a> / <span>${sectionTitle}</span>
    `;
}

// Actions rapides
function setupQuickActions() {
    document.getElementById('addMenuBtn')?.addEventListener('click', () => {
        showModal('addMenuModal');
    });
    
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
        showModal('addProductModal');
    });
    
    document.getElementById('updateStatusBtn')?.addEventListener('click', () => {
        showAdminSection('live-status');
    });
    
    document.getElementById('viewReportsBtn')?.addEventListener('click', () => {
        showNotification('Fonctionnalité de rapports à venir', 'info');
    });
}

// Gestion des modals
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer ou réutiliser une notification existante
    let notification = document.querySelector('.admin-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'admin-notification';
        document.body.appendChild(notification);
        
        // Style CSS pour la notification
        const style = document.createElement('style');
        style.textContent = `
            .admin-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 8px;
                background: white;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateX(150%);
                transition: transform 0.3s ease;
                z-index: 10000;
            }
            
            .admin-notification.show {
                transform: translateX(0);
            }
            
            .admin-notification.success {
                border-left: 4px solid #28a745;
                color: #155724;
                background: #d4edda;
            }
            
            .admin-notification.error {
                border-left: 4px solid #dc3545;
                color: #721c24;
                background: #f8d7da;
            }
            
            .admin-notification.info {
                border-left: 4px solid #007bff;
                color: #004085;
                background: #cce5ff;
            }
        `;
        document.head.appendChild(style);
    }
    
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier les privilèges admin — ne bloque plus la page entière,
    // on affiche une bannière non bloquante si l'utilisateur n'est pas connecté.
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
        showAdminLoginBanner();
    }

    // Configurer la navigation (les actions sensibles vérifieront le token avant d'appeler l'API)
    setupAdminNavigation();
    setupQuickActions();
    
    // Déconnexion
    document.getElementById('adminLogoutBtn')?.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // Gestion du statut Live
    document.getElementById('updateStatusBtn')?.addEventListener('click', updateLiveStatus);
    
    // Fermer les modals
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Fermer les modals en cliquant à l'extérieur
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});