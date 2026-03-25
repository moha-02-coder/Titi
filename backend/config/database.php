<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Database bootstrap (MySQL / WAMP)
|--------------------------------------------------------------------------
| - Centralized DB config for all backend APIs
| - MySQL-only (WAMP) runtime
| - Shared schema helpers for API endpoints
|--------------------------------------------------------------------------
*/

$isCli = (PHP_SAPI === 'cli');

if (!defined('ENVIRONMENT')) {
    $env = getenv('ENVIRONMENT') ?: getenv('APP_ENV') ?: ($_ENV['ENVIRONMENT'] ?? $_ENV['APP_ENV'] ?? 'development');
    define('ENVIRONMENT', $env);
}

if (!$isCli) {
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
}

if (ENVIRONMENT === 'development') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

if (!$isCli) {
    set_exception_handler(function (Throwable $e): void {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Erreur serveur interne',
            'code' => 'SERVER_ERROR',
            'debug' => (ENVIRONMENT === 'development') ? $e->getMessage() : null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    });

    set_error_handler(function ($severity, $message, $file, $line): bool {
        throw new ErrorException((string)$message, 0, (int)$severity, (string)$file, (int)$line);
    });
}

function envValue(string $key, ?string $fallback = null): ?string
{
    $v = getenv($key);
    if ($v !== false && $v !== null && $v !== '') {
        return (string)$v;
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return (string)$_ENV[$key];
    }
    return $fallback;
}

function getDatabaseConfig(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }

    $host = envValue('DB_HOST', 'localhost');
    $port = envValue('DB_PORT', '3306');
    $name = envValue('DB_NAME', 'titigoldentaste');
    $user = envValue('DB_USER', 'root');
    $pass = envValue('DB_PASS', '');

    if (!defined('DB_HOST')) define('DB_HOST', (string)$host);
    if (!defined('DB_PORT')) define('DB_PORT', (string)$port);
    if (!defined('DB_NAME')) define('DB_NAME', (string)$name);
    if (!defined('DB_USER')) define('DB_USER', (string)$user);
    if (!defined('DB_PASS')) define('DB_PASS', (string)$pass);

    $config = [
        'host' => (string)$host,
        'port' => (string)$port,
        'name' => (string)$name,
        'user' => (string)$user,
        'pass' => (string)$pass,
    ];

    return $config;
}

function getDatabaseDriver(?PDO $pdo = null): string
{
    if ($pdo instanceof PDO) {
        return (string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    }
    return 'mysql';
}

function getDatabaseConnection(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = getDatabaseConfig();

    $available = PDO::getAvailableDrivers();
    if (!in_array('mysql', $available, true)) {
        $msg = 'Driver PDO MySQL indisponible. Drivers disponibles: ' . implode(', ', $available);
        if (PHP_SAPI === 'cli') {
            throw new RuntimeException($msg);
        }
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Connexion a la base de donnees MySQL impossible',
            'code' => 'DB_DRIVER_MISSING',
            'debug' => (ENVIRONMENT === 'development') ? $msg : null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
        $options[PDO::MYSQL_ATTR_INIT_COMMAND] = 'SET NAMES utf8mb4';
    }

    $databaseCandidates = array_values(array_unique(array_filter([
        $cfg['name'],
        'titigoldentaste',
        'titi',
    ], static fn ($v) => is_string($v) && $v !== '')));

    $lastError = null;
    foreach ($databaseCandidates as $databaseName) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $cfg['host'],
            $cfg['port'],
            $databaseName
        );

        try {
            $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
            return $pdo;
        } catch (Throwable $e) {
            $lastError = $e;
            $message = $e->getMessage();
            $isUnknownDatabase = str_contains($message, '[1049]') || stripos($message, 'unknown database') !== false;
            if (!$isUnknownDatabase) {
                break;
            }
        }
    }

    try {
        throw ($lastError ?? new RuntimeException('Connexion MySQL impossible'));
    } catch (Throwable $e) {
        $debug = null;
        if (ENVIRONMENT === 'development') {
            $debug = [
                'message' => $e->getMessage(),
                'driver' => 'mysql',
                'host' => $cfg['host'],
                'port' => $cfg['port'],
                'database' => $cfg['name'],
                'attempted_databases' => $databaseCandidates
            ];
        }

        if (PHP_SAPI === 'cli') {
            throw new RuntimeException('Connexion a la base de donnees MySQL impossible: ' . $e->getMessage(), 0, $e);
        }

        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Connexion a la base de donnees MySQL impossible',
            'code' => 'DB_CONNECTION_FAILED',
            'debug' => $debug
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function getTableColumns(PDO $pdo, string $table): array
{
    $table = trim($table);
    if ($table === '') {
        return [];
    }

    $schema = '';
    try {
        $schema = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
    } catch (Throwable $e) {
        $schema = '';
    }
    if ($schema === '') {
        $schema = defined('DB_NAME') ? (string)DB_NAME : '';
    }

    $sql = 'SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table
            ORDER BY ORDINAL_POSITION';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':schema' => $schema,
        ':table' => $table
    ]);
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
    return is_array($cols) ? array_values(array_map('strval', $cols)) : [];
}

function tableHasColumn(PDO $pdo, string $table, string $column): bool
{
    $cols = getTableColumns($pdo, $table);
    return in_array($column, $cols, true);
}
