<?php
/**
 * API pour récupérer les commandes récentes utilisateur
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS pour CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../helpers/auth.php';
require_once '../../helpers/response.php';

try {
    // Vérifier l'authentification
    $token = getBearerToken();
    if (!$token) {
        sendError('Token manquant', 401);
    }

    $user = verifyToken($token);
    if (!$user) {
        sendError('Token invalide', 401);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $userId = $user['user_id'];
        
        // Récupérer les 3 commandes les plus récentes
        $stmt = $pdo->prepare("
            SELECT o.*, 
                   JSON_ARRAYAGG(
                       JSON_OBJECT(
                           'id', oi.item_id,
                           'name', oi.item_name,
                           'price', oi.price,
                           'quantity', oi.quantity,
                           'image_url', oi.image_url,
                           'description', oi.description
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ? AND o.status != 'cancelled'
            ORDER BY o.created_at DESC 
            LIMIT 3
        ");
        
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parser les items JSON
        foreach ($orders as &$order) {
            if ($order['items']) {
                $order['items'] = json_decode($order['items'], true);
            }
            
            // Formater les dates
            $order['created_at'] = $order['created_at'];
            $order['updated_at'] = $order['updated_at'];
        }
        
        $response = [
            'success' => true,
            'orders' => $orders
        ];
        
        sendSuccess($response);
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO recent.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur recent.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
