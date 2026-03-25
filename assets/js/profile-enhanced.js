/**
 * Enhanced Profile Management
 * Gestion améliorée du profil avec statistiques et suivi d'activité
 */

class EnhancedProfileManager {
    constructor() {
        this.userData = null;
        this.orders = [];
        this.stats = {
            totalOrders: 0,
            totalSpent: 0,
            favoriteItems: 0,
            memberSince: null
        };
        this.isEditMode = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserProfile();
        this.loadUserStats();
        this.loadUserOrders();
    }

    bindEvents() {
        const editModeBtn = document.getElementById('editModeBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const profileForm = document.getElementById('profileForm');
        const avatarOverlay = document.querySelector('.avatar-overlay');

        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => this.enterEditMode());
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.exitEditMode());
        }

        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.showPasswordChange());
        }

        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        }

        if (avatarOverlay) {
            avatarOverlay.addEventListener('click', () => this.handleAvatarChange());
        }

        // Auto-update view mode when form values change
        const formInputs = document.querySelectorAll('#profileForm input');
        formInputs.forEach(input => {
            input.addEventListener('input', () => this.updateViewMode());
        });
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.showError('Utilisateur non connecté');
                return;
            }

            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/user/profile.php`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement du profil');
            }

            const data = await response.json();
            if (data.success) {
                this.userData = data.user;
                this.populateProfileForm();
                this.updateViewMode();
                this.updateProfileHeader();
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }
        } catch (error) {
            console.error('Erreur loadUserProfile:', error);
            this.showError('Impossible de charger votre profil');
        }
    }

    async loadUserStats() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/user/stats.php`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.stats = { ...this.stats, ...data.stats };
                    this.renderStats();
                }
            }
        } catch (error) {
            console.error('Erreur loadUserStats:', error);
        }
    }

    async loadUserOrders() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/orders/recent.php`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.orders = data.orders || [];
                    this.renderRecentOrders();
                }
            }
        } catch (error) {
            console.error('Erreur loadUserOrders:', error);
        }
    }

    populateProfileForm() {
        if (!this.userData) return;

        const fields = {
            'first_name': this.userData.first_name || '',
            'last_name': this.userData.last_name || '',
            'email': this.userData.email || '',
            'phone': this.userData.phone || '',
            'address': this.userData.address || '',
            'city': this.userData.city || 'Bamako',
            'quarter': this.userData.quarter || ''
        };

        Object.entries(fields).forEach(([field, value]) => {
            const input = document.getElementById(field);
            if (input) {
                input.value = value;
            }
        });
    }

    updateViewMode() {
        document.getElementById('viewFirstName').textContent = document.getElementById('first_name').value || '-';
        document.getElementById('viewLastName').textContent = document.getElementById('last_name').value || '-';
        document.getElementById('viewEmail').textContent = document.getElementById('email').value || '-';
        document.getElementById('viewPhone').textContent = document.getElementById('phone').value || '-';
        document.getElementById('viewAddress').textContent = document.getElementById('address').value || '-';
        document.getElementById('viewCity').textContent = document.getElementById('city').value || '-';
        document.getElementById('viewQuarter').textContent = document.getElementById('quarter').value || '-';
    }

    updateProfileHeader() {
        if (!this.userData) return;

        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileAvatar = document.getElementById('profileAvatar');

        if (profileName) {
            profileName.textContent = `${this.userData.first_name || ''} ${this.userData.last_name || ''}`.trim() || 'Chargement...';
        }

        if (profileEmail) {
            profileEmail.textContent = this.userData.email || 'email@example.com';
        }

        if (profileAvatar && this.userData.avatar) {
            profileAvatar.src = this.userData.avatar;
        }
    }

    renderStats() {
        const statsContainer = document.getElementById('userStats');
        if (!statsContainer) return;

        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${this.stats.totalOrders}</div>
                        <div class="stat-label">Commandes</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${this.formatMoney(this.stats.totalSpent)}</div>
                        <div class="stat-label">Total dépensé</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${this.stats.favoriteItems}</div>
                        <div class="stat-label">Articles favoris</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${this.formatMemberSince(this.stats.memberSince)}</div>
                        <div class="stat-label">Membre depuis</div>
                    </div>
                </div>
            </div>
        `;

        statsContainer.innerHTML = statsHTML;
    }

    renderRecentOrders() {
        const ordersContainer = document.getElementById('recentOrders');
        if (!ordersContainer) return;

        if (this.orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="no-recent-orders">
                    <i class="fas fa-receipt"></i>
                    <p>Aucune commande récente</p>
                    <a href="orders.html" class="btn btn-primary">Voir toutes les commandes</a>
                </div>
            `;
            return;
        }

        const ordersHTML = this.orders.slice(0, 3).map(order => this.renderOrderSummary(order)).join('');
        
        ordersContainer.innerHTML = `
            <h3>Commandes récentes</h3>
            <div class="recent-orders-list">
                ${ordersHTML}
            </div>
            ${this.orders.length > 3 ? `
                <div class="view-all-orders">
                    <a href="orders.html" class="btn btn-outline">
                        <i class="fas fa-list"></i> Voir toutes les commandes
                    </a>
                </div>
            ` : ''}
        `;
    }

    renderOrderSummary(order) {
        const statusConfig = this.getOrderStatusConfig(order.status);
        const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        });

        return `
            <div class="order-summary">
                <div class="order-summary-header">
                    <div class="order-summary-info">
                        <div class="order-number">#${String(order.id).padStart(6, '0')}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <div class="order-summary-status">
                        <span class="status-badge ${statusConfig.class}">
                            <i class="fas ${statusConfig.icon}"></i>
                            ${statusConfig.label}
                        </span>
                    </div>
                </div>
                <div class="order-summary-content">
                    <div class="order-summary-items">
                        ${(order.items || []).slice(0, 2).map(item => `
                            <div class="summary-item">
                                ${item.image_url ? `
                                    <img src="${item.image_url}" alt="${item.name}" class="summary-item-image">
                                ` : `
                                    <div class="summary-item-placeholder">
                                        <i class="fas fa-utensils"></i>
                                    </div>
                                `}
                                <div class="summary-item-info">
                                    <div class="summary-item-name">${item.name}</div>
                                    <div class="summary-item-quantity">x${item.quantity || 1}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${order.items.length > 2 ? `
                            <div class="summary-more">+${order.items.length - 2} article${order.items.length - 2 > 1 ? 's' : ''}</div>
                        ` : ''}
                    </div>
                    <div class="order-summary-total">
                        <div class="total-amount">${this.formatMoney(order.total || 0)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    getOrderStatusConfig(status) {
        const configs = {
            pending: { label: 'En attente', icon: 'fa-clock', class: 'status-pending' },
            assigned: { label: 'Assignée', icon: 'fa-user-check', class: 'status-assigned' },
            preparing: { label: 'En préparation', icon: 'fa-utensils', class: 'status-preparing' },
            delivery: { label: 'En livraison', icon: 'fa-truck', class: 'status-delivery' },
            completed: { label: 'Terminée', icon: 'fa-check-circle', class: 'status-completed' },
            cancelled: { label: 'Annulée', icon: 'fa-times-circle', class: 'status-cancelled' }
        };
        
        return configs[status] || configs.pending;
    }

    enterEditMode() {
        const viewMode = document.getElementById('viewMode');
        const editMode = document.getElementById('editMode');
        const editModeBtn = document.getElementById('editModeBtn');

        if (viewMode) viewMode.style.display = 'none';
        if (editMode) editMode.style.display = 'block';
        if (editModeBtn) editModeBtn.style.display = 'none';
        
        this.isEditMode = true;
    }

    exitEditMode() {
        const viewMode = document.getElementById('viewMode');
        const editMode = document.getElementById('editMode');
        const editModeBtn = document.getElementById('editModeBtn');

        if (viewMode) viewMode.style.display = 'block';
        if (editMode) editMode.style.display = 'none';
        if (editModeBtn) editModeBtn.style.display = 'block';
        
        this.isEditMode = false;
    }

    async handleProfileSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
        }

        try {
            const token = localStorage.getItem('auth_token');
            const data = Object.fromEntries(formData.entries());
            
            // Ne pas envoyer le mot de passe s'il est vide
            if (!data.password) {
                delete data.password;
            }

            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/user/update.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Profil mis à jour avec succès', 'success');
                this.userData = { ...this.userData, ...result.user };
                this.exitEditMode();
                this.updateProfileHeader();
            } else {
                throw new Error(result.message || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Erreur handleProfileSubmit:', error);
            this.showNotification('Erreur lors de la mise à jour du profil', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer les modifications';
            }
        }
    }

    handleAvatarChange() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 5 * 1024 * 1024) { // 5MB
                this.showNotification('L\'image ne doit pas dépasser 5MB', 'error');
                return;
            }
            
            await this.uploadAvatar(file);
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${window.CONFIG?.API_BASE_URL || ''}backend/api/user/avatar.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Avatar mis à jour avec succès', 'success');
                if (this.userData) {
                    this.userData.avatar = result.avatar_url;
                }
                this.updateProfileHeader();
            } else {
                throw new Error(result.message || 'Erreur lors du téléchargement');
            }
        } catch (error) {
            console.error('Erreur uploadAvatar:', error);
            this.showNotification('Erreur lors du téléchargement de l\'avatar', 'error');
        }
    }

    showPasswordChange() {
        this.enterEditMode();
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.focus();
            passwordField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount || 0);
    }

    formatMemberSince(date) {
        if (!date) return 'N/A';
        
        const memberDate = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - memberDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffYears > 0) {
            return `${diffYears} an${diffYears > 1 ? 's' : ''}`;
        } else if (diffMonths > 0) {
            return `${diffMonths} mois`;
        } else {
            return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showError(message) {
        console.error('Profile Error:', message);
        this.showNotification(message, 'error');
    }
}

// Initialiser le gestionnaire de profil amélioré
let enhancedProfileManager;

document.addEventListener('DOMContentLoaded', function() {
    // S'assurer que le header est injecté
    if (typeof injectSharedHeaderFooter === 'function') {
        injectSharedHeaderFooter();
    }
    
    enhancedProfileManager = new EnhancedProfileManager();
});
