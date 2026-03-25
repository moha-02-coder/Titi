<?php
/**
 * API pour mettre à jour le profil utilisateur
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
        // Récupérer les données du formulaire
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendError('Données invalides', 400);
        }

        // Valider les champs requis
        $required = ['first_name', 'last_name', 'email'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                sendError("Le champ '$field' est requis", 400);
            }
        }

        // Valider l'email
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            sendError('Email invalide', 400);
        }

        // Vérifier si l'email est déjà utilisé par un autre utilisateur
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$input['email'], $user['user_id']]);
        if ($stmt->fetch()) {
            sendError('Cet email est déjà utilisé', 400);
        }

        // Préparer la mise à jour
        $updateFields = [
            'first_name' => trim($input['first_name']),
            'last_name' => trim($input['last_name']),
            'email' => trim($input['email']),
            'phone' => !empty($input['phone']) ? trim($input['phone']) : null,
            'address' => !empty($input['address']) ? trim($input['address']) : null,
            'city' => !empty($input['city']) ? trim($input['city']) : null,
            'quarter' => !empty($input['quarter']) ? trim($input['quarter']) : null,
            'updated_at' => date('Y-m-d H:i:s')
        ];

        // Ajouter le mot de passe si fourni
        if (!empty($input['password'])) {
            if (strlen($input['password']) < 8) {
                sendError('Le mot de passe doit contenir au moins 8 caractères', 400);
            }
            
            $updateFields['password'] = password_hash($input['password'], PASSWORD_DEFAULT);
        }

        // Construire la requête de mise à jour
        $setClause = [];
        $values = [];
        foreach ($updateFields as $field => $value) {
            $setClause[] = "$field = ?";
            $values[] = $value;
        }

        $sql = "UPDATE users SET " . implode(', ', $setClause) . " WHERE id = ?";
        $values[] = $user['user_id'];

        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($values);

        if ($result) {
            // Récupérer les données mises à jour
            $stmt = $pdo->prepare("
                SELECT id, first_name, last_name, email, phone, address, city, quarter, 
                       avatar, created_at, updated_at, status, role
                FROM users 
                WHERE id = ?
            ");
            
            $stmt->execute([$user['user_id']]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'message' => 'Profil mis à jour avec succès',
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
                    'updated_at' => $userData['updated_at']
                ]
            ];
            
            sendSuccess($response);
        } else {
            sendError('Erreur lors de la mise à jour du profil', 500);
        }
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO update.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur update.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}
?>
