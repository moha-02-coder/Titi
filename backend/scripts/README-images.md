# Scripts d'ajout d'images

Ces scripts permettent de télécharger automatiquement des images depuis internet et de les ajouter aux produits et plats du menu.

## Scripts disponibles

### 1. `add-product-images.php`
Télécharge des images pour les produits de la boutique.

**Utilisation:**
```bash
php backend/scripts/add-product-images.php
```

### 2. `add-menu-images.php`
Télécharge des images pour les plats du menu.

**Utilisation:**
```bash
php backend/scripts/add-menu-images.php
```

## Fonctionnalités

- ✅ Télécharge automatiquement des images depuis Unsplash (gratuit)
- ✅ Sélectionne des images appropriées selon la catégorie et le nom du produit
- ✅ Sauvegarde les images localement dans `/assets/uploads/`
- ✅ Met à jour automatiquement la base de données
- ✅ Ignore les produits qui ont déjà des images
- ✅ Gère les erreurs de téléchargement

## Images téléchargées

Les images sont sauvegardées dans:
- **Produits**: `/assets/uploads/products/`
- **Menu**: `/assets/uploads/menu/`

Les chemins relatifs sont automatiquement ajoutés à la base de données.

## Notes importantes

- Les scripts utilisent l'API Unsplash Source qui est gratuite et ne nécessite pas de clé API
- Les images sont téléchargées avec une résolution de 800x800 pixels
- Un délai de 0.5 seconde est ajouté entre chaque téléchargement pour éviter de surcharger les serveurs
- Les produits/plats qui ont déjà des images valides sont ignorés

## Exécution via navigateur (optionnel)

Vous pouvez aussi créer des endpoints API pour exécuter ces scripts via une interface web si nécessaire.
