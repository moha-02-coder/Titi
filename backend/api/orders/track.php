<?php
/**
 * API pour suivre une commande (accessible sans authentification avec code de suivi)
 * GET /backend/api/orders/track.php?tracking_code={code}
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

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

try {
    // Se connecter à la base de données
    $pdo = getDatabaseConnection();
    
    // Récupérer le code de suivi
    $trackingCode = $_GET['tracking_code'] ?? null;
    $orderId = $_GET['order_id'] ?? null;
    
    // Si un code de suivi est fourni, l'utiliser
    if ($trackingCode) {
        // Dans une vraie application, on aurait une table tracking_codes
        // Pour ce projet, on génère un code simple basé sur l'ID de commande
        $orderIdFromCode = extractOrderIdFromTrackingCode($trackingCode);
        
        if (!$orderIdFromCode) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Code de suivi invalide'
            ]);
            exit;
        }
        
        $orderId = $orderIdFromCode;
    }
    
    // Vérifier si l'ID de commande est fourni
    if (!$orderId || !is_numeric($orderId)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID de commande ou code de suivi requis'
        ]);
        exit;
    }
    
    // Récupérer les informations de base de la commande
    $query = "SELECT o.*, 
              CONCAT(u.first_name, ' ', u.last_name) as customer_name,
              u.phone as customer_phone
              FROM orders o
              JOIN users u ON o.user_id = u.id
              WHERE o.id = :order_id";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute(['order_id' => $orderId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Commande non trouvée'
        ]);
        exit;
    }
    
    // Récupérer les articles de la commande
    $itemsQuery = "SELECT * FROM order_items WHERE order_id = :order_id";
    $itemsStmt = $pdo->prepare($itemsQuery);
    $itemsStmt->execute(['order_id' => $orderId]);
    $items = $itemsStmt->fetchAll();
    
    // Récupérer l'historique du statut
    $historyQuery = "SELECT 
                     created_at as timestamp,
                     status,
                     'Commande créée' as description
                     FROM orders 
                     WHERE id = :order_id
                     
                     UNION ALL
                     
                     SELECT 
                     updated_at as timestamp,
                     status,
                     CASE status
                         WHEN 'confirmed' THEN 'Commande confirmée par le restaurant'
                         WHEN 'preparing' THEN 'Commande en préparation'
                         WHEN 'delivery' THEN 'Commande en cours de livraison'
                         WHEN 'completed' THEN 'Commande livrée'
                         WHEN 'cancelled' THEN 'Commande annulée'
                         ELSE 'Statut mis à jour'
                     END as description
                     FROM orders 
                     WHERE id = :order_id AND updated_at != created_at
                     
                     ORDER BY timestamp ASC";
    
    $historyStmt = $pdo->prepare($historyQuery);
    $historyStmt->execute(['order_id' => $orderId]);
    $history = $historyStmt->fetchAll();
    
    // Informations de suivi
    $trackingInfo = [
        'order_id' => $order['id'],
        'tracking_code' => generateTrackingCode($order['id']),
        'current_status' => $order['status'],
        'status_text' => getStatusText($order['status']),
        'estimated_delivery' => calculateEstimatedDelivery($order['created_at'], $order['status']),
        'can_be_cancelled' => canOrderBeCancelled($order['status'], $order['created_at'])
    ];
    
    // Préparer la réponse
    $response = [
        'success' => true,
        'tracking' => $trackingInfo,
        'order' => [
            'id' => $order['id'],
            'customer_name' => $order['customer_name'],
            'customer_phone' => maskPhoneNumber($order['customer_phone']),
            'status' => $order['status'],
            'status_text' => getStatusText($order['status']),
            'final_price' => $order['final_price'],
            'delivery_address' => $order['delivery_address'],
            'created_at' => $order['created_at'],
            'updated_at' => $order['updated_at']
        ],
        'items' => array_map(function($item) {
            return [
                'name' => $item['item_name'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $item['quantity'] * $item['unit_price']
            ];
        }, $items),
        'history' => array_map(function($entry) {
            return [
                'timestamp' => $entry['timestamp'],
                'time' => date('H:i', strtotime($entry['timestamp'])),
                'date' => date('d/m/Y', strtotime($entry['timestamp'])),
                'status' => $entry['status'],
                'description' => $entry['description']
            ];
        }, $history)
    ];
    
    http_response_code(200);
    echo json_encode($response);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors du suivi de la commande'
    ]);
}

// Fonctions utilitaires

function generateTrackingCode($orderId) {
    // Générer un code de suivi simple (dans une vraie app, utiliser un hash)
    $prefix = 'TGT'; // Titi Golden Taste
    $date = date('ymd');
    return $prefix . $date . str_pad($orderId, 6, '0', STR_PAD_LEFT);
}

function extractOrderIdFromTrackingCode($trackingCode) {
    // Extraire l'ID de commande du code de suivi
    if (preg_match('/TGT\d{6}(\d+)/', $trackingCode, $matches)) {
        return (int)$matches[1];
    }
    return null;
}

function getStatusText($status) {
    $statusMap = [
        'pending' => 'En attente de confirmation',
        'confirmed' => 'Confirmée',
        'preparing' => 'En préparation',
        'delivery' => 'En cours de livraison',
        'completed' => 'Livrée',
        'cancelled' => 'Annulée'
    ];
    return $statusMap[$status] ?? $status;
}

function calculateEstimatedDelivery($createdAt, $currentStatus) {
    $createdTimestamp = strtotime($createdAt);
    $now = time();
    
    // Temps estimés selon le statut
    $estimatedTimes = [
        'pending' => 60, // 60 minutes si pas encore confirmé
        'confirmed' => 45,
        'preparing' => 30,
        'delivery' => 15,
        'completed' => 0,
        'cancelled' => null
    ];
    
    if (!isset($estimatedTimes[$currentStatus]) || $estimatedTimes[$currentStatus] === null) {
        return null;
    }
    
    $estimatedMinutes = $estimatedTimes[$currentStatus];
    $estimatedTime = $createdTimestamp + ($estimatedMinutes * 60);
    
    // Si le temps estimé est déjà passé, retourner "Bientôt"
    if ($estimatedTime <= $now) {
        return 'Bientôt';
    }
    
    $remainingMinutes = ceil(($estimatedTime - $now) / 60);
    
    if ($remainingMinutes <= 0) {
        return 'Bientôt';
    }
    
    return "Dans {$remainingMinutes} minute" . ($remainingMinutes > 1 ? 's' : '');
}

function canOrderBeCancelled($status, $createdAt) {
    // Ne peut être annulé que si en attente et dans les 15 premières minutes
    if ($status !== 'pending') {
        return false;
    }
    
    $createdTimestamp = strtotime($createdAt);
    $now = time();
    $minutesSinceCreation = ($now - $createdTimestamp) / 60;
    
    return $minutesSinceCreation <= 15;
}

function maskPhoneNumber($phone) {
    // Masquer partiellement le numéro de téléphone pour la confidentialité
    if (strlen($phone) <= 4) {
        return $phone;
    }
    
    $visibleDigits = 4;
    $maskedPart = str_repeat('*', strlen($phone) - $visibleDigits);
    $visiblePart = substr($phone, -$visibleDigits);
    
    return $maskedPart . $visiblePart;
}
?>