<?php
/**
 * API de vérification d'authentification - Titi Golden Taste
 * GET /backend/api/auth/check-auth.php
 * 
 * Vérifie la validité d'un token d'authentification et retourne
 * les informations de l'utilisateur correspondant.
 */

// === CONFIGURATION ===
error_reporting(E_ALL);
ini_set('display_errors', 0);
define('ENVIRONMENT', getenv('APP_ENV') ?: 'production');

// Headers de sécurité et CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key, X-Requested-With');
header('Access-Control-Expose-Headers: X-Auth-Refresh');
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
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    httpResponse(405, false, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
}

// Inclure les configurations
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt.php'; // Pour la vérification JWT

// Fonction de réponse HTTP normalisée
function httpResponse($code, $success, $message, $data = null, $errorCode = null) {
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('c')
    ];
    
    if ($errorCode) {
        $response['code'] = $errorCode;
    }
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    http_response_code($code);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Fonction d'extraction du token depuis les headers
function extractAuthToken() {
    // 1. Vérifier le header Authorization
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') === 0) {
        return trim(substr($authHeader, 7));
    }
    
    // 2. Vérifier le cookie de session (pour les requêtes navigateur)
    if (isset($_COOKIE['TGT_SESSION'])) {
        return $_COOKIE['TGT_SESSION'];
    }
    
    // 3. Vérifier le paramètre GET (déconseillé, mais supporté pour compatibilité)
    if (isset($_GET['token']) && !empty($_GET['token'])) {
        return $_GET['token'];
    }
    
    // 4. Vérifier le header X-Auth-Token (alternative)
    if (isset($headers['X-Auth-Token']) && !empty($headers['X-Auth-Token'])) {
        return $headers['X-Auth-Token'];
    }
    
    return null;
}

// Fonction de vérification JWT
function verifyJWT($token) {
    if (!defined('JWT_SECRET')) {
        define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-secure-jwt-secret-key-change-in-production');
    }
    
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    list($headerB64, $payloadB64, $signatureB64) = $parts;
    
    // Vérifier la signature
    $signature = hash_hmac('sha256', $headerB64 . "." . $payloadB64, JWT_SECRET, true);
    $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if (!hash_equals($expectedSignature, $signatureB64)) {
        return false;
    }
    
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadB64)), true);
    
    if (!$payload) {
        return false;
    }
    
    // Vérifier l'expiration
    if (!isset($payload['exp']) || time() > $payload['exp']) {
        return false;
    }
    
    // Vérifier l'émetteur
    if (!isset($payload['iss']) || $payload['iss'] !== 'titi-golden-taste') {
        return false;
    }
    
    // Vérifier l'audience
    if (!isset($payload['aud']) || $payload['aud'] !== 'titi-golden-taste-api') {
        return false;
    }
    
    return $payload;
}

// Fonction de rafraîchissement de token
function refreshToken($userId, $pdo) {
    // Générer un nouveau token JWT
    $userQuery = $pdo->prepare("
        SELECT id, email, role 
        FROM users 
        WHERE id = :id AND active = 1
    ");
    $userQuery->execute(['id' => $userId]);
    $user = $userQuery->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        return false;
    }
    
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60), // 7 jours
        'iss' => 'titi-golden-taste',
        'aud' => 'titi-golden-taste-api',
        'jti' => bin2hex(random_bytes(16)) // ID unique du token
    ]);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, 
                          JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

try {
    // === EXTRACTION ET VALIDATION DU TOKEN ===
    $token = extractAuthToken();
    
    if (!$token) {
        httpResponse(401, false, 'Token d\'authentification manquant', null, 'MISSING_TOKEN');
    }
    
    // Vérifier la longueur minimale du token
    if (strlen($token) < 32) {
        httpResponse(401, false, 'Token invalide', null, 'INVALID_TOKEN_FORMAT');
    }
    
    // === CONNEXION À LA BASE DE DONNÉES ===
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table sessions existe
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(128) PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash VARCHAR(128) NOT NULL,
                token_type ENUM('jwt', 'session', 'api') DEFAULT 'jwt',
                device_info TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                expires_at DATETIME NOT NULL,
                last_used_at DATETIME,
                revoked_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_token_hash (token_hash),
                INDEX idx_expires_at (expires_at),
                INDEX idx_revoked_at (revoked_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Exception $e) {
        // Ignorer si la table existe déjà
    }
    
    $user = null;
    $tokenType = 'unknown';
    $requiresRefresh = false;
    
    // === DÉTERMINER LE TYPE DE TOKEN ET LE VALIDER ===
    if (strpos($token, '.') === false) {
        // Token de session (cookie ou session_id)
        $tokenType = 'session';
        
        $sessionQuery = $pdo->prepare("
            SELECT u.*, s.expires_at, s.last_used_at, s.revoked_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = :token 
              AND u.active = 1
              AND (s.revoked_at IS NULL OR s.revoked_at > NOW())
            LIMIT 1
        ");
        
        $sessionQuery->execute(['token' => $token]);
        $sessionData = $sessionQuery->fetch(PDO::FETCH_ASSOC);
        
        if ($sessionData) {
            // Vérifier l'expiration
            if (strtotime($sessionData['expires_at']) < time()) {
                httpResponse(401, false, 'Session expirée', null, 'SESSION_EXPIRED');
            }
            
            // Vérifier si la session est révoquée
            if ($sessionData['revoked_at'] && strtotime($sessionData['revoked_at']) < time()) {
                httpResponse(401, false, 'Session révoquée', null, 'SESSION_REVOKED');
            }
            
            // Mettre à jour le last_used_at
            $updateSession = $pdo->prepare("
                UPDATE sessions 
                SET last_used_at = NOW() 
                WHERE id = :token
            ");
            $updateSession->execute(['token' => $token]);
            
            $user = $sessionData;
        }
    } else {
        // Token JWT
        $tokenType = 'jwt';
        $jwtPayload = verifyJWT($token);
        
        if ($jwtPayload) {
            // Vérifier si le token est dans la liste noire (logout)
            $tokenHash = hash('sha256', $token);
            $checkBlacklist = $pdo->prepare("
                SELECT 1 FROM token_blacklist 
                WHERE token_hash = :hash AND expires_at > NOW()
            ");
            $checkBlacklist->execute(['hash' => $tokenHash]);
            
            if ($checkBlacklist->fetch()) {
                httpResponse(401, false, 'Token révoqué', null, 'TOKEN_REVOKED');
            }
            
            // Récupérer l'utilisateur
            $userQuery = $pdo->prepare("
                SELECT * FROM users 
                WHERE id = :id AND active = 1
            ");
            $userQuery->execute(['id' => $jwtPayload['user_id']]);
            $user = $userQuery->fetch(PDO::FETCH_ASSOC);
            
            // Vérifier si le token expire bientôt (dans moins d'une heure)
            if (($jwtPayload['exp'] - time()) < 3600) {
                $requiresRefresh = true;
            }
            
            // Enregistrer l'utilisation du token en base
            try {
                $tokenHash = hash('sha256', $token);
                $recordToken = $pdo->prepare("
                    INSERT INTO token_usage (token_hash, user_id, ip_address, user_agent, used_at)
                    VALUES (:hash, :user_id, :ip, :ua, NOW())
                    ON DUPLICATE KEY UPDATE used_at = NOW(), use_count = use_count + 1
                ");
                
                $recordToken->execute([
                    'hash' => $tokenHash,
                    'user_id' => $jwtPayload['user_id'],
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null
                ]);
            } catch (Exception $e) {
                // Log l'erreur mais continue
                error_log('Token usage recording error: ' . $e->getMessage());
            }
        }
    }
    
    // === VÉRIFICATION FINALE DE L'UTILISATEUR ===
    if (!$user) {
        httpResponse(401, false, 'Token invalide ou expiré', null, 'INVALID_TOKEN');
    }
    
    // Vérifier l'état du compte
    if (!$user['active']) {
        httpResponse(403, false, 'Compte désactivé', null, 'ACCOUNT_DISABLED');
    }
    
    if (!$user['verified'] && $user['role'] !== 'client') {
        // Pour les non-clients (livreurs, etc.), vérifier le statut
        if ($user['role'] === 'livreur' || $user['role'] === 'delivery') {
            $driverQuery = $pdo->prepare("
                SELECT status, rejection_reason 
                FROM drivers 
                WHERE user_id = :user_id
            ");
            $driverQuery->execute(['user_id' => $user['id']]);
            $driver = $driverQuery->fetch();
            
            if ($driver) {
                $status = $driver['status'] ?? 'pending';
                if ($status === 'pending') {
                    httpResponse(403, false, 
                        'Compte livreur en attente de validation', 
                        ['status' => 'pending', 'requires_validation' => true],
                        'ACCOUNT_PENDING'
                    );
                } elseif ($status === 'rejected') {
                    httpResponse(403, false, 
                        'Demande de livreur rejetée: ' . ($driver['rejection_reason'] ?? 'Raison non spécifiée'),
                        ['status' => 'rejected'],
                        'ACCOUNT_REJECTED'
                    );
                }
            }
        }
    }
    
    // === PRÉPARATION DES DONNÉES UTILISATEUR ===
    // Masquer les données sensibles
    unset($user['password']);
    unset($user['reset_token']);
    unset($user['activation_token']);
    unset($user['stripe_customer_id']);
    unset($user['stripe_account_id']);
    
    // Formater les données utilisateur
    $userData = [
        'id' => $user['id'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'full_name' => $user['first_name'] . ' ' . $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'address' => $user['address'],
        'city' => $user['city'] ?? null,
        'quarter' => $user['quarter'] ?? null,
        'avatar' => $user['avatar'] ? 
            (filter_var($user['avatar'], FILTER_VALIDATE_URL) ? 
                $user['avatar'] : 
                'https://' . $_SERVER['HTTP_HOST'] . $user['avatar']) : 
            null,
        'role' => $user['role'],
        'is_admin' => in_array($user['role'], ['admin', 'super_admin']),
        'is_driver' => in_array($user['role'], ['livreur', 'delivery']),
        'is_client' => $user['role'] === 'client',
        'verified' => (bool)$user['verified'],
        'active' => (bool)$user['active'],
        'newsletter' => (bool)($user['newsletter'] ?? false),
        'sms_notifications' => (bool)($user['sms_notifications'] ?? false),
        'last_login' => $user['last_login'],
        'created_at' => $user['created_at'],
        'requires_password_change' => !empty($user['password_changed_at']) && 
                                     strtotime($user['password_changed_at']) < strtotime('-90 days')
    ];
    
    // Ajouter des informations spécifiques au rôle
    if (in_array($user['role'], ['livreur', 'delivery'])) {
        $driverQuery = $pdo->prepare("
            SELECT status, vehicle_type, vehicle_brand, vehicle_model, 
                   vehicle_year, vehicle_plate, rating, total_deliveries,
                   earnings_total, online_status, current_location
            FROM drivers 
            WHERE user_id = :user_id
        ");
        $driverQuery->execute(['user_id' => $user['id']]);
        $driverInfo = $driverQuery->fetch(PDO::FETCH_ASSOC);
        
        if ($driverInfo) {
            $userData['driver_info'] = $driverInfo;
        }
    }
    
    // Calculer les permissions basées sur le rôle
    $permissions = [];
    $rolePermissions = [
        'client' => ['view_menu', 'place_order', 'view_history', 'manage_profile'],
        'livreur' => ['view_orders', 'update_status', 'view_earnings', 'manage_availability'],
        'delivery' => ['view_orders', 'update_status', 'view_earnings', 'manage_availability'],
        'admin' => ['manage_users', 'manage_orders', 'manage_menu', 'view_reports', 'manage_drivers'],
        'super_admin' => ['all']
    ];
    
    $userData['permissions'] = $rolePermissions[$user['role']] ?? $rolePermissions['client'];
    
    // === GÉNÉRATION DE NOUVEAU TOKEN SI NÉCESSAIRE ===
    $newToken = null;
    if ($requiresRefresh && $tokenType === 'jwt') {
        $newToken = refreshToken($user['id'], $pdo);
        if ($newToken) {
            header('X-Auth-Refresh: ' . $newToken);
        }
    }
    
    // === RÉPONSE DE SUCCÈS ===
    $responseData = [
        'user' => $userData,
        'auth' => [
            'token_type' => $tokenType,
            'valid_until' => $jwtPayload['exp'] ?? ($sessionData['expires_at'] ?? null),
            'requires_refresh' => $requiresRefresh
        ],
        'session' => [
            'id' => $tokenType === 'session' ? $token : null,
            'device_info' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ]
    ];
    
    if ($newToken) {
        $responseData['auth']['new_token'] = $newToken;
    }
    
    // Ajouter des métadonnées de sécurité
    $responseData['security'] = [
        'check_timestamp' => time(),
        'check_duration' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
        'client_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent_hash' => hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '')
    ];
    
    httpResponse(200, true, 'Authentification valide', $responseData);
    
} catch (PDOException $e) {
    error_log('Database error in check-auth.php: ' . $e->getMessage());
    httpResponse(500, false, 
        ENVIRONMENT === 'development' ? 'Erreur base de données: ' . $e->getMessage() : 'Erreur serveur',
        null, 
        'DATABASE_ERROR'
    );
} catch (Exception $e) {
    error_log('Error in check-auth.php: ' . $e->getMessage());
    httpResponse(500, false, 
        ENVIRONMENT === 'development' ? 'Erreur: ' . $e->getMessage() : 'Erreur lors de la vérification',
        null, 
        'CHECK_AUTH_ERROR'
    );
}
?>