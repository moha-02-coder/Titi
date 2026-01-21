<?php
/**
 * API endpoint pour télécharger et ajouter des images aux produits et plats
 * Exécute les scripts de téléchargement d'images
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$type = $_POST['type'] ?? $_GET['type'] ?? 'products'; // 'products' ou 'menu'

// Fonction pour capturer la sortie du script
function executeImageScript($scriptPath, $type) {
    ob_start();
    
    try {
        // Inclure le script qui va exécuter le téléchargement
        include $scriptPath;
        
        $output = ob_get_clean();
        
        // Parser la sortie pour extraire les statistiques
        $stats = [
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0
        ];
        
        if (preg_match('/Produits? mis à jour: (\d+)/', $output, $matches)) {
            $stats['updated'] = (int)$matches[1];
        }
        if (preg_match('/Produits? ignorés[^:]*: (\d+)/', $output, $matches)) {
            $stats['skipped'] = (int)$matches[1];
        }
        if (preg_match('/Erreurs?: (\d+)/', $output, $matches)) {
            $stats['errors'] = (int)$matches[1];
        }
        
        return [
            'success' => true,
            'message' => 'Images téléchargées avec succès',
            'stats' => $stats,
            'output' => $output
        ];
        
    } catch (Exception $e) {
        ob_end_clean();
        throw $e;
    }
}

try {
    $result = null;
    
    if ($type === 'products') {
        $scriptPath = __DIR__ . '/../../scripts/add-product-images.php';
        if (!file_exists($scriptPath)) {
            throw new Exception('Script add-product-images.php non trouvé');
        }
        $result = executeImageScript($scriptPath, 'products');
        
    } elseif ($type === 'menu') {
        $scriptPath = __DIR__ . '/../../scripts/add-menu-images.php';
        if (!file_exists($scriptPath)) {
            throw new Exception('Script add-menu-images.php non trouvé');
        }
        $result = executeImageScript($scriptPath, 'menu');
        
    } else {
        throw new Exception('Type invalide. Utilisez "products" ou "menu"');
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors du téléchargement des images',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
