<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/common.php';

try {
    $pdo = getDatabaseConnection();
    $ctx = drivers_require_driver($pdo);
    $userId = (int)$ctx['user']['id'];

    if (!function_exists('drivers_table_exists') || !drivers_table_exists($pdo, 'messages')) {
        drivers_resp(true, 'Messages', []);
    }

    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;
    $conv = 'support';

    $sql = "SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.content, m.type, m.attachments, m.read_at, m.created_at,
                   CONCAT(us.first_name,' ',us.last_name) as sender_name
            FROM messages m
            LEFT JOIN users us ON us.id = m.sender_id
            WHERE m.conversation_id = :c AND (m.sender_id = :uid OR m.receiver_id = :uid)
            ORDER BY m.created_at DESC
            LIMIT :limit";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue('c', $conv);
    $stmt->bindValue('uid', $userId, PDO::PARAM_INT);
    $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    drivers_resp(true, 'Messages', $rows);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
