<?php
/**
 * API pour récupérer les commandes d'un utilisateur
 * GET /backend/api/orders/user-orders.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Authorization');

// Inclure la configuration de la base de données
require_once '../../config/database.php';

function extractBearerToken(): ?string {
    $auth = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (empty($auth)) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }
    if (strpos($auth, 'Bearer ') === 0) {
        return substr($auth, 7);
    }
    return null;
}

function urlbase64_decode_local(string $input) {
    $remainder = strlen($input) % 4;
    if ($remainder) {
        $input .= str_repeat('=', 4 - $remainder);
    }
    $input = str_replace(['-', '_'], ['+', '/'], $input);
    return base64_decode($input);
}

function verifyJwtLocal(string $token) {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    [$h, $p, $s] = $parts;

    $sig = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($sig));
    if (!hash_equals($expected, $s)) return false;

    $payloadJson = urlbase64_decode_local($p);
    if ($payloadJson === false) return false;
    $payload = json_decode($payloadJson, true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > (int)$payload['exp']) return false;
    return $payload;
}

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
    exit;
}

// Récupérer et vérifier l'authentification
$token = extractBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Authentification requise'
    ]);
    exit;
}

try {
    // Se connecter à la base de données
    $pdo = getDatabaseConnection();

    // Vérifier l'utilisateur (JWT en priorité; fallback auth_token si présent)
    $userId = null;
    $jwtPayload = verifyJwtLocal($token);
    if ($jwtPayload && !empty($jwtPayload['user_id'])) {
        $userId = (int)$jwtPayload['user_id'];
    }

    $user = null;
    if ($userId) {
        $userStmt = $pdo->prepare('SELECT id FROM users WHERE id = :id AND active = 1 LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch();
    } else {
        if (tableHasColumn($pdo, 'users', 'auth_token')) {
            $userStmt = $pdo->prepare('SELECT id FROM users WHERE auth_token = :token AND active = 1 LIMIT 1');
            $userStmt->execute(['token' => $token]);
            $user = $userStmt->fetch();
        }
    }

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Utilisateur non authentifié'
        ]);
        exit;
    }

    // Récupérer les commandes de l'utilisateur
    $query = "SELECT o.*, 
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
              FROM orders o
              WHERE o.user_id = :user_id
              ORDER BY o.created_at DESC";

    $stmt = $pdo->prepare($query);
    $stmt->execute(['user_id' => $user['id']]);
    $orders = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);

} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la récupération des commandes',
        'debug' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $e->getMessage() : null
    ]);
}
?>