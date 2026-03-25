<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');

$action = $_GET['action'] ?? '';

try {
    $pdo = getDatabaseConnection();
    
    // Créer la table de synchronisation sociale si elle n'existe pas
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('social_sync', $tables)) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS social_sync (
                id INT AUTO_INCREMENT PRIMARY KEY,
                platform ENUM('tiktok', 'whatsapp', 'instagram', 'facebook') NOT NULL,
                content_type ENUM('live', 'video', 'product', 'promotion') NOT NULL,
                content_id INT,
                title VARCHAR(255),
                description TEXT,
                media_url VARCHAR(500),
                external_url VARCHAR(500),
                status ENUM('pending', 'posted', 'failed') DEFAULT 'pending',
                posted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }
    
    switch ($action) {
        case 'tiktok_share':
            // Partager du contenu sur TikTok
            $contentType = $_POST['content_type'] ?? 'video';
            $contentId = $_POST['content_id'] ?? 0;
            $title = $_POST['title'] ?? '';
            $description = $_POST['description'] ?? '';
            $mediaUrl = $_POST['media_url'] ?? '';
            
            // Créer le contenu TikTok
            $tiktokContent = createTikTokContent($title, $description, $mediaUrl, $contentType);
            
            // Sauvegarder dans la base
            $stmt = $pdo->prepare("
                INSERT INTO social_sync (platform, content_type, content_id, title, description, media_url, status)
                VALUES ('tiktok', :content_type, :content_id, :title, :description, :media_url, 'pending')
            ");
            $stmt->execute([
                ':content_type' => $contentType,
                ':content_id' => $contentId,
                ':title' => $title,
                ':description' => $description,
                ':media_url' => $mediaUrl
            ]);
            
            $syncId = $pdo->lastInsertId();
            
            // Simuler l'API TikTok (remplacer par vraie intégration)
            $tiktokResult = simulateTikTokAPI($tiktokContent);
            
            if ($tiktokResult['success']) {
                // Mettre à jour le statut
                $updateStmt = $pdo->prepare("
                    UPDATE social_sync 
                    SET status = 'posted', posted_at = NOW(), external_url = :external_url
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':external_url' => $tiktokResult['url'],
                    ':id' => $syncId
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Contenu partagé sur TikTok avec succès',
                    'data' => [
                        'tiktok_url' => $tiktokResult['url'],
                        'sync_id' => $syncId
                    ]
                ]);
            } else {
                // Marquer comme échoué
                $updateStmt = $pdo->prepare("
                    UPDATE social_sync 
                    SET status = 'failed'
                    WHERE id = :id
                ");
                $updateStmt->execute([':id' => $syncId]);
                
                echo json_encode([
                    'success' => false,
                    'message' => 'Échec du partage sur TikTok: ' . $tiktokResult['error']
                ]);
            }
            break;
            
        case 'whatsapp_share':
            // Partager du contenu sur WhatsApp
            $contentType = $_POST['content_type'] ?? 'product';
            $contentId = $_POST['content_id'] ?? 0;
            $title = $_POST['title'] ?? '';
            $description = $_POST['description'] ?? '';
            $price = $_POST['price'] ?? 0;
            
            // Créer le message WhatsApp
            $whatsappMessage = createWhatsAppMessage($title, $description, $price, $contentType);
            
            // Générer le lien WhatsApp
            $whatsappUrl = "https://wa.me/?text=" . urlencode($whatsappMessage);
            
            // Sauvegarder dans la base
            $stmt = $pdo->prepare("
                INSERT INTO social_sync (platform, content_type, content_id, title, description, external_url, status)
                VALUES ('whatsapp', :content_type, :content_id, :title, :description, :external_url, 'posted')
            ");
            $stmt->execute([
                ':content_type' => $contentType,
                ':content_id' => $contentId,
                ':title' => $title,
                ':description' => $description,
                ':external_url' => $whatsappUrl
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Message WhatsApp préparé',
                'data' => [
                    'whatsapp_url' => $whatsappUrl,
                    'message' => $whatsappMessage
                ]
            ]);
            break;
            
        case 'sync_status':
            // Obtenir le statut de synchronisation
            $contentId = $_GET['content_id'] ?? 0;
            $platform = $_GET['platform'] ?? '';
            
            $query = "SELECT * FROM social_sync WHERE 1=1";
            $params = [];
            
            if ($contentId) {
                $query .= " AND content_id = :content_id";
                $params[':content_id'] = $contentId;
            }
            
            if ($platform) {
                $query .= " AND platform = :platform";
                $params[':platform'] = $platform;
            }
            
            $query .= " ORDER BY created_at DESC LIMIT 20";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $syncs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $syncs
            ]);
            break;
            
        case 'batch_sync':
            // Synchronisation en lot pour plusieurs contenus
            $contents = json_decode($_POST['contents'] ?? '[]', true);
            $platform = $_POST['platform'] ?? 'tiktok';
            
            $results = [];
            
            foreach ($contents as $content) {
                $result = [
                    'content_id' => $content['id'],
                    'success' => false,
                    'message' => ''
                ];
                
                try {
                    if ($platform === 'tiktok') {
                        $tiktokContent = createTikTokContent(
                            $content['title'] ?? '',
                            $content['description'] ?? '',
                            $content['media_url'] ?? '',
                            $content['type'] ?? 'video'
                        );
                        
                        $tiktokResult = simulateTikTokAPI($tiktokContent);
                        $result['success'] = $tiktokResult['success'];
                        $result['message'] = $tiktokResult['success'] ? 'Partagé avec succès' : $tiktokResult['error'];
                        
                    } elseif ($platform === 'whatsapp') {
                        $whatsappMessage = createWhatsAppMessage(
                            $content['title'] ?? '',
                            $content['description'] ?? '',
                            $content['price'] ?? 0,
                            $content['type'] ?? 'product'
                        );
                        
                        $result['success'] = true;
                        $result['message'] = 'Message préparé';
                        $result['whatsapp_url'] = "https://wa.me/?text=" . urlencode($whatsappMessage);
                    }
                } catch (Exception $e) {
                    $result['message'] = $e->getMessage();
                }
                
                $results[] = $result;
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Synchronisation en lot terminée',
                'data' => $results
            ]);
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

// Fonctions utilitaires

function createTikTokContent($title, $description, $mediaUrl, $contentType) {
    $hashtags = "#TitiGoldenTaste #CuisineMali #Bamako #RestaurantMali #FoodMali";
    
    if ($contentType === 'live') {
        return [
            'title' => "🔴 LIVE MAINTENANT ! $title",
            'description' => "$description\n\nRejoignez notre live en direct !\n\n$hashtags",
            'video_url' => $mediaUrl,
            'type' => 'live'
        ];
    } elseif ($contentType === 'product') {
        return [
            'title' => "🍽️ NOUVEAU: $title",
            'description' => "$description\n\nDécouvrez ce délice chez Titi Golden Taste !\n\n$hashtags",
            'video_url' => $mediaUrl,
            'type' => 'product'
        ];
    } else {
        return [
            'title' => $title,
            'description' => "$description\n\n$hashtags",
            'video_url' => $mediaUrl,
            'type' => 'video'
        ];
    }
}

function createWhatsAppMessage($title, $description, $price, $contentType) {
    $message = "";
    
    if ($contentType === 'live') {
        $message = "🔴 *LIVE EN DIRECT* 🍽️\n\n";
        $message .= "*$title*\n\n";
        $message .= "$description\n\n";
        $message .= "📍 Titi Golden Taste - Bamako\n";
        $message .= "⏰ Maintenant !\n\n";
        $message .= "👉 Rejoignez-nous !\n\n";
    } elseif ($contentType === 'product') {
        $message = "🍽️ *Nouveau Plat Disponible* !\n\n";
        $message .= "*$title*\n\n";
        $message .= "$description\n\n";
        $message .= "💰 Prix: $price FCFA\n\n";
        $message .= "📍 Titi Golden Taste - Bamako\n\n";
        $message .= "🛵 Livraison à domicile disponible\n\n";
        $message .= "👉 Commandez maintenant !\n\n";
    } else {
        $message = "🍽️ *Titi Golden Taste*\n\n";
        $message .= "*$title*\n\n";
        $message .= "$description\n\n";
        $message .= "📍 Bamako, Mali\n\n";
    }
    
    $message .= "📞 +223 20 21 22 23\n";
    $message .= "🌐 www.titi-golden-taste.com\n\n";
    $message .= "#TitiGoldenTaste #CuisineMali #Bamako";
    
    return $message;
}

function simulateTikTokAPI($content) {
    // Simuler l'API TikTok (remplacer par vraie intégration)
    // Dans une vraie implémentation, utiliser l'API TikTok Business
    
    try {
        // Simuler un délai de traitement
        usleep(500000); // 0.5 seconde
        
        // Simuler une réponse réussie
        $videoId = 'tiktok_' . uniqid();
        $url = "https://www.tiktok.com/@titi_golden_taste/video/$videoId";
        
        return [
            'success' => true,
            'url' => $url,
            'video_id' => $videoId,
            'views' => rand(100, 1000)
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}
?>
