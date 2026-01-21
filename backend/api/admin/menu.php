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

// Vérifier la méthode HTTP
$method = $_SERVER['REQUEST_METHOD'];

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
    
    // Gestion des différentes méthodes HTTP
    switch ($method) {
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
    $data = json_decode(file_get_contents('php://input'), true);
    
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
    
    // Insérer le nouveau plat
    $query = "INSERT INTO menu (name, description, price, category, image_url, is_today, available) 
              VALUES (:name, :description, :price, :category, :image_url, :is_today, :available)";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        'name' => trim($data['name']),
        'description' => $data['description'] ?? null,
        'price' => (int)$data['price'],
        'category' => trim($data['category']),
        'image_url' => $data['image_url'] ?? null,
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
    
    // Construire la requête de mise à jour dynamiquement
    $updateFields = [];
    $updateParams = ['id' => $data['id']];
    
    $allowedFields = ['name', 'description', 'price', 'category', 'image_url', 'is_today', 'available'];
    
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