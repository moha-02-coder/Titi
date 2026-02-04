<?php
// Point d'entrée pour Render.com
// Redirige vers index.html tout en permettant les requêtes API

$request_uri = $_SERVER['REQUEST_URI'];
$request_path = parse_url($request_uri, PHP_URL_PATH);

// API endpoints - laisser PHP les gérer
if (strpos($request_path, '/backend/api/') === 0 || strpos($request_path, '/backend/') === 0) {
    // Inclure le fichier PHP approprié
    $file_path = __DIR__ . $request_path;
    
    if (file_exists($file_path) && is_file($file_path)) {
        include $file_path;
        exit;
    }
    
    // Si c'est un répertoire, essayer d'indexer
    if (is_dir($file_path)) {
        $index_file = $file_path . '/index.php';
        if (file_exists($index_file)) {
            include $index_file;
            exit;
        }
    }
    
    // 404 pour l'API
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API endpoint not found']);
    exit;
}

// Servir les fichiers statiques directement
$static_extensions = ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf'];
$extension = pathinfo($request_path, PATHINFO_EXTENSION);

if ($extension && in_array(strtolower($extension), $static_extensions)) {
    $file_path = __DIR__ . $request_path;
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
