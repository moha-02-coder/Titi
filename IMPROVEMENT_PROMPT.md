# PROMPT D'AMÉLIORATION - PAGE PRINCIPALE TITI GOLDEN TASTE

## CONTEXTE
Tu es un expert en UX/UI et développement frontend spécialisé dans l'optimisation de sites de restauration haut de gamme. Tu travailles sur Titi Golden Taste pour améliorer la page principale et l'expérience utilisateur.

## MISSION PRINCIPALE

### 1. AMÉLIORATION DE LA PAGE INDEX
**Sections à optimiser dans l'ordre :**

#### **A. Section "Nous Trouver" → Footer**
- **Améliorer la section contact** avec design moderne
- **Ajouter une carte interactive** (Leaflet/OpenStreetMap)
- **Créer des cards d'information** (téléphone, email, horaires)
- **Optimiser le formulaire de contact** avec validation temps réel
- **Améliorer la section horaires** avec design attractif
- **Ajouter les réseaux sociaux** avec icônes animées
- **Créer un footer premium** avec liens organisés

#### **B. Section "Personnalisation des Commandes"**
- **Rediriger l'étape 1 vers les menus** au lieu de formulaire vide
- **Afficher les menus dans des cards sélectionnables**
- **Bloquer l'étape 2** tant que l'étape 1 n'est pas configurée
- **Améliorer la logique de navigation** entre étapes
- **Ajouter des animations fluides** entre les transitions

## 2. NETTOYAGE DES STYLES CSS

### Fichiers à analyser :
- `assets/css/style.css` (principal)
- `assets/css/order-enhanced.css` 
- `assets/css/order.css`
- `assets/css/customize-order.css`

### Classes à consolider :
```css
/* Contact */
.contact-form, .form-group, .contact-info
.map-section, .info-card, .notification-toast

/* Order Wizard */
.order-wizard, .wizard-step, .wizard-progress
.menu-selection-grid, .customization-panel, .order-summary
.btn-next, .btn-prev, .btn-submit
```

## 3. LOGIQUE DE PERSONNALISATION AMÉLIORÉE

### Étape 1: Sélection des Menus
```html
<!-- Structure attendue -->
<div class="order-wizard">
  <div class="wizard-progress">
    <div class="progress-step active" data-step="1">Choix du menu</div>
    <div class="progress-step disabled" data-step="2">Personnalisation</div>
    <div class="progress-step disabled" data-step="3">Validation</div>
  </div>
  
  <div class="wizard-step active" id="step1">
    <div class="menu-selection-grid">
      <!-- Cards des menus à sélectionner -->
    </div>
    <button class="btn-next" disabled>Étape suivante</button>
  </div>
</div>
```

### Logique JavaScript :
```javascript
// Activer l'étape 2 seulement si menu sélectionné
function enableStep2() {
  const selectedMenu = document.querySelector('.menu-card.selected');
  const btnNext = document.querySelector('.btn-next');
  const step2 = document.querySelector('[data-step="2"]');
  
  if (selectedMenu) {
    btnNext.disabled = false;
    step2.classList.remove('disabled');
  } else {
    btnNext.disabled = true;
    step2.classList.add('disabled');
  }
}
```

## 4. SPÉCIFICATIONS TECHNIQUES

### Design System :
- **Couleurs primaires** : Or (#D4AF37), Noir (#1A1A1A)
- **Typographie** : Montserrat (body), Playfair Display (titres)
- **Animations** : Cubic-bezier(0.4, 0, 0.2, 1)
- **Responsive** : Mobile-first, breakpoints 480px, 768px, 1024px

### Performance :
- **Lazy loading** pour les images
- **Animations GPU-accelerated**
- **Code CSS optimisé** sans duplication
- **JavaScript modulaire** et performant

## 5. STRUCTURE DES FICHIERS À MODIFIER

### HTML (index.html) :
- Section contact (#contact)
- Section personnalisation (#order-wizard)
- Footer (.footer)

### CSS :
- `style.css` : Styles principaux consolidés
- Supprimer les duplications dans les autres fichiers CSS

### JavaScript :
- `premium-interactions.js` : Logique wizard améliorée
- `contact-map.js` : Carte interactive
- Validation formulaire en temps réel

## 6. LIVRABLES ATTENDUS

### 1. Page Index Améliorée
- Section contact premium avec carte interactive
- Footer moderne et informatif
- Navigation fluide entre sections

### 2. Wizard de Commande Optimisé
- Étape 1 avec cards de menus sélectionnables
- Logique de blocage/déblocage des étapes
- Transitions animées fluides

### 3. CSS Nettoyé et Optimisé
- Suppression des styles dupliqués
- Consolidation des classes communes
- Code maintenable et performant

### 4. JavaScript Amélioré
- Logique de wizard robuste
- Validation formulaire temps réel
- Interactions utilisateur fluides

## 7. CRITÈRES DE VALIDATION

- ✅ **UX intuitive** : L'utilisateur comprend naturellement le flux
- ✅ **Design premium** : Cohérent avec l'image de marque
- ✅ **Code propre** : Sans duplication, maintenable
- ✅ **Performance** : Chargement rapide et animations fluides
- ✅ **Responsive** : Parfait sur tous appareils
- ✅ **Accessibilité** : WCAG 2.1 AA compliant

## 8. ÉTAPES D'EXÉCUTION

1. **Analyser** les styles CSS existants et identifier les duplications
2. **Nettoyer** et consolider les feuilles de style
3. **Améliorer** la section contact avec carte interactive
4. **Reconcevoir** le wizard de personnalisation
5. **Implémenter** la logique de blocage des étapes
6. **Optimiser** le footer et la navigation
7. **Tester** sur tous les appareils et navigateurs
8. **Documenter** les changements pour maintenance

Commence par l'analyse des styles CSS, puis procède aux améliorations dans l'ordre spécifié. Chaque étape doit être validée avant de passer à la suivante.
