<?php
/**
 * API admin pour la gestion des produits
 * GET /backend/api/admin/products.php
 */

// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

// Inclure la configuration de la base de données
require_once '../../config/database.php';

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Récupérer et vérifier l'authentification admin
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (strpos($authHeader, 'Bearer ') !== 0) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Authentification requise'
    ]);
    exit;
}

$token = substr($authHeader, 7);

try {
    // Se connecter à la base de données
    $pdo = getDatabaseConnection();
    
    // Vérifier l'utilisateur et ses privilèges admin
    $userQuery = "SELECT id, is_admin FROM users WHERE auth_token = :token AND active = 1";
    $userStmt = $pdo->prepare($userQuery);
    $userStmt->execute(['token' => $token]);
    $user = $userStmt->fetch();
    
    if (!$user || !$user['is_admin']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Accès non autorisé'
        ]);
        exit;
    }
    
    // Récupérer les paramètres de la requête
    $params = $_GET;
    
    // Produits avec stock bas
    if (isset($params['low_stock']) && $params['low_stock'] == 1) {
        $query = "SELECT id, name, stock, category FROM products 
                  WHERE stock <= 5 AND stock > 0 AND active = 1";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        // Produits en rupture
        $outQuery = "SELECT id, name, stock, category FROM products 
                     WHERE stock <= 0 AND active = 1";
        $outStmt = $pdo->query($outQuery);
        $outProducts = $outStmt->fetchAll();
        
        $allProducts = array_merge($products, $outProducts);
        
        echo json_encode([
            'success' => true,
            'products' => $allProducts,
            'count' => count($allProducts)
        ]);
        exit;
    }
    
    // Tous les produits
    $query = "SELECT * FROM products ORDER BY category, name";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $products = $stmt->fetchAll();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $products
    ]);
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la récupération des produits'
    ]);
}
// Allow creation, update and delete via the same endpoint
// POST: create product (multipart/form-data for images)
// PUT: update product JSON body
// DELETE: delete product by id

// Note: Basic authentication check reused below for other methods
try {
    // Vérifier l'authentification admin (reuse token logic)
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (strpos($authHeader, 'Bearer ') !== 0) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentification requise']);
        exit;
    }
    $token = substr($authHeader, 7);
    $pdo = getDatabaseConnection();
    $userQuery = "SELECT id, role FROM users WHERE auth_token = :token AND active = 1";
    $userStmt = $pdo->prepare($userQuery);
    $userStmt->execute(['token' => $token]);
    $user = $userStmt->fetch();
    if (!$user || ($user['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Create product
        $name = $_POST['name'] ?? null;
        $description = $_POST['description'] ?? null;
        $price = isset($_POST['price']) ? (int)$_POST['price'] : null;
        $category = $_POST['category'] ?? null;
        $stock = isset($_POST['stock']) ? (int)$_POST['stock'] : 0;

        if (!$name || !$price) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom et prix requis']);
            exit;
        }

        // handle single image (for simplicity)
        $imageUrl = null;
        if (!empty($_FILES['image']['tmp_name'])) {
            $uploadsDir = __DIR__ . '/../../../assets/uploads/products';
            if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
            $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $filename = uniqid('prod_') . '.' . $ext;
            $target = $uploadsDir . '/' . $filename;
            if (move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
                $imageUrl = '/assets/uploads/products/' . $filename;
            }
        }

        $ins = "INSERT INTO products (name, description, price, category, stock, images, active, created_at) VALUES (:name, :desc, :price, :cat, :stock, :images, 1, NOW())";
        $stmt = $pdo->prepare($ins);
        $imagesJson = $imageUrl ? json_encode([$imageUrl]) : json_encode([]);
        $stmt->execute(['name'=>$name, 'desc'=>$description, 'price'=>$price, 'cat'=>$category, 'stock'=>$stock, 'images'=>$imagesJson]);
        $id = $pdo->lastInsertId();
        echo json_encode(['success'=>true, 'message'=>'Produit créé', 'data'=>['id'=>$id]]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Read JSON body
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        if (!$json || !isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'Paramètres manquants']);
            exit;
        }
        $id = (int)$_GET['id'];
        $fields = [];
        $params = ['id'=>$id];
        if (isset($json['name'])) { $fields[] = 'name = :name'; $params['name'] = $json['name']; }
        if (isset($json['price'])) { $fields[] = 'price = :price'; $params['price'] = (int)$json['price']; }
        if (isset($json['description'])) { $fields[] = 'description = :description'; $params['description'] = $json['description']; }
        if (isset($json['stock'])) { $fields[] = 'stock = :stock'; $params['stock'] = (int)$json['stock']; }
        if (empty($fields)) { echo json_encode(['success'=>false,'message'=>'Aucun champ à mettre à jour']); exit; }

        $upd = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($upd);
        $stmt->execute($params);
        echo json_encode(['success'=>true,'message'=>'Produit mis à jour']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id requis']); exit; }
        $id = (int)$_GET['id'];
        $del = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $del->execute(['id'=>$id]);
        echo json_encode(['success'=>true,'message'=>'Produit supprimé']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Erreur serveur']);
    exit;
}
?>