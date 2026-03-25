<?php
// Test pour vérifier l'accès à l'image par défaut
header('Content-Type: text/plain');

$imagePath = __DIR__ . '/assets/images/default.jpg';
$webPath = '/assets/images/default.jpg';

echo "Chemin du fichier: " . $imagePath . "\n";
echo "Chemin web: " . $webPath . "\n";
echo "Fichier existe: " . (file_exists($imagePath) ? 'OUI' : 'NON') . "\n";

if (file_exists($imagePath)) {
    echo "Taille du fichier: " . filesize($imagePath) . " octets\n";
    echo "Type MIME: " . mime_content_type($imagePath) . "\n";
}

// Vérifier les chemins relatifs
$relativePaths = [
    '/assets/images/default.jpg',
    'assets/images/default.jpg',
    './assets/images/default.jpg',
    '../assets/images/default.jpg'
];

echo "\nVérification des chemins relatifs:\n";
foreach ($relativePaths as $path) {
    $fullPath = __DIR__ . '/' . ltrim($path, './');
    echo "  $path -> " . (file_exists($fullPath) ? 'EXISTS' : 'NOT FOUND') . "\n";
}
?>
