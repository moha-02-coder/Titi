<?php
/**
 * API admin pour la gestion du menu
 * GET/POST/PUT/DELETE /backend/api/admin/menu.php
 */


// Headers pour API REST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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

// Vérifier la méthode HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Récupérer et vérifier l'authentification admin (JWT)
$token = extractBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Authentification requise'
    ]);
    exit;
}

try {
    // Se connecter à la base de données
    $pdo = getDatabaseConnection();

    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide']);
        exit;
    }

    // Vérifier rôle admin en base (source de vérité)
    $userStmt = $pdo->prepare("SELECT id, role, active FROM users WHERE id = :id LIMIT 1");
    $userStmt->execute(['id' => (int)$payload['user_id']]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable']);
        exit;
    }
    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Accès non autorisé'
        ]);
        exit;
    }
    
    // Allow POST override for multipart updates
    $effectiveMethod = $method;
    if ($method === 'POST' && isset($_POST['_method'])) {
        $m = strtoupper((string)$_POST['_method']);
        if (in_array($m, ['PUT', 'DELETE'], true)) {
            $effectiveMethod = $m;
        }
    }

    // Gestion des différentes méthodes HTTP
    switch ($effectiveMethod) {
        case 'GET':
            handleGetMenu($pdo);
            break;
            
        case 'POST':
            handleCreateMenu($pdo);
            break;
            
        case 'PUT':
            handleUpdateMenu($pdo);
            break;
            
        case 'DELETE':
            handleDeleteMenu($pdo);
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Méthode non autorisée'
            ]);
    }
    
} catch (Exception $e) {
    // Erreur serveur
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'Erreur lors de la gestion du menu',
        'debug' => ENVIRONMENT === 'development' ? $e->getMessage() : null
    ]);
}

// GET - Récupérer tous les plats du menu
function handleGetMenu($pdo) {
    $params = $_GET;
    
    // Menu du jour spécifique
    if (isset($params['today']) && $params['today'] == 1) {
        $query = "SELECT * FROM menu WHERE is_today = 1 AND available = 1 LIMIT 1";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $menu = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'menu' => $menu
        ]);
        return;
    }
    
    // Tous les plats du menu
    $query = "SELECT * FROM menu ORDER BY category, name";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $menuItems = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'menu' => $menuItems
    ]);
}

// POST - Créer un nouveau plat
function handleCreateMenu($pdo) {
    $data = null;
    $isMultipart = !empty($_POST) || !empty($_FILES);
    if ($isMultipart) {
        $data = $_POST;
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
    }
    
    // Validation des données requises
    $required = ['name', 'price', 'category'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Le champ '$field' est requis"
            ]);
            return;
        }
    }
    
    // Image upload (optional)
    $imageUrl = null;
    if ($isMultipart && !empty($_FILES['image']['tmp_name'])) {
        $uploadsDir = __DIR__ . '/../../../assets/uploads/menu';
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('menu_') . '.' . $ext;
        $target = $uploadsDir . '/' . $filename;
        if (move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
            $imageUrl = '/assets/uploads/menu/' . $filename;
        }
    }
    if ($imageUrl === null) {
        $imageUrl = $data['image_url'] ?? null;
    }

    // Insérer le nouveau plat
    $query = "INSERT INTO menu (name, description, price, category, image_url, is_today, available) 
              VALUES (:name, :description, :price, :category, :image_url, :is_today, :available)";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        'name' => trim($data['name']),
        'description' => $data['description'] ?? null,
        'price' => (int)$data['price'],
        'category' => trim($data['category']),
        'image_url' => $imageUrl,
        'is_today' => isset($data['is_today']) ? (int)$data['is_today'] : 0,
        'available' => isset($data['available']) ? (int)$data['available'] : 1
    ]);
    
    $menuId = $pdo->lastInsertId();
    
    // Si ce plat est le menu du jour, désactiver les autres
    if (isset($data['is_today']) && $data['is_today'] == 1) {
        $updateQuery = "UPDATE menu SET is_today = 0 WHERE id != :id";
        $updateStmt = $pdo->prepare($updateQuery);
        $updateStmt->execute(['id' => $menuId]);
    }
    
    // Récupérer le plat créé
    $selectQuery = "SELECT * FROM menu WHERE id = :id";
    $selectStmt = $pdo->prepare($selectQuery);
    $selectStmt->execute(['id' => $menuId]);
    $menuItem = $selectStmt->fetch();
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Plat créé avec succès',
        'menu' => $menuItem
    ]);
}

// PUT - Mettre à jour un plat
function handleUpdateMenu($pdo) {
    $data = null;
    $isMultipart = !empty($_POST) || !empty($_FILES);
    if ($isMultipart) {
        $data = $_POST;
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
    }
    
    // Validation de l'ID
    if (!isset($data['id']) || !is_numeric($data['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID du plat requis'
        ]);
        return;
    }
    
    // Construire la requête de mise à jour dynamiquement
    $updateFields = [];
    $updateParams = ['id' => $data['id']];
    
    $allowedFields = ['name', 'description', 'price', 'category', 'image_url', 'is_today', 'available'];

    // Image upload on update (optional)
    if ($isMultipart && !empty($_FILES['image']['tmp_name'])) {
        $uploadsDir = __DIR__ . '/../../../assets/uploads/menu';
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('menu_') . '.' . $ext;
        $target = $uploadsDir . '/' . $filename;
        if (move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
            $data['image_url'] = '/assets/uploads/menu/' . $filename;
        }
    }
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            if ($field === 'price' || $field === 'is_today' || $field === 'available') {
                $updateParams[$field] = (int)$data[$field];
            } else {
                $updateParams[$field] = $data[$field];
            }
            $updateFields[] = "$field = :$field";
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Aucune donnée à mettre à jour'
        ]);
        return;
    }
    
    $query = "UPDATE menu SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->execute($updateParams);
    
    // Si ce plat devient le menu du jour, désactiver les autres
    if (isset($data['is_today']) && $data['is_today'] == 1) {
        $updateTodayQuery = "UPDATE menu SET is_today = 0 WHERE id != :id";
        $updateTodayStmt = $pdo->prepare($updateTodayQuery);
        $updateTodayStmt->execute(['id' => $data['id']]);
    }
    
    // Récupérer le plat mis à jour
    $selectQuery = "SELECT * FROM menu WHERE id = :id";
    $selectStmt = $pdo->prepare($selectQuery);
    $selectStmt->execute(['id' => $data['id']]);
    $menuItem = $selectStmt->fetch();
    
    echo json_encode([
        'success' => true,
        'message' => 'Plat mis à jour avec succès',
        'menu' => $menuItem
    ]);
}

// DELETE - Supprimer un plat
function handleDeleteMenu($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validation de l'ID
    if (!isset($data['id']) || !is_numeric($data['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID du plat requis'
        ]);
        return;
    }
    
    // Vérifier si le plat existe
    $checkQuery = "SELECT id FROM menu WHERE id = :id";
    $checkStmt = $pdo->prepare($checkQuery);
    $checkStmt->execute(['id' => $data['id']]);
    
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Plat non trouvé'
        ]);
        return;
    }
    
    // Supprimer le plat
    $query = "DELETE FROM menu WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->execute(['id' => $data['id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Plat supprimé avec succès'
    ]);
}
?>