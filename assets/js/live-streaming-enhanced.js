/**
 * Système de Live Streaming Amélioré pour Titi Golden Taste
 * Version corrigée avec gestion robuste des erreurs et debugging
 */

class EnhancedLiveStreamingManager {
    constructor() {
        this.currentLive = null;
        this.pollingInterval = null;
        this.notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        this.isHandlingLiveStarted = false;
        this.isHandlingLiveEnded = false;
        this.debugMode = true; // Activer le debugging
        
        this.init();
    }

    init() {
        this.log('Initialisation du Enhanced Live Streaming Manager');
        this.setupEventListeners();
        this.startPolling();
        this.checkForActiveLive();
    }

    log(message, level = 'info') {
        if (this.debugMode) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] [LiveManager] [${level.toUpperCase()}] ${message}`);
        }
    }

    setupEventListeners() {
        this.log('Configuration des écouteurs d\'événements');
        
        // Écouter les événements de live
        window.addEventListener('live:started', (event) => {
            this.log('Événement live:started reçu', 'event');
            this.handleLiveStarted(event.detail);
        });

        window.addEventListener('live:ended', (event) => {
            this.log('Événement live:ended reçu', 'event');
            this.handleLiveEnded(event.detail);
        });

        // Écouter les clics sur les notifications
        document.addEventListener('click', (e) => {
            if (e.target.closest('.live-notification')) {
                this.handleNotificationClick(e.target.closest('.live-notification'));
            }
        });
    }

    // Démarrer un live (admin seulement)
    async startLive(title, description = '') {
        this.log(`Tentative de démarrage du live: "${title}"`, 'info');
        
        if (!this.isAdmin()) {
            this.showError('Seul un administrateur peut démarrer un live');
            return false;
        }

        try {
            const requestData = {
                action: 'start',
                title: title || 'Live Direct - Titi Golden Taste',
                description: description || 'Rejoignez notre live culinaire !',
                stream_url: (this.pendingStreamUrl || '').toString().trim()
            };
            
            this.log('Données envoyées:', requestData, 'debug');
            
            const response = await this.apiCall('/lives/manage.php', requestData, 'POST');
            this.log('Réponse du serveur:', response, 'debug');

            if (response.success) {
                this.currentLive = response.data;
                this.log('Live démarré avec succès', 'success');
                this.showLiveControls(response.data);
                this.broadcastLiveStarted(response.data);
                this.showSuccess('Live démarré avec succès');
                return true;
            } else {
                this.log(`Échec du démarrage: ${response.message}`, 'error');
                this.showError(response.message || 'Erreur lors du démarrage du live');
                return false;
            }
        } catch (error) {
            this.log(`Exception lors du démarrage: ${error.message}`, 'error');
            this.showError('Erreur lors du démarrage du live: ' + error.message);
            return false;
        }
    }

    // Arrêter un live (admin seulement)
    async endLive() {
        this.log('Tentative d\'arrêt du live', 'info');
        
        if (!this.isAdmin()) {
            this.showError('Seul un administrateur peut arrêter un live');
            return false;
        }
        
        if (!this.currentLive) {
            this.showError('Aucun live actif à arrêter');
            return false;
        }

        // Récupérer l'ID du live de manière plus robuste
        const liveId = this.currentLive.id || this.currentLive.live_id;
        if (!liveId) {
            this.log('ID du live manquant', 'error');
            this.showError('Impossible d\'arrêter le live: ID manquant');
            return false;
        }

        try {
            this.log(`Arrêt du live ID: ${liveId}`, 'debug');
            
            const response = await this.apiCall('/lives/manage.php', {
                action: 'end',
                live_id: liveId
            }, 'POST');

            this.log('Réponse arrêt live:', response, 'debug');

            if (response.success) {
                this.log('Live arrêté avec succès', 'success');
                this.hideLiveControls();
                this.broadcastLiveEnded(this.currentLive);
                this.currentLive = null;
                this.showSuccess('Live arrêté avec succès');
                return true;
            } else {
                this.log(`Échec de l\'arrêt: ${response.message}`, 'error');
                this.showError(response.message || 'Erreur lors de l\'arrêt du live');
                return false;
            }
        } catch (error) {
            this.log(`Exception lors de l\'arrêt: ${error.message}`, 'error');
            this.showError('Erreur lors de l\'arrêt du live: ' + error.message);
            return false;
        }
    }

    // Vérifier s'il y a un live actif
    async checkForActiveLive() {
        this.log('Vérification des lives actifs', 'debug');
        
        try {
            const response = await this.apiCall('/lives/manage.php?action=status');
            this.log('Réponse checkForActiveLive:', response, 'debug');
            
            if (response.success && response.data && response.data.length > 0) {
                const activeLive = response.data.find(live => live.status === 'live');
                
                if (activeLive) {
                    // Vérifier si c'est le même live que celui déjà chargé
                    const currentId = this.currentLive ? (this.currentLive.id || this.currentLive.live_id) : null;
                    const newId = activeLive.id || activeLive.live_id;
                    
                    if (!currentId || currentId !== newId) {
                        this.log('Nouveau live actif détecté', 'info');
                        this.handleLiveStarted(activeLive);
                    } else {
                        this.log('Live actif déjà chargé', 'debug');
                    }
                } else {
                    // Si on avait un live actif mais qu'il n'est plus là
                    if (this.currentLive && this.currentLive.status === 'live') {
                        this.log('Live actif disparu, marquer comme terminé', 'warning');
                        this.handleLiveEnded(this.currentLive);
                    }
                }
            } else {
                this.log('Aucun live trouvé', 'debug');
            }
        } catch (error) {
            this.log(`Erreur lors de la vérification: ${error.message}`, 'error');
        }
    }

    // Démarrer le polling pour les notifications
    startPolling() {
        this.log('Démarrage du polling (30s)', 'debug');
        
        // Arrêter le polling existant s'il y en a un
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Polling toutes les 30 secondes
        this.pollingInterval = setInterval(() => {
            this.checkNotifications();
            this.updateLiveStatus();
        }, 30000);
    }

    // Arrêter le polling
    stopPolling() {
        this.log('Arrêt du polling', 'debug');
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Vérifier les notifications
    async checkNotifications() {
        const userType = this.isAdmin() ? 'admin' : 'customer';
        
        try {
            const response = await this.apiCall(`/lives/manage.php?action=notifications&user_type=${userType}`);
            
            if (response.success && response.data.length > 0) {
                this.log(`${response.data.length} notifications trouvées`, 'debug');
                
                response.data.forEach(notification => {
                    this.showNotification(notification);
                    this.markNotificationAsRead(notification.id);
                });
            }
        } catch (error) {
            this.log(`Erreur notifications: ${error.message}`, 'error');
        }
    }

    // Mettre à jour le statut du live actuel
    async updateLiveStatus() {
        if (!this.currentLive) return;

        try {
            // Récupérer l'ID de manière robuste
            const liveId = this.currentLive.id || this.currentLive.live_id;
            if (!liveId) {
                this.log('ID du live non disponible pour la mise à jour', 'warning');
                return;
            }

            const response = await this.apiCall(`/lives/manage.php?action=status&live_id=${liveId}`);
            
            if (response.success && response.data) {
                if (response.data.status === 'ended') {
                    this.log('Live terminé détecté via polling', 'info');
                    this.handleLiveEnded(response.data);
                } else {
                    // Mettre à jour les données du live actuel
                    this.currentLive = response.data;
                    this.updateLiveViewers(response.data.viewers_count || 0);
                }
            }
        } catch (error) {
            this.log(`Erreur mise à jour statut: ${error.message}`, 'error');
        }
    }

    // Gérer le démarrage d'un live
    handleLiveStarted(liveData) {
        // Éviter la récursion infinie
        if (this.isHandlingLiveStarted) {
            this.log('Déjà en train de gérer le démarrage du live', 'warning');
            return;
        }
        
        this.isHandlingLiveStarted = true;
        
        try {
            this.log(`Gestion du démarrage du live: ${liveData.title}`, 'info');
            this.currentLive = liveData;
            
            // Afficher les contrôles pour l'admin
            if (this.isAdmin()) {
                this.showLiveControls(liveData);
            }

            // Afficher le bouton de live flottant pour les clients
            if (!this.isAdmin()) {
                this.showLiveButton(liveData);
            }

            // Diffuser l'événement
            window.dispatchEvent(new CustomEvent('live:started', { detail: liveData }));
            
        } finally {
            this.isHandlingLiveStarted = false;
        }
    }

    // Gérer la fin d'un live
    handleLiveEnded(liveData) {
        // Éviter la récursion infinie
        if (this.isHandlingLiveEnded) {
            this.log('Déjà en train de gérer la fin du live', 'warning');
            return;
        }
        
        this.isHandlingLiveEnded = true;
        
        try {
            this.log(`Gestion de la fin du live: ${liveData.title}`, 'info');
            this.currentLive = null;
            this.hideLiveControls();
            this.hideLiveButton();
            
            // Diffuser l'événement
            window.dispatchEvent(new CustomEvent('live:ended', { detail: liveData }));
            
        } finally {
            this.isHandlingLiveEnded = false;
        }
    }

    // Afficher les contrôles de live (admin)
    showLiveControls(liveData) {
        this.log('Affichage des contrôles admin', 'debug');
        
        const controlsHtml = `
            <div class="live-controls" id="liveControls">
                <div class="live-header">
                    <div class="live-indicator live"></div>
                    <h3>🔴 EN DIRECT - ${liveData.title}</h3>
                    <span class="live-viewers" id="liveViewers">0 viewers</span>
                </div>
                <div class="live-actions">
                    <button class="btn btn-danger" onclick="window.enhancedLiveManager.endLive()">
                        <i class="fas fa-stop"></i> Arrêter le live
                    </button>
                    <button class="btn btn-outline" onclick="window.enhancedLiveManager.showLiveDetails()">
                        <i class="fas fa-info-circle"></i> Détails
                    </button>
                    <button class="btn btn-info" onclick="window.enhancedLiveManager.openLiveExternal()">
                        <i class="fas fa-external-link-alt"></i> Ouvrir
                    </button>
                    <button class="btn btn-info" onclick="window.enhancedLiveManager.shareLive()">
                        <i class="fas fa-share"></i> Partager
                    </button>
                </div>
                <div class="live-info">
                    <p><strong>Clé de stream:</strong> <code>${liveData.stream_key}</code></p>
                    <p><strong>URL:</strong> <code>${liveData.stream_url}</code></p>
                </div>
            </div>
        `;

        // Ajouter les contrôles à la page
        const container = document.querySelector('.admin-content') || document.querySelector('main');
        if (container) {
            // Supprimer les contrôles existants
            const existingControls = document.getElementById('liveControls');
            if (existingControls) {
                existingControls.remove();
            }
            
            container.insertAdjacentHTML('afterbegin', controlsHtml);
            this.log('Contrôles insérés dans la page', 'debug');
        } else {
            this.log('Conteneur pour les contrôles non trouvé', 'error');
        }
    }

    // Cacher les contrôles de live
    hideLiveControls() {
        this.log('Masquage des contrôles', 'debug');
        
        const controls = document.getElementById('liveControls');
        if (controls) {
            controls.remove();
        }
    }

    // Afficher le bouton de live pour les clients
    showLiveButton(liveData) {
        if (document.getElementById('liveFloatingBtn')) return;

        this.log('Affichage du bouton flottant pour les clients', 'debug');
        
        const button = document.createElement('button');
        button.id = 'liveFloatingBtn';
        button.className = 'live-floating-btn';
        button.innerHTML = `
            <span class="live-indicator"></span>
            <span class="live-text">🔴 EN DIRECT</span>
        `;
        
        button.onclick = () => {
            this.joinLive(liveData);
        };

        document.body.appendChild(button);
    }

    // Cacher le bouton de live
    hideLiveButton() {
        const button = document.getElementById('liveFloatingBtn');
        if (button) {
            button.remove();
        }
    }

    // Rejoindre un live
    joinLive(liveData) {
        this.log('Tentative de rejoindre le live', 'info');
        
        const url = (liveData && liveData.stream_url) ? String(liveData.stream_url).trim() : '';
        if (url && /^https?:\/\//i.test(url)) {
            this.log(`Ouverture du lien externe: ${url}`, 'debug');
            window.open(url, '_blank');
            return;
        }
        this.showLiveDetails();
    }

    // Afficher les détails du live
    showLiveDetails() {
        if (!this.currentLive) {
            this.showError('Aucun live actif');
            return;
        }
        
        const data = this.currentLive;
        const details = [
            `Titre: ${data.title || '-'}`,
            `Statut: ${data.status || '-'}`,
            `ID: ${data.id || data.live_id || '-'}`,
            `Viewers: ${data.viewers_count || '0'}`,
            `URL: ${data.stream_url || '-'}`,
            `Clé: ${data.stream_key || '-'}`
        ].join('\n');
        
        this.log('Affichage des détails du live', 'info');
        alert(details);
    }

    // Mettre à jour le nombre de viewers
    updateLiveViewers(count) {
        const viewersEl = document.getElementById('liveViewers');
        if (viewersEl) {
            viewersEl.textContent = `${count} viewer${count > 1 ? 's' : ''}`;
        }
    }

    // Afficher une notification de live
    showNotification(notification) {
        this.log('Affichage d\'une notification', 'debug');
        
        // Jouer un son de notification
        this.playNotificationSound();

        // Créer l'élément de notification
        const notificationEl = document.createElement('div');
        notificationEl.className = 'live-notification';
        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-broadcast-tower"></i>
                </div>
                <div class="notification-text">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <small>${new Date(notification.created_at).toLocaleTimeString()}</small>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Ajouter au conteneur de notifications
        let container = document.getElementById('liveNotifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'liveNotifications';
            container.className = 'live-notifications-container';
            document.body.appendChild(container);
        }

        container.appendChild(notificationEl);

        // Animation d'entrée
        setTimeout(() => notificationEl.classList.add('show'), 100);

        // Auto-suppression après 10 secondes
        setTimeout(() => {
            if (notificationEl.parentElement) {
                notificationEl.remove();
            }
        }, 10000);
    }

    // Marquer une notification comme lue
    async markNotificationAsRead(notificationId) {
        try {
            await this.apiCall('/lives/manage.php', {
                action: 'mark_read',
                notification_id: notificationId
            }, 'POST');
        } catch (error) {
            this.log(`Erreur marquage notification: ${error.message}`, 'error');
        }
    }

    // Jouer un son de notification
    playNotificationSound() {
        try {
            this.notificationSound.play().catch(() => {
                // Ignorer les erreurs de lecture (navigateur peut bloquer l'autoplay)
            });
        } catch (error) {
            // Ignorer les erreurs
        }
    }

    // Vérifier si l'utilisateur est admin
    isAdmin() {
        const checks = [
            localStorage.getItem('user_role') === 'admin',
            localStorage.getItem('auth_token') && localStorage.getItem('user_role') === 'admin',
            document.body.classList.contains('admin-page'),
            !!document.querySelector('.admin-layout'),
            !!document.querySelector('.admin-sidebar'),
            window.location.pathname.includes('/admin'),
            document.title.toLowerCase().includes('admin')
        ];
        
        const isAdmin = checks.some(check => check);
        this.log(`Vérification admin: ${isAdmin} (checks: ${checks.join(', ')})`, 'debug');
        return isAdmin;
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

        const apiBase = this.getApiBase();
        const url = apiBase + endpoint;
        
        this.log(`Appel API: ${method} ${url}`, 'debug');
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        this.log(`Réponse API: ${result.success ? 'SUCCESS' : 'ERROR'}`, 'debug');
        
        return result;
    }

    // Obtenir l'URL de base de l'API
    getApiBase() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/')) {
            return '../backend/api';
        } else {
            return '/backend/api';
        }
    }

    // Afficher une erreur
    showError(message) {
        this.log(`Erreur: ${message}`, 'error');
        
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else if (typeof window.toast === 'function') {
            window.toast('error', 'Live', message);
        } else {
            alert(message);
        }
    }

    // Afficher un succès
    showSuccess(message) {
        this.log(`Succès: ${message}`, 'success');
        
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        } else if (typeof window.toast === 'function') {
            window.toast('success', 'Live', message);
        }
        // Pas d'alerte pour le succès (trop intrusif)
    }

    // Gérer le clic sur une notification
    handleNotificationClick(notificationEl) {
        const liveId = notificationEl.dataset.liveId;
        if (liveId) {
            this.checkForActiveLive();
        }
        notificationEl.remove();
    }

    // Diffuser le démarrage d'un live
    broadcastLiveStarted(liveData) {
        this.log('Diffusion du démarrage du live', 'info');
        this.shareToTikTok(liveData);
        this.shareToWhatsApp(liveData);
    }

    // Partager sur TikTok
    shareToTikTok(liveData) {
        this.log('Partage TikTok', 'debug');
        
        const tiktokMessage = `🔴 LIVE MAINTENANT ! ${liveData.title}\n\n🍽️ Rejoignez notre live culinaire sur Titi Golden Taste\n\n📍 Bamako, Mali\n⏰ Maintenant !\n\n#TitiGoldenTaste #LiveCulinaire #Bamako #Mali`;
        
        localStorage.setItem('tiktok_share_content', tiktokMessage);
    }

    // Partager sur WhatsApp
    shareToWhatsApp(liveData) {
        this.log('Partage WhatsApp', 'debug');
        
        const message = `🔴 *LIVE EN DIRECT* 🍽️\n\n*${liveData.title}*\n\nRejoignez notre live culinaire dès maintenant !\n\n📍 Titi Golden Taste - Bamako\n⏰ En direct maintenant !\n\n👉 ${window.location.href}\n\n#TitiGoldenTaste #Live #Bamako`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        localStorage.setItem('whatsapp_share_content', message);
    }

    // Diffuser la fin d'un live
    broadcastLiveEnded(liveData) {
        this.log('Diffusion de la fin du live', 'info');
    }

    // Ouvrir le live externe
    openLiveExternal() {
        if (!this.currentLive) {
            this.showError('Aucun live actif');
            return;
        }
        
        const url = (this.currentLive.stream_url || '').toString().trim();
        if (url && /^https?:\/\//i.test(url)) {
            this.log(`Ouverture du lien externe: ${url}`, 'debug');
            window.open(url, '_blank');
            return;
        }
        this.showError('Aucun lien externe valide pour ce live.');
    }

    // Partager le live
    shareLive() {
        if (!this.currentLive) {
            this.showError('Aucun live actif');
            return;
        }

        const shareText = `🔴 Live en cours : ${this.currentLive.title}\nRejoignez-nous sur Titi Golden Taste !`;
        const shareUrl = window.location.href;

        if (navigator.share) {
            navigator.share({
                title: this.currentLive.title,
                text: shareText,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            this.showSuccess('Lien du live copié dans le presse-papiers !');
        }
    }
}

// Initialisation du gestionnaire amélioré
document.addEventListener('DOMContentLoaded', function() {
    window.enhancedLiveManager = new EnhancedLiveStreamingManager();
    
    // Exposer les fonctions globales pour compatibilité
    window.startLive = function(title, description) {
        return window.enhancedLiveManager.startLive(title, description);
    };
    
    window.endLive = function() {
        return window.enhancedLiveManager.endLive();
    };
    
    // Activer/désactiver le mode debug
    window.toggleLiveDebug = function() {
        window.enhancedLiveManager.debugMode = !window.enhancedLiveManager.debugMode;
        console.log(`Debug mode ${window.enhancedLiveManager.debugMode ? 'activé' : 'désactivé'}`);
    };
    
    console.log('Enhanced Live Streaming Manager initialisé');
    console.log('Utilisez window.toggleLiveDebug() pour activer/désactiver le mode debug');
});
