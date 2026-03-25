<?php
/**
 * API pour récupérer le profil utilisateur
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
        // Récupérer le profil utilisateur
        $stmt = $pdo->prepare("
            SELECT id, first_name, last_name, email, phone, address, city, quarter, 
                   avatar, created_at, updated_at, status, role
            FROM users 
            WHERE id = ? AND status = 'active'
        ");
        
        $stmt->execute([$user['user_id']]);
        $userData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($userData) {
            // Formater les données
            $response = [
                'success' => true,
                'user' => [
                    'id' => (int)$userData['id'],
                    'first_name' => $userData['first_name'],
                    'last_name' => $userData['last_name'],
                    'email' => $userData['email'],
                    'phone' => $userData['phone'],
                    'address' => $userData['address'],
                    'city' => $userData['city'],
                    'quarter' => $userData['quarter'],
                    'avatar' => $userData['avatar'] ? '../../uploads/avatars/' . $userData['avatar'] : null,
                    'created_at' => $userData['created_at'],
                    'updated_at' => $userData['updated_at'],
                    'status' => $userData['status'],
                    'role' => $userData['role']
                ]
            ];
            
            sendSuccess($response);
        } else {
            sendError('Utilisateur non trouvé', 404);
        }
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO profile.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur profile.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
