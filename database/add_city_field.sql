-- Requête SQL pour ajouter le champ city à la table users
-- Exécuter cette requête dans phpMyAdmin ou votre gestionnaire de base de données

-- Option 1: Ajouter le champ city après le champ address
ALTER TABLE `users` ADD COLUMN `city` VARCHAR(100) NOT NULL DEFAULT 'Bamako' AFTER `address`;

-- Option 2: Si vous voulez que le champ soit nullable (peut être vide)
ALTER TABLE `users` ADD COLUMN `city` VARCHAR(100) NULL DEFAULT 'Bamako' AFTER `address`;

-- Option 3: Si vous voulez un champ city avec une contrainte de longueur plus grande
ALTER TABLE `users` ADD COLUMN `city` VARCHAR(150) NOT NULL DEFAULT 'Bamako' AFTER `address`;

-- Pour vérifier que le champ a été ajouté correctement
DESCRIBE `users`;

-- Pour voir les données existantes avec le nouveau champ
SELECT id, first_name, last_name, email, address, city FROM `users` LIMIT 5;

-- Si vous voulez mettre à jour les enregistrements existants avec une valeur par défaut
UPDATE `users` SET `city` = 'Bamako' WHERE `city` IS NULL OR `city` = '';

-- Pour ajouter un index sur le champ city (améliore les performances des recherches)
ALTER TABLE `users` ADD INDEX `idx_city` (`city`);
