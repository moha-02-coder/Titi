# Utiliser une image PHP officielle avec Apache
FROM php:8.1-apache

# Definir le repertoire de travail
WORKDIR /var/www/html

# Installer les extensions PHP necessaires (MySQL uniquement)
RUN apt-get update && apt-get install -y \
    default-mysql-client \
    && docker-php-ext-install pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Activer mod_rewrite pour Apache
RUN a2enmod rewrite

# Copier les fichiers de l'application
COPY . /var/www/html/

# Donner les permissions appropriees
RUN chown -R www-data:www-data /var/www/html

# Exposer le port 80 (Apache)
EXPOSE 80

# Demarrer Apache
CMD ["apache2-foreground"]