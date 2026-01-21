<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS pour CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';

// Récupérer les données POST
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone'])) {
    echo json_encode(['success' => false, 'message' => 'Numéro de téléphone requis']);
    exit();
}

$phone = trim($data['phone']);

try {
    // Connexion à la base de données
    $database = new Database();
    $db = $database->getConnection();
    
    // Vérifier si le téléphone existe dans la table des utilisateurs
    $query = "SELECT id FROM users WHERE phone = :phone LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':phone', $phone);
    $stmt->execute();
    
    $exists = $stmt->rowCount() > 0;
    
    echo json_encode([
        'success' => true,
        'exists' => $exists,
        'message' => $exists ? 'Numéro déjà utilisé' : 'Numéro disponible'
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}
?>