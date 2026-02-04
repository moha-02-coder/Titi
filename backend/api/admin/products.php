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

function extractBearerToken() {
    $h = getallheaders();
    $a = $h['Authorization'] ?? $h['authorization'] ?? '';
    if (strpos($a, 'Bearer ') === 0) return substr($a, 7);
    return null;
}

function verifyJWTToken($token) {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h, $p, $s) = $parts;
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if (!hash_equals($expected, $s)) return false;
    $payload = json_decode(base64_decode($p), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}

function requireAdmin(PDO $pdo) {
    $token = extractBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentification requise']);
        exit;
    }

    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, role, active FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => (int)$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable']);
        exit;
    }
    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
        exit;
    }

    return $user;
}

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    requireAdmin($pdo);

    $method = $_SERVER['REQUEST_METHOD'];
    $effectiveMethod = $method;
    if ($method === 'POST' && isset($_POST['_method'])) {
        $m = strtoupper((string)$_POST['_method']);
        if (in_array($m, ['PUT', 'DELETE'], true)) {
            $effectiveMethod = $m;
        }
    }

    if ($effectiveMethod === 'GET') {
        $params = $_GET;
        if (isset($params['low_stock']) && $params['low_stock'] == 1) {
            $query = "SELECT id, name, stock, category FROM products 
                      WHERE stock <= 5 AND stock > 0 AND active = 1";
            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $products = $stmt->fetchAll();

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

        $query = "SELECT * FROM products ORDER BY category, name";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $products = $stmt->fetchAll();
        http_response_code(200);
        echo json_encode(['success' => true, 'data' => $products]);
        exit;
    }

    if ($effectiveMethod === 'POST') {
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

        if ($imageUrl === null) {
            $imageUrl = $_POST['image_url'] ?? null;
        }

        $ins = "INSERT INTO products (name, description, price, category, stock, images, active, created_at) VALUES (:name, :desc, :price, :cat, :stock, :images, 1, NOW())";
        $stmt = $pdo->prepare($ins);
        $imagesJson = $imageUrl ? json_encode([$imageUrl]) : json_encode([]);
        $stmt->execute(['name'=>$name, 'desc'=>$description, 'price'=>$price, 'cat'=>$category, 'stock'=>$stock, 'images'=>$imagesJson]);
        $id = $pdo->lastInsertId();
        echo json_encode(['success'=>true, 'message'=>'Produit créé', 'data'=>['id'=>$id]]);
        exit;
    }

    if ($effectiveMethod === 'PUT') {
        // Support multipart update via POST + _method=PUT
        $isMultipart = !empty($_POST) || !empty($_FILES);
        if ($isMultipart) {
            if (!isset($_POST['id'])) {
                http_response_code(400);
                echo json_encode(['success'=>false,'message'=>'id requis']);
                exit;
            }
            $id = (int)$_POST['id'];

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
            if ($imageUrl === null) {
                $imageUrl = $_POST['image_url'] ?? null;
            }

            $fields = [];
            $params = ['id'=>$id];
            if (isset($_POST['name'])) { $fields[] = 'name = :name'; $params['name'] = (string)$_POST['name']; }
            if (isset($_POST['price'])) { $fields[] = 'price = :price'; $params['price'] = (int)$_POST['price']; }
            if (isset($_POST['description'])) { $fields[] = 'description = :description'; $params['description'] = (string)$_POST['description']; }
            if (isset($_POST['stock'])) { $fields[] = 'stock = :stock'; $params['stock'] = (int)$_POST['stock']; }
            if (isset($_POST['category'])) { $fields[] = 'category = :category'; $params['category'] = (string)$_POST['category']; }
            if ($imageUrl !== null) { $fields[] = 'images = :images'; $params['images'] = json_encode([$imageUrl]); }

            if (empty($fields)) { echo json_encode(['success'=>false,'message'=>'Aucun champ à mettre à jour']); exit; }

            $upd = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $pdo->prepare($upd);
            $stmt->execute($params);
            echo json_encode(['success'=>true,'message'=>'Produit mis à jour']);
            exit;
        }

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
        if (isset($json['category'])) { $fields[] = 'category = :category'; $params['category'] = $json['category']; }
        if (isset($json['image_url'])) { $fields[] = 'images = :images'; $params['images'] = json_encode([$json['image_url']]); }

        if (empty($fields)) { echo json_encode(['success'=>false,'message'=>'Aucun champ à mettre à jour']); exit; }

        $upd = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($upd);
        $stmt->execute($params);
        echo json_encode(['success'=>true,'message'=>'Produit mis à jour']);
        exit;
    }

    if ($effectiveMethod === 'DELETE') {
        $id = null;
        if (isset($_GET['id'])) $id = (int)$_GET['id'];
        if ($id === null && isset($_POST['id'])) $id = (int)$_POST['id'];
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'id requis']); exit; }
        $del = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $del->execute(['id'=>$id]);
        echo json_encode(['success'=>true,'message'=>'Produit supprimé']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Méthode non autorisée']);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Erreur serveur']);
    exit;
}
?>