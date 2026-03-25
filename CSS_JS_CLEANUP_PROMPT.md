# PROMPT DE NETTOYAGE DES STYLES CSS/JS DU PROJET TITI GOLDEN TASTE

## CONTEXTE DU PROJET

Tu es un expert en optimisation de code CSS/JS spécialisé dans l'élimination des styles redondants et la consolidation des feuilles de style. Tu travailles sur le projet Titi Golden Taste, un restaurant haut de gamme avec un codebase complexe.

## STRUCTURE DU PROJET

### Fichiers CSS à analyser (18 fichiers) :
```
c:\wamp64\www\Titi\admin\side-icon.css
c:\wamp64\www\Titi\assets\css\admin.css
c:\wamp64\www\Titi\assets\css\auth.css
c:\wamp64\www\Titi\assets\css\custom.css
c:\wamp64\www\Titi\assets\css\customize-order.css
c:\wamp64\www\Titi\assets\css\dashboard.css
c:\wamp64\www\Titi\assets\css\delivery-dashboard.css
c:\wamp64\www\Titi\assets\css\delivery.css
c:\wamp64\www\Titi\assets\css\dropdowns.css
c:\wamp64\www\Titi\assets\css\modal-universal.css
c:\wamp64\www\Titi\assets\css\order-enhanced.css
c:\wamp64\www\Titi\assets\css\order.css
c:\wamp64\www\Titi\assets\css\orders.css
c:\wamp64\www\Titi\assets\css\profile-enhanced.css
c:\wamp64\www\Titi\assets\css\profile.css
c:\wamp64\www\Titi\assets\css\style.css
c:\wamp64\www\Titi\side-icon.css
c:\wamp64\www\Titi\test\front_end\components\side-icon.css
```

### Fichiers JS à analyser (38 fichiers) :
```
c:\wamp64\www\Titi\assets\js\admin-dashboard.js
c:\wamp64\www\Titi\assets\js\admin-fixes.js
c:\wamp64\www\Titi\assets\js\admin.js
c:\wamp64\www\Titi\assets\js\anti-bybit-shield.js
c:\wamp64\www\Titi\assets\js\app.js
c:\wamp64\www\Titi\assets\js\auth.js
c:\wamp64\www\Titi\assets\js\auths.js
c:\wamp64\www\Titi\assets\js\cart.js
c:\wamp64\www\Titi\assets\js\config.js
c:\wamp64\www\Titi\assets\js\contact-map.js
c:\wamp64\www\Titi\assets\js\dashboard.js
c:\wamp64\www\Titi\assets\js\delivery-options.js
c:\wamp64\www\Titi\assets\js\delivery.js
c:\wamp64\www\Titi\assets\js\extension-protection.js
c:\wamp64\www\Titi\assets\js\frontend.js
c:\wamp64\www\Titi\assets\js\header-manager.js
c:\wamp64\www\Titi\assets\js\header-scroll.js
c:\wamp64\www\Titi\assets\js\image-config.js
c:\wamp64\www\Titi\assets\js\live-streaming-enhanced.js
c:\wamp64\www\Titi\assets\js\live-streaming.js
c:\wamp64\www\Titi\assets\js\main.js
c:\wamp64\www\Titi\assets\js\menu-likes.js
c:\wamp64\www\Titi\assets\js\menu-media.js
c:\wamp64\www\Titi\assets\js\menu-videos.js
c:\wamp64\www\Titi\assets\js\modal-universal.js
c:\wamp64\www\Titi\assets\js\notifications.js
c:\wamp64\www\Titi\assets\js\order-enhanced.js
c:\wamp64\www\Titi\assets\js\order-manager.js
c:\wamp64\www\Titi\assets\js\order.js
c:\wamp64\www\Titi\assets\js\orders-enhanced.js
c:\wamp64\www\Titi\assets\js\orders.js
c:\wamp64\www\Titi\assets\js\premium-interactions.js
c:\wamp64\www\Titi\assets\js\product-modal.js
c:\wamp64\www\Titi\assets\js\profile-enhanced.js
c:\wamp64\www\Titi\assets\js\profile.js
c:\wamp64\www\Titi\assets\js\recipes-live.js
c:\wamp64\www\Titi\assets\js\scroll-animations.js
c:\wamp64\www\Titi\assets\js\social-sync.js
```

## ANALYSE PRÉLIMINAIRE DES CONFLITS IDENTIFIÉS

### Classes CSS avec duplications détectées :

#### **1. .product-card** (47 occurrences)
- **style.css**: 44 occurrences
- **dashboard.css**: 3 occurrences
- **Risque**: Conflit de styles entre frontend et dashboard

#### **2. .menu-card** (42 occurrences)
- **style.css**: 17 occurrences
- **order-enhanced.css**: 14 occurrences  
- **order.css**: 11 occurrences
- **Risque**: Triple définition avec styles contradictoires

#### **3. .btn** (156 occurrences)
- **style.css**: 68 occurrences
- **delivery-dashboard.css**: 16 occurrences
- **admin.css**: 15 occurrences
- **auth.css**: 12 occurrences
- **orders.css**: 12 occurrences
- **profile.css**: 10 occurrences
- **order.css**: 9 occurrences
- **profile-enhanced.css**: 7 occurrences
- **delivery.css**: 3 occurrences
- **customize-order.css**: 2 occurrences
- **dashboard.css**: 2 occurrences
- **Risque**: Conflit massif sur les boutons

## MISSION PRINCIPALE

### Étape 1: Analyse Complète des Duplications
1. **Scanner tous les fichiers CSS** pour identifier les classes dupliquées
2. **Analyser les conflits spécifiques** (propriétés contradictoires)
3. **Identifier les styles obsolètes** (non utilisés dans le HTML)
4. **Détecter les sélecteurs redondants** (mêmes propriétés sur classes différentes)

### Étape 2: Consolidation Intelligente
1. **Créer une hiérarchie de priorité** des fichiers CSS
2. **Fusionner les styles compatibles** dans le fichier principal (style.css)
3. **Maintenir les spécificités contextuelles** (admin, dashboard, etc.)
4. **Éliminer les redondances totales**

### Étape 3: Optimisation des Sélecteurs
1. **Regrouper les propriétés communes**
2. **Utiliser les variables CSS** pour les valeurs répétées
3. **Optimiser la spécificité** pour éviter les conflits
4. **Standardiser la naming convention**

### Étape 4: Nettoyage JavaScript
1. **Scanner les fichiers JS** pour les styles inline
2. **Extraire les styles CSS** dans les feuilles appropriées
3. **Consolider les classes ajoutées dynamiquement**
4. **Optimiser les sélecteurs jQuery** si présents

## STRATÉGIE DE PRIORITÉ DES FICHIERS

### Hiérarchie proposée :
1. **style.css** (principal - frontend)
2. **admin.css** (interface admin)
3. **dashboard.css** (dashboard spécifique)
4. **auth.css** (authentification)
5. **order.css** (gestion commandes)
6. **profile.css** (profils utilisateurs)
7. **delivery.css** (livraison)
8. **modal-universal.css** (modaux réutilisables)
9. **dropdowns.css** (menus déroulants)
10. **custom.css** (surcharges personnalisées)

## RÈGLES DE CONSOLIDATION

### Pour les classes dupliquées :

#### **Cas 1: Mêmes propriétés, fichiers différents**
- **Action**: Fusionner dans le fichier le plus prioritaire
- **Exemple**: `.btn` défini dans style.css et admin.css
- **Solution**: Garder dans style.css, supprimer de admin.css

#### **Cas 2: Propriétés contradictoires**
- **Action**: Analyser le contexte et créer des variantes
- **Exemple**: `.product-card` avec styles différents frontend vs dashboard
- **Solution**: `.product-card` (principal) + `.dashboard-product-card` (spécifique)

#### **Cas 3: Propriétés complémentaires**
- **Action**: Combiner dans une seule définition
- **Exemple**: Une définition avec layout, autre avec couleurs
- **Solution**: Fusionner les deux définitions complètes

#### **Cas 4: Styles obsolètes**
- **Action**: Supprimer si non utilisés dans le HTML
- **Méthode**: Scanner tous les fichiers HTML/PHP pour vérifier l'utilisation

## EXEMPLES DE NETTOYAGE ATTENDU

### Avant (duplication) :
```css
/* style.css */
.product-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
}

/* dashboard.css */
.product-card {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 15px;
}
```

### Après (consolidation) :
```css
/* style.css */
.product-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
}

.dashboard-product-card {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 15px;
}

/* dashboard.css - supprimé */
```

## OUTILS ET MÉTHODOLOGIE

### Étapes d'exécution :

1. **Création d'un rapport d'analyse** :
   - Lister toutes les classes dupliquées
   - Identifier les conflits de propriétés
   - Marquer les styles obsolètes

2. **Plan de consolidation** :
   - Définir la hiérarchie des fichiers
   - Planifier les fusions
   - Identifier les classes à renommer

3. **Exécution par phases** :
   - Phase 1: Nettoyage des styles obsolètes
   - Phase 2: Consolidation des classes dupliquées
   - Phase 3: Optimisation des sélecteurs
   - Phase 4: Nettoyage JavaScript

4. **Validation** :
   - Vérifier l'affichage sur toutes les pages
   - Tester les responsive breakpoints
   - Valider les fonctionnalités interactives

## LIVRABLES ATTENDUS

### 1. Rapport d'analyse détaillé
- Liste des classes dupliquées avec occurrences
- Conflits identifiés et solutions proposées
- Taille des fichiers avant/après optimisation

### 2. Fichiers CSS nettoyés
- Tous les styles dupliqués éliminés
- Hiérarchie claire et maintenable
- Code optimisé et commenté

### 3. Fichiers JS optimisés
- Styles inline extraits
- Classes dynamiques consolidées
- Code plus performant

### 4. Documentation des changements
- Log de toutes les modifications
- Guide de maintenance future
- Bonnes pratiques établies

## CRITÈRES DE SUCCÈS

- **Réduction de 30-50%** de la taille totale des CSS
- **Élimination de 100%** des styles dupliqués
- **Maintien de 100%** des fonctionnalités visuelles
- **Amélioration de la performance** de chargement
- **Code maintenable** et documenté

## INSTRUCTIONS FINALES

Commence par analyser tous les fichiers CSS pour créer un inventaire complet des duplications. Ensuite, applique la stratégie de consolidation en respectant la hiérarchie établie. Documente chaque changement pour assurer la traçabilité et la maintenance future.

Le but est d'obtenir un codebase CSS/JS propre, optimisé et performant pour Titi Golden Taste tout en préservant l'intégrité visuelle et fonctionnelle du site.
