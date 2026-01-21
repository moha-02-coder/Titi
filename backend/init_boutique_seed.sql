-- Base de données Titi Golden Taste - Version améliorée et optimisée
DROP DATABASE IF EXISTS titi_golden_taste;
CREATE DATABASE titi_golden_taste CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE titi_golden_taste;

-- =================== TABLES PRINCIPALES ===================

-- Table des utilisateurs (améliorée)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('client', 'admin', 'livreur', 'restaurant', 'super_admin') DEFAULT 'client',
    avatar VARCHAR(255),
    phone VARCHAR(30) UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    verification_expires_at DATETIME,
    address TEXT,
    city VARCHAR(100) DEFAULT 'Bamako',
    quarter VARCHAR(100),
    birth_date DATE,
    newsletter BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    login_attempts INT DEFAULT 0,
    locked_until DATETIME,
    last_login DATETIME,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role_active (role, active),
    INDEX idx_verified (verified),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Table des livreurs (spécifique aux livreurs)
CREATE TABLE drivers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    
    -- Documents
    id_document VARCHAR(500) NOT NULL,
    driver_license VARCHAR(500),
    insurance_document VARCHAR(500),
    
    -- Véhicule
    vehicle_type ENUM('moto', 'velo', 'voiture', 'camionnette') NOT NULL,
    vehicle_brand VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year YEAR,
    vehicle_plate VARCHAR(50),
    vehicle_color VARCHAR(50),
    
    -- Statut
    status ENUM('pending', 'approved', 'rejected', 'suspended', 'inactive') DEFAULT 'pending',
    rejection_reason TEXT,
    validated_by INT,
    validated_at DATETIME,
    
    -- Performance
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_deliveries INT DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    
    -- Localisation
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    current_address VARCHAR(255),
    last_location_update TIMESTAMP NULL,
    
    -- Disponibilité
    available BOOLEAN DEFAULT FALSE,
    available_from TIME,
    available_to TIME,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_available (available),
    INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- Table des catégories de produits
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT DEFAULT NULL,
    image_url VARCHAR(255),
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    
    INDEX idx_slug (slug),
    INDEX idx_parent_id (parent_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB;

-- Table des produits (boutique) - améliorée
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(191) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    sku VARCHAR(50) UNIQUE,
    
    -- Prix
    price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    
    -- Catégorie
    category_id INT,
    
    -- Inventaire
    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    track_inventory BOOLEAN DEFAULT TRUE,
    allow_backorders BOOLEAN DEFAULT FALSE,
    
    -- Images
    main_image VARCHAR(255),
    gallery JSON,
    
    -- Attributs
    is_featured BOOLEAN DEFAULT FALSE,
    is_virtual BOOLEAN DEFAULT FALSE,
    weight DECIMAL(10,2),
    dimensions VARCHAR(100),
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Statistiques
    view_count INT DEFAULT 0,
    purchase_count INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    
    -- Statut
    status ENUM('draft', 'active', 'archived', 'out_of_stock') DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Index
    INDEX idx_slug (slug),
    INDEX idx_category_id (category_id),
    INDEX idx_status (status),
    INDEX idx_is_featured (is_featured),
    INDEX idx_price (price),
    INDEX idx_stock_quantity (stock_quantity),
    FULLTEXT idx_search (name, description, short_description)
) ENGINE=InnoDB;

-- Table des attributs de produit
CREATE TABLE product_attributes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    INDEX idx_product_id (product_id),
    INDEX idx_attribute_name (attribute_name)
) ENGINE=InnoDB;

-- Table des variations de produit
CREATE TABLE product_variations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    price DECIMAL(10,2),
    compare_price DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    attributes JSON,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    INDEX idx_product_id (product_id),
    INDEX idx_sku (sku)
) ENGINE=InnoDB;

-- Table du menu (plats du restaurant)
CREATE TABLE menu (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    preparation_time INT COMMENT 'Temps en minutes',
    calories INT,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_spicy BOOLEAN DEFAULT FALSE,
    is_today_special BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(255),
    gallery JSON,
    sort_order INT DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    
    INDEX idx_category_id (category_id),
    INDEX idx_is_today_special (is_today_special),
    INDEX idx_is_featured (is_featured),
    INDEX idx_available (available),
    INDEX idx_sort_order (sort_order),
    FULLTEXT idx_menu_search (name, description)
) ENGINE=InnoDB;

-- Table des paniers (améliorée)
CREATE TABLE carts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    session_id VARCHAR(100),
    items JSON,
    total_items INT DEFAULT 0,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Table des articles de panier (pour requêtes avancées)
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cart_id INT NOT NULL,
    item_type ENUM('menu', 'product', 'variation') NOT NULL,
    item_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    attributes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cart_id (cart_id),
    INDEX idx_item_type_id (item_type, item_id)
) ENGINE=InnoDB;

-- Table des commandes (améliorée)
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    
    -- Informations client
    customer_name VARCHAR(200),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(30),
    
    -- Adresse de livraison
    delivery_address TEXT NOT NULL,
    delivery_city VARCHAR(100),
    delivery_quarter VARCHAR(100),
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    delivery_notes TEXT,
    
    -- Montants
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tip_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Paiement
    payment_method ENUM('cash', 'card', 'mobile_money', 'wallet', 'bank_transfer') DEFAULT 'cash',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_details JSON,
    
    -- Statut commande
    status ENUM(
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'assigned',
        'picked_up',
        'on_the_way',
        'delivered',
        'cancelled',
        'rejected'
    ) DEFAULT 'pending',
    
    -- Livraison
    driver_id INT,
    estimated_delivery_time DATETIME,
    actual_delivery_time DATETIME,
    delivery_duration INT COMMENT 'Durée en minutes',
    
    -- Évaluations
    customer_rating INT,
    customer_review TEXT,
    driver_rating INT,
    driver_review TEXT,
    
    -- Notes
    customer_notes TEXT,
    restaurant_notes TEXT,
    admin_notes TEXT,
    
    -- Métadonnées
    ip_address VARCHAR(45),
    user_agent TEXT,
    source ENUM('web', 'mobile', 'api') DEFAULT 'web',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Index
    INDEX idx_order_number (order_number),
    INDEX idx_user_id (user_id),
    INDEX idx_driver_id (driver_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at),
    INDEX idx_customer_email (customer_email),
    INDEX idx_customer_phone (customer_phone)
) ENGINE=InnoDB;

-- Table des articles de commande
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    item_type ENUM('menu', 'product', 'variation') NOT NULL,
    item_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    attributes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    INDEX idx_order_id (order_id),
    INDEX idx_item_type_id (item_type, item_id),
    INDEX idx_sku (sku)
) ENGINE=InnoDB;

-- Table de l'historique des statuts de commande
CREATE TABLE order_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_order_id (order_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB;

-- Table des paiements
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'XOF',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    gateway_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =================== TABLES SUPPORT ===================

-- Sessions utilisateur
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT,
    expires_at DATETIME NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Réinitialisation de mot de passe
CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(191) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- JWT blacklist
CREATE TABLE jwt_blacklist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_token (token(100)),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Statut live du restaurant
CREATE TABLE live_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status ENUM('open', 'closed', 'busy', 'break') DEFAULT 'open',
    message VARCHAR(255),
    estimated_wait_time INT COMMENT 'Temps d\'attente estimé en minutes',
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Messages/conversations
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id VARCHAR(64) NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT,
    order_id INT,
    message_type ENUM('text', 'image', 'file', 'location', 'system') DEFAULT 'text',
    content TEXT,
    attachments JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Connexions WebSocket
CREATE TABLE ws_connections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    connection_id VARCHAR(128) NOT NULL UNIQUE,
    user_type VARCHAR(50),
    status ENUM('connected', 'disconnected') DEFAULT 'connected',
    meta JSON,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_connection_id (connection_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Avis et évaluations
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    target_type ENUM('menu', 'product', 'driver', 'restaurant') NOT NULL,
    target_id INT NOT NULL,
    order_id INT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_rating (rating),
    INDEX idx_order_id (order_id),
    INDEX idx_approved (approved)
) ENGINE=InnoDB;

-- Coupons et promotions
CREATE TABLE coupons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('percentage', 'fixed', 'free_shipping') DEFAULT 'percentage',
    value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0.00,
    max_discount_amount DECIMAL(10,2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1,
    start_date DATE,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_active (active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- Utilisation des coupons
CREATE TABLE coupon_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    coupon_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    INDEX idx_coupon_id (coupon_id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB;

-- Paramètres de l'application
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'integer', 'boolean', 'json', 'array') DEFAULT 'string',
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key),
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- Statistiques et analytiques
CREATE TABLE statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric VARCHAR(100) NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    dimension VARCHAR(100),
    period DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_period (metric, period),
    INDEX idx_period (period)
) ENGINE=InnoDB;

-- =================== DONNÉES INITIALES ===================

-- Insertion des catégories
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Plats Principaux', 'plats-principaux', 'Nos plats principaux traditionnels', 1),
('Entrées', 'entrees', 'Entrées et apéritifs', 2),
('Desserts', 'desserts', 'Desserts sucrés', 3),
('Boissons', 'boissons', 'Boissons fraîches', 4),
('Snacks', 'snacks', 'Snacks et encas', 5),
('Condiments', 'condiments', 'Sauces et condiments', 6),
('Accompagnements', 'accompagnements', 'Accompagnements traditionnels', 7),
('Épices', 'epices', 'Épices et assaisonnements', 8),
('Robes', 'robes', 'Collection de robes', 9),
('Accessoires', 'accessoires', 'Accessoires de mode', 10);

-- Insertion des paramètres
INSERT INTO settings (setting_key, setting_value, setting_type, category, description) VALUES
('app_name', 'Titi Golden Taste', 'string', 'general', 'Nom de l\'application'),
('delivery_fee', '1000', 'integer', 'delivery', 'Frais de livraison par défaut'),
('tax_rate', '18', 'integer', 'general', 'Taux de TVA (%)'),
('currency', 'XOF', 'string', 'general', 'Devise principale'),
('min_order_amount', '5000', 'integer', 'orders', 'Montant minimum de commande'),
('max_delivery_distance', '20', 'integer', 'delivery', 'Distance max de livraison (km)'),
('order_preparation_time', '30', 'integer', 'restaurant', 'Temps de préparation moyen (min)'),
('business_hours', '{"open": "08:00", "close": "23:00"}', 'json', 'restaurant', 'Heures d\'ouverture'),
('driver_commission_rate', '20', 'integer', 'drivers', 'Commission des livreurs (%)'),
('support_email', 'support@titigoldentaste.com', 'string', 'contact', 'Email de support'),
('support_phone', '+223 76 00 00 00', 'string', 'contact', 'Téléphone de support'),
('facebook_url', 'https://facebook.com/titigoldentaste', 'string', 'social', 'Page Facebook'),
('instagram_url', 'https://instagram.com/titigoldentaste', 'string', 'social', 'Compte Instagram'),
('app_version', '1.0.0', 'string', 'general', 'Version de l\'application');

-- Insertion des utilisateurs de test (mot de passe pour tous: Password123!)
INSERT INTO users (first_name, last_name, email, password, role, phone, address, city, quarter, verified, active) VALUES
('Admin', 'System', 'admin@titigoldentaste.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', '760000000', 'Siège social', 'Bamako', 'ACI 2000', TRUE, TRUE),
('Client', 'Test', 'client@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', '760000001', 'Rue 123, Quartier XYZ', 'Bamako', 'Badalabougou', TRUE, TRUE),
('Livreur', 'Test', 'livreur@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'livreur', '760000002', 'Avenue 456', 'Bamako', 'Hamdallaye', TRUE, TRUE),
('Restaurant', 'Manager', 'restaurant@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'restaurant', '760000003', 'Boulevard 789', 'Bamako', 'Niamakoro', TRUE, TRUE);

-- Insertion d'un livreur approuvé
INSERT INTO drivers (user_id, id_document, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate, status, available, rating, total_deliveries) VALUES
(3, '/uploads/documents/id_livreur.pdf', 'moto', 'Yamaha', 'Crypton', 'ML-1234-AB', 'approved', TRUE, 4.5, 25);

-- Insertion des plats du menu
INSERT INTO menu (name, description, short_description, price, category_id, preparation_time, is_today_special, is_featured, image_url) VALUES
('Poulet DG', 'Poulet sauté aux légumes et plantain, spécialité malienne', 'Poulet sauté aux légumes', 7500.00, 1, 25, TRUE, TRUE, '/assets/images/menu/poulet-dg.jpg'),
('Riz au Gras', 'Riz préparé avec viande et légumes frais', 'Riz à la viande et légumes', 5000.00, 1, 20, FALSE, TRUE, '/assets/images/menu/riz-gras.jpg'),
('Alloco Poisson Braisé', 'Banane plantain frite avec poisson braisé et sauce pimentée', 'Alloco avec poisson', 6000.00, 1, 30, FALSE, FALSE, '/assets/images/menu/alloco-poisson.jpg'),
('Attiéké Poisson Frit', 'Semoule de manioc avec poisson frit et sauce tomate', 'Attiéké poisson frit', 5500.00, 1, 25, FALSE, FALSE, '/assets/images/menu/attiéke-poisson.jpg'),
('Kedjenou de Poulet', 'Poulet mijoté aux légumes et épices traditionnelles', 'Poulet mijoté aux légumes', 7000.00, 1, 35, FALSE, TRUE, '/assets/images/menu/kedjenou.jpg'),
('Sauce Gombo', 'Sauce traditionnelle au gombo avec viande', 'Sauce gombo avec viande', 4500.00, 1, 40, FALSE, FALSE, '/assets/images/menu/sauce-gombo.jpg'),
('Brochette de Boeuf', 'Brochettes de bœuf mariné grillées au charbon', 'Brochettes de bœuf', 3000.00, 2, 15, FALSE, FALSE, '/assets/images/menu/brochette.jpg'),
('Accra Banane', 'Beignets de banane plantain', 'Beignets de banane', 1500.00, 2, 10, FALSE, FALSE, '/assets/images/menu/accra.jpg'),
('Bissap Frais', 'Jus d\'hibiscus frais sucré', 'Jus d\'hibiscus', 1500.00, 4, 5, FALSE, FALSE, '/assets/images/menu/bissap.jpg'),
('Dessert Banane Flambée', 'Banane flambée au rhum et glace vanille', 'Banane flambée', 3500.00, 3, 10, FALSE, TRUE, '/assets/images/menu/banane-flambee.jpg');

-- Insertion des produits boutique
INSERT INTO products (name, slug, description, short_description, sku, price, compare_price, category_id, stock_quantity, main_image, status, is_featured) VALUES
('Robe Africaine Élégante', 'robe-africaine-elegante', 'Robe africaine moderne avec motifs traditionnels, tissu wax de qualité', 'Robe africaine en wax', 'RB-001', 45000.00, 52000.00, 9, 10, '/assets/images/shop/robes/robe-africaine.jpg', 'active', TRUE),
('Robe Soirée Satinée', 'robe-soiree-satinee', 'Robe de soirée en satin avec finition brillante, coupe ajustée', 'Robe de soirée en satin', 'RB-002', 65000.00, NULL, 9, 8, '/assets/images/shop/robes/robe-soiree.jpg', 'active', TRUE),
('Robe Bohème Dentelle', 'robe-boheme-dentelle', 'Robe bohème avec détails en dentelle raffinée, tissu léger', 'Robe bohème dentelle', 'RB-003', 48000.00, NULL, 9, 7, '/assets/images/shop/robes/robe-boheme.jpg', 'active', FALSE),
('Sac en Pagne Artisanal', 'sac-pagne-artisanal', 'Sac à main artisanal en tissu pagne traditionnel', 'Sac artisanal en pagne', 'AC-001', 18000.00, 22000.00, 10, 15, '/assets/images/shop/accessoires/sac-pagne.jpg', 'active', TRUE),
('Collier Perles Africaines', 'collier-perles-africaines', 'Collier traditionnel en perles africaines multicolores', 'Collier perles africaines', 'AC-002', 12000.00, NULL, 10, 20, '/assets/images/shop/accessoires/collier-perles.jpg', 'active', FALSE),
('Boucles d\'Oreilles Élégantes', 'boucles-oreilles-elegantes', 'Boucles d\'oreilles en or avec motifs africains', 'Boucles d\'oreilles or', 'AC-003', 15000.00, 18000.00, 10, 12, '/assets/images/shop/accessoires/boucles-oreilles.jpg', 'active', TRUE),
('Sauce Piment Maison', 'sauce-piment-maison', 'Sauce pimentée maison préparée avec des piments frais', 'Sauce piment maison', 'FD-001', 1500.00, NULL, 6, 50, '/assets/images/shop/food/sauce-piment.jpg', 'active', TRUE),
('Attiéké Traditionnel 1kg', 'attieke-traditionnel-1kg', 'Attiéké traditionnel 1kg, prêt à consommer', 'Attiéké 1kg', 'FD-002', 2000.00, NULL, 7, 30, '/assets/images/shop/food/attieke.jpg', 'active', FALSE),
('Huile Rouge 1L', 'huile-rouge-1l', 'Huile de palme rouge 1L, produit local', 'Huile rouge 1L', 'FD-003', 2500.00, 3000.00, 6, 20, '/assets/images/shop/food/huile-rouge.jpg', 'active', TRUE),
('Gombo Séché 250g', 'gombo-seche-250g', 'Gombo séché 250g, idéal pour les sauces', 'Gombo séché 250g', 'FD-004', 1800.00, NULL, 8, 40, '/assets/images/shop/food/gombo-seche.jpg', 'active', FALSE);

-- Insertion du statut live initial
INSERT INTO live_status (status, message, estimated_wait_time, updated_by) VALUES
('open', 'Le restaurant est ouvert', 30, 1);

-- Insertion des coupons
INSERT INTO coupons (code, type, value, min_order_amount, usage_limit, start_date, end_date, active) VALUES
('BIENVENUE10', 'percentage', 10.00, 10000.00, 100, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), TRUE),
('LIVRAISONGRATUITE', 'free_shipping', 0.00, 15000.00, 50, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 60 DAY), TRUE),
('SOLDES20', 'percentage', 20.00, 20000.00, NULL, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), TRUE),
('FIDELITE5000', 'fixed', 5000.00, 25000.00, NULL, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY), TRUE);

-- =================== VUES UTILES ===================

-- Vue des détails utilisateurs
CREATE OR REPLACE VIEW view_user_details AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.address,
    u.city,
    u.quarter,
    u.avatar,
    u.role,
    u.verified,
    u.active,
    u.created_at,
    -- Informations livreur si applicable
    d.status as driver_status,
    d.vehicle_type,
    d.rating as driver_rating,
    d.total_deliveries
FROM users u
LEFT JOIN drivers d ON u.id = d.user_id;

-- Vue des commandes détaillées
CREATE OR REPLACE VIEW view_order_details AS
SELECT 
    o.id,
    o.order_number,
    o.user_id,
    o.customer_name,
    o.customer_phone,
    o.delivery_address,
    o.status,
    o.payment_status,
    o.payment_method,
    o.total,
    o.created_at,
    o.estimated_delivery_time,
    -- Informations client
    u.first_name as customer_first_name,
    u.last_name as customer_last_name,
    u.email as customer_email,
    -- Informations livreur
    d.user_id as driver_user_id,
    du.first_name as driver_first_name,
    du.phone as driver_phone,
    d.vehicle_type
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN drivers d ON o.driver_id = d.id
LEFT JOIN users du ON d.user_id = du.id;

-- Vue des statistiques produits
CREATE OR REPLACE VIEW view_product_stats AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock_quantity,
    p.status,
    p.created_at,
    COUNT(oi.id) as total_sold,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.subtotal) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.item_id AND oi.item_type = 'product'
GROUP BY p.id;

-- =================== PROCÉDURES STOCKÉES ===================

DELIMITER $$

-- Procédure pour générer un numéro de commande
CREATE PROCEDURE generate_order_number(OUT new_order_number VARCHAR(50))
BEGIN
    DECLARE prefix VARCHAR(10) DEFAULT 'TGT';
    DECLARE date_part VARCHAR(8);
    DECLARE seq_num INT;
    
    SET date_part = DATE_FORMAT(NOW(), '%y%m%d');
    
    -- Trouver la dernière séquence du jour
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 10) AS UNSIGNED)), 0) + 1
    INTO seq_num
    FROM orders
    WHERE order_number LIKE CONCAT(prefix, date_part, '%');
    
    SET new_order_number = CONCAT(prefix, date_part, LPAD(seq_num, 4, '0'));
END$$

-- Procédure pour mettre à jour les stats d'un livreur
CREATE PROCEDURE update_driver_stats(IN p_driver_id INT)
BEGIN
    UPDATE drivers d
    SET 
        total_deliveries = (
            SELECT COUNT(*) 
            FROM orders 
            WHERE driver_id = p_driver_id 
            AND status = 'delivered'
        ),
        total_earnings = (
            SELECT COALESCE(SUM(delivery_fee), 0) 
            FROM orders 
            WHERE driver_id = p_driver_id 
            AND status = 'delivered'
        ),
        rating = (
            SELECT COALESCE(AVG(driver_rating), 0) 
            FROM orders 
            WHERE driver_id = p_driver_id 
            AND driver_rating IS NOT NULL
        )
    WHERE d.id = p_driver_id;
END$$

-- Procédure pour archiver les anciennes commandes
CREATE PROCEDURE archive_old_orders(IN days_old INT)
BEGIN
    DECLARE archive_date DATETIME;
    SET archive_date = DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    -- Mettre à jour le statut des anciennes commandes
    UPDATE orders 
    SET status = 'archived'
    WHERE status IN ('delivered', 'cancelled')
    AND updated_at < archive_date;
END$$

DELIMITER ;

-- =================== TRIGGERS ===================

DELIMITER $$

-- Trigger pour générer automatiquement le numéro de commande
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    DECLARE new_order_number VARCHAR(50);
    
    IF NEW.order_number IS NULL THEN
        CALL generate_order_number(new_order_number);
        SET NEW.order_number = new_order_number;
    END IF;
END$$

-- Trigger pour mettre à jour l'historique des statuts
CREATE TRIGGER after_order_status_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO order_status_history (order_id, status, changed_at)
        VALUES (NEW.id, NEW.status, NOW());
    END IF;
END$$

-- Trigger pour mettre à jour les stats des produits après commande
CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    -- Mettre à jour le stock des produits
    IF NEW.item_type = 'product' THEN
        UPDATE products 
        SET 
            stock_quantity = stock_quantity - NEW.quantity,
            purchase_count = purchase_count + NEW.quantity
        WHERE id = NEW.item_id;
    END IF;
END$$

-- Trigger pour mettre à jour le timestamp de last_seen
CREATE TRIGGER update_ws_last_seen
BEFORE UPDATE ON ws_connections
FOR EACH ROW
BEGIN
    SET NEW.last_seen = CURRENT_TIMESTAMP;
END$$

DELIMITER ;

-- =================== INDEX SUPPLEMENTAIRES ===================

-- Index pour les recherches avancées
CREATE INDEX idx_products_price_stock ON products(price, stock_quantity);
CREATE INDEX idx_orders_delivery_time ON orders(estimated_delivery_time, status);
CREATE INDEX idx_users_created_role ON users(created_at, role);
CREATE INDEX idx_orders_total_status ON orders(total, status);
CREATE INDEX idx_menu_price_category ON menu(price, category_id);

-- Index composites pour performances
CREATE INDEX idx_order_items_composite ON order_items(order_id, item_type, item_id);
CREATE INDEX idx_cart_items_composite ON cart_items(cart_id, item_type, item_id);
CREATE INDEX idx_messages_composite ON messages(conversation_id, created_at, is_read);

-- =================== VÉRIFICATION FINALE ===================

-- Afficher le résumé des tables
SELECT 
    '=== TABLES CRÉÉES ===' as section;

SELECT 
    TABLE_NAME as table_name,
    TABLE_ROWS as row_count,
    ROUND(DATA_LENGTH/1024/1024, 2) as size_mb,
    CREATE_TIME as created
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'titi_golden_taste'
ORDER BY TABLE_NAME;

-- Afficher le résumé des données
SELECT '=== RÉSUMÉ DES DONNÉES ===' as section;

SELECT 
    'Utilisateurs' as type,
    COUNT(*) as count,
    GROUP_CONCAT(DISTINCT role) as details
FROM users
UNION ALL
SELECT 
    'Livreurs',
    COUNT(*),
    CONCAT('Disponibles: ', SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END))
FROM drivers
UNION ALL
SELECT 
    'Produits',
    COUNT(*),
    CONCAT('En stock: ', SUM(stock_quantity))
FROM products
UNION ALL
SELECT 
    'Plats Menu',
    COUNT(*),
    CONCAT('Spéciaux du jour: ', SUM(CASE WHEN is_today_special = 1 THEN 1 ELSE 0 END))
FROM menu
UNION ALL
SELECT 
    'Coupons',
    COUNT(*),
    CONCAT('Actifs: ', SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END))
FROM coupons;

-- Message de confirmation
SELECT '✅ BASE DE DONNÉES TITI GOLDEN TASTE CRÉÉE AVEC SUCCÈS!' as message;