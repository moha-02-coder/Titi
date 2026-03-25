<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

// Mettre à jour la table menu pour inclure les likes et les vedettes
try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table menu_items existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('menu_items', $tables)) {
        // Créer la table menu_items avec support pour les likes et vedettes
        $pdo->exec("
            CREATE TABLE menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) DEFAULT 0,
                category VARCHAR(100),
                image_url VARCHAR(500),
                video_url VARCHAR(500),
                video_type ENUM('upload', 'youtube', 'vimeo', 'tiktok') DEFAULT 'upload',
                is_available BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                likes_count INT DEFAULT 0,
                preparation_time INT DEFAULT 15,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Ajouter quelques données de test avec likes
        $pdo->exec("
            INSERT INTO menu_items (name, description, price, category, image_url, likes_count, is_featured) VALUES
            ('Thieboudienne', 'Plat traditionnel sénégalais au poisson', 3500, 'plats', '/assets/images/thieboudienne.jpg', 25, TRUE),
            ('Yassa Poulet', 'Poulet mariné aux oignons et citron', 3000, 'plats', '/assets/images/yassa.jpg', 18, TRUE),
            ('Mafé', 'Sauce arachide béninoise avec viande', 2800, 'plats', '/assets/images/mafe.jpg', 12, FALSE),
            ('Boulettes de poisson', 'Boulettes fraîches sauce tomate', 2500, 'entrées', '/assets/images/boulettes.jpg', 8, FALSE),
            ('Attiéké poisson', 'Semoule de manioc au poisson fumé', 2200, 'plats', '/assets/images/attieke.jpg', 15, TRUE),
            ('Salade tropicale', 'Mélange de fruits exotiques frais', 1500, 'desserts', '/assets/images/salade.jpg', 6, FALSE)
        ");
        
    } else {
        // Ajouter les colonnes manquantes si elles n'existent pas
        $columns = getTableColumns($pdo, 'menu_items');
        
        if (!in_array('likes_count', $columns)) {
            $pdo->exec("ALTER TABLE menu_items ADD COLUMN likes_count INT DEFAULT 0");
        }
        
        if (!in_array('is_featured', $columns)) {
            $pdo->exec("ALTER TABLE menu_items ADD COLUMN is_featured BOOLEAN DEFAULT FALSE");
        }
        
        if (!in_array('video_url', $columns)) {
            $pdo->exec("ALTER TABLE menu_items ADD COLUMN video_url VARCHAR(500)");
        }
        
        if (!in_array('video_type', $columns)) {
            $pdo->exec("ALTER TABLE menu_items ADD COLUMN video_type ENUM('upload', 'youtube', 'vimeo', 'tiktok') DEFAULT 'upload'");
        }
    }
    
    // Mettre à jour les produits existants pour avoir des likes aléatoires
    if (in_array('menu_items', $tables)) {
        $stmt = $pdo->query("SELECT id FROM menu_items WHERE likes_count = 0");
        $items = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($items as $itemId) {
            $randomLikes = rand(0, 30);
            $isFeatured = $randomLikes > 15;
            
            $updateStmt = $pdo->prepare("
                UPDATE menu_items 
                SET likes_count = :likes, is_featured = :featured 
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':likes' => $randomLikes,
                ':featured' => $isFeatured,
                ':id' => $itemId
            ]);
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Base de données mise à jour avec succès',
        'data' => [
            'tables_created' => !in_array('menu_items', $tables),
            'columns_added' => true,
            'sample_data_added' => !in_array('menu_items', $tables)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur lors de la mise à jour de la base de données',
        'debug' => $e->getMessage()
    ]);
}
?>
