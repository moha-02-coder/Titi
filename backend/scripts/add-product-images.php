<?php
/**
 * Script pour télécharger et ajouter des images aux produits depuis internet
 * Utilise des APIs gratuites (Unsplash, Pexels) pour obtenir des images appropriées
 */

require_once __DIR__ . '/../config/database.php';

// Configuration
$uploadsDir = __DIR__ . '/../../assets/uploads/products';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

// Mapping des catégories vers des mots-clés de recherche d'images
$categoryKeywords = [
    'robes' => 'african dress fashion',
    'jeans' => 'jeans pants',
    'chaussures' => 'shoes footwear',
    'sacs' => 'handbag purse',
    'accessoires' => 'accessories jewelry',
    'condiment' => 'spices condiments',
    'accompagnement' => 'food side dish',
    'epice' => 'spices herbs',
    'snack' => 'snacks food',
    'boisson' => 'drink beverage',
    'produit' => 'product item'
];

// Fonction pour obtenir une URL d'image depuis Unsplash (gratuit, pas besoin d'API key pour les images publiques)
function getUnsplashImageUrl($keyword, $width = 800, $height = 800) {
    // Utiliser l'API Unsplash Source pour obtenir des images aléatoires
    $searchTerm = urlencode($keyword);
    return "https://source.unsplash.com/{$width}x{$height}/?{$searchTerm}";
}

// Fonction alternative utilisant Pexels (via placeholder)
function getPexelsImageUrl($keyword) {
    // Utiliser un service de placeholder avec des images réelles
    $searchTerm = urlencode($keyword);
    return "https://images.unsplash.com/photo-" . rand(1500000000000, 1600000000000) . "?w=800&h=800&fit=crop&q=80";
}

// Fonction pour télécharger une image depuis une URL
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

// Fonction pour obtenir une image appropriée selon la catégorie
function getImageForCategory($category, $productName) {
    $keyword = $categoryKeywords[strtolower($category)] ?? 'product';
    
    // Pour les produits alimentaires, utiliser des images plus spécifiques
    if (in_array(strtolower($category), ['condiment', 'accompagnement', 'epice', 'snack', 'boisson'])) {
        $nameLower = strtolower($productName);
        if (strpos($nameLower, 'sauce') !== false) {
            $keyword = 'sauce condiment';
        } elseif (strpos($nameLower, 'attieké') !== false || strpos($nameLower, 'couscous') !== false) {
            $keyword = 'african food cassava';
        } elseif (strpos($nameLower, 'huile') !== false) {
            $keyword = 'cooking oil';
        } elseif (strpos($nameLower, 'piment') !== false) {
            $keyword = 'pepper spice';
        } elseif (strpos($nameLower, 'bissap') !== false || strpos($nameLower, 'miel') !== false) {
            $keyword = 'drink beverage';
        } else {
            $keyword = 'african food product';
        }
    }
    
    return getUnsplashImageUrl($keyword);
}

try {
    $pdo = getDatabaseConnection();
    
    // Récupérer tous les produits qui n'ont pas d'image ou ont une image par défaut
    $colStmt = $pdo->query("DESCRIBE products");
    $cols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $hasImageUrl = in_array('image_url', $cols);
    $hasImages = in_array('images', $cols);
    $hasMainImage = in_array('main_image', $cols);
    
    $selectCols = ['id', 'name', 'category'];
    if ($hasImageUrl) $selectCols[] = 'image_url';
    if ($hasImages) $selectCols[] = 'images';
    if ($hasMainImage) $selectCols[] = 'main_image';
    
    $selectSql = implode(', ', $selectCols);
    
    // Récupérer les produits sans images ou avec des chemins d'images inexistants
    $sql = "SELECT {$selectSql} FROM products";
    $stmt = $pdo->query($sql);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $updated = 0;
    $skipped = 0;
    $errors = 0;
    
    echo "Début du téléchargement des images...\n";
    echo "Nombre de produits à traiter: " . count($products) . "\n\n";
    
    foreach ($products as $product) {
        $productId = $product['id'];
        $productName = $product['name'];
        $category = $product['category'] ?? 'produit';
        
        // Vérifier si le produit a déjà une image valide
        $hasValidImage = false;
        if ($hasImageUrl && !empty($product['image_url']) && 
            (strpos($product['image_url'], 'http') === 0 || file_exists(__DIR__ . '/../..' . $product['image_url']))) {
            $hasValidImage = true;
        }
        if ($hasMainImage && !empty($product['main_image']) && 
            (strpos($product['main_image'], 'http') === 0 || file_exists(__DIR__ . '/../..' . $product['main_image']))) {
            $hasValidImage = true;
        }
        if ($hasImages && !empty($product['images'])) {
            $images = json_decode($product['images'], true);
            if (is_array($images) && !empty($images)) {
                $hasValidImage = true;
            }
        }
        
        if ($hasValidImage) {
            echo "✓ Produit #{$productId} ({$productName}) a déjà une image - ignoré\n";
            $skipped++;
            continue;
        }
        
        // Obtenir l'URL de l'image
        $imageUrl = getImageForCategory($category, $productName);
        
        // Générer un nom de fichier unique
        $extension = 'jpg';
        $filename = 'prod_' . $productId . '_' . time() . '_' . rand(1000, 9999) . '.' . $extension;
        $filepath = $uploadsDir . '/' . $filename;
        $relativePath = '/assets/uploads/products/' . $filename;
        
        echo "Téléchargement image pour produit #{$productId} ({$productName})... ";
        
        // Télécharger l'image
        if (downloadImage($imageUrl, $filepath)) {
            // Mettre à jour la base de données
            $updateFields = [];
            $updateParams = ['id' => $productId];
            
            if ($hasImageUrl) {
                $updateFields[] = 'image_url = :image_url';
                $updateParams[':image_url'] = $relativePath;
            }
            
            if ($hasMainImage) {
                $updateFields[] = 'main_image = :main_image';
                $updateParams[':main_image'] = $relativePath;
            }
            
            if ($hasImages) {
                $imagesArray = [$relativePath];
                $updateFields[] = 'images = :images';
                $updateParams[':images'] = json_encode($imagesArray);
            }
            
            if (!empty($updateFields)) {
                $updateSql = "UPDATE products SET " . implode(', ', $updateFields) . " WHERE id = :id";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute($updateParams);
                
                echo "✓ OK\n";
                $updated++;
            } else {
                echo "✗ Aucune colonne d'image trouvée\n";
                $errors++;
            }
        } else {
            echo "✗ Échec du téléchargement\n";
            $errors++;
        }
        
        // Petite pause pour éviter de surcharger les serveurs
        usleep(500000); // 0.5 seconde
    }
    
    echo "\n=== Résumé ===\n";
    echo "Produits mis à jour: {$updated}\n";
    echo "Produits ignorés (déjà avec image): {$skipped}\n";
    echo "Erreurs: {$errors}\n";
    echo "\nTerminé!\n";
    
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
?>
