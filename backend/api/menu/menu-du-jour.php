<?php
/**
 * API pour récupérer le menu du jour - Version ultra-simplifiée
 */

// Debug temporaire (désactiver en production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

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

    // Utiliser la base de données pour récupérer le menu du jour
    require_once __DIR__ . '/../../config/database.php';
    $pdo = getDatabaseConnection();

    // Discover available columns to avoid selecting non-existing fields
    $colStmt = $pdo->query("DESCRIBE menu");
    $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    $wanted = ['id','name','description','price','category','available','is_today','image_url','updated_at'];
    $selectCols = array_values(array_intersect($wanted, $cols));
    if (empty($selectCols)) {
        // fallback to any column list
        $selectCols = $cols;
    }
    $selectSql = implode(', ', $selectCols);

    $stmt = $pdo->prepare("SELECT {$selectSql} FROM menu WHERE is_today = 1 AND available = 1 LIMIT 1");
    // If columns 'is_today' or 'available' missing, adjust query
    $needsAdjust = false;
    if (!in_array('is_today', $cols) || !in_array('available', $cols)) {
        $needsAdjust = true;
    }
    if ($needsAdjust) {
        // fallback: return first available menu ordered by id
        $stmt = $pdo->prepare("SELECT {$selectSql} FROM menu ORDER BY id LIMIT 1");
        $stmt->execute();
        $menu = $stmt->fetch();
    } else {
        $stmt->execute();
        $menu = $stmt->fetch();
        if (!$menu) {
            $stmt = $pdo->prepare("SELECT {$selectSql} FROM menu WHERE available = 1 ORDER BY id LIMIT 1");
            $stmt->execute();
            $menu = $stmt->fetch();
        }
    }

    if (!$menu) {
        $response = ['success' => false, 'data' => null, 'message' => 'Aucun menu disponible'];
    } else {
        // Resolve image path to an existing file or fallback default to avoid 404s
        $defaultWeb = '/assets/images/default.jpg';
        $projectRoot = realpath(__DIR__ . '/../../..');
        $resolve = function($p) use ($projectRoot, $defaultWeb) {
            if (!$p) return $defaultWeb;
            $p = trim($p);
            if (strpos($p, '/') === 0) {
                $file = $projectRoot . $p;
                return ($projectRoot && $file && file_exists($file)) ? $p : $defaultWeb;
            }
            if (stripos($p, 'assets/') === 0) {
                $file = $projectRoot . '/' . $p;
                return ($projectRoot && $file && file_exists($file)) ? '/' . ltrim($p, '/') : $defaultWeb;
            }
            $candidate = '/images/menu/' . ltrim($p, '/');
            $file = $projectRoot . '/assets' . $candidate;
            return ($projectRoot && $file && file_exists($file)) ? '/assets' . $candidate : $defaultWeb;
        };
        if (isset($menu['image_url'])) $menu['image_url'] = $resolve($menu['image_url']);
        $response = ['success' => true, 'data' => $menu, 'message' => ''];
    }
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);

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