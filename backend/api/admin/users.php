<?php
/**
 * Admin users management (GET user by id, POST create, PUT update, DELETE deactivate)
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../../config/database.php';

function resp($ok, $msg, $data = null, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $msg, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function extractBearer() {
    $h = getallheaders();
    $a = $h['Authorization'] ?? $h['authorization'] ?? '';
    if (strpos($a, 'Bearer ') === 0) return substr($a, 7);
    return null;
}

function verifyJWT($token) {
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

$token = extractBearer();
if (!$token) resp(false, 'Token manquant', null, 401);
$payload = verifyJWT($token);
if (!$payload || empty($payload['user_id'])) resp(false, 'Token invalide', null, 401);

$pdo = getDatabaseConnection();
$currentUserId = intval($payload['user_id']);

// Check current user role
$uStmt = $pdo->prepare("SELECT id, role FROM users WHERE id = :id LIMIT 1");
$uStmt->execute(['id' => $currentUserId]);
$cur = $uStmt->fetch(PDO::FETCH_ASSOC);
if (!$cur) resp(false, 'Utilisateur introuvable', null, 401);
if (!in_array($cur['role'], ['admin','super_admin'])) resp(false, 'Accès refusé', null, 403);

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) resp(false, 'JSON invalide', null, 400);

    $first = trim((string)($data['first_name'] ?? ''));
    $last = trim((string)($data['last_name'] ?? ''));
    $email = trim((string)($data['email'] ?? ''));
    $phone = trim((string)($data['phone'] ?? ''));
    $role = (string)($data['role'] ?? 'client');
    $password = (string)($data['password'] ?? '');

    if ($first === '' || $last === '' || $email === '' || $password === '') {
        resp(false, 'Champs requis manquants', null, 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        resp(false, 'Email invalide', null, 400);
    }

    if (!in_array($role, ['client', 'livreur', 'admin', 'super_admin'], true)) {
        $role = 'client';
    }

    $q = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $q->execute(['email' => $email]);
    if ($q->fetch()) resp(false, 'Email déjà utilisé', null, 409);

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $ins = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password, role, phone, active, verified, created_at) VALUES (:first, :last, :email, :pass, :role, :phone, 1, 0, NOW())");
    try {
        $ins->execute([
            'first' => $first,
            'last' => $last,
            'email' => $email,
            'pass' => $hash,
            'role' => $role,
            'phone' => ($phone !== '' ? $phone : null),
        ]);
    } catch (Exception $e) {
        resp(false, 'Erreur BD', null, 500);
    }

    $newId = (int)$pdo->lastInsertId();
    resp(true, 'Utilisateur créé', ['id' => $newId], 201);
}

if ($method === 'GET') {
    if (!$id) resp(false, 'ID manquant', null, 400);
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, phone, role, active, verified, avatar FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $id]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u) resp(false, 'Utilisateur introuvable', null, 404);
    resp(true, 'Utilisateur', ['user' => $u]);
}

if ($method === 'PUT') {
    if (!$id) resp(false, 'ID manquant', null, 400);
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) resp(false, 'JSON invalide', null, 400);

    $allowed = ['first_name','last_name','email','phone','role','active','verified','avatar','password'];
    $upd = [];
    $params = ['id' => $id];
    foreach ($allowed as $f) {
        if (isset($data[$f])) {
            if ($f === 'password') {
                if ($data['password'] !== '') { $upd[] = "password = :password"; $params['password'] = password_hash($data['password'], PASSWORD_DEFAULT); }
            } else {
                $upd[] = "$f = :$f";
                $params[$f] = $data[$f];
            }
        }
    }
    if (empty($upd)) resp(false, 'Aucune donnée', null, 400);
    // check unique email
    if (isset($params['email'])) {
        $q = $pdo->prepare("SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1");
        $q->execute(['email'=>$params['email'],'id'=>$id]);
        if ($q->fetch()) resp(false, 'Email déjà utilisé', null, 409);
    }

    $sql = "UPDATE users SET " . implode(', ', $upd) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    try { $stmt->execute($params); resp(true, 'Utilisateur mis à jour', ['id'=>$id]); }
    catch (Exception $e) { resp(false, 'Erreur BD', null, 500); }
}

if ($method === 'DELETE') {
    if (!$id) resp(false, 'ID manquant', null, 400);
    if ($id === $currentUserId) resp(false, 'Action interdite', null, 400);

    $stmt = $pdo->prepare("UPDATE users SET active = 0 WHERE id = :id");
    try {
        $stmt->execute(['id' => $id]);
        resp(true, 'Utilisateur supprimé', ['id' => $id]);
    } catch (Exception $e) {
        resp(false, 'Erreur BD', null, 500);
    }
}

resp(false, 'Méthode non autorisée', null, 405);
