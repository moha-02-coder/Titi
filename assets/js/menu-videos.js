/**
 * Gestion des vidéos pour les plats du menu
 * Support: Upload, YouTube, Vimeo, TikTok
 * Intégration WhatsApp et TikTok
 */

class MenuVideoManager {
    constructor() {
        this.currentItemId = null;
        this.modalCreated = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupVideoPlayers();
    }

    setupEventListeners() {
        // Écouter les clics sur les boutons d'ajout de vidéo
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-video-btn')) {
                const itemId = e.target.closest('.add-video-btn').dataset.itemId;
                this.openVideoModal(itemId);
            }
            
            if (e.target.closest('.play-video-btn')) {
                const videoData = JSON.parse(e.target.closest('.play-video-btn').dataset.video);
                this.playVideo(videoData);
            }
            
            if (e.target.closest('.sync-tiktok-btn')) {
                const itemId = e.target.closest('.sync-tiktok-btn').dataset.itemId;
                this.syncWithTikTok(itemId);
            }
            
            if (e.target.closest('.share-whatsapp-btn')) {
                const itemId = e.target.closest('.share-whatsapp-btn').dataset.itemId;
                this.shareOnWhatsApp(itemId);
            }
        });

        // Écouter les soumissions de formulaire vidéo
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'videoUploadForm') {
                e.preventDefault();
                this.handleVideoUpload(e.target);
            }
        });
    }

    // Créer la modal d'upload de vidéo
    createVideoUploadModal() {
        if (this.modalCreated) return;
        this.modalCreated = true;
        const modalHtml = `
            <div class="video-modal" id="videoModal">
                <div class="video-modal-content">
                    <div class="video-modal-header">
                        <h3>Ajouter une vidéo au plat</h3>
                        <button class="modal-close" onclick="window.videoManager.closeVideoModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="video-modal-body">
                        <form id="videoUploadForm" enctype="multipart/form-data">
                            <input type="hidden" name="item_id" id="videoItemId">
                            
                            <div class="video-type-selector">
                                <label class="video-type-option active" data-type="upload">
                                    <input type="radio" name="video_type" value="upload" checked>
                                    <div class="type-icon">
                                        <i class="fas fa-upload"></i>
                                    </div>
                                    <div class="type-text">
                                        <h4>Uploader une vidéo</h4>
                                        <p>MP4, WebM, MOV (max 100MB)</p>
                                    </div>
                                </label>
                                
                                <label class="video-type-option" data-type="youtube">
                                    <input type="radio" name="video_type" value="youtube">
                                    <div class="type-icon">
                                        <i class="fab fa-youtube"></i>
                                    </div>
                                    <div class="type-text">
                                        <h4>YouTube</h4>
                                        <p>Lien vers une vidéo YouTube</p>
                                    </div>
                                </label>
                                
                                <label class="video-type-option" data-type="vimeo">
                                    <input type="radio" name="video_type" value="vimeo">
                                    <div class="type-icon">
                                        <i class="fab fa-vimeo"></i>
                                    </div>
                                    <div class="type-text">
                                        <h4>Vimeo</h4>
                                        <p>Lien vers une vidéo Vimeo</p>
                                    </div>
                                </label>
                                
                                <label class="video-type-option" data-type="tiktok">
                                    <input type="radio" name="video_type" value="tiktok">
                                    <div class="type-icon">
                                        <i class="fab fa-tiktok"></i>
                                    </div>
                                    <div class="type-text">
                                        <h4>TikTok</h4>
                                        <p>Lien vers une vidéo TikTok</p>
                                    </div>
                                </label>
                            </div>
                            
                            <div class="video-upload-section" id="uploadSection">
                                <div class="file-upload-area" id="fileUploadArea">
                                    <input type="file" name="video" id="videoFile" accept="video/*" style="display: none;">
                                    <div class="upload-placeholder">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <h4>Glissez votre vidéo ici</h4>
                                        <p>ou cliquez pour parcourir</p>
                                        <button type="button" class="btn btn-outline" onclick="document.getElementById('videoFile').click()">
                                            Choisir un fichier
                                        </button>
                                    </div>
                                    <div class="upload-preview" id="uploadPreview" style="display: none;">
                                        <video controls id="videoPreview"></video>
                                        <div class="upload-info">
                                            <span class="file-name" id="fileName"></span>
                                            <button type="button" class="btn btn-sm btn-danger" onclick="window.videoManager.clearVideoFile()">
                                                <i class="fas fa-trash"></i> Supprimer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="video-url-section" id="urlSection" style="display: none;">
                                <div class="form-group">
                                    <label>URL de la vidéo</label>
                                    <input type="url" name="video_url" id="videoUrl" placeholder="https://youtube.com/watch?v=..." class="form-input">
                                </div>
                                <div class="url-preview" id="urlPreview" style="display: none;">
                                    <div class="preview-embed" id="previewEmbed"></div>
                                </div>
                            </div>
                            
                            <div class="video-actions">
                                <button type="button" class="btn btn-outline" onclick="window.videoManager.closeVideoModal()">
                                    Annuler
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Enregistrer la vidéo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupVideoTypeSelector();
        this.setupFileUpload();
    }

    ensureModal() {
        if (document.getElementById('videoModal')) {
            this.modalCreated = true;
            return;
        }
        this.createVideoUploadModal();
    }

    // Configurer le sélecteur de type de vidéo
    setupVideoTypeSelector() {
        const typeOptions = document.querySelectorAll('.video-type-option');
        
        typeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Désactiver toutes les options
                typeOptions.forEach(opt => opt.classList.remove('active'));
                
                // Activer l'option cliquée
                option.classList.add('active');
                
                const type = option.dataset.type;
                const uploadSection = document.getElementById('uploadSection');
                const urlSection = document.getElementById('urlSection');
                
                if (type === 'upload') {
                    uploadSection.style.display = 'block';
                    urlSection.style.display = 'none';
                } else {
                    uploadSection.style.display = 'none';
                    urlSection.style.display = 'block';
                }
            });
        });
    }

    // Configurer l'upload de fichier
    setupFileUpload() {
        const fileInput = document.getElementById('videoFile');
        const uploadArea = document.getElementById('fileUploadArea');
        const preview = document.getElementById('uploadPreview');
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
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                this.handleVideoFile(files[0]);
            }
        });
        
        // Gérer la sélection de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleVideoFile(e.target.files[0]);
            }
        });
    }

    // Gérer le fichier vidéo
    handleVideoFile(file) {
        if (file.size > 100 * 1024 * 1024) { // 100MB
            alert('La vidéo ne doit pas dépasser 100MB');
            return;
        }
        
        const preview = document.getElementById('videoPreview');
        const fileName = document.getElementById('fileName');
        const uploadPreview = document.getElementById('uploadPreview');
        const placeholder = document.querySelector('.upload-placeholder');
        
        // Afficher l'aperçu
        preview.src = URL.createObjectURL(file);
        fileName.textContent = file.name;
        
        placeholder.style.display = 'none';
        uploadPreview.style.display = 'block';
    }

    // Vider le fichier vidéo
    clearVideoFile() {
        const fileInput = document.getElementById('videoFile');
        const preview = document.getElementById('videoPreview');
        const uploadPreview = document.getElementById('uploadPreview');
        const placeholder = document.querySelector('.upload-placeholder');
        
        fileInput.value = '';
        preview.src = '';
        
        uploadPreview.style.display = 'none';
        placeholder.style.display = 'block';
    }

    // Ouvrir la modal vidéo
    openVideoModal(itemId) {
        this.ensureModal();
        this.currentItemId = itemId;
        const modal = document.getElementById('videoModal');
        const itemIdInput = document.getElementById('videoItemId');
        
        itemIdInput.value = itemId;
        modal.classList.add('show');
    }

    // Fermer la modal vidéo
    closeVideoModal() {
        const modal = document.getElementById('videoModal');
        modal.classList.remove('show');
        
        // Réinitialiser le formulaire
        document.getElementById('videoUploadForm').reset();
        this.clearVideoFile();
        
        // Réinitialiser les sections
        document.getElementById('uploadSection').style.display = 'block';
        document.getElementById('urlSection').style.display = 'none';
        
        // Réactiver l'option upload
        document.querySelectorAll('.video-type-option').forEach(opt => {
            opt.classList.remove('active');
        });
        document.querySelector('.video-type-option[data-type="upload"]').classList.add('active');
    }

    // Gérer l'upload de vidéo
    async handleVideoUpload(form) {
        const formData = new FormData(form);
        
        try {
            const response = await this.apiCall('/menu/video.php?action=upload_video', formData, 'POST');
            
            if (response.success) {
                this.showSuccess('Vidéo ajoutée avec succès !');
                this.closeVideoModal();
                
                // Recharger les items du menu
                if (typeof window.loadMenu === 'function') {
                    window.loadMenu();
                }
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Erreur lors de l\'upload: ' + error.message);
        }
    }

    // Jouer une vidéo
    playVideo(videoData) {
        const modal = document.createElement('div');
        modal.className = 'video-player-modal';
        modal.innerHTML = `
            <div class="video-player-content">
                <div class="video-player-header">
                    <h3>${videoData.name}</h3>
                    <button class="modal-close" onclick="this.closest('.video-player-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="video-player-body">
                    <div class="video-container">
                        ${this.generateVideoEmbed(videoData)}
                    </div>
                    <div class="video-info">
                        <p>${videoData.description || ''}</p>
                        <div class="video-actions">
                            <button class="btn btn-sm btn-outline" onclick="window.videoManager.shareVideo('${videoData.name}', '${videoData.video_url}')">
                                <i class="fas fa-share"></i> Partager
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="window.videoManager.addToCart('${videoData.id}')">
                                <i class="fas fa-cart-plus"></i> Commander
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
    }

    // Générer l'embed de vidéo selon le type
    generateVideoEmbed(videoData) {
        const { video_url, video_type } = videoData;
        
        switch (video_type) {
            case 'youtube':
                return `<iframe src="${video_url}" frameborder="0" allowfullscreen></iframe>`;
            case 'vimeo':
                return `<iframe src="${video_url}" frameborder="0" allowfullscreen></iframe>`;
            case 'tiktok':
                return `<iframe src="${video_url}" frameborder="0" allowfullscreen></iframe>`;
            case 'upload':
            default:
                return `<video controls>
                    <source src="${video_url}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>`;
        }
    }

    // Synchroniser avec TikTok
    async syncWithTikTok(itemId) {
        const tiktokUrl = prompt('Entrez l\'URL de la vidéo TikTok:');
        
        if (!tiktokUrl) return;
        
        try {
            const response = await this.apiCall('/menu/video.php?action=sync_tiktok', {
                item_id: itemId,
                tiktok_url: tiktokUrl
            }, 'POST');
            
            if (response.success) {
                this.showSuccess('Synchronisation TikTok réussie !');
                
                // Recharger les items
                if (typeof window.loadMenu === 'function') {
                    window.loadMenu();
                }
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Erreur lors de la synchronisation TikTok: ' + error.message);
        }
    }

    // Partager sur WhatsApp
    async shareOnWhatsApp(itemId) {
        try {
            const response = await this.apiCall('/menu/video.php?action=sync_whatsapp', {
                item_id: itemId
            }, 'POST');
            
            if (response.success) {
                // Ouvrir WhatsApp
                window.open(response.data.whatsapp_url, '_blank');
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Erreur lors du partage WhatsApp: ' + error.message);
        }
    }

    // Partager une vidéo
    shareVideo(title, videoUrl) {
        const shareText = `🍽️ Découvrez cette vidéo : ${title}\n\n${videoUrl}\n\n#TitiGoldenTaste #CuisineMali`;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(shareText);
            this.showSuccess('Lien de partage copié !');
        }
    }

    // Ajouter au panier depuis la vidéo
    addToCart(itemId) {
        // Implémenter l'ajout au panier
        if (typeof window.addToCart === 'function') {
            window.addToCart({ id: itemId });
        }
    }

    // Configurer les lecteurs vidéo sur la page
    setupVideoPlayers() {
        // Ajouter des boutons vidéo aux items de menu existants
        const observer = new MutationObserver(() => {
            this.addVideoButtonsToMenuItems();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Initial scan
        this.addVideoButtonsToMenuItems();
    }

    // Ajouter des boutons vidéo aux items de menu
    addVideoButtonsToMenuItems() {
        const menuItems = document.querySelectorAll('.menu-item, .product-card');
        
        menuItems.forEach(item => {
            if (!item.querySelector('.video-actions')) {
                const itemId = item.dataset.itemId || item.querySelector('[data-item-id]')?.dataset.itemId;
                
                if (itemId) {
                    const actionsHtml = `
                        <div class="video-actions">
                            <button class="btn btn-sm btn-outline add-video-btn" data-item-id="${itemId}">
                                <i class="fas fa-video"></i> Ajouter vidéo
                            </button>
                            <button class="btn btn-sm btn-outline sync-tiktok-btn" data-item-id="${itemId}">
                                <i class="fab fa-tiktok"></i> TikTok
                            </button>
                            <button class="btn btn-sm btn-outline share-whatsapp-btn" data-item-id="${itemId}">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </button>
                        </div>
                    `;
                    
                    item.insertAdjacentHTML('beforeend', actionsHtml);
                }
            }
        });
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

// Styles CSS pour la gestion des vidéos
const videoStyles = `
<style>
.video-modal {
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

.video-modal.show {
    opacity: 1;
    visibility: visible;
}

.video-modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.video-modal-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.video-modal-body {
    padding: 35px;
    overflow-y: auto;
}

.video-type-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
}

.video-type-option {
    border: 2px solid #e9ecef;
    border-radius: 12px;
    padding: 35px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.video-type-option:hover {
    border-color: #d4af37;
    transform: translateY(-2px);
}

.video-type-option.active {
    border-color: #d4af37;
    background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(212,175,55,0.1));
}

.video-type-option input[type="radio"] {
    position: absolute;
    opacity: 0;
}

.type-icon {
    font-size: 2rem;
    color: #d4af37;
    margin-bottom: 10px;
}

.type-text h4 {
    margin: 0 0 5px 0;
    color: #333;
}

.type-text p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
}

.file-upload-area {
    border: 2px dashed #ddd;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    transition: all 0.3s ease;
}

.file-upload-area.drag-over {
    border-color: #d4af37;
    background: rgba(212,175,55,0.05);
}

.upload-placeholder i {
    font-size: 3rem;
    color: #ddd;
    margin-bottom: 15px;
}

.upload-preview video {
    width: 100%;
    max-height: 300px;
    border-radius: 8px;
    margin-bottom: 15px;
}

.upload-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.file-name {
    font-weight: 600;
    color: #333;
}

.video-url-section .form-group {
    margin-bottom: 20px;
}

.form-input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
}

.video-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
}

.video-player-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.video-player-modal.show {
    opacity: 1;
    visibility: visible;
}

.video-player-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.video-player-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.video-player-body {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.video-container {
    flex: 1;
    background: #000;
    min-height: 400px;
}

.video-container iframe,
.video-container video {
    width: 100%;
    height: 100%;
    border: none;
}

.video-info {
    padding: 35px;
    border-top: 1px solid #eee;
}

.video-info .video-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.menu-item .video-actions,
.product-card .video-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    flex-wrap: wrap;
}

.video-actions .btn {
    font-size: 0.8rem;
    padding: 6px 12px;
}

@media (max-width: 768px) {
    .video-modal-content {
        width: 95%;
        margin: 10px;
    }
    
    .video-type-selector {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .video-player-content {
        width: 95%;
        height: 90vh;
    }
    
    .video-player-body {
        flex-direction: column;
    }
    
    .video-container {
        height: 300px;
    }
}
</style>
`;

// Ajouter les styles au document
if (!document.querySelector('#video-manager-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'video-manager-styles';
    styleEl.innerHTML = videoStyles;
    document.head.appendChild(styleEl);
}

// Initialiser le gestionnaire de vidéos uniquement sur le dashboard admin
if (document.querySelector('.admin-layout')) {
    window.videoManager = new MenuVideoManager();
}

// Exposer les fonctions globales
window.openVideoModal = function(itemId) {
    window.videoManager.openVideoModal(itemId);
};

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuVideoManager;
}
