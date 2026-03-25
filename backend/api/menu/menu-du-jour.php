<?php
/**
 * API for menu of the day.
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

    $canFilterToday = in_array('is_today', $cols, true);
    $canFilterAvailable = in_array('available', $cols, true);
    $orderByCol = in_array('id', $cols, true) ? 'id' : $selectCols[0];

    $menu = null;

    if ($canFilterToday && $canFilterAvailable) {
        $stmt = $pdo->prepare("SELECT {$selectSql} FROM menu WHERE is_today = 1 AND available = 1 LIMIT 1");
        $stmt->execute();
        $menu = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$menu && $canFilterAvailable) {
        $stmt = $pdo->prepare("SELECT {$selectSql} FROM menu WHERE available = 1 ORDER BY {$orderByCol} ASC LIMIT 1");
        $stmt->execute();
        $menu = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$menu) {
        $stmt = $pdo->prepare("SELECT {$selectSql} FROM menu ORDER BY {$orderByCol} ASC LIMIT 1");
        $stmt->execute();
        $menu = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$menu) {
        echo json_encode([
            'success' => false,
            'data' => null,
            'message' => 'Aucun menu disponible'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

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

    $resolveImage = function ($rawPath) use ($projectRoot, $defaultWeb) {
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
            $candidates[] = '/assets/uploads/menu/' . $clean;
            $candidates[] = '/assets/images/menu/' . $clean;
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

    if (array_key_exists('image_url', $menu)) {
        $menu['image_url'] = $resolveImage($menu['image_url']);
        if ($siteBase !== '' && $siteBase !== '/') {
            $img = (string)$menu['image_url'];
            if (str_starts_with($img, '/assets/') || str_starts_with($img, '/uploads/')) {
                $menu['image_url'] = $siteBase . $img;
            }
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $menu,
        'message' => ''
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
