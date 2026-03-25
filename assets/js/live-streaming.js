/**
 * Système de Live Streaming pour Titi Golden Taste
 * Permet à l'admin de démarrer/arrêter des lives et aux clients de recevoir des notifications
 */

class LiveStreamingManager {
    constructor() {
        this.currentLive = null;
        this.pollingInterval = null;
        this.isHandlingLiveStarted = false;
        this.isHandlingLiveEnded = false;
        this.notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startPolling();
        this.checkForActiveLive();
    }

    setupEventListeners() {
        // Écouter les événements de live
        window.addEventListener('live:started', (event) => {
            this.handleLiveStarted(event.detail, { fromEvent: true });
        });

        window.addEventListener('live:ended', (event) => {
            this.handleLiveEnded(event.detail, { fromEvent: true });
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
        if (!this.isAdmin()) {
            this.showError('Seul un administrateur peut démarrer un live');
            return false;
        }

        try {
            console.log('Tentative de démarrage du live avec titre:', title);
            
            const response = await this.apiCall('/lives/manage.php', {
                action: 'start',
                title: title || 'Live Direct - Titi Golden Taste',
                description: description || 'Rejoignez notre live culinaire !',
                // Optionnel: lien externe (TikTok/Instagram/YouTube/etc.)
                stream_url: (this.pendingStreamUrl || '').toString().trim()
            }, 'POST');

            console.log('Réponse démarrage live:', response);

            if (response.success) {
                this.currentLive = response.data;
                this.showLiveControls(response.data);
                this.broadcastLiveStarted(response.data);
                this.showSuccess('Live démarré avec succès');
                return true;
            } else {
                this.showError(response.message || 'Erreur lors du démarrage du live');
                return false;
            }
        } catch (error) {
            console.error('Erreur lors du démarrage du live:', error);
            this.showError('Erreur lors du démarrage du live: ' + error.message);
            return false;
        }
    }

    // Arrêter un live (admin seulement)
    async endLive() {
        if (!this.isAdmin()) {
            this.showError('Seul un administrateur peut arreter un live');
            return false;
        }

        const liveToStop = await this.resolveLiveToStop();
        if (!liveToStop) {
            this.showError('Aucun live actif a arreter');
            return false;
        }

        this.currentLive = liveToStop;
        if (!this.isAdmin()) {
            this.showError('Aucun live actif à arrêter');
            return false;
        }

        // Récupérer l'ID du live de manière plus robuste
        const liveId = this.getLiveId(this.currentLive);
        if (!liveId) {
            this.showError('Impossible d\'arrêter le live: ID manquant');
            return false;
        }

        try {
            console.log('Tentative d\'arrêt du live ID:', liveId);
            
            const response = await this.apiCall('/lives/manage.php', {
                action: 'end',
                live_id: liveId
            }, 'POST');

            console.log('Réponse arrêt live:', response);

            if (response.success) {
                const endedLive = this.currentLive;
                this.broadcastLiveEnded(endedLive);
                this.handleLiveEnded({ ...endedLive, status: 'ended' });
                this.showSuccess('Live arrete avec succes');
                return true;
                this.showSuccess('Live arrêté avec succès');
                return true;
            } else {
                this.showError(response.message || 'Erreur lors de l\'arrêt du live');
                return false;
            }
        } catch (error) {
            console.error('Erreur lors de l\'arrêt du live:', error);
            this.showError('Erreur lors de l\'arrêt du live: ' + error.message);
            return false;
        }
    }

    // Vérifier s'il y a un live actif
    getLiveId(liveData) {
        if (!liveData) return null;
        return liveData.id || liveData.live_id || null;
    }

    isLiveStatusActive(status) {
        return String(status || '').toLowerCase() === 'live';
    }

    async resolveLiveToStop() {
        if (this.currentLive && this.isLiveStatusActive(this.currentLive.status)) {
            return this.currentLive;
        }
        try {
            const response = await this.apiCall('/lives/manage.php?action=status');
            if (response && response.success && Array.isArray(response.data)) {
                const live = response.data.find(item => this.isLiveStatusActive(item.status));
                if (live) {
                    this.currentLive = live;
                    return live;
                }
            }
        } catch (error) {
            console.warn('Impossible de resoudre le live actif:', error);
        }
        return null;
    }

    async checkForActiveLive() {
        try {
            const response = await this.apiCall('/lives/manage.php?action=status');
            console.log('Réponse checkForActiveLive:', response);
            
            if (response.success && Array.isArray(response.data)) {
                const activeLive = response.data.find(live => this.isLiveStatusActive(live.status));
                if (activeLive) {
                    // Vérifier si c'est le même live que celui déjà chargé
                    const currentId = this.getLiveId(this.currentLive);
                    const newId = this.getLiveId(activeLive);
                    
                    if (!currentId || currentId !== newId) {
                        console.log('Nouveau live actif détecté:', activeLive);
                        this.handleLiveStarted(activeLive);
                    } else {
                        this.currentLive = activeLive;
                    }
                } else {
                    // Si on avait un live actif mais qu'il n'est plus là
                    if (this.currentLive && this.isLiveStatusActive(this.currentLive.status)) {
                        console.log('Live actif disparu, marquer comme terminé');
                        this.handleLiveEnded(this.currentLive);
                    }
                }
            }
        } catch (error) {
            console.warn('Erreur lors de la vérification des lives:', error);
        }
    }

    // Démarrer le polling pour les notifications
    startPolling() {
        // Polling toutes les 30 secondes pour les notifications
        this.pollingInterval = setInterval(() => {
            this.checkNotifications();
            this.updateLiveStatus();
        }, 30000);
    }

    // Arrêter le polling
    stopPolling() {
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
                response.data.forEach(notification => {
                    this.showNotification(notification);
                    this.markNotificationAsRead(notification.id);
                });
            }
        } catch (error) {
            console.warn('Erreur lors de la vérification des notifications:', error);
        }
    }

    // Mettre à jour le statut du live actuel
    async updateLiveStatus() {
        if (!this.currentLive) return;

        try {
            // Récupérer l'ID de manière robuste
            const liveId = this.getLiveId(this.currentLive);
            if (!liveId) {
                console.warn('ID du live non disponible pour la mise à jour');
                return;
            }

            console.log('Mise à jour du statut du live ID:', liveId);
            
            const response = await this.apiCall(`/lives/manage.php?action=status&live_id=${liveId}`);
            
            console.log('Réponse mise à jour statut:', response);
            
            if (response.success && response.data) {
                if (response.data.status === 'ended') {
                    console.log('Live terminé détecté via polling');
                    this.handleLiveEnded(response.data);
                } else {
                    // Mettre à jour les données du live actuel
                    this.currentLive = response.data;
                    this.updateLiveViewers(response.data.viewers_count || 0);
                }
            }
        } catch (error) {
            console.warn('Erreur lors de la mise à jour du statut:', error);
        }
    }

    // Afficher les contrôles de live (admin)
    showLiveControls(liveData) {
        const controlsHtml = `
            <div class="live-controls" id="liveControls">
                <div class="live-header">
                    <div class="live-indicator live"></div>
                    <h3>🔴 EN DIRECT - ${liveData.title}</h3>
                    <span class="live-viewers" id="liveViewers">0 viewers</span>
                </div>
                <div class="live-actions">
                    <button class="btn btn-danger" onclick="window.liveManager.endLive()">
                        <i class="fas fa-stop"></i> Arrêter le live
                    </button>
                    <button class="btn btn-outline" onclick="window.liveManager.showLiveDetails()">
                        <i class="fas fa-info-circle"></i> Détails
                    </button>
                    <button class="btn btn-info" onclick="window.liveManager.openLiveExternal()">
                        <i class="fas fa-external-link-alt"></i> Ouvrir
                    </button>
                    <button class="btn btn-info" onclick="window.liveManager.shareLive()">
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
            container.insertAdjacentHTML('afterbegin', controlsHtml);
        }
    }

    // Cacher les contrôles de live
    hideLiveControls() {
        const controls = document.getElementById('liveControls');
        if (controls) {
            controls.remove();
        }
    }

    // Afficher une notification de live
    showNotification(notification) {
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

    // Gérer le démarrage d'un live
    handleLiveStarted(liveData, options = {}) {
        // Éviter la récursion infinie
        if (this.isHandlingLiveStarted) {
            return;
        }
        
        this.isHandlingLiveStarted = true;
        
        try {
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
            if (!options.fromEvent) {
                window.dispatchEvent(new CustomEvent('live:started', { detail: liveData }));
            }
        } finally {
            this.isHandlingLiveStarted = false;
        }
    }

    // Gérer la fin d'un live
    handleLiveEnded(liveData, options = {}) {
        if (this.isHandlingLiveEnded) {
            return;
        }

        this.isHandlingLiveEnded = true;
        try {
        this.currentLive = null;
        this.hideLiveControls();
        this.hideLiveButton();
        
        // Diffuser l'événement
        if (!options.fromEvent) {
            window.dispatchEvent(new CustomEvent('live:ended', { detail: liveData }));
        }
        } finally {
            this.isHandlingLiveEnded = false;
        }
    }

    // Afficher le bouton de live pour les clients
    showLiveButton(liveData) {
        if (document.getElementById('liveFloatingBtn')) return;

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
        // Le live provient d'une plateforme externe (TikTok/IG/etc.)
        const url = (liveData && liveData.stream_url) ? String(liveData.stream_url).trim() : '';
        if (url && /^https?:\/\//i.test(url)) {
            window.open(url, '_blank');
            return;
        }
        this.showLiveDetails();
    }

    openLiveExternal() {
        if (!this.currentLive) return;
        const url = (this.currentLive.stream_url || '').toString().trim();
        if (url && /^https?:\/\//i.test(url)) {
            window.open(url, '_blank');
            return;
        }
        this.showError('Aucun lien externe valide pour ce live.');
    }

    // Envoyer un message de chat
    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const messagesContainer = document.getElementById('chatMessages');
        
        if (input && messagesContainer && input.value.trim()) {
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message user';
            messageEl.innerHTML = `<strong>Vous:</strong> ${input.value}`;
            messagesContainer.appendChild(messageEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            input.value = '';
        }
    }

    // Partager le live
    shareLive() {
        if (!this.currentLive) return;

        const shareText = `🔴 Live en cours : ${this.currentLive.title}\nRejoignez-nous sur Titi Golden Taste !`;
        const shareUrl = window.location.href;

        if (navigator.share) {
            navigator.share({
                title: this.currentLive.title,
                text: shareText,
                url: shareUrl
            });
        } else {
            // Fallback: copier dans le presse-papiers
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            alert('Lien du live copié dans le presse-papiers !');
        }
    }

    // Mettre à jour le nombre de viewers
    updateLiveViewers(count) {
        const viewersEl = document.getElementById('liveViewers');
        if (viewersEl) {
            viewersEl.textContent = `${count} viewer${count > 1 ? 's' : ''}`;
        }
    }

    // Marquer une notification comme lue
    async markNotificationAsRead(notificationId) {
        try {
            await this.apiCall('/lives/manage.php', {
                action: 'mark_read',
                notification_id: notificationId
            }, 'POST');
        } catch (error) {
            console.warn('Erreur lors du marquage de la notification:', error);
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
        // Méthodes de vérification multiples pour plus de fiabilité
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
        console.log('Vérification admin:', checks, 'Résultat:', isAdmin);
        return isAdmin;
    }

    // Afficher les détails du live
    showLiveDetails() {
        if (!this.currentLive) return;
        const data = this.currentLive;
        const body = [
            `Titre: ${data.title || '-'}`,
            `Statut: ${data.status || '-'}`,
            `ID: ${data.live_id || data.id || '-'}`,
            `URL: ${data.stream_url || '-'}`,
            `Clé: ${data.stream_key || '-'}`
        ].join('\n');
        alert(body);
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
        // Pour le live streaming, adapter le chemin selon le contexte
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/')) {
            // Si on est dans /admin/, remonter d'un niveau
            return '../backend/api';
        } else {
            // Sinon utiliser le chemin relatif depuis la racine
            return '/backend/api';
        }
    }

    // Diffuser le démarrage d'un live
    broadcastLiveStarted(liveData) {
        // Intégration TikTok
        this.shareToTikTok(liveData);
        
        // Intégration WhatsApp
        this.shareToWhatsApp(liveData);
    }

    // Partager sur TikTok
    shareToTikTok(liveData) {
        // Simuler l'intégration TikTok
        console.log('Partage TikTok:', liveData.title);
        
        // Dans une vraie implémentation, utiliser l'API TikTok
        const tiktokMessage = `🔴 LIVE MAINTENANT ! ${liveData.title}\n\n🍽️ Rejoignez notre live culinaire sur Titi Golden Taste\n\n📍 Bamako, Mali\n⏰ Maintenant !\n\n#TitiGoldenTaste #LiveCulinaire #Bamako #Mali`;
        
        // Stocker pour partage manuel
        localStorage.setItem('tiktok_share_content', tiktokMessage);
    }

    // Partager sur WhatsApp
    shareToWhatsApp(liveData) {
        const message = `🔴 *LIVE EN DIRECT* 🍽️\n\n*${liveData.title}*\n\nRejoignez notre live culinaire dès maintenant !\n\n📍 Titi Golden Taste - Bamako\n⏰ En direct maintenant !\n\n👉 ${window.location.href}\n\n#TitiGoldenTaste #Live #Bamako`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        
        // Ouvrir WhatsApp (si disponible)
        window.open(whatsappUrl, '_blank');
        
        // Stocker pour partage ultérieur
        localStorage.setItem('whatsapp_share_content', message);
    }

    // Afficher une erreur
    showError(message) {
        console.error('Live Error:', message);
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
        console.log('Live Success:', message);
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
        } else if (typeof window.toast === 'function') {
            window.toast('success', 'Live', message);
        } else {
            // Fallback silencieux
        }
    }

    // Gérer le clic sur une notification
    handleNotificationClick(notificationEl) {
        const liveId = notificationEl.dataset.liveId;
        if (liveId) {
            // Rejoindre le live ou afficher les détails
            this.checkForActiveLive();
        }
        notificationEl.remove();
    }

    // Diffuser la fin d'un live
    broadcastLiveEnded(liveData) {
        // Notifications de fin de live
        console.log('Live terminé:', liveData.title);
    }
}

// Styles CSS pour le système de live
const liveStyles = `
<style>
.live-controls {
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 35px;
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: 0 8px 25px rgba(238, 90, 36, 0.3);
    animation: pulse 2s infinite;
}

.live-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
}

.live-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    animation: blink 1s infinite;
}

.live-indicator.live {
    background: #ff0000;
    box-shadow: 0 0 10px #ff0000;
}

.live-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}

.live-info {
    font-size: 14px;
    opacity: 0.9;
}

.live-info code {
    background: rgba(255,255,255,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
}

.live-floating-btn {
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    border: none;
    padding: 15px 20px;
    border-radius: 25px;
    font-weight: 600;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
    animation: pulse 2s infinite;
    display: flex;
    align-items: center;
    gap: 8px;
}

.live-notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
}

.live-notification {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    margin-bottom: 10px;
    overflow: hidden;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    border-left: 4px solid #ff6b6b;
}

.live-notification.show {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: flex-start;
    padding: 15px;
    gap: 12px;
}

.notification-icon {
    background: #ff6b6b;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.notification-text h4 {
    margin: 0 0 5px 0;
    color: #333;
    font-size: 14px;
}

.notification-text p {
    margin: 0 0 5px 0;
    color: #666;
    font-size: 13px;
}

.notification-text small {
    color: #999;
    font-size: 11px;
}

.notification-close {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
}

.live-modal {
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

.live-modal.show {
    opacity: 1;
    visibility: visible;
}

.live-modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    height: 80vh;
    display: flex;
    flex-direction: column;
}

.live-modal-header {
    padding: 35px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.live-modal-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.live-player {
    flex: 2;
    background: #000;
}

.live-player iframe {
    width: 100%;
    height: 100%;
    border: none;
}

.live-chat {
    flex: 1;
    border-left: 1px solid #eee;
    display: flex;
    flex-direction: column;
}

.live-chat h4 {
    padding: 15px;
    margin: 0;
    border-bottom: 1px solid #eee;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
}

.chat-message {
    margin-bottom: 10px;
    padding: 8px;
    border-radius: 8px;
    background: #f8f9fa;
}

.chat-message.user {
    background: #007bff;
    color: white;
    margin-left: 20px;
}

.chat-input {
    padding: 15px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 10px;
}

.chat-input input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.chat-input button {
    padding: 8px 15px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

@keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
}

@media (max-width: 768px) {
    .live-modal-content {
        width: 95%;
        height: 90vh;
    }
    
    .live-modal-body {
        flex-direction: column;
    }
    
    .live-player {
        height: 50%;
    }
    
    .live-chat {
        height: 50%;
        border-left: none;
        border-top: 1px solid #eee;
    }
    
    .live-controls {
        padding: 15px;
    }
    
    .live-header {
        flex-direction: column;
        gap: 10px;
        text-align: center;
    }
    
    .live-actions {
        justify-content: center;
    }
}
</style>
`;

// Ajouter les styles au document
if (!document.querySelector('#live-streaming-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'live-streaming-styles';
    styleEl.innerHTML = liveStyles;
    document.head.appendChild(styleEl);
}

// Initialiser le gestionnaire de live
window.liveManager = new LiveStreamingManager();

// Exposer les fonctions globales pour l'admin
window.startLive = function(title, description) {
    return window.liveManager.startLive(title, description);
};

window.endLive = function() {
    return window.liveManager.endLive();
};

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LiveStreamingManager;
}
