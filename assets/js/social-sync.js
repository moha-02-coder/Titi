/**
 * Synchronisation avec TikTok et WhatsApp
 * Gestion des partages sociaux automatiques et manuels
 */

class SocialSyncManager {
    constructor() {
        this.syncQueue = [];
        this.isProcessing = false;
        this.dashboardCreated = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAutoSync();
    }

    ensureDashboard() {
        if (this.dashboardCreated) return;
        if (document.getElementById('socialDashboard')) {
            this.dashboardCreated = true;
            return;
        }
        this.createSocialDashboard();
        this.dashboardCreated = true;
    }

    setupEventListeners() {
        // Écouter les événements de partage social
        window.addEventListener('social:share', (event) => {
            this.handleSocialShare(event.detail);
        });

        // Écouter les clics sur les boutons sociaux
        document.addEventListener('click', (e) => {
            if (e.target.closest('.social-share-btn')) {
                const platform = e.target.closest('.social-share-btn').dataset.platform;
                const contentType = e.target.closest('.social-share-btn').dataset.contentType;
                const contentId = e.target.closest('.social-share-btn').dataset.contentId;
                
                this.shareContent(platform, contentType, contentId);
            }
            
            if (e.target.closest('.batch-sync-btn')) {
                this.showBatchSyncModal();
            }
            
            if (e.target.closest('.social-dashboard-btn')) {
                this.toggleSocialDashboard();
            }
        });
    }

    // Configurer la synchronisation automatique
    setupAutoSync() {
        // Synchroniser automatiquement les nouveaux contenus
        setInterval(() => {
            this.checkForNewContent();
        }, 60000); // Toutes les minutes
    }

    // Créer le dashboard social
    createSocialDashboard() {
        const dashboardHtml = `
            <div class="social-dashboard" id="socialDashboard">
                <div class="social-dashboard-header">
                    <h3><i class="fas fa-share-alt"></i> Synchronisation Sociale</h3>
                    <button class="btn btn-sm btn-outline" onclick="window.socialSync.toggleSocialDashboard()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="social-dashboard-content">
                    <div class="social-stats">
                        <div class="stat-card">
                            <div class="stat-icon tiktok">
                                <i class="fab fa-tiktok"></i>
                            </div>
                            <div class="stat-info">
                                <h4>TikTok</h4>
                                <p><span class="tiktok-count">0</span> publications</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon whatsapp">
                                <i class="fab fa-whatsapp"></i>
                            </div>
                            <div class="stat-info">
                                <h4>WhatsApp</h4>
                                <p><span class="whatsapp-count">0</span> messages</p>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon pending">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-info">
                                <h4>En attente</h4>
                                <p><span class="pending-count">0</span> synchronisations</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sync-actions">
                        <button class="btn btn-primary" onclick="window.socialSync.showBatchSyncModal()">
                            <i class="fas fa-sync"></i> Synchronisation en lot
                        </button>
                        <button class="btn btn-outline" onclick="window.socialSync.updateStats()">
                        <i class="fas fa-refresh"></i> Actualiser
                    </button>
                    </div>
                    
                    <div class="recent-syncs">
                        <h4>Synchronisations récentes</h4>
                        <div class="sync-list" id="syncList">
                            <!-- Chargé dynamiquement -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dashboardHtml);
        this.refreshStats();
    }

    toggleSocialDashboard() {
        this.ensureDashboard();
        const dash = document.getElementById('socialDashboard');
        if (!dash) return;
        dash.classList.toggle('show');
    }

    // Partager du contenu sur les réseaux sociaux
    async shareContent(platform, contentType, contentId) {
        try {
            const content = await this.getContentDetails(contentType, contentId);
            if (!content) {
                this.showError('Contenu non trouvé');
                return;
            }

            let result;
            
            if (platform === 'tiktok') {
                result = await this.shareToTikTok(content);
            } else if (platform === 'whatsapp') {
                result = await this.shareToWhatsApp(content);
            } else {
                this.showError('Plateforme non supportée');
                return;
            }

            if (result.success) {
                this.showSuccess(`Contenu partagé sur ${platform} avec succès !`);
                this.refreshStats();
                
                // Ouvrir le lien si disponible
                if (result.data.url) {
                    window.open(result.data.url, '_blank');
                }
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            this.showError('Erreur lors du partage: ' + error.message);
        }
    }

    // Partager sur TikTok
    async shareToTikTok(content) {
        const tiktokContent = {
            title: content.name || content.title,
            description: content.description || '',
            media_url: content.video_url || content.image_url,
            content_type: content.type || 'product'
        };

        const response = await this.apiCall('/social/sync.php?action=tiktok_share', tiktokContent, 'POST');
        return response;
    }

    // Partager sur WhatsApp
    async shareToWhatsApp(content) {
        const whatsappContent = {
            title: content.name || content.title,
            description: content.description || '',
            price: content.price || 0,
            content_type: content.type || 'product'
        };

        const response = await this.apiCall('/social/sync.php?action=whatsapp_share', whatsappContent, 'POST');
        
        if (response.success) {
            // Ouvrir WhatsApp directement
            window.open(response.data.whatsapp_url, '_blank');
        }
        
        return response;
    }

    // Synchronisation en lot
    async showBatchSyncModal() {
        this.ensureDashboard();
        const modal = document.createElement('div');
        modal.className = 'batch-sync-modal';
        modal.innerHTML = `
            <div class="batch-sync-content">
                <div class="batch-sync-header">
                    <h3>Synchronisation en Lot</h3>
                    <button class="modal-close" onclick="this.closest('.batch-sync-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="batch-sync-body">
                    <div class="sync-options">
                        <div class="sync-option">
                            <label>
                                <input type="checkbox" id="syncTikTok" checked>
                                <span class="platform-icon tiktok"><i class="fab fa-tiktok"></i></span>
                                <span>TikTok</span>
                            </label>
                        </div>
                        
                        <div class="sync-option">
                            <label>
                                <input type="checkbox" id="syncWhatsApp" checked>
                                <span class="platform-icon whatsapp"><i class="fab fa-whatsapp"></i></span>
                                <span>WhatsApp</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="content-selection">
                        <h4>Sélectionner le contenu</h4>
                        <div class="content-filters">
                            <button class="filter-btn active" data-type="all">Tout</button>
                            <button class="filter-btn" data-type="menu">Menu</button>
                            <button class="filter-btn" data-type="products">Produits</button>
                            <button class="filter-btn" data-type="lives">Lives</button>
                        </div>
                        
                        <div class="content-list" id="batchContentList">
                            <!-- Chargé dynamiquement -->
                        </div>
                    </div>
                </div>
                
                <div class="batch-sync-footer">
                    <button class="btn btn-outline" onclick="this.closest('.batch-sync-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="window.socialSync.executeBatchSync()">
                        <i class="fas fa-sync"></i> Lancer la synchronisation
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
        
        // Charger le contenu
        this.loadBatchContent();
        this.setupBatchSyncFilters();
    }

    // Charger le contenu pour la synchronisation en lot
    async loadBatchContent() {
        try {
            // Charger les items du menu
            const menuResponse = await this.apiCall('/menu/list.php');
            const productsResponse = await this.apiCall('/products/list.php');
            const livesResponse = await this.apiCall('/lives/list.php');
            
            const contentList = document.getElementById('batchContentList');
            let html = '';
            
            // Ajouter les items du menu
            if (menuResponse.success && menuResponse.data) {
                menuResponse.data.forEach(item => {
                    html += `
                        <div class="content-item" data-type="menu" data-id="${item.id}">
                            <label>
                                <input type="checkbox" class="content-checkbox">
                                <div class="content-preview">
                                    <img src="${item.image_url || '/Titi/assets/images/default.jpg'}" alt="${item.name}">
                                    <div class="content-info">
                                        <h5>${item.name}</h5>
                                        <p>${item.description || ''}</p>
                                        <span class="content-type">Menu</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    `;
                });
            }
            
            // Ajouter les produits
            if (productsResponse.success && productsResponse.data) {
                productsResponse.data.forEach(item => {
                    html += `
                        <div class="content-item" data-type="product" data-id="${item.id}">
                            <label>
                                <input type="checkbox" class="content-checkbox">
                                <div class="content-preview">
                                    <img src="${item.image_url || '/Titi/assets/images/default.jpg'}" alt="${item.name}">
                                    <div class="content-info">
                                        <h5>${item.name}</h5>
                                        <p>${item.description || ''}</p>
                                        <span class="content-type">Produit</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    `;
                });
            }
            
            contentList.innerHTML = html;
        } catch (error) {
            console.error('Erreur lors du chargement du contenu:', error);
        }
    }

    // Configurer les filtres de synchronisation en lot
    setupBatchSyncFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const contentItems = document.querySelectorAll('.content-item');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Mettre à jour les boutons actifs
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filtrer le contenu
                const filterType = btn.dataset.type;
                contentItems.forEach(item => {
                    if (filterType === 'all' || item.dataset.type === filterType) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // Exécuter la synchronisation en lot
    async executeBatchSync() {
        const selectedPlatforms = [];
        if (document.getElementById('syncTikTok').checked) selectedPlatforms.push('tiktok');
        if (document.getElementById('syncWhatsApp').checked) selectedPlatforms.push('whatsapp');
        
        if (selectedPlatforms.length === 0) {
            this.showError('Veuillez sélectionner au moins une plateforme');
            return;
        }
        
        const selectedContent = [];
        document.querySelectorAll('.content-checkbox:checked').forEach(checkbox => {
            const item = checkbox.closest('.content-item');
            selectedContent.push({
                id: item.dataset.id,
                type: item.dataset.type
            });
        });
        
        if (selectedContent.length === 0) {
            this.showError('Veuillez sélectionner au moins un contenu');
            return;
        }
        
        try {
            // Exécuter pour chaque plateforme
            for (const platform of selectedPlatforms) {
                const response = await this.apiCall('/social/sync.php?action=batch_sync', {
                    platform: platform,
                    contents: selectedContent
                }, 'POST');
                
                if (response.success) {
                    this.showSuccess(`Synchronisation ${platform} terminée`);
                } else {
                    this.showError(`Erreur lors de la synchronisation ${platform}`);
                }
            }
            
            // Fermer la modal et rafraîchir
            document.querySelector('.batch-sync-modal').remove();
            this.refreshStats();
            
        } catch (error) {
            this.showError('Erreur lors de la synchronisation: ' + error.message);
        }
    }

    // Obtenir les détails d'un contenu
    async getContentDetails(contentType, contentId) {
        try {
            let endpoint;
            if (contentType === 'menu' || contentType === 'product') {
                endpoint = `/${contentType}/get.php?id=${contentId}`;
            } else if (contentType === 'live') {
                endpoint = `/lives/manage.php?action=status&live_id=${contentId}`;
            }
            
            const response = await this.apiCall(endpoint);
            if (response.success) {
                const data = response.data;
                
                if (contentType === 'menu' || contentType === 'product') {
                    return {
                        id: data.recipe?.id || data.product?.id,
                        name: data.recipe?.name || data.product?.name,
                        description: data.recipe?.short_description || data.product?.description,
                        price: data.recipe?.price || data.product?.price,
                        image_url: data.recipe?.main_image || data.product?.image_url,
                        video_url: data.recipe?.video_url || data.product?.video_url,
                        type: contentType
                    };
                } else if (contentType === 'live') {
                    return {
                        id: data.id,
                        name: data.title,
                        description: data.description,
                        type: 'live'
                    };
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des détails:', error);
        }
        
        return null;
    }

    // Vérifier les nouveaux contenus
    async checkForNewContent() {
        try {
            const response = await this.apiCall('/social/sync.php?action=sync_status&status=pending');
            
            if (response.success && response.data.length > 0) {
                // Traiter automatiquement les contenus en attente
                for (const item of response.data) {
                    if (item.platform === 'whatsapp') {
                        // WhatsApp peut être traité automatiquement
                        await this.processPendingSync(item.id);
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des nouveaux contenus:', error);
        }
    }

    // Traiter une synchronisation en attente
    async processPendingSync(syncId) {
        try {
            // Implémenter le traitement automatique
            console.log('Traitement de la synchronisation en attente:', syncId);
        } catch (error) {
            console.error('Erreur lors du traitement:', error);
        }
    }

    // Rafraîchir les statistiques
    async refreshStats() {
        try {
            const response = await this.apiCall('/social/sync.php?action=sync_status');
            
            if (response.success) {
                const stats = {
                    tiktok: 0,
                    whatsapp: 0,
                    pending: 0
                };
                
                response.data.forEach(item => {
                    if (item.platform === 'tiktok') {
                        stats.tiktok++;
                    } else if (item.platform === 'whatsapp') {
                        stats.whatsapp++;
                    }
                    
                    if (item.status === 'pending') {
                        stats.pending++;
                    }
                });
                
                // Mettre à jour l'interface
                document.querySelector('.tiktok-count').textContent = stats.tiktok;
                document.querySelector('.whatsapp-count').textContent = stats.whatsapp;
                document.querySelector('.pending-count').textContent = stats.pending;
                
                // Mettre à jour la liste récente
                this.updateRecentSyncs(response.data.slice(0, 5));
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement des statistiques:', error);
        }
    }

    // Mettre à jour la liste des synchronisations récentes
    updateRecentSyncs(syncs) {
        const syncList = document.getElementById('syncList');
        
        if (syncs.length === 0) {
            syncList.innerHTML = '<p class="no-syncs">Aucune synchronisation récente</p>';
            return;
        }
        
        let html = '';
        syncs.forEach(sync => {
            const statusClass = sync.status === 'posted' ? 'success' : 
                              sync.status === 'failed' ? 'error' : 'pending';
            const statusIcon = sync.status === 'posted' ? 'check' : 
                              sync.status === 'failed' ? 'times' : 'clock';
            
            html += `
                <div class="sync-item">
                    <div class="sync-platform">
                        <i class="fab fa-${sync.platform}"></i>
                        <span>${sync.platform}</span>
                    </div>
                    <div class="sync-content">
                        <h5>${sync.title}</h5>
                        <p>${sync.content_type}</p>
                    </div>
                    <div class="sync-status ${statusClass}">
                        <i class="fas fa-${statusIcon}"></i>
                        <span>${sync.status}</span>
                    </div>
                </div>
            `;
        });
        
        syncList.innerHTML = html;
    }

    // Gérer les événements de partage social
    handleSocialShare(detail) {
        const { platform, content, type } = detail;
        this.shareContent(platform, type, content);
    }

    // Appel API générique
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

        const response = await fetch(this.getApiBase() + endpoint, options);
        return await response.json();
    }

    // Obtenir l'URL de base de l'API
    getApiBase() {
        // Pour le social sync, adapter le chemin selon le contexte
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/')) {
            // Si on est dans /admin/, remonter d'un niveau
            return '../backend/api';
        } else {
            // Sinon utiliser le chemin relatif depuis la racine
            return '/backend/api';
        }
    }

    // Afficher un message de succès
    showSuccess(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    // Afficher une erreur
    showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Styles CSS pour la synchronisation sociale
const socialSyncStyles = `
<style>
.social-dashboard {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 350px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    z-index: 1000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-height: 80vh;
    overflow-y: auto;
}

.social-dashboard.show {
    transform: translateX(0);
}

.social-dashboard-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.social-dashboard-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.1rem;
}

.social-dashboard-content {
    padding: 35px;
}

.social-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 20px;
}

.stat-card {
    text-align: center;
    padding: 15px;
    border-radius: 8px;
    background: #f8f9fa;
}

.stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
    font-size: 1.2rem;
    color: white;
}

.stat-icon.tiktok { background: #000000; }
.stat-icon.whatsapp { background: #25D366; }
.stat-icon.pending { background: #FFA500; }

.stat-info h4 {
    margin: 0 0 5px 0;
    font-size: 0.9rem;
    color: #666;
}

.stat-info p {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
}

.sync-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.recent-syncs h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 1rem;
}

.sync-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 10px;
    background: #f8f9fa;
}

.sync-platform {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 80px;
    font-size: 0.9rem;
}

.sync-content {
    flex: 1;
    margin-left: 15px;
}

.sync-content h5 {
    margin: 0 0 3px 0;
    font-size: 0.9rem;
    color: #333;
}

.sync-content p {
    margin: 0;
    font-size: 0.8rem;
    color: #666;
}

.sync-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8rem;
    font-weight: 600;
}

.sync-status.success { color: #28a745; }
.sync-status.error { color: #dc3545; }
.sync-status.pending { color: #ffc107; }

.batch-sync-modal {
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

.batch-sync-modal.show {
    opacity: 1;
    visibility: visible;
}

.batch-sync-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.batch-sync-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.batch-sync-body {
    flex: 1;
    padding: 35px;
    overflow-y: auto;
}

.sync-options {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.sync-option label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
}

.platform-icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.9rem;
}

.platform-icon.tiktok { background: #000000; }
.platform-icon.whatsapp { background: #25D366; }

.content-filters {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}

.filter-btn {
    padding: 8px 15px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
}

.filter-btn.active {
    background: #d4af37;
    color: white;
    border-color: #d4af37;
}

.content-list {
    max-height: 300px;
    overflow-y: auto;
}

.content-item {
    margin-bottom: 10px;
}

.content-item label {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.content-item label:hover {
    background: #f8f9fa;
}

.content-preview {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
}

.content-preview img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 8px;
}

.content-info h5 {
    margin: 0 0 3px 0;
    font-size: 0.9rem;
    color: #333;
}

.content-info p {
    margin: 0 0 3px 0;
    font-size: 0.8rem;
    color: #666;
}

.content-type {
    font-size: 0.7rem;
    padding: 2px 8px;
    background: #e9ecef;
    border-radius: 10px;
    color: #495057;
}

.batch-sync-footer {
    padding: 35px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.no-syncs {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 35px;
}

@media (max-width: 768px) {
    .social-dashboard {
        width: 90%;
        right: 5%;
        top: 60px;
    }
    
    .social-stats {
        grid-template-columns: 1fr;
        gap: 10px;
    }
    
    .sync-options {
        flex-direction: column;
        gap: 10px;
    }
    
    .content-filters {
        flex-wrap: wrap;
    }
}
</style>
`;

// Ajouter les styles au document
if (!document.querySelector('#social-sync-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'social-sync-styles';
    styleEl.innerHTML = socialSyncStyles;
    document.head.appendChild(styleEl);
}

// Initialiser le gestionnaire de synchronisation sociale uniquement sur le dashboard admin
if (document.querySelector('.admin-layout')) {
    window.socialSync = new SocialSyncManager();
}

// Exposer les fonctions globales
window.shareToSocial = function(platform, contentType, contentId) {
    window.socialSync.shareContent(platform, contentType, contentId);
};

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialSyncManager;
}
