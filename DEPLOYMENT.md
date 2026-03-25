# Guide de déploiement sur Render.com

## 🚀 Déploiement automatique avec Git Push

Ce projet est configuré pour se déployer automatiquement sur Render.com à chaque `git push`.

## 📋 Prérequis

1. **Compte Render.com** : Créez un compte sur [render.com](https://render.com)
2. **Git installé** : Assurez-vous que Git est installé sur votre machine
3. **GitHub/GitLab** : Un dépôt Git pour héberger votre code

## 🔧 Étapes de déploiement

### 1. Créer le dépôt Git

```bash
# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Titi Golden Taste ready for deployment"

# Ajouter le dépôt distant (remplacez avec votre URL)
git remote add origin https://github.com/votre-username/titi-golden-taste.git

# Push vers le dépôt
git push -u origin main
```

### 2. Créer le service sur Render.com

1. Connectez-vous à [Render.com](https://render.com)
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre compte GitHub/GitLab
4. Sélectionnez votre dépôt `titi-golden-taste`
5. Render détectera automatiquement le fichier `render.yaml`
6. Confirmez la configuration

### 3. Configuration automatique

Render créera automatiquement :
- ✅ **Service web PHP** avec votre application
- ✅ **Variables d'environnement** sécurisées
- ✅ **Déploiement automatique** à chaque push

### 4. Migration de la base de données

Après le premier déploiement :

1. Allez dans votre service sur Render.com
2. Cliquez sur **"Shell"**
3. Exécutez la commande :
```bash
php migrate-database.php
```

Cela créera toutes les tables nécessaires et un compte admin par défaut.

## 🔐 Accès après déploiement

- **URL de votre app** : `https://votre-app.onrender.com`
- **Admin** : admin@titi-golden-taste.ci / admin123
- **Base de données** : Accessible via le dashboard Render

## 🔄 Workflow de développement

### Pour faire des modifications locales :

```bash
# 1. Faire vos changements
# ...

# 2. Commit et push
git add .
git commit -m "Description des changements"
git push origin main
```

### Ce qui se passe automatiquement :

1. Render détecte le nouveau push
2. Télécharge et build votre application
3. Déploie la nouvelle version
4. Met à jour les services si nécessaire
5. **Votre site est mis à jour en ligne !**

## 🛠️ Personnalisation

### Modifier l'URL de l'application

Dans `render.yaml`, modifiez :
```yaml
- key: APP_URL
  value: https://votre-nom-custom.onrender.com
```

### Ajouter un domaine personnalisé

1. Dans le dashboard Render, allez dans votre service
2. Cliquez sur **"Custom Domains"**
3. Ajoutez votre domaine et suivez les instructions DNS

## 📊 Monitoring

Render fournit automatiquement :
- **Logs** en temps réel
- **Métriques** de performance
- **Alertes** d'erreur
- **Health checks**

## 🆘 Dépannage

### Erreur de connexion à la base de données
- Vérifiez que la migration a été exécutée
- Vérifiez les variables d'environnement dans le dashboard Render

### Page blanche
- Consultez les logs dans le dashboard Render
- Vérifiez que `index.php` est bien présent

### Déploiement échoué
- Vérifiez la syntaxe de `render.yaml`
- Consultez les logs de build dans Render

## 💡 Astuces

- **Déploiement rapide** : Chaque push met à jour votre site en 2-3 minutes
- **Rollback** : Render garde les anciennes versions, vous pouvez revenir en arrière
- **Branches** : Chaque branche Git peut avoir son propre environnement de test
- **Variables d'environnement** : Ajoutez des clés API ou autres secrets via le dashboard Render

## 📈 Mise à l'échelle

Quand votre application grandit :
- **Upgrade** : Changez le plan vers Starter ou Pro
- **Scaling** : Ajoutez des instances pour gérer plus de trafic
- **CDN** : Render inclut un CDN gratuit

---

🎉 **Félicitations !** Votre restaurant Titi Golden Taste est maintenant en ligne avec un déploiement continu !
