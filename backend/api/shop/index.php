<?php
/**
 * Shop index API with robust column detection.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(200);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Methode non autorisee']);
    exit;
}

try {
    require_once __DIR__ . '/../../config/database.php';
    $pdo = getDatabaseConnection();

    $columns = getTableColumns($pdo, 'products');

    $pick = function (array $candidates) use ($columns) {
        foreach ($candidates as $c) {
            if (in_array($c, $columns, true)) {
                return $c;
            }
        }
        return null;
    };

    $idCol = $pick(['id']);
    $nameCol = $pick(['name', 'title']);
    $descCol = $pick(['description', 'desc', 'details']);
    $priceCol = $pick(['price', 'unit_price']);
    $categoryCol = $pick(['category']);
    $stockCol = $pick(['stock', 'quantity', 'in_stock']);
    $activeCol = $pick(['active', 'is_active']);
    $imageCol = $pick(['image_url', 'main_image', 'image', 'images', 'photo', 'img_path', 'img']);

    $selectCols = [];
    if ($idCol) $selectCols[] = $idCol . ' AS id';
    if ($nameCol) $selectCols[] = $nameCol . ' AS name';
    if ($descCol) $selectCols[] = $descCol . ' AS description';
    if ($priceCol) $selectCols[] = $priceCol . ' AS price';
    if ($categoryCol) $selectCols[] = $categoryCol . ' AS category';
    if ($stockCol) $selectCols[] = $stockCol . ' AS stock';
    if ($activeCol) $selectCols[] = $activeCol . ' AS active';
    if ($imageCol) $selectCols[] = $imageCol . ' AS image_url';

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

    if ($activeCol) {
        $where[] = '(' . $activeCol . ' = 1 OR ' . $activeCol . ' = TRUE)';
    }

    $inStockOnly = isset($_GET['in_stock']) && $_GET['in_stock'] === '1';
    if ($inStockOnly && $stockCol) {
        $where[] = $stockCol . ' > 0';
    }

    $sql = 'SELECT ' . $selectSql . ' FROM products';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY ' . ($idCol ?: '1');

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($products as &$p) {
        if (!array_key_exists('image_url', $p)) $p['image_url'] = null;
        if (!array_key_exists('stock', $p)) $p['stock'] = null;
        if (!array_key_exists('active', $p)) $p['active'] = 1;
    }
    unset($p);

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $products, 'message' => ''], JSON_UNESCAPED_UNICODE);
} catch (Throwable $t) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'Erreur serveur lors de la recuperation des produits',
        'error' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : 'Erreur interne'
    ], JSON_UNESCAPED_UNICODE);
}
?>
