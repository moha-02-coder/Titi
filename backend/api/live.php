<?php
/**
 * API pour vérifier le statut d'ouverture - Version ultra-simplifiée
 */

// Debug temporaire (désactiver en production)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Headers pour API REST
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier que c'est une requête GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(200);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Méthode non autorisée']);
    exit;
}

try {
    // Simuler une réponse simple
    $currentHour = (int)date('H');
    $currentDay = date('N'); // 1 (lundi) à 7 (dimanche)
    
    // Heures d'ouverture : 10h-22h du lundi au samedi, 12h-20h le dimanche
    if ($currentDay >= 1 && $currentDay <= 6) { // Lundi à samedi
        if ($currentHour >= 10 && $currentHour < 22) {
            $status = 'open';
            $message = 'Le restaurant est ouvert jusqu\'à 22h';
        } else {
            $status = 'closed';
            $message = 'Le restaurant est fermé. Ouverture à 10h';
        }
    } else { // Dimanche
        if ($currentHour >= 12 && $currentHour < 20) {
            $status = 'open';
            $message = 'Le restaurant est ouvert jusqu\'à 20h';
        } else {
            $status = 'closed';
            $message = 'Le restaurant est fermé. Ouverture à 12h';
        }
    }
    
    // Réponse réussie
    $response = [
        'success' => true,
        'data' => [
            'status' => $status,
            'message' => $message,
            'server_time' => date('H:i'),
            'server_day' => $currentDay
        ],
        'message' => ''
    ];
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // En cas d'erreur, retourner un statut par défaut
    http_response_code(200);
    $err = [
        'success' => false,
        'data' => null,
        'message' => 'Erreur serveur lors de la récupération du statut',
        'error' => $e->getMessage()
    ];
    echo json_encode($err, JSON_UNESCAPED_UNICODE);
}
?>