# Utiliser une image PHP officielle avec Apache
FROM php:8.1-apache

# Définir le répertoire de travail
WORKDIR /var/www/html

# Installer les extensions PHP nécessaires
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pdo_mysql

# Activer mod_rewrite pour Apache
RUN a2enmod rewrite

# Copier les fichiers de l'application
COPY . /var/www/html/

# Donner les permissions appropriées
RUN chown -R www-data:www-data /var/www/html

# Exposer le port 80 (Apache)
EXPOSE 80

# Démarrer Apache
CMD ["apache2-foreground"]
