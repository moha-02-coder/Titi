<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

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
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentification requise'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id, role, active FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => (int)$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return $user;
}

function tableExists(PDO $pdo, $tableName) {
    try {
        $stmt = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t LIMIT 1');
        $stmt->execute(['t' => $tableName]);
        return (bool)$stmt->fetchColumn();
    } catch (Exception $e) {
        return false;
    }
}

function columnExists(PDO $pdo, $tableName, $columnName) {
    try {
        $stmt = $pdo->prepare('SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c LIMIT 1');
        $stmt->execute(['t' => $tableName, 'c' => $columnName]);
        return (bool)$stmt->fetchColumn();
    } catch (Exception $e) {
        return false;
    }
}

function ensureOrdersSchema(PDO $pdo) {
    if (!tableExists($pdo, 'orders')) return;

    if (!columnExists($pdo, 'orders', 'driver_id')) {
        try { $pdo->exec("ALTER TABLE orders ADD COLUMN driver_id INT NULL AFTER user_id"); } catch (Exception $e) {}
    }

    // Ensure orders.status supports 'assigned'
    try {
        $col = $pdo->query("SHOW COLUMNS FROM orders LIKE 'status'")->fetch(PDO::FETCH_ASSOC);
        $type = (string)($col['Type'] ?? '');
        if (stripos($type, 'enum(') === 0 && stripos($type, "'assigned'") === false) {
            $vals = trim(substr($type, 5));
            $vals = preg_replace('/\)\s*$/', '', $vals);
            $vals = trim((string)$vals);
            if ($vals !== '') {
                $new = 'enum(' . $vals . ",'assigned')";
                $default = (string)($col['Default'] ?? '');
                $defaultSql = $default !== '' ? " DEFAULT '" . str_replace("'", "\\'", $default) . "'" : '';
                $pdo->exec("ALTER TABLE orders MODIFY status $new NOT NULL$defaultSql");
            }
        }
    } catch (Exception $e) {}
}

function ensureDriversSchema(PDO $pdo) {
    if (!tableExists($pdo, 'drivers')) return;
    if (!columnExists($pdo, 'drivers', 'available')) {
        try { $pdo->exec("ALTER TABLE drivers ADD COLUMN available TINYINT(1) NOT NULL DEFAULT 0"); } catch (Exception $e) {}
    }
}

try {
    $pdo = getDatabaseConnection();
    requireAdmin($pdo);

    if (!tableExists($pdo, 'drivers') || !tableExists($pdo, 'orders')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tables drivers/orders manquantes'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    ensureDriversSchema($pdo);
    ensureOrdersSchema($pdo);

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) {
        $data = [];
    }

    $orderId = isset($data['order_id']) ? (int)$data['order_id'] : 0;

    $pdo->beginTransaction();
    try {
        // Pick an available approved driver
        $drvStmt = $pdo->prepare("SELECT id, user_id FROM drivers WHERE available = 1 AND status = 'approved' ORDER BY updated_at DESC, id ASC LIMIT 1 FOR UPDATE");
        $drvStmt->execute();
        $driver = $drvStmt->fetch(PDO::FETCH_ASSOC);
        if (!$driver) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Aucun livreur disponible'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Pick an order to assign
        if ($orderId > 0) {
            $ordStmt = $pdo->prepare("SELECT id, status, driver_id FROM orders WHERE id = :id LIMIT 1 FOR UPDATE");
            $ordStmt->execute(['id' => $orderId]);
            $order = $ordStmt->fetch(PDO::FETCH_ASSOC);
            if (!$order) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Commande introuvable'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            if (!empty($order['driver_id'])) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Commande déjà attribuée'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        } else {
            // Prefer confirmed/preparing, otherwise pending
            $ordStmt = $pdo->query("SELECT id, status, driver_id FROM orders WHERE (driver_id IS NULL OR driver_id = 0) AND status IN ('confirmed','preparing','pending') ORDER BY created_at ASC LIMIT 1 FOR UPDATE");
            $order = $ordStmt->fetch(PDO::FETCH_ASSOC);
            if (!$order) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Aucune commande disponible à assigner'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $orderId = (int)$order['id'];
        }

        // Assign
        $upd = $pdo->prepare("UPDATE orders SET driver_id = :driver_id, status = 'assigned', updated_at = NOW() WHERE id = :id");
        $upd->execute(['driver_id' => (int)$driver['id'], 'id' => $orderId]);

        // Mark driver as busy
        $pdo->prepare("UPDATE drivers SET available = 0, updated_at = NOW() WHERE id = :id")->execute(['id' => (int)$driver['id']]);

        $pdo->commit();
    } catch (Throwable $t) {
        $pdo->rollBack();
        throw $t;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Commande assignée',
        'data' => [
            'order_id' => $orderId,
            'driver_id' => (int)($driver['id'] ?? 0),
            'driver_user_id' => (int)($driver['user_id'] ?? 0),
            'status' => 'assigned'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $t) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur',
        'debug' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
