<?php
// Configuration de la base de données pour Render.com
// Ce fichier remplace database.php en production

declare(strict_types=1);

// Configuration environnement
defined('ENVIRONMENT') || define('ENVIRONMENT', $_ENV['ENVIRONMENT'] ?? 'production');

// Sécurité basique
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

// Gestion des erreurs PHP selon l'environnement
if (ENVIRONMENT === 'development') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// Handler global des exceptions
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

// Configuration base de données depuis les variables d'environnement
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_PORT', $_ENV['DB_PORT'] ?? '5432');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'titi');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');

// Connexion PDO (adapté pour PostgreSQL)
function getDatabaseConnection(): PDO
{
    // Adapter le DSN selon le type de base de données
    $db_type = strpos($_ENV['DB_HOST'] ?? '', 'postgres') !== false ? 'pgsql' : 'mysql';
    
    $dsn = sprintf(
        '%s:host=%s;port=%s;dbname=%s;charset=utf8',
        $db_type,
        DB_HOST,
        DB_PORT,
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

// Configuration JWT
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-in-production');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 3600); // 1 heure

// URL de l'application
define('APP_URL', $_ENV['APP_URL'] ?? 'http://localhost');
?>
