<?php
/**
 * API pour mettre à jour le statut d'une commande (utilisateur peut annuler)
 * PUT /backend/api/orders/update-status.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Inclure la configuration de la base de données
require_once '../../config/database.php';

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
    
    // Récupérer les données
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validation des données
    if (!isset($data['order_id']) || !is_numeric($data['order_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID de commande requis'
        ]);
        exit;
    }
    
    // Les utilisateurs normaux ne peuvent que annuler leurs commandes
    // Les admins peuvent modifier n'importe quel statut
    $allowedStatuses = $user['is_admin'] 
        ? ['pending', 'confirmed', 'preparing', 'delivery', 'completed', 'cancelled']
        : ['cancelled']; // Utilisateur normal ne peut qu'annuler
    
    if (!isset($data['status']) || !in_array($data['status'], $allowedStatuses)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Statut non autorisé'
        ]);
        exit;
    }
    
    // Vérifier si la commande existe et appartient à l'utilisateur
    if ($user['is_admin']) {
        $checkQuery = "SELECT id, status FROM orders WHERE id = :order_id";
        $checkParams = ['order_id' => $data['order_id']];
    } else {
        $checkQuery = "SELECT id, status FROM orders WHERE id = :order_id AND user_id = :user_id";
        $checkParams = [
            'order_id' => $data['order_id'],
            'user_id' => $user['id']
        ];
    }
    
    $checkStmt = $pdo->prepare($checkQuery);
    $checkStmt->execute($checkParams);
    $order = $checkStmt->fetch();
    
    if (!$order) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Commande non trouvée ou accès non autorisé'
        ]);
        exit;
    }
    
    // Validation supplémentaire pour les annulations utilisateur
    if (!$user['is_admin'] && $data['status'] === 'cancelled') {
        // Un utilisateur ne peut annuler que si la commande est encore en attente
        if ($order['status'] !== 'pending') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Impossible d\'annuler une commande déjà traitée. Contactez le restaurant.'
            ]);
            exit;
        }
        
        // Limiter le temps d'annulation (par exemple, dans les 15 premières minutes)
        $timeCheckQuery = "SELECT TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_ago 
                          FROM orders WHERE id = :order_id";
        $timeCheckStmt = $pdo->prepare($timeCheckQuery);
        $timeCheckStmt->execute(['order_id' => $data['order_id']]);
        $timeDiff = $timeCheckStmt->fetch();
        
        if ($timeDiff['minutes_ago'] > 15) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Délai d\'annulation dépassé (15 minutes). Contactez le restaurant.'
            ]);
            exit;
        }
    }
    
    // Mettre à jour le statut
    $query = "UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :order_id";
    
    // Ajouter une note si fournie
    if (!empty($data['reason'])) {
        $notePrefix = $user['is_admin'] ? "[Admin] " : "[Client] ";
        $query = "UPDATE orders SET status = :status, 
                  notes = CONCAT(COALESCE(notes, ''), '\n', :note_prefix, :reason), 
                  updated_at = NOW() 
                  WHERE id = :order_id";
    }
    
    $stmt = $pdo->prepare($query);
    
    if (!empty($data['reason'])) {
        $stmt->execute([
            'status' => $data['status'],
            'note_prefix' => $notePrefix,
            'reason' => $data['reason'],
            'order_id' => $data['order_id']
        ]);
    } else {
        $stmt->execute([
            'status' => $data['status'],
            'order_id' => $data['order_id']
        ]);
    }
    
    // Si annulation, restaurer le stock des produits
    if ($data['status'] === 'cancelled') {
        restoreStockForOrder($pdo, $data['order_id']);
    }
    
    // Récupérer la commande mise à jour
    $selectQuery = "SELECT * FROM orders WHERE id = :order_id";
    $selectStmt = $pdo->prepare($selectQuery);
    $selectStmt->execute(['order_id' => $data['order_id']]);
    $updatedOrder = $selectStmt->fetch();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Statut de commande mis à jour',
        'order' => $updatedOrder
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la mise à jour du statut de la commande',
        'debug' => ENVIRONMENT === 'development' ? $e->getMessage() : null
    ]);
}

// Fonction pour restaurer le stock lors d'une annulation
function restoreStockForOrder($pdo, $orderId) {
    $itemsQuery = "SELECT * FROM order_items WHERE order_id = :order_id AND item_type = 'product'";
    $itemsStmt = $pdo->prepare($itemsQuery);
    $itemsStmt->execute(['order_id' => $orderId]);
    $items = $itemsStmt->fetchAll();
    
    foreach ($items as $item) {
        $updateQuery = "UPDATE products SET stock = stock + :quantity WHERE id = :id";
        $updateStmt = $pdo->prepare($updateQuery);
        $updateStmt->execute([
            'quantity' => $item['quantity'],
            'id' => $item['item_id']
        ]);
    }
}
?>