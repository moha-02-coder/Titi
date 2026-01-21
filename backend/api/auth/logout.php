<?php
/**
 * API de déconnexion
 * POST /backend/api/auth/logout.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Authorization');

// Inclure les configurations
require_once '../../config/database.php';
require_once '../../config/session.php';

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
    exit;
}

try {
    // Récupérer le token depuis le header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        
        // Se connecter à la base de données
        $pdo = getDatabaseConnection();
        
        // Supprimer la session correspondante dans la table `sessions`
        $query = "DELETE FROM sessions WHERE session_token = :token";
        $stmt = $pdo->prepare($query);
        $stmt->execute(['token' => $token]);
    }
    
    // Déconnecter la session
    logout();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Déconnexion réussie'
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la déconnexion'
    ]);
}
?>