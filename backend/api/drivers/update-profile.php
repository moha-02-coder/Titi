<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/common.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        drivers_resp(false, 'Méthode non autorisée', null, 405);
    }

    $pdo = getDatabaseConnection();
    $ctx = drivers_require_driver($pdo);
    $userId = (int)($ctx['user']['id'] ?? 0);
    if (!$userId) {
        drivers_resp(false, 'Utilisateur introuvable', null, 404);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) {
        drivers_resp(false, 'JSON invalide', null, 400);
    }

    $allowed = ['first_name','last_name','email','phone','address','marital_status','profession'];
    $updates = [];
    $params = ['id' => $userId];

    foreach ($allowed as $f) {
        if (!array_key_exists($f, $data)) continue;
        if (!drivers_has_column($pdo, 'users', $f)) continue;
        $updates[] = "$f = :$f";
        $params[$f] = is_string($data[$f]) ? trim($data[$f]) : $data[$f];
    }

    if (!$updates) {
        drivers_resp(false, 'Aucune donnée à mettre à jour', null, 400);
    }

    if (isset($params['email']) && $params['email'] !== '') {
        $q = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1');
        $q->execute(['email' => $params['email'], 'id' => $userId]);
        if ($q->fetch()) {
            drivers_resp(false, 'Email déjà utilisé', null, 409);
        }
    }

    $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Return updated user + driver snapshot
    $ctx2 = drivers_require_driver($pdo);
    drivers_resp(true, 'Profil mis à jour', [
        'user' => $ctx2['user'],
        'driver' => $ctx2['driver'],
    ]);

} catch (Throwable $t) {
    error_log('[drivers/update-profile] ' . $t->getMessage());
    $debug = (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : null;
    drivers_resp(false, 'Erreur serveur', ['debug' => $debug], 500);
}
