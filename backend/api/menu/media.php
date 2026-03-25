<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table menu_items existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('menu_items', $tables)) {
        echo json_encode(['success' => false, 'message' => 'Table menu_items non trouvée']);
        exit;
    }
    
    switch ($action) {
        case 'list':
            // Lister tous les items avec gestion des images
            $stmt = $pdo->query("
                SELECT id, name, description, price, category, image_url, video_url, video_type,
                       is_available, is_featured, likes_count, preparation_time
                FROM menu_items 
                WHERE is_available = TRUE 
                ORDER BY is_featured DESC, likes_count DESC, name ASC
            ");
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Ajouter les informations de média
            foreach ($items as &$item) {
                $item['has_image'] = !empty($item['image_url']);
                $item['has_video'] = !empty($item['video_url']);
                $item['media_type'] = $item['has_video'] ? 'video' : 'image';
                
                // Normaliser les URLs
                if ($item['has_image'] && !preg_match('/^https?:\/\//', $item['image_url'])) {
                    $item['image_url'] = './assets/images/' . basename($item['image_url']);
                }
                
                if ($item['has_video'] && !preg_match('/^https?:\/\//', $item['video_url'])) {
                    $item['video_url'] = './assets/videos/' . basename($item['video_url']);
                }
            }
            
            echo json_encode(['success' => true, 'data' => $items]);
            break;
            
        case 'update_media':
            // Mettre à jour l'image ou la vidéo d'un item
            $itemId = $_POST['item_id'] ?? 0;
            $mediaType = $_POST['media_type'] ?? 'image'; // 'image' ou 'video'
            $mediaUrl = $_POST['media_url'] ?? '';
            
            if (!$itemId) {
                echo json_encode(['success' => false, 'message' => 'ID de l\'item requis']);
                exit;
            }
            
            // Gérer l'upload de fichier
            if (isset($_FILES['media_file']) && $_FILES['media_file']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../../assets/' . ($mediaType === 'video' ? 'videos' : 'images') . '/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $fileName = 'menu_' . $itemId . '_' . time() . '.' . pathinfo($_FILES['media_file']['name'], PATHINFO_EXTENSION);
                $uploadPath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['media_file']['tmp_name'], $uploadPath)) {
                    $mediaUrl = './assets/' . ($mediaType === 'video' ? 'videos' : 'images') . '/' . $fileName;
                } else {
                    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'upload']);
                    exit;
                }
            } elseif (!empty($mediaUrl)) {
                // Valider l'URL externe
                if (!filter_var($mediaUrl, FILTER_VALIDATE_URL)) {
                    echo json_encode(['success' => false, 'message' => 'URL invalide']);
                    exit;
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'URL ou fichier requis']);
                exit;
            }
            
            // Mettre à jour la base de données
            if ($mediaType === 'video') {
                $stmt = $pdo->prepare("
                    UPDATE menu_items 
                    SET video_url = :media_url, updated_at = NOW()
                    WHERE id = :id
                ");
            } else {
                $stmt = $pdo->prepare("
                    UPDATE menu_items 
                    SET image_url = :media_url, updated_at = NOW()
                    WHERE id = :id
                ");
            }
            
            $result = $stmt->execute([
                ':media_url' => $mediaUrl,
                ':id' => $itemId
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Média mis à jour avec succès',
                    'data' => [
                        'media_url' => $mediaUrl,
                        'media_type' => $mediaType
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour']);
            }
            break;
            
        case 'remove_media':
            // Supprimer l'image ou la vidéo d'un item
            $itemId = $_POST['item_id'] ?? 0;
            $mediaType = $_POST['media_type'] ?? 'image';
            
            if (!$itemId) {
                echo json_encode(['success' => false, 'message' => 'ID de l\'item requis']);
                exit;
            }
            
            // Récupérer l'URL actuelle pour supprimer le fichier
            $stmt = $pdo->prepare("
                SELECT " . ($mediaType === 'video' ? 'video_url' : 'image_url') . " as media_url
                FROM menu_items 
                WHERE id = :id
            ");
            $stmt->execute([':id' => $itemId]);
            $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($currentItem && !empty($currentItem['media_url'])) {
                // Supprimer le fichier s'il est local
                if (!preg_match('/^https?:\/\//', $currentItem['media_url'])) {
                    $filePath = __DIR__ . '/../../../' . ltrim($currentItem['media_url'], './');
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }
            }
            
            // Mettre à jour la base de données
            $stmt = $pdo->prepare("
                UPDATE menu_items 
                SET " . ($mediaType === 'video' ? 'video_url' : 'image_url') . " = NULL, updated_at = NOW()
                WHERE id = :id
            ");
            $result = $stmt->execute([':id' => $itemId]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Média supprimé avec succès'
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression']);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur serveur',
        'debug' => $e->getMessage()
    ]);
}
?>
