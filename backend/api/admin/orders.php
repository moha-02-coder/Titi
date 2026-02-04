<?php
/**
 * API admin pour la gestion des commandes
 * GET /backend/api/admin/orders.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

// Inclure la configuration de la base de données
require_once '../../config/database.php';

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

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
    exit;
}

// Récupérer et vérifier l'authentification admin (JWT)
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

    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide']);
        exit;
    }

    $userStmt = $pdo->prepare("SELECT id, role, active FROM users WHERE id = :id LIMIT 1");
    $userStmt->execute(['id' => (int)$payload['user_id']]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable']);
        exit;
    }

    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Accès non autorisé'
        ]);
        exit;
    }

    // POST: update order status (accept/refuse)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'JSON invalide']);
            exit;
        }

        $id = isset($data['id']) ? (int)$data['id'] : 0;
        $status = isset($data['status']) ? (string)$data['status'] : '';
        $reason = isset($data['reason']) ? trim((string)$data['reason']) : '';

        $allowed = ['confirmed', 'cancelled', 'rejected'];
        if (!$id || !in_array($status, $allowed, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Paramètres invalides']);
            exit;
        }

        $mappedStatus = $status === 'rejected' ? 'cancelled' : $status;

        $check = $pdo->prepare('SELECT id, status FROM orders WHERE id = :id LIMIT 1');
        $check->execute(['id' => $id]);
        $order = $check->fetch(PDO::FETCH_ASSOC);
        if (!$order) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Commande introuvable']);
            exit;
        }
        if (($order['status'] ?? '') !== 'pending') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Seules les commandes en attente peuvent être traitées']);
            exit;
        }

        $sql = 'UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id';
        $params = ['status' => $mappedStatus, 'id' => $id];

        // add note if column exists
        if ($reason !== '') {
            try {
                $hasNotes = (bool)$pdo->query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'notes' LIMIT 1")->fetchColumn();
                if ($hasNotes) {
                    $sql = "UPDATE orders SET status = :status, notes = CONCAT(COALESCE(notes,''), '\n[Admin] ', :reason), updated_at = NOW() WHERE id = :id";
                    $params['reason'] = $reason;
                }
            } catch (Exception $e) {
                // ignore
            }
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Statut mis à jour', 'data' => ['id' => $id, 'status' => $mappedStatus]]);
        exit;
    }

    // Récupérer les paramètres de la requête
    $params = $_GET;

    // Construire la requête de base
    $query = "SELECT o.*, 
              CONCAT(u.first_name, ' ', u.last_name) as customer_name,
              u.phone as customer_phone,
              u.email as customer_email
              FROM orders o
              JOIN users u ON o.user_id = u.id
              WHERE 1=1";
    
    $queryParams = [];
    
    // Filtrer par statut
    if (!empty($params['status'])) {
        $query .= " AND o.status = :status";
        $queryParams['status'] = $params['status'];
    }
    
    // Commandes du jour
    if (isset($params['today']) && $params['today'] == 1) {
        $query .= " AND DATE(o.created_at) = CURDATE()";
    }
    
    // Revenus du jour
    if (isset($params['revenue_today']) && $params['revenue_today'] == 1) {
        $query = "SELECT SUM(final_price) as total FROM orders WHERE DATE(created_at) = CURDATE()";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'total' => $result['total'] ?? 0
        ]);
        exit;
    }
    
    // Limiter le nombre de résultats
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $query .= " ORDER BY o.created_at DESC LIMIT :limit";
    $queryParams['limit'] = $limit;
    
    // Exécuter la requête
    $stmt = $pdo->prepare($query);
    
    foreach ($queryParams as $key => $value) {
        if ($key === 'limit') {
            $stmt->bindValue(':' . $key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':' . $key, $value);
        }
    }
    
    $stmt->execute();
    $orders = $stmt->fetchAll();
    
    // Compter le nombre total de commandes (pour les stats)
    $countQuery = "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()";
    $countStmt = $pdo->query($countQuery);
    $count = $countStmt->fetch();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'count' => $count['count']
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la récupération des commandes',
        'debug' => ENVIRONMENT === 'development' ? $e->getMessage() : null
    ]);
}
?>