<?php
/**
 * GET / POST - profile for current authenticated user
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../../config/database.php';

function resp($ok, $msg, $data = null, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $msg, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function extractBearer() {
    // Try common sources for Authorization header
    $a = '';
    if (function_exists('getallheaders')) {
        $h = getallheaders();
        $a = $h['Authorization'] ?? $h['authorization'] ?? '';
    }
    if (empty($a)) {
        $a = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }
    if (strpos($a, 'Bearer ') === 0) return substr($a, 7);
    return null;
}

function urlbase64_decode($input) {
    $remainder = strlen($input) % 4;
    if ($remainder) $input .= str_repeat('=', 4 - $remainder);
    $input = str_replace(['-', '_'], ['+', '/'], $input);
    return base64_decode($input);
}

function verifyJWT($token) {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h, $p, $s) = $parts;
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if (!hash_equals($expected, $s)) return false;
    $payloadJson = urlbase64_decode($p);
    if ($payloadJson === false) return false;
    $payload = json_decode($payloadJson, true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}

try {
    $token = extractBearer();
    if (!$token) resp(false, 'Token manquant', null, 401);
    $payload = verifyJWT($token);
    if (!$payload || empty($payload['user_id'])) resp(false, 'Token invalide', null, 401);

    $pdo = getDatabaseConnection();
    $userId = intval($payload['user_id']);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Try selecting extended profile columns; if some columns are missing
        // (older DB schema), fall back to a minimal set.
        $fullCols = ['id','first_name','last_name','email','phone','address','city','quarter','role','avatar','active','verified'];
        $minimalCols = ['id','first_name','last_name','email','phone','address','role','avatar','active','verified'];

        try {
            $stmt = $pdo->prepare("SELECT " . implode(', ', $fullCols) . " FROM users WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $userId]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $ex) {
            // Likely missing columns (SQLSTATE[42S22]) - try minimal selection
            try {
                $stmt = $pdo->prepare("SELECT " . implode(', ', $minimalCols) . " FROM users WHERE id = :id LIMIT 1");
                $stmt->execute(['id' => $userId]);
                $u = $stmt->fetch(PDO::FETCH_ASSOC);
            } catch (PDOException $ex2) {
                resp(false, 'Erreur base de données lors de la lecture du profil', null, 500);
            }
        }

        if (!$u) resp(false, 'Utilisateur introuvable', null, 404);
        if (isset($u['password'])) unset($u['password']);
        // If user is a driver, include driver-specific info
        if (isset($u['role']) && in_array($u['role'], ['livreur', 'delivery'])) {
            try {
                $drv = $pdo->prepare('SELECT id as driver_id, user_id, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate, status, available, rating, total_deliveries FROM drivers WHERE user_id = :uid LIMIT 1');
                $drv->execute(['uid' => $u['id']]);
                $driverInfo = $drv->fetch(PDO::FETCH_ASSOC);
                if ($driverInfo) {
                    $u['driver_info'] = $driverInfo;
                }
            } catch (Exception $e) {
                // ignore driver info errors
            }
        }

        resp(true, 'Profil récupéré', ['user' => $u]);
    }

    // POST - update profile (own profile)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!$data) resp(false, 'JSON invalide', null, 400);

        $fields = ['first_name','last_name','email','phone','address','city','quarter','avatar','password'];
        $updates = [];
        $params = ['id' => $userId];

        // Helper to check column existence to avoid SQL errors on older schemas
        $columnExists = function($table, $column) use ($pdo) {
            $q = $pdo->prepare("SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :col");
            $q->execute(['table' => $table, 'col' => $column]);
            $r = $q->fetch(PDO::FETCH_ASSOC);
            return intval($r['c'] ?? 0) > 0;
        };

        foreach ($fields as $f) {
            if (!isset($data[$f])) continue;
            if ($f === 'password') {
                if ($data['password'] !== '') {
                    $updates[] = "password = :password";
                    $params['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
                }
                continue;
            }
            // Only include update if column exists in schema
            if ($columnExists('users', $f)) {
                $updates[] = "$f = :$f";
                $params[$f] = $data[$f];
            }
        }

        if (empty($updates)) resp(false, 'Aucune donnée à mettre à jour', null, 400);

        // Check email uniqueness if email changed
        if (isset($params['email'])) {
            $q = $pdo->prepare("SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1");
            $q->execute(['email' => $params['email'], 'id' => $userId]);
            if ($q->fetch()) resp(false, 'Email déjà utilisé', null, 409);
        }

        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        try {
            $stmt->execute($params);
            resp(true, 'Profil mis à jour', ['id' => $userId]);
        } catch (Exception $e) {
            // include debug message in development
            if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
                resp(false, 'Erreur base de données: ' . $e->getMessage(), null, 500);
            }
            resp(false, 'Erreur base de données', null, 500);
        }
    }

    resp(false, 'Méthode non autorisée', null, 405);
} catch (Throwable $t) {
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
        resp(false, 'Exception: ' . $t->getMessage(), null, 500);
    }
    resp(false, 'Erreur serveur interne', null, 500);
}
