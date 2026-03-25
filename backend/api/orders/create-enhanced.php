<?php
/**
 * API pour créer une commande avec le système amélioré
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gérer les requêtes OPTIONS pour CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../helpers/auth.php';
require_once '../../helpers/response.php';

try {
    // Vérifier l'authentification (optionnel pour les commandes invité)
    $token = getBearerToken();
    $user = $token ? verifyToken($token) : null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendError('Données invalides', 400);
        }

        // Valider les données de base
        if (empty($input['items']) || !is_array($input['items'])) {
            sendError('Aucun article dans la commande', 400);
        }

        // Calculer le total
        $total = 0;
        foreach ($input['items'] as $item) {
            $total += ($item['price'] ?? 0) * ($item['quantity'] ?? 1);
        }

        // Ajouter les personnalisations
        if (!empty($input['customizations'])) {
            foreach ($input['customizations'] as $category) {
                if (is_array($category)) {
                    foreach ($category as $customization) {
                        $total += $customization['price'] ?? 0;
                    }
                } elseif (isset($category['price'])) {
                    $total += $category['price'];
                }
            }
        }

        // Ajouter les frais de livraison
        $deliveryPrice = 0;
        if (!empty($input['delivery']['delivery_type']) && $input['delivery']['delivery_type'] === 'delivery') {
            $deliveryPrice = 1000;
            $total += $deliveryPrice;
        }

        // Générer un numéro de commande unique
        $orderNumber = 'ORD-' . date('Y') . '-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);

        // Préparer les données de la commande
        $orderData = [
            'order_number' => $orderNumber,
            'user_id' => $user ? $user['user_id'] : null,
            'status' => 'pending',
            'subtotal' => $total - $deliveryPrice,
            'delivery_price' => $deliveryPrice,
            'total' => $total,
            'customer_name' => $input['delivery']['name'] ?? ($user ? ($user['first_name'] . ' ' . $user['last_name']) : 'Client'),
            'customer_phone' => $input['delivery']['phone'] ?? ($user ? $user['phone'] : null),
            'customer_email' => $user ? $user['email'] : null,
            'delivery_address' => $input['delivery']['address'] ?? null,
            'delivery_city' => $input['delivery']['city'] ?? 'Bamako',
            'delivery_type' => $input['delivery']['delivery_type'] ?? 'delivery',
            'payment_method' => $input['payment']['method'] ?? 'cash',
            'payment_status' => 'pending',
            'notes' => $input['delivery']['notes'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];

        // Insérer la commande
        $stmt = $pdo->prepare("
            INSERT INTO orders (
                order_number, user_id, status, subtotal, delivery_price, total,
                customer_name, customer_phone, customer_email, delivery_address,
                delivery_city, delivery_type, payment_method, payment_status,
                notes, created_at, updated_at
            ) VALUES (
                :order_number, :user_id, :status, :subtotal, :delivery_price, :total,
                :customer_name, :customer_phone, :customer_email, :delivery_address,
                :delivery_city, :delivery_type, :payment_method, :payment_status,
                :notes, :created_at, :updated_at
            )
        ");

        $result = $stmt->execute($orderData);

        if (!$result) {
            sendError('Erreur lors de la création de la commande', 500);
        }

        $orderId = $pdo->lastInsertId();

        // Insérer les articles de la commande
        foreach ($input['items'] as $item) {
            $itemData = [
                'order_id' => $orderId,
                'item_id' => $item['id'] ?? null,
                'item_name' => $item['name'] ?? 'Article',
                'item_description' => $item['description'] ?? '',
                'price' => $item['price'] ?? 0,
                'quantity' => $item['quantity'] ?? 1,
                'image_url' => $item['image'] ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $stmt = $pdo->prepare("
                INSERT INTO order_items (
                    order_id, item_id, item_name, item_description, price,
                    quantity, image_url, created_at
                ) VALUES (
                    :order_id, :item_id, :item_name, :item_description, :price,
                    :quantity, :image_url, :created_at
                )
            ");

            $stmt->execute($itemData);
        }

        // Insérer les personnalisations si présentes
        if (!empty($input['customizations'])) {
            $customizationJson = json_encode($input['customizations']);
            
            $stmt = $pdo->prepare("
                UPDATE orders SET customizations = :customizations WHERE id = :id
            ");
            $stmt->execute([
                'customizations' => $customizationJson,
                'id' => $orderId
            ]);
        }

        // Envoyer une notification (optionnel)
        $this->sendOrderNotification($orderId, $orderData);

        $response = [
            'success' => true,
            'message' => 'Commande créée avec succès',
            'order' => [
                'id' => (int)$orderId,
                'order_number' => $orderNumber,
                'total' => $total,
                'status' => 'pending',
                'created_at' => $orderData['created_at']
            ]
        ];

        sendSuccess($response);
    } else {
        sendError('Méthode non autorisée', 405);
    }
    
} catch (PDOException $e) {
    error_log("Erreur PDO create-enhanced.php: " . $e->getMessage());
    sendError('Erreur de base de données', 500);
} catch (Exception $e) {
    error_log("Erreur create-enhanced.php: " . $e->getMessage());
    sendError('Erreur serveur', 500);
}

function sendOrderNotification($orderId, $orderData) {
    global $pdo;
    
    try {
        // Récupérer les détails complets de la commande
        $stmt = $pdo->prepare("
            SELECT oi.*, o.order_number, o.customer_name, o.customer_email, o.total
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
        ");
        $stmt->execute([$orderId]);
        $orderDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($orderDetails) && $orderDetails[0]['customer_email']) {
            // Ici vous pourriez envoyer un email de confirmation
            $subject = "Confirmation de commande - " . $orderDetails[0]['order_number'];
            $message = "Bonjour " . $orderDetails[0]['customer_name'] . ",\n\n";
            $message .= "Votre commande #" . $orderDetails[0]['order_number'] . " a été reçue avec succès.\n";
            $message .= "Total: " . number_format($orderDetails[0]['total'], 0, ',', ' ') . " FCFA\n\n";
            $message .= "Nous vous informerons dès que votre commande sera en préparation.\n\n";
            $message .= "Merci pour votre confiance !\n";
            $message .= "Titi Golden Taste";
            
            // Log pour le débogage
            error_log("Email de confirmation envoyé pour commande $orderId: " . $subject);
            
            // Vous pourriez utiliser une fonction d'envoi d'email ici
            // mail($orderDetails[0]['customer_email'], $subject, $message);
        }
    } catch (Exception $e) {
        error_log("Erreur notification: " . $e->getMessage());
    }
}
?>
