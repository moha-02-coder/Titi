/**
 * Dashboard Admin Amélioré - Titi Golden Taste
 * Interface professionnelle avec gestion complète des menus et produits
 */

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.menuItems = [];
        this.productItems = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSidebar();
        this.loadInitialData();
        this.addMediaButtonsToExistingItems();
    }

    setupEventListeners() {
        // Navigation dans la sidebar
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.dataset.target;
                this.switchSection(target);
            });
        });

        // Toggle de la sidebar mobile
        const sidebarToggle = document.getElementById('adminSidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.body.classList.toggle('admin-sidebar-open');
            });
        }

        // Overlay pour fermer la sidebar
        const overlay = document.querySelector('.admin-sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                document.body.classList.remove('admin-sidebar-open');
            });
        }

        // Tabs dans le dashboard
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Boutons d'action
        this.setupActionButtons();
    }

    setupSidebar() {
        // Créer l'overlay pour mobile
        if (!document.querySelector('.admin-sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'admin-sidebar-overlay';
            overlay.addEventListener('click', () => {
                document.body.classList.remove('admin-sidebar-open');
            });
            document.body.appendChild(overlay);
        }
    }

    setupActionButtons() {
        // Bouton d'ajout de menu
        const addMenuBtn = document.getElementById('addMenuBtn');
        if (addMenuBtn) {
            addMenuBtn.addEventListener('click', () => {
                this.openMenuForm();
            });
        }

        // Bouton d'ajout de produit
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.openProductForm();
            });
        }

        // Recherche
        const menuSearch = document.getElementById('menuSearch');
        if (menuSearch) {
            menuSearch.addEventListener('input', (e) => {
                this.filterMenuItems(e.target.value);
            });
        }

        const productSearch = document.getElementById('productSearch');
        if (productSearch) {
            productSearch.addEventListener('input', (e) => {
                this.filterProductItems(e.target.value);
            });
        }

        // Filtres de catégorie
        const menuCategoryFilter = document.getElementById('menuCategoryFilter');
        if (menuCategoryFilter) {
            menuCategoryFilter.addEventListener('change', (e) => {
                this.filterMenuByCategory(e.target.value);
            });
        }
    }

    switchSection(sectionId) {
        // Masquer toutes les sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Afficher la section sélectionnée
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Mettre à jour la navigation active
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-target="${sectionId}"]`).classList.add('active');

        this.currentSection = sectionId;

        // Charger les données selon la section
        this.loadSectionData(sectionId);
    }

    switchTab(tabId) {
        // Masquer tous les contenus de tabs
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Afficher le tab sélectionné
        document.getElementById(tabId).classList.add('active');

        // Mettre à jour les boutons de tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    }

    async loadInitialData() {
        await this.loadStats();
        await this.loadMenuItems();
        await this.loadProductItems();
        await this.loadDashboardContent();
    }

    async loadStats() {
        try {
            // Simuler des statistiques
            const stats = {
                todayOrders: Math.floor(Math.random() * 50) + 10,
                todayRevenue: Math.floor(Math.random() * 500000) + 100000,
                productsStock: Math.floor(Math.random() * 100) + 50,
                activeDrivers: Math.floor(Math.random() * 20) + 5
            };

            document.getElementById('todayOrders').textContent = stats.todayOrders;
            document.getElementById('todayRevenue').textContent = `${stats.todayRevenue.toLocaleString()} FCFA`;
            document.getElementById('productsStock').textContent = stats.productsStock;
            document.getElementById('activeDrivers').textContent = stats.activeDrivers;

        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    }

    async loadDashboardContent() {
        // Charger les plats populaires
        await this.loadPopularMenus();
        // Charger les produits en vedette
        await this.loadFeaturedProducts();
        // Charger les ventes récentes
        await this.loadRecentSales();
        // Charger l'activité clients
        await this.loadCustomerActivity();
    }

    async loadPopularMenus() {
        try {
            const response = await this.apiCall('/menu/all.php?limit=6');
            if (response.success) {
                const menus = response.data || [];
                this.renderPopularMenus(menus);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des menus populaires:', error);
            this.showError('Erreur lors du chargement des menus populaires');
        }
    }

    async loadFeaturedProducts() {
        try {
            // Simuler des produits pour le moment
            const mockProducts = [
                { id: 1, name: 'Produit 1', price: 5000, image_url: '', category: 'Boutique' },
                { id: 2, name: 'Produit 2', price: 7500, image_url: '', category: 'Boutique' },
                { id: 3, name: 'Produit 3', price: 12000, image_url: '', category: 'Boutique' }
            ];
            this.renderFeaturedProducts(mockProducts);
        } catch (error) {
            console.error('Erreur lors du chargement des produits en vedette:', error);
            this.showError('Erreur lors du chargement des produits en vedette');
        }
    }

    async loadRecentSales() {
        try {
            const response = await this.apiCall('/orders/list.php?limit=5&status=completed');
            if (response.success) {
                const orders = response.orders || [];
                this.renderRecentSales(orders);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des ventes récentes:', error);
            // Afficher un message d'erreur plus clair
            const container = document.getElementById('recentSales');
            if (container) {
                container.innerHTML = '<p class="error-message">Impossible de charger les ventes récentes</p>';
            }
        }
    }

    async loadCustomerActivity() {
        try {
            const response = await this.apiCall('/users/list.php?limit=5');
            if (response.success) {
                const users = response.data || [];
                this.renderCustomerActivity(users);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'activité clients:', error);
            // Afficher un message d'erreur plus clair
            const container = document.getElementById('customerActivity');
            if (container) {
                container.innerHTML = '<p class="error-message">Impossible de charger l\'activité clients</p>';
            }
        }
    }

    renderPopularMenus(menus) {
        const container = document.getElementById('popularMenus');
        if (!container) return;

        if (menus.length === 0) {
            container.innerHTML = '<p>Aucun plat populaire</p>';
            return;
        }

        container.innerHTML = `
            <div class="mini-items-grid">
                ${menus.map(menu => this.renderMiniMenuItem(menu)).join('')}
            </div>
        `;
    }

    renderFeaturedProducts(products) {
        const container = document.getElementById('featuredProducts');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p>Aucun produit en vedette</p>';
            return;
        }

        container.innerHTML = `
            <div class="mini-items-grid">
                ${products.map(product => this.renderMiniProductItem(product)).join('')}
            </div>
        `;
    }

    renderRecentSales(orders) {
        const container = document.getElementById('recentSales');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p>Aucune vente récente</p>';
            return;
        }

        container.innerHTML = `
            <div class="recent-list">
                ${orders.map(order => `
                    <div class="recent-item">
                        <div class="recent-info">
                            <strong>Commande #${order.id}</strong>
                            <span>${order.customer_name}</span>
                        </div>
                        <div class="recent-amount">${order.total} FCFA</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCustomerActivity(users) {
        const container = document.getElementById('customerActivity');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<p>Aucune activité récente</p>';
            return;
        }

        container.innerHTML = `
            <div class="recent-list">
                ${users.map(user => `
                    <div class="recent-item">
                        <div class="recent-info">
                            <strong>${user.name}</strong>
                            <span>${user.email}</span>
                        </div>
                        <div class="recent-status ${user.active ? 'active' : 'inactive'}">
                            ${user.active ? 'Actif' : 'Inactif'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMiniMenuItem(menu) {
        const hasImage = menu.image_url && menu.image_url !== '';
        return `
            <div class="mini-item" onclick="adminDashboard.openMenuDetails(${menu.id})">
                <div class="mini-item-image">
                    ${hasImage ? `<img src="${menu.image_url}" alt="${menu.name}">` : '<i class="fas fa-utensils"></i>'}
                </div>
                <div class="mini-item-info">
                    <div class="mini-item-title">${menu.name}</div>
                    <div class="mini-item-price">${menu.price} FCFA</div>
                </div>
            </div>
        `;
    }

    renderMiniProductItem(product) {
        const hasImage = product.image_url && product.image_url !== '';
        return `
            <div class="mini-item" onclick="adminDashboard.openProductDetails(${product.id})">
                <div class="mini-item-image">
                    ${hasImage ? `<img src="${product.image_url}" alt="${product.name}">` : '<i class="fas fa-store"></i>'}
                </div>
                <div class="mini-item-info">
                    <div class="mini-item-title">${product.name}</div>
                    <div class="mini-item-price">${product.price} FCFA</div>
                </div>
            </div>
        `;
    }

    async loadMenuItems() {
        try {
            const response = await this.apiCall('/menu/all.php');
            if (response.success) {
                this.menuItems = response.data || [];
                this.renderMenuItems();
                this.updateMenuMeta();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des menus:', error);
            this.showError('Erreur lors du chargement des menus');
        }
    }

    async loadProductItems() {
        try {
            // Simuler des produits pour le moment
            const mockProducts = [
                { id: 1, name: 'Produit 1', price: 5000, image_url: '', category: 'Boutique', description: 'Description produit 1', stock: 10 },
                { id: 2, name: 'Produit 2', price: 7500, image_url: '', category: 'Boutique', description: 'Description produit 2', stock: 5 },
                { id: 3, name: 'Produit 3', price: 12000, image_url: '', category: 'Boutique', description: 'Description produit 3', stock: 0 }
            ];
            this.productItems = mockProducts;
            this.renderProductItems();
            this.updateProductMeta();
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            this.showError('Erreur lors du chargement des produits');
        }
    }

    renderMenuItems() {
        const container = document.getElementById('menuList');
        if (!container) return;

        if (this.menuItems.length === 0) {
            container.innerHTML = '<p class="no-items">Aucun plat trouvé</p>';
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${this.menuItems.map(item => this.renderMenuItem(item)).join('')}
            </div>
        `;

        this.addMediaButtonsToExistingItems();
        this.attachMenuEventListeners();
    }

    renderProductItems() {
        const container = document.getElementById('productsList');
        if (!container) return;

        if (this.productItems.length === 0) {
            container.innerHTML = '<p class="no-items">Aucun produit trouvé</p>';
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${this.productItems.map(item => this.renderProductItem(item)).join('')}
            </div>
        `;

        this.addMediaButtonsToExistingItems();
        this.attachProductEventListeners();
    }

    renderMenuItem(item) {
        const hasImage = item.image_url && item.image_url !== '';
        const hasVideo = item.video_url && item.video_url !== '';
        const mediaDisplay = hasVideo ? 
            `<div class="media-indicator video"><i class="fas fa-video"></i></div>` :
            hasImage ? 
            `<div class="media-indicator image"><i class="fas fa-image"></i></div>` : 
            `<div class="media-indicator none"><i class="fas fa-ban"></i></div>`;

        return `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-card-header">
                    ${hasImage ? `<img src="${item.image_url}" alt="${item.name}" class="item-card-image">` : '<div class="no-image-placeholder"><i class="fas fa-utensils"></i></div>'}
                </div>
                <div class="item-card-body">
                    <h3 class="item-card-title">${item.name}</h3>
                    <p class="item-card-description">${item.description || 'Aucune description'}</p>
                    <div class="item-card-meta">
                        <span class="item-card-category">${item.category || 'Non catégorisé'}</span>
                        <span class="item-card-availability ${item.is_available ? 'available' : 'unavailable'}">
                            ${item.is_available ? 'Disponible' : 'Indisponible'}
                        </span>
                        ${mediaDisplay}
                    </div>
                    <div class="item-card-price">${item.price} FCFA</div>
                    <div class="item-card-actions">
                        <button class="btn btn-primary btn-sm edit-menu-btn" data-item-id="${item.id}">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-danger btn-sm delete-menu-btn" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                        <button class="btn btn-outline btn-sm change-image-btn" data-item-id="${item.id}">
                            <i class="fas fa-image"></i> Image
                        </button>
                        <button class="btn btn-outline btn-sm change-video-btn" data-item-id="${item.id}">
                            <i class="fas fa-video"></i> Vidéo
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderProductItem(item) {
        const hasImage = item.image_url && item.image_url !== '';
        const mediaDisplay = hasImage ? 
            `<div class="media-indicator image"><i class="fas fa-image"></i></div>` : 
            `<div class="media-indicator none"><i class="fas fa-ban"></i></div>`;

        return `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-card-header">
                    ${hasImage ? `<img src="${item.image_url}" alt="${item.name}" class="item-card-image">` : '<div class="no-image-placeholder"><i class="fas fa-store"></i></div>'}
                </div>
                <div class="item-card-body">
                    <h3 class="item-card-title">${item.name}</h3>
                    <p class="item-card-description">${item.description || 'Aucune description'}</p>
                    <div class="item-card-meta">
                        <span class="item-card-category">${item.category || 'Non catégorisé'}</span>
                        <span class="item-card-stock ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                            Stock: ${item.stock || 0}
                        </span>
                        ${mediaDisplay}
                    </div>
                    <div class="item-card-price">${item.price} FCFA</div>
                    <div class="item-card-actions">
                        <button class="btn btn-primary btn-sm edit-product-btn" data-item-id="${item.id}">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-danger btn-sm delete-product-btn" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                        <button class="btn btn-outline btn-sm change-image-btn" data-item-id="${item.id}">
                            <i class="fas fa-image"></i> Image
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachMenuEventListeners() {
        // Ajouter les écouteurs pour les clics sur les cartes
        document.querySelectorAll('.item-card[data-item-id]').forEach(card => {
            // Clic sur la carte (sauf les boutons)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.item-card-actions')) {
                    const itemId = card.dataset.itemId;
                    this.openMenuDetails(itemId);
                }
            });
        });

        // Boutons de modification
        document.querySelectorAll('.edit-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                const menu = this.menuItems.find(item => item.id == itemId);
                if (menu) {
                    this.openMenuForm(menu);
                }
            });
        });

        // Boutons de suppression
        document.querySelectorAll('.delete-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                this.confirmDeleteMenu(itemId);
            });
        });
    }

    attachProductEventListeners() {
        // Ajouter les écouteurs pour les clics sur les cartes
        document.querySelectorAll('.item-card[data-item-id]').forEach(card => {
            // Clic sur la carte (sauf les boutons)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.item-card-actions')) {
                    const itemId = card.dataset.itemId;
                    this.openProductDetails(itemId);
                }
            });
        });

        // Boutons de modification
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                const product = this.productItems.find(item => item.id == itemId);
                if (product) {
                    this.openProductForm(product);
                }
            });
        });

        // Boutons de suppression
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                this.confirmDeleteProduct(itemId);
            });
        });
    }

    confirmDeleteMenu(menuId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) {
            this.deleteMenu(menuId);
        }
    }

    confirmDeleteProduct(productId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
            this.deleteProduct(productId);
        }
    }

    async deleteMenu(menuId) {
        try {
            // Simuler la suppression
            this.menuItems = this.menuItems.filter(item => item.id != menuId);
            this.renderMenuItems();
            this.updateMenuMeta();
            this.showSuccess('Plat supprimé avec succès');
        } catch (error) {
            console.error('Erreur lors de la suppression du plat:', error);
            this.showError('Erreur lors de la suppression du plat');
        }
    }

    async deleteProduct(productId) {
        try {
            // Simuler la suppression
            this.productItems = this.productItems.filter(item => item.id != productId);
            this.renderProductItems();
            this.updateProductMeta();
            this.showSuccess('Produit supprimé avec succès');
        } catch (error) {
            console.error('Erreur lors de la suppression du produit:', error);
            this.showError('Erreur lors de la suppression du produit');
        }
    }

    addMediaButtonsToExistingItems() {
        setTimeout(() => {
            if (window.mediaManager) {
                window.mediaManager.addMediaButtonsToItems();
            }
        }, 100);
    }

    filterMenuItems(searchTerm) {
        const filtered = this.menuItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderFilteredMenuItems(filtered);
    }

    filterProductItems(searchTerm) {
        const filtered = this.productItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderFilteredProductItems(filtered);
    }

    filterMenuByCategory(category) {
        const filtered = category ? 
            this.menuItems.filter(item => item.category === category) : 
            this.menuItems;
        this.renderFilteredMenuItems(filtered);
    }

    renderFilteredMenuItems(items) {
        const container = document.getElementById('menuList');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<p class="no-items">Aucun plat trouvé pour ces critères</p>';
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${items.map(item => this.renderMenuItem(item)).join('')}
            </div>
        `;

        this.addMediaButtonsToExistingItems();
        this.attachMenuEventListeners();
    }

    renderFilteredProductItems(items) {
        const container = document.getElementById('productsList');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<p class="no-items">Aucun produit trouvé pour ces critères</p>';
            return;
        }

        container.innerHTML = `
            <div class="items-grid">
                ${items.map(item => this.renderProductItem(item)).join('')}
            </div>
        `;

        this.addMediaButtonsToExistingItems();
        this.attachProductEventListeners();
    }

    updateMenuMeta() {
        const meta = document.getElementById('menuMeta');
        if (meta) {
            meta.textContent = `${this.menuItems.length} plat(s)`;
        }
    }

    updateProductMeta() {
        const meta = document.getElementById('productsMeta');
        if (meta) {
            meta.textContent = `${this.productItems.length} produit(s)`;
        }
    }

    openMenuForm(menu = null) {
        // Éviter la récursion infinie
        if (this.isOpeningMenu) {
            return;
        }
        
        this.isOpeningMenu = true;
        
        try {
            if (window.openMenuForm && window.openMenuForm !== this.openMenuForm.bind(this)) {
                window.openMenuForm(menu);
            } else if (window.admin && window.admin.openMenuForm) {
                window.admin.openMenuForm(menu);
            }
        } finally {
            this.isOpeningMenu = false;
        }
    }

    openProductForm(product = null) {
        // Éviter la récursion infinie
        if (this.isOpeningProduct) {
            return;
        }
        
        this.isOpeningProduct = true;
        
        try {
            if (window.openProductForm && window.openProductForm !== this.openProductForm.bind(this)) {
                window.openProductForm(product);
            } else if (window.admin && window.admin.openProductForm) {
                window.admin.openProductForm(product);
            }
        } finally {
            this.isOpeningProduct = false;
        }
    }

    openMenuDetails(menuId) {
        const menu = this.menuItems.find(item => item.id == menuId);
        if (menu) {
            this.openMenuForm(menu);
        }
    }

    openProductDetails(productId) {
        const product = this.productItems.find(item => item.id == productId);
        if (product) {
            this.openProductForm(product);
        }
    }

    loadSectionData(sectionId) {
        switch (sectionId) {
            case 'restaurant':
                this.loadMenuItems();
                break;
            case 'boutique':
                this.loadProductItems();
                break;
            case 'dashboard':
                this.loadStats();
                this.loadDashboardContent();
                break;
        }
    }

    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    async apiCall(endpoint, data = null, method = 'GET') {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || 'admin_token_123')
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(this.getApiBase() + endpoint, options);
            
            // Vérifier si la réponse est OK
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Vérifier si la réponse est du JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('La réponse n\'est pas du JSON');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    getApiBase() {
        // Pour le dashboard admin, l'API est dans backend/api
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/')) {
            // Si on est dans /admin/, remonter d'un niveau
            return '../backend/api';
        } else {
            // Sinon utiliser le chemin relatif depuis la racine
            return '/backend/api';
        }
    }
}

// Styles additionnels pour le dashboard
const dashboardStyles = `
<style>
.media-indicator {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.media-indicator.image {
    background: #e3f2fd;
    color: #1976d2;
}

.media-indicator.video {
    background: #fff3cd;
    color: #856404;
}

.media-indicator.none {
    background: #f8d7da;
    color: #721c24;
}

.no-items {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
    font-style: italic;
}

.availability.available {
    background: var(--success-color);
    color: white;
}

.availability.unavailable {
    background: var(--danger-color);
    color: white;
}

.stock.in-stock {
    background: var(--success-color);
    color: white;
}

.stock.out-of-stock {
    background: var(--danger-color);
    color: white;
}

.category {
    background: var(--info-color);
    color: white;
}

.menu-list, .products-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
}

@media (max-width: 768px) {
    .menu-list, .products-list {
        grid-template-columns: 1fr;
    }
}

.item-actions {
    margin-top: 15px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.item-actions .btn {
    font-size: 0.8rem;
    padding: 6px 12px;
}
</style>
`;

// Ajouter les styles au document
if (!document.querySelector('#dashboard-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'dashboard-styles';
    styleEl.innerHTML = dashboardStyles;
    document.head.appendChild(styleEl);
}

// Initialiser le dashboard
window.adminDashboard = new AdminDashboard();

// Exposer les fonctions globales
window.openMenuForm = function(menu) {
    if (window.adminDashboard && window.adminDashboard.openMenuForm) {
        window.adminDashboard.openMenuForm(menu);
    }
};

window.openProductForm = function(product) {
    if (window.adminDashboard && window.adminDashboard.openProductForm) {
        window.adminDashboard.openProductForm(product);
    }
};

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}
