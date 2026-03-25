<?php
/**
 * API pour la gestion des produits de la boutique
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
    
    // Vérifier si la table products existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('products', $tables)) {
        // Créer la table products si elle n'existe pas
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                stock INT DEFAULT 0,
                image_url VARCHAR(500),
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insérer quelques produits de test
        $pdo->exec("
            INSERT INTO products (name, description, price, category, stock, image_url, is_available) VALUES
            ('Produit 1', 'Description du produit 1', 5000.00, 'Boutique', 10, '', TRUE),
            ('Produit 2', 'Description du produit 2', 7500.00, 'Boutique', 5, '', TRUE),
            ('Produit 3', 'Description du produit 3', 12000.00, 'Boutique', 0, '', FALSE)
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
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    
    $sql = "SELECT * FROM products WHERE 1=1";
    $params = [];
    
    if ($category) {
        $sql .= " AND category = :category";
        $params[':category'] = $category;
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT :limit";
    $params[':limit'] = $limit;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $products,
        'count' => count($products)
    ]);
}

function handlePost($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['name']) || !isset($data['price'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données incomplètes']);
        return;
    }
    
    $sql = "INSERT INTO products (name, description, price, category, stock, image_url, is_available) 
            VALUES (:name, :description, :price, :category, :stock, :image_url, :is_available)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $data['name'],
        ':description' => $data['description'] ?? '',
        ':price' => $data['price'],
        ':category' => $data['category'] ?? 'Boutique',
        ':stock' => $data['stock'] ?? 0,
        ':image_url' => $data['image_url'] ?? '',
        ':is_available' => $data['is_available'] ?? true
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Produit créé avec succès',
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
    
    $sql = "UPDATE products SET 
                name = :name, 
                description = :description, 
                price = :price, 
                category = :category, 
                stock = :stock, 
                image_url = :image_url, 
                is_available = :is_available
            WHERE id = :id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $data['name'],
        ':description' => $data['description'] ?? '',
        ':price' => $data['price'],
        ':category' => $data['category'] ?? 'Boutique',
        ':stock' => $data['stock'] ?? 0,
        ':image_url' => $data['image_url'] ?? '',
        ':is_available' => $data['is_available'] ?? true
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Produit mis à jour avec succès'
    ]);
}

function handleDelete($pdo) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }
    
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute([':id' => $id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Produit supprimé avec succès'
    ]);
}
?>
