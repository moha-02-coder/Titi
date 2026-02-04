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
    $driverId = (int)$ctx['driver']['driver_id'];

    $driverStatus = strtolower((string)($ctx['driver']['status'] ?? ''));
    if ($driverStatus !== 'approved') {
        drivers_resp(false, 'Compte livreur non approuvé', null, 403);
    }

    drivers_ensure_orders_schema($pdo);
    if (!drivers_orders_has_driver_id($pdo)) {
        drivers_resp(true, 'Schéma base: colonne orders.driver_id manquante (notifications indisponibles)', ['assigned' => [], 'server_time' => time()]);
    }

    $since = isset($_GET['since']) ? (int)$_GET['since'] : 0;
    $sinceTs = $since > 0 ? date('Y-m-d H:i:s', $since) : null;

    $sql = "SELECT o.*, CONCAT(u.first_name,' ',u.last_name) as customer_name, u.phone as customer_phone, u.email as customer_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.driver_id = :driver_id AND o.status = 'assigned'";
    if ($sinceTs) $sql .= " AND o.updated_at >= :since";
    $sql .= " ORDER BY o.updated_at DESC LIMIT 10";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue('driver_id', $driverId, PDO::PARAM_INT);
    if ($sinceTs) $stmt->bindValue('since', $sinceTs);
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    drivers_resp(true, 'Notifications', ['assigned' => $orders, 'server_time' => time()]);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
