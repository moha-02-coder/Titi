<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table recipes existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('recipes', $tables)) {
        // Créer la table recipes si elle n'existe pas
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS recipes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE,
                main_image VARCHAR(500),
                short_description TEXT,
                prep_time_min INT DEFAULT 30,
                difficulty ENUM('facile', 'moyen', 'difficile') DEFAULT 'facile',
                portions INT DEFAULT 4,
                visibility ENUM('public', 'private') DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insérer quelques données de test
        $pdo->exec("
            INSERT INTO recipes (name, slug, short_description, prep_time_min, difficulty, portions, visibility) VALUES
            ('Thieboudienne', 'thieboudienne', 'Plat traditionnel sénégalais', 45, 'moyen', 6, 'public'),
            ('Yassa Poulet', 'yassa-poulet', 'Poulet mariné aux oignons', 40, 'facile', 4, 'public'),
            ('Mafé', 'mafe', 'Sauce arachide béninoise', 35, 'facile', 5, 'public')
        ");
    }
    
    $stmt = $pdo->query("SELECT id, name, slug, main_image, short_description, prep_time_min, difficulty, portions, visibility FROM recipes WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 100");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([ 'success' => true, 'data' => $rows ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'message' => 'Impossible de récupérer les recettes', 'debug' => $e->getMessage() ], JSON_UNESCAPED_UNICODE);
}

?>
