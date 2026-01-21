<?php
/**
 * Gestion des sessions PHP
 */

// Configuration de la session
session_set_cookie_params([
    'lifetime' => 86400, // 24 heures
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'] ?? 'localhost',
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict'
]);

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Fonction pour vérifier l'authentification
function isAuthenticated() {
    return isset($_SESSION['user_id']) && isset($_SESSION['user_email']);
}

// Fonction pour vérifier les privilèges admin
function isAdmin() {
    return isset($_SESSION['user_is_admin']) && $_SESSION['user_is_admin'] === true;
}

// Fonction pour obtenir l'ID utilisateur
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

// Fonction pour déconnecter l'utilisateur
function logout() {
    $_SESSION = [];
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
}
?>