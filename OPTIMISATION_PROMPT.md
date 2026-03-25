# PROMPT D'OPTIMISATION COMPLÈTE DU SITE TITI GOLDEN TASTE

## CONTEXTE
Tu es un expert en développement web moderne, spécialisé en UX/UI design et performance. Tu travailles sur le site Titi Golden Taste, un restaurant gastronomique haut de gamme à Bamako, Mali.

## MISSION PRINCIPALE
Optimiser et perfectionner les sections suivantes pour créer une expérience utilisateur exceptionnelle :

### 1. SECTION MENU & CARDS PRODUITS
**Objectif :** Créer des cartes de menu magnifiques avec support vidéo/image

**Styles à perfectionner :**
- `.all-menu-items` - Conteneur principal du menu
- `.products-grid` - Grille des produits
- `.menu-card` - Carte individuelle moderne

**Exigences :**
- Design moderne avec animations fluides
- Support vidéo (auto-play muted au hover, bouton play)
- Images haute qualité avec lazy loading
- Effets 3D subtils au hover
- Prix en dégradé doré élégant
- Badges "Spécialité" animés
- Responsive parfait sur tous appareils
- Micro-interactions premium

### 2. SECTION PRODUITS EN VEDETTE
**Objectif :** Mettre en valeur les produits phares avec design impactant

**Éléments à créer :**
- Hero section avec produit vedette
- Carrousel horizontal smooth
- Cards "En vedette" avec animations
- Système de notation étoiles
- Badges "Nouveau", "Populaire", "Chef's Choice"
- Overlay d'information au hover

### 3. SECTION COMMANDE EN LIGNE
**Objectif :** Créer un processus de commande fluide et intuitif

**Composants à optimiser :**
- Wizard de commande en étapes
- Personnalisation des produits
- Récapitulatif visuel
- Options de livraison/paiement
- Validation en temps réel
- Animations de transition entre étapes

### 4. SECTION CONTACT
**Objectif :** Créer une section contact professionnelle et engageante

**Éléments à perfectionner :**
- Carte interactive Leaflet améliorée
- Formulaire avec validation visuelle
- Informations de contact stylisées
- Animations de soumission
- Design responsive tablet/mobile

## DIRECTIVES DE DESIGN

### Thème Visuel
- **Couleurs :** Or (#D4AF37), noir élégant (#1A1A1A), blanc cassé
- **Typographie :** Montserrat pour le corps, Playfair Display pour les titres
- **Animations :** Cubic-bezier(0.4, 0, 0.2, 1) pour fluidité
- **Ombres :** Layers multiples pour profondeur

### Performance
- Lazy loading pour toutes images/vidéos
- CSS optimisé avec variables
- Animations GPU-accelerated
- Mobile-first approach

### Accessibilité
- Contrastes WCAG AA minimum
- Navigation clavier complète
- Screen reader friendly
- Touch targets 44px minimum

### UX Premium
- Micro-interactions sur tous éléments interactifs
- Feedback visuel immédiat
- Loading states élégants
- Error states informatifs

## STRUCTURE DE CODE ATTENDUE

### CSS Organisation
```css
/* === SECTION MENU === */
.all-menu-items { /* Container principal */ }
.products-grid { /* Grille responsive */ }
.menu-card { /* Carte moderne 3D */ }
.menu-media-container { /* Support vidéo/image */ }
.video-overlay { /* Overlay lecture vidéo */ }

/* === PRODUITS VEDETTE === */
.hero-product { /* Section hero */ }
.featured-carousel { /* Carrousel smooth */ }
.featured-badge { /* Badges animés */ }

/* === COMMANDE === */
.order-wizard { /* Wizard multi-étapes */ }
.customization-panel { /* Personnalisation */ }
.order-summary { /* Récapitulatif */ }

/* === CONTACT === */
.contact-hero { /* Section contact */ }
.map-interactive { /* Carte améliorée */ }
.contact-form { /* Formulaire stylisé */ }
```

### JavaScript Interactions
- Gestionnaire de médias (vidéo/image)
- Animations au scroll (Intersection Observer)
- Validation formulaire temps réel
- État de commande synchronisé
- Carte interactive améliorée

## LIVRABLES ATTENDUS

1. **CSS Complet** : Tous les styles pour les 4 sections
2. **JavaScript** : Interactions et animations
3. **HTML Structure** : Templates optimisés
4. **Responsive** : Parfait sur mobile/tablet/desktop
5. **Performance** : Optimisé et rapide

## STANDARDS DE QUALITÉ

- Code semi-colon, cohérent et commenté
- Pas de CSS inline (sauf exceptions justifiées)
- Accessibilité WCAG 2.1 AA
- Performance Lighthouse > 90
- Cross-browser compatible (Chrome, Firefox, Safari, Edge)

## INSPIRATION DESIGN

- Sites premium de restauration
- Material Design 3.0 principles
- Apple Human Interface Guidelines
- Techniques CSS modernes (Grid, Flexbox, Container Queries)

Commence par analyser le code existant, puis propose des améliorations spectaculaires tout en maintenant cohérence avec l'identité de marque Titi Golden Taste.
