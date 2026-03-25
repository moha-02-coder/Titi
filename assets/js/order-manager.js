/**
 * Titi Golden Taste - Order Manager (unified)
 */
(function () {
    'use strict';

    const FALLBACK_MENU = [
        { id: 1, name: 'Thieboudienne', description: 'Riz au poisson sauce maison.', price: 3500 },
        { id: 2, name: 'Mafe Poulet', description: 'Sauce arachide avec poulet tendre.', price: 3000 },
        { id: 3, name: 'Yassa Poulet', description: 'Poulet marine au citron et oignons.', price: 2800 },
        { id: 4, name: 'Bouillon de Poisson', description: 'Soupe de poisson epicee.', price: 2500 },
        { id: 5, name: 'Salade Tropicale', description: 'Melange frais de fruits et legumes.', price: 1800 },
        { id: 6, name: 'Tiakri', description: 'Dessert au mil et yaourt.', price: 1200 }
    ];

    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const toInt = (v) => {
        if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
        const d = String(v ?? '').replace(/[^\d-]/g, '');
        return d ? parseInt(d, 10) : 0;
    };
    const fmt = (v) => {
        const n = toInt(v);
        try { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; } catch (_) { return n + ' FCFA'; }
    };
    const esc = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    const firstImage = (raw) => {
        if (Array.isArray(raw)) {
            const first = raw.find((x) => String(x || '').trim() !== '');
            return first ? String(first).trim() : '';
        }
        if (raw && typeof raw === 'object') {
            const candidate = raw.url || raw.image_url || raw.path || raw.src || '';
            return String(candidate || '').trim();
        }
        const s = String(raw || '').trim();
        if (!s) return '';
        if (s.startsWith('[') && s.endsWith(']')) {
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed) && parsed.length) {
                    const first = parsed.find((x) => String(x || '').trim() !== '');
                    return first ? String(first).trim() : '';
                }
            } catch (_) {}
        }
        return s;
    };

    class OrderManager {
        constructor() {
            this.currentStep = 1;
            this.totalSteps = 5;
            this.menu = [];
            this.optionMeta = {};
            this.orderData = {
                items: [],
                customizations: {},
                delivery: null,
                payment: null,
                contact: {},
                total: 0
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init(), { once: true });
            } else {
                this.init();
            }
        }

        init() {
            this.steps = $$('.wizard-step');
            if (!this.steps.length) return;

            this.menuGrid = $('#menuSelectionGrid');
            this.selectedList = $('#selectedItemsList');
            this.step2 = $('#wizardStep2');
            this.step3 = $('#wizardStep3');
            this.step4 = $('#wizardStep4');
            this.placeOrderBtn = $('#placeOrderBtn');
            this.basePriceEl = $('#basePrice');
            this.supplementPriceEl = $('#supplementPrice');
            this.totalCustomPriceEl = $('#totalCustomPrice');
            this.summaryItemsEl = $('#orderSummaryItems');
            this.summaryTotalsEl = $('#orderTotals');
            this.summaryDeliveryEl = $('#deliveryInfoSummary');
            this.acceptTerms = $('#acceptTerms');

            this.bindGlobals();
            this.bindCustomizations();
            this.bindDelivery();
            this.bindPayments();
            this.bindFormRefresh();
            this.bindPlaceOrder();
            this.restoreSelectedMenus();
            this.syncSelectedMenusToCart();
            this.applyDefaultsFromDom();
            this.loadMenu();
            this.goToStep(1, true);
        }

        bindGlobals() {
            window.nextStep = (s) => this.nextStep(s);
            window.prevStep = (s) => this.prevStep(s);
            window.startNewOrder = () => this.reset();
        }

        notify(msg, type) {
            if (!msg) return;
            if (typeof window.showNotification === 'function') window.showNotification(msg, type || 'info');
        }

        refreshCart() {
            try {
                if (typeof window.renderCart === 'function') window.renderCart();
                if (typeof window.updateCartCountLocal === 'function') window.updateCartCountLocal();
            } catch (_) {}
        }

        restoreSelectedMenus() {
            try {
                const raw = localStorage.getItem('tgt_selected_menus');
                if (!raw) return;
                const arr = JSON.parse(raw);
                if (!Array.isArray(arr)) return;
                const unique = new Set();
                this.orderData.items = arr
                    .filter((x) => x && (x.id ?? x.product_id ?? x.item_id))
                    .map((x) => ({
                        id: x.id ?? x.product_id ?? x.item_id,
                        name: x.name || x.item_name || 'Article',
                        description: x.description || '',
                        price: toInt(x.price ?? x.unit_price),
                        quantity: Math.max(1, toInt(x.quantity ?? x.qty ?? 1)),
                        type: String(x.type || 'menu'),
                        image_url: firstImage(x.image_url || x.image || x.images || '')
                    }))
                    .filter((x) => {
                        const id = String(x.id);
                        if (unique.has(id)) return false;
                        unique.add(id);
                        return true;
                    });
            } catch (_) {}
        }

        async loadMenu() {
            const base = (window.API_BASE_URL || 'backend/api').replace(/\/+$/, '');
            const url = base + '/menu/all.php';
            try {
                const res = await fetch(url);
                const txt = await res.text();
                let json = null;
                try { json = txt ? JSON.parse(txt) : null; } catch (_) { json = null; }
                let items = [];
                if (json && json.success && Array.isArray(json.data)) items = json.data;
                else if (Array.isArray(json)) items = json;
                if (!items.length) items = FALLBACK_MENU;
                this.menu = items.map((x, i) => ({
                    id: x.id ?? x.menu_id ?? x.product_id ?? (i + 1),
                    name: x.name || x.title || 'Plat',
                    description: x.description || '',
                    price: toInt(x.price ?? x.unit_price),
                    image_url: firstImage(x.image_url || x.image || x.images || '')
                }));
            } catch (e) {
                console.warn('Order menu fallback:', e);
                this.menu = FALLBACK_MENU.slice();
            }
            this.renderMenu();
            this.refresh();
        }

        renderMenu() {
            if (!this.menuGrid) return;
            const selected = new Set(this.orderData.items.map((x) => String(x.id)));
            this.menuGrid.innerHTML = this.menu.map((item) => {
                const isSelected = selected.has(String(item.id));
                return `
                    <article class="menu-card ${isSelected ? 'selected' : ''}" data-menu-id="${esc(item.id)}">
                        <div class="menu-card-header">
                            <div>
                                <h4 class="menu-card-title">${esc(item.name)}</h4>
                                <p class="menu-card-description">${esc(item.description || 'Plat maison')}</p>
                            </div>
                            <span class="menu-card-price">${fmt(item.price)}</span>
                        </div>
                        <button type="button" class="menu-card-select">${isSelected ? 'Selectionne' : 'Selectionner'}</button>
                    </article>
                `;
            }).join('');

            $$('.menu-card', this.menuGrid).forEach((card) => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.menu-card-select')) e.preventDefault();
                    this.toggleItem(card.dataset.menuId);
                });
            });
        }

        toggleItem(id) {
            const key = String(id || '');
            if (!key) return;
            const idx = this.orderData.items.findIndex((x) => String(x.id) === key);
            if (idx >= 0) {
                this.orderData.items.splice(idx, 1);
            } else {
                const m = this.menu.find((x) => String(x.id) === key);
                if (!m) return;
                this.orderData.items.push({
                    id: m.id,
                    name: m.name,
                    description: m.description || '',
                    price: toInt(m.price),
                    quantity: 1,
                    type: 'menu',
                    image_url: firstImage(m.image_url || '')
                });
            }
            this.persistSelectedMenus();
            this.syncSelectedMenusToCart();
            this.renderMenu();
            this.refresh();
        }

        persistSelectedMenus() {
            try {
                localStorage.setItem('tgt_selected_menus', JSON.stringify(this.orderData.items.map((x) => ({
                    id: x.id,
                    name: x.name || 'Article',
                    description: x.description || '',
                    price: toInt(x.price),
                    quantity: Math.max(1, toInt(x.quantity || 1)),
                    type: 'menu',
                    image_url: firstImage(x.image_url || '')
                }))));
            } catch (_) {}
        }

        syncSelectedMenusToCart() {
            try {
                const raw = JSON.parse(localStorage.getItem('cart') || '[]');
                const current = Array.isArray(raw) ? raw : [];
                const withoutOrderMenus = current.filter((it) => String(it?.source || '') !== 'order');
                const selectedMenus = this.orderData.items.map((x) => ({
                    id: x.id,
                    name: x.name || 'Article',
                    description: x.description || '',
                    price: toInt(x.price),
                    quantity: Math.max(1, toInt(x.quantity || 1)),
                    type: 'menu',
                    source: 'order',
                    image_url: firstImage(x.image_url || '')
                }));
                localStorage.setItem('cart', JSON.stringify([...withoutOrderMenus, ...selectedMenus]));
            } catch (_) {}
        }

        bindCustomizations() {
            if (!this.step2) return;
            this.step2.addEventListener('change', (e) => {
                const input = e.target.closest('.custom-option input');
                if (!input) return;
                this.applyOption(input);
                this.syncCustomLabels();
                this.refresh();
            });
        }

        applyDefaultsFromDom() {
            if (this.step2) {
                $$('.custom-option input:checked', this.step2).forEach((input) => this.applyOption(input));
                this.syncCustomLabels();
            }
            if (this.step3) {
                const selectedDelivery = $('.delivery-option.selected[data-type]', this.step3) || $('.delivery-option[data-type]', this.step3);
                if (selectedDelivery) this.selectDelivery(selectedDelivery, false);
                const selectedTime = $('.time-option.selected', this.step3) || $('.time-option', this.step3);
                if (selectedTime) this.selectTime(selectedTime, false);
            }
            if (this.step4) {
                const selectedPayment = $('.payment-method.selected', this.step4) || $('.payment-method', this.step4);
                if (selectedPayment) this.selectPayment(selectedPayment, false);
            }
            this.updateDeliveryFromDom();
            this.updateContactFromDom();
        }

        applyOption(input) {
            const group = String(input.name || 'option');
            const key = group + ':' + String(input.value || 'value');
            const price = toInt(input.dataset.price);
            const label = (input.closest('.custom-option')?.querySelector('.option-name')?.textContent || input.value || 'Option').trim();

            if (input.type === 'radio' && input.checked) {
                Object.keys(this.orderData.customizations).forEach((k) => {
                    if (k.startsWith(group + ':')) {
                        delete this.orderData.customizations[k];
                        delete this.optionMeta[k];
                    }
                });
            }

            if (input.checked) {
                this.orderData.customizations[key] = price;
                this.optionMeta[key] = { label, price };
            } else {
                delete this.orderData.customizations[key];
                delete this.optionMeta[key];
            }
        }

        syncCustomLabels() {
            if (!this.step2) return;
            $$('.custom-option', this.step2).forEach((label) => {
                const input = $('input', label);
                label.classList.toggle('selected', !!(input && input.checked));
            });
        }

        bindDelivery() {
            if (!this.step3) return;
            this.deliveryOptions = $$('.delivery-option[data-type]', this.step3);
            this.deliveryOptions.forEach((o) => o.addEventListener('click', () => this.selectDelivery(o, true)));
            this.timeOptions = $$('.time-option', this.step3);
            this.timeOptions.forEach((o) => o.addEventListener('click', () => this.selectTime(o, true)));
        }

        parseDeliveryPrice(option) {
            const txt = String(option?.textContent || '').replace(/\s+/g, ' ');
            if (/gratuit/i.test(txt)) return 0;
            const m = txt.match(/(\d[\d\s]*)\s*FCFA/i);
            return m ? toInt(m[1]) : 0;
        }

        selectDelivery(option, refresh) {
            if (!option) return;
            this.deliveryOptions.forEach((o) => o.classList.remove('selected'));
            option.classList.add('selected');
            const type = option.dataset.type || 'delivery';
            const label = (option.querySelector('h4')?.textContent || type).trim();
            const price = this.parseDeliveryPrice(option);
            this.orderData.delivery = Object.assign({}, this.orderData.delivery || {}, { type, label, price });

            if ($('#deliveryAddressSection')) $('#deliveryAddressSection').style.display = type === 'pickup' ? 'none' : '';
            if ($('#pickupInfoSection')) $('#pickupInfoSection').style.display = type === 'pickup' ? '' : 'none';

            this.updateDeliveryFromDom();
            if (refresh !== false) this.refresh();
        }

        selectTime(option, refresh) {
            if (!option) return;
            this.timeOptions.forEach((o) => o.classList.remove('selected'));
            option.classList.add('selected');
            const mode = option.dataset.time || 'asap';
            if (!this.orderData.delivery) this.orderData.delivery = { type: 'delivery', label: 'Livraison', price: 0 };
            this.orderData.delivery.time_mode = mode;
            const sched = $('#scheduleTime');
            if (sched) sched.style.display = mode === 'later' ? '' : 'none';
            this.updateDeliveryFromDom();
            if (refresh !== false) this.refresh();
        }

        updateDeliveryFromDom() {
            if (!this.orderData.delivery) return;
            this.orderData.delivery.address = {
                street: $('#deliveryStreet')?.value?.trim() || '',
                city: $('#deliveryCity')?.value?.trim() || 'Bamako',
                quarter: $('#deliveryQuarter')?.value?.trim() || ''
            };
            this.orderData.delivery.notes = $('#deliveryNotes')?.value?.trim() || '';
            this.orderData.delivery.schedule = {
                date: $('#scheduleDate')?.value || '',
                hour: $('#scheduleHour')?.value || ''
            };
        }

        bindPayments() {
            if (!this.step4) return;
            this.paymentMethods = $$('.payment-method', this.step4);
            this.paymentMethods.forEach((m) => m.addEventListener('click', () => this.selectPayment(m, true)));
        }

        selectPayment(methodEl, refresh) {
            if (!methodEl) return;
            this.paymentMethods.forEach((m) => m.classList.remove('selected'));
            methodEl.classList.add('selected');
            const type = methodEl.dataset.method || 'cash';
            const label = (methodEl.querySelector('h5')?.textContent || type).trim();
            this.orderData.payment = { type, label };
            if (refresh !== false) this.refresh();
        }

        bindFormRefresh() {
            ['deliveryStreet', 'deliveryCity', 'deliveryQuarter', 'deliveryNotes', 'scheduleDate', 'scheduleHour', 'guestFirstName', 'guestLastName', 'guestPhone', 'guestEmail', 'acceptTerms']
                .forEach((id) => {
                    const el = $('#' + id);
                    if (!el) return;
                    const eventName = (el.type === 'checkbox') ? 'change' : 'input';
                    el.addEventListener(eventName, () => {
                        this.updateDeliveryFromDom();
                        this.updateContactFromDom();
                        this.updateSummary();
                    });
                });

            if (this.selectedList) {
                this.selectedList.addEventListener('click', (e) => {
                    const btn = e.target.closest('.remove-selected-item');
                    if (!btn) return;
                    e.preventDefault();
                    this.toggleItem(btn.dataset.itemId);
                });
            }
        }

        bindPlaceOrder() {
            if (!this.placeOrderBtn) return;
            this.placeOrderBtn.addEventListener('click', () => this.submit());
        }

        updateContactFromDom() {
            this.orderData.contact = {
                firstName: $('#guestFirstName')?.value?.trim() || '',
                lastName: $('#guestLastName')?.value?.trim() || '',
                phone: $('#guestPhone')?.value?.trim() || '',
                email: $('#guestEmail')?.value?.trim() || ''
            };
        }

        totals() {
            const subtotal = this.orderData.items.reduce((s, x) => s + toInt(x.price) * Math.max(1, toInt(x.quantity || 1)), 0);
            const custom = Object.values(this.orderData.customizations).reduce((s, x) => s + toInt(x), 0);
            const delivery = toInt(this.orderData.delivery?.price || 0);
            const total = subtotal + custom + delivery;
            this.orderData.total = total;
            return { subtotal, custom, delivery, total };
        }

        updateSelectedList() {
            if (!this.selectedList) return;
            if (!this.orderData.items.length) {
                this.selectedList.innerHTML = '<p style="text-align:center;color:#666;">Aucun plat selectionne</p>';
                return;
            }
            this.selectedList.innerHTML = `
                <h4 style="margin-bottom:12px;color:var(--black)"><i class="fas fa-shopping-cart"></i> Plats selectionnes (${this.orderData.items.length})</h4>
                <div class="selected-items-grid">
                    ${this.orderData.items.map((x) => `
                        <div class="selected-item-card">
                            <div class="selected-item-info">
                                <strong>${esc(x.name)}</strong>
                                <span>${fmt(x.price)}</span>
                            </div>
                            <button type="button" class="remove-selected-item" data-item-id="${esc(x.id)}"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        updateCustomSummary() {
            const t = this.totals();
            if (this.basePriceEl) this.basePriceEl.textContent = fmt(t.subtotal);
            if (this.supplementPriceEl) this.supplementPriceEl.textContent = fmt(t.custom);
            if (this.totalCustomPriceEl) this.totalCustomPriceEl.textContent = fmt(t.subtotal + t.custom);
        }

        updateSummary() {
            const t = this.totals();
            this.updateCustomSummary();

            if (this.summaryItemsEl) {
                const itemRows = this.orderData.items.map((x) => `
                    <div class="recap-row">
                        <div class="recap-main"><div class="recap-title">${esc(x.name)}</div><div class="recap-sub">x${Math.max(1, toInt(x.quantity || 1))}</div></div>
                        <div class="recap-amount">${fmt(toInt(x.price) * Math.max(1, toInt(x.quantity || 1)))}</div>
                    </div>
                `).join('');

                const optRows = Object.keys(this.orderData.customizations).map((k) => {
                    const meta = this.optionMeta[k] || { label: k, price: this.orderData.customizations[k] };
                    return `<div class="recap-row"><div class="recap-main"><div class="recap-title">${esc(meta.label)}</div><div class="recap-sub">Option</div></div><div class="recap-amount">${fmt(meta.price)}</div></div>`;
                }).join('');

                this.summaryItemsEl.innerHTML = `<div class="recap-card">${itemRows || '<div class="recap-row"><div class="recap-main"><div class="recap-title">Aucun article</div></div><div class="recap-amount">0 FCFA</div></div>'}${optRows}</div>`;
            }

            if (this.summaryTotalsEl) {
                this.summaryTotalsEl.innerHTML = `
                    <div class="totals-card">
                        <div class="totals-row"><span>Sous-total</span><strong>${fmt(t.subtotal)}</strong></div>
                        <div class="totals-row"><span>Options</span><strong>${fmt(t.custom)}</strong></div>
                        <div class="totals-row"><span>Livraison</span><strong>${fmt(t.delivery)}</strong></div>
                        <div class="totals-row totals-row-total"><span>Total</span><strong>${fmt(t.total)}</strong></div>
                    </div>
                `;
            }

            if (this.summaryDeliveryEl) {
                const d = this.orderData.delivery || {};
                const mode = d.label || (d.type === 'pickup' ? 'Retrait sur place' : 'Livraison a domicile');
                const addr = d.address?.street ? `${d.address.street}, ${d.address.quarter || ''} ${d.address.city || ''}`.trim() : 'Adresse non renseignee';
                const when = d.time_mode === 'later' ? `Planifie: ${(d.schedule?.date || '-')} ${(d.schedule?.hour || '')}`.trim() : 'Des que possible';
                const pay = this.orderData.payment?.label || 'Non choisi';
                this.summaryDeliveryEl.innerHTML = `
                    <div class="recap-info">
                        <div class="info-line"><span class="info-label">Mode</span><span class="info-value">${esc(mode)}</span></div>
                        <div class="info-line"><span class="info-label">Adresse</span><span class="info-value">${esc(addr)}</span></div>
                        <div class="info-line"><span class="info-label">Horaire</span><span class="info-value">${esc(when)}</span></div>
                        <div class="info-line"><span class="info-label">Paiement</span><span class="info-value">${esc(pay)}</span></div>
                    </div>
                `;
            }
        }

        validate(step, show) {
            let ok = true;
            let msg = '';
            if (step === 1) {
                ok = this.orderData.items.length > 0;
                if (!ok) msg = 'Veuillez selectionner au moins un plat.';
            }
            if (step === 3) {
                ok = !!this.orderData.delivery;
                if (ok && this.orderData.delivery.type !== 'pickup') {
                    const a = this.orderData.delivery.address || {};
                    ok = !!(a.street && a.city && a.quarter);
                    if (!ok) msg = 'Veuillez renseigner une adresse complete.';
                } else if (!ok) msg = 'Veuillez choisir un mode de livraison.';
            }
            if (step === 4) {
                ok = !!this.orderData.payment;
                if (ok && this.acceptTerms) ok = !!this.acceptTerms.checked;
                if (!ok) msg = 'Choisissez un paiement et acceptez les conditions.';
            }
            if (!ok && show) this.notify(msg, 'warning');
            return ok;
        }

        nextStep(target) {
            const dst = Math.max(1, Math.min(this.totalSteps, toInt(target) || (this.currentStep + 1)));
            if (dst > this.currentStep && !this.validate(this.currentStep, true)) return;
            this.goToStep(dst);
        }

        prevStep(target) {
            const dst = Math.max(1, Math.min(this.totalSteps, toInt(target) || (this.currentStep - 1)));
            this.goToStep(dst, true);
        }

        goToStep(step, force) {
            const s = Math.max(1, Math.min(this.totalSteps, toInt(step) || 1));
            this.currentStep = s;
            this.steps.forEach((x, i) => x.classList.toggle('active', i + 1 === s));
            $$('.order-steps .step').forEach((el, i) => {
                const n = i + 1;
                el.classList.toggle('active', n === s || (s === 5 && n === 4));
                el.classList.toggle('completed', n < s);
            });
            if (s >= 4) this.updateSummary();
            if (s === 5) this.fillConfirmation();
            if (!force) {
                try { $('#order')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
            }
        }

        async submit() {
            this.updateDeliveryFromDom();
            this.updateContactFromDom();
            this.updateSummary();
            if (!this.validate(4, true)) return;

            if (this.placeOrderBtn) {
                this.placeOrderBtn.disabled = true;
                this.placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';
            }

            let orderId = '#' + String(Math.floor(1000 + Math.random() * 9000));
            let failed = false;

            try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    const res = await fetch('backend/api/orders/create.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                        body: JSON.stringify(this.orderData)
                    });
                    const data = await res.json().catch(() => null);
                    if (res.ok && data && data.success) {
                        const rawId = data.order_id || data.data?.order_id || data.data?.id;
                        if (rawId !== undefined && rawId !== null && rawId !== '') orderId = '#' + String(rawId);
                    } else {
                        failed = true;
                    }
                }
            } catch (_) {
                failed = true;
            } finally {
                if (this.placeOrderBtn) {
                    this.placeOrderBtn.disabled = false;
                    this.placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Confirmer la commande';
                }
            }

            this.lastConfirmation = {
                id: orderId,
                total: fmt(this.orderData.total),
                eta: this.orderData.delivery?.type === 'pickup' ? '15-25 minutes' : '30-45 minutes'
            };

            if (failed) this.notify('Commande enregistree localement. Verification serveur indisponible.', 'warning');
            else this.notify('Commande confirmee avec succes.', 'success');

            this.goToStep(5, true);
            this.refreshCart();
        }

        fillConfirmation() {
            const c = this.lastConfirmation || { id: '#0000', total: fmt(this.orderData.total), eta: '30-45 minutes' };
            if ($('#confirmationOrderId')) $('#confirmationOrderId').textContent = c.id;
            if ($('#confirmationTotal')) $('#confirmationTotal').textContent = c.total;
            if ($('#confirmationTime')) $('#confirmationTime').textContent = c.eta;
        }

        refresh() {
            this.updateSelectedList();
            this.updateSummary();
            this.refreshCart();
        }

        reset() {
            this.orderData = { items: [], customizations: {}, delivery: null, payment: null, contact: {}, total: 0 };
            this.optionMeta = {};
            this.lastConfirmation = null;
            try {
                localStorage.removeItem('tgt_selected_menus');
                localStorage.removeItem('tgt_order_autostep');
            } catch (_) {}
            this.syncSelectedMenusToCart();

            if (this.step2) {
                $$('.custom-option input', this.step2).forEach((i) => {
                    if (i.type === 'checkbox') i.checked = false;
                });
            }

            this.applyDefaultsFromDom();
            this.renderMenu();
            this.refresh();
            this.goToStep(1, true);
        }
    }

    window.OrderManager = OrderManager;
    window.orderManager = new OrderManager();
})();
