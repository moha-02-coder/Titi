<?php
/**
 * API pour créer une commande
 * POST /backend/api/orders/create.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Inclure la configuration de la base de données
require_once '../../config/database.php';

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    
    // Récupérer les données de la commande
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Valider les données
    if (!isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'La commande doit contenir au moins un article'
        ]);
        exit;
    }
    
    // Calculer le total
    $total = 0;
    foreach ($data['items'] as $item) {
        if (!isset($item['price']) || !is_numeric($item['price'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Prix invalide pour un article'
            ]);
            exit;
        }
        $total += $item['price'];
    }
    
    // Ajouter les frais de livraison
    $deliveryFee = 1000; // Frais fixes pour ce projet
    $finalTotal = $total + $deliveryFee;
    
    // Commencer une transaction
    $pdo->beginTransaction();
    
    try {
        // Créer la commande
        $orderQuery = "INSERT INTO orders (user_id, total_price, delivery_fee, final_price, 
                         delivery_address, status, payment_method, notes, created_at)
                      VALUES (:user_id, :total_price, :delivery_fee, :final_price, 
                         :delivery_address, 'pending', :payment_method, :notes, NOW())";
        
        $orderStmt = $pdo->prepare($orderQuery);
        $orderStmt->execute([
            'user_id' => $user['id'],
            'total_price' => $total,
            'delivery_fee' => $deliveryFee,
            'final_price' => $finalTotal,
            'delivery_address' => $data['delivery_address'] ?? '',
            'payment_method' => $data['payment_method'] ?? 'cash',
            'notes' => $data['notes'] ?? ''
        ]);
        
        $orderId = $pdo->lastInsertId();
        
        // Ajouter les articles de la commande
        foreach ($data['items'] as $item) {
            $itemQuery = "INSERT INTO order_items (order_id, item_name, item_type, 
                           item_id, quantity, unit_price, created_at)
                         VALUES (:order_id, :item_name, :item_type, :item_id, 
                           1, :unit_price, NOW())";
            
            $itemStmt = $pdo->prepare($itemQuery);
            $itemStmt->execute([
                'order_id' => $orderId,
                'item_name' => $item['name'],
                'item_type' => $item['type'] ?? 'product',
                'item_id' => $item['id'] ?? null,
                'unit_price' => $item['price']
            ]);
            
            // Mettre à jour le stock si c'est un produit
            if (($item['type'] ?? '') === 'product') {
                $updateStockQuery = "UPDATE products SET stock = stock - 1 
                                     WHERE id = :id AND stock > 0";
                $updateStmt = $pdo->prepare($updateStockQuery);
                $updateStmt->execute(['id' => $item['id']]);
            }
        }
        
        // Valider la transaction
        $pdo->commit();
        
        // Récupérer la commande créée
        $orderQuery = "SELECT o.*, 
                       CONCAT(u.first_name, ' ', u.last_name) as customer_name
                       FROM orders o
                       JOIN users u ON o.user_id = u.id
                       WHERE o.id = :order_id";
        
        $orderStmt = $pdo->prepare($orderQuery);
        $orderStmt->execute(['order_id' => $orderId]);
        $order = $orderStmt->fetch();
        
        // Récupérer les articles de la commande
        $itemsQuery = "SELECT * FROM order_items WHERE order_id = :order_id";
        $itemsStmt = $pdo->prepare($itemsQuery);
        $itemsStmt->execute(['order_id' => $orderId]);
        $items = $itemsStmt->fetchAll();
        
        $order['items'] = $items;
        $order['items_count'] = count($items);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Commande créée avec succès',
            'order' => $order
        ]);
        
    } catch (Exception $e) {
        // Annuler la transaction en cas d'erreur
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la création de la commande',
        'debug' => ENVIRONMENT === 'development' ? $e->getMessage() : null
    ]);
}
?>