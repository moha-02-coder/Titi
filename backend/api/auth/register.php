<?php
/**
 * API d'inscription - Titi Golden Taste
 * POST /backend/api/auth/register.php
 * Version corrigée
 */

// === CONFIGURATION ===
error_reporting(E_ALL);
ini_set('display_errors', 1); // Activé pour débogage
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/php_errors.log');

// Créer le dossier logs si nécessaire
if (!is_dir(__DIR__ . '/../../logs')) {
    mkdir(__DIR__ . '/../../logs', 0755, true);
}

// Définir l'environnement
define('ENVIRONMENT', 'development');

// Headers pour API REST
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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
        'message' => 'Méthode non autorisée. Seule POST est acceptée.',
        'code' => 'METHOD_NOT_ALLOWED',
        'timestamp' => date('c')
    ]);
    exit;
}

// Inclure la configuration de la base de données
require_once __DIR__ . '/../../config/database.php';

// Fonction de réponse JSON
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

// Fonction de validation d'email
function isValidEmail($email) {
    if (empty($email)) {
        return false;
    }
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Fonction de validation de téléphone - Version simplifiée
function isValidPhone($phone) {
    if (empty($phone)) {
        return false;
    }
    
    // Nettoyer le numéro
    $cleaned = preg_replace('/[^0-9]/', '', $phone);
    
    // Retirer l'indicatif 223 si présent
    if (strlen($cleaned) > 8 && substr($cleaned, 0, 3) === '223') {
        $cleaned = substr($cleaned, 3);
    }
    
    // Vérifier la longueur
    if (strlen($cleaned) !== 8) {
        return false;
    }
    
    // Vérifier le préfixe (Mali)
    $prefix = substr($cleaned, 0, 2);
    $validPrefixes = ['76', '77', '78', '79', '66', '67', '68', '69', '90', '91'];
    
    return in_array($prefix, $validPrefixes);
}

// Fonction de validation de mot de passe (simplifiée pour tests)
function validatePassword($password) {
    $errors = [];
    
    if (strlen($password) < 8) {
        $errors[] = 'Minimum 8 caractères';
    }
    
    // Validation minimale pour tests
    if (!preg_match('/[A-Z]/', $password)) {
        $errors[] = 'Au moins une majuscule';
    }
    
    return $errors;
}

// Fonction de nettoyage
function cleanInput($data) {
    if (is_array($data)) {
        return array_map('cleanInput', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

// Fonction de gestion des uploads de fichiers (simplifiée)
function handleFileUpload($fileField, $allowedTypes, $maxSize, $uploadDir) {
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'error' => 'Aucun fichier uploadé ou erreur d\'upload'];
    }
    
    $file = $_FILES[$fileField];
    
    // Vérifier la taille
    if ($file['size'] > $maxSize) {
        return ['success' => false, 'error' => 'Fichier trop volumineux'];
    }
    
    // Vérifier le type via l'extension
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];
    
    if (!in_array($ext, $allowedExtensions)) {
        return ['success' => false, 'error' => 'Type de fichier non autorisé'];
    }
    
    // Créer le répertoire
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Générer un nom de fichier
    $filename = uniqid() . '.' . $ext;
    $destination = $uploadDir . '/' . $filename;
    
    // Déplacer le fichier
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        return ['success' => false, 'error' => 'Erreur lors du déplacement du fichier'];
    }
    
    return [
        'success' => true,
        'path' => $destination,
        'filename' => $filename,
        'url' => '/assets/uploads/' . basename($uploadDir) . '/' . $filename
    ];
}

try {
    // Initialiser le logging
    error_log("=== DÉBUT INSCRIPTION ===");
    error_log("Méthode: " . $_SERVER['REQUEST_METHOD']);
    error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'Non défini'));

    $pdo = null;
    
    // Récupérer les données
    $posted = [];
    
    // Pour multipart/form-data (formulaire avec fichiers)
    if (!empty($_POST) || isset($_FILES)) {
        $posted = $_POST;
        error_log("Données POST: " . print_r($_POST, true));
        error_log("Fichiers reçus: " . print_r($_FILES, true));
    }
    // Pour application/json
    else {
        $rawData = file_get_contents('php://input');
        $posted = json_decode($rawData, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            jsonResponse(false, 'JSON invalide', null, 'INVALID_JSON', 400);
        }
    }
    
    // Nettoyer les données
    $posted = cleanInput($posted);
    
    // === VALIDATION DES DONNÉES OBLIGATOIRES ===
    $requiredFields = [
        'first_name' => 'Prénom',
        'last_name' => 'Nom',
        'email' => 'Email',
        'password' => 'Mot de passe',
        'phone' => 'Téléphone',
        'address' => 'Adresse'
    ];
    
    $missingFields = [];
    foreach ($requiredFields as $field => $label) {
        if (!isset($posted[$field]) || trim($posted[$field]) === '') {
            $missingFields[] = $label;
        }
    }
    
    if (!empty($missingFields)) {
        jsonResponse(false, 
            'Champs requis manquants: ' . implode(', ', $missingFields),
            ['missing_fields' => $missingFields],
            'MISSING_REQUIRED_FIELDS',
            400
        );
    }
    
    // === VALIDATION DÉTAILLÉE ===
    $errors = [];
    
    // Email
    if (!isValidEmail($posted['email'])) {
        $errors['email'] = 'Format d\'email invalide';
    }
    
    // Téléphone
    if (!isValidPhone($posted['phone'])) {
        $errors['phone'] = 'Numéro de téléphone malien invalide. Format: 76 01 23 45';
    }
    
    // Mot de passe
    $passwordErrors = validatePassword($posted['password']);
    if (!empty($passwordErrors)) {
        $errors['password'] = $passwordErrors;
    }
    
    // Confirmation mot de passe
    if (isset($posted['password_confirm']) && $posted['password'] !== $posted['password_confirm']) {
        $errors['password_confirm'] = 'Les mots de passe ne correspondent pas';
    }
    
    // Date de naissance (optionnelle)
    if (!empty($posted['birth_date'])) {
        $birthDate = DateTime::createFromFormat('Y-m-d', $posted['birth_date']);
        $minAgeDate = (new DateTime())->modify('-18 years');
        
        if (!$birthDate || $birthDate > $minAgeDate) {
            $errors['birth_date'] = 'Vous devez avoir au moins 18 ans';
        }
    }
    
    // Rôle
    $role = isset($posted['role']) && in_array($posted['role'], ['client', 'livreur']) 
           ? $posted['role'] 
           : 'client';
    
    // Si erreurs de validation
    if (!empty($errors)) {
        jsonResponse(false, 'Erreurs de validation', ['errors' => $errors], 'VALIDATION_ERROR', 400);
    }
    
    // === CONNEXION À LA BASE DE DONNÉES ===
    try {
        if (!function_exists('getDatabaseConnection')) {
            throw new Exception('Fonction getDatabaseConnection() introuvable (config/database.php)');
        }
        $pdo = getDatabaseConnection();
        error_log("Connexion BD réussie");
    } catch (Exception $e) {
        error_log("ERREUR connexion BD: " . $e->getMessage());
        jsonResponse(false, 'Erreur de connexion à la base de données', null, 'DATABASE_CONNECTION_ERROR', 500);
    }
    
    // === VÉRIFICATIONS BASE DE DONNÉES ===
    // Email unique
    $checkEmailStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $checkEmailStmt->execute(['email' => $posted['email']]);
    if ($checkEmailStmt->fetch()) {
        jsonResponse(false, 'Cet email est déjà utilisé', null, 'EMAIL_EXISTS', 409);
    }
    
    // Téléphone unique
    $checkPhoneStmt = $pdo->prepare("SELECT id FROM users WHERE phone = :phone LIMIT 1");
    $checkPhoneStmt->execute(['phone' => $posted['phone']]);
    if ($checkPhoneStmt->fetch()) {
        jsonResponse(false, 'Ce numéro de téléphone est déjà utilisé', null, 'PHONE_EXISTS', 409);
    }
    
    // === GESTION DES TRANSACTIONS ===
    // Démarrer la transaction AVANT toute opération
    if (!$pdo->inTransaction()) {
        $pdo->beginTransaction();
        error_log("Transaction démarrée");
    }
    
    try {
        // === GESTION DES UPLOADS DE FICHIERS ===
        $avatarUrl = null;
        $idDocUrl = null;
        $uploadsBase = __DIR__ . '/../../../assets/uploads';
        
        // Créer les dossiers si nécessaire
        if (!is_dir($uploadsBase . '/avatars')) {
            mkdir($uploadsBase . '/avatars', 0755, true);
        }
        if (!is_dir($uploadsBase . '/documents')) {
            mkdir($uploadsBase . '/documents', 0755, true);
        }
        
        // Avatar (optionnel)
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
            $avatarResult = handleFileUpload(
                'avatar',
                ['image/jpeg', 'image/png', 'image/gif'],
                5 * 1024 * 1024,
                $uploadsBase . '/avatars'
            );
            
            if ($avatarResult['success']) {
                $avatarUrl = $avatarResult['url'];
                error_log("Avatar uploadé: $avatarUrl");
            }
        }
        
        // === CRÉATION DE L'UTILISATEUR ===
        $hashedPassword = password_hash($posted['password'], PASSWORD_DEFAULT);

        // Detect actual columns in users table to avoid schema mismatch
        $usersColumns = [];
        try {
            $usersColumns = $pdo->query("DESCRIBE users")->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {
            error_log('Impossible de lire la structure de la table users: ' . $e->getMessage());
            $usersColumns = [];
        }

        // Préparer les données utilisateur
        $userData = [
            'first_name' => $posted['first_name'],
            'last_name' => $posted['last_name'],
            'email' => $posted['email'],
            'password' => $hashedPassword,
            'phone' => $posted['phone'],
            'address' => $posted['address'],
            'city' => $posted['city'] ?? 'Bamako',
            'quartier' => $posted['quartier'] ?? null,
            'birth_date' => !empty($posted['birth_date']) ? $posted['birth_date'] : null,
            'avatar' => $avatarUrl,
            'newsletter' => isset($posted['newsletter']) && $posted['newsletter'] ? 1 : 0,
            'sms_notifications' => isset($posted['sms_notifications']) && $posted['sms_notifications'] ? 1 : 0,
            'role' => $role,
            'verified' => $role === 'livreur' ? 0 : 1,
            'active' => 1
        ];

        if (!empty($usersColumns)) {
            $userData = array_filter(
                $userData,
                function ($value, $key) use ($usersColumns) {
                    return in_array($key, $usersColumns, true);
                },
                ARRAY_FILTER_USE_BOTH
            );
        }

        // Construire la requête dynamiquement
        $columns = [];
        $placeholders = [];
        $values = [];
        
        foreach ($userData as $column => $value) {
            $columns[] = $column;
            $placeholders[] = ":$column";
            $values[":$column"] = $value;
        }
        
        $columnsStr = implode(', ', $columns);
        $placeholdersStr = implode(', ', $placeholders);
        
        $insertUserSql = "INSERT INTO users ($columnsStr, created_at) VALUES ($placeholdersStr, NOW())";
        
        error_log("Insertion utilisateur SQL: $insertUserSql");
        error_log("Données utilisateur: " . print_r($userData, true));
        
        $insertUserStmt = $pdo->prepare($insertUserSql);
        $insertUserStmt->execute($values);
        $userId = $pdo->lastInsertId();
        
        error_log("Utilisateur créé avec ID: $userId");
        
        // === CRÉATION DU PANIER ===
        $insertCartSql = "INSERT INTO carts (user_id, created_at) VALUES (:user_id, NOW())";
        $insertCartStmt = $pdo->prepare($insertCartSql);
        $insertCartStmt->execute(['user_id' => $userId]);
        error_log("Panier créé");
        
        // === GESTION DES LIVREURS ===
        if ($role === 'livreur') {
            error_log("Traitement inscription livreur");
            
            // Gestion de la pièce d'identité (obligatoire pour livreur)
            if (isset($_FILES['id_document']) && $_FILES['id_document']['error'] === UPLOAD_ERR_OK) {
                $idDocResult = handleFileUpload(
                    'id_document',
                    ['image/jpeg', 'image/png', 'application/pdf'],
                    5 * 1024 * 1024,
                    $uploadsBase . '/documents'
                );
                
                if ($idDocResult['success']) {
                    $idDocUrl = $idDocResult['url'];
                    error_log("Document d'identité uploadé: $idDocUrl");
                } else {
                    throw new Exception('Erreur document d\'identité: ' . $idDocResult['error']);
                }
            } else {
                throw new Exception('Pièce d\'identité requise pour les livreurs');
            }
            
            // Vérifier les champs obligatoires livreur
            $vehicleType = $posted['vehicle_type'] ?? null;
            if (empty($vehicleType)) {
                throw new Exception('Type de véhicule requis pour les livreurs');
            }
            
            // Préparer les données livreur
            $driverData = [
                'user_id' => $userId,
                'id_document' => $idDocUrl,
                'vehicle_type' => $vehicleType,
                'vehicle_brand' => $posted['vehicle_brand'] ?? null,
                'vehicle_model' => $posted['vehicle_model'] ?? null,
                'vehicle_year' => !empty($posted['vehicle_year']) ? (int)$posted['vehicle_year'] : null,
                'vehicle_plate' => $posted['vehicle_plate'] ?? null,
                'status' => 'pending'
            ];
            
            // Construire la requête dynamiquement
            $driverColumns = [];
            $driverPlaceholders = [];
            $driverValues = [];
            
            foreach ($driverData as $column => $value) {
                $driverColumns[] = $column;
                $driverPlaceholders[] = ":$column";
                $driverValues[":$column"] = $value;
            }
            
            $driverColumnsStr = implode(', ', $driverColumns);
            $driverPlaceholdersStr = implode(', ', $driverPlaceholders);
            
            $insertDriverSql = "INSERT INTO drivers ($driverColumnsStr, created_at) VALUES ($driverPlaceholdersStr, NOW())";
            
            error_log("Insertion livreur SQL: $insertDriverSql");
            error_log("Données livreur: " . print_r($driverData, true));
            
            // Vérifier si la table drivers existe
            $tableExists = $pdo->query("SHOW TABLES LIKE 'drivers'")->fetch();
            if (!$tableExists) {
                // Créer la table si elle n'existe pas
                $createTableSql = "
                    CREATE TABLE IF NOT EXISTS drivers (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        user_id INT NOT NULL UNIQUE,
                        id_document VARCHAR(500) NOT NULL,
                        vehicle_type VARCHAR(50) NOT NULL,
                        vehicle_brand VARCHAR(100),
                        vehicle_model VARCHAR(100),
                        vehicle_year YEAR,
                        vehicle_plate VARCHAR(50),
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                $pdo->exec($createTableSql);
                error_log("Table drivers créée");
            }
            
            $insertDriverStmt = $pdo->prepare($insertDriverSql);
            $insertDriverStmt->execute($driverValues);
            $driverId = $pdo->lastInsertId();
            
            error_log("Livreur créé avec ID: $driverId");
        }
        
        // === VALIDATION DE LA TRANSACTION ===
        if ($pdo->inTransaction()) {
            $pdo->commit();
            error_log("Transaction validée");
        }
        
        // === RÉCUPÉRATION DES DONNÉES UTILISATEUR ===
        $userQuery = $pdo->prepare("
            SELECT 
                id, first_name, last_name, email, phone, address,
                city, quarter, avatar, role, verified, active,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as created_at_formatted
            FROM users 
            WHERE id = :id
        ");
        
        $userQuery->execute(['id' => $userId]);
        $user = $userQuery->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('Utilisateur non trouvé après création');
        }
        
        // Ajouter des informations supplémentaires selon le rôle
        if ($role === 'livreur') {
            $driverQuery = $pdo->prepare("
                SELECT status, vehicle_type, vehicle_brand, vehicle_model, vehicle_plate
                FROM drivers 
                WHERE user_id = :user_id
            ");
            $driverQuery->execute(['user_id' => $userId]);
            $driverInfo = $driverQuery->fetch(PDO::FETCH_ASSOC);
            
            $user['driver_info'] = $driverInfo;
            $user['requires_validation'] = true;
        }
        
        // === RÉPONSE DE SUCCÈS ===
        $message = $role === 'livreur' 
            ? 'Inscription réussie ! Votre compte livreur est en attente de validation.' 
            : 'Inscription réussie ! Bienvenue sur Titi Golden Taste.';
        
        error_log("INSCRIPTION RÉUSSIE: $message");
        
        jsonResponse(true, $message, [
            'user' => $user,
            'next_steps' => $role === 'livreur' ? 'validation_pending' : 'complete'
        ], 'REGISTRATION_SUCCESS', 201);
        
    } catch (Exception $e) {
        // Rollback seulement si une transaction est active
        if ($pdo && $pdo->inTransaction()) {
            $pdo->rollBack();
            error_log("Transaction annulée: " . $e->getMessage());
        }
        
        // Log l'erreur
        error_log("ERREUR dans le traitement: " . $e->getMessage());
        error_log("Trace: " . $e->getTraceAsString());
        
        // Vérifier le type d'erreur
        if (strpos($e->getMessage(), 'driver') !== false) {
            $message = 'Erreur lors de l\'inscription livreur: ' . $e->getMessage();
        } else {
            $message = ENVIRONMENT === 'development' 
                ? 'Erreur: ' . $e->getMessage()
                : 'Erreur lors du traitement de votre inscription. Veuillez réessayer.';
        }
        
        jsonResponse(false, $message, null, 'REGISTRATION_ERROR', 500);
    }
    
} catch (Exception $e) {
    // Erreur générale
    error_log("ERREUR GÉNÉRALE: " . $e->getMessage());
    
    $message = ENVIRONMENT === 'development' 
        ? 'Erreur générale: ' . $e->getMessage()
        : 'Erreur lors de votre inscription. Veuillez réessayer.';
    
    jsonResponse(false, $message, null, 'GENERAL_ERROR', 500);
}

error_log("=== FIN TRAITEMENT ===");
?>