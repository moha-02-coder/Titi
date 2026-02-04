<?php
// debug.php - Pour voir les erreurs PHP
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Tester la connexion à la base de données
require_once __DIR__ . '/../../config/database.php';

try {
    $pdo = getDatabaseConnection();
    echo "✅ Connexion à la base de données réussie<br>";
    
    // Tester la table products
    $stmt = $pdo->query("SHOW TABLES LIKE 'products'");
    $tableExists = $stmt->fetch();
    
    if ($tableExists) {
        echo "✅ Table 'products' existe<br>";
        
        // Voir les colonnes
        $stmt = $pdo->query("DESCRIBE products");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "Colonnes disponibles:<br>";
        foreach ($columns as $col) {
            echo "- " . $col['Field'] . " (" . $col['Type'] . ")<br>";
        }
        
        // Compter les produits
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM products");
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✅ Nombre de produits: " . $count['count'] . "<br>";
        
        // Voir les 3 premiers produits
        $stmt = $pdo->query("SELECT * FROM products LIMIT 3");
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "<br>Exemples de produits:<br>";
        foreach ($products as $product) {
            echo "- ID: " . $product['id'] . ", Nom: " . $product['name'] . "<br>";
        }
    } else {
        echo "❌ Table 'products' n'existe pas<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "<br>";
    echo "Fichier: " . $e->getFile() . " ligne " . $e->getLine() . "<br>";
}
?>