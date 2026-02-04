<?php
/**
 * API de connexion - Titi Golden Taste
 * POST /backend/api/auth/login.php
 */

// === CONFIGURATION ===
error_reporting(E_ALL);
ini_set('display_errors', 0);
define('ENVIRONMENT', getenv('APP_ENV') ?: 'production');

// Headers de sécurité et CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Gestion du preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée',
        'code' => 'METHOD_NOT_ALLOWED'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Vérifier le Content-Type
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (!str_contains($contentType, 'application/json')) {
    http_response_code(415);
    echo json_encode([
        'success' => false,
        'message' => 'Content-Type doit être application/json',
        'code' => 'INVALID_CONTENT_TYPE'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Inclure les configurations
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session.php';

// Fonction de réponse JSON normalisée
function jsonResponse($success, $message, $data = null, $code = null, $httpCode = 200) {
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('c')
    ];
    
    if ($code) {
        $response['code'] = $code;
    }
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    http_response_code($httpCode);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Fonction de nettoyage des données
function cleanInput($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

// Fonction de validation d'email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) && 
           preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email);
}

// Fonction de validation de téléphone
function isValidPhone($phone) {
    $cleaned = preg_replace('/[^0-9]/', '', $phone);
    return preg_match('/^(76|77|78|79|66|67|68|69|90|91)[0-9]{6}$/', $cleaned);
}

// Fonction de détection de bot/attaque
function isSuspiciousRequest($identifier, $attempts) {
    // Si plus de 5 tentatives pour le même identifiant dans les 15 dernières minutes
    if ($attempts >= 5) {
        return true;
    }
    
    // Vérifier les patterns suspects
    $suspiciousPatterns = [
        '/<script>/i',
        '/union.*select/i',
        '/or.*1=1/i',
        '/--/',
        '/\/\*/',
        '/waitfor delay/i'
    ];
    
    foreach ($suspiciousPatterns as $pattern) {
        if (preg_match($pattern, $identifier)) {
            return true;
        }
    }
    
    return false;
}

// Fonction de création de token JWT-like
function createAuthToken($userId, $email, $role) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $userId,
        'email' => $email,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60), // 7 jours
        'iss' => 'titi_golden_taste'
    ]);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, getenv('JWT_SECRET') ?: 'your-secret-key', true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// Fonction de vérification de token
function verifyAuthToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, getenv('JWT_SECRET') ?: 'your-secret-key', true);
    $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if (!hash_equals($expectedSignature, $base64UrlSignature)) {
        return false;
    }
    
    $payload = json_decode(base64_decode($base64UrlPayload), true);
    
    // Vérifier l'expiration
    if (!isset($payload['exp']) || time() > $payload['exp']) {
        return false;
    }
    
    return $payload;
}

// Fonction de gestion des tentatives de connexion
function trackLoginAttempt($identifier, $success, $pdo) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    
    $stmt = $pdo->prepare("
        INSERT INTO login_attempts (identifier, ip_address, user_agent, success, created_at)
        VALUES (:identifier, :ip, :ua, :success, NOW())
    ");
    
    $stmt->execute([
        'identifier' => $identifier,
        'ip' => $ip,
        'ua' => $userAgent,
        'success' => $success ? 1 : 0
    ]);
    
    // Nettoyer les anciennes tentatives (> 24h)
    $pdo->exec("DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
}

// Fonction de comptage des tentatives
function countRecentAttempts($identifier, $pdo, $minutes = 15) {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as attempts
        FROM login_attempts 
        WHERE identifier = :identifier 
          AND success = 0
          AND created_at > DATE_SUB(NOW(), INTERVAL :minutes MINUTE)
    ");
    
    $stmt->execute(['identifier' => $identifier, 'minutes' => $minutes]);
    $result = $stmt->fetch();
    
    return $result['attempts'] ?? 0;
}

try {
    // === RÉCUPÉRATION ET VALIDATION DES DONNÉES ===
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        jsonResponse(false, 'Données requises manquantes', null, 'MISSING_DATA', 400);
    }
    
    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(false, 'JSON invalide', null, 'INVALID_JSON', 400);
    }
    
    // Nettoyer et valider les données
    if (!isset($data['email']) || !isset($data['password'])) {
        jsonResponse(false, 'Email et mot de passe requis', null, 'MISSING_CREDENTIALS', 400);
    }
    
    $identifier = cleanInput($data['email']);
    $password = $data['password'];
    
    // === CONNEXION À LA BASE DE DONNÉES ===
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table login_attempts existe
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                identifier VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                success TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_identifier (identifier),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $e) {
        // Ignorer si la table existe déjà
    }
    
    // === VÉRIFICATION DES TENTATIVES ===
    $recentAttempts = countRecentAttempts($identifier, $pdo);
    
    if (isSuspiciousRequest($identifier, $recentAttempts)) {
        trackLoginAttempt($identifier, false, $pdo);
        sleep(2); // Délai pour ralentir les attaques
        jsonResponse(false, 'Trop de tentatives. Veuillez réessayer plus tard.', null, 'TOO_MANY_ATTEMPTS', 429);
    }
    
    // === RECHERCHE DE L'UTILISATEUR ===
    // Support email ou téléphone
    if (isValidEmail($identifier)) {
        $query = "SELECT * FROM users WHERE email = :identifier AND active = 1";
    } elseif (isValidPhone($identifier)) {
        $query = "SELECT * FROM users WHERE phone = :identifier AND active = 1";
    } else {
        trackLoginAttempt($identifier, false, $pdo);
        jsonResponse(false, 'Format d\'identifiant invalide', null, 'INVALID_IDENTIFIER', 400);
    }
    
    $stmt = $pdo->prepare($query);
    $stmt->execute(['identifier' => $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // === VÉRIFICATION DU MOT DE PASSE ===
    if (!$user) {
        trackLoginAttempt($identifier, false, $pdo);
        sleep(1); // Délai pour éviter l'énumération
        jsonResponse(false, 'Identifiant ou mot de passe incorrect', null, 'INVALID_CREDENTIALS', 401);
    }
    
    // Vérifier si le compte est bloqué/suspendu
    if (isset($user['status']) && $user['status'] === 'suspended') {
        trackLoginAttempt($identifier, false, $pdo);
        jsonResponse(false, 'Votre compte a été suspendu. Contactez le support.', null, 'ACCOUNT_SUSPENDED', 403);
    }
    
    // Vérifier si le compte est en attente de validation (livreurs)
    if ($user['verified'] == 0) {
        // Vérifier si c'est un livreur
        $driverStmt = $pdo->prepare("SELECT status FROM drivers WHERE user_id = :user_id");
        $driverStmt->execute(['user_id' => $user['id']]);
        $driver = $driverStmt->fetch();
        
        if ($driver) {
            $status = $driver['status'] ?? 'pending';
            $messages = [
                'pending' => 'Votre compte livreur est en attente de validation par l\'administrateur.',
                'rejected' => 'Votre demande de livreur a été rejetée. Contactez le support pour plus d\'informations.'
            ];
            
            if (isset($messages[$status])) {
                trackLoginAttempt($identifier, false, $pdo);
                jsonResponse(false, $messages[$status], ['status' => $status], 'ACCOUNT_PENDING', 403);
            }
        }
    }
    
    // Vérifier le mot de passe
    if (!password_verify($password, $user['password'])) {
        trackLoginAttempt($identifier, false, $pdo);
        sleep(1); // Délai pour éviter les attaques par force brute
        
        // Notifier l'utilisateur de l'échec si email valide
        if (isValidEmail($identifier)) {
            $notifyStmt = $pdo->prepare("
                INSERT INTO notifications (
                    user_id, type, title, message, created_at
                ) VALUES (
                    :user_id, 'login_failed', 'Tentative de connexion échouée',
                    'Une tentative de connexion a échoué pour votre compte.',
                    NOW()
                )
            ");
            $notifyStmt->execute(['user_id' => $user['id']]);
        }
        
        jsonResponse(false, 'Identifiant ou mot de passe incorrect', null, 'INVALID_CREDENTIALS', 401);
    }
    
    // === CONNEXION RÉUSSIE ===
    trackLoginAttempt($identifier, true, $pdo);
    
    // Mettre à jour la dernière connexion
    $updateQuery = "UPDATE users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = :id";
    $updateStmt = $pdo->prepare($updateQuery);
    $updateStmt->execute(['id' => $user['id']]);
    
    // === CRÉATION DE LA SESSION/TOKEN ===
    // NOTE: users.role peut être un ENUM limité (ex: client/admin). Pour les livreurs,
    // on détecte via l'existence d'un profil dans la table drivers.
    $role = $user['role'] ?? 'client';
    $effectiveRole = $role;

    // Detect driver profile (role logique)
    $driverInfo = null;
    try {
        $driverStmt = $pdo->prepare("SELECT status, id_document, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate, rating, total_deliveries FROM drivers WHERE user_id = :user_id LIMIT 1");
        $driverStmt->execute(['user_id' => $user['id']]);
        $driverInfo = $driverStmt->fetch(PDO::FETCH_ASSOC);
        if ($driverInfo) {
            $effectiveRole = 'delivery';
        }
    } catch (Exception $e) {
        $driverInfo = null;
    }
    
    // Token JWT pour l'API
    $authToken = createAuthToken($user['id'], $user['email'], $effectiveRole);
    
    // Session classique (cookies)
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_secure' => ENVIRONMENT === 'production',
            'cookie_samesite' => 'Strict',
            'use_strict_mode' => true
        ]);
    }
    
    // Régénérer l'ID de session
    session_regenerate_id(true);
    
    $_SESSION = [
        'user_id' => $user['id'],
        'user_email' => $user['email'],
        'user_role' => $effectiveRole,
        'user_name' => $user['first_name'] . ' ' . $user['last_name'],
        'user_avatar' => $user['avatar'] ?? null,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        'logged_in_at' => time(),
        'token' => $authToken
    ];
    
    // Stocker la session dans la base de données
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(128) PRIMARY KEY,
                user_id INT NOT NULL,
                data TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        
        $sessionStmt = $pdo->prepare("
            INSERT INTO sessions (id, user_id, data, ip_address, user_agent, expires_at)
            VALUES (:id, :user_id, :data, :ip, :ua, :expires)
            ON DUPLICATE KEY UPDATE
                data = VALUES(data),
                ip_address = VALUES(ip_address),
                user_agent = VALUES(user_agent),
                expires_at = VALUES(expires_at)
        ");
        
        $sessionData = json_encode([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $effectiveRole
            ],
            'permissions' => [],
            'metadata' => [
                'login_time' => date('c'),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]
        ]);
        
        $sessionStmt->execute([
            'id' => session_id(),
            'user_id' => $user['id'],
            'data' => $sessionData,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'expires' => date('Y-m-d H:i:s', strtotime('+7 days'))
        ]);
    } catch (Exception $e) {
        // Log l'erreur mais continue
        error_log('Session DB error: ' . $e->getMessage());
    }
    
    // === PRÉPARATION DE LA RÉPONSE ===
    // Masquer les données sensibles
    unset($user['password']);
    unset($user['reset_token']);
    unset($user['activation_token']);
    
    // Ajouter des informations supplémentaires
    $userData = [
        'id' => $user['id'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        // role logique côté client
        'role' => $effectiveRole,
        'avatar' => $user['avatar'] ?? null,
        'verified' => (bool)($user['verified'] ?? false),
        'last_login' => $user['last_login'],
        'requires_password_change' => !empty($user['password_changed_at']) && 
                                     strtotime($user['password_changed_at']) < strtotime('-90 days')
    ];
    
    // Ajouter des informations spécifiques au livreur si profil drivers présent
    if ($driverInfo) {
        $userData['driver_info'] = $driverInfo;
    }
    
    // === RÉPONSE DE SUCCÈS ===
    $responseData = [
        'user' => $userData,
        'token' => $authToken,
        'token_type' => 'Bearer',
        'expires_in' => 7 * 24 * 60 * 60, // 7 jours en secondes
        'session_id' => session_id(),
        'permissions' => [], // À remplir selon les rôles/permissions
        'welcome_message' => $user['login_count'] <= 1 
            ? 'Bienvenue sur Titi Golden Taste !' 
            : 'Content de vous revoir !'
    ];
    
    // Définir le cookie de session
    setcookie(
        'TGT_SESSION',
        session_id(),
        [
            'expires' => time() + (7 * 24 * 60 * 60),
            'path' => '/',
            'domain' => '',
            'secure' => ENVIRONMENT === 'production',
            'httponly' => true,
            'samesite' => 'Strict'
        ]
    );
    
    jsonResponse(true, 'Connexion réussie', $responseData, 'LOGIN_SUCCESS', 200);
    
} catch (PDOException $e) {
    error_log('Database error in login.php: ' . $e->getMessage());
    jsonResponse(false, 
        ENVIRONMENT === 'development' ? 'Erreur base de données: ' . $e->getMessage() : 'Erreur serveur',
        null, 
        'DATABASE_ERROR', 
        500
    );
} catch (Exception $e) {
    error_log('Error in login.php: ' . $e->getMessage());
    jsonResponse(false, 
        ENVIRONMENT === 'development' ? 'Erreur: ' . $e->getMessage() : 'Erreur lors de la connexion',
        null, 
        'LOGIN_ERROR', 
        500
    );
}
?>