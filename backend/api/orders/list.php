<?php
/**
 * API pour la gestion des commandes
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
    
    // Vérifier si la table orders existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('orders', $tables)) {
        // Créer la table orders si elle n'existe pas
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255),
                customer_phone VARCHAR(50),
                total DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'preparing', 'delivery', 'completed', 'cancelled') DEFAULT 'pending',
                delivery_address TEXT,
                delivery_mode ENUM('standard', 'express', 'pickup') DEFAULT 'standard',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insérer quelques commandes de test
        $pdo->exec("
            INSERT INTO orders (customer_name, customer_email, total, status, delivery_address, delivery_mode) VALUES
            ('Client 1', 'client1@email.com', 15000.00, 'completed', 'Adresse 1, Bamako', 'standard'),
            ('Client 2', 'client2@email.com', 8500.00, 'completed', 'Adresse 2, Bamako', 'express'),
            ('Client 3', 'client3@email.com', 22000.00, 'delivery', 'Adresse 3, Bamako', 'standard'),
            ('Client 4', 'client4@email.com', 12000.00, 'completed', 'Adresse 4, Bamako', 'pickup')
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
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    
    $sql = "SELECT * FROM orders WHERE 1=1";
    $params = [];
    
    if ($status) {
        $sql .= " AND status = :status";
        $params[':status'] = $status;
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT :limit";
    $params[':limit'] = $limit;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'count' => count($orders)
    ]);
}

function handlePost($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['customer_name']) || !isset($data['total'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données incomplètes']);
        return;
    }
    
    $sql = "INSERT INTO orders (customer_name, customer_email, customer_phone, total, status, delivery_address, delivery_mode) 
            VALUES (:customer_name, :customer_email, :customer_phone, :total, :status, :delivery_address, :delivery_mode)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':customer_name' => $data['customer_name'],
        ':customer_email' => $data['customer_email'] ?? '',
        ':customer_phone' => $data['customer_phone'] ?? '',
        ':total' => $data['total'],
        ':status' => $data['status'] ?? 'pending',
        ':delivery_address' => $data['delivery_address'] ?? '',
        ':delivery_mode' => $data['delivery_mode'] ?? 'standard'
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Commande créée avec succès',
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
    
    $sql = "UPDATE orders SET 
                customer_name = :customer_name, 
                customer_email = :customer_email, 
                customer_phone = :customer_phone, 
                total = :total, 
                status = :status, 
                delivery_address = :delivery_address, 
                delivery_mode = :delivery_mode
            WHERE id = :id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':customer_name' => $data['customer_name'],
        ':customer_email' => $data['customer_email'] ?? '',
        ':customer_phone' => $data['customer_phone'] ?? '',
        ':total' => $data['total'],
        ':status' => $data['status'] ?? 'pending',
        ':delivery_address' => $data['delivery_address'] ?? '',
        ':delivery_mode' => $data['delivery_mode'] ?? 'standard'
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Commande mise à jour avec succès'
    ]);
}

function handleDelete($pdo) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }
    
    $stmt = $pdo->prepare("DELETE FROM orders WHERE id = :id");
    $stmt->execute([':id' => $id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Commande supprimée avec succès'
    ]);
}
?>
