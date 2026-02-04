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

// Récupérer et vérifier l'authentification (JWT-like token)
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

// Simple verify function copied from login flow (HMAC) - returns payload array or false
function verify_token_payload($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h, $p, $s) = $parts;
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if (!hash_equals($expected, $s)) return false;
    $payload = json_decode(base64_decode($p), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}

try {
    // Se connecter à la base de données
    $pdo = getDatabaseConnection();

    // Vérifier et décoder le token
    $payload = verify_token_payload($token);
    if (!$payload || !isset($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié']);
        exit;
    }
    $userId = intval($payload['user_id']);

    // Vérifier que l'utilisateur existe et est actif
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = :id AND active = 1 LIMIT 1");
    $userStmt->execute(['id' => $userId]);
    $user = $userStmt->fetch();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable ou inactif']);
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
        $qty = isset($item['quantity']) && is_numeric($item['quantity']) ? intval($item['quantity']) : 1;
        $total += ($item['price'] * $qty);
    }
    
    // Ajouter les frais de livraison
    $deliveryFee = 1000; // Frais fixes pour ce projet
    $finalTotal = $total + $deliveryFee;
    
    // Commencer une transaction
    $pdo->beginTransaction();
    try {
        // Préparer items_json pour la table orders
        $itemsJson = json_encode($data['items'], JSON_UNESCAPED_UNICODE);

        // Créer la commande (ordre conforme au schéma présent)
        $orderQuery = "INSERT INTO orders (user_id, items_json, total_price, delivery_fee, final_price, delivery_address, status, payment_method, estimated_time_minutes, created_at)
                      VALUES (:user_id, :items_json, :total_price, :delivery_fee, :final_price, :delivery_address, 'pending', :payment_method, :estimated_time_minutes, NOW())";

        $orderStmt = $pdo->prepare($orderQuery);
        $orderStmt->execute([
            'user_id' => $user['id'] ?? $userId,
            'items_json' => $itemsJson,
            'total_price' => $total,
            'delivery_fee' => $deliveryFee,
            'final_price' => $finalTotal,
            'delivery_address' => $data['delivery_address'] ?? '',
            'payment_method' => $data['payment_method'] ?? 'cash',
            'estimated_time_minutes' => isset($data['delivery_time']) ? intval($data['delivery_time']) : 30
        ]);

        $orderId = $pdo->lastInsertId();
        
        // Ajouter les articles de la commande
        foreach ($data['items'] as $item) {
            $qty = isset($item['quantity']) && is_numeric($item['quantity']) ? intval($item['quantity']) : 1;
            $itemQuery = "INSERT INTO order_items (order_id, item_name, item_type, item_id, quantity, unit_price, created_at)
                          VALUES (:order_id, :item_name, :item_type, :item_id, :quantity, :unit_price, NOW())";
            $itemStmt = $pdo->prepare($itemQuery);
            $itemStmt->execute([
                'order_id' => $orderId,
                'item_name' => $item['name'] ?? ($item['item_name'] ?? 'Article'),
                'item_type' => $item['type'] ?? 'product',
                'item_id' => $item['id'] ?? null,
                'quantity' => $qty,
                'unit_price' => $item['price']
            ]);

            // Mettre à jour le stock si c'est un produit et si table products existe
            if (($item['type'] ?? '') === 'product' && isset($item['id'])) {
                try {
                    $updateStockQuery = "UPDATE products SET stock = GREATEST(0, stock - :qty) WHERE id = :id";
                    $updateStmt = $pdo->prepare($updateStockQuery);
                    $updateStmt->execute(['qty' => $qty, 'id' => $item['id']]);
                } catch (Exception $e) {
                    // ignore stock update errors
                }
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

        // Attempt to assign a driver automatically (best-effort)
        try {
            // Find an available, approved driver with fewest deliveries
            $drvStmt = $pdo->prepare("SELECT id FROM drivers WHERE available = 1 AND status = 'approved' ORDER BY total_deliveries ASC LIMIT 1");
            $drvStmt->execute();
            $drv = $drvStmt->fetch(PDO::FETCH_ASSOC);
            if ($drv && isset($drv['id'])) {
                $driverId = $drv['id'];
                // If orders table has driver_id column, update it; otherwise insert into deliveries table if exists
                $colCheck = $pdo->prepare("SHOW COLUMNS FROM orders LIKE 'driver_id'");
                $colCheck->execute();
                $hasDriverCol = (bool)$colCheck->fetch();
                if ($hasDriverCol) {
                    $assignStmt = $pdo->prepare("UPDATE orders SET driver_id = :driver_id, status = 'assigned' WHERE id = :order_id");
                    $assignStmt->execute(['driver_id' => $driverId, 'order_id' => $orderId]);
                } else {
                    // Try to create deliveries table if not exists and insert
                    try {
                        $pdo->exec("CREATE TABLE IF NOT EXISTS deliveries (
                            id INT PRIMARY KEY AUTO_INCREMENT,
                            order_id INT NOT NULL,
                            delivery_person_id INT NOT NULL,
                            status ENUM('assigned','pickup','delivered') DEFAULT 'assigned',
                            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
                    } catch (Exception $e) {}
                    $delStmt = $pdo->prepare("INSERT INTO deliveries (order_id, delivery_person_id, status) VALUES (:order_id, :driver_id, 'assigned')");
                    $delStmt->execute(['order_id' => $orderId, 'driver_id' => $driverId]);
                }

                // mark driver as not available and increment deliveries
                try {
                    $pdo->prepare("UPDATE drivers SET available = 0, total_deliveries = total_deliveries + 1 WHERE id = :id")->execute(['id' => $driverId]);
                } catch (Exception $e) {}

                $order['status'] = 'assigned';
                $order['driver_id'] = $driverId;
            }
        } catch (Exception $e) {
            error_log('driver assign error: ' . $e->getMessage());
        }
        
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