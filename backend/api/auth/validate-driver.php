<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    // Centralise l'appel base de donnees via backend/config/database.php
    getDatabaseConnection();

    $errors = [];
    $validations = [];

    if (isset($data['vehicle_type'])) {
        $validTypes = ['moto', 'voiture', 'velo', 'camionnette'];
        if (!in_array($data['vehicle_type'], $validTypes, true)) {
            $errors['vehicle_type'] = 'Type de vehicule invalide';
        } else {
            $validations['vehicle_type'] = 'Valide';
        }
    }

    if (isset($data['vehicle_plate']) && !empty($data['vehicle_plate'])) {
        $plate = strtoupper(trim((string)$data['vehicle_plate']));
        if (!preg_match('/^[A-Z0-9\- ]{6,12}$/', $plate)) {
            $errors['vehicle_plate'] = 'Immatriculation invalide';
        } else {
            $validations['vehicle_plate'] = 'Valide';
        }
    }

    if (isset($data['driver_license']) && !empty($data['driver_license'])) {
        $license = trim((string)$data['driver_license']);
        if (strlen($license) < 8) {
            $errors['driver_license'] = 'Numero de permis invalide';
        } else {
            $validations['driver_license'] = 'Valide';
        }
    }

    if (!empty($errors)) {
        echo json_encode([
            'success' => false,
            'errors' => $errors,
            'message' => 'Erreurs de validation'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => true,
            'validations' => $validations,
            'message' => 'Informations livreur valides'
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur: ' . ((defined('ENVIRONMENT') && ENVIRONMENT === 'development') ? $e->getMessage() : 'connexion base de donnees')
    ], JSON_UNESCAPED_UNICODE);
}
?>