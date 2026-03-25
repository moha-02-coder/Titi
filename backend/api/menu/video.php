<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si la table menu_items existe (pour les vidéos)
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('menu_items', $tables)) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) DEFAULT 0,
                category VARCHAR(100),
                image_url VARCHAR(500),
                video_url VARCHAR(500),
                video_type ENUM('upload', 'youtube', 'vimeo', 'tiktok') DEFAULT 'upload',
                is_available BOOLEAN DEFAULT TRUE,
                preparation_time INT DEFAULT 15,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }
    
    switch ($action) {
        case 'upload_video':
            // Upload de vidéo pour un plat
            $itemId = $_POST['item_id'] ?? 0;
            $videoType = $_POST['video_type'] ?? 'upload';
            
            if (!$itemId) {
                echo json_encode(['success' => false, 'message' => 'ID du plat requis']);
                exit;
            }
            
            $videoUrl = '';
            
            if ($videoType === 'upload') {
                // Gérer l'upload de fichier vidéo
                if (isset($_FILES['video']) && $_FILES['video']['error'] === UPLOAD_ERR_OK) {
                    $uploadDir = __DIR__ . '/../../../assets/videos/';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }
                    
                    $fileName = 'video_' . $itemId . '_' . time() . '.mp4';
                    $uploadPath = $uploadDir . $fileName;
                    
                    if (move_uploaded_file($_FILES['video']['tmp_name'], $uploadPath)) {
                        $videoUrl = '/assets/videos/' . $fileName;
                    } else {
                        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'upload de la vidéo']);
                        exit;
                    }
                } else {
                    echo json_encode(['success' => false, 'message' => 'Aucun fichier vidéo reçu']);
                    exit;
                }
            } else {
                // URL de vidéo externe (YouTube, Vimeo, TikTok)
                $videoUrl = $_POST['video_url'] ?? '';
                if (!$videoUrl) {
                    echo json_encode(['success' => false, 'message' => 'URL de la vidéo requise']);
                    exit;
                }
                
                // Valider et formater l'URL selon le type
                if ($videoType === 'youtube') {
                    // Extraire l'ID YouTube
                    preg_match('/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([^&\\n?#]+)/', $videoUrl, $matches);
                    if (isset($matches[1])) {
                        $videoUrl = 'https://www.youtube.com/embed/' . $matches[1];
                    }
                } elseif ($videoType === 'vimeo') {
                    // Extraire l'ID Vimeo
                    preg_match('/vimeo\\.com\\/(?:.*#)?(\\d+)/', $videoUrl, $matches);
                    if (isset($matches[1])) {
                        $videoUrl = 'https://player.vimeo.com/video/' . $matches[1];
                    }
                } elseif ($videoType === 'tiktok') {
                    // Formater l'URL TikTok pour l'embed
                    if (strpos($videoUrl, 'tiktok.com') !== false) {
                        $videoUrl = str_replace('www.tiktok.com', 'www.tiktok.com/embed', $videoUrl);
                    }
                }
            }
            
            // Mettre à jour le plat avec la vidéo
            $stmt = $pdo->prepare("
                UPDATE menu_items 
                SET video_url = :video_url, video_type = :video_type, updated_at = NOW()
                WHERE id = :id
            ");
            $result = $stmt->execute([
                ':video_url' => $videoUrl,
                ':video_type' => $videoType,
                ':id' => $itemId
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Vidéo ajoutée avec succès',
                    'data' => [
                        'video_url' => $videoUrl,
                        'video_type' => $videoType
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour']);
            }
            break;
            
        case 'get_with_video':
            // Récupérer les plats avec leurs vidéos
            $stmt = $pdo->query("
                SELECT id, name, description, price, category, image_url, 
                       video_url, video_type, is_available, preparation_time
                FROM menu_items 
                WHERE is_available = TRUE 
                ORDER BY name ASC
            ");
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Formater les URLs des vidéos pour l'affichage
            foreach ($items as &$item) {
                if ($item['video_url']) {
                    $item['embed_url'] = $item['video_url'];
                    $item['has_video'] = true;
                } else {
                    $item['has_video'] = false;
                }
            }
            
            echo json_encode(['success' => true, 'data' => $items]);
            break;
            
        case 'delete_video':
            // Supprimer la vidéo d'un plat
            $itemId = $_POST['item_id'] ?? 0;
            
            if (!$itemId) {
                echo json_encode(['success' => false, 'message' => 'ID du plat requis']);
                exit;
            }
            
            // Récupérer l'URL de la vidéo actuelle
            $stmt = $pdo->prepare("SELECT video_url, video_type FROM menu_items WHERE id = :id");
            $stmt->execute([':id' => $itemId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($item && $item['video_url'] && $item['video_type'] === 'upload') {
                // Supprimer le fichier vidéo
                $videoPath = __DIR__ . '/../../../' . ltrim($item['video_url'], '/');
                if (file_exists($videoPath)) {
                    unlink($videoPath);
                }
            }
            
            // Mettre à jour la base de données
            $stmt = $pdo->prepare("
                UPDATE menu_items 
                SET video_url = NULL, video_type = NULL, updated_at = NOW()
                WHERE id = :id
            ");
            $result = $stmt->execute([':id' => $itemId]);
            
            if ($result) {
                echo json_encode(['success' => true, 'message' => 'Vidéo supprimée avec succès']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression']);
            }
            break;
            
        case 'sync_tiktok':
            // Synchroniser avec TikTok (simulation)
            $itemId = $_POST['item_id'] ?? 0;
            $tiktokUrl = $_POST['tiktok_url'] ?? '';
            
            if (!$itemId || !$tiktokUrl) {
                echo json_encode(['success' => false, 'message' => 'ID du plat et URL TikTok requis']);
                exit;
            }
            
            // Extraire et formater l'URL TikTok
            if (strpos($tiktokUrl, 'tiktok.com') !== false) {
                $embedUrl = str_replace('www.tiktok.com', 'www.tiktok.com/embed', $tiktokUrl);
                
                // Mettre à jour avec l'URL TikTok
                $stmt = $pdo->prepare("
                    UPDATE menu_items 
                    SET video_url = :video_url, video_type = 'tiktok', updated_at = NOW()
                    WHERE id = :id
                ");
                $result = $stmt->execute([
                    ':video_url' => $embedUrl,
                    ':id' => $itemId
                ]);
                
                if ($result) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Synchronisation TikTok réussie',
                        'data' => ['embed_url' => $embedUrl]
                    ]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Erreur lors de la synchronisation']);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'URL TikTok invalide']);
            }
            break;
            
        case 'sync_whatsapp':
            // Partager sur WhatsApp
            $itemId = $_POST['item_id'] ?? 0;
            
            if (!$itemId) {
                echo json_encode(['success' => false, 'message' => 'ID du plat requis']);
                exit;
            }
            
            // Récupérer les détails du plat
            $stmt = $pdo->prepare("SELECT name, description, price FROM menu_items WHERE id = :id");
            $stmt->execute([':id' => $itemId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($item) {
                $message = "🍽️ *Nouveau plat disponible !*\n\n";
                $message .= "*{$item['name']}*\n";
                $message .= "{$item['description']}\n\n";
                $message .= "💰 Prix: {$item['price']} FCFA\n";
                $message .= "📍 Titi Golden Taste - Bamako\n\n";
                $message .= "Commandez maintenant !\n";
                $message .= window.location.href;
                
                $whatsappUrl = "https://wa.me/?text=" . urlencode($message);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Message WhatsApp préparé',
                    'data' => [
                        'whatsapp_url' => $whatsappUrl,
                        'message' => $message
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Plat non trouvé']);
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
