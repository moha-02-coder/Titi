<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../../config/database.php';

function resp($success, $message = '', $data = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => (bool)$success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function ensure_customization_schema(PDO $pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS customization_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type_active (type, active),
        INDEX idx_sort (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
}

function ensure_default_options(PDO $pdo) {
    $count = 0;
    try {
        $stmt = $pdo->query('SELECT COUNT(*) AS c FROM customization_options');
        $count = (int)($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
    } catch (Throwable $e) { $count = 0; }

    if ($count > 0) return;

    $defaults = [
        ['type' => 'side', 'name' => 'Attiéké', 'price' => 0, 'active' => 1, 'sort_order' => 10],
        ['type' => 'side', 'name' => 'Alloco', 'price' => 0, 'active' => 1, 'sort_order' => 20],
        ['type' => 'side', 'name' => 'Riz', 'price' => 0, 'active' => 1, 'sort_order' => 30],
        ['type' => 'side', 'name' => 'Frites', 'price' => 0, 'active' => 1, 'sort_order' => 40],
        ['type' => 'sauce', 'name' => 'Sauce piment', 'price' => 0, 'active' => 1, 'sort_order' => 10],
        ['type' => 'sauce', 'name' => 'Sauce tomate', 'price' => 0, 'active' => 1, 'sort_order' => 20],
        ['type' => 'sauce', 'name' => 'Sauce oignon', 'price' => 0, 'active' => 1, 'sort_order' => 30],
        ['type' => 'sauce', 'name' => 'Sauce arachide', 'price' => 0, 'active' => 1, 'sort_order' => 40]
    ];

    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare('INSERT INTO customization_options (type, name, price, active, sort_order) VALUES (:type,:name,:price,:active,:sort_order)');
        foreach ($defaults as $d) {
            $ins->execute([
                'type' => $d['type'],
                'name' => $d['name'],
                'price' => (int)$d['price'],
                'active' => (int)$d['active'],
                'sort_order' => (int)$d['sort_order']
            ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        try { $pdo->rollBack(); } catch (Throwable $x) {}
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        resp(false, 'Méthode non autorisée', null, 405);
    }

    $pdo = getDatabaseConnection();
    ensure_customization_schema($pdo);
    ensure_default_options($pdo);

    $type = isset($_GET['type']) ? strtolower(trim((string)$_GET['type'])) : '';
    $activeOnly = !isset($_GET['active']) || (int)$_GET['active'] === 1;

    $where = [];
    $params = [];

    if ($type !== '') {
        if (!in_array($type, ['side', 'sauce'], true)) {
            resp(false, 'type invalide', null, 400);
        }
        $where[] = 'type = :type';
        $params['type'] = $type;
    }

    if ($activeOnly) {
        $where[] = 'active = 1';
    }

    $sql = 'SELECT id, type, name, price, active, sort_order FROM customization_options';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY sort_order ASC, name ASC, id ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    resp(true, 'Options', ['options' => $rows]);

} catch (Throwable $t) {
    resp(false, 'Erreur serveur', null, 500);
}
