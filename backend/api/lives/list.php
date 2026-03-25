<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table lives existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('lives', $tables)) {
        // Créer la table lives si elle n'existe pas
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lives (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                status ENUM('live', 'ended', 'scheduled') DEFAULT 'scheduled',
                started_at TIMESTAMP NULL,
                viewers_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insérer quelques données de test
        $pdo->exec("
            INSERT INTO lives (title, status, viewers_count) VALUES
            ('Live Cuisine - Thieboudienne', 'ended', 150),
            ('Live Pâtisserie - Baklawa', 'scheduled', 0),
            ('Live Grillades - Brochettes', 'live', 85)
        ");
    }
    
    $stmt = $pdo->query("SELECT id, title, status, started_at, viewers_count FROM lives ORDER BY started_at DESC LIMIT 20");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([ 'success' => true, 'data' => $rows ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'message' => 'Impossible de récupérer les lives', 'debug' => $e->getMessage() ], JSON_UNESCAPED_UNICODE);
}

?>
