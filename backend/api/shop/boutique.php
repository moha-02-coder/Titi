<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'Methode non autorisee'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $category = isset($_GET['category']) ? strtolower(trim((string)$_GET['category'])) : 'all';
    if ($category === '') $category = 'all';

    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;
    $limit = max(1, min($limit, 500));

    $cols = getTableColumns($pdo, 'products');
    if (empty($cols)) {
        throw new RuntimeException('Table products introuvable ou vide.');
    }

    $pick = function (array $candidates) use ($cols) {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $cols, true)) {
                return $candidate;
            }
        }
        return null;
    };

    $idCol = $pick(['id']);
    $nameCol = $pick(['name', 'title']);
    $descriptionCol = $pick(['description', 'details']);
    $priceCol = $pick(['price', 'unit_price']);
    $imageUrlCol = $pick(['image_url', 'image']);
    $imagesCol = $pick(['images']);
    $mainImageCol = $pick(['main_image']);
    $categoryCol = $pick(['category']);
    $typeCol = $pick(['type', 'product_type']);
    $stockCol = $pick(['stock', 'quantity']);
    $activeCol = $pick(['active', 'is_active', 'is_available']);
    $updatedAtCol = $pick(['updated_at', 'updatedAt']);

    if (!$idCol || !$nameCol || !$priceCol) {
        echo json_encode([
            'success' => false,
            'data' => null,
            'message' => 'Colonnes requises manquantes dans products (id, name, price)',
            'available_columns' => $cols
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $select = [];
    $select[] = $idCol . ' AS id';
    $select[] = $nameCol . ' AS name';
    $select[] = $priceCol . ' AS price';
    if ($descriptionCol) $select[] = $descriptionCol . ' AS description';
    if ($imageUrlCol) $select[] = $imageUrlCol . ' AS image_url';
    if ($imagesCol) $select[] = $imagesCol . ' AS images';
    if ($mainImageCol) $select[] = $mainImageCol . ' AS main_image';
    if ($categoryCol) $select[] = $categoryCol . ' AS category';
    if ($typeCol) $select[] = $typeCol . ' AS type';
    if ($stockCol) $select[] = $stockCol . ' AS stock';
    if ($updatedAtCol) $select[] = $updatedAtCol . ' AS updated_at';

    $where = [];
    $params = [];

    if ($typeCol) {
        $where[] = '(LOWER(' . $typeCol . ') = :type OR ' . $typeCol . ' IS NULL OR ' . $typeCol . " = '')";
        $params[':type'] = 'boutique';
    }

    if ($activeCol) {
        $where[] = '(' . $activeCol . ' = 1 OR ' . $activeCol . ' = TRUE)';
    }

    if ($category !== 'all' && $categoryCol) {
        $where[] = 'LOWER(' . $categoryCol . ') = :category';
        $params[':category'] = $category;
    }

    $whereSql = empty($where) ? '' : ('WHERE ' . implode(' AND ', $where));
    $orderBy = $nameCol ?: $idCol;

    $sql = 'SELECT ' . implode(', ', $select) . ' FROM products ' . $whereSql . ' ORDER BY ' . $orderBy . ' ASC LIMIT ' . $limit;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $defaultWeb = '/Titi/assets/images/default.jpg';
    $projectRoot = realpath(__DIR__ . '/../../..');

    $resolveSingleImage = function ($rawPath) use ($projectRoot, $defaultWeb) {
        if (!$rawPath) return $defaultWeb;

        $path = trim((string)$rawPath);
        if ($path === '') return $defaultWeb;
        if (preg_match('#^https?://#i', $path)) return $path;

        $candidates = [];

        if (str_starts_with($path, '/assets/')) {
            $candidates[] = $path;
        } elseif (str_starts_with($path, 'assets/')) {
            $candidates[] = '/' . ltrim($path, '/');
        } elseif (str_starts_with($path, '/images/')) {
            $candidates[] = '/assets' . $path;
        } elseif (str_starts_with($path, 'images/')) {
            $candidates[] = '/assets/' . ltrim($path, '/');
        } elseif (str_starts_with($path, '/')) {
            $candidates[] = $path;
            $candidates[] = '/assets' . $path;
        } else {
            $clean = ltrim($path, '/');
            $candidates[] = '/assets/uploads/products/' . $clean;
            $candidates[] = '/assets/images/products/' . $clean;
            $candidates[] = '/assets/images/shop/' . $clean;
            $candidates[] = '/assets/' . $clean;
        }

        if (!$projectRoot) {
            return $candidates[0] ?? $defaultWeb;
        }

        foreach ($candidates as $webPath) {
            $abs = $projectRoot . str_replace('/', DIRECTORY_SEPARATOR, $webPath);
            if (is_file($abs)) return $webPath;
        }

        return $defaultWeb;
    };

    foreach ($rows as &$row) {
        if (isset($row['image_url'])) {
            $raw = $row['image_url'];
            if (is_string($raw) && str_starts_with(trim($raw), '[')) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $row['image_url'] = json_encode(array_map($resolveSingleImage, $decoded), JSON_UNESCAPED_UNICODE);
                } else {
                    $row['image_url'] = $resolveSingleImage($raw);
                }
            } else {
                $row['image_url'] = $resolveSingleImage($raw);
            }
        }

        if (isset($row['images'])) {
            $rawImages = $row['images'];
            if (is_string($rawImages) && str_starts_with(trim($rawImages), '[')) {
                $decoded = json_decode($rawImages, true);
                if (is_array($decoded)) {
                    $row['images'] = json_encode(array_map($resolveSingleImage, $decoded), JSON_UNESCAPED_UNICODE);
                }
            } else {
                $row['images'] = $resolveSingleImage($rawImages);
            }
        }

        if (isset($row['main_image'])) {
            $row['main_image'] = $resolveSingleImage($row['main_image']);
        }
    }
    unset($row);

    echo json_encode([
        'success' => true,
        'data' => $rows,
        'message' => 'Produits recuperes'
    ], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'Erreur lors de la recuperation des produits',
        'debug' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $e->getMessage() : null
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
