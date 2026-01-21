<?php
/**
 * API admin pour la gestion des commandes
 * GET /backend/api/admin/orders.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Authorization');

// Inclure la configuration de la base de données
require_once '../../config/database.php';

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
    exit;
}

// Récupérer et vérifier l'authentification admin
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (strpos($authHeader, 'Bearer ') !== 0) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Authentification requise'
    ]);
    exit;
}

$token = substr($authHeader, 7);

try {
    // Se connecter à la base de données
    $pdo = getDatabaseConnection();
    
    // Vérifier l'utilisateur et ses privilèges admin
    $userQuery = "SELECT id, is_admin FROM users WHERE auth_token = :token AND active = 1";
    $userStmt = $pdo->prepare($userQuery);
    $userStmt->execute(['token' => $token]);
    $user = $userStmt->fetch();
    
    if (!$user || !$user['is_admin']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Accès non autorisé'
        ]);
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
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, $value);
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