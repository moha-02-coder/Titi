<?php
/**
 * Notifications API
 * GET  /backend/api/notifications/list.php
 * POST /backend/api/notifications/list.php (mark one as read)
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

function resp(bool $success, string $message, $data = null, int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function normalizeRole(?string $role): string
{
    $r = strtolower(trim((string)$role));
    if ($r === 'super_admin' || $r === 'administrator') return 'admin';
    if ($r === 'delivery') return 'livreur';
    if ($r === '') return 'client';
    return $r;
}

function extractBearer(): ?string
{
    $auth = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if ($auth === '') {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }
    if (strpos($auth, 'Bearer ') === 0) {
        return substr($auth, 7);
    }
    return null;
}

function urlbase64_decode_local(string $input)
{
    $remainder = strlen($input) % 4;
    if ($remainder > 0) {
        $input .= str_repeat('=', 4 - $remainder);
    }
    $input = str_replace(['-', '_'], ['+', '/'], $input);
    return base64_decode($input);
}

function verifyJWTLocal(string $token)
{
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    [$h, $p, $s] = $parts;
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    if (!hash_equals($expected, $s)) {
        return false;
    }

    $payloadJson = urlbase64_decode_local($p);
    if ($payloadJson === false) {
        return false;
    }

    $payload = json_decode($payloadJson, true);
    if (!is_array($payload)) {
        return false;
    }

    if (isset($payload['exp']) && time() > intval($payload['exp'])) {
        return false;
    }

    return $payload;
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS c
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table'
    );
    $stmt->execute(['table' => $table]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return intval($row['c'] ?? 0) > 0;
}

function effectiveRoleFromDb(PDO $pdo, int $userId, string $fallbackRole): string
{
    $role = $fallbackRole;

    try {
        $uStmt = $pdo->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
        $uStmt->execute(['id' => $userId]);
        $u = $uStmt->fetch(PDO::FETCH_ASSOC);
        if ($u && isset($u['role'])) {
            $role = normalizeRole((string)$u['role']);
        }
    } catch (Throwable $e) {
        // Keep fallback role
    }

    // If user has driver profile, force driver role
    try {
        if (tableExists($pdo, 'drivers')) {
            $dStmt = $pdo->prepare('SELECT id FROM drivers WHERE user_id = :uid LIMIT 1');
            $dStmt->execute(['uid' => $userId]);
            if ($dStmt->fetch(PDO::FETCH_ASSOC)) {
                $role = 'livreur';
            }
        }
    } catch (Throwable $e) {
        // ignore
    }

    return $role;
}

try {
    $pdo = getDatabaseConnection();

    if (!tableExists($pdo, 'notifications')) {
        resp(true, 'Table notifications absente', [
            'role' => 'client',
            'notifications' => []
        ]);
    }

    $token = extractBearer();
    $payload = ($token !== null) ? verifyJWTLocal($token) : false;

    $userId = (is_array($payload) && !empty($payload['user_id'])) ? intval($payload['user_id']) : 0;
    $roleFromToken = (is_array($payload) && isset($payload['role']))
        ? normalizeRole((string)$payload['role'])
        : '';

    $requestedRole = normalizeRole((string)($_GET['role'] ?? $_POST['role'] ?? ''));
    $role = $roleFromToken !== '' ? $roleFromToken : ($requestedRole !== '' ? $requestedRole : 'client');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $limit = intval($_GET['limit'] ?? 20);
        if ($limit < 1) $limit = 1;
        if ($limit > 100) $limit = 100;

        $notifications = [];

        if ($userId > 0) {
            $role = effectiveRoleFromDb($pdo, $userId, $role);

            if ($role === 'admin') {
                $sql = '
                    SELECT
                        n.id,
                        n.user_id,
                        n.type,
                        n.title,
                        n.content,
                        n.data_json,
                        n.read_at,
                        n.created_at,
                        CONCAT(COALESCE(u.first_name, ""), " ", COALESCE(u.last_name, "")) AS user_name,
                        COALESCE(u.role, "client") AS user_role
                    FROM notifications n
                    LEFT JOIN users u ON u.id = n.user_id
                    ORDER BY n.created_at DESC
                    LIMIT :lim
                ';
                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
                $stmt->execute();
                $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            } else {
                $sql = '
                    SELECT
                        id,
                        user_id,
                        type,
                        title,
                        content,
                        data_json,
                        read_at,
                        created_at
                    FROM notifications
                    WHERE user_id = :uid
                    ORDER BY created_at DESC
                    LIMIT :lim
                ';
                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
                $stmt->execute();
                $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            }
        }

        resp(true, 'Notifications recuperees', [
            'role' => $role,
            'notifications' => $notifications
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($userId <= 0) {
            resp(false, 'Authentification requise', null, 401);
        }

        $raw = file_get_contents('php://input');
        $body = json_decode((string)$raw, true);
        if (!is_array($body)) {
            $body = $_POST;
        }

        $notificationId = intval($body['notification_id'] ?? 0);
        if ($notificationId <= 0) {
            resp(false, 'notification_id requis', null, 400);
        }

        $role = effectiveRoleFromDb($pdo, $userId, $role);

        if ($role === 'admin') {
            $stmt = $pdo->prepare('UPDATE notifications SET read_at = NOW() WHERE id = :id');
            $stmt->execute(['id' => $notificationId]);
        } else {
            $stmt = $pdo->prepare('UPDATE notifications SET read_at = NOW() WHERE id = :id AND user_id = :uid');
            $stmt->execute([
                'id' => $notificationId,
                'uid' => $userId
            ]);
        }

        resp(true, 'Notification mise a jour', [
            'notification_id' => $notificationId
        ]);
    }

    resp(false, 'Methode non autorisee', null, 405);
} catch (Throwable $e) {
    $debug = null;
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
        $debug = $e->getMessage();
    }

    resp(false, 'Erreur serveur', [
        'debug' => $debug
    ], 500);
}