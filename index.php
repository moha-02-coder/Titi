<?php
// Point d'entrée pour Render.com
// Redirige vers index.html tout en permettant les requêtes API

$request_uri = $_SERVER['REQUEST_URI'];
$request_path = parse_url($request_uri, PHP_URL_PATH);
$projectBase = '/' . basename(__DIR__);
$normalized_path = $request_path;

// Support projects served from a subfolder (e.g. /titi-golden-taste)
if (is_string($normalized_path) && str_starts_with($normalized_path, $projectBase . '/')) {
    $normalized_path = substr($normalized_path, strlen($projectBase));
}

// Generic fallback for virtual aliases (ex: /titi-golden-taste/...)
if (is_string($normalized_path) && preg_match('#^/[^/]+/(.+)$#', $normalized_path, $m)) {
    $candidate = '/' . $m[1];
    if (file_exists(__DIR__ . $candidate) || is_dir(__DIR__ . $candidate)) {
        $normalized_path = $candidate;
    }
}
if ($normalized_path === '' || $normalized_path === false || $normalized_path === null) {
    $normalized_path = '/';
}

// API endpoints - laisser PHP les gérer
if (strpos($normalized_path, '/backend/api/') === 0 || strpos($normalized_path, '/backend/') === 0) {
    if (strpos($normalized_path, '..') !== false) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Chemin invalide']);
        exit;
    }

    $file_path = __DIR__ . $normalized_path;
    $candidates = [$file_path];

    // Support extensionless endpoints: /backend/api/menu/all -> /backend/api/menu/all.php
    if (pathinfo($file_path, PATHINFO_EXTENSION) === '') {
        $candidates[] = $file_path . '.php';
    }

    // Support folder endpoints: /backend/api/shop -> /backend/api/shop/index.php
    if (is_dir($file_path)) {
        $candidates[] = rtrim($file_path, '/\\') . '/index.php';
    }

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            include $candidate;
            exit;
        }
    }

    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'API endpoint not found']);
    exit;
}

// Servir les fichiers statiques directement
$static_extensions = ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf'];
$extension = pathinfo($normalized_path, PATHINFO_EXTENSION);

if ($extension && in_array(strtolower($extension), $static_extensions)) {
    $file_path = __DIR__ . $normalized_path;
    if (file_exists($file_path)) {
        // Définir le bon Content-Type
        $mime_types = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
            'svg' => 'image/svg+xml',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf'
        ];
        
        if (isset($mime_types[$extension])) {
            header('Content-Type: ' . $mime_types[$extension]);
        }
        
        readfile($file_path);
        exit;
    }
}

// Pour toutes les autres requêtes, servir index.html (SPA)
include __DIR__ . '/index.html';
?>
