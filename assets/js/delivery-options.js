/**
 * Gestion des modes de livraison et mise à jour des totaux
 */

// Fonction pour définir le mode de livraison
function setDeliveryMode(mode) {
    const validModes = ['standard', 'express', 'pickup'];
    if (validModes.includes(mode)) {
        localStorage.setItem('delivery_mode', mode);
        updateDeliveryDisplay();
        updateCartTotals();
    }
}

// Fonction pour obtenir le mode de livraison actuel
function getDeliveryMode() {
    return localStorage.getItem('delivery_mode') || 'standard';
}

// Mettre à jour l'affichage des informations de livraison
function updateDeliveryDisplay() {
    const mode = getDeliveryMode();
    const deliveryInfoEl = document.getElementById('deliveryInfo');
    const deliveryOptions = document.querySelectorAll('.delivery-option');
    
    // Mettre à jour les options sélectionnées
    deliveryOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.mode === mode) {
            option.classList.add('selected');
        }
    });
    
    // Mettre à jour le texte d'information
    if (deliveryInfoEl) {
        const deliveryTexts = {
            'standard': 'Livraison standard (30-45 min) - 1000 FCFA',
            'express': 'Livraison express (15-25 min) - 2000 FCFA',
            'pickup': 'Retrait sur place (15-25 min) - Gratuit'
        };
        deliveryInfoEl.textContent = deliveryTexts[mode] || deliveryTexts['standard'];
    }
}

// Mettre à jour uniquement les totaux du panier
function updateCartTotals() {
    const cart = readCart();
    const totals = computeTotals(cart);
    
    const subtotalEl = document.getElementById('cartSubtotal');
    const deliveryEl = document.getElementById('cartDelivery');
    const totalEl = document.getElementById('cartTotal');
    
    if (subtotalEl) subtotalEl.textContent = formatMoney(totals.subtotal);
    if (deliveryEl) deliveryEl.textContent = formatMoney(totals.delivery);
    if (totalEl) totalEl.textContent = formatMoney(totals.total);
}

// Initialiser les gestionnaires d'événements pour les modes de livraison
function initDeliveryOptions() {
    const deliveryOptions = document.querySelectorAll('.delivery-option');
    
    deliveryOptions.forEach(option => {
        option.addEventListener('click', function() {
            const mode = this.dataset.mode;
            setDeliveryMode(mode);
        });
    });
}

// Ajouter les styles pour les options de livraison
function addDeliveryStyles() {
    if (document.querySelector('#delivery-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'delivery-styles';
    style.textContent = `
        .delivery-option {
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 35px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
        }
        
        .delivery-option:hover {
            border-color: #d4af37;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.1);
        }
        
        .delivery-option.selected {
            border-color: #d4af37;
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(212, 175, 55, 0.1));
        }
        
        .delivery-option.selected::before {
            content: '✓';
            position: absolute;
            top: 10px;
            right: 10px;
            background: #d4af37;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        .delivery-option {
            position: relative;
        }
        
        .option-header h4 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
        }
        
        .option-details {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        
        .option-details span {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .delivery-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #d4af37;
        }
        
        @media (max-width: 768px) {
            .delivery-option {
                padding: 15px;
            }
            
            .option-details {
                flex-direction: column;
                gap: 8px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialiser quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    addDeliveryStyles();
    initDeliveryOptions();
    updateDeliveryDisplay();
    updateCartTotals();
});

// Exposer les fonctions globalement
window.setDeliveryMode = setDeliveryMode;
window.getDeliveryMode = getDeliveryMode;
window.updateCartTotals = updateCartTotals;
