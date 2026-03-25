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

if (!isset($data['email'])) {
    echo json_encode(['success' => false, 'message' => 'Email requis'], JSON_UNESCAPED_UNICODE);
    exit;
}

$email = trim((string)$data['email']);

try {
    $db = getDatabaseConnection();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);

    $exists = (bool)$stmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'exists' => $exists,
        'message' => $exists ? 'Email deja utilise' : 'Email disponible'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . ((defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $e->getMessage() : 'connexion base de donnees')
    ], JSON_UNESCAPED_UNICODE);
}
?>