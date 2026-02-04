<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/common.php';

try {
    $pdo = getDatabaseConnection();
    $ctx = drivers_require_driver($pdo);
    $userId = (int)$ctx['user']['id'];

    if (!function_exists('drivers_table_exists') || !drivers_table_exists($pdo, 'messages')) {
        drivers_resp(false, 'Messagerie non disponible sur cette base', null, 400);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) drivers_resp(false, 'JSON invalide', null, 400);

    $message = trim((string)($data['message'] ?? ''));
    if ($message === '') drivers_resp(false, 'Message vide', null, 400);

    // send to the first admin user
    $adminStmt = $pdo->query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND active = 1 ORDER BY id ASC LIMIT 1");
    $adminId = (int)($adminStmt->fetchColumn() ?: 0);
    if (!$adminId) drivers_resp(false, 'Aucun admin disponible', null, 400);

    $conv = 'support';
    $stmt = $pdo->prepare('INSERT INTO messages (conversation_id, sender_id, receiver_id, content, type, created_at) VALUES (:c, :s, :r, :m, :t, NOW())');
    $stmt->execute(['c' => $conv, 's' => $userId, 'r' => $adminId, 'm' => $message, 't' => 'text']);

    drivers_resp(true, 'Message envoyé');
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
