<?php
/**
 * Public API: returns full menu, optional category filter.
 */

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

try {
    require_once __DIR__ . '/../../config/database.php';
    $pdo = getDatabaseConnection();

    $category = isset($_GET['category']) ? strtolower(trim((string)$_GET['category'])) : 'all';
    if ($category === '') {
        $category = 'all';
    }

    $cols = getTableColumns($pdo, 'menu');
    if (empty($cols)) {
        throw new RuntimeException('Table menu introuvable ou vide.');
    }

    $wanted = ['id', 'name', 'description', 'price', 'category', 'available', 'is_today', 'image_url', 'updated_at'];
    $selectCols = array_values(array_intersect($wanted, $cols));
    if (empty($selectCols)) {
        $selectCols = $cols;
    }
    $selectSql = implode(', ', $selectCols);

    $where = [];
    $params = [];

    if (in_array('available', $cols, true)) {
        $where[] = 'available = :available';
        $params[':available'] = 1;
    }

    if ($category !== 'all' && in_array('category', $cols, true)) {
        $categoryMapping = [
            'plats' => ['Plat', 'Plats', 'plats', 'Plats principaux', 'plats principaux'],
            'entrees' => ['Entree', 'Entrees', 'entree', 'entrees', 'Entrée', 'Entrées', 'entrée', 'entrées', 'Entree froide'],
            'desserts' => ['Dessert', 'Desserts', 'desserts'],
            'boissons' => ['Boisson', 'Boissons', 'boissons']
        ];

        if (isset($categoryMapping[$category])) {
            $holders = [];
            foreach ($categoryMapping[$category] as $idx => $value) {
                $key = ':category_' . $idx;
                $holders[] = $key;
                $params[$key] = $value;
            }
            $where[] = 'category IN (' . implode(', ', $holders) . ')';
        } else {
            $where[] = 'LOWER(category) = :category';
            $params[':category'] = $category;
        }
    }

    if (in_array('is_today', $cols, true)) {
        $where[] = '(is_today = 0 OR is_today IS NULL)';
    }

    $whereSql = empty($where) ? '' : ('WHERE ' . implode(' AND ', $where));

    $orderParts = [];
    if (in_array('category', $cols, true)) $orderParts[] = 'category';
    if (in_array('name', $cols, true)) $orderParts[] = 'name';
    if (empty($orderParts) && in_array('id', $cols, true)) $orderParts[] = 'id';
    $orderSql = empty($orderParts) ? '' : ('ORDER BY ' . implode(', ', $orderParts));

    $sql = "SELECT {$selectSql} FROM menu {$whereSql} {$orderSql}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $menuItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $defaultWeb = '/Titi/assets/images/default.jpg';
    $projectRoot = realpath(__DIR__ . '/../../..');

    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $siteBase = '';
    if (is_string($scriptName) && $scriptName !== '') {
        $siteBase = preg_replace('#/backend/api/.*$#', '', $scriptName);
        if ($siteBase === null) $siteBase = '';
        $siteBase = rtrim((string)$siteBase, '/');
    }
    if (!is_string($siteBase)) $siteBase = '';

    $resolveSingleImage = function ($rawPath) use ($projectRoot, $defaultWeb) {
        if (!$rawPath) {
            return $defaultWeb;
        }

        $path = trim((string)$rawPath);
        if ($path === '') {
            return $defaultWeb;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

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
            $candidates[] = '/assets/uploads/menu/' . $clean;
            $candidates[] = '/assets/images/menu/' . $clean;
            $candidates[] = '/assets/' . $clean;
        }

        if (!$projectRoot) {
            return $candidates[0] ?? $defaultWeb;
        }

        foreach ($candidates as $webPath) {
            $abs = $projectRoot . str_replace('/', DIRECTORY_SEPARATOR, $webPath);
            if (is_file($abs)) {
                return $webPath;
            }
        }

        return $defaultWeb;
    };

    foreach ($menuItems as &$item) {
        if (!array_key_exists('image_url', $item)) {
            continue;
        }

        $raw = $item['image_url'];
        if (is_string($raw) && str_starts_with(trim($raw), '[')) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $normalized = array_map($resolveSingleImage, $decoded);
                $item['image_url'] = json_encode($normalized, JSON_UNESCAPED_UNICODE);
                continue;
            }
        }

        $item['image_url'] = $resolveSingleImage($raw);
    }
    unset($item);

    // Prefix /assets/... with site base when project is served under a subfolder like /Titi
    if ($siteBase !== '' && $siteBase !== '/Titi') {
        // keep as-is for custom setups
    }
    if ($siteBase !== '' && $siteBase !== '/') {
        foreach ($menuItems as &$item2) {
            if (!isset($item2['image_url'])) continue;
            $img = (string)$item2['image_url'];
            if (str_starts_with($img, '/assets/') || str_starts_with($img, '/uploads/')) {
                $item2['image_url'] = $siteBase . $img;
            }
        }
        unset($item2);
    }

    echo json_encode([
        'success' => true,
        'data' => $menuItems,
        'message' => 'Plats recuperes'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $t) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'Erreur serveur lors de la recuperation du menu',
        'error' => (defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $t->getMessage() : 'Erreur interne'
    ], JSON_UNESCAPED_UNICODE);
}
?>
