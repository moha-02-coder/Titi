<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| API Register – Bootstrap / Header sécurisé
|--------------------------------------------------------------------------
| - Forçage JSON
| - Gestion propre des erreurs
| - Configuration environnement
| - Connexion PDO robuste
|--------------------------------------------------------------------------
*/

// Toujours renvoyer du JSON
header('Content-Type: application/json; charset=UTF-8');

// Sécurité basique
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

// Configuration environnement
defined('ENVIRONMENT') || define('ENVIRONMENT', 'development'); // development | production

// Gestion des erreurs PHP selon l’environnement
if (ENVIRONMENT === 'development') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// Handler global des exceptions (empêche tout HTML parasite)
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur interne',
        'code'    => 'SERVER_ERROR',
        'debug'   => (ENVIRONMENT === 'development') ? $e->getMessage() : null
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// Handler des erreurs fatales
set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

/*
|--------------------------------------------------------------------------
| Configuration base de données
|--------------------------------------------------------------------------
*/

define('DB_HOST', 'localhost');
define('DB_NAME', 'titi');
define('DB_USER', 'root');
define('DB_PASS', '');

/*
|--------------------------------------------------------------------------
| Connexion PDO
|--------------------------------------------------------------------------
*/

function getDatabaseConnection(): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        DB_HOST,
        DB_NAME
    );

    try {
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Connexion à la base de données impossible',
            'code'    => 'DB_CONNECTION_FAILED',
            'debug'   => (ENVIRONMENT === 'development') ? $e->getMessage() : null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
