/*
 * Configuration API - Titi Golden Taste
 */
const API_CONFIG = {
    baseURL: (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'backend/api'),
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

// Toast System
class ToastSystem {
    static show(type, title, message, duration = 5000) {
        const container = document.querySelector('.toast-container') || this.createContainer();
        const toast = this.createToast(type, title, message);
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        const autoRemove = setTimeout(() => this.removeToast(toast), duration);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });
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
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return toast;
    }
    
    static removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
}

// LoadingSystem alias: use global `window.LoadingSystem` when available
var _TGT_LS = (typeof window !== 'undefined' && window.LoadingSystem) ? window.LoadingSystem : {
    show: function(msg) {},
    hide: function() {},
    updateMessage: function(msg) {}
};

// Password Strength Validator
class PasswordValidator {
    static requirements = {
        length: { test: (pwd) => pwd.length >= 8, message: '8 caractères minimum' },
        uppercase: { test: (pwd) => /[A-Z]/.test(pwd), message: '1 majuscule' },
        lowercase: { test: (pwd) => /[a-z]/.test(pwd), message: '1 minuscule' },
        number: { test: (pwd) => /[0-9]/.test(pwd), message: '1 chiffre' },
        special: { test: (pwd) => /[^A-Za-z0-9]/.test(pwd), message: '1 caractère spécial' }
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
            percentage: (score / Object.keys(this.requirements).length) * 100
        };
    }
    
    static getStrengthLabel(score) {
        if (score >= 5) return { label: 'Très fort', className: 'strength-strong' };
        if (score >= 4) return { label: 'Fort', className: 'strength-good' };
        if (score >= 3) return { label: 'Moyen', className: 'strength-fair' };
        if (score >= 2) return { label: 'Faible', className: 'strength-weak' };
        return { label: 'Très faible', className: 'strength-weak' };
    }
    
    static updateUI(password) {
        const validation = this.validate(password);
        
        // Update requirements list
        Object.keys(validation.results).forEach(key => {
            const element = document.getElementById(`req-${key}`);
            if (element) {
                element.classList.toggle('valid', validation.results[key]);
            }
        });
        
        // Update strength meter
        const meter = document.querySelector('.strength-fill');
        const text = document.querySelector('.strength-text');
        
        if (meter) {
            meter.className = `strength-fill ${validation.strength.className}`;
            meter.style.width = `${validation.percentage}%`;
        }
        
        if (text) {
            text.textContent = validation.strength.label;
            text.className = `strength-text ${validation.strength.className}`;
        }
        
        return validation;
    }
}

// File Upload Handler
class FileUploadHandler {
    constructor(fieldName, options = {}) {
        this.fieldName = fieldName;
        this.options = {
            maxSize: options.maxSize || API_CONFIG.uploadLimits.maxFileSize,
            allowedTypes: options.allowedTypes || API_CONFIG.uploadLimits.allowedAvatarTypes,
            previewElement: document.getElementById(`${fieldName}Preview`),
            ...options
        };
        
        this.file = null;
        this.init();
    }
    
    init() {
        const uploadArea = document.getElementById(`${this.fieldName}Upload`);
        const fileInput = uploadArea?.querySelector('input[type="file"]');
        
        if (!uploadArea || !fileInput) return;
        
        // Drag and drop events
        ['dragover', 'dragenter'].forEach(event => {
            uploadArea.addEventListener(event, this.handleDragOver.bind(this));
        });
        
        ['dragleave', 'dragend', 'drop'].forEach(event => {
            uploadArea.addEventListener(event, this.handleDragLeave.bind(this));
        });
        
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Remove button
        const removeBtn = this.options.previewElement?.querySelector('.remove-file');
        if (removeBtn) {
            removeBtn.addEventListener('click', this.removeFile.bind(this));
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            this.processFile(e.dataTransfer.files[0]);
        }
    }
    
    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.processFile(e.target.files[0]);
        }
    }
    
    processFile(file) {
        if (!this.validateFile(file)) {
            ToastSystem.show('error', 'Erreur de fichier', 'Type ou taille de fichier invalide');
            return;
        }
        
        this.file = file;
        this.showPreview(file);
        this.updateFileInput(file);
        
        // Dispatch change event for form validation
        document.dispatchEvent(new CustomEvent('fileChanged', {
            detail: { fieldName: this.fieldName, file }
        }));
    }
    
    validateFile(file) {
        if (file.size > this.options.maxSize) {
            ToastSystem.show('error', 'Fichier trop volumineux', `Maximum ${this.options.maxSize / (1024 * 1024)}MB`);
            return false;
        }
        
        if (!this.options.allowedTypes.includes(file.type)) {
            ToastSystem.show('error', 'Type de fichier non supporté', 
                `Types acceptés: ${this.options.allowedTypes.join(', ')}`);
            return false;
        }
        
        return true;
    }
    
    showPreview(file) {
        const preview = this.options.previewElement;
        if (!preview) return;
        
        const imageEl = preview.querySelector('img');
        const nameEl = preview.querySelector('h4');
        const sizeEl = preview.querySelector('p');
        
        if (imageEl && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imageEl.src = e.target.result;
                imageEl.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
        
        if (nameEl) nameEl.textContent = this.truncateFileName(file.name);
        if (sizeEl) sizeEl.textContent = this.formatFileSize(file.size);
        
        preview.style.display = 'flex';
    }
    
    truncateFileName(name, maxLength = 20) {
        return name.length > maxLength ? 
            `${name.substring(0, maxLength)}...${name.split('.').pop()}` : 
            name;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    updateFileInput(file) {
        const input = document.querySelector(`input[name="${this.fieldName}"]`);
        if (input) {
            // Create a new FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
        }
    }
    
    removeFile() {
        this.file = null;
        const preview = this.options.previewElement;
        const input = document.querySelector(`input[name="${this.fieldName}"]`);
        
        if (preview) preview.style.display = 'none';
        if (input) input.value = '';
        
        document.dispatchEvent(new CustomEvent('fileRemoved', {
            detail: { fieldName: this.fieldName }
        }));
    }
    
    getFile() {
        return this.file;
    }
    
    isValid() {
        const required = document.querySelector(`input[name="${this.fieldName}"]`).required;
        return !required || this.file !== null;
    }
}

// Form Validator
class FormValidator {
    static validateField(field) {
        const value = field.value.trim();
        const errors = [];
        
        // Required validation
        if (field.required && !value) {
            errors.push('Ce champ est requis');
        }
        
        // Type-specific validation
        switch(field.type) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    errors.push('Email invalide');
                }
                break;
                case 'tel':
                    if (value && !this.isValidPhone(value)) {
                        errors.push('Numéro de téléphone invalide');
                    }
                    break;
            case 'password':
                // Enforce minimum length only on registration forms.
                // Login can accept shorter passwords (legacy accounts).
                {
                    const formId = field?.form?.id || '';
                    const shouldEnforceMinLength = formId === 'registerForm' || field.hasAttribute('data-enforce-minlength');
                    if (shouldEnforceMinLength && value.length > 0 && value.length < 8) {
                        errors.push('Minimum 8 caractères');
                    }
                }
                break;
        }
        
        // Pattern validation
        if (field.pattern && value) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(value)) {
                errors.push('Format invalide');
            }
        }
        
        // Min/Max length
        if (typeof field.minLength === 'number' && field.minLength > 0 && value.length < field.minLength) {
            errors.push(`Minimum ${field.minLength} caractères`);
        }

        if (typeof field.maxLength === 'number' && field.maxLength > 0 && value.length > field.maxLength) {
            errors.push(`Maximum ${field.maxLength} caractères`);
        }
        
        return errors;
    }
    
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static isValidPhone(phone) {
        const cleaned = phone.replace(/[^0-9]/g, '');
        // Accept optional country code 223, then Malian prefixes and 6 more digits (total 8 digits)
        const re = /^(?:223)?(76|77|78|79|66|67|68|69|90|91)\d{6}$/;
        return re.test(cleaned);
    }
    
    static showFieldError(field, errors) {
        this.clearFieldError(field);
        
        if (errors.length === 0) {
            field.classList.remove('error');
            return;
        }
        
        field.classList.add('error');
        
        const errorContainer = document.createElement('div');
        errorContainer.className = 'form-error';
        errorContainer.innerHTML = errors.map(error => 
            `<i class="fas fa-exclamation-circle"></i> ${error}`
        ).join('<br>');
        errorContainer.setAttribute('role', 'alert');
        
        field.parentNode.appendChild(errorContainer);
        
        // Scroll to error if it's the first one
        if (!document.querySelector('.form-input.error')) {
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    static clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
    }
}

// Auth Controller - Titi Golden Taste
class AuthController {
    constructor() {
        this.currentRole = 'client';
        this.fileHandlers = {};
        this.isSubmitting = false;
        
        this.init();
    }
    
    init() {
        this.setupRoleSelection();
        this.setupEventListeners();
        this.setupRealTimeValidation();
        this.setupFileUploads();
        // Ensure driver-specific required attributes reflect current role on load
        // If role is provided in URL, apply it; otherwise ensure driver fields are not required by default
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const role = urlParams.get('role');
            if (role) {
                this.selectRole(role);
            } else {
                this.toggleDriverFields(false);
            }
        } catch (e) {
            this.toggleDriverFields(false);
        }

        this.checkURLParameters();
        this.checkSession();
    }
    
    setupRoleSelection() {
        const roleOptions = document.querySelectorAll('.role-option, .type-btn');
        roleOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const role = option.dataset.role || option.dataset.type;
                this.selectRole(role);
            });
        });
        
        // Initialize from URL or default
        const urlParams = new URLSearchParams(window.location.search);
        const roleFromURL = urlParams.get('role');
        if (roleFromURL) {
            this.selectRole(roleFromURL);
        }
    }
    
    selectRole(role) {
        this.currentRole = role;
        
        // Update UI
        document.querySelectorAll('.role-option, .type-btn').forEach(opt => {
            opt.classList.remove('active');
        });
        
        const selected = document.querySelector(`[data-role="${role}"], [data-type="${role}"]`);
        if (selected) {
            selected.classList.add('active');
        }
        
        // Toggle driver fields
        this.toggleDriverFields(role === 'livreur' || role === 'delivery');
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('roleChanged', { detail: { role } }));
    }
    
    toggleDriverFields(show) {
        const driverFields = document.getElementById('driverFields');
        if (driverFields) {
            driverFields.style.display = show ? 'block' : 'none';
            
            // Set required attributes
            const driverInputs = driverFields.querySelectorAll('input, select, textarea');
            driverInputs.forEach(input => {
                input.required = show;
                if (!show) {
                    FormValidator.clearFieldError(input);
                }
            });
            
            // Animate reveal
            if (show) {
                driverFields.style.opacity = '0';
                driverFields.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    driverFields.style.transition = 'all 0.3s ease';
                    driverFields.style.opacity = '1';
                    driverFields.style.transform = 'translateY(0)';
                }, 10);
            }
        }
    }
    
    setupEventListeners() {
        // Form submissions
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Password visibility toggles
        document.addEventListener('click', (e) => {
            if (e.target.closest('.password-toggle')) {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            }
        });
        
        // Real-time password strength
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                PasswordValidator.updateUI(e.target.value);
            });
        }
        
        // Confirm password validation
        const confirmInput = document.getElementById('password_confirm');
        if (confirmInput) {
            confirmInput.addEventListener('input', () => {
                this.validatePasswordConfirmation();
            });
        }
        
        // Terms modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.terms-link')) {
                e.preventDefault();
                this.showTermsModal();
            }
        });
        
        // Social login buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.social-btn')) {
                this.handleSocialLogin(e.target.closest('.social-btn'));
            }
        });
        
        // Forgot password
        document.addEventListener('click', (e) => {
            if (e.target.closest('.forgot-password')) {
                e.preventDefault();
                this.handleForgotPassword();
            }
        });
    }
    
    setupRealTimeValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                // Validate on blur
                input.addEventListener('blur', () => {
                    const errors = FormValidator.validateField(input);
                    FormValidator.showFieldError(input, errors);
                });
                
                // Clear error on input
                input.addEventListener('input', () => {
                    FormValidator.clearFieldError(input);
                    
                    // Special handling for confirm password
                    if (input.id === 'password_confirm') {
                        this.validatePasswordConfirmation();
                    }
                });
            });
        });
    }
    
    setupFileUploads() {
        // Avatar upload
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            this.fileHandlers.avatar = new FileUploadHandler('avatar', {
                allowedTypes: API_CONFIG.uploadLimits.allowedAvatarTypes
            });
        }
        
        // ID document upload
        const idUpload = document.getElementById('id_documentUpload');
        if (idUpload) {
            this.fileHandlers.id_document = new FileUploadHandler('id_document', {
                allowedTypes: API_CONFIG.uploadLimits.allowedIdTypes
            });
        }
    }
    
    validatePasswordConfirmation() {
        const password = document.getElementById('password');
        const confirm = document.getElementById('password_confirm');
        
        if (!password || !confirm) return;
        
        if (confirm.value && password.value !== confirm.value) {
            FormValidator.showFieldError(confirm, ['Les mots de passe ne correspondent pas']);
        } else {
            FormValidator.clearFieldError(confirm);
        }
    }
    
    togglePasswordVisibility(button) {
        const input = button.closest('.form-group').querySelector('input[type="password"], input[type="text"]');
        const icon = button.querySelector('i');
        
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
        
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        
        // Validate form
        if (!await this.validateRegisterForm()) {
            this.isSubmitting = false;
            return;
        }
        
        _TGT_LS.show('Création de votre compte...');
        
        try {
            const formData = new FormData(e.target);
            formData.append('role', this.currentRole);
            
            // Add files
            Object.entries(this.fileHandlers).forEach(([field, handler]) => {
                const file = handler.getFile();
                if (file) {
                    formData.append(field, file);
                }
            });
            
            const baseURL = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'backend/api');
            const response = await fetch(baseURL + API_CONFIG.endpoints.register, {
                method: 'POST',
                body: formData
            });
            
            let responseData;
            try {
                responseData = await response.json();
            } catch (jsonError) {
                throw new Error('Réponse invalide du serveur');
            }
            
            if (response.ok && responseData.success) {
                await this.handleRegistrationSuccess(responseData, formData);
            } else {
                // Gérer les erreurs de validation
                let errorMsg = responseData?.message || responseData?.error || 'Erreur lors de l\'inscription';
                
                // Si des erreurs de validation sont présentes
                if (responseData?.data?.errors) {
                    const errors = Object.values(responseData.data.errors).flat();
                    errorMsg = errors.join(', ') || errorMsg;
                }
                
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error.message || 'Erreur lors de l\'inscription. Veuillez réessayer.';
            if (typeof ToastSystem !== 'undefined' && ToastSystem.show) {
                ToastSystem.show('error', 'Erreur d\'inscription', errorMessage);
            } else {
                alert('Erreur: ' + errorMessage);
            }
        } finally {
            this.isSubmitting = false;
            _TGT_LS.hide();
        }
    }
    
    async handleRegistrationSuccess(responseData, formData) {
        console.log('handleRegistrationSuccess called with:', responseData);
        
        const message = responseData.message || 'Inscription réussie !';
        // L'API retourne les données dans responseData.data
        const apiData = responseData.data || responseData;
        const userData = apiData.user || null;
        
        console.log('Registration user data:', userData);
        
        // Afficher le message de succès
        if (typeof ToastSystem !== 'undefined' && ToastSystem.show) {
            ToastSystem.show('success', 'Inscription réussie', message);
        } else {
            // Fallback si ToastSystem n'est pas disponible
            alert('Inscription réussie ! ' + message);
        }
        
        // Update UI
        this.showSuccessScreen(message);
        
        // Auto-login for clients (seulement si le compte est vérifié)
        if (this.currentRole === 'client' && userData && userData.verified !== false) {
            setTimeout(async () => {
                await this.autoLogin({
                    email: formData.get('email'),
                    password: formData.get('password')
                });
            }, 2000);
        } else {
            // For drivers, show pending approval message
            setTimeout(() => {
                window.location.href = 'login.html?pending=driver';
            }, 3000);
        }
    }
    
    showSuccessScreen(message) {
        const form = document.querySelector('.auth-form');
        if (!form) return;
        
        form.innerHTML = `
            <div class="success-screen">
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
    
    async autoLogin(credentials) {
        try {
            const baseURL = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'backend/api');
            const response = await fetch(baseURL + API_CONFIG.endpoints.login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            let responseData;
            try {
                responseData = await response.json();
            } catch (jsonError) {
                window.location.href = 'login.html?success=registered';
                return;
            }
            
            if (response.ok && responseData.success) {
                const userData = responseData.data || responseData;
                this.saveSession(userData);
                const user = userData.user || userData;
                const role = user?.role || 'client';
                this.redirectToDashboard(role);
            } else {
                window.location.href = 'login.html?success=registered';
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            window.location.href = 'login.html';
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        
        const formData = new FormData(e.target);
        const credentials = {
            email: formData.get('login_identifier'),
            password: formData.get('password')
        };
        
        // Basic validation
        if (!credentials.email || !credentials.password) {
            ToastSystem.show('error', 'Erreur', 'Veuillez remplir tous les champs');
            this.isSubmitting = false;
            return;
        }
        
        _TGT_LS.show('Connexion en cours...');
        
        try {
            const baseURL = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'backend/api');
            const response = await fetch(baseURL + API_CONFIG.endpoints.login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            let responseData;
            try {
                responseData = await response.json();
                console.log('Login response:', responseData);
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                throw new Error('Réponse invalide du serveur');
            }
            
            if (response.ok && responseData.success) {
                // L'API retourne les données dans responseData.data
                // Structure: { success: true, message: "...", data: { user: {...}, token: "..." } }
                const apiData = responseData.data || responseData;
                console.log('Login data:', apiData);
                
                if (!apiData.user && !apiData.token) {
                    console.error('Missing user or token in response:', apiData);
                    throw new Error('Données de connexion incomplètes');
                }
                
                await this.handleLoginSuccess(apiData);
            } else {
                // Provide a clearer message for invalid credentials
                if (response.status === 401) {
                    throw new Error('Email ou mot de passe incorrect');
                }
                const errorMsg = responseData?.message || responseData?.error || `Échec de la connexion (${response.status})`;
                console.error('Login failed:', errorMsg, responseData);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.message || 'Erreur de connexion. Vérifiez vos identifiants.';
            if (typeof ToastSystem !== 'undefined' && ToastSystem.show) {
                ToastSystem.show('error', 'Erreur de connexion', errorMessage);
            } else {
                alert('Erreur: ' + errorMessage);
            }
        } finally {
            this.isSubmitting = false;
            _TGT_LS.hide();
        }
    }
    
    async handleLoginSuccess(data) {
        console.log('handleLoginSuccess called with:', data);
        
        // S'assurer que data contient user et token
        // Structure attendue: { user: {...}, token: "...", welcome_message: "..." }
        const user = data.user || data;
        const token = data.token || '';
        
        if (!user) {
            console.error('No user data in response:', data);
            throw new Error('Données utilisateur manquantes');
        }
        
        if (!token) {
            console.error('No token in response:', data);
            throw new Error('Token de connexion manquant');
        }
        
        this.saveSession({ user, token, data });
        
        const firstName = user.first_name || user.firstName || 'Utilisateur';
        const welcomeMsg = data.welcome_message || `Bienvenue ${firstName}!`;
        
        console.log('Showing success toast:', welcomeMsg);
        
        // Afficher le message de succès
        if (typeof ToastSystem !== 'undefined' && ToastSystem.show) {
            ToastSystem.show('success', 'Connexion réussie', welcomeMsg);
        } else {
            // Fallback si ToastSystem n'est pas disponible
            alert('Connexion réussie ! ' + welcomeMsg);
        }
        
        // Show welcome message before redirect
        setTimeout(() => {
            // Close any open login modal if present
            try {
                const modal = document.getElementById('loginModal');
                if (modal) {
                    try { const active = document.activeElement; if (active && modal.contains(active)) try{active.blur();}catch(e){} } catch(e){}
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden','true');
                }
            } catch (e) {}

            // Update header/profile UI immediately
            try { if (typeof window.initAuthProfile === 'function') window.initAuthProfile(); } catch (e) {}

            const role = user.role || 'client';
            console.log('Redirecting to dashboard for role:', role);
            this.redirectToDashboard(role);
        }, 1500);
    }
    
    saveSession(data) {
        const user = data.user || data;
        const token = data.token || '';
        
        if (token) {
            localStorage.setItem('auth_token', token);
        }
        if (user) {
            localStorage.setItem('user_data', JSON.stringify(user));
        }
        // Persist role and id for other scripts that read these keys
        try {
            const role = (user && (user.role || user.user_role || user.role_name)) ? (user.role || user.user_role || user.role_name) : 'client';
            const uid = (user && (user.id || user.user_id || user.uid)) ? (user.id || user.user_id || user.uid) : '';
            if (role) localStorage.setItem('user_role', role);
            if (uid) localStorage.setItem('user_id', String(uid));
        } catch (e) { /* noop */ }
        
        // Set token expiry (7 days comme défini dans l'API)
        const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000);
        localStorage.setItem('token_expiry', expiry.toString());
    }
    
    redirectToDashboard(role) {
        const dashboards = {
            'admin': 'admin/dashboard.html',
            'super_admin': 'admin/dashboard.html',
            'delivery': 'delivery/dashboard.html',
            'livreur': 'delivery/dashboard.html',
            'restaurant': 'restaurant/dashboard.html',
            'client': 'index.html'
        };
        
        // Rediriger selon le rôle
        const dashboard = dashboards[role] || 'index.html';
        window.location.href = dashboard;
    }
    
    async validateRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return false;
        
        let isValid = true;
        
        // Validate all fields
        const inputs = form.querySelectorAll('input, textarea, select');
        for (const input of inputs) {
            const errors = FormValidator.validateField(input);
            if (errors.length > 0) {
                FormValidator.showFieldError(input, errors);
                isValid = false;
            }
        }
        
        // Validate password confirmation
        this.validatePasswordConfirmation();
        
        // Check terms acceptance
        const termsCheckbox = document.getElementById('accept_terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            ToastSystem.show('error', 'Conditions requises', 'Veuillez accepter les conditions générales');
            termsCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            isValid = false;
        }
        
        // Validate driver-specific requirements
        if (this.currentRole === 'livreur') {
            const driverValid = await this.validateDriverRequirements();
            if (!driverValid) isValid = false;
        }
        
        // Validate file uploads
        const fileValid = this.validateFileUploads();
        if (!fileValid) isValid = false;
        
        return isValid;
    }
    
    async validateDriverRequirements() {
        let isValid = true;
        
        // Check ID document
        const idHandler = this.fileHandlers.id_document;
        if (idHandler && !idHandler.getFile()) {
            ToastSystem.show('error', 'Document requis', 'La pièce d\'identité est obligatoire pour les livreurs');
            isValid = false;
        }
        
        // Check vehicle type
        const vehicleType = document.getElementById('vehicle_type');
        if (vehicleType && !vehicleType.value) {
            FormValidator.showFieldError(vehicleType, ['Le type de véhicule est requis']);
            isValid = false;
        }
        
        return isValid;
    }
    
    validateFileUploads() {
        let isValid = true;
        
        Object.entries(this.fileHandlers).forEach(([field, handler]) => {
            const input = document.querySelector(`input[name="${field}"]`);
            if (input && input.required && !handler.getFile()) {
                ToastSystem.show('error', 'Fichier manquant', `Le fichier ${field} est requis`);
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    handleSocialLogin(button) {
        const provider = button.classList.contains('google') ? 'Google' : 
                        button.classList.contains('facebook') ? 'Facebook' : 'Social';
        
        ToastSystem.show('info', 'Connexion sociale', `Connexion avec ${provider} en cours...`);
        
        // Implement actual OAuth flow here
        setTimeout(() => {
            ToastSystem.show('info', 'En développement', 'La connexion sociale sera bientôt disponible');
        }, 1500);
    }
    
    handleForgotPassword() {
        const email = prompt('Veuillez entrer votre adresse email pour réinitialiser votre mot de passe :');
        
        if (email && FormValidator.isValidEmail(email)) {
            _TGT_LS.show('Envoi du lien de réinitialisation...');
            
            // Simulate API call
            setTimeout(() => {
                _TGT_LS.hide();
                ToastSystem.show('success', 'Email envoyé', 
                    'Un lien de réinitialisation a été envoyé à votre adresse email');
            }, 2000);
        } else if (email) {
            ToastSystem.show('error', 'Email invalide', 'Veuillez entrer une adresse email valide');
        }
    }
    
    showTermsModal() {
        // In a real app, this would open a modal
        const terms = `
            <h3>Conditions Générales d'Utilisation</h3>
            <p>En utilisant Titi Golden Taste, vous acceptez :</p>
            <ol>
                <li>De fournir des informations exactes</li>
                <li>De respecter la confidentialité de votre compte</li>
                <li>De vous conformer à nos règles de communauté</li>
                <li>D'accepter notre politique de confidentialité</li>
            </ol>
            <p><strong>Version complète disponible sur notre site.</strong></p>
        `;
        
        // Simple implementation - replace with modal in production
        const modal = document.createElement('div');
        modal.className = 'terms-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-body">
                    ${terms}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary accept-terms">J'ai compris</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.accept-terms').onclick = () => {
            document.getElementById('accept_terms').checked = true;
            modal.remove();
        };
    }
    
    checkURLParameters() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('pending') === 'driver') {
            ToastSystem.show('warning', 'Validation en attente', 
                'Votre compte livreur est en cours de validation. Vous recevrez un email de confirmation.');
        }
        
        if (params.get('success') === 'registered') {
            ToastSystem.show('success', 'Inscription confirmée', 
                'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.');
        }
        
        if (params.get('expired') === 'session') {
            ToastSystem.show('warning', 'Session expirée', 
                'Votre session a expiré. Veuillez vous reconnecter.');
        }
    }
    
    checkSession() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
            try {
                const expiry = localStorage.getItem('token_expiry');
                if (expiry && Date.now() > parseInt(expiry)) {
                    localStorage.clear();
                    return;
                }
                
                const user = JSON.parse(userData);
                const currentPath = window.location.pathname;
                
                // If user is already logged in and tries to access auth pages, redirect
                if (currentPath.includes('login') || currentPath.includes('register')) {
                    this.redirectToDashboard(user.role);
                }
            } catch (error) {
                localStorage.clear();
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for toast system
    const toastCSS = `
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        }
        
        .toast {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .toast-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        
        .toast-success .toast-icon { color: #28a745; }
        .toast-error .toast-icon { color: #dc3545; }
        .toast-warning .toast-icon { color: #ffc107; }
        .toast-info .toast-icon { color: #17a2b8; }
        
        .toast-content {
            flex: 1;
        }
        
        .toast-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: #333;
        }
        
        .toast-message {
            font-size: 0.9rem;
            color: #666;
            line-height: 1.4;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 0;
            font-size: 1.2rem;
            line-height: 1;
            transition: color 0.3s;
        }
        
        .toast-close:hover {
            color: #666;
        }
        
        .terms-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            padding: 25px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        }
        
        .modal-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #999;
        }
        
        .modal-body {
            margin: 20px 0;
        }
        
        .success-screen {
            text-align: center;
            padding: 40px 20px;
        }
        
        .success-icon {
            font-size: 4rem;
            color: #28a745;
            margin-bottom: 20px;
        }
        
        .success-message {
            color: #666;
            margin: 20px 0;
            line-height: 1.6;
        }
        
        .success-actions {
            margin-top: 30px;
        }
        
        .spinner.small {
            width: 30px;
            height: 30px;
            margin: 0 auto;
        }
        
        .redirect-message {
            color: #999;
            font-size: 0.9rem;
            margin-top: 10px;
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = toastCSS;
    document.head.appendChild(style);
    
    // Initialize auth controller
    window.authController = new AuthController();
    
    // If redirected here because of a pending order, show a resume banner
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('resume_wizard') === '1') {
            const returnPath = params.get('return') || '';
            const banner = document.createElement('div');
            banner.className = 'resume-banner';
            banner.innerHTML = `
                <div class="resume-banner-inner">
                    <div class="resume-msg">Vous devez vous connecter pour poursuivre votre commande</div>
                    <div class="resume-actions">
                        <button type="button" class="btn btn-resume">Retourner à la commande</button>
                        <button type="button" class="btn btn-dismiss" aria-label="Fermer">&times;</button>
                    </div>
                </div>
            `;
            const container = document.querySelector('.auth-container') || document.body;
            container.insertBefore(banner, container.firstChild);

            // Banner styles
            const bannerCSS = `
                .resume-banner{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(90deg,#fff8e6,#fffaf0);border:1px solid rgba(212,175,55,0.18);padding:12px 16px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.12);display:flex;align-items:center;gap:12px;max-width:900px;width:calc(100% - 40px)}
                .resume-banner-inner{display:flex;justify-content:space-between;align-items:center;width:100%}
                .resume-msg{font-weight:700;color:#111}
                .resume-actions .btn-resume{background:#d4af37;color:#111;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
                .resume-actions .btn-dismiss{background:transparent;border:none;color:#666;font-size:20px;margin-left:8px;cursor:pointer}
            `;
            const s2 = document.createElement('style'); s2.textContent = bannerCSS; document.head.appendChild(s2);

            // Button handlers
            banner.querySelector('.btn-resume').addEventListener('click', function () {
                if (returnPath) {
                    try { window.location.href = returnPath + (returnPath.includes('?') ? '&' : '?') + '_t=' + Date.now(); }
                    catch (e) { window.location.href = returnPath; }
                } else {
                    try { history.back(); } catch (e) { window.location.href = 'index.html'; }
                }
            });
            banner.querySelector('.btn-dismiss').addEventListener('click', function () { banner.remove(); });
        }
    } catch (e) { console.error('resume banner', e); }
});