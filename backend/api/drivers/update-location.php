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

    $lat = isset($data['lat']) ? (float)$data['lat'] : null;
    $lng = isset($data['lng']) ? (float)$data['lng'] : null;
    if ($lat === null || $lng === null) drivers_resp(false, 'Coordonnées manquantes', null, 400);

    $stmt = $pdo->prepare('UPDATE drivers SET current_lat = :lat, current_lng = :lng, last_location_update = NOW() WHERE id = :id');
    $stmt->execute(['lat' => $lat, 'lng' => $lng, 'id' => $driverId]);

    drivers_resp(true, 'Localisation mise à jour', ['lat' => $lat, 'lng' => $lng]);
} catch (Throwable $t) {
    error_log('[drivers/update-location] ' . $t->getMessage());
    $debug = (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : null;
    drivers_resp(false, 'Erreur serveur', ['debug' => $debug], 500);
}
