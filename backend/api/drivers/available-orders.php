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

    $driverStatus = strtolower((string)($ctx['driver']['status'] ?? ''));
    if ($driverStatus !== 'approved') {
        drivers_resp(false, 'Compte livreur non approuvé', null, 403);
    }

    if (!drivers_table_exists($pdo, 'orders') || !drivers_table_exists($pdo, 'users')) {
        drivers_resp(true, 'Commandes disponibles', ['orders' => []]);
    }

    // Ensure schema (driver_id required for claim/assign flows)
    drivers_ensure_orders_schema($pdo);
    if (!drivers_orders_has_driver_id($pdo)) {
        drivers_resp(false, 'Schéma base: colonne orders.driver_id manquante (migration impossible)', null, 500);
    }

    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

    $since = isset($_GET['since']) ? (int)$_GET['since'] : 0;
    $sinceTs = $since > 0 ? date('Y-m-d H:i:s', $since) : null;

    $sql = "SELECT o.*, 
                   CONCAT(u.first_name,' ',u.last_name) as customer_name,
                   u.phone as customer_phone,
                   u.email as customer_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE (o.driver_id IS NULL OR o.driver_id = 0)
              AND o.status IN ('pending','confirmed','preparing')
    ";

    if ($sinceTs) {
        $sql .= " AND o.created_at >= :since";
    }

    $sql .= " ORDER BY o.created_at ASC
            LIMIT :limit";

    $stmt = $pdo->prepare($sql);
    if ($sinceTs) $stmt->bindValue('since', $sinceTs);
    $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    drivers_resp(true, 'Commandes disponibles', ['orders' => $orders, 'server_time' => time()]);

} catch (Throwable $t) {
    error_log('[drivers/available-orders] ' . $t->getMessage());
    drivers_resp(false, 'Erreur serveur', null, 500);
}
