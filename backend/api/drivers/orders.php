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

    $type = isset($_GET['type']) ? strtolower((string)$_GET['type']) : 'active';
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

    drivers_ensure_orders_schema($pdo);
    $hasDriverId = drivers_orders_has_driver_id($pdo);
    if (!$hasDriverId) {
        drivers_resp(true, 'Schéma base: colonne orders.driver_id manquante (assignation indisponible)', ['orders' => []]);
    }

    $where = "o.driver_id = :driver_id";
    if ($type === 'active') {
        $where .= " AND o.status IN ('assigned','delivery','preparing','confirmed')";
    } elseif ($type === 'history') {
        $where .= " AND o.status IN ('completed','cancelled')";
    } elseif ($type === 'assigned') {
        $where .= " AND o.status = 'assigned'";
    } elseif ($type === 'available') {
        // Pour les commandes disponibles, ne pas filtrer par driver_id
        $where = "o.driver_id IS NULL AND o.status IN ('confirmed','preparing')";
    }

    $sql = "SELECT o.*, CONCAT(u.first_name,' ',u.last_name) as customer_name, u.phone as customer_phone, u.email as customer_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE $where
            ORDER BY o.created_at DESC
            LIMIT :limit";

    $stmt = $pdo->prepare($sql);
    if ($type === 'available') {
        // Pour les commandes disponibles, pas de driver_id à lier
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    } else {
        $stmt->bindValue('driver_id', $driverId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    }
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    drivers_resp(true, 'Commandes', ['orders' => $orders]);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
