<?php
/**
 * API pour rechercher des commandes
 * GET /backend/api/orders/search.php?q={query}
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

// Récupérer et vérifier l'authentification
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
    
    // Vérifier l'utilisateur
    $userQuery = "SELECT id, is_admin FROM users WHERE auth_token = :token AND active = 1";
    $userStmt = $pdo->prepare($userQuery);
    $userStmt->execute(['token' => $token]);
    $user = $userStmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Utilisateur non authentifié'
        ]);
        exit;
    }
    
    // Récupérer le terme de recherche
    $searchTerm = $_GET['q'] ?? '';
    
    if (empty($searchTerm)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Terme de recherche requis'
        ]);
        exit;
    }
    
    // Préparer la recherche
    $searchPattern = '%' . $searchTerm . '%';
    
    // Construire la requête selon les privilèges
    if ($user['is_admin']) {
        // Admin peut rechercher dans toutes les commandes
        $query = "SELECT o.*, 
                  CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                  u.email as customer_email,
                  u.phone as customer_phone,
                  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
                  FROM orders o
                  JOIN users u ON o.user_id = u.id
                  WHERE (o.id LIKE :search_id OR 
                        CONCAT(u.first_name, ' ', u.last_name) LIKE :search_name OR
                        u.email LIKE :search_email OR
                        u.phone LIKE :search_phone OR
                        o.delivery_address LIKE :search_address)
                  ORDER BY o.created_at DESC
                  LIMIT 20";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([
            'search_id' => is_numeric($searchTerm) ? $searchTerm : $searchPattern,
            'search_name' => $searchPattern,
            'search_email' => $searchPattern,
            'search_phone' => $searchPattern,
            'search_address' => $searchPattern
        ]);
    } else {
        // Utilisateur normal cherche dans ses propres commandes
        $query = "SELECT o.*,
                  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
                  FROM orders o
                  WHERE o.user_id = :user_id AND 
                        (o.id LIKE :search_id OR 
                         o.delivery_address LIKE :search_address)
                  ORDER BY o.created_at DESC
                  LIMIT 20";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([
            'user_id' => $user['id'],
            'search_id' => is_numeric($searchTerm) ? $searchTerm : $searchPattern,
            'search_address' => $searchPattern
        ]);
    }
    
    $orders = $stmt->fetchAll();
    
    // Rechercher aussi dans les articles de commande
    $itemsQuery = "SELECT oi.*, o.id as order_id, o.status, o.created_at,
                  CONCAT(u.first_name, ' ', u.last_name) as customer_name
                  FROM order_items oi
                  JOIN orders o ON oi.order_id = o.id
                  JOIN users u ON o.user_id = u.id
                  WHERE oi.item_name LIKE :search_item
                  " . ($user['is_admin'] ? "" : "AND o.user_id = :user_id") . "
                  ORDER BY o.created_at DESC
                  LIMIT 10";
    
    $itemsStmt = $pdo->prepare($itemsQuery);
    $params = ['search_item' => $searchPattern];
    if (!$user['is_admin']) {
        $params['user_id'] = $user['id'];
    }
    $itemsStmt->execute($params);
    $items = $itemsStmt->fetchAll();
    
    // Regrouper les résultats
    $results = [
        'orders' => $orders,
        'items' => $items,
        'search_term' => $searchTerm,
        'total_results' => count($orders) + count($items)
    ];
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'results' => $results
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la recherche',
        'debug' => ENVIRONMENT === 'development' ? $e->getMessage() : null
    ]);
}
?>