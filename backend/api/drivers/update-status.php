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
    $driverId = (int)$ctx['driver']['driver_id'];

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) drivers_resp(false, 'JSON invalide', null, 400);

    $status = strtolower((string)($data['status'] ?? ''));
    if (!in_array($status, ['online','offline'], true)) drivers_resp(false, 'Statut invalide', null, 400);

    // Only approved drivers can go online
    $drvStatus = strtolower((string)($ctx['driver']['status'] ?? ''));
    if ($status === 'online' && $drvStatus !== 'approved') {
        drivers_resp(false, 'Votre compte n\'est pas approuvé', ['driver_status' => $drvStatus], 403);
    }

    $available = ($status === 'online') ? 1 : 0;
    $stmt = $pdo->prepare('UPDATE drivers SET available = :a WHERE id = :id');
    $stmt->execute(['a' => $available, 'id' => $driverId]);

    drivers_resp(true, 'Statut mis à jour', ['available' => $available]);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
