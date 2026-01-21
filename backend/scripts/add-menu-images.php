<?php
/**
 * Script pour télécharger et ajouter des images aux plats du menu depuis internet
 */

require_once __DIR__ . '/../config/database.php';

// Configuration
$uploadsDir = __DIR__ . '/../../assets/uploads/menu';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

// Mapping des catégories de menu vers des mots-clés
$menuKeywords = [
    'plat' => 'african food dish',
    'entrée' => 'african appetizer',
    'dessert' => 'african dessert',
    'boisson' => 'african drink',
    'snack' => 'african snack'
];

// Fonction pour obtenir une URL d'image depuis Unsplash
function getUnsplashImageUrl($keyword, $width = 800, $height = 800) {
    $searchTerm = urlencode($keyword);
    return "https://source.unsplash.com/{$width}x{$height}/?{$searchTerm}";
}

// Fonction pour télécharger une image
function downloadImage($url, $destination) {
    $ch = curl_init($url);
    $fp = fopen($destination, 'wb');
    curl_setopt($ch, CURLOPT_FILE, $fp);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    $success = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    fclose($fp);
    
    if ($success && $httpCode == 200 && file_exists($destination) && filesize($destination) > 0) {
        return true;
    }
    
    if (file_exists($destination)) {
        unlink($destination);
    }
    return false;
}

// Fonction pour obtenir une image selon le nom du plat
function getImageForMenu($menuName, $category) {
    $nameLower = strtolower($menuName);
    $keyword = 'african food';
    
    // Images spécifiques selon le nom du plat
    if (strpos($nameLower, 'poulet') !== false || strpos($nameLower, 'chicken') !== false) {
        $keyword = 'grilled chicken african';
    } elseif (strpos($nameLower, 'poisson') !== false || strpos($nameLower, 'fish') !== false) {
        $keyword = 'grilled fish african';
    } elseif (strpos($nameLower, 'riz') !== false || strpos($nameLower, 'rice') !== false) {
        $keyword = 'rice dish african';
    } elseif (strpos($nameLower, 'attieké') !== false || strpos($nameLower, 'attiéke') !== false) {
        $keyword = 'cassava attieke african';
    } elseif (strpos($nameLower, 'alloco') !== false || strpos($nameLower, 'plantain') !== false) {
        $keyword = 'fried plantain african';
    } elseif (strpos($nameLower, 'kedjenou') !== false) {
        $keyword = 'stew chicken african';
    } elseif (strpos($nameLower, 'foutou') !== false) {
        $keyword = 'fufu african food';
    } elseif (strpos($nameLower, 'soupe') !== false || strpos($nameLower, 'soup') !== false) {
        $keyword = 'african soup';
    } elseif (strpos($nameLower, 'brochette') !== false || strpos($nameLower, 'kebab') !== false) {
        $keyword = 'grilled meat skewer';
    } elseif (strpos($nameLower, 'beignet') !== false || strpos($nameLower, 'donut') !== false) {
        $keyword = 'african donut dessert';
    } elseif (strpos($nameLower, 'bissap') !== false) {
        $keyword = 'hibiscus drink';
    } else {
        $categoryKeyword = $menuKeywords[strtolower($category)] ?? 'african food';
        $keyword = $categoryKeyword;
    }
    
    return getUnsplashImageUrl($keyword);
}

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier les colonnes disponibles
    $colStmt = $pdo->query("DESCRIBE menu");
    $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $hasImageUrl = in_array('image_url', $cols);
    
    if (!$hasImageUrl) {
        echo "La table menu n'a pas de colonne image_url. Ajout de la colonne...\n";
        $pdo->exec("ALTER TABLE menu ADD COLUMN image_url VARCHAR(255) DEFAULT NULL");
        $hasImageUrl = true;
    }
    
    // Récupérer tous les plats du menu
    $sql = "SELECT id, name, category, image_url FROM menu";
    $stmt = $pdo->query($sql);
    $menuItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $updated = 0;
    $skipped = 0;
    $errors = 0;
    
    echo "Début du téléchargement des images pour le menu...\n";
    echo "Nombre de plats à traiter: " . count($menuItems) . "\n\n";
    
    foreach ($menuItems as $item) {
        $menuId = $item['id'];
        $menuName = $item['name'];
        $category = $item['category'] ?? 'plat';
        
        // Vérifier si le plat a déjà une image valide
        if (!empty($item['image_url']) && 
            (strpos($item['image_url'], 'http') === 0 || file_exists(__DIR__ . '/../..' . $item['image_url']))) {
            echo "✓ Plat #{$menuId} ({$menuName}) a déjà une image - ignoré\n";
            $skipped++;
            continue;
        }
        
        // Obtenir l'URL de l'image
        $imageUrl = getImageForMenu($menuName, $category);
        
        // Générer un nom de fichier unique
        $extension = 'jpg';
        $filename = 'menu_' . $menuId . '_' . time() . '_' . rand(1000, 9999) . '.' . $extension;
        $filepath = $uploadsDir . '/' . $filename;
        $relativePath = '/assets/uploads/menu/' . $filename;
        
        echo "Téléchargement image pour plat #{$menuId} ({$menuName})... ";
        
        // Télécharger l'image
        if (downloadImage($imageUrl, $filepath)) {
            // Mettre à jour la base de données
            $updateSql = "UPDATE menu SET image_url = :image_url WHERE id = :id";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                ':image_url' => $relativePath,
                ':id' => $menuId
            ]);
            
            echo "✓ OK\n";
            $updated++;
        } else {
            echo "✗ Échec du téléchargement\n";
            $errors++;
        }
        
        // Petite pause
        usleep(500000); // 0.5 seconde
    }
    
    echo "\n=== Résumé ===\n";
    echo "Plats mis à jour: {$updated}\n";
    echo "Plats ignorés (déjà avec image): {$skipped}\n";
    echo "Erreurs: {$errors}\n";
    echo "\nTerminé!\n";
    
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
?>
