<?php
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDatabaseConnection();
    
    // Vérifier si les tables existent
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    // Créer la table des likes si elle n'existe pas
    if (!in_array('menu_likes', $tables)) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS menu_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                menu_item_id INT NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                user_type ENUM('customer', 'guest', 'driver', 'admin') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_like (menu_item_id, user_id, user_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }
    
    // Créer la table menu_items si elle n'existe pas
    if (!in_array('menu_items', $tables)) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                image_url VARCHAR(500),
                is_available BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Insérer quelques données de test
        $pdo->exec("
            INSERT INTO menu_items (name, description, price, category, is_available, is_featured) VALUES
            ('Thieboudienne', 'Plat traditionnel sénégalais', 8000.00, 'Plat principal', TRUE, TRUE),
            ('Yassa Poulet', 'Poulet mariné aux oignons', 7500.00, 'Plat principal', TRUE, FALSE),
            ('Mafé', 'Sauce arachide béninoise', 6500.00, 'Plat principal', TRUE, TRUE)
        ");
    }
    
    switch ($action) {
        case 'featured':
            handleFeatured($pdo);
            break;
        case 'like':
        case 'unlike':
            handleLike($pdo, $action);
            break;
        case 'update_featured':
            handleUpdateFeatured($pdo);
            break;
        case 'check_like':
            handleCheckLike($pdo);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur serveur', 
        'debug' => $e->getMessage()
    ]);
}

function handleFeatured($pdo) {
    $userId = $_GET['user_id'] ?? 'guest';
    $userType = $_GET['user_type'] ?? 'guest';
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE is_featured = TRUE ORDER BY created_at DESC LIMIT 10");
        $stmt->execute();
        $featuredItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $featuredItems
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Erreur lors du chargement des vedettes',
            'debug' => $e->getMessage()
        ]);
    }
}

function handleLike($pdo, $action) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['menu_item_id']) || !isset($data['user_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données incomplètes']);
        return;
    }
    
    $menuItemId = $data['menu_item_id'];
    $userId = $data['user_id'];
    $userType = $data['user_type'] ?? 'customer';
    
    try {
        if ($action === 'like') {
            // Insérer le like
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO menu_likes (menu_item_id, user_id, user_type) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$menuItemId, $userId, $userType]);
            
            $message = 'Plat liké avec succès';
        } else {
            // Supprimer le like
            $stmt = $pdo->prepare("
                DELETE FROM menu_likes 
                WHERE menu_item_id = ? AND user_id = ? AND user_type = ?
            ");
            $stmt->execute([$menuItemId, $userId, $userType]);
            
            $message = 'Like retiré avec succès';
        }
        
        // Compter les likes
        $stmt = $pdo->prepare("SELECT COUNT(*) as likes_count FROM menu_likes WHERE menu_item_id = ?");
        $stmt->execute([$menuItemId]);
        $likesCount = $stmt->fetch(PDO::FETCH_ASSOC)['likes_count'];
        
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => ['likes_count' => $likesCount]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Erreur lors du traitement du like',
            'debug' => $e->getMessage()
        ]);
    }
}

function handleUpdateFeatured($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['menu_item_id']) || !isset($data['is_featured'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données incomplètes']);
        return;
    }
    
    $menuItemId = $data['menu_item_id'];
    $isFeatured = $data['is_featured'];
    
    try {
        $stmt = $pdo->prepare("
            UPDATE menu_items 
            SET is_featured = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $stmt->execute([$isFeatured, $menuItemId]);
        
        echo json_encode([
            'success' => true,
            'message' => $isFeatured ? 'Plat ajouté aux vedettes' : 'Plat retiré des vedettes'
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour',
            'debug' => $e->getMessage()
        ]);
    }
}

function handleCheckLike($pdo) {
    $menuItemId = $_GET['menu_item_id'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $userType = $_GET['user_type'] ?? 'customer';
    
    if (!$menuItemId || !$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Paramètres manquants']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as is_liked FROM menu_likes 
            WHERE menu_item_id = ? AND user_id = ? AND user_type = ?
        ");
        $stmt->execute([$menuItemId, $userId, $userType]);
        $isLiked = $stmt->fetch(PDO::FETCH_ASSOC)['is_liked'] > 0;
        
        // Compter les likes totaux
        $stmt = $pdo->prepare("SELECT COUNT(*) as likes_count FROM menu_likes WHERE menu_item_id = ?");
        $stmt->execute([$menuItemId]);
        $likesCount = $stmt->fetch(PDO::FETCH_ASSOC)['likes_count'];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'is_liked' => $isLiked,
                'likes_count' => $likesCount
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Erreur lors de la vérification',
            'debug' => $e->getMessage()
        ]);
    }
}
?>
    }
    
    // Ajouter la colonne likes_count à menu_items si elle n'existe pas
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
                is_featured BOOLEAN DEFAULT FALSE,
                likes_count INT DEFAULT 0,
                preparation_time INT DEFAULT 15,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    } else {
        // Vérifier si la colonne likes_count existe
        $columns = getTableColumns($pdo, 'menu_items');
        if (!in_array('likes_count', $columns)) {
            $pdo->exec("ALTER TABLE menu_items ADD COLUMN likes_count INT DEFAULT 0");
        }
        
        // Vérifier si la colonne is_featured existe
        if (!in_array('is_featured', $columns)) {
            $pdo->exec("ALTER TABLE menu_items ADD COLUMN is_featured BOOLEAN DEFAULT FALSE");
        }
    }
    
    switch ($action) {
        case 'like':
            // Ajouter un like à un menu
            $menuItemId = $_POST['menu_item_id'] ?? 0;
            $userId = $_POST['user_id'] ?? session_id();
            $userType = $_POST['user_type'] ?? 'customer';
            
            if (!$menuItemId) {
                echo json_encode(['success' => false, 'message' => 'ID du menu requis']);
                exit;
            }
            
            try {
                $pdo->beginTransaction();
                
                // Insérer le like
                $stmt = $pdo->prepare("
                    INSERT INTO menu_likes (menu_item_id, user_id, user_type) 
                    VALUES (:menu_item_id, :user_id, :user_type)
                ");
                $stmt->execute([
                    ':menu_item_id' => $menuItemId,
                    ':user_id' => $userId,
                    ':user_type' => $userType
                ]);
                
                // Mettre à jour le compteur de likes
                $updateStmt = $pdo->prepare("
                    UPDATE menu_items 
                    SET likes_count = likes_count + 1 
                    WHERE id = :id
                ");
                $updateStmt->execute([':id' => $menuItemId]);
                
                $pdo->commit();
                
                // Récupérer le nouveau nombre de likes
                $countStmt = $pdo->prepare("SELECT likes_count FROM menu_items WHERE id = :id");
                $countStmt->execute([':id' => $menuItemId]);
                $likesCount = $countStmt->fetchColumn();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Like ajouté avec succès',
                    'data' => [
                        'likes_count' => $likesCount,
                        'is_liked' => true
                    ]
                ]);
                
            } catch (PDOException $e) {
                $pdo->rollBack();
                
                if ($e->getCode() == 23000) { // Duplicate entry
                    echo json_encode(['success' => false, 'message' => 'Vous avez déjà aimé ce menu']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Erreur lors du like']);
                }
            }
            break;
            
        case 'unlike':
            // Supprimer un like d'un menu
            $menuItemId = $_POST['menu_item_id'] ?? 0;
            $userId = $_POST['user_id'] ?? session_id();
            $userType = $_POST['user_type'] ?? 'customer';
            
            if (!$menuItemId) {
                echo json_encode(['success' => false, 'message' => 'ID du menu requis']);
                exit;
            }
            
            try {
                $pdo->beginTransaction();
                
                // Supprimer le like
                $stmt = $pdo->prepare("
                    DELETE FROM menu_likes 
                    WHERE menu_item_id = :menu_item_id AND user_id = :user_id AND user_type = :user_type
                ");
                $result = $stmt->execute([
                    ':menu_item_id' => $menuItemId,
                    ':user_id' => $userId,
                    ':user_type' => $userType
                ]);
                
                if ($result > 0) {
                    // Mettre à jour le compteur de likes
                    $updateStmt = $pdo->prepare("
                        UPDATE menu_items 
                        SET likes_count = GREATEST(likes_count - 1, 0) 
                        WHERE id = :id
                    ");
                    $updateStmt->execute([':id' => $menuItemId]);
                }
                
                $pdo->commit();
                
                // Récupérer le nouveau nombre de likes
                $countStmt = $pdo->prepare("SELECT likes_count FROM menu_items WHERE id = :id");
                $countStmt->execute([':id' => $menuItemId]);
                $likesCount = $countStmt->fetchColumn();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Like supprimé avec succès',
                    'data' => [
                        'likes_count' => $likesCount,
                        'is_liked' => false
                    ]
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression du like']);
            }
            break;
            
        case 'check_like':
            // Vérifier si l'utilisateur a aimé un menu
            $menuItemId = $_GET['menu_item_id'] ?? 0;
            $userId = $_GET['user_id'] ?? session_id();
            $userType = $_GET['user_type'] ?? 'customer';
            
            if (!$menuItemId) {
                echo json_encode(['success' => false, 'message' => 'ID du menu requis']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as is_liked 
                FROM menu_likes 
                WHERE menu_item_id = :menu_item_id AND user_id = :user_id AND user_type = :user_type
            ");
            $stmt->execute([
                ':menu_item_id' => $menuItemId,
                ':user_id' => $userId,
                ':user_type' => $userType
            ]);
            $isLiked = $stmt->fetch()['is_liked'] > 0;
            
            echo json_encode([
                'success' => true,
                'data' => ['is_liked' => $isLiked]
            ]);
            break;
            
        case 'featured':
            // Récupérer les menus en vedette (basé sur les likes)
            $limit = $_GET['limit'] ?? 6;
            
            $stmt = $pdo->prepare("
                SELECT id, name, description, price, category, image_url, video_url, video_type, 
                       likes_count, is_featured, preparation_time
                FROM menu_items 
                WHERE is_available = TRUE 
                ORDER BY likes_count DESC, is_featured DESC 
                LIMIT :limit
            ");
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            $featuredItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Ajouter les informations de like pour l'utilisateur actuel
            $userId = $_GET['user_id'] ?? session_id();
            $userType = $_GET['user_type'] ?? 'customer';
            
            foreach ($featuredItems as &$item) {
                $likeStmt = $pdo->prepare("
                    SELECT COUNT(*) as is_liked 
                    FROM menu_likes 
                    WHERE menu_item_id = :menu_item_id AND user_id = :user_id AND user_type = :user_type
                ");
                $likeStmt->execute([
                    ':menu_item_id' => $item['id'],
                    ':user_id' => $userId,
                    ':user_type' => $userType
                ]);
                $item['is_liked'] = $likeStmt->fetch()['is_liked'] > 0;
                
                // Déterminer le type de média
                $item['has_video'] = !empty($item['video_url']);
                $item['media_type'] = $item['has_video'] ? 'video' : 'image';
            }
            
            echo json_encode([
                'success' => true,
                'data' => $featuredItems
            ]);
            break;
            
        case 'update_featured':
            // Mettre à jour les produits en vedette (admin seulement)
            if (!isAdmin()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
                exit;
            }
            
            $menuItemId = $_POST['menu_item_id'] ?? 0;
            $isFeatured = $_POST['is_featured'] ?? false;
            
            if (!$menuItemId) {
                echo json_encode(['success' => false, 'message' => 'ID du menu requis']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                UPDATE menu_items 
                SET is_featured = :is_featured 
                WHERE id = :id
            ");
            $result = $stmt->execute([
                ':is_featured' => $isFeatured,
                ':id' => $menuItemId
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => $isFeatured ? 'Produit ajouté en vedette' : 'Produit retiré des vedettes'
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour']);
            }
            break;
            
        case 'stats':
            // Statistiques des likes (admin seulement)
            if (!isAdmin()) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
                exit;
            }
            
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total_likes,
                    COUNT(DISTINCT menu_item_id) as liked_items,
                    COUNT(DISTINCT user_id) as unique_users
                FROM menu_likes
            ");
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Top items
            $topStmt = $pdo->query("
                SELECT mi.name, mi.likes_count, mi.category
                FROM menu_items mi
                WHERE mi.likes_count > 0
                ORDER BY mi.likes_count DESC
                LIMIT 10
            ");
            $topItems = $topStmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'top_items' => $topItems
                ]
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

function isAdmin() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    if (!$token) return false;
    
    $token = str_replace('Bearer ', '', $token);
    return $token === 'admin_token_123';
}
?>
