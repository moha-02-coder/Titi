<?php
require_once __DIR__ . '/../../config/database.php';

$pdo = getDatabaseConnection();
try {
    $stmt = $pdo->query("SELECT id, title, status, started_at, viewers_count FROM lives ORDER BY started_at DESC LIMIT 20");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([ 'success' => true, 'data' => $rows ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'message' => 'Impossible de récupérer les lives', 'debug' => $e->getMessage() ], JSON_UNESCAPED_UNICODE);
}

?>
