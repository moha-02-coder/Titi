<?php
// Test de connexion à la base de données
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

try {
    $pdo = getDatabaseConnection();
    
    // Test simple de connexion
    $version = $pdo->query("SELECT VERSION() as version")->fetch();
    
    // Vérification des tables
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    echo json_encode([
        'success' => true,
        'mysql_version' => $version['version'],
        'tables' => $tables,
        'database' => defined('DB_NAME') ? DB_NAME : 'unknown'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur de connexion',
        'debug' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
