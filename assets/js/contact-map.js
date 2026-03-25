// Contact map helpers
let contactMap;
let mapInitialized = false;

function createContactMarkerIcon() {
    return L.divIcon({
        className: 'tgt-map-marker',
        iconSize: [54, 54],
        iconAnchor: [27, 27],
        popupAnchor: [0, -22],
        html: '<div class="tgt-map-marker-pin"><i class="fas fa-location-dot"></i></div>'
    });
}

function createContactPopupMarkup() {
    return '' +
        '<div class="tgt-map-popup">' +
            '<div class="tgt-map-popup-title">Titi Golden Taste</div>' +
            '<div class="tgt-map-popup-line">Avenue de l\'Indépendance</div>' +
            '<div class="tgt-map-popup-line">Badalabougou, Bamako</div>' +
            '<div class="tgt-map-popup-line">+223 20 21 22 23</div>' +
            '<a class="tgt-map-popup-action" href="https://www.google.com/maps/dir/?api=1&destination=12.6392,-8.0029" target="_blank" rel="noopener">Itinéraire</a>' +
        '</div>';
}

function initContactMap() {
    const target = document.getElementById('contactMap');
    if (!target || typeof L === 'undefined') return;

    const restaurantLocation = { lat: 12.6392, lng: -8.0029 };

    if (contactMap) {
        try { contactMap.invalidateSize(); } catch (e) {}
        return contactMap;
    }

    contactMap = L.map(target, {
        zoomControl: false,
        scrollWheelZoom: false
    }).setView([restaurantLocation.lat, restaurantLocation.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(contactMap);

    L.circle([restaurantLocation.lat, restaurantLocation.lng], {
        radius: 150,
        color: '#d4af37',
        weight: 1.5,
        fillColor: '#d4af37',
        fillOpacity: 0.08
    }).addTo(contactMap);

    L.marker([restaurantLocation.lat, restaurantLocation.lng], {
        icon: createContactMarkerIcon()
    }).addTo(contactMap).bindPopup(createContactPopupMarkup());

    mapInitialized = true;
    setTimeout(() => {
        try { contactMap.invalidateSize(); } catch (e) {}
    }, 250);

    return contactMap;
}

function zoomInMap() {
    if (contactMap) contactMap.zoomIn();
}

function zoomOutMap() {
    if (contactMap) contactMap.zoomOut();
}

function resetMap() {
    if (!contactMap) return;
    const restaurantLocation = { lat: 12.6392, lng: -8.0029 };
    contactMap.setView([restaurantLocation.lat, restaurantLocation.lng], 15);
}

function getDirections() {
    const restaurantLocation = { lat: 12.6392, lng: -8.0029 };
    const url = 'https://www.google.com/maps/dir/?api=1&destination=' + restaurantLocation.lat + ',' + restaurantLocation.lng;
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof L === 'undefined') {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);

        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = function() {
            initContactMap();
            if (typeof window.initMap === 'function') {
                try { window.initMap(); } catch (e) {}
            }
        };
        document.head.appendChild(leafletJS);
    } else {
        initContactMap();
        if (typeof window.initMap === 'function') {
            try { window.initMap(); } catch (e) {}
        }
    }
});

function handleContactForm(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        timestamp: new Date().toISOString()
    };

    if (!data.name || !data.email || !data.subject || !data.message) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

    setTimeout(() => {
        showNotification('Message envoyé avec succès. Nous vous répondrons rapidement.', 'success');
        e.target.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer le message';
        console.log('Message de contact:', data);
    }, 2000);
}

function resetContactForm() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.reset();
        showNotification('Formulaire réinitialisé', 'info');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', handleContactForm);
    }
});

function showNotification(message, type) {
    const variant = type || 'info';
    const notification = document.createElement('div');
    notification.className = 'contact-notification contact-notification-' + variant;
    notification.innerHTML =
        '<i class="fas ' +
        (variant === 'success' ? 'fa-check-circle' : variant === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle') +
        '"></i><span>' + message + '</span>';

    const background = variant === 'success' ? '#28a745' : variant === 'error' ? '#dc3545' : '#17a2b8';
    notification.style.cssText = [
        'position:fixed',
        'top:20px',
        'right:20px',
        'background:' + background,
        'color:white',
        'padding:16px 20px',
        'border-radius:12px',
        'box-shadow:0 10px 30px rgba(0,0,0,0.18)',
        'z-index:10000',
        'display:flex',
        'align-items:center',
        'gap:10px',
        'font-weight:600',
        'animation:slideInRight 0.3s ease',
        'max-width:360px'
    ].join(';');

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

const contactMapAnimations = document.createElement('style');
contactMapAnimations.textContent =
    '@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }' +
    '@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
document.head.appendChild(contactMapAnimations);
