<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

function extractBearerToken() {
    $h = getallheaders();
    $a = $h['Authorization'] ?? $h['authorization'] ?? '';
    if (strpos($a, 'Bearer ') === 0) return substr($a, 7);
    return null;
}

function verifyJWTToken($token) {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h, $p, $s) = $parts;
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if (!hash_equals($expected, $s)) return false;
    $payload = json_decode(base64_decode($p), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}

function requireAdmin(PDO $pdo) {
    $token = extractBearerToken();
    if (!$token) resp(false, 'Authentification requise', null, 401);

    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) resp(false, 'Token invalide', null, 401);

    $stmt = $pdo->prepare('SELECT id, role, active FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => (int)$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) resp(false, 'Utilisateur introuvable', null, 401);

    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) resp(false, 'Accès non autorisé', null, 403);

    return $user;
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

try {
    $pdo = getDatabaseConnection();
    requireAdmin($pdo);
    ensure_customization_schema($pdo);

    $method = $_SERVER['REQUEST_METHOD'];
    $effectiveMethod = $method;
    if ($method === 'POST' && isset($_POST['_method'])) {
        $m = strtoupper((string)$_POST['_method']);
        if (in_array($m, ['PUT', 'DELETE'], true)) $effectiveMethod = $m;
    }

    if ($effectiveMethod === 'GET') {
        $type = isset($_GET['type']) ? strtolower(trim((string)$_GET['type'])) : '';
        $where = [];
        $params = [];

        if ($type !== '') {
            if (!in_array($type, ['side', 'sauce'], true)) resp(false, 'type invalide', null, 400);
            $where[] = 'type = :type';
            $params['type'] = $type;
        }

        $sql = 'SELECT id, type, name, price, active, sort_order, created_at, updated_at FROM customization_options';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY sort_order ASC, name ASC, id ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        resp(true, 'Options', ['options' => $rows]);
    }

    if ($effectiveMethod === 'POST') {
        $type = isset($_POST['type']) ? strtolower(trim((string)$_POST['type'])) : '';
        $name = isset($_POST['name']) ? trim((string)$_POST['name']) : '';
        $price = isset($_POST['price']) ? (int)$_POST['price'] : 0;
        $active = isset($_POST['active']) ? (int)$_POST['active'] : 1;
        $sort = isset($_POST['sort_order']) ? (int)$_POST['sort_order'] : 0;

        if (!in_array($type, ['side', 'sauce'], true) || $name === '') {
            resp(false, 'Paramètres invalides', null, 400);
        }

        $stmt = $pdo->prepare('INSERT INTO customization_options (type, name, price, active, sort_order) VALUES (:type,:name,:price,:active,:sort)');
        $stmt->execute([
            'type' => $type,
            'name' => $name,
            'price' => $price,
            'active' => $active ? 1 : 0,
            'sort' => $sort
        ]);

        resp(true, 'Option créée', ['id' => (int)$pdo->lastInsertId()]);
    }

    if ($effectiveMethod === 'PUT') {
        if (!isset($_POST['id'])) resp(false, 'id requis', null, 400);
        $id = (int)$_POST['id'];
        if (!$id) resp(false, 'id invalide', null, 400);

        $fields = [];
        $params = ['id' => $id];

        if (isset($_POST['type'])) {
            $type = strtolower(trim((string)$_POST['type']));
            if (!in_array($type, ['side', 'sauce'], true)) resp(false, 'type invalide', null, 400);
            $fields[] = 'type = :type';
            $params['type'] = $type;
        }
        if (isset($_POST['name'])) {
            $name = trim((string)$_POST['name']);
            if ($name === '') resp(false, 'name requis', null, 400);
            $fields[] = 'name = :name';
            $params['name'] = $name;
        }
        if (isset($_POST['price'])) {
            $fields[] = 'price = :price';
            $params['price'] = (int)$_POST['price'];
        }
        if (isset($_POST['active'])) {
            $fields[] = 'active = :active';
            $params['active'] = ((int)$_POST['active']) ? 1 : 0;
        }
        if (isset($_POST['sort_order'])) {
            $fields[] = 'sort_order = :sort';
            $params['sort'] = (int)$_POST['sort_order'];
        }

        if (!$fields) resp(false, 'Aucun champ à mettre à jour', null, 400);

        $sql = 'UPDATE customization_options SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        resp(true, 'Option mise à jour');
    }

    if ($effectiveMethod === 'DELETE') {
        $id = 0;
        if (isset($_GET['id'])) $id = (int)$_GET['id'];
        if (!$id && isset($_POST['id'])) $id = (int)$_POST['id'];
        if (!$id) resp(false, 'id requis', null, 400);

        $stmt = $pdo->prepare('DELETE FROM customization_options WHERE id = :id');
        $stmt->execute(['id' => $id]);

        resp(true, 'Option supprimée');
    }

    resp(false, 'Méthode non autorisée', null, 405);

} catch (Throwable $t) {
    resp(false, 'Erreur serveur', null, 500);
}
