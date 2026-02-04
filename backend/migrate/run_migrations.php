<?php
/**
 * Safe migration runner: executes .sql files in ../migrations
 * WARNING: Only allowed when ENVIRONMENT === 'development'
 */
require_once __DIR__ . '/../config/database.php';

if (defined('ENVIRONMENT') && ENVIRONMENT !== 'development') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Migrations runner allowed only in development environment']);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

$migrationsDir = realpath(__DIR__ . '/../migrations');
if (!$migrationsDir || !is_dir($migrationsDir)) {
    echo json_encode(['success' => false, 'message' => 'Migrations directory not found']);
    exit;
}

$files = glob($migrationsDir . DIRECTORY_SEPARATOR . '*.sql');
sort($files, SORT_STRING);

$pdo = getDatabaseConnection();

$report = [];
foreach ($files as $file) {
    $name = basename($file);
    $sql = file_get_contents($file);
    if (trim($sql) === '') {
        $report[] = ['file' => $name, 'status' => 'skipped', 'message' => 'empty file'];
        continue;
    }
    try {
        // Execute each statement separately to avoid multi-statement transaction edge-cases
        $stmts = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($stmts as $stmt) {
            if ($stmt === '') continue;
            $pdo->exec($stmt);
        }
        $report[] = ['file' => $name, 'status' => 'ok', 'statements' => count($stmts)];
    } catch (PDOException $e) {
        $report[] = ['file' => $name, 'status' => 'error', 'message' => $e->getMessage()];
    }
}

echo json_encode(['success' => true, 'report' => $report], JSON_UNESCAPED_UNICODE);

?>
