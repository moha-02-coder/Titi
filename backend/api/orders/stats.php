<?php
/**
 * API pour les statistiques de commandes de l'utilisateur
 * GET /backend/api/orders/stats.php
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
    $userQuery = "SELECT id FROM users WHERE auth_token = :token AND active = 1";
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
    
    // Statistiques globales
    $statsQuery = "
        SELECT 
            COUNT(*) as total_orders,
            SUM(final_price) as total_spent,
            AVG(final_price) as avg_order_value,
            MIN(created_at) as first_order_date,
            MAX(created_at) as last_order_date,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
        FROM orders 
        WHERE user_id = :user_id
    ";
    
    $statsStmt = $pdo->prepare($statsQuery);
    $statsStmt->execute(['user_id' => $user['id']]);
    $globalStats = $statsStmt->fetch();
    
    // Commandes par mois (pour graphique)
    $monthlyQuery = "
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as order_count,
            SUM(final_price) as monthly_spent
        FROM orders 
        WHERE user_id = :user_id 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
    ";
    
    $monthlyStmt = $pdo->prepare($monthlyQuery);
    $monthlyStmt->execute(['user_id' => $user['id']]);
    $monthlyStats = $monthlyStmt->fetchAll();
    
    // Produits/menus préférés
    $favoritesQuery = "
        SELECT 
            oi.item_name,
            oi.item_type,
            COUNT(*) as order_count,
            SUM(oi.quantity) as total_quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = :user_id
        GROUP BY oi.item_name, oi.item_type
        ORDER BY order_count DESC
        LIMIT 5
    ";
    
    $favoritesStmt = $pdo->prepare($favoritesQuery);
    $favoritesStmt->execute(['user_id' => $user['id']]);
    $favorites = $favoritesStmt->fetchAll();
    
    // Dépenses par catégorie
    $categoryQuery = "
        SELECT 
            CASE 
                WHEN oi.item_type = 'menu' THEN 'Menus'
                WHEN oi.item_type = 'product' THEN 'Produits'
                ELSE 'Autres'
            END as category,
            SUM(oi.quantity * oi.unit_price) as total_spent,
            COUNT(DISTINCT oi.order_id) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = :user_id
        GROUP BY category
    ";
    
    $categoryStmt = $pdo->prepare($categoryQuery);
    $categoryStmt->execute(['user_id' => $user['id']]);
    $categoryStats = $categoryStmt->fetchAll();
    
    // Préparer la réponse
    $response = [
        'success' => true,
        'stats' => [
            'global' => [
                'total_orders' => (int)$globalStats['total_orders'],
                'total_spent' => (float)$globalStats['total_spent'],
                'avg_order_value' => (float)$globalStats['avg_order_value'],
                'first_order' => $globalStats['first_order_date'],
                'last_order' => $globalStats['last_order_date'],
                'completed_orders' => (int)$globalStats['completed_orders'],
                'pending_orders' => (int)$globalStats['pending_orders'],
                'cancelled_orders' => (int)$globalStats['cancelled_orders']
            ],
            'monthly' => array_map(function($month) {
                return [
                    'month' => $month['month'],
                    'month_name' => date('F Y', strtotime($month['month'] . '-01')),
                    'order_count' => (int)$month['order_count'],
                    'monthly_spent' => (float)$month['monthly_spent']
                ];
            }, $monthlyStats),
            'favorites' => $favorites,
            'categories' => $categoryStats,
            'summary' => [
                'orders_today' => getOrdersToday($pdo, $user['id']),
                'active_orders' => getActiveOrders($pdo, $user['id'])
            ]
        ]
    ];
    
    // Nettoyer les valeurs NULL
    array_walk_recursive($response, function(&$value) {
        if ($value === null) {
            $value = 0;
        }
    });
    
    http_response_code(200);
    echo json_encode($response);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la récupération des statistiques',
        'debug' => ENVIRONMENT === 'development' ? $e->getMessage() : null
    ]);
}

// Fonctions utilitaires

function getOrdersToday($pdo, $userId) {
    $query = "SELECT COUNT(*) as count FROM orders 
              WHERE user_id = :user_id AND DATE(created_at) = CURDATE()";
    $stmt = $pdo->prepare($query);
    $stmt->execute(['user_id' => $userId]);
    $result = $stmt->fetch();
    return (int)$result['count'];
}

function getActiveOrders($pdo, $userId) {
    $query = "SELECT COUNT(*) as count FROM orders 
              WHERE user_id = :user_id AND status IN ('pending', 'confirmed', 'preparing', 'delivery')";
    $stmt = $pdo->prepare($query);
    $stmt->execute(['user_id' => $userId]);
    $result = $stmt->fetch();
    return (int)$result['count'];
}
?>