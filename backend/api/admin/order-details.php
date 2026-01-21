// Gestion du menu
async function loadMenuManagement() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        displayMenuItems(data.menu || []);
    } catch (error) {
        console.error('Erreur lors du chargement du menu:', error);
        showNotification('Erreur lors du chargement du menu', 'error');
    }
}

function displayMenuItems(menuItems) {
    const container = document.getElementById('menuItemsGrid');
    
    if (menuItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <h3>Aucun plat dans le menu</h3>
                <p>Ajoutez votre premier plat pour commencer.</p>
                <button class="btn" onclick="showAddMenuModal()">
                    <i class="fas fa-plus"></i> Ajouter un plat
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = menuItems.map(item => `
        <div class="menu-item-card ${item.is_today ? 'today' : ''}">
            <div class="menu-item-image">
                <i class="fas fa-utensils"></i>
            </div>
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h3 class="menu-item-name">${item.name}</h3>
                    <div class="menu-item-price">${item.price} FCFA</div>
                </div>
                <span class="menu-item-category">${item.category}</span>
                <p class="menu-item-description">${item.description || 'Pas de description'}</p>
                <div class="menu-item-actions">
                    <button class="btn btn-sm" onclick="setAsToday(${item.id})" ${item.is_today ? 'disabled' : ''}>
                        <i class="fas fa-star"></i> Menu du jour
                    </button>
                    <button class="btn btn-sm btn-edit" onclick="editMenuItem(${item.id})">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.id})">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Gestion des statistiques
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.stats);
            updateCharts(data.charts);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

function updateDashboardStats(stats) {
    // Mettre à jour les statistiques principales
    document.getElementById('todayOrders').textContent = stats.orders?.total_orders || 0;
    document.getElementById('todayRevenue').textContent = `${stats.orders?.total_revenue || 0} FCFA`;
    document.getElementById('lowStock').textContent = stats.stock?.low_stock || 0;
}

// Gestion des paramètres
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings.php`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displaySettings(data.settings);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        showNotification('Erreur lors du chargement des paramètres', 'error');
    }
}

function displaySettings(settings) {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    
    // Réinitialiser le formulaire
    form.innerHTML = '';
    
    // Parcourir chaque catégorie
    for (const [category, categorySettings] of Object.entries(settings)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'settings-group';
        
        let categoryTitle = category;
        switch (category) {
            case 'restaurant':
                categoryTitle = '<i class="fas fa-store"></i> Informations du restaurant';
                break;
            case 'hours':
                categoryTitle = '<i class="fas fa-clock"></i> Horaires d\'ouverture';
                break;
            case 'delivery':
                categoryTitle = '<i class="fas fa-truck"></i> Livraison';
                break;
            case 'fees':
                categoryTitle = '<i class="fas fa-euro-sign"></i> Taxes et frais';
                break;
            case 'features':
                categoryTitle = '<i class="fas fa-sliders-h"></i> Fonctionnalités';
                break;
        }
        
        categoryDiv.innerHTML = `<h3>${categoryTitle}</h3>`;
        
        const settingsDiv = document.createElement('div');
        settingsDiv.className = 'settings-fields';
        
        for (const [key, setting] of Object.entries(categorySettings)) {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'form-group';
            
            const label = document.createElement('label');
            label.textContent = setting.description || key;
            label.setAttribute('for', `setting_${category}_${key}`);
            
            let input;
            const inputId = `setting_${category}_${key}`;
            const currentValue = setting.value;
            
            switch (setting.type) {
                case 'boolean':
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = inputId;
                    input.name = `${category}[${key}]`;
                    input.checked = currentValue;
                    input.setAttribute('data-type', 'boolean');
                    break;
                    
                case 'integer':
                case 'float':
                    input = document.createElement('input');
                    input.type = 'number';
                    input.id = inputId;
                    input.name = `${category}[${key}]`;
                    input.value = currentValue;
                    input.setAttribute('data-type', setting.type);
                    if (setting.type === 'float') {
                        input.step = '0.1';
                    }
                    break;
                    
                case 'json':
                    // Pour les paramètres JSON complexes, utiliser un textarea
                    input = document.createElement('textarea');
                    input.id = inputId;
                    input.name = `${category}[${key}]`;
                    input.value = JSON.stringify(currentValue, null, 2);
                    input.setAttribute('data-type', 'json');
                    input.rows = 3;
                    break;
                    
                default:
                    input = document.createElement('input');
                    input.type = 'text';
                    input.id = inputId;
                    input.name = `${category}[${key}]`;
                    input.value = currentValue;
                    input.setAttribute('data-type', 'string');
            }
            
            fieldDiv.appendChild(label);
            fieldDiv.appendChild(input);
            settingsDiv.appendChild(fieldDiv);
        }
        
        categoryDiv.appendChild(settingsDiv);
        form.appendChild(categoryDiv);
    }
    
    // Ajouter le bouton de sauvegarde
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'settings-actions';
    actionsDiv.innerHTML = `
        <button type="submit" class="btn">
            <i class="fas fa-save"></i> Enregistrer les paramètres
        </button>
        <button type="button" class="btn btn-outline" onclick="resetSettings()">
            <i class="fas fa-undo"></i> Réinitialiser
        </button>
    `;
    
    form.appendChild(actionsDiv);
}

// Mettre à jour la fonction showAdminSection pour inclure les nouvelles sections
function showAdminSection(sectionId) {
    // Cacher toutes les sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Charger les données spécifiques à la section
        switch(sectionId) {
            case 'dashboard':
                loadDashboardStats();
                loadStats();
                break;
            case 'orders':
                loadOrdersTable();
                break;
            case 'menu':
            case 'menu-today':
                loadMenuManagement();
                break;
            case 'products':
                loadProductsTable();
                break;
            case 'customers':
                loadCustomersTable();
                break;
            case 'live-status':
                loadLiveStatus();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

// Ajouter le gestionnaire d'événements pour le formulaire des paramètres
document.addEventListener('DOMContentLoaded', function() {
    // ... code existant ...
    
    // Gestionnaire pour le formulaire des paramètres
    document.getElementById('settingsForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const settings = {};
        
        // Extraire les données du formulaire
        for (const [key, value] of formData.entries()) {
            const match = key.match(/([a-z]+)\[([a-z_]+)\]/i);
            if (match) {
                const category = match[1];
                const settingKey = match[2];
                const input = document.querySelector(`[name="${key}"]`);
                const type = input?.getAttribute('data-type') || 'string';
                
                if (!settings[category]) {
                    settings[category] = {};
                }
                
                let processedValue = value;
                switch (type) {
                    case 'boolean':
                        processedValue = input.checked;
                        break;
                    case 'integer':
                        processedValue = parseInt(value);
                        break;
                    case 'float':
                        processedValue = parseFloat(value);
                        break;
                    case 'json':
                        try {
                            processedValue = JSON.parse(value);
                        } catch (e) {
                            showNotification(`Erreur dans le JSON pour ${settingKey}`, 'error');
                            return;
                        }
                        break;
                }
                
                settings[category][settingKey] = {
                    value: processedValue,
                    type: type
                };
            }
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/settings.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ settings })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Paramètres sauvegardés avec succès', 'success');
            } else {
                showNotification(data.message || 'Erreur lors de la sauvegarde', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            showNotification('Erreur de connexion au serveur', 'error');
        }
    });
});