<?php
/**
 * API pour récupérer toutes les commandes (admin ou utilisateur avec filtre)
 * GET /backend/api/orders/all-orders.php
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
    
    // Récupérer les paramètres de la requête
    $params = $_GET;
    
    // Construire la requête selon les privilèges
    if ($user['is_admin']) {
        // Admin: voir toutes les commandes
        $query = "SELECT o.*, 
                  CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                  u.email as customer_email,
                  u.phone as customer_phone,
                  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
                  FROM orders o
                  JOIN users u ON o.user_id = u.id
                  WHERE 1=1";
    } else {
        // Utilisateur normal: voir seulement ses commandes
        $query = "SELECT o.*, 
                  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
                  FROM orders o
                  WHERE o.user_id = :user_id";
    }
    
    $queryParams = [];
    
    // Ajouter les filtres communs
    if ($user['is_admin']) {
        // Filtres admin seulement
        if (!empty($params['customer_id'])) {
            $query .= " AND o.user_id = :customer_id";
            $queryParams['customer_id'] = (int)$params['customer_id'];
        }
        
        if (!empty($params['customer_email'])) {
            $query .= " AND u.email LIKE :customer_email";
            $queryParams['customer_email'] = '%' . $params['customer_email'] . '%';
        }
    } else {
        // Paramètre pour l'utilisateur normal
        $queryParams['user_id'] = $user['id'];
    }
    
    // Filtres communs
    if (!empty($params['status'])) {
        $query .= " AND o.status = :status";
        $queryParams['status'] = $params['status'];
    }
    
    if (!empty($params['start_date'])) {
        $query .= " AND DATE(o.created_at) >= :start_date";
        $queryParams['start_date'] = $params['start_date'];
    }
    
    if (!empty($params['end_date'])) {
        $query .= " AND DATE(o.created_at) <= :end_date";
        $queryParams['end_date'] = $params['end_date'];
    }
    
    // Recherche par ID de commande
    if (!empty($params['order_id'])) {
        $query .= " AND o.id = :order_id";
        $queryParams['order_id'] = (int)$params['order_id'];
    }
    
    // Trier
    $orderBy = 'o.created_at DESC';
    if (!empty($params['sort'])) {
        switch ($params['sort']) {
            case 'date_asc':
                $orderBy = 'o.created_at ASC';
                break;
            case 'price_desc':
                $orderBy = 'o.final_price DESC';
                break;
            case 'price_asc':
                $orderBy = 'o.final_price ASC';
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
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($key, $value);
        }
    }
    
    $stmt->execute();
    $orders = $stmt->fetchAll();
    
    // Récupérer le nombre total pour la pagination
    $countQuery = "SELECT COUNT(*) as total FROM orders o";
    if ($user['is_admin']) {
        $countQuery .= " JOIN users u ON o.user_id = u.id WHERE 1=1";
    } else {
        $countQuery .= " WHERE o.user_id = :user_id";
        $countParams = ['user_id' => $user['id']];
    }
    
    // Ajouter les mêmes filtres au comptage
    if ($user['is_admin']) {
        if (!empty($params['customer_id'])) {
            $countQuery .= " AND o.user_id = :customer_id";
        }
        if (!empty($params['customer_email'])) {
            $countQuery .= " AND u.email LIKE :customer_email";
        }
    }
    
    if (!empty($params['status'])) {
        $countQuery .= " AND o.status = :status";
    }
    if (!empty($params['start_date'])) {
        $countQuery .= " AND DATE(o.created_at) >= :start_date";
    }
    if (!empty($params['end_date'])) {
        $countQuery .= " AND DATE(o.created_at) <= :end_date";
    }
    
    $countStmt = $pdo->prepare($countQuery);
    $countParams = $queryParams;
    unset($countParams['limit'], $countParams['offset']);
    
    foreach ($countParams as $key => $value) {
        if ($key === 'limit' || $key === 'offset') {
            $countStmt->bindValue($key, $value, PDO::PARAM_INT);
        } else {
            $countStmt->bindValue($key, $value);
        }
    }
    
    $countStmt->execute();
    $total = $countStmt->fetch();
    
    // Pour chaque commande, récupérer les détails si demandé
    if (isset($params['with_items']) && $params['with_items'] == 1) {
        foreach ($orders as &$order) {
            $itemsQuery = "SELECT * FROM order_items WHERE order_id = :order_id";
            $itemsStmt = $pdo->prepare($itemsQuery);
            $itemsStmt->execute(['order_id' => $order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'pagination' => [
            'total' => $total['total'],
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total['total'] / $limit)
        ],
        'user_is_admin' => (bool)$user['is_admin']
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