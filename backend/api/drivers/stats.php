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

    if (!drivers_orders_has_driver_id($pdo)) {
        drivers_resp(true, 'Stats', ['today_deliveries' => 0, 'today_earnings' => 0, 'rating' => (float)($ctx['driver']['rating'] ?? 0), 'active_orders' => 0]);
    }

    $todayStmt = $pdo->prepare("SELECT COUNT(*) as c, COALESCE(SUM(final_price),0) as s
                               FROM orders
                               WHERE driver_id = :driver_id AND DATE(created_at) = CURDATE() AND status = 'completed'");
    $todayStmt->execute(['driver_id' => $driverId]);
    $today = $todayStmt->fetch(PDO::FETCH_ASSOC);

    $totalStmt = $pdo->prepare("SELECT COUNT(*) as c, COALESCE(SUM(final_price),0) as s
                               FROM orders
                               WHERE driver_id = :driver_id AND status = 'completed'");
    $totalStmt->execute(['driver_id' => $driverId]);
    $total = $totalStmt->fetch(PDO::FETCH_ASSOC);

    $activeStmt = $pdo->prepare("SELECT COUNT(*) as c FROM orders WHERE driver_id = :driver_id AND status IN ('assigned','delivery','confirmed','preparing')");
    $activeStmt->execute(['driver_id' => $driverId]);
    $active = $activeStmt->fetch(PDO::FETCH_ASSOC);

    drivers_resp(true, 'Stats', [
        'today_deliveries' => (int)($today['c'] ?? 0),
        'today_earnings' => (int)($today['s'] ?? 0),
        'rating' => (float)($ctx['driver']['rating'] ?? 0),
        'active_orders' => (int)($active['c'] ?? 0),
        'total_deliveries' => (int)($total['c'] ?? ($ctx['driver']['total_deliveries'] ?? 0)),
        'total_earnings' => (int)($total['s'] ?? 0),
        'avg_delivery_time' => 0,
        'satisfaction_rate' => 0
    ]);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
