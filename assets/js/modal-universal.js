/**
 * Modal Universel - Système de modal réutilisable
 * Gestionnaire complet pour tous les modaux du site
 */

class UniversalModal {
    constructor() {
        this.activeModal = null;
        this.modalStack = [];
        this.defaultOptions = {
            closeOnBackdrop: true,
            closeOnEscape: true,
            showCloseButton: true,
            size: 'medium', // small, medium, large, fullscreen
            type: 'default', // default, success, error, warning, info
            backdrop: true,
            keyboard: true
        };
        
        this.init();
    }

    init() {
        this.setupGlobalListeners();
        this.createModalContainer();
    }

    setupGlobalListeners() {
        // Fermer avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal && this.activeModal.options.closeOnEscape) {
                this.close(this.activeModal);
            }
        });

        // Fermer avec backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') && 
                this.activeModal && 
                this.activeModal.options.closeOnBackdrop) {
                this.close(this.activeModal);
            }
        });

        // Prévenir la propagation des clics dans le modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.modal-panel')) {
                e.stopPropagation();
            }
        });
    }

    createModalContainer() {
        if (!document.getElementById('modalContainer')) {
            const container = document.createElement('div');
            container.id = 'modalContainer';
            document.body.appendChild(container);
        }
    }

    /**
     * Ouvre un modal avec les options spécifiées
     */
    open(options = {}) {
        const config = { ...this.defaultOptions, ...options };
        
        // Créer l'élément modal
        const modal = this.createModalElement(config);
        
        // Ajouter au container
        const container = document.getElementById('modalContainer');
        container.appendChild(modal);
        
        // Ajouter à la pile
        this.modalStack.push(modal);
        this.activeModal = modal;
        
        // Bloquer le scroll
        document.body.classList.add('modal-open');
        
        // Afficher avec animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
            modal.classList.add('fade-in');
            
            // Focus sur le premier élément focusable
            this.focusFirstElement(modal);
        });
        
        // Callbacks
        if (config.onOpen) {
            config.onOpen(modal);
        }
        
        return modal;
    }

    /**
     * Ferme un modal spécifique ou le modal actif
     */
    close(modal = null) {
        const targetModal = modal || this.activeModal;
        
        if (!targetModal) return;
        
        const config = targetModal.options;
        
        // Animation de fermeture
        targetModal.classList.remove('show');
        targetModal.classList.add('fade-out');
        
        setTimeout(() => {
            // Retirer du DOM
            targetModal.remove();
            
            // Retirer de la pile
            const index = this.modalStack.indexOf(targetModal);
            if (index > -1) {
                this.modalStack.splice(index, 1);
            }
            
            // Mettre à jour le modal actif
            this.activeModal = this.modalStack.length > 0 ? 
                this.modalStack[this.modalStack.length - 1] : null;
            
            // Débloquer le scroll si plus de modaux
            if (this.modalStack.length === 0) {
                document.body.classList.remove('modal-open');
            }
            
            // Callbacks
            if (config.onClose) {
                config.onClose(targetModal);
            }
        }, 300);
    }

    /**
     * Ferme tous les modaux
     */
    closeAll() {
        const modals = [...this.modalStack];
        modals.forEach(modal => this.close(modal));
    }

    /**
     * Crée l'élément modal HTML
     */
    createModalElement(options) {
        const modal = document.createElement('div');
        modal.className = `modal ${options.size} ${options.type}`;
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.options = options;

        let modalHTML = '';

        // Backdrop
        if (options.backdrop) {
            modalHTML += '<div class="modal-backdrop"></div>';
        }

        // Panel
        modalHTML += '<div class="modal-panel">';

        // Header
        if (options.title || options.showCloseButton) {
            modalHTML += this.createHeader(options);
        }

        // Body
        modalHTML += '<div class="modal-body">';
        
        if (options.loading) {
            modalHTML += this.createLoadingContent();
        } else if (options.content) {
            modalHTML += options.content;
        } else if (options.html) {
            modalHTML += options.html;
        } else {
            modalHTML += this.createDefaultContent(options);
        }
        
        modalHTML += '</div>';

        // Footer
        if (options.buttons && options.buttons.length > 0) {
            modalHTML += this.createFooter(options.buttons);
        }

        modalHTML += '</div>';

        modal.innerHTML = modalHTML;

        // Ajouter les écouteurs d'événements
        this.attachModalListeners(modal);

        return modal;
    }

    createHeader(options) {
        let header = '<div class="modal-header">';
        
        header += '<div class="modal-header-content">';
        
        // Icon
        if (options.icon) {
            const iconClass = this.getIconClass(options.type);
            header += `<div class="modal-icon ${iconClass}"><i class="fas ${options.icon}"></i></div>`;
        }

        // Title et subtitle
        if (options.title) {
            header += '<div>';
            header += `<h3 class="modal-title">${options.title}</h3>`;
            if (options.subtitle) {
                header += `<p class="modal-subtitle">${options.subtitle}</p>`;
            }
            header += '</div>';
        }
        
        header += '</div>';

        // Close button
        if (options.showCloseButton) {
            header += '<button class="modal-close" aria-label="Fermer">';
            header += '<i class="fas fa-times"></i>';
            header += '</button>';
        }

        header += '</div>';
        return header;
    }

    createLoadingContent() {
        return `
            <div class="modal-loading">
                <div class="modal-spinner"></div>
                <span>Chargement...</span>
            </div>
        `;
    }

    createDefaultContent(options) {
        let content = '';
        
        if (options.message) {
            content += `<p>${options.message}</p>`;
        }
        
        if (options.text) {
            content += `<p>${options.text}</p>`;
        }
        
        return content;
    }

    createFooter(buttons) {
        let footer = '<div class="modal-footer">';
        
        buttons.forEach(btn => {
            const btnClass = this.getButtonClass(btn.type || 'secondary');
            const icon = btn.icon ? `<i class="fas ${btn.icon}"></i>` : '';
            const disabled = btn.disabled ? 'disabled' : '';
            const onclick = btn.onclick ? `onclick="${btn.onclick}"` : '';
            
            footer += `<button class="modal-btn ${btnClass}" ${disabled} ${onclick}>`;
            footer += `${icon}${btn.text}`;
            footer += '</button>';
        });
        
        footer += '</div>';
        return footer;
    }

    attachModalListeners(modal) {
        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(modal));
        }

        // Tab navigation
        this.setupTabNavigation(modal);
    }

    setupTabNavigation(modal) {
        const tabs = modal.querySelectorAll('.modal-tab');
        const tabContents = modal.querySelectorAll('.modal-tab-content');
        
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                // Désactiver tous les tabs
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Activer le tab cliqué
                tab.classList.add('active');
                if (tabContents[index]) {
                    tabContents[index].classList.add('active');
                }
            });
        });
    }

    getIconClass(type) {
        const iconMap = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info',
            'default': 'primary'
        };
        return iconMap[type] || 'primary';
    }

    getButtonClass(type) {
        const buttonMap = {
            'primary': 'modal-btn-primary',
            'secondary': 'modal-btn-secondary',
            'success': 'modal-btn-success',
            'danger': 'modal-btn-danger',
            'outline': 'modal-btn-outline'
        };
        return buttonMap[type] || 'modal-btn-secondary';
    }

    focusFirstElement(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Méthodes utilitaires pour les types de modaux courants
     */

    // Modal de confirmation
    confirm(options = {}) {
        const defaultConfirmOptions = {
            title: 'Confirmation',
            icon: 'fa-exclamation-triangle',
            type: 'warning',
            buttons: [
                {
                    text: 'Annuler',
                    type: 'secondary',
                    onclick: 'universalModal.close()'
                },
                {
                    text: 'Confirmer',
                    type: 'primary',
                    onclick: options.onConfirm || 'universalModal.close()'
                }
            ]
        };

        return this.open({ ...defaultConfirmOptions, ...options });
    }

    // Modal d'alerte
    alert(options = {}) {
        const defaultAlertOptions = {
            title: 'Information',
            icon: 'fa-info-circle',
            type: 'info',
            buttons: [
                {
                    text: 'OK',
                    type: 'primary',
                    onclick: 'universalModal.close()'
                }
            ]
        };

        return this.open({ ...defaultAlertOptions, ...options });
    }

    // Modal de succès
    success(options = {}) {
        const defaultSuccessOptions = {
            title: 'Succès',
            icon: 'fa-check-circle',
            type: 'success',
            buttons: [
                {
                    text: 'OK',
                    type: 'primary',
                    onclick: 'universalModal.close()'
                }
            ]
        };

        return this.open({ ...defaultSuccessOptions, ...options });
    }

    // Modal d'erreur
    error(options = {}) {
        const defaultErrorOptions = {
            title: 'Erreur',
            icon: 'fa-exclamation-circle',
            type: 'error',
            buttons: [
                {
                    text: 'OK',
                    type: 'primary',
                    onclick: 'universalModal.close()'
                }
            ]
        };

        return this.open({ ...defaultErrorOptions, ...options });
    }

    // Modal de chargement
    loading(options = {}) {
        const defaultLoadingOptions = {
            title: 'Chargement',
            icon: 'fa-spinner fa-spin',
            type: 'info',
            loading: true,
            closeOnBackdrop: false,
            closeOnEscape: false,
            showCloseButton: false
        };

        return this.open({ ...defaultLoadingOptions, ...options });
    }

    // Modal personnalisé avec formulaire
    form(options = {}) {
        const defaultFormOptions = {
            title: 'Formulaire',
            size: 'medium',
            buttons: [
                {
                    text: 'Annuler',
                    type: 'secondary',
                    onclick: 'universalModal.close()'
                },
                {
                    text: 'Enregistrer',
                    type: 'primary',
                    onclick: options.onSubmit || 'universalModal.close()'
                }
            ]
        };

        return this.open({ ...defaultFormOptions, ...options });
    }

    // Modal avec onglets
    withTabs(options = {}) {
        const defaultTabsOptions = {
            title: 'Options',
            size: 'large',
            tabs: options.tabs || []
        };

        return this.open({ ...defaultTabsOptions, ...options });
    }
}

// Instance globale
let universalModal;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    universalModal = new UniversalModal();
    
    // Rendre disponible globalement
    window.universalModal = universalModal;
    
    // Fonctions globales pour compatibilité
    window.showModal = (options) => universalModal.open(options);
    window.hideModal = (modal) => universalModal.close(modal);
    window.confirmModal = (options) => universalModal.confirm(options);
    window.alertModal = (options) => universalModal.alert(options);
    window.successModal = (options) => universalModal.success(options);
    window.errorModal = (options) => universalModal.error(options);
    window.loadingModal = (options) => universalModal.loading(options);
});

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalModal;
}
