(function(){
    'use strict';

    // Expose a global renderer: renderCustomization(containerSelector, options)
    async function fetchMenu(source) {
        // source: 'all' (default) or 'today' or a full path
        let path = '/menu/all.php';
        if (source === 'today') path = '/menu/menu-du-jour.php';
        if (source && source.indexOf('/') === 0) path = source; // allow full path override
        const url = (window.API_BASE_URL || 'backend/api') + path;
        try {
            const r = await fetch(url);
            const j = await r.json();
            if (!j) return [];
            return j.data || j.menu || j.items || j;
        } catch (e) {
            console.error('Could not fetch menu', e);
            return [];
        }
    }

    function createCard(item) {
        // Vérifier que l'item existe et a un ID
        if (!item || (!item.id && !item.menu_id)) {
            console.warn('Item invalide ou sans ID:', item);
            return null;
        }

        const card = document.createElement('div');
        card.className = 'cust-card';
        card.dataset.id = item.id || item.menu_id || '';

        const img = document.createElement('img');
        img.src = item.image_url || item.image || (window.DEFAULT_IMAGE || 'assets/images/default.jpg');
        img.alt = item.name || item.title || 'Plat';
        img.className = 'cust-card-img';

        const body = document.createElement('div');
        body.className = 'cust-card-body';

        const title = document.createElement('h4');
        title.textContent = item.name || item.title || 'Plat';
        title.className = 'cust-card-title';

        const desc = document.createElement('p');
        desc.textContent = item.description || '';
        desc.className = 'cust-card-desc';

        const bottom = document.createElement('div');
        bottom.className = 'cust-card-bottom';

        const price = document.createElement('div');
        price.className = 'cust-card-price';
        price.textContent = (item.price ? item.price + ' FCFA' : '—');

        // Price badge (top-right)
        const priceBadge = document.createElement('div');
        priceBadge.className = 'price-badge';
        priceBadge.textContent = (item.price ? item.price + ' FCFA' : '—');
        card.appendChild(priceBadge);

        const controls = document.createElement('div');
        controls.className = 'cust-card-controls';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'cust-select';
        checkbox.setAttribute('aria-label', 'Sélectionner ' + (item.name||'plat'));
        // ensure checkbox doesn't stretch the card
        checkbox.style.width = '18px';
        checkbox.style.height = '18px';
        checkbox.style.marginLeft = '8px';

        const qtyWrap = document.createElement('div');
        qtyWrap.className = 'qty-wrap';
        const btnMinus = document.createElement('button'); btnMinus.type='button'; btnMinus.className='qty-btn minus'; btnMinus.textContent='−';
        const qtyEl = document.createElement('input'); qtyEl.type='number'; qtyEl.min='1'; qtyEl.value='1'; qtyEl.className='qty-input';
        const btnPlus = document.createElement('button'); btnPlus.type='button'; btnPlus.className='qty-btn plus'; btnPlus.textContent='+';
        qtyWrap.appendChild(btnMinus); qtyWrap.appendChild(qtyEl); qtyWrap.appendChild(btnPlus);

        // default disabled qty when not selected
        qtyWrap.style.display = 'none';

        // events
        checkbox.addEventListener('change', function(){
            if (checkbox.checked) { qtyWrap.style.display='flex'; }
            else { qtyWrap.style.display='none'; }
        });
        btnMinus.addEventListener('click', ()=>{ const v = Math.max(1, parseInt(qtyEl.value||1)-1); qtyEl.value = v; });
        btnPlus.addEventListener('click', ()=>{ const v = Math.max(1, parseInt(qtyEl.value||1)+1); qtyEl.value = v; });

        controls.appendChild(checkbox);
        controls.appendChild(qtyWrap);

        bottom.appendChild(price);
        bottom.appendChild(controls);

        body.appendChild(title);
        body.appendChild(desc);
        body.appendChild(bottom);

        card.appendChild(img);
        card.appendChild(body);

        return {card, checkbox, qtyEl};
    }

    function collectSelected(container) {
        const cards = container.querySelectorAll('.cust-card');
        const items = [];
        cards.forEach(c => {
            const id = c.dataset.id;
            const cb = c.querySelector('.cust-select');
            if (!cb || !cb.checked) return;
            const qty = parseInt(c.querySelector('.qty-input').value || '1');
            const name = c.querySelector('.cust-card-title')?.textContent || '';
            const priceText = c.querySelector('.cust-card-price')?.textContent || '';
            const price = parseInt((priceText||'').replace(/[^0-9]/g,'')) || 0;
            items.push({ id, name, qty, unit_price: price });
        });
        return items;
    }

    async function render(containerSelector, options) {
        const container = (typeof containerSelector === 'string') ? document.querySelector(containerSelector) : containerSelector;
        if (!container) throw new Error('Container not found');

        container.classList.add('cust-container');
        container.innerHTML = '<div class="cust-loading">Chargement...</div>';

        options = options || {};
        const source = options.source || 'all'; // 'all' | 'today' | custom path
        const allowMulti = options.allowMulti !== false; // default true

        // Top controls: tabs for All / Today and optional category filters
        const topControls = document.createElement('div'); topControls.className = 'cust-top-controls';
        topControls.innerHTML = `
            <div class="cust-tabs">
                <button data-source="all" class="cust-tab active">Tous les plats</button>
                <button data-source="today" class="cust-tab">Menus du jour</button>
            </div>
            <div class="cust-search"></div>
        `;
        container.appendChild(topControls);

        let menu = await fetchMenu(source === 'today' ? 'today' : 'all');
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'cust-grid';

        const controlsWrap = document.createElement('div');
        controlsWrap.className = 'cust-actions';

        // We remove the explicit "Ajouter au panier" button per user's request.
        const btnClear = document.createElement('button'); btnClear.type='button'; btnClear.className='btn btn-outline'; btnClear.textContent = 'Tout désélectionner';
        controlsWrap.appendChild(btnClear);

        const cardMap = [];
        // Normalize menu array
        if (!Array.isArray(menu)) menu = Object.values(menu || {});

        menu.forEach(item => {
            const cardResult = createCard(item);
            if (cardResult) {
                const {card, checkbox, qtyEl} = cardResult;
                grid.appendChild(card);
                cardMap.push({card, item, checkbox, qtyEl});
            }
        });

        container.appendChild(grid);
        container.appendChild(controlsWrap);

        // Local handler to perform the 'add to order' action
        function handleAddToOrder() {
            const items = collectSelected(container);
            const ev = new CustomEvent('tgt:customization:done', { detail: { items } });
            window.dispatchEvent(ev);
            if (options && typeof options.onDone === 'function') options.onDone(items);
        }

        // Attach .btn-add click handler if present (search after DOM injection)
        try {
            const btnAdd = controlsWrap.querySelector('.btn-add') || container.querySelector('.btn-add');
            if (btnAdd) {
                // Avoid attaching multiple times
                if (!btnAdd.dataset.tgtHandlerAttached) {
                    btnAdd.addEventListener('click', function (e) {
                        e.preventDefault();
                        handleAddToOrder();
                    });
                    btnAdd.dataset.tgtHandlerAttached = '1';
                }
            } else {
                // no button found - that's OK; consumer can listen to events instead
                // console.debug('TGTCustomize: .btn-add not found; use tgt:customization:done event');
            }
        } catch (e) { console.error('attach btn-add', e); }

        // Persist selection helper
        function saveSelectionToSession() {
            try {
                const items = collectSelected(container);
                localStorage.setItem('tgt_selected_menus', JSON.stringify(items));
                const ev = new CustomEvent('tgt:customization:changed', { detail: { items } });
                window.dispatchEvent(ev);
                if (options && typeof options.onChange === 'function') options.onChange(items);
                return items;
            } catch (e) { console.error('save selection', e); return []; }
        }

        function loadSelectionFromSession() {
            try {
                const raw = localStorage.getItem('tgt_selected_menus');
                if (!raw) return [];
                return JSON.parse(raw);
            } catch (e) { return []; }
        }

        function applyLoadedSelection() {
            const sel = loadSelectionFromSession();
            if (!sel || !sel.length) return;
            const map = {};
            sel.forEach(it => { if (it && it.id) map[String(it.id)] = it; });
            cardMap.forEach(c => {
                const id = c.card.dataset.id;
                const m = map[String(id)];
                if (m) {
                    c.checkbox.checked = true;
                    c.qtyEl.value = m.qty || m.quantity || 1;
                    const qwrap = c.card.querySelector('.qty-wrap'); if (qwrap) qwrap.style.display = 'flex';
                }
            });
        }

        function attachPersistenceListeners() {
            cardMap.forEach(c => {
                c.checkbox.addEventListener('change', ()=>saveSelectionToSession());
                c.qtyEl.addEventListener('change', ()=>saveSelectionToSession());
            });
        }

        // Submit order when checkout reaches step 4 (payment)
        async function submitOrderIfStep4(detail) {
            try {
                const step = detail && detail.step ? Number(detail.step) : null;
                if (step !== 4) return;
                const items = loadSelectionFromSession();
                if (!items || !items.length) {
                    const msg = 'Aucun article sélectionné pour la commande';
                    if (window.ToastSystem && typeof ToastSystem.show === 'function') ToastSystem.show(msg, 'warning'); else alert(msg);
                    return;
                }

                const payload = {
                    items: items.map(i => ({ id: i.id, name: i.name, quantity: i.qty || i.quantity || 1, price: i.unit_price || i.price || 0 })),
                    delivery_address: localStorage.getItem('tgt_delivery_address') || '',
                    payment_method: localStorage.getItem('tgt_payment_method') || 'cash',
                    delivery_time: localStorage.getItem('tgt_delivery_time') || 30
                };

                const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
                const url = (window.API_BASE_URL || 'backend/api') + '/orders/create.php';
                const r = await fetch(url, {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'Authorization': 'Bearer ' + token } : {}),
                    body: JSON.stringify(payload)
                });
                const j = await r.json();
                if (r.ok && j && j.success) {
                    try { localStorage.removeItem('tgt_selected_menus'); } catch(e){}
                    const successMsg = j.message || 'Commande créée avec succès';
                    if (window.ToastSystem && typeof ToastSystem.show === 'function') ToastSystem.show(successMsg, 'success'); else alert(successMsg);
                    const ev = new CustomEvent('tgt:order:created', { detail: { order: j.order || j } });
                    window.dispatchEvent(ev);
                } else {
                    const err = (j && j.message) ? j.message : 'Erreur lors de la création de la commande';
                    if (window.ToastSystem && typeof ToastSystem.show === 'function') ToastSystem.show(err, 'error'); else alert(err);
                    const ev = new CustomEvent('tgt:order:create_failed', { detail: { response: j } });
                    window.dispatchEvent(ev);
                }
            } catch (e) { console.error('submit order', e); if (window.ToastSystem && typeof ToastSystem.show === 'function') ToastSystem.show('Erreur réseau', 'error'); else alert('Erreur réseau'); }
        }

        // Apply persisted selection if present and attach listeners
        applyLoadedSelection();
        attachPersistenceListeners();
        // listen for checkout step events from the wizard
        window.addEventListener('tgt:checkout:step', function(e){ submitOrderIfStep4(e.detail || {}); });

        // Tab switching
        topControls.querySelectorAll('.cust-tab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                topControls.querySelectorAll('.cust-tab').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                const src = btn.dataset.source === 'today' ? 'today' : 'all';
                grid.innerHTML = '<div class="cust-loading">Chargement...</div>';
                const newMenu = await fetchMenu(src === 'today' ? 'today' : 'all');
                // rebuild grid
                grid.innerHTML = '';
                const items = Array.isArray(newMenu) ? newMenu : Object.values(newMenu||{});
                cardMap.length = 0;
                items.forEach(item => {
                    const cardResult = createCard(item);
                    if (cardResult) {
                        const {card, checkbox, qtyEl} = cardResult;
                        grid.appendChild(card);
                        cardMap.push({card, item, checkbox, qtyEl});
                    }
                });
                // re-apply persisted selection and listeners after tab switch
                applyLoadedSelection();
                attachPersistenceListeners();
            });
        });

        btnClear.addEventListener('click', ()=>{
            cardMap.forEach(c => { c.checkbox.checked = false; c.qtyEl.value = 1; c.card.querySelector('.qty-wrap').style.display='none'; });
            try { localStorage.removeItem('tgt_selected_menus'); } catch(e){}
            const ev = new CustomEvent('tgt:customization:changed', { detail: { items: [] } }); window.dispatchEvent(ev);
        });

        // Note: 'Ajouter' button removed; external flows should listen to
        // `tgt:customization:changed` or `tgt:checkout:step` events to proceed.

        return { container, grid, controlsWrap, cardMap };
    }

    // Export
    window.TGTCustomize = {
        render
    };

})();
