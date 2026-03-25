<?php
/**
 * API pour mettre à jour l'avatar utilisateur
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
        // Vérifier si un fichier a été uploadé
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            sendError('Aucun fichier uploadé ou erreur d\'upload', 400);
        }

        $file = $_FILES['avatar'];
        
        // Valider le fichier
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5MB
        
        $fileInfo = finfo_open($file['tmp_name']);
        if (!$fileInfo) {
            sendError('Impossible d\'analyser le fichier', 400);
        }
        
        $mimeType = $fileInfo['mime'];
        if (!in_array($mimeType, $allowedTypes)) {
            sendError('Type de fichier non autorisé. Utilisez JPG, PNG ou GIF', 400);
        }
        
        if ($file['size'] > $maxSize) {
            sendError('Le fichier est trop volumineux. Maximum 5MB', 400);
        }
        
        // Créer le répertoire d'upload si nécessaire
        $uploadDir = '../../uploads/avatars/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Générer un nom de fichier unique
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $user['user_id'] . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;
        
        // Déplacer le fichier uploadé
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            sendError('Erreur lors du déplacement du fichier', 500);
        }
        
        // Mettre à jour la base de données
        $stmt = $pdo->prepare("UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?");
        $result = $stmt->execute([$filename, date('Y-m-d H:i:s'), $user['user_id']]);
        
        if ($result) {
            $response = [
                'success' => true,
                'message' => 'Avatar mis à jour avec succès',
                'avatar_url' => '../uploads/avatars/' . $filename
            ];
            
            sendSuccess($response);
        } else {
            sendError('Erreur lors de la mise à jour de l\'avatar', 500);
        }
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO avatar.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur avatar.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
