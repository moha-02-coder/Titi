<?php
require_once __DIR__ . '/../../config/database.php';

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if (!$id) {
    http_response_code(400);
    echo json_encode([ 'success' => false, 'message' => 'Recipe id required' ]);
    exit;
}

$pdo = getDatabaseConnection();
try {
    $stmt = $pdo->prepare("SELECT id, name, slug, main_image, short_description, prep_time_min, difficulty, portions, visibility FROM recipes WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $id]);
    $recipe = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$recipe) {
        http_response_code(404);
        echo json_encode([ 'success' => false, 'message' => 'Recette introuvable' ]);
        exit;
    }

    // fetch ingredients
    $ing = $pdo->prepare("SELECT name, quantity, unit, order_index FROM recipe_ingredients WHERE recipe_id = :id ORDER BY order_index ASC");
    $ing->execute([':id' => $id]);
    $ingredients = $ing->fetchAll(PDO::FETCH_ASSOC);

    $stepsStmt = $pdo->prepare("SELECT step_number, content, image_path FROM recipe_steps WHERE recipe_id = :id ORDER BY step_number ASC");
    $stepsStmt->execute([':id' => $id]);
    $steps = $stepsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([ 'success' => true, 'data' => [ 'recipe' => $recipe, 'ingredients' => $ingredients, 'steps' => $steps ] ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'message' => 'Erreur serveur', 'debug' => $e->getMessage() ]);
}

?>
