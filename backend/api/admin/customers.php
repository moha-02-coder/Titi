<?php
/**
 * API admin pour la gestion des clients
 * GET /backend/api/admin/customers.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Authorization');

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

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

    // Récupérer les paramètres de la requête
    $params = $_GET;

    // Construire la requête pour récupérer les clients avec statistiques
    $query = "SELECT u.*, 
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as orders_count,
              (SELECT MAX(created_at) FROM orders o WHERE o.user_id = u.id) as last_order,
              (SELECT SUM(final_price) FROM orders o WHERE o.user_id = u.id) as total_spent
              FROM users u
              WHERE u.role = 'client' AND u.active = 1";

    $queryParams = [];

    // Filtre par recherche
    if (!empty($params['search'])) {
        $search = '%' . $params['search'] . '%';
        $query .= " AND (u.first_name LIKE :search OR u.last_name LIKE :search OR u.email LIKE :search)";
        $queryParams['search'] = $search;
    }

    // Trier par dernière commande ou total dépensé
    $orderBy = 'u.created_at DESC';
    if (!empty($params['sort'])) {
        switch ($params['sort']) {
            case 'last_order':
                $orderBy = 'last_order DESC';
                break;
            case 'total_spent':
                $orderBy = 'total_spent DESC';
                break;
            case 'name':
                $orderBy = 'u.first_name ASC, u.last_name ASC';
                break;
        }
    }

    $query .= " ORDER BY $orderBy";

    // Pagination
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $page = isset($params['page']) ? max(1, (int)$params['page']) : 1;
    $offset = ($page - 1) * $limit;

    $query .= " LIMIT :limit OFFSET :offset";
    $queryParams['limit'] = $limit;
    $queryParams['offset'] = $offset;

    // Exécuter la requête
    $stmt = $pdo->prepare($query);

    foreach ($queryParams as $key => $value) {
        if ($key === 'limit' || $key === 'offset') {
            $stmt->bindValue(':' . $key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':' . $key, $value);
        }
    }

    $stmt->execute();
    $customers = $stmt->fetchAll();

    // Récupérer le nombre total de clients pour la pagination
    $countQuery = "SELECT COUNT(*) as total FROM users WHERE role = 'client' AND active = 1";
    $countStmt = $pdo->query($countQuery);
    $total = $countStmt->fetch();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'customers' => $customers,
        'pagination' => [
            'total' => $total['total'],
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total['total'] / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la récupération des clients'
    ]);
}
?>