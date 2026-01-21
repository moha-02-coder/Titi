<?php
/**
 * API Mot de passe oublié
 * POST /backend/api/auth/forgot-password.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email invalide']);
    exit;
}

try {
    $pdo = getDatabaseConnection();

    // Vérifier l'utilisateur
    $stmt = $pdo->prepare('SELECT id, email, first_name FROM users WHERE email = :email AND active = 1');
    $stmt->execute(['email' => $data['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        // Répondre toujours OK pour éviter de révéler l'existence d'un compte
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Si ce compte existe, vous recevrez un email de réinitialisation.']);
        exit;
    }

    // Créer table password_resets si elle n'existe pas (développement local)
    $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(128) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Générer token
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $ins = $pdo->prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (:uid, :token, :exp)');
    $ins->execute(['uid' => $user['id'], 'token' => $token, 'exp' => $expires]);

    // Ici on enverrait l'email réel. Pour dev local, on retourne le lien.
    $resetLink = sprintf('http://%s/titi-golden-taste/backend/api/auth/reset-password.php?token=%s', $_SERVER['HTTP_HOST'], $token);

    // Ajouter une notification interne
    $note = $pdo->prepare('INSERT INTO notifications (user_id, type, title, content, data_json) VALUES (:uid, :type, :title, :content, :data)');
    $note->execute([
        'uid' => $user['id'],
        'type' => 'password_reset',
        'title' => 'Réinitialisation de mot de passe',
        'content' => 'Demande de réinitialisation de mot de passe',
        'data' => json_encode(['reset_link' => $resetLink])
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Si ce compte existe, vous recevrez un email de réinitialisation. (dev: reset link below)',
        'reset_link' => $resetLink
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur', 'debug' => $e->getMessage()]);
}
