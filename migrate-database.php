<?php
/**
 * Script de migration de la base de données
 * Convertit la structure MySQL vers PostgreSQL pour Render.com
 */

require_once 'database-config.php';

try {
    $pdo = getDatabaseConnection();
    
    echo "Début de la migration de la base de données...\n";
    
    // Création des tables pour PostgreSQL
    $tables = [
        // Table users
        "CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(191) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'admin', 'livreur')),
            avatar VARCHAR(255),
            phone VARCHAR(30),
            verified BOOLEAN DEFAULT FALSE,
            address TEXT,
            newsletter BOOLEAN DEFAULT FALSE,
            last_login TIMESTAMP,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table sessions
        "CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_token VARCHAR(128) NOT NULL,
            ip VARCHAR(45),
            user_agent VARCHAR(255),
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table password_resets
        "CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reset_token VARCHAR(128) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table jwt_blacklist
        "CREATE TABLE IF NOT EXISTS jwt_blacklist (
            id SERIAL PRIMARY KEY,
            jti VARCHAR(128) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table menu_categories
        "CREATE TABLE IF NOT EXISTS menu_categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            image VARCHAR(255),
            display_order INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table menu_items
        "CREATE TABLE IF NOT EXISTS menu_items (
            id SERIAL PRIMARY KEY,
            category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            image VARCHAR(255),
            ingredients TEXT,
            allergens TEXT,
            spicy BOOLEAN DEFAULT FALSE,
            vegetarian BOOLEAN DEFAULT FALSE,
            display_order INTEGER DEFAULT 0,
            available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table orders
        "CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            order_number VARCHAR(50) UNIQUE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'delivery', 'completed', 'cancelled')),
            subtotal DECIMAL(10,2) NOT NULL,
            delivery_fee DECIMAL(10,2) DEFAULT 0,
            tax_amount DECIMAL(10,2) DEFAULT 0,
            total_amount DECIMAL(10,2) NOT NULL,
            delivery_address TEXT,
            delivery_notes TEXT,
            payment_method VARCHAR(50),
            payment_status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table order_items
        "CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('menu', 'product')),
            item_id INTEGER NOT NULL,
            name VARCHAR(200) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            quantity INTEGER NOT NULL,
            customization TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table products
        "CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(100),
            image VARCHAR(255),
            stock INTEGER DEFAULT 0,
            min_stock INTEGER DEFAULT 5,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Table drivers
        "CREATE TABLE IF NOT EXISTS drivers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            vehicle_type VARCHAR(50),
            license_plate VARCHAR(20),
            phone VARCHAR(30),
            status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),
            current_location JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    ];
    
    // Exécuter la création des tables
    foreach ($tables as $sql) {
        $pdo->exec($sql);
        echo "✓ Table créée avec succès\n";
    }
    
    // Créer un admin par défaut si aucun n'existe
    $adminCheck = $pdo->query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")->fetch();
    
    if ($adminCheck['count'] == 0) {
        $adminPassword = password_hash('admin123', PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password, role, verified, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute(['Admin', 'User', 'admin@titi-golden-taste.ci', $adminPassword, 'admin', true, true]);
        echo "✓ Administrateur par défaut créé (admin@titi-golden-taste.ci / admin123)\n";
    }
    
    echo "\n🎉 Migration terminée avec succès !\n";
    
} catch (Exception $e) {
    echo "❌ Erreur lors de la migration: " . $e->getMessage() . "\n";
    exit(1);
}
?>
