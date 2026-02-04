<?php
/**
 * Proxy d'images intelligent
 * Gère toutes les images manquantes et retourne une image par défaut
 */

// Configuration
$BASE_PATH = '/titi-golden-taste';
$DEFAULT_IMAGE = $BASE_PATH . '/assets/images/default.jpg';

// Fonction pour vérifier si un fichier image existe
function imageExists($path) {
    // Vérifier si le chemin est complet ou relatif
    $fullPath = $_SERVER['DOCUMENT_ROOT'] . $path;
    
    // Si le chemin commence par /titi-golden-taste/, ajuster
    if (strpos($path, '/titi-golden-taste/') === 0) {
        $fullPath = $_SERVER['DOCUMENT_ROOT'] . $path;
    } 
    // Si c'est un chemin relatif à assets/
    elseif (strpos($path, '/assets/') === 0) {
        $fullPath = $_SERVER['DOCUMENT_ROOT'] . '/titi-golden-taste' . $path;
    }
    // Si c'est un chemin local (commence par assets/)
    elseif (strpos($path, 'assets/') === 0) {
        $fullPath = $_SERVER['DOCUMENT_ROOT'] . '/titi-golden-taste/' . $path;
    }
    
    return file_exists($fullPath) && is_file($fullPath);
}

// Fonction pour servir une image
function serveImage($imagePath, $defaultPath) {
    // Nettoyer le chemin
    $cleanPath = str_replace(['..', '//'], '', $imagePath);
    
    // Vérifier d'abord l'image demandée
    if (imageExists($cleanPath)) {
        $finalPath = $_SERVER['DOCUMENT_ROOT'] . $cleanPath;
    } 
    // Vérifier avec /titi-golden-taste/ ajouté
    elseif (strpos($cleanPath, '/titi-golden-taste/') !== 0) {
        $adjustedPath = '/titi-golden-taste' . (strpos($cleanPath, '/') === 0 ? '' : '/') . $cleanPath;
        if (imageExists($adjustedPath)) {
            $finalPath = $_SERVER['DOCUMENT_ROOT'] . $adjustedPath;
        } else {
            $finalPath = $_SERVER['DOCUMENT_ROOT'] . $defaultPath;
        }
    } else {
        $finalPath = $_SERVER['DOCUMENT_ROOT'] . $defaultPath;
    }
    
    // Déterminer le type MIME
    $extension = strtolower(pathinfo($finalPath, PATHINFO_EXTENSION));
    switch($extension) {
        case 'jpg':
        case 'jpeg':
            header('Content-Type: image/jpeg');
            break;
        case 'png':
            header('Content-Type: image/png');
            break;
        case 'gif':
            header('Content-Type: image/gif');
            break;
        case 'webp':
            header('Content-Type: image/webp');
            break;
        default:
            header('Content-Type: image/jpeg');
    }
    
    // Servir l'image
    readfile($finalPath);
    exit;
}

// Obtenir l'image demandée
$requestedImage = isset($_GET['img']) ? $_GET['img'] : '';

// Si aucune image demandée, servir l'image par défaut
if (empty($requestedImage)) {
    serveImage($DEFAULT_IMAGE, $DEFAULT_IMAGE);
}

// Servir l'image demandée ou l'image par défaut
serveImage($requestedImage, $DEFAULT_IMAGE);
?>