<?php
/**
 * API pour le menu du jour
 * Retourne toujours du JSON valide
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Menu du jour par défaut
$defaultMenu = [
    'id' => 1,
    'name' => 'Poulet braisé',
    'description' => 'Poulet tendre servi avec alloco et sauce pimentée',
    'price' => 3500,
    'image' => 'poulet-braise.jpg',
    'category' => 'plat principal',
    'in_stock' => true
];

try {
    // Essayer de charger depuis la base de données si disponible
    $configPath = __DIR__ . '/../../config/database.php';
    $menu = $defaultMenu;
    
    if (file_exists($configPath)) {
        require_once $configPath;
        if (function_exists('getDatabaseConnection')) {
            try {
                $pdo = getDatabaseConnection();
                
                // Chercher un menu du jour actif
                $stmt = $pdo->prepare("
                    SELECT id, name, description, price, image_url as image, category 
                    FROM products 
                    WHERE type = 'menu' AND is_daily_menu = 1 
                    ORDER BY id DESC 
                    LIMIT 1
                ");
                $stmt->execute();
                $dbMenu = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($dbMenu) {
                    $menu = [
                        'id' => (int)$dbMenu['id'],
                        'name' => htmlspecialchars($dbMenu['name'] ?? '', ENT_QUOTES, 'UTF-8'),
                        'description' => htmlspecialchars($dbMenu['description'] ?? '', ENT_QUOTES, 'UTF-8'),
                        'price' => (float)$dbMenu['price'],
                        'image' => $dbMenu['image'] ?? 'poulet-braise.jpg',
                        'category' => $dbMenu['category'] ?? 'plat principal',
                        'in_stock' => true
                    ];
                }
            } catch (Exception $e) {
                // Erreur BD, garder le menu par défaut
            }
        }
    }
    
    // Toujours retourner du JSON valide
    echo json_encode([
        'success' => true,
        'data' => $menu,
        'message' => 'Menu du jour récupéré'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // En cas d'erreur, retourner le menu par défaut
    echo json_encode([
        'success' => true,
        'data' => $defaultMenu,
        'message' => 'Menu du jour (mode démo)'
    ], JSON_UNESCAPED_UNICODE);
}
?>