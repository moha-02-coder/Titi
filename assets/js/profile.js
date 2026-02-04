document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('auth_token');
    const form = document.getElementById('profileForm');
    const avatar = document.getElementById('profileAvatar');
    const nameTitle = document.getElementById('profileName');

    async function loadProfile() {
        if (!token) return;
        try {
            const resp = await fetch((window.API_BASE_URL || 'backend/api') + '/auth/profile.php', { headers: { 'Authorization': 'Bearer ' + token } });
            const j = await resp.json();
            if (!j || !j.success) return;
            const u = j.data.user || {};
            document.getElementById('first_name').value = u.first_name || '';
            document.getElementById('last_name').value = u.last_name || '';
            document.getElementById('email').value = u.email || '';
            document.getElementById('phone').value = u.phone || '';
            document.getElementById('address').value = u.address || '';
            document.getElementById('city').value = u.city || '';
            document.getElementById('quarter').value = u.quarter || '';
            avatar.src = u.avatar || (window.DEFAULT_IMAGE || 'assets/images/default.jpg');
            nameTitle.textContent = ((u.first_name||'') + ' ' + (u.last_name||'')).trim() || 'Mon profil';
            // keep localStorage in sync
            try { localStorage.setItem('user_data', JSON.stringify(u)); } catch (e) {}

            // Render role specific panels
            try { renderRolePanels(u); } catch (e) { console.warn('renderRolePanels failed', e); }
        } catch (e) {
            console.error('Could not load profile', e);
        }
    }

    async function saveProfile() {
        if (!token) { alert('Veuillez vous connecter'); return; }
        const payload = {
            first_name: document.getElementById('first_name').value.trim(),
            last_name: document.getElementById('last_name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            quarter: document.getElementById('quarter').value.trim(),
            password: document.getElementById('password').value
        };
        try {
            const r = await fetch((window.API_BASE_URL || 'backend/api') + '/auth/profile.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
            const j = await r.json();
            if (j && j.success) {
                if (typeof ToastSystem !== 'undefined') ToastSystem.show('success','Profil mis à jour','Vos informations ont été enregistrées');
                // Update localStorage
                const existing = JSON.parse(localStorage.getItem('user_data')||'{}');
                const updated = Object.assign({}, existing, payload);
                delete updated.password;
                localStorage.setItem('user_data', JSON.stringify(updated));
                try { if (typeof window.initAuthProfile === 'function') window.initAuthProfile(); } catch (e) {}
            } else {
                if (typeof ToastSystem !== 'undefined') ToastSystem.show('error','Erreur', j.message || 'Impossible de mettre à jour');
            }
        } catch (e) { console.error(e); if (typeof ToastSystem !== 'undefined') ToastSystem.show('error','Erreur','Erreur réseau'); }
    }

    document.getElementById('saveProfile').addEventListener('click', saveProfile);
    loadProfile();

    // Role-based UI
    async function renderRolePanels(user) {
        const container = document.getElementById('rolePanels');
        if (!container) return;
        container.innerHTML = '';
        const role = (user.role || (JSON.parse(localStorage.getItem('user_data')||'{}').role) || 'client').toLowerCase();

        if (role === 'client') {
            const panel = document.createElement('div');
            panel.className = 'panel client-stats';
            panel.innerHTML = '<h3>Vos statistiques de commandes</h3><div id="clientStats">Chargement...</div>';
            container.appendChild(panel);
            // fetch stats
            try {
                const r = await fetch((window.API_BASE_URL || 'backend/api') + '/orders/stats.php', { headers: { 'Authorization': 'Bearer ' + token } });
                const jj = await r.json();
                const s = (jj && jj.stats) ? jj.stats : null;
                const node = document.getElementById('clientStats');
                if (!s) { node.textContent = 'Aucune donnée'; return; }
                node.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat"><strong>${s.global.total_orders}</strong><div class="label">Commandes</div></div>
                        <div class="stat"><strong>${s.global.total_spent}</strong><div class="label">Dépensé (FCFA)</div></div>
                        <div class="stat"><strong>${s.global.avg_order_value}</strong><div class="label">Moyenne</div></div>
                        <div class="stat"><strong>${s.summary.active_orders}</strong><div class="label">Commandes actives</div></div>
                    </div>
                    <h4>Favoris</h4>
                    <ul>${(s.favorites||[]).map(f=>`<li>${f.item_name} (${f.order_count})</li>`).join('')}</ul>
                `;
            } catch (e) { console.error(e); }
        } else if (role === 'livreur' || role === 'delivery') {
            const panel = document.createElement('div');
            panel.className = 'panel driver-stats';
            panel.innerHTML = '<h3>Statistiques livreur</h3><div id="driverStats">Chargement...</div>';
            container.appendChild(panel);
            // show driver_info if present
            const d = user.driver_info || JSON.parse(localStorage.getItem('user_data')||'{}').driver_info || null;
            const node = document.getElementById('driverStats');
            if (d) {
                node.innerHTML = `<div class="stats-grid">
                    <div class="stat"><strong>${d.total_deliveries||0}</strong><div class="label">Livraisons</div></div>
                    <div class="stat"><strong>${d.rating||0}</strong><div class="label">Note</div></div>
                    <div class="stat"><strong>${d.status||'N/A'}</strong><div class="label">Statut</div></div>
                </div>`;
            } else {
                node.textContent = 'Aucune donnée livreur disponible';
            }
        } else if (role === 'admin' || role === 'super_admin') {
            const panel = document.createElement('div');
            panel.className = 'panel admin-panel';
            panel.innerHTML = '<h3>Administration</h3><div class="admin-links">' +
                '<a class="btn btn-outline" href="admin/dashboard.html">Tableau de bord</a> ' +
                '<a class="btn btn-outline" href="admin/dashboard.html#users">Gérer les utilisateurs</a> ' +
                '<a class="btn btn-outline" href="admin/dashboard.html#orders">Commandes</a>' +
                '</div>';
            container.appendChild(panel);
        }
    }
});
