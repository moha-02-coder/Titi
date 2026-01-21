<?php
/**
 * API pour récupérer les détails d'une commande spécifique
 * GET /backend/api/orders/order-details.php?id={id}
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
    
    // Récupérer l'ID de la commande
    $orderId = $_GET['id'] ?? null;
    
    if (!$orderId || !is_numeric($orderId)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID de commande requis'
        ]);
        exit;
    }
    
    // Construire la requête selon les privilèges
    if ($user['is_admin']) {
        // Admin peut voir toutes les commandes
        $query = "SELECT o.*, 
                  CONCAT(u.first_name, ' ', u.last_name) as customer_name,
                  u.email as customer_email,
                  u.phone as customer_phone,
                  u.address as customer_address
                  FROM orders o
                  JOIN users u ON o.user_id = u.id
                  WHERE o.id = :order_id";
    } else {
        // Utilisateur normal ne peut voir que ses commandes
        $query = "SELECT o.* 
                  FROM orders o
                  WHERE o.id = :order_id AND o.user_id = :user_id";
    }
    
    $stmt = $pdo->prepare($query);
    
    if ($user['is_admin']) {
        $stmt->execute(['order_id' => $orderId]);
    } else {
        $stmt->execute([
            'order_id' => $orderId,
            'user_id' => $user['id']
        ]);
    }
    
    $order = $stmt->fetch();
    
    if (!$order) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Commande non trouvée ou accès non autorisé'
        ]);
        exit;
    }
    
    // Récupérer les articles de la commande
    $itemsQuery = "SELECT * FROM order_items WHERE order_id = :order_id";
    $itemsStmt = $pdo->prepare($itemsQuery);
    $itemsStmt->execute(['order_id' => $orderId]);
    $items = $itemsStmt->fetchAll();
    
    // Récupérer les détails des produits/menus si disponibles
    foreach ($items as &$item) {
        if ($item['item_type'] === 'product') {
            $productQuery = "SELECT name, category FROM products WHERE id = :id";
            $productStmt = $pdo->prepare($productQuery);
            $productStmt->execute(['id' => $item['item_id']]);
            $product = $productStmt->fetch();
            
            if ($product) {
                $item['product_details'] = $product;
            }
        } elseif ($item['item_type'] === 'menu') {
            $menuQuery = "SELECT name, category FROM menu WHERE id = :id";
            $menuStmt = $pdo->prepare($menuQuery);
            $menuStmt->execute(['id' => $item['item_id']]);
            $menu = $menuStmt->fetch();
            
            if ($menu) {
                $item['menu_details'] = $menu;
            }
        }
    }
    
    $order['items'] = $items;
    $order['items_count'] = count($items);
    
    // Pour les admins, ajouter des statistiques supplémentaires
    if ($user['is_admin']) {
        // Nombre total de commandes du client
        $customerOrdersQuery = "SELECT COUNT(*) as total_orders FROM orders WHERE user_id = :user_id";
        $customerOrdersStmt = $pdo->prepare($customerOrdersQuery);
        $customerOrdersStmt->execute(['user_id' => $order['user_id']]);
        $customerStats = $customerOrdersStmt->fetch();
        
        $order['customer_stats'] = $customerStats;
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'order' => $order
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la récupération des détails de la commande'
    ]);
}
?>