<?php
/**
 * API pour récupérer les statistiques utilisateur
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
        
        // Statistiques des commandes
        $orderStats = $pdo->prepare("
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total), 0) as total_spent,
                MIN(created_at) as first_order_date
            FROM orders 
            WHERE user_id = ? AND status != 'cancelled'
        ");
        $orderStats->execute([$userId]);
        $orderData = $orderStats->fetch(PDO::FETCH_ASSOC);
        
        // Statistiques des articles favoris
        $favoriteStats = $pdo->prepare("
            SELECT COUNT(DISTINCT item_id) as favorite_items
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.user_id = ? AND o.status = 'completed'
            GROUP BY item_id
            HAVING COUNT(*) > 1
        ");
        $favoriteStats->execute([$userId]);
        $favoriteData = $favoriteStats->fetch(PDO::FETCH_ASSOC);
        
        // Date d'inscription
        $userStmt = $pdo->prepare("SELECT created_at FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $userData = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        $stats = [
            'total_orders' => (int)$orderData['total_orders'],
            'total_spent' => (int)$orderData['total_spent'],
            'favorite_items' => (int)($favoriteData['favorite_items'] ?? 0),
            'member_since' => $userData['created_at'],
            'first_order_date' => $orderData['first_order_date']
        ];
        
        $response = [
            'success' => true,
            'stats' => $stats
        ];
        
        sendSuccess($response);
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO stats.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur stats.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
