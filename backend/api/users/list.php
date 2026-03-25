<?php
/**
 * API pour la gestion des utilisateurs
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table users existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('users', $tables)) {
        // Créer la table users si elle n'existe pas
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                password VARCHAR(255),
                role ENUM('customer', 'admin', 'driver') DEFAULT 'customer',
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insérer quelques utilisateurs de test
        $pdo->exec("
            INSERT INTO users (name, email, phone, role, active) VALUES
            ('Admin User', 'admin@titi.com', '22334455', 'admin', TRUE),
            ('Client 1', 'client1@email.com', '11223344', 'customer', TRUE),
            ('Client 2', 'client2@email.com', '55667788', 'customer', TRUE),
            ('Client 3', 'client3@email.com', '99887766', 'customer', FALSE),
            ('Driver 1', 'driver1@email.com', '33445566', 'driver', TRUE)
        ");
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur serveur', 
        'debug' => $e->getMessage()
    ]);
}

function handleGet($pdo) {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $role = isset($_GET['role']) ? $_GET['role'] : null;
    
    $sql = "SELECT id, name, email, phone, role, active, created_at FROM users WHERE 1=1";
    $params = [];
    
    if ($role) {
        $sql .= " AND role = :role";
        $params[':role'] = $role;
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT :limit";
    $params[':limit'] = $limit;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $users,
        'count' => count($users)
    ]);
}

function handlePost($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['name']) || !isset($data['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données incomplètes']);
        return;
    }
    
    $sql = "INSERT INTO users (name, email, phone, password, role, active) 
            VALUES (:name, :email, :phone, :password, :role, :active)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $data['name'],
        ':email' => $data['email'],
        ':phone' => $data['phone'] ?? '',
        ':password' => password_hash($data['password'] ?? 'password123', PASSWORD_DEFAULT),
        ':role' => $data['role'] ?? 'customer',
        ':active' => $data['active'] ?? true
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Utilisateur créé avec succès',
        'id' => $pdo->lastInsertId()
    ]);
}

function handlePut($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $_GET['id'] ?? null;
    
    if (!$id || !$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID ou données manquants']);
        return;
    }
    
    $sql = "UPDATE users SET 
                name = :name, 
                email = :email, 
                phone = :phone, 
                role = :role, 
                active = :active
            WHERE id = :id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $data['name'],
        ':email' => $data['email'],
        ':phone' => $data['phone'] ?? '',
        ':role' => $data['role'] ?? 'customer',
        ':active' => $data['active'] ?? true
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Utilisateur mis à jour avec succès'
    ]);
}

function handleDelete($pdo) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Utilisateur supprimé avec succès'
    ]);
}
?>
