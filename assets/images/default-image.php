<?php
/**
 * Création d'une image par défaut pour éviter les erreurs 404
 */

// Créer une image par défaut simple (1x1 pixel transparent)
header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=31536000'); // Cache pour 1 an

// Créer une image simple 1x1 pixel
$img = imagecreatetruecolor(1, 1);
$color = imagecolorallocate($img, 240, 240, 240); // Gris clair
imagefill($img, 0, 0, $color);

// Afficher l'image
imagejpeg($img, null, 90);

// Libérer la mémoire
imagedestroy($img);
?>
