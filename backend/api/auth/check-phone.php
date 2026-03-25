<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone'])) {
    echo json_encode(['success' => false, 'message' => 'Numero de telephone requis'], JSON_UNESCAPED_UNICODE);
    exit;
}

$phone = trim((string)$data['phone']);

try {
    $db = getDatabaseConnection();
    $stmt = $db->prepare('SELECT id FROM users WHERE phone = :phone LIMIT 1');
    $stmt->execute([':phone' => $phone]);

    $exists = (bool)$stmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'exists' => $exists,
        'message' => $exists ? 'Numero deja utilise' : 'Numero disponible'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . ((defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $e->getMessage() : 'connexion base de donnees')
    ], JSON_UNESCAPED_UNICODE);
}
?>