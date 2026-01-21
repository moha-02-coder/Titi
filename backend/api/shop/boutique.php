<?php
header('Content-Type: application/json; charset=utf-8');
// Simple boutique products endpoint
require_once __DIR__ . '/../../config/database.php';

$pdo = getDatabaseConnection();

// Allow optional category filter via GET
$category = isset($_GET['category']) ? trim($_GET['category']) : 'all';
$category = $category === '' ? 'all' : strtolower($category);

try {
    // Discover available columns to avoid selecting non-existing fields
    $colStmt = $pdo->query("DESCRIBE products");
    $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);

    $wanted = ['id','name','description','price','image_url','images','category','type','stock'];
    $selectCols = array_values(array_intersect($wanted, $cols));
    if (empty($selectCols)) {
        // minimal fallback
        $selectCols = array_intersect(['id','name','price'], $cols);
    }
    $selectSql = implode(', ', $selectCols);

    $where = [];
    $params = [];

    // If the table has a 'type' column, filter by boutique products
    if (in_array('type', $cols)) {
        $where[] = 'type = :type';
        $params[':type'] = 'boutique';
    }

    // If category filter requested and column exists, apply it
    if ($category !== 'all' && in_array('category', $cols)) {
        $where[] = 'LOWER(category) = :category';
        $params[':category'] = $category;
    }

    $whereSql = '';
    if (!empty($where)) $whereSql = 'WHERE ' . implode(' AND ', $where);

    // Gérer la limite optionnelle
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;
    $limit = max(1, min($limit, 500)); // Entre 1 et 500

    $sql = "SELECT {$selectSql} FROM products {$whereSql} ORDER BY name ASC LIMIT {$limit}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $rows,
        'message' => 'Produits récupérés'
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'Erreur lors de la récupération des produits',
        'debug' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $e->getMessage() : null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
