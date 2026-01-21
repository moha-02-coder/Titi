/**
 * Configuration API - Titi Golden Taste
 */
const API_CONFIG = {
    baseURL: '/titi-golden-taste/backend/api',
    endpoints: {
        register: '/auth/register.php',
        login: '/auth/login.php'
    },
    uploadLimits: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedAvatarTypes: ['image/jpeg', 'image/png', 'image/gif'],
        allowedIdTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    session: {
        tokenExpiry: 24 * 60 * 60 * 1000, // 24 heures
        inactivityTimeout: 30 * 60 * 1000 // 30 minutes
    }
};

/**
 * Système de notifications Toast amélioré
 */
class ToastSystem {
    static show(type, title, message, duration = 5000) {
        const container = document.querySelector('.toast-container') || this.createContainer();
        const toast = this.createToast(type, title, message);
        
        container.appendChild(toast);
        
        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Suppression automatique
        const autoRemove = setTimeout(() => this.removeToast(toast), duration);
        
        // Bouton de fermeture
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });
        
        // Retourner l'instance pour contrôle manuel
        return {
            dismiss: () => {
                clearTimeout(autoRemove);
                this.removeToast(toast);
            },
            update: (newMessage) => {
                const messageEl = toast.querySelector('.toast-message');
                if (messageEl) messageEl.textContent = newMessage;
            }
        };
    }
    
    static createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    static createToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
            loading: 'fas fa-spinner fa-spin'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return toast;
    }
    
    static removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Système de chargement amélioré
 */
class LoadingSystem {
    static show(message = 'Chargement...', options = {}) {
        let overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) {
            overlay = this.createOverlay();
        }
        
        const messageEl = overlay.querySelector('p');
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Ajouter une classe pour personnalisation
        if (options.type) {
            overlay.dataset.type = options.type;
        }
        
        return overlay;
    }
    
    static hide() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            delete overlay.dataset.type;
        }
    }
    
    static createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-busy', 'true');
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Chargement...</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
    
    static updateMessage(message) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const messageEl = overlay.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }
}

/**
 * Service API avec gestion d'erreurs améliorée
 */
class APIService {
    static async request(endpoint, options = {}) {
        const url = API_CONFIG.baseURL + endpoint;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                ...options.headers
            },
            timeout: 15000
        };
        
        // Ajouter Content-Type seulement si ce n'est pas FormData
        if (!(options.body instanceof FormData)) {
            defaultOptions.headers['Content-Type'] = 'application/json';
        }
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // Stringify le body si ce n'est pas FormData et si c'est un objet
        if (finalOptions.body && 
            typeof finalOptions.body === 'object' && 
            !(finalOptions.body instanceof FormData) &&
            !finalOptions.headers['Content-Type']?.includes('application/x-www-form-urlencoded')) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
        
        try {
            console.log(`API Request: ${finalOptions.method} ${url}`);
            
            const response = await fetch(url, {
                ...finalOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Vérifier le type de contenu
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            
            if (!isJson) {
                const text = await response.text();
                console.warn('Non-JSON response:', text.substring(0, 200));
                
                if (contentType && contentType.includes('text/html')) {
                    throw new Error(`Le serveur a retourné une page HTML (erreur ${response.status})`);
                }
                
                throw new Error(`Format de réponse inattendu (${response.status})`);
            }
            
            const data = await response.json();
            
            console.log(`API Response (${response.status}):`, data);
            
            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                data,
                headers: response.headers,
                response
            };
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('La requête a expiré. Vérifiez votre connexion internet.');
            }
            
            if (error.name === 'TypeError') {
                if (error.message.includes('fetch')) {
                    throw new Error('Problème de connexion réseau. Vérifiez votre connexion internet.');
                }
                if (error.message.includes('JSON')) {
                    throw new Error('Réponse serveur invalide (JSON attendu)');
                }
            }
            
            throw error;
        }
    }
    
    static async register(formData) {
        return await this.request(API_CONFIG.endpoints.register, {
            method: 'POST',
            body: formData
        });
    }
    
    static async login(credentials) {
        return await this.request(API_CONFIG.endpoints.login, {
            method: 'POST',
            body: credentials,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

/**
 * Validateur de mot de passe SIMPLIFIÉ
 */
class PasswordValidator {
    static requirements = {
        length: { test: (pwd) => pwd.length >= 6, message: '6 caractères minimum' }, // Changé de 8 à 6
    };
    
    static validate(password) {
        const results = {};
        let score = 0;
        
        Object.keys(this.requirements).forEach(key => {
            const isValid = this.requirements[key].test(password);
            results[key] = isValid;
            if (isValid) score++;
        });
        
        return {
            results,
            score,
            strength: this.getStrengthLabel(score),
            percentage: (score / Object.keys(this.requirements).length) * 100,
            isValid: score >= 1 // Seulement 1 critère requis
        };
    }
    
    static getStrengthLabel(score) {
        if (score >= 1) return { label: 'Valide', className: 'strength-valid', color: '#28a745' };
        return { label: 'Invalide', className: 'strength-invalid', color: '#dc3545' };
    }
    
    static updateUI(password) {
        const validation = this.validate(password);
        
        // Mettre à jour la liste des exigences
        Object.keys(validation.results).forEach(key => {
            const element = document.getElementById(`req-${key}`);
            if (element) {
                element.classList.toggle('valid', validation.results[key]);
                const icon = element.querySelector('i');
                if (icon) {
                    icon.className = validation.results[key] ? 
                        'fas fa-check-circle' : 'fas fa-times-circle';
                }
            }
        });
        
        // Mettre à jour le compteur de force
        const meter = document.querySelector('.strength-meter .strength-fill');
        const text = document.querySelector('.strength-text');
        
        if (meter) {
            meter.style.width = `${validation.percentage}%`;
            meter.style.backgroundColor = validation.strength.color;
            meter.className = `strength-fill ${validation.strength.className}`;
        }
        
        if (text) {
            text.textContent = validation.strength.label;
            text.className = `strength-text ${validation.strength.className}`;
            text.style.color = validation.strength.color;
        }
        
        return validation;
    }
}

/**
 * Gestionnaire de fichiers amélioré
 */
class FileUploadHandler {
    constructor(fieldName, options = {}) {
        this.fieldName = fieldName;
        this.options = {
            maxSize: API_CONFIG.uploadLimits.maxFileSize,
            allowedTypes: API_CONFIG.uploadLimits.allowedAvatarTypes,
            previewElement: document.getElementById(`${fieldName}Preview`),
            ...options
        };
        
        this.file = null;
        this.init();
    }
    
    init() {
        const uploadArea = document.getElementById(`${this.fieldName}Upload`);
        const fileInput = uploadArea?.querySelector('input[type="file"]');
        
        if (!uploadArea || !fileInput) {
            console.warn(`File upload area not found for: ${this.fieldName}`);
            return;
        }
        
        // Configurer les événements
        this.setupDragAndDrop(uploadArea, fileInput);
        this.setupClickHandler(uploadArea, fileInput);
        this.setupRemoveHandler();
    }
    
    setupDragAndDrop(uploadArea, fileInput) {
        const events = {
            dragover: this.handleDragOver.bind(this),
            dragenter: this.handleDragOver.bind(this),
            dragleave: this.handleDragLeave.bind(this),
            dragend: this.handleDragLeave.bind(this),
            drop: this.handleDrop.bind(this, fileInput)
        };
        
        Object.entries(events).forEach(([event, handler]) => {
            uploadArea.addEventListener(event, handler);
        });
    }
    
    setupClickHandler(uploadArea, fileInput) {
        uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-file')) {
                fileInput.click();
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processFile(e.target.files[0]);
            }
        });
    }
    
    setupRemoveHandler() {
        const removeBtn = this.options.previewElement?.querySelector('.remove-file');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile();
            });
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(fileInput, e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            this.processFile(file);
            
            // Mettre à jour l'input file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
        }
    }
    
    processFile(file) {
        if (!this.validateFile(file)) return;
        
        this.file = file;
        this.showPreview(file);
        
        // Déclencher un événement pour la validation
        document.dispatchEvent(new CustomEvent('fileChanged', {
            detail: { fieldName: this.fieldName, file }
        }));
        
        ToastSystem.show('success', 'Fichier ajouté', 
            `${file.name} (${this.formatFileSize(file.size)})`, 3000);
    }
    
    validateFile(file) {
        // Vérifier la taille
        if (file.size > this.options.maxSize) {
            ToastSystem.show('error', 'Fichier trop volumineux', 
                `Maximum ${this.options.maxSize / (1024 * 1024)}MB. Taille actuelle: ${this.formatFileSize(file.size)}`);
            return false;
        }
        
        // Vérifier le type
        if (!this.options.allowedTypes.includes(file.type)) {
            ToastSystem.show('error', 'Type de fichier non supporté',
                `Types acceptés: ${this.options.allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
            return false;
        }
        
        return true;
    }
    
    showPreview(file) {
        const preview = this.options.previewElement;
        if (!preview) return;
        
        preview.style.display = 'flex';
        
        // Afficher l'image pour les fichiers image
        const imgEl = preview.querySelector('img');
        if (imgEl && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imgEl.src = e.target.result;
                imgEl.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else if (imgEl) {
            imgEl.style.display = 'none';
        }
        
        // Mettre à jour les infos du fichier
        const nameEl = preview.querySelector('h4');
        const sizeEl = preview.querySelector('p');
        
        if (nameEl) nameEl.textContent = this.truncateFileName(file.name);
        if (sizeEl) sizeEl.textContent = this.formatFileSize(file.size);
    }
    
    removeFile() {
        this.file = null;
        
        const preview = this.options.previewElement;
        if (preview) {
            preview.style.display = 'none';
        }
        
        const fileInput = document.querySelector(`input[name="${this.fieldName}"]`);
        if (fileInput) {
            fileInput.value = '';
        }
        
        document.dispatchEvent(new CustomEvent('fileRemoved', {
            detail: { fieldName: this.fieldName }
        }));
    }
    
    truncateFileName(name, maxLength = 25) {
        if (name.length <= maxLength) return name;
        
        const extension = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.length - extension.length - 1);
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
        
        return `${truncatedName}...${extension}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getFile() {
        return this.file;
    }
    
    isValid() {
        const input = document.querySelector(`input[name="${this.fieldName}"]`);
        const isRequired = input?.required || false;
        return !isRequired || this.file !== null;
    }
}

/**
 * Validateur de formulaire SIMPLIFIÉ sans restrictions de longueur
 */
class FormValidator {
    static validateField(field) {
        const value = field.value.trim();
        const errors = [];

        // Champ requis
        if (field.required && !value) {
            errors.push('Ce champ est requis');
            return errors;
        }

        // Validation par type (UNIQUEMENT le format, pas la longueur)
        if (value) {
            switch (field.type) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        errors.push("Format d'email invalide");
                    }
                    break;

                case 'tel':
                    // Validation très flexible pour les téléphones maliens
                    if (!this.isValidPhone(value)) {
                        errors.push('Format de téléphone invalide');
                    }
                    break;

                case 'password':
                    // Seulement vérifier la longueur minimale très basique
                    if (value.length < 6) {
                        errors.push('Minimum 6 caractères');
                    }
                    break;
            }
        }

        // Validation pattern HTML (gardée)
        if (field.pattern && value) {
            try {
                const regex = new RegExp(field.pattern);
                if (!regex.test(value)) {
                    errors.push(field.title || 'Format invalide');
                }
            } catch (e) {
                console.error('Invalid pattern:', field.pattern);
            }
        }

        // SUPPRIMÉ: Validation de minLength et maxLength
        // On ne vérifie plus les longueurs maximales

        return errors;
    }

    static isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    static isValidPhone(phone) {
        // Validation TRÈS flexible pour les numéros maliens
        const cleaned = phone.replace(/\D/g, '');
        
        // Accepte n'importe quel numéro avec au moins 8 chiffres
        if (cleaned.length < 8) {
            return false;
        }
        
        // Accepte tous les préfixes maliens (2, 4, 6, 7, 8, 9)
        // Mais pas de restriction stricte
        return true;
    }

    static showFieldError(field, errors) {
        this.clearFieldError(field);

        if (!errors.length) {
            field.classList.remove('error');
            field.classList.add('valid');
            return;
        }

        field.classList.add('error');
        field.classList.remove('valid');

        const errorContainer = document.createElement('div');
        errorContainer.className = 'form-error';
        errorContainer.setAttribute('role', 'alert');

        errorContainer.innerHTML = errors.map(err => `
            <div class="error-item">
                <i class="fas fa-exclamation-circle"></i>
                <span>${err}</span>
            </div>
        `).join('');

        (field.closest('.form-group') || field.parentElement).appendChild(errorContainer);
    }

    static clearFieldError(field) {
        field.classList.remove('error', 'valid');
        const error = field.parentElement.querySelector('.form-error');
        if (error) error.remove();
    }

    static validateForm(form) {
        let isValid = true;
        let firstErrorField = null;

        const fields = form.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select');

        fields.forEach(field => {
            // Ne pas valider les champs cachés ou désactivés
            if (field.type === 'hidden' || field.disabled) return;
            
            const errors = this.validateField(field);

            if (errors.length) {
                this.showFieldError(field, errors);
                if (!firstErrorField) firstErrorField = field;
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        // Validation des cases à cocher requises
        const requiredCheckboxes = form.querySelectorAll('input[type="checkbox"][required]');
        requiredCheckboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                const errorElement = checkbox.closest('.checkbox')?.querySelector('.form-error') || 
                                    document.createElement('div');
                errorElement.className = 'form-error';
                errorElement.textContent = 'Ce champ est requis';
                
                if (!checkbox.closest('.checkbox').querySelector('.form-error')) {
                    checkbox.closest('.checkbox').appendChild(errorElement);
                }
                
                if (!firstErrorField) firstErrorField = checkbox;
                isValid = false;
            }
        });

        if (firstErrorField) {
            firstErrorField.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            setTimeout(() => {
                firstErrorField.focus({ preventScroll: true });
            }, 300);
        }

        return isValid;
    }
}

/**
 * Contrôleur d'authentification principal SIMPLIFIÉ
 */
class AuthController {
    constructor() {
        this.currentRole = 'client';
        this.fileHandlers = {};
        this.isSubmitting = false;
        this.activeToasts = new Map();
        
        this.init();
    }
    
    init() {
        console.log('Initializing AuthController...');
        
        this.setupRoleSelection();
        this.setupEventListeners();
        this.setupRealTimeValidation();
        this.setupFileUploads();
        this.checkURLParameters();
        this.checkSession();
    }
    
    setupRoleSelection() {
        document.querySelectorAll('[data-role], [data-type]').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const role = option.dataset.role || option.dataset.type;
                if (role && role !== this.currentRole) {
                    this.selectRole(role);
                }
            });
        });
    }
    
    selectRole(role) {
        console.log(`Selecting role: ${role}`);
        this.currentRole = role;
        
        // Mettre à jour l'UI
        document.querySelectorAll('[data-role], [data-type]').forEach(opt => {
            const optRole = opt.dataset.role || opt.dataset.type;
            opt.classList.toggle('active', optRole === role);
        });
        
        // Basculer les champs livreur
        this.toggleDriverFields(role === 'livreur' || role === 'delivery');
        
        // Déclencher l'événement
        document.dispatchEvent(new CustomEvent('roleChanged', { 
            detail: { role, timestamp: Date.now() }
        }));
    }
    
    toggleDriverFields(show) {
        const driverFields = document.getElementById('driverFields');
        if (!driverFields) return;
        
        const isVisible = driverFields.style.display !== 'none';
        
        if (show && !isVisible) {
            driverFields.style.display = 'block';
            setTimeout(() => {
                driverFields.style.opacity = '1';
                driverFields.style.transform = 'translateY(0)';
            }, 10);
            
        } else if (!show && isVisible) {
            driverFields.style.opacity = '0';
            driverFields.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                driverFields.style.display = 'none';
            }, 300);
        }
    }
    
    setupEventListeners() {
        // Soumission des formulaires
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Visibilité des mots de passe
        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.password-toggle');
            if (toggleBtn) {
                this.togglePasswordVisibility(toggleBtn);
            }
        });
        
        // Force du mot de passe en temps réel
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                PasswordValidator.updateUI(e.target.value);
            });
        }
        
        // Validation de confirmation de mot de passe
        const confirmInput = document.getElementById('password_confirm');
        if (confirmInput) {
            confirmInput.addEventListener('input', () => {
                this.validatePasswordConfirmation();
            });
        }
    }
    
    setupRealTimeValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input:not([type="submit"]), textarea, select');
            
            inputs.forEach(input => {
                // Validation au blur
                input.addEventListener('blur', () => {
                    if (input.value.trim()) {
                        const errors = FormValidator.validateField(input);
                        FormValidator.showFieldError(input, errors);
                    }
                });
                
                // Clear au focus
                input.addEventListener('focus', () => {
                    FormValidator.clearFieldError(input);
                });
            });
        });
    }
    
    setupFileUploads() {
        // Avatar
        if (document.getElementById('avatarUpload')) {
            this.fileHandlers.avatar = new FileUploadHandler('avatar', {
                allowedTypes: API_CONFIG.uploadLimits.allowedAvatarTypes
            });
        }
        
        // Pièce d'identité
        if (document.getElementById('id_documentUpload')) {
            this.fileHandlers.id_document = new FileUploadHandler('id_document', {
                allowedTypes: API_CONFIG.uploadLimits.allowedIdTypes
            });
        }
    }
    
    validatePasswordConfirmation() {
        const password = document.getElementById('password');
        const confirm = document.getElementById('password_confirm');
        
        if (!password || !confirm) return true;
        
        if (confirm.value && password.value !== confirm.value) {
            FormValidator.showFieldError(confirm, ['Les mots de passe ne correspondent pas']);
            return false;
        } else if (confirm.value) {
            FormValidator.showFieldError(confirm, []);
            return true;
        }
        
        return true;
    }
    
    togglePasswordVisibility(button) {
        const wrapper = button.closest('.password-wrapper') || button.closest('.form-group');
        const input = wrapper.querySelector('input[type="password"], input[type="text"]');
        const icon = button.querySelector('i');
        
        if (!input) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
            button.setAttribute('aria-label', 'Masquer le mot de passe');
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
            button.setAttribute('aria-label', 'Afficher le mot de passe');
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        if (this.isSubmitting) {
            ToastSystem.show('warning', 'Patientez', 'Une inscription est déjà en cours...');
            return;
        }
        
        this.isSubmitting = true;
        
        // Validation du formulaire
        const form = e.target;
        if (!FormValidator.validateForm(form)) {
            this.isSubmitting = false;
            ToastSystem.show('error', 'Formulaire invalide', 'Veuillez corriger les erreurs ci-dessus');
            return;
        }
        
        // Validation des fichiers
        if (!this.validateFileUploads()) {
            this.isSubmitting = false;
            return;
        }
        
        // Validation du mot de passe (simplifiée)
        const password = document.getElementById('password').value;
        const passwordValidation = PasswordValidator.validate(password);
        if (!passwordValidation.isValid) {
            ToastSystem.show('warning', 'Mot de passe trop court', 
                'Votre mot de passe doit contenir au moins 6 caractères.');
            this.isSubmitting = false;
            return;
        }
        
        // Validation de confirmation
        if (!this.validatePasswordConfirmation()) {
            this.isSubmitting = false;
            return;
        }
        
        // Validation des conditions
        const termsCheckbox = document.getElementById('accept_terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            ToastSystem.show('error', 'Conditions requises', 
                'Veuillez accepter les conditions générales d\'utilisation');
            termsCheckbox.focus();
            this.isSubmitting = false;
            return;
        }
        
        LoadingSystem.show('Création de votre compte...');
        
        try {
            const formData = new FormData(form);
            formData.append('role', this.currentRole);
            
            // Ajouter les fichiers
            Object.entries(this.fileHandlers).forEach(([fieldName, handler]) => {
                const file = handler.getFile();
                if (file) {
                    formData.append(fieldName, file);
                }
            });
            
            console.log('Sending registration request...');
            
            const result = await APIService.register(formData);
            
            if (result.ok && result.data.success) {
                await this.handleRegistrationSuccess(result.data, formData);
            } else {
                throw new Error(result.data?.message || `Erreur d'inscription (${result.status})`);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.handleAPIError(error, 'inscription');
        } finally {
            this.isSubmitting = false;
            LoadingSystem.hide();
        }
    }
    
    async handleRegistrationSuccess(data, formData) {
        console.log('Registration successful:', data);
        
        // Afficher le message de succès
        const successMessage = data.message || 'Votre compte a été créé avec succès!';
        ToastSystem.show('success', 'Inscription réussie', successMessage, 5000);
        
        // Mettre à jour l'UI
        this.showSuccessScreen(data.message);
        
        // Auto-login pour les clients
        if (this.currentRole === 'client') {
            const credentials = {
                email: formData.get('email'),
                password: formData.get('password')
            };
            
            setTimeout(async () => {
                await this.autoLogin(credentials);
            }, 2000);
        } else {
            // Pour les livreurs/restaurants, rediriger vers login
            setTimeout(() => {
                const params = new URLSearchParams({
                    success: 'registered',
                    role: this.currentRole
                });
                window.location.href = `login.html?${params.toString()}`;
            }, 3000);
        }
    }
    
    async autoLogin(credentials) {
        console.log('Attempting auto-login...');
        
        const loadingToast = ToastSystem.show('loading', 'Connexion automatique', 
            'Connexion en cours après inscription...');
        
        try {
            const result = await APIService.login(credentials);
            
            if (result.ok && result.data.success) {
                loadingToast.dismiss();
                await this.handleLoginSuccess(result.data);
            } else {
                throw new Error(result.data?.message || 'Auto-login échoué');
            }
            
        } catch (error) {
            console.error('Auto-login error:', error);
            loadingToast.dismiss();
            
            ToastSystem.show('warning', 'Connexion manuelle requise',
                'Veuillez vous connecter avec vos identifiants');
            
            setTimeout(() => {
                const params = new URLSearchParams({
                    email: credentials.email
                });
                window.location.href = `login.html?${params.toString()}`;
            }, 2000);
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isSubmitting) {
            ToastSystem.show('warning', 'Patientez', 'Une connexion est déjà en cours...');
            return;
        }
        
        this.isSubmitting = true;
        
        const form = e.target;
        const formData = new FormData(form);
        const credentials = {
            email: formData.get('login_identifier')?.trim(),
            password: formData.get('password')
        };
        
        // Validation basique
        if (!credentials.email || !credentials.password) {
            ToastSystem.show('error', 'Champs requis', 'Veuillez remplir tous les champs');
            this.isSubmitting = false;
            return;
        }
        
        if (!FormValidator.isValidEmail(credentials.email)) {
            ToastSystem.show('error', 'Email invalide', 'Veuillez entrer une adresse email valide');
            this.isSubmitting = false;
            return;
        }
        
        LoadingSystem.show('Connexion en cours...');
        
        try {
            console.log('Attempting login for:', credentials.email.substring(0, 3) + '***');
            
            const result = await APIService.login(credentials);
            
            if (result.ok && result.data.success) {
                await this.handleLoginSuccess(result.data);
            } else {
                throw new Error(result.data?.message || `Échec de la connexion (${result.status})`);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleAPIError(error, 'connexion');
        } finally {
            this.isSubmitting = false;
            LoadingSystem.hide();
        }
    }
    
    async handleLoginSuccess(data) {
        console.log('Login successful:', data);
        
        // Validation des données
        if (!this.validateSessionData(data)) {
            ToastSystem.show('error', 'Erreur de session', 
                'Les données de connexion sont incomplètes ou invalides');
            return;
        }
        
        // Sauvegarder la session
        this.saveSession(data);
        
        // Afficher le message de bienvenue
        this.showWelcomeMessage(data.user);
        
        // Redirection
        setTimeout(() => {
            this.redirectToDashboard(data.user.role);
        }, 1500);
    }
    
    validateSessionData(data) {
        if (!data || typeof data !== 'object') {
            console.error('Invalid session data:', data);
            return false;
        }
        
        if (!data.token || typeof data.token !== 'string') {
            console.error('Invalid token:', data.token);
            return false;
        }
        
        if (!data.user || typeof data.user !== 'object') {
            console.error('Invalid user data:', data.user);
            return false;
        }
        
        const requiredFields = ['id', 'email', 'role'];
        for (const field of requiredFields) {
            if (!data.user[field]) {
                console.error(`Missing user field: ${field}`, data.user);
                return false;
            }
        }
        
        return true;
    }
    
    showWelcomeMessage(user) {
        const firstName = user?.first_name || '';
        const lastName = user?.last_name || '';
        
        let welcomeText = 'Connexion réussie!';
        
        if (firstName) {
            welcomeText = `Bienvenue ${firstName}${lastName ? ' ' + lastName : ''}!`;
        }
        
        ToastSystem.show('success', welcomeText, 'Redirection en cours...', 3000);
    }
    
    saveSession(data) {
        try {
            console.log('Saving session data...');
            
            // Token d'authentification
            localStorage.setItem('auth_token', data.token);
            
            // Données utilisateur sécurisées
            const safeUserData = {
                id: data.user.id,
                email: data.user.email,
                first_name: data.user.first_name,
                last_name: data.user.last_name,
                role: data.user.role,
                phone: data.user.phone,
                avatar: data.user.avatar,
                created_at: data.user.created_at
            };
            
            localStorage.setItem('user_data', JSON.stringify(safeUserData));
            localStorage.setItem('user_role', data.user.role);
            localStorage.setItem('user_id', data.user.id);
            
            // Expiration
            const expiry = Date.now() + API_CONFIG.session.tokenExpiry;
            localStorage.setItem('token_expiry', expiry.toString());
            
            console.log('Session saved successfully');
            
        } catch (error) {
            console.error('Error saving session:', error);
            throw new Error('Impossible de sauvegarder la session');
        }
    }
    
    redirectToDashboard(role = 'client') {
        const dashboards = {
            'admin': 'admin/dashboard.html',
            'super_admin': 'admin/dashboard.html',
            'delivery': 'delivery/dashboard.html',
            'livreur': 'delivery/dashboard.html',
            'restaurant': 'restaurant/dashboard.html',
            'client': 'dashboard.html'
        };
        
        const normalizedRole = role.toLowerCase();
        const dashboardPath = dashboards[normalizedRole] || 'dashboard.html';
        
        console.log(`Redirecting ${normalizedRole} to: ${dashboardPath}`);
        
        // Ajouter un timestamp pour éviter le cache
        const timestamp = Date.now();
        const redirectUrl = `${dashboardPath}?_t=${timestamp}`;
        
        // Animation de sortie
        document.body.style.opacity = '0.7';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 300);
    }
    
    validateFileUploads() {
        let isValid = true;
        const missingFiles = [];
        
        Object.entries(this.fileHandlers).forEach(([fieldName, handler]) => {
            const input = document.querySelector(`input[name="${fieldName}"]`);
            const isRequired = input?.required || false;
            
            if (isRequired && !handler.getFile()) {
                missingFiles.push(this.getFieldLabel(fieldName));
                isValid = false;
            }
        });
        
        if (missingFiles.length > 0) {
            ToastSystem.show('error', 'Fichiers manquants', 
                `Les fichiers suivants sont requis: ${missingFiles.join(', ')}`);
        }
        
        return isValid;
    }
    
    getFieldLabel(fieldName) {
        const labels = {
            'avatar': 'Photo de profil',
            'id_document': 'Pièce d\'identité'
        };
        
        return labels[fieldName] || fieldName;
    }
    
    handleAPIError(error, context = 'requête') {
        console.error(`${context} error:`, error);
        
        let errorTitle = 'Erreur';
        let errorMessage = error.message;
        
        // Messages d'erreur spécifiques
        if (error.message.includes('connexion réseau') || 
            error.message.includes('expiré') ||
            error.message.includes('fetch')) {
            errorTitle = 'Problème de connexion';
            errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
        } 
        else if (error.message.includes('JSON')) {
            errorTitle = 'Erreur technique';
            errorMessage = 'Le serveur a retourné une réponse invalide. Contactez l\'administrateur.';
        }
        else if (error.message.includes('page HTML') || 
                 error.message.includes('introuvable')) {
            errorTitle = 'Service indisponible';
            errorMessage = 'Le service est temporairement indisponible. Veuillez réessayer plus tard.';
        }
        else if (error.message.includes('401') || 
                 error.message.includes('incorrect')) {
            errorTitle = 'Identifiants incorrects';
            errorMessage = 'Email ou mot de passe incorrect. Veuillez réessayer.';
        }
        else if (error.message.includes('500')) {
            errorTitle = 'Erreur serveur';
            errorMessage = 'Une erreur technique est survenue. Nos équipes sont prévenues.';
        }
        
        ToastSystem.show('error', errorTitle, errorMessage, 7000);
    }
    
    showSuccessScreen(message) {
        const form = document.querySelector('.auth-form');
        if (!form) return;
        
        form.innerHTML = `
            <div class="success-screen" role="alert" aria-live="assertive">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Inscription réussie !</h2>
                <p class="success-message">${message}</p>
                <div class="success-actions">
                    <div class="spinner small"></div>
                    <p class="redirect-message">Redirection en cours...</p>
                </div>
            </div>
        `;
    }
    
    checkURLParameters() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('success') && params.get('success') === 'registered') {
            ToastSystem.show('success', 'Inscription confirmée', 
                'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.');
        }
    }
    
    checkSession() {
        try {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');
            
            if (token && userData) {
                const expiry = localStorage.getItem('token_expiry');
                const currentTime = Date.now();
                
                if (expiry && currentTime > parseInt(expiry)) {
                    this.clearSession();
                    return;
                }
                
                // Si l'utilisateur est déjà connecté et sur une page d'auth, rediriger
                const currentPath = window.location.pathname;
                if (currentPath.includes('login') || currentPath.includes('register')) {
                    const user = JSON.parse(userData);
                    setTimeout(() => {
                        this.redirectToDashboard(user.role);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
            this.clearSession();
        }
    }
    
    clearSession() {
        const items = [
            'auth_token',
            'user_data',
            'token_expiry',
            'user_role',
            'user_id'
        ];
        
        items.forEach(item => localStorage.removeItem(item));
    }
}

// Initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    // Ajouter les styles CSS nécessaires
    const styles = `
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            max-width: 400px;
        }
        
        .toast {
            background: white;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            border-left: 4px solid #ddd;
        }
        
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast-success { border-left-color: #28a745; }
        .toast-error { border-left-color: #dc3545; }
        .toast-warning { border-left-color: #ffc107; }
        .toast-info { border-left-color: #17a2b8; }
        .toast-loading { border-left-color: #6c757d; }
        
        .toast-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
            line-height: 1;
        }
        
        .toast-success .toast-icon { color: #28a745; }
        .toast-error .toast-icon { color: #dc3545; }
        .toast-warning .toast-icon { color: #ffc107; }
        .toast-info .toast-icon { color: #17a2b8; }
        .toast-loading .toast-icon { color: #6c757d; }
        
        .toast-content {
            flex: 1;
            min-width: 0;
        }
        
        .toast-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: #333;
            font-size: 0.95rem;
        }
        
        .toast-message {
            font-size: 0.85rem;
            color: #666;
            line-height: 1.4;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 4px;
            margin: -4px;
            font-size: 1rem;
            line-height: 1;
            transition: color 0.2s;
            border-radius: 4px;
        }
        
        .toast-close:hover {
            color: #666;
            background: rgba(0,0,0,0.05);
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 999998;
            backdrop-filter: blur(2px);
        }
        
        .loading-content {
            text-align: center;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .form-error {
            margin-top: 6px;
            padding: 8px 12px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            font-size: 0.85rem;
            color: #721c24;
        }
        
        .error-item {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            margin: 4px 0;
        }
        
        .error-item i {
            color: #dc3545;
            flex-shrink: 0;
            margin-top: 1px;
        }
        
        .form-input.error {
            border-color: #dc3545;
            background-color: #fff8f8;
        }
        
        .form-input.valid {
            border-color: #28a745;
            background-color: #f8fff8;
        }
        
        .strength-meter {
            height: 6px;
            background: #eee;
            border-radius: 3px;
            margin: 8px 0;
            overflow: hidden;
        }
        
        .strength-fill {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        .strength-text {
            font-size: 0.85rem;
            font-weight: 600;
            margin-top: 4px;
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Initialiser le contrôleur d'authentification
    console.log('Initializing Titi Golden Taste Auth System...');
    window.authController = new AuthController();
});

/**
 * Fonctions utilitaires globales pour la gestion des formulaires
 */
window.FormHelper = {
    /**
     * Nettoie les erreurs de validation d'un formulaire
     */
    clearFormErrors: function(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const errorElements = form.querySelectorAll('.form-error');
        errorElements.forEach(el => el.remove());
        
        const errorInputs = form.querySelectorAll('.form-input.error');
        errorInputs.forEach(input => {
            input.classList.remove('error');
        });
    },
    
    /**
     * Réinitialise un formulaire
     */
    resetForm: function(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.reset();
        this.clearFormErrors(formId);
        
        // Réinitialiser les aperçus de fichiers
        const filePreviews = form.querySelectorAll('.file-preview');
        filePreviews.forEach(preview => {
            preview.style.display = 'none';
        });
    },
    
    /**
     * Active/désactive un bouton de soumission
     */
    toggleSubmitButton: function(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${button.textContent}`;
        } else {
            button.disabled = false;
            // Restaurer le texte original (à adapter selon votre HTML)
            if (buttonId === 'registerSubmit') {
                button.innerHTML = `<i class="fas fa-user-plus"></i> Créer mon compte`;
            } else if (buttonId === 'loginSubmit') {
                button.innerHTML = `<i class="fas fa-sign-in-alt"></i> Se connecter`;
            }
        }
    }
};