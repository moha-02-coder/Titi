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

// Support JSON bodies (application/json) in addition to regular form POST
$contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if (is_string($contentType) && stripos($contentType, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    if (is_string($raw) && trim($raw) !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            foreach ($decoded as $k => $v) {
                if (!isset($_POST[$k])) {
                    $_POST[$k] = $v;
                }
            }
        }
    }
}

function extractBearerToken(): ?string {
    $h = function_exists('getallheaders') ? getallheaders() : [];
    $a = $h['Authorization'] ?? $h['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!$a) return null;
    if (strpos($a, 'Bearer ') === 0) return trim(substr($a, 7));
    return trim((string)$a);
}

function verifyJWTToken(string $token): array|false {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    [$h, $p, $s] = $parts;
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if (!hash_equals($expected, $s)) return false;
    $payload = json_decode((string)base64_decode($p), true);
    if (!is_array($payload)) return false;
    if (isset($payload['exp']) && time() > (int)$payload['exp']) return false;
    return $payload;
}

// Vérifier si l'utilisateur est admin (token JWT en base). Fallback dev: admin_token_123
function isAdmin(PDO $pdo): bool {
    $token = extractBearerToken();
    if (!$token) return false;

    if ($token === 'admin_token_123') return true;

    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) return false;

    $stmt = $pdo->prepare("SELECT id, role, active FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => (int)$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) return false;
    return in_array((string)($user['role'] ?? ''), ['admin', 'super_admin'], true);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDatabaseConnection();

    // Ensure lives table exists + migrate missing columns (for installations created by lives/list.php)
    $existingCols = [];
    try {
        $colsStmt = $pdo->query("SHOW COLUMNS FROM lives");
        while ($r = $colsStmt->fetch(PDO::FETCH_ASSOC)) {
            if (!empty($r['Field'])) $existingCols[] = (string)$r['Field'];
        }
    } catch (Exception $e) {
        // table may not exist yet
    }
    
    // Vérifier si la table lives existe
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch()) {
        $tables[] = array_values($row)[0];
    }
    
    if (!in_array('lives', $tables)) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS lives (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                stream_key VARCHAR(255) UNIQUE,
                stream_url VARCHAR(500),
                status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
                started_at TIMESTAMP NULL,
                ended_at TIMESTAMP NULL,
                viewers_count INT DEFAULT 0,
                max_viewers INT DEFAULT 0,
                duration_minutes INT DEFAULT 0,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Créer la table des notifications
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS live_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                live_id INT NOT NULL,
                user_type ENUM('customer', 'driver', 'admin') NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (live_id) REFERENCES lives(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $existingCols = ['id','title','description','stream_key','stream_url','status','started_at','ended_at','viewers_count','max_viewers','duration_minutes','created_by','created_at','updated_at'];
    }

    // Migrate older lives table missing new columns
    $needs = [
        'description' => "ALTER TABLE lives ADD COLUMN description TEXT NULL AFTER title",
        'stream_key' => "ALTER TABLE lives ADD COLUMN stream_key VARCHAR(255) NULL UNIQUE AFTER description",
        'stream_url' => "ALTER TABLE lives ADD COLUMN stream_url VARCHAR(500) NULL AFTER stream_key",
        'ended_at' => "ALTER TABLE lives ADD COLUMN ended_at TIMESTAMP NULL AFTER started_at",
        'max_viewers' => "ALTER TABLE lives ADD COLUMN max_viewers INT DEFAULT 0 AFTER viewers_count",
        'duration_minutes' => "ALTER TABLE lives ADD COLUMN duration_minutes INT DEFAULT 0 AFTER max_viewers",
        'created_by' => "ALTER TABLE lives ADD COLUMN created_by INT NULL AFTER duration_minutes",
    ];
    foreach ($needs as $col => $sql) {
        if (!in_array($col, $existingCols, true)) {
            try {
                $pdo->exec($sql);
            } catch (Exception $e) {
                // ignore: may fail if column exists due to race
            }
        }
    }
    
    switch ($action) {
        case 'start':
            if (!isAdmin($pdo)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
                exit;
            }
            
            $title = $_POST['title'] ?? 'Live Direct - Titi Golden Taste';
            $description = $_POST['description'] ?? 'Rejoignez notre live culinaire !';
            $externalStreamUrl = $_POST['stream_url'] ?? '';
            
            // Générer une clé de stream unique
            $streamKey = 'titi_' . uniqid() . '_' . time();
            $streamUrl = $externalStreamUrl ? (string)$externalStreamUrl : "rtmp://live.titi-golden-taste.com/live/$streamKey";
            
            $stmt = $pdo->prepare("
                INSERT INTO lives (title, description, stream_key, stream_url, status, started_at, created_by) 
                VALUES (:title, :description, :stream_key, :stream_url, 'live', NOW(), 1)
            ");
            $stmt->execute([
                ':title' => $title,
                ':description' => $description,
                ':stream_key' => $streamKey,
                ':stream_url' => $streamUrl
            ]);
            
            $liveId = $pdo->lastInsertId();
            
            // Créer les notifications pour les clients et livreurs
            $notificationStmt = $pdo->prepare("
                INSERT INTO live_notifications (live_id, user_type, message) 
                VALUES (:live_id, :user_type, :message)
            ");
            
            $notificationStmt->execute([
                ':live_id' => $liveId,
                ':user_type' => 'customer',
                ':message' => "🔴 Live en cours ! $title - Rejoignez-nous maintenant !"
            ]);
            
            $notificationStmt->execute([
                ':live_id' => $liveId,
                ':user_type' => 'driver',
                ':message' => "🔴 Live restaurant : $title - Informations importantes pour les livraisons"
            ]);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'live_id' => $liveId,
                    'stream_key' => $streamKey,
                    'stream_url' => $streamUrl,
                    'title' => $title,
                    'status' => 'live'
                ]
            ]);
            break;
            
        case 'end':
            if (!isAdmin($pdo)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Accès non autorisé']);
                exit;
            }
            
            $liveId = $_POST['live_id'] ?? 0;
            if (!$liveId) {
                echo json_encode(['success' => false, 'message' => 'ID du live requis']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                UPDATE lives 
                SET status = 'ended', ended_at = NOW(), 
                    duration_minutes = TIMESTAMPDIFF(MINUTE, started_at, NOW())
                WHERE id = :id AND status = 'live'
            ");
            $stmt->execute([':id' => $liveId]);
            
            if ($stmt->rowCount() > 0) {
                // Notification de fin de live
                $notificationStmt = $pdo->prepare("
                    INSERT INTO live_notifications (live_id, user_type, message) 
                    VALUES (:live_id, :user_type, :message)
                ");
                
                $notificationStmt->execute([
                    ':live_id' => $liveId,
                    ':user_type' => 'customer',
                    ':message' => "✅ Live terminé ! Merci d'avoir rejoint notre live culinaire !"
                ]);
                
                echo json_encode(['success' => true, 'message' => 'Live terminé avec succès']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Live non trouvé ou déjà terminé']);
            }
            break;
            
        case 'status':
            $liveId = $_GET['live_id'] ?? 0;
            if ($liveId) {
                $stmt = $pdo->prepare("
                    SELECT * FROM lives WHERE id = :id
                ");
                $stmt->execute([':id' => $liveId]);
                $live = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($live) {
                    // Mettre à jour le nombre de viewers
                    if ($live['status'] === 'live') {
                        $viewersCount = (int)($_GET['viewers_count'] ?? ($live['viewers_count'] ?? 0));
                        $currentMax = (int)($live['max_viewers'] ?? 0);
                        $maxViewers = max($viewersCount, $currentMax);
                        
                        $updateStmt = $pdo->prepare("
                            UPDATE lives 
                            SET viewers_count = :viewers, max_viewers = :max_viewers
                            WHERE id = :id
                        ");
                        $updateStmt->execute([
                            ':viewers' => $viewersCount,
                            ':max_viewers' => $maxViewers,
                            ':id' => $liveId
                        ]);
                        
                        $live['viewers_count'] = $viewersCount;
                        $live['max_viewers'] = $maxViewers;
                    }
                    
                    echo json_encode(['success' => true, 'data' => $live]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Live non trouvé']);
                }
            } else {
                // Lister tous les lives actifs
                $stmt = $pdo->prepare("
                    SELECT * FROM lives 
                    WHERE status IN ('live', 'scheduled') 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ");
                $stmt->execute();
                $lives = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode(['success' => true, 'data' => $lives]);
            }
            break;
            
        case 'notifications':
            $userType = $_GET['user_type'] ?? 'customer';
            $stmt = $pdo->prepare("
                SELECT ln.*, l.title, l.status 
                FROM live_notifications ln
                JOIN lives l ON ln.live_id = l.id
                WHERE ln.user_type = :user_type AND ln.is_read = FALSE
                ORDER BY ln.created_at DESC
                LIMIT 20
            ");
            $stmt->execute([':user_type' => $userType]);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $notifications]);
            break;
            
        case 'mark_read':
            $notificationId = $_POST['notification_id'] ?? 0;
            if ($notificationId) {
                $stmt = $pdo->prepare("
                    UPDATE live_notifications 
                    SET is_read = TRUE 
                    WHERE id = :id
                ");
                $stmt->execute([':id' => $notificationId]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de notification requis']);
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
