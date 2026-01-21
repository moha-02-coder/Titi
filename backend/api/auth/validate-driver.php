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

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $errors = [];
    $validations = [];
    
    // Validation du type de véhicule
    if (isset($data['vehicle_type'])) {
        $validTypes = ['moto', 'voiture', 'velo', 'camionnette'];
        if (!in_array($data['vehicle_type'], $validTypes)) {
            $errors['vehicle_type'] = 'Type de véhicule invalide';
        } else {
            $validations['vehicle_type'] = 'Valide';
        }
    }
    
    // Validation de l'immatriculation (si fournie)
    if (isset($data['vehicle_plate']) && !empty($data['vehicle_plate'])) {
        $plate = strtoupper(trim($data['vehicle_plate']));
        if (!preg_match('/^[A-Z0-9\- ]{6,12}$/', $plate)) {
            $errors['vehicle_plate'] = 'Immatriculation invalide';
        } else {
            $validations['vehicle_plate'] = 'Valide';
        }
    }
    
    // Vérification de la licence (si fournie)
    if (isset($data['driver_license']) && !empty($data['driver_license'])) {
        $license = trim($data['driver_license']);
        if (strlen($license) < 8) {
            $errors['driver_license'] = 'Numéro de permis invalide';
        } else {
            $validations['driver_license'] = 'Valide';
        }
    }
    
    if (count($errors) > 0) {
        echo json_encode([
            'success' => false,
            'errors' => $errors,
            'message' => 'Erreurs de validation'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'validations' => $validations,
            'message' => 'Informations livreur valides'
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}
?>