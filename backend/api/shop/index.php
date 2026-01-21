<?php
/**
 * API robuste pour récupérer les produits de la boutique
 * - utilise PDO via getDatabaseConnection()
 * - détecte dynamiquement les colonnes disponibles (ex: image_url vs image)
 * - sécurise le filtre in_stock si la colonne existe
 * - renvoie toujours un JSON structuré { success, data, message }
 */

// Debug temporaire (désactiver en production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Headers pour API REST
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET for this endpoint
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(200);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Méthode non autorisée']);
    exit;
}

try {
    require_once __DIR__ . '/../../config/database.php';
    $pdo = getDatabaseConnection();

    // Determine available columns in `products` table
    $colsStmt = $pdo->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'products'");
    $colsStmt->execute(['schema' => DB_NAME]);
    $columns = $colsStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    // Helper to pick first existing candidate column
    $pick = function(array $candidates) use ($columns) {
        foreach ($candidates as $c) {
            if (in_array($c, $columns)) return $c;
        }
        return null;
    };

    // Standard columns we want to return if present
    $idCol = $pick(['id']);
    $nameCol = $pick(['name', 'title']);
    $descCol = $pick(['description', 'desc', 'details']);
    $priceCol = $pick(['price', 'unit_price']);
    $categoryCol = $pick(['category']);
    $stockCol = $pick(['stock', 'quantity', 'in_stock']);
    $activeCol = $pick(['active', 'is_active']);
    $imageCol = $pick(['image_url','image','images','photo','img_path','img']);

    // Build select list only with available columns
    $selectCols = [];
    if ($idCol) $selectCols[] = $idCol . ' AS id';
    if ($nameCol) $selectCols[] = $nameCol . ' AS name';
    if ($descCol) $selectCols[] = $descCol . ' AS description';
    if ($priceCol) $selectCols[] = $priceCol . ' AS price';
    if ($categoryCol) $selectCols[] = $categoryCol . ' AS category';
    if ($stockCol) $selectCols[] = $stockCol . ' AS stock';
    if ($activeCol) $selectCols[] = $activeCol . ' AS active';
    if ($imageCol) $selectCols[] = $imageCol . ' AS image_url';

    // If critical columns missing, return a clear error
    if (!$idCol || !$nameCol || !$priceCol) {
        http_response_code(200);
        echo json_encode([
            'success' => false,
            'data' => null,
            'message' => 'La table products ne contient pas les colonnes requises (id, name, price)',
            'available_columns' => $columns
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $selectSql = implode(', ', $selectCols);
    $where = [];
    $params = [];

    // Only include active filter if that column exists
    if ($activeCol) {
        $where[] = "$activeCol = 1";
    }

    // Handle in_stock filter safely if stock column exists
    $inStockOnly = isset($_GET['in_stock']) && $_GET['in_stock'] == '1';
    if ($inStockOnly) {
        if ($stockCol) {
            $where[] = "$stockCol > 0";
        } else {
            // stock not present — return informative error rather than 500
            http_response_code(200);
            echo json_encode([
                'success' => false,
                'data' => null,
                'message' => 'Filtre in_stock demandé mais la colonne stock est absente de la table products',
                'available_columns' => $columns
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $sql = "SELECT $selectSql FROM products";
    if (!empty($where)) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY id';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ensure image_url key exists for all products (null if absent)
    foreach ($products as &$p) {
        if (!array_key_exists('image_url', $p)) $p['image_url'] = null;
        if (!array_key_exists('stock', $p)) $p['stock'] = null;
        if (!array_key_exists('active', $p)) $p['active'] = 1;
    }

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $products, 'message' => ''], JSON_UNESCAPED_UNICODE);

} catch (Throwable $t) {
    http_response_code(200);
    $err = [
        'success' => false,
        'data' => null,
        'message' => 'Erreur serveur lors de la récupération des produits',
        'error' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : 'Erreur interne'
    ];
    echo json_encode($err, JSON_UNESCAPED_UNICODE);
}

?>