<?php
/**
 * API pour récupérer les commandes assignées au livreur
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
        
        // Récupérer les paramètres de filtrage
        $status = $_GET['status'] ?? 'all';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        
        // Construire la requête pour les livreurs
        $sql = "
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
            WHERE o.delivery_person_id = ? AND o.status IN ('assigned', 'preparing', 'delivery')
        ";
        
        $params = [$userId];
        
        // Ajouter le filtre de statut si spécifié
        if ($status !== 'all') {
            $sql .= " AND o.status = ?";
            $params[] = $status;
        }
        
        $sql .= "
            ORDER BY o.created_at DESC 
            LIMIT ? OFFSET ?
        ";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
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
            'orders' => $orders,
            'total' => count($orders),
            'limit' => $limit,
            'offset' => $offset
        ];
        
        sendSuccess($response);
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO delivery-orders.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur delivery-orders.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
