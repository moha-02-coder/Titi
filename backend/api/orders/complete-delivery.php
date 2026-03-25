<?php
/**
 * API pour terminer une livraison
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['order_id'])) {
            sendError('ID de commande requis', 400);
        }

        $orderId = $input['order_id'];
        $deliveryPersonId = $user['user_id'];
        
        // Vérifier que la commande est assignée à ce livreur
        $stmt = $pdo->prepare("
            SELECT id, status FROM orders 
            WHERE id = ? AND delivery_person_id = ? AND status = 'delivery'
        ");
        $stmt->execute([$orderId, $deliveryPersonId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            sendError('Commande non trouvée ou non en livraison', 404);
        }
        
        // Mettre à jour le statut en "completed"
        $updateStmt = $pdo->prepare("
            UPDATE orders 
            SET status = 'completed', 
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ? AND delivery_person_id = ?
        ");
        
        $result = $updateStmt->execute([$orderId, $deliveryPersonId]);
        
        if ($result) {
            // Notifier le client
            $this->notifyCustomer($orderId, 'Votre commande a été livrée avec succès');
            
            $response = [
                'success' => true,
                'message' => 'Livraison terminée avec succès'
            ];
            
            sendSuccess($response);
        } else {
            sendError('Erreur lors de la finalisation de la livraison', 500);
        }
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO complete-delivery.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur complete-delivery.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
