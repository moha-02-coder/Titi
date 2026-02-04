<?php
require_once __DIR__ . '/../../config/database.php';

$pdo = getDatabaseConnection();

try {
    $stmt = $pdo->query("SELECT id, name, slug, main_image, short_description, prep_time_min, difficulty, portions, visibility FROM recipes WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 100");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([ 'success' => true, 'data' => $rows ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'message' => 'Impossible de récupérer les recettes', 'debug' => $e->getMessage() ], JSON_UNESCAPED_UNICODE);
}

?>
