-- -- Base de données Titi Golden Taste - Schéma complet et données de démonstration
-- DROP DATABASE IF EXISTS titi;
-- CREATE DATABASE titi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE titi;

-- Table des utilisateurs
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('client','admin','livreur') DEFAULT 'client',
    avatar VARCHAR(255),
    phone VARCHAR(30),
    verified BOOLEAN DEFAULT FALSE,
    address TEXT,
    newsletter BOOLEAN DEFAULT FALSE,
    last_login DATETIME,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions (optionnel, pour persistance courte)
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(128) NOT NULL,
    ip VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table pour réinitialisation de mot de passe (développement)
CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reset_token VARCHAR(128) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table JWT revocation/store (optionnel)
CREATE TABLE jwt_blacklist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    jti VARCHAR(128) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu (plats)
CREATE TABLE menu (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    category VARCHAR(50),
    image_url VARCHAR(255),
    is_today BOOLEAN DEFAULT FALSE,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Produits boutique
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(191),
    description TEXT,
    short_description VARCHAR(255),
    price INT NOT NULL,
    old_price INT DEFAULT NULL,
    category VARCHAR(50),
    product_type VARCHAR(50),
    stock INT DEFAULT 0,
    main_image VARCHAR(255),
    images TEXT,
    is_featured TINYINT(1) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Statut live du restaurant
CREATE TABLE live_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status ENUM('open','closed','busy') DEFAULT 'open',
    message VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Commandes principales
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    items_json JSON,
    total_price INT NOT NULL,
    delivery_fee INT DEFAULT 0,
    final_price INT NOT NULL,
    delivery_address TEXT,
    status ENUM('pending','confirmed','preparing','delivery','completed','cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'cash',
    tracking_code VARCHAR(64),
    estimated_time_minutes INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Détails d'articles de commande (pour requêtes rapides)
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type ENUM('menu','product') DEFAULT 'product',
    item_id INT,
    quantity INT DEFAULT 1,
    unit_price INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Paniers
CREATE TABLE carts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    data_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages / conversations
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id VARCHAR(64) NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT,
    type ENUM('text','image','file','system') DEFAULT 'text',
    attachments TEXT,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    data_json JSON,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- WebSocket connections
CREATE TABLE ws_connections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    connection_id VARCHAR(128) NOT NULL,
    meta_json JSON,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_menu_today ON menu(is_today, available);
CREATE INDEX idx_products_active ON products(active, stock);
CREATE INDEX idx_orders_user ON orders(user_id, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX idx_carts_user ON carts(user_id, updated_at);
CREATE INDEX idx_sessions_user ON sessions(user_id, expires_at);

-- =====================
-- Données de démonstration
-- NOTE: For local development run the included PHP helper to set secure bcrypt passwords to the credentials listed in README.md
-- Admin account (email: admin@titi-golden-taste.ci / password: admin123)
INSERT INTO users (first_name, last_name, email, password, role, phone, address, verified) VALUES
('Admin','System','admin@titi-golden-taste.ci','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin','+2250123456789','Abidjan, Plateau',TRUE);

-- Client test account (email: client@email.com / password: client123)
INSERT INTO users (first_name, last_name, email, password, role, phone, address, verified) VALUES
('Client','Test','client@email.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','client','+2250789012345','Cocody, Abidjan',TRUE);

-- Sessions de développement (simples tokens pour tests locaux)
INSERT INTO sessions (user_id, session_token, ip, user_agent, expires_at) VALUES
(1, 'sess_admin_dev_1', '127.0.0.1', 'dev-agent', DATE_ADD(NOW(), INTERVAL 7 DAY)),
(2, 'sess_client_dev_1', '127.0.0.1', 'dev-agent', DATE_ADD(NOW(), INTERVAL 7 DAY));

-- 10 plats de menu
INSERT INTO menu (name, description, price, category, image_url, is_today, available) VALUES
('Poulet braisé','Poulet tendre servi avec alloco et sauce pimentée',3500,'Plat','/assets/images/menu/poulet-braise.jpg',TRUE,TRUE),
('Poisson grillé','Poisson frais grillé, accompagné d\'attiéké',4500,'Plat','/assets/images/menu/poisson-grille.jpg',FALSE,TRUE),
('Kedjenou de poulet','Kedjenou mijoté aux épices',4000,'Plat','/assets/images/menu/kedjenou.jpg',FALSE,TRUE),
('Riz gras','Riz parfumé aux légumes et viande',3000,'Plat','/assets/images/menu/riz-gras.jpg',FALSE,TRUE),
('Foutou banane','Foutou accompagné de sauce graine',3800,'Plat','/assets/images/menu/foutou.jpg',FALSE,TRUE),
('Attiéké poisson','Attiéké servi avec poisson frit',3200,'Plat','/assets/images/menu/attiéke-poisson.jpg',FALSE,TRUE),
('Alloco et poisson','Banane plantain frit avec poisson',2800,'Plat','/assets/images/menu/alloco-poisson.jpg',FALSE,TRUE),
('Soupe kandia','Soupe traditionnelle aux légumes',2200,'Entrée','/assets/images/menu/soupe-kandia.jpg',FALSE,TRUE),
('Brochette mixte','Brochette de viande et poisson',1800,'Snack','/assets/images/menu/brochette.jpg',FALSE,TRUE),
('Beignets de banane','Dessert sucré traditionnel',800,'Dessert','/assets/images/menu/beignets.jpg',FALSE,TRUE);

-- 15 produits boutique
INSERT INTO products (name, description, price, category, stock, images, active) VALUES
('Sauce piment maison','Sauce pimentée maison',1500,'Condiment',50,'["/assets/images/products/sauce1.jpg"]',TRUE),
('Attiéké 1kg','Attiéké traditionnel 1kg',2000,'Accompagnement',30,'["/assets/images/products/attieke.jpg"]',TRUE),
('Huile rouge 1L','Huile de palme 1L',2500,'Condiment',20,'["/assets/images/products/huile.jpg"]',TRUE),
('Gombo séché 250g','Gombo séché',1800,'Epice',40,'["/assets/images/products/gombo.jpg"]',TRUE),
('Piment frais 250g','Piment frais',800,'Epice',80,'["/assets/images/products/piment.jpg"]',TRUE),
('Arachide grillée 500g','Arachide grillée salée',1200,'Snack',60,'["/assets/images/products/arachide.jpg"]',TRUE),
('Bissap 500ml','Concentré de bissap',2200,'Boisson',25,'["/assets/images/products/bissap.jpg"]',TRUE),
('Couscous de manioc','Couscous prêt à cuire 1kg',1400,'Accompagnement',35,'["/assets/images/products/couscous.jpg"]',TRUE),
('Poisson fumé','Poisson fumé traditionnel',3000,'Produit',10,'["/assets/images/products/poisson-fume.jpg"]',TRUE),
('Farine de maïs 1kg','Farine pour pâte',900,'Produit',40,'["/assets/images/products/farine.jpg"]',TRUE),
('Épices assorties','Pack d\'épices locales',1200,'Epice',50,'["/assets/images/products/epices.jpg"]',TRUE),
('Sauce arachide','Préparation sauce arachide',1600,'Condiment',45,'["/assets/images/products/sauce-arachide.jpg"]',TRUE),
('Poivre noir','Poivre moulu 200g',700,'Epice',70,'["/assets/images/products/poivre.jpg"]',TRUE),
('Mangue séchée','Snack sucré',1300,'Snack',22,'["/assets/images/products/mangue.jpg"]',TRUE),
('Miel local 250g','Miel artisanal',2500,'Boisson',15,'["/assets/images/products/miel.jpg"]',TRUE);

-- Statut initial
INSERT INTO live_status (status, message) VALUES ('open','Le restaurant est ouvert');

-- Paniers de démonstration (user_id 2 = client test)
INSERT INTO carts (user_id, data_json) VALUES
(2, JSON_OBJECT(
    'items', JSON_ARRAY(
        JSON_OBJECT('type','menu','id',1,'name','Poulet braisé','qty',1,'unit_price',3500),
        JSON_OBJECT('type','product','id',1,'name','Sauce piment maison','qty',2,'unit_price',1500)
    ),
    'created_at', NOW()
));

-- 5 commandes de test
INSERT INTO orders (user_id, items_json, total_price, delivery_fee, final_price, delivery_address, status, payment_method, tracking_code, estimated_time_minutes) VALUES
(2, JSON_ARRAY(JSON_OBJECT('name','Poulet braisé','qty',1,'price',3500)) ,3500,500,4000,'Cocody, Abidjan','completed','cash','TRK1001',45),
(2, JSON_ARRAY(JSON_OBJECT('name','Poisson grillé','qty',1,'price',4500), JSON_OBJECT('name','Sauce piment maison','qty',1,'price',1500)),6000,500,6500,'Cocody, Abidjan','delivery','card','TRK1002',50),
(2, JSON_ARRAY(JSON_OBJECT('name','Riz gras','qty',2,'price',3000)),6000,300,6300,'Marcory, Abidjan','preparing','momo','TRK1003',35),
(2, JSON_ARRAY(JSON_OBJECT('name','Attiéké poisson','qty',1,'price',3200)),3200,300,3500,'Plateau, Abidjan','confirmed','cash','TRK1004',30),
(2, JSON_ARRAY(JSON_OBJECT('name','Beignets de banane','qty',5,'price',800)),4000,200,4200,'Cocody, Abidjan','pending','cash','TRK1005',25);

INSERT INTO order_items (order_id, item_name, item_type, item_id, quantity, unit_price) VALUES
(1,'Poulet braisé','menu',1,1,3500),
(2,'Poisson grillé','menu',2,1,4500),
(2,'Sauce piment maison','product',1,1,1500),
(3,'Riz gras','menu',4,2,3000),
(4,'Attiéké poisson','menu',6,1,3200),
(5,'Beignets de banane','menu',10,5,800);

INSERT INTO products
(name, slug, description, short_description, price, old_price, category, product_type, stock, main_image, images, is_featured)
VALUES
('Robe Fleurie Élégante', 'robe-fleurie-elegante',
 'Robe longue florale en tissu léger, idéale pour les sorties élégantes.',
 'Robe longue florale élégante',
 45000, 52000, 'robes', 'boutique', 10,
 'assets/images/shop/robes/robe1.jpg',
 '["assets/images/shop/robes/robe1.jpg","assets/images/shop/robes/robe1_2.jpg"]',
 1),

('Robe Cocktail Satinée', 'robe-cocktail-satinee',
 'Robe cocktail en satin avec coupe ajustée et finition premium.',
 'Robe satinée chic',
 65000, NULL, 'robes', 'boutique', 8,
 'assets/images/shop/robes/robe2.jpg',
 '["assets/images/shop/robes/robe2.jpg"]',
 0),

('Robe Maxi Plissée', 'robe-maxi-plissee',
 'Maxi-robe plissée fluide avec ceinture assortie.',
 'Maxi-robe plissée',
 52000, NULL, 'robes', 'boutique', 6,
 'assets/images/shop/robes/robe3.jpg',
 '["assets/images/shop/robes/robe3.jpg"]',
 0),

('Robe Bohème Dentelle', 'robe-boheme-dentelle',
 'Robe bohème avec détails en dentelle raffinée.',
 'Robe bohème en dentelle',
 48000, NULL, 'robes', 'boutique', 7,
 'assets/images/shop/robes/robe4.jpg',
 '["assets/images/shop/robes/robe4.jpg"]',
 0),

('Robe Lin Décontractée', 'robe-lin-decontractee',
 'Robe en lin respirant, parfaite pour un look casual.',
 'Robe en lin',
 32000, NULL, 'robes', 'boutique', 12,
 'assets/images/shop/robes/robe5.jpg',
 '["assets/images/shop/robes/robe5.jpg"]',
 0),

('Robe Soirée Glamour', 'robe-soiree-glamour',
 'Robe de soirée glamour avec finition brillante.',
 'Robe de soirée',
 78000, 85000, 'robes', 'boutique', 4,
 'assets/images/shop/robes/robe6.jpg',
 '["assets/images/shop/robes/robe6.jpg"]',
 0),

('Robe Courte Moderne', 'robe-courte-moderne',
 'Robe courte moderne, coupe droite.',
 'Robe courte moderne',
 38000, NULL, 'robes', 'boutique', 9,
 'assets/images/shop/robes/robe7.jpg',
 '["assets/images/shop/robes/robe7.jpg"]',
 0),

('Robe Africaine Chic', 'robe-africaine-chic',
 'Robe africaine chic avec motifs traditionnels.',
 'Robe africaine chic',
 60000, NULL, 'robes', 'boutique', 5,
 'assets/images/shop/robes/robe8.jpg',
 '["assets/images/shop/robes/robe8.jpg"]',
 0);

-- Messages de démonstration
INSERT INTO messages (conversation_id, sender_id, receiver_id, content, type) VALUES
('conv_2_admin',2,1,'Bonjour, j\'ai une question sur ma commande TRK1002','text'),
('conv_2_admin',1,2,'Bonjour, votre commande est en cours de préparation.','text');

-- Ajout d'un exemple de conversation système -> client
INSERT INTO messages (conversation_id, sender_id, receiver_id, content, type) VALUES
('conv_sys_2',1,2,'Votre commande TRK1002 a été prise en charge par le restaurateur.','system');

-- Notifications demo
INSERT INTO notifications (user_id, type, title, content, data_json) VALUES
(1,'order','Nouvelle commande','Vous avez une nouvelle commande #TRK1001',JSON_OBJECT('order_id',1)),
(2,'status','Statut commande','Votre commande TRK1002 est en livraison',JSON_OBJECT('order_id',2));

-- Notifications supplémentaires pour développement
INSERT INTO notifications (user_id, type, title, content, data_json) VALUES
(2,'promo','Offre spéciale','Profitez de -10% sur votre prochaine commande',JSON_OBJECT('code','DEV10'));

-- Connexions WebSocket (exemple)
INSERT INTO ws_connections (user_id, connection_id, meta_json) VALUES
(1,'conn_admin_1',JSON_OBJECT('ip','127.0.0.1')),
(2,'conn_client_1',JSON_OBJECT('ip','127.0.0.1'));

-- Utilitaire: afficher un résumé rapide
SELECT '=== COMPTE ADMIN ===' AS section;
SELECT id, first_name, last_name, email, role FROM users WHERE role = 'admin';
SELECT '=== COMPTE CLIENT ===' AS section;
SELECT id, first_name, last_name, email FROM users WHERE role = 'client';
SELECT '=== MENU ===' AS section;
SELECT id, name, price, is_today FROM menu ORDER BY id;
SELECT '=== PRODUITS ===' AS section;
SELECT id, name, price, stock FROM products ORDER BY id;
SELECT '=== COMMANDES ===' AS section;
SELECT id, user_id, status, final_price, created_at FROM orders ORDER BY created_at DESC LIMIT 10;