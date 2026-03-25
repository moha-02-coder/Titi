/* Frontend: minimal recipes & live integration
   - Load public recipes and append a short card under menu items
   - Poll live status and show floating live button when active
*/
(function(){
    'use strict';

    // Resolve API base from global config and current project path
    function getApiBase() {
        const configured = (window.API_BASE_URL || 'backend/api').toString().replace(/\/+$/, '');
        if (/^https?:\/\//i.test(configured) || configured.startsWith('/')) {
            return configured;
        }

        const path = window.location.pathname || '/';
        const dir = path.endsWith('/') ? path.slice(0, -1) : path.replace(/\/[^\/]*$/, '');
        const joined = `${dir}/${configured}`.replace(/\/{2,}/g, '/');
        return joined || '/backend/api';
    }

    async function parseJsonSafely(response) {
        const text = await response.text();
        if (!text || !text.trim()) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
    }

    async function loadRecipesSnippet(containerId='allMenuContainer'){
        const root = document.getElementById(containerId);
        if (!root) return;
        try {
            const apiBase = getApiBase();
            const res = await fetch(apiBase + '/recipes/list.php');
            const json = await parseJsonSafely(res);
            if (!json || !json.success) return;

            const recipes = json.data || [];
            const strip = document.createElement('div');
            strip.className = 'recipes-strip';
            strip.style.cssText = 'display: flex; gap: 15px; overflow-x: auto; padding: 20px 0; margin: 20px 0;';

            recipes.slice(0,6).forEach(r => {
                const c = document.createElement('div');
                c.className = 'recipe-card-small';
                c.style.cssText = 'min-width: 200px; background: white; border-radius: 12px; padding: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;';

                const imageUrl = r.main_image
                    ? (r.main_image.startsWith('http') ? r.main_image : (r.main_image.startsWith('/') ? r.main_image : '/' + r.main_image))
                    : (window.DEFAULT_IMAGE || '/assets/images/default.jpg');

                c.innerHTML = `
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                            <img src="${imageUrl}" alt="${r.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${window.DEFAULT_IMAGE || '/assets/images/default.jpg'}';">
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <strong style="display: block; color: #333; font-size: 14px; margin-bottom: 4px;">${r.name}</strong>
                            <p style="margin: 0; color: #666; font-size: 12px; line-height: 1.3;">${r.short_description||''}</p>
                            <div style="margin-top: 4px; font-size: 11px; color: #999;">
                                <span>${r.prep_time_min||30}min</span>
                                <span style="margin-left: 8px;">${r.portions||4}p</span>
                            </div>
                        </div>
                    </div>
                `;

                c.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof ToastSystem !== 'undefined') {
                        ToastSystem.show('info', 'Recette', `Affichage de ${r.name}`);
                    }
                });

                c.addEventListener('mouseenter', () => { c.style.transform = 'translateY(-2px)'; });
                c.addEventListener('mouseleave', () => { c.style.transform = 'translateY(0)'; });

                strip.appendChild(c);
            });

            root.parentNode.insertBefore(strip, root.nextSibling);
        } catch(e){
            // keep silent on missing network/endpoint
        }
    }

    // Live poll: show floating button if any live status == 'live'
    let liveTimer = null;
    async function pollLive(){
        try{
            const apiBase = getApiBase();
            const res = await fetch(apiBase + '/lives/list.php');
            if (!res.ok) return;

            const json = await parseJsonSafely(res);
            if (!json || !json.success) return;

            const live = (json.data || []).find(l => l.status === 'live');
            const existing = document.getElementById('tgtLiveBtn');
            if (live && !existing) {
                const btn = document.createElement('button');
                btn.id = 'tgtLiveBtn';
                btn.className = 'live-floating';
                btn.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 25px;
                    font-weight: 600;
                    cursor: pointer;
                    z-index: 1000;
                    box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
                    animation: pulse 2s infinite;
                `;
                btn.innerHTML = '<span style="display: inline-block; width: 8px; height: 8px; background: white; border-radius: 50%; margin-right: 8px; animation: blink 1s infinite;"></span> En direct';

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof ToastSystem !== 'undefined') {
                        ToastSystem.show('info', 'Live', `Redirection vers ${live.title}`);
                    }
                    setTimeout(() => {
                        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                        window.open(baseUrl + `live.html?id=${live.id}`,'_self');
                    }, 800);
                });
                document.body.appendChild(btn);
            } else if (!live && existing) {
                existing.remove();
            }
        }catch(e){
            // keep silent on missing network/endpoint
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', function(){
        const onIndex = window.location.pathname.endsWith('index.html')
            || window.location.pathname === '/'
            || window.location.pathname.endsWith('/Titi/');

        if (onIndex) {
            loadRecipesSnippet();
            pollLive();
            liveTimer = setInterval(pollLive, 30000);
        }
    });

    window.__tgt_pollLive = pollLive;
})();
