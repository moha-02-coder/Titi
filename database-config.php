<?php
declare(strict_types=1);

// Compatibility wrapper: all DB access must go through backend/config/database.php
require_once __DIR__ . '/backend/config/database.php';

if (!defined('JWT_SECRET')) {
    define('JWT_SECRET', envValue('JWT_SECRET', 'your-secret-key-change-in-production') ?? 'your-secret-key-change-in-production');
}
if (!defined('JWT_ALGORITHM')) {
    define('JWT_ALGORITHM', 'HS256');
}
if (!defined('JWT_EXPIRATION')) {
    define('JWT_EXPIRATION', 3600);
}
if (!defined('APP_URL')) {
    define('APP_URL', envValue('APP_URL', 'http://localhost') ?? 'http://localhost');
}