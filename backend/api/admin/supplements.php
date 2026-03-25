<?php
/**
 * API pour gérer les suppléments
 * CRUD operations pour les suppléments de menu
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérification de l'authentification admin
function isAdmin() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        // Vérification basique du token (à améliorer avec JWT)
        return $token && strlen($token) > 10;
    }
    
    return false;
}

if (!isAdmin()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Accès non autorisé'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    require_once __DIR__ . '/../config/database.php';
    $pdo = getDatabaseConnection();

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    switch ($method) {
        case 'GET':
            if ($action === 'list') {
                // Lister tous les suppléments
                $stmt = $pdo->query("SELECT * FROM supplements ORDER BY name");
                $supplements = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $supplements,
                    'message' => 'Suppléments récupérés'
                ], JSON_UNESCAPED_UNICODE);
            } elseif ($action === 'single' && isset($_GET['id'])) {
                // Récupérer un supplément spécifique
                $stmt = $pdo->prepare("SELECT * FROM supplements WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $supplement = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($supplement) {
                    echo json_encode([
                        'success' => true,
                        'data' => $supplement,
                        'message' => 'Supplément trouvé'
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Supplément non trouvé'
                    ], JSON_UNESCAPED_UNICODE);
                }
            }
            break;

        case 'POST':
            // Créer un nouveau supplément
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['name']) || !isset($data['price'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Nom et prix requis'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $stmt = $pdo->prepare("INSERT INTO supplements (name, price, description, category, available) VALUES (?, ?, ?, ?, ?)");
            $result = $stmt->execute([
                $data['name'],
                $data['price'],
                $data['description'] ?? '',
                $data['category'] ?? 'général',
                $data['available'] ?? 1
            ]);

            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Supplément créé avec succès',
                    'id' => $pdo->lastInsertId()
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Erreur lors de la création du supplément'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            // Mettre à jour un supplément
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($_GET['id']) || !isset($data['name']) || !isset($data['price'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ID, nom et prix requis'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $stmt = $pdo->prepare("UPDATE supplements SET name = ?, price = ?, description = ?, category = ?, available = ? WHERE id = ?");
            $result = $stmt->execute([
                $data['name'],
                $data['price'],
                $data['description'] ?? '',
                $data['category'] ?? 'général',
                $data['available'] ?? 1,
                $_GET['id']
            ]);

            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Supplément mis à jour avec succès'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Erreur lors de la mise à jour du supplément'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            // Supprimer un supplément
            if (!isset($_GET['id'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'ID requis pour la suppression'
                ], JSON_UNESCAPED_UNICODE);
                break;
            }

            $stmt = $pdo->prepare("DELETE FROM supplements WHERE id = ?");
            $result = $stmt->execute([$_GET['id']]);

            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Supplément supprimé avec succès'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Erreur lors de la suppression du supplément'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            echo json_encode([
                'success' => false,
                'message' => 'Méthode non autorisée'
            ], JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
