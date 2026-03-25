/**
 * Gestion des médias (images/vidéos) pour le dashboard admin
 * Permet de changer facilement les images et vidéos des menus
 */

class MenuMediaManager {
    constructor() {
        this.currentItemId = null;
        this.currentMediaType = 'image';
        this.modalCreated = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Gestion des clics sur les boutons de média
        document.addEventListener('click', function(e) {
            const changeImageBtn = e.target.closest('.change-image-btn');
            const changeVideoBtn = e.target.closest('.change-video-btn');
            
            if (changeImageBtn) {
                e.preventDefault();
                e.stopPropagation();
                const itemId = changeImageBtn.dataset.itemId;
                if (itemId && window.mediaManager) {
                    window.mediaManager.openImageSelector(itemId);
                }
            }
            
            if (changeVideoBtn) {
                e.preventDefault();
                e.stopPropagation();
                const itemId = changeVideoBtn.dataset.itemId;
                if (itemId && window.mediaManager) {
                    window.mediaManager.openVideoSelector(itemId);
                }
            }
            
            if (e.target.closest('.remove-image-btn')) {
                const itemId = e.target.closest('.remove-image-btn').dataset.itemId;
                window.mediaManager.removeMedia(itemId, 'image');
            }
            
            if (e.target.closest('.remove-video-btn')) {
                const itemId = e.target.closest('.remove-video-btn').dataset.itemId;
                this.removeMedia(itemId, 'video');
            }
        });

        // Écouter la soumission du formulaire média
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'mediaUploadForm') {
                e.preventDefault();
                this.handleMediaUpload(e.target);
            }
        });
    }

    // Créer la modal de gestion des médias
    createMediaModal() {
        if (this.modalCreated) return;
        this.modalCreated = true;
        const modalHtml = `
            <div class="media-modal" id="mediaModal">
                <div class="media-modal-content">
                    <div class="media-modal-header">
                        <h3 id="mediaModalTitle">Gérer le média</h3>
                        <button class="modal-close" onclick="window.mediaManager.closeMediaModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="media-modal-body">
                        <form id="mediaUploadForm" enctype="multipart/form-data">
                            <input type="hidden" name="item_id" id="mediaItemId">
                            <input type="hidden" name="media_type" id="mediaType">
                            
                            <div class="media-tabs">
                                <button type="button" class="tab-btn active" data-tab="upload">
                                    <i class="fas fa-upload"></i> Upload
                                </button>
                                <button type="button" class="tab-btn" data-tab="url">
                                    <i class="fas fa-link"></i> URL
                                </button>
                                <button type="button" class="tab-btn" data-tab="none">
                                    <i class="fas fa-ban"></i> Aucun média
                                </button>
                            </div>
                            
                            <div class="tab-content active" id="uploadTab">
                                <div class="upload-area" id="mediaUploadArea">
                                    <input type="file" name="media_file" id="mediaFile" accept="image/*,video/*" style="display: none;">
                                    <div class="upload-placeholder">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <h4>Déposez votre fichier ici</h4>
                                        <p>ou cliquez pour parcourir</p>
                                        <button type="button" class="btn btn-outline" onclick="document.getElementById('mediaFile').click()">
                                            Choisir un fichier
                                        </button>
                                    </div>
                                    <div class="upload-preview" id="mediaPreview" style="display: none;">
                                        <div class="preview-content" id="previewContent"></div>
                                        <div class="upload-info">
                                            <span class="file-name" id="fileName"></span>
                                            <button type="button" class="btn btn-sm btn-danger" onclick="window.mediaManager.clearFile()">
                                                <i class="fas fa-trash"></i> Supprimer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-content" id="urlTab">
                                <div class="form-group">
                                    <label>URL du média</label>
                                    <input type="url" name="media_url" id="mediaUrl" placeholder="https://example.com/image.jpg" class="form-input">
                                </div>
                                <div class="url-preview" id="urlPreview" style="display: none;">
                                    <div class="preview-content" id="urlPreviewContent"></div>
                                </div>
                            </div>
                            
                            <div class="tab-content" id="noneTab">
                                <div class="no-media-option">
                                    <i class="fas fa-ban"></i>
                                    <h4>Supprimer le média actuel</h4>
                                    <p>Ce plat/produit n'aura pas d'image ou de vidéo</p>
                                    <button type="button" class="btn btn-danger" onclick="window.mediaManager.removeCurrentMedia()">
                                        <i class="fas fa-trash"></i> Supprimer le média
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="media-modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.mediaManager.closeMediaModal()">
                            Annuler
                        </button>
                        <button type="submit" form="mediaUploadForm" class="btn btn-primary">
                            <i class="fas fa-save"></i> Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupTabSwitching();
        this.setupFileUpload();
    }

    ensureModal() {
        if (document.getElementById('mediaModal')) {
            this.modalCreated = true;
            return;
        }
        this.createMediaModal();
    }

    // Configurer le changement d'onglets
    setupTabSwitching() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Désactiver tous les onglets
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Activer l'onglet cliqué
                btn.classList.add('active');
                const tabId = btn.dataset.tab + 'Tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // Configurer l'upload de fichier
    setupFileUpload() {
        const fileInput = document.getElementById('mediaFile');
        const uploadArea = document.getElementById('mediaUploadArea');
        const preview = document.getElementById('mediaPreview');
        const placeholder = document.querySelector('.upload-placeholder');

        // Gérer le drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Gérer la sélection de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    // Gérer la sélection de fichier
    handleFileSelect(file) {
        const preview = document.getElementById('mediaPreview');
        const placeholder = document.querySelector('.upload-placeholder');
        const fileName = document.getElementById('fileName');
        const previewContent = document.getElementById('previewContent');

        // Vérifier le type de fichier
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB pour vidéo, 10MB pour image

        if (file.size > maxSize) {
            this.showNotification(`Fichier trop volumineux (${isVideo ? '50MB max pour vidéo' : '10MB max pour image'})`, 'error');
            return;
        }

        // Afficher l'aperçu
        if (isVideo) {
            previewContent.innerHTML = `
                <video controls style="max-width: 100%; max-height: 200px;">
                    <source src="${URL.createObjectURL(file)}" type="${file.type}">
                </video>
            `;
        } else {
            previewContent.innerHTML = `
                <img src="${URL.createObjectURL(file)}" style="max-width: 100%; max-height: 200px; object-fit: cover;">
            `;
        }

        fileName.textContent = file.name;
        placeholder.style.display = 'none';
        preview.style.display = 'block';
    }

    // Vider le fichier sélectionné
    clearFile() {
        const fileInput = document.getElementById('mediaFile');
        const preview = document.getElementById('mediaPreview');
        const placeholder = document.querySelector('.upload-placeholder');

        fileInput.value = '';
        placeholder.style.display = 'block';
        preview.style.display = 'none';
    }

    // Ouvrir la modal média
    async openMediaModal(itemId, mediaType) {
        this.ensureModal();
        this.currentItemId = itemId;
        this.currentMediaType = mediaType;

        // Récupérer les informations actuelles
        try {
            const response = await this.apiCall('/menu/list.php');
            if (response.success) {
                const item = response.data.find(i => i.id == itemId);
                if (item) {
                    this.populateMediaModal(item, mediaType);
                    document.getElementById('mediaModal').classList.add('show');
                }
            }
        } catch (error) {
            this.showNotification('Erreur lors du chargement des informations', 'error');
        }
    }

    // Remplir la modal avec les informations actuelles
    populateMediaModal(item, mediaType) {
        const title = document.getElementById('mediaModalTitle');
        const mediaTypeInput = document.getElementById('mediaType');
        const mediaUrlInput = document.getElementById('mediaUrl');

        title.textContent = `Gérer la ${mediaType === 'video' ? 'vidéo' : 'image'} - ${item.name}`;
        mediaTypeInput.value = mediaType;

        // Afficher le média actuel s'il existe
        const currentMedia = mediaType === 'video' ? item.video_url : item.image_url;
        if (currentMedia) {
            const urlPreview = document.getElementById('urlPreview');
            const urlPreviewContent = document.getElementById('urlPreviewContent');

            if (mediaType === 'video') {
                urlPreviewContent.innerHTML = `
                    <video controls style="max-width: 100%; max-height: 200px;">
                        <source src="${currentMedia}" type="video/mp4">
                    </video>
                `;
            } else {
                urlPreviewContent.innerHTML = `
                    <img src="${currentMedia}" style="max-width: 100%; max-height: 200px; object-fit: cover;">
                `;
            }

            urlPreview.style.display = 'block';
            mediaUrlInput.value = currentMedia;
        }
    }

    // Gérer l'upload de média
    async handleMediaUpload(form) {
        const formData = new FormData(form);
        
        // Déterminer l'action selon l'onglet actif
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        if (activeTab === 'none') {
            // Supprimer le média
            await this.removeMedia(this.currentItemId, this.currentMediaType);
            this.closeMediaModal();
            return;
        }

        if (activeTab === 'upload' && !document.getElementById('mediaFile').files.length) {
            this.showNotification('Veuillez sélectionner un fichier', 'error');
            return;
        }

        if (activeTab === 'url' && !formData.get('media_url')) {
            this.showNotification('Veuillez entrer une URL', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/menu/media.php?action=update_media', formData, 'POST');
            
            if (response.success) {
                this.showNotification('Média mis à jour avec succès', 'success');
                this.closeMediaModal();
                
                // Recharger la liste
                if (typeof window.loadMenu === 'function') {
                    window.loadMenu();
                }
            } else {
                this.showNotification(response.message, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur lors de la mise à jour: ' + error.message, 'error');
        }
    }

    // Supprimer un média
    async removeMedia(itemId, mediaType) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer cette ${mediaType === 'video' ? 'vidéo' : 'image'} ?`)) {
            return;
        }

        try {
            const response = await this.apiCall('/menu/media.php?action=remove_media', {
                item_id: itemId,
                media_type: mediaType
            }, 'POST');
            
            if (response.success) {
                this.showNotification('Média supprimé avec succès', 'success');
                
                // Recharger la liste
                if (typeof window.loadMenu === 'function') {
                    window.loadMenu();
                }
            } else {
                this.showNotification(response.message, 'error');
            }
        } catch (error) {
            this.showNotification('Erreur lors de la suppression: ' + error.message, 'error');
        }
    }

    // Supprimer le média actuel
    async removeCurrentMedia() {
        await this.removeMedia(this.currentItemId, this.currentMediaType);
        this.closeMediaModal();
    }

    // Fermer la modal média
    closeMediaModal() {
        const modal = document.getElementById('mediaModal');
        modal.classList.remove('show');
        
        // Réinitialiser le formulaire
        document.getElementById('mediaUploadForm').reset();
        this.clearFile();
        
        // Masquer les aperçus
        document.getElementById('urlPreview').style.display = 'none';
    }

    // Ajouter les boutons de gestion média aux items existants
    addMediaButtonsToItems() {
        const menuItems = document.querySelectorAll('.menu-item, .product-card');
        
        menuItems.forEach(item => {
            if (!item.querySelector('.media-actions')) {
                const itemId = item.dataset.itemId || item.querySelector('[data-item-id]')?.dataset.itemId;
                
                if (itemId) {
                    const actionsHtml = `
                        <div class="media-actions">
                            <button class="btn btn-sm btn-outline change-image-btn" data-item-id="${itemId}">
                                <i class="fas fa-image"></i> Image
                            </button>
                            <button class="btn btn-sm btn-outline change-video-btn" data-item-id="${itemId}">
                                <i class="fas fa-video"></i> Vidéo
                            </button>
                        </div>
                    `;
                    
                    item.appendChild(actionsHtml);
                }
            }
        });
    }

    // Afficher une notification
    showNotification(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // Appel API générique
    async apiCall(endpoint, data = null, method = 'GET') {
        const options = {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || 'admin_token_123')
            }
        };

        if (data && method !== 'GET') {
            if (data instanceof FormData) {
                options.body = data;
                delete options.headers['Content-Type'];
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        const response = await fetch(this.getApiBase() + endpoint, options);
        return await response.json();
    }

    // Obtenir l'URL de base de l'API
    getApiBase() {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/');
        const projectIndex = pathParts.findIndex(part => part.includes('Titi'));
        
        if (projectIndex !== -1) {
            return '/' + pathParts.slice(0, projectIndex + 1).join('/') + '/backend/api';
        }
        return '/backend/api';
    }
}

// Styles CSS pour la gestion des médias
const mediaStyles = `
<style>
.media-modal {
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

.media-modal.show {
    opacity: 1;
    visibility: visible;
}

.media-modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.media-modal-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.media-modal-header h3 {
    margin: 0;
    color: #333;
}

.media-modal-body {
    flex: 1;
    padding: 35px;
    overflow-y: auto;
}

.media-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid #eee;
}

.tab-btn {
    padding: 10px 20px;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s ease;
}

.tab-btn.active {
    border-bottom-color: #d4af37;
    color: #d4af37;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

.upload-area {
    border: 2px dashed #ddd;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    transition: all 0.3s ease;
}

.upload-area.drag-over {
    border-color: #d4af37;
    background: rgba(212,175,55,0.05);
}

.upload-placeholder i {
    font-size: 3rem;
    color: #ddd;
    margin-bottom: 15px;
}

.upload-placeholder h4 {
    margin: 0 0 10px 0;
    color: #333;
}

.upload-placeholder p {
    margin: 0 0 20px 0;
    color: #666;
}

.upload-preview {
    text-align: center;
}

.upload-preview video,
.upload-preview img {
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.upload-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
}

.file-name {
    font-weight: 600;
    color: #333;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
}

.form-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
}

.url-preview {
    margin-top: 15px;
    text-align: center;
}

.url-preview video,
.url-preview img {
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    max-width: 100%;
}

.no-media-option {
    text-align: center;
    padding: 40px;
}

.no-media-option i {
    font-size: 3rem;
    color: #dc3545;
    margin-bottom: 15px;
}

.no-media-option h4 {
    margin: 0 0 10px 0;
    color: #333;
}

.no-media-option p {
    margin: 0 0 20px 0;
    color: #666;
}

.media-modal-footer {
    padding: 35px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.media-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
}

.media-actions .btn {
    font-size: 0.8rem;
    padding: 6px 12px;
}

@media (max-width: 768px) {
    .media-modal-content {
        width: 95%;
        margin: 10px;
    }
    
    .media-tabs {
        flex-wrap: wrap;
    }
    
    .tab-btn {
        flex: 1;
        min-width: 100px;
        text-align: center;
    }
    
    .upload-area {
        padding: 35px;
    }
}
</style>
`;

// Ajouter les styles au document
if (!document.querySelector('#media-manager-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'media-manager-styles';
    styleEl.innerHTML = mediaStyles;
    document.head.appendChild(styleEl);
}

// Initialiser le gestionnaire de médias uniquement sur le dashboard admin
if (document.querySelector('.admin-layout')) {
    window.mediaManager = new MenuMediaManager();
}

// Exposer les fonctions globales
window.openMediaModal = function(itemId, mediaType) {
    window.mediaManager.openMediaModal(itemId, mediaType);
};

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuMediaManager;
}
