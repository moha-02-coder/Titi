<?php
/**
 * API publique pour récupérer tous les plats du menu avec filtres par catégorie
 */

// Headers pour API REST
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier que c'est une requête GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(200);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Méthode non autorisée']);
    exit;
}

try {
    require_once __DIR__ . '/../../config/database.php';
    $pdo = getDatabaseConnection();

    // Récupérer le filtre de catégorie
    $category = isset($_GET['category']) ? trim($_GET['category']) : 'all';
    $category = $category === '' ? 'all' : strtolower($category);

    // Découvrir les colonnes disponibles
    $colStmt = $pdo->query("DESCRIBE menu");
    $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $wanted = ['id', 'name', 'description', 'price', 'category', 'available', 'is_today', 'image_url'];
    $selectCols = array_values(array_intersect($wanted, $cols));
    if (empty($selectCols)) {
        $selectCols = $cols;
    }
    $selectSql = implode(', ', $selectCols);

    // Construire la requête avec filtres
    $where = [];
    $params = [];

    // Filtrer uniquement les plats disponibles
    if (in_array('available', $cols)) {
        $where[] = 'available = 1';
    }

    // Filtrer par catégorie si demandé
    if ($category !== 'all' && in_array('category', $cols)) {
        // Mapping des catégories du frontend vers les valeurs de la base de données
        $categoryMapping = [
            'plats' => ['Plat', 'Plats', 'plats', 'Plats principaux', 'plats principaux'],
            'entrees' => ['Entrée', 'Entrées', 'entrées', 'entrees', 'Entrée'],
            'desserts' => ['Dessert', 'Desserts', 'desserts'],
            'boissons' => ['Boisson', 'Boissons', 'boissons']
        ];
        
        // Si la catégorie demandée est dans le mapping, chercher toutes les variantes
        if (isset($categoryMapping[$category])) {
            $placeholders = [];
            foreach ($categoryMapping[$category] as $idx => $catValue) {
                $key = ':category_' . $idx;
                $placeholders[] = $key;
                $params[$key] = $catValue;
            }
            $where[] = 'category IN (' . implode(', ', $placeholders) . ')';
        } else {
            // Sinon, chercher une correspondance exacte (insensible à la casse)
            $where[] = 'LOWER(category) = :category';
            $params[':category'] = strtolower($category);
        }
    }

    // Exclure le menu du jour de cette liste (il est affiché séparément)
    if (in_array('is_today', $cols)) {
        $where[] = '(is_today = 0 OR is_today IS NULL)';
    }

    $whereSql = '';
    if (!empty($where)) {
        $whereSql = 'WHERE ' . implode(' AND ', $where);
    }

    $sql = "SELECT {$selectSql} FROM menu {$whereSql} ORDER BY category, name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $menuItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $menuItems,
        'message' => 'Plats récupérés'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $t) {
    http_response_code(200);
    $err = [
        'success' => false,
        'data' => null,
        'message' => 'Erreur serveur lors de la récupération du menu',
        'error' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : 'Erreur interne'
    ];
    echo json_encode($err, JSON_UNESCAPED_UNICODE);
}
?>
