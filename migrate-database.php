<?php
/**
 * Script de migration MySQL (WAMP)
 * Exécute backend/init.sql sur la connexion définie dans backend/config/database.php
 */

declare(strict_types=1);

require_once __DIR__ . '/backend/config/database.php';

try {
    $pdo = getDatabaseConnection();

    echo "Debut de la migration MySQL...\n";

    $sqlFile = __DIR__ . '/backend/init.sql';
    if (!is_file($sqlFile)) {
        throw new RuntimeException('Fichier backend/init.sql introuvable');
    }

    $sql = file_get_contents($sqlFile);
    if ($sql === false || trim($sql) === '') {
        throw new RuntimeException('Fichier SQL vide ou illisible');
    }

    // Découpage simple des instructions SQL
    $statements = array_filter(array_map('trim', explode(';', $sql)), static function ($s) {
        return $s !== '';
    });

    $executed = 0;
    foreach ($statements as $statement) {
        $pdo->exec($statement);
        $executed++;
    }

    echo "Migration terminee avec succes. Instructions executees: {$executed}\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Erreur lors de la migration: " . $e->getMessage() . "\n");
    exit(1);
}