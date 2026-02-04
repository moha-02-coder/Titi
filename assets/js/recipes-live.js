/* Frontend: minimal recipes & live integration
   - Load public recipes and append a short card under menu items
   - Poll live status and show floating live button when active
*/
(function(){
    'use strict';

    async function loadRecipesSnippet(containerId='allMenuContainer'){
        const root = document.getElementById(containerId);
        if (!root) return;
        try {
            const res = await fetch((window.API_BASE_URL||'') + '/recipes/list.php');
            const json = await res.json();
            if (!json || !json.success) return;
            const recipes = json.data || [];
            // create a compact recipes strip
            const strip = document.createElement('div');
            strip.className = 'recipes-strip';
            recipes.slice(0,6).forEach(r => {
                const c = document.createElement('div');
                c.className = 'recipe-card-small';
                c.innerHTML = `<div class="r-img"><img src="${(r.main_image||'/assets/images/default.jpg')}" alt="${r.name}"></div><div class="r-info"><strong>${r.name}</strong><p>${r.short_description||''}</p></div>`;
                c.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Instead of redirecting, show a modal or log the action
                    console.log('Recipe clicked:', r.name, 'ID:', r.id);
                    // Optional: Show a toast or modal instead of redirecting
                    if (typeof ToastSystem !== 'undefined') {
                        ToastSystem.show('info', 'Recette', `Affichage de ${r.name}`);
                    }
                });
                strip.appendChild(c);
            });
            root.parentNode.insertBefore(strip, root.nextSibling);
        } catch(e){ console.warn('Recipes snippet failed', e); }
    }

    // Live poll: show floating button if any live status == 'live'
    let liveTimer = null;
    async function pollLive(){
        try{
            const res = await fetch((window.API_BASE_URL||'') + '/lives/list.php');
            if (!res.ok) return;
            const json = await res.json();
            if (!json || !json.success) return;
            const live = (json.data || []).find(l => l.status === 'live');
            const existing = document.getElementById('tgtLiveBtn');
            if (live && !existing) {
                const btn = document.createElement('button');
                btn.id = 'tgtLiveBtn';
                btn.className = 'live-floating';
                btn.innerHTML = '<span class="dot"></span> En direct';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Instead of redirecting, show a modal or log the action
                    console.log('Live clicked:', live.name, 'ID:', live.id);
                    // Optional: Show a toast or modal instead of redirecting
                    if (typeof ToastSystem !== 'undefined') {
                        ToastSystem.show('info', 'Live', `Redirection vers ${live.name}`);
                    }
                    // Optional: Redirect after a delay
                    setTimeout(() => {
                        window.open((window.API_BASE_URL? window.API_BASE_URL.replace('/backend/api','') : '') + `/live.html?id=${live.id}`,'_self');
                    }, 1000);
                });
                document.body.appendChild(btn);
            } else if (!live && existing) {
                existing.remove();
            }
        }catch(e){ console.warn('live poll error', e); }
    }

    document.addEventListener('DOMContentLoaded', function(){
        // Only run on index.html to avoid conflicts
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            loadRecipesSnippet();
            pollLive();
            liveTimer = setInterval(pollLive, 30000); // Increased to 30 seconds to reduce load
        }
    });

    window.__tgt_pollLive = pollLive;
})();
