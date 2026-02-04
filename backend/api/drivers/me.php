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
    drivers_resp(true, 'Livreur', [
        'user' => $ctx['user'],
        'driver' => $ctx['driver'],
    ]);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
