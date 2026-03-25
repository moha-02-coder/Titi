é<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/common.php';

try {
    $pdo = getDatabaseConnection();
    $ctx = drivers_require_driver($pdo);
    $driverId = (int)$ctx['driver']['driver_id'];
    $driverUserId = (int)($ctx['driver']['user_id'] ?? ($ctx['user']['id'] ?? 0));

    $driverStatus = strtolower((string)($ctx['driver']['status'] ?? ''));
    if ($driverStatus !== 'approved') {
        drivers_resp(false, 'Compte livreur non approuvé', null, 403);
    }

    if (!drivers_orders_has_driver_id($pdo)) {
        drivers_resp(false, 'Assignation livreur non supportée sur cette base', null, 400);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) drivers_resp(false, 'JSON invalide', null, 400);

    $orderId = isset($data['order_id']) ? (int)$data['order_id'] : 0;
    $action = strtolower((string)($data['action'] ?? ''));
    if (!$orderId || !in_array($action, ['accept','refuse'], true)) {
        drivers_resp(false, 'Paramètres invalides', null, 400);
    }

    $stmt = $pdo->prepare("SELECT id, status, driver_id FROM orders WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$order) drivers_resp(false, 'Commande introuvable', null, 404);

    $currentDriverId = (int)($order['driver_id'] ?? 0);
    $currentStatus = (string)($order['status'] ?? '');

    if ($action === 'accept') {
        // If already assigned to this driver, keep previous logic
        if ($currentDriverId === $driverId) {
            if ($currentStatus !== 'assigned') {
                drivers_resp(false, 'Commande non disponible pour acceptation', null, 400);
            }
            $pdo->beginTransaction();
            try {
                $upd = $pdo->prepare("UPDATE orders SET status = 'delivery', updated_at = NOW() WHERE id = :id");
                $upd->execute(['id' => $orderId]);
                $pdo->prepare("UPDATE drivers SET available = 0 WHERE id = :id")->execute(['id' => $driverId]);
                $pdo->commit();
            } catch (Throwable $t) {
                $pdo->rollBack();
                throw $t;
            }
            // Send auto message to customer
            try {
                $oStmt = $pdo->prepare("SELECT o.id, o.user_id, o.items_json, o.total_price, o.delivery_fee, o.final_price, o.delivery_address
                                        FROM orders o WHERE o.id = :id LIMIT 1");
                $oStmt->execute(['id' => $orderId]);
                $od = $oStmt->fetch(PDO::FETCH_ASSOC) ?: [];
                $qty = 0;
                $items = json_decode((string)($od['items_json'] ?? ''), true);
                if (is_array($items)) {
                    foreach ($items as $it) { $qty += (int)($it['qty'] ?? 1); }
                }
                $hour = (int)date('G');
                $greet = $hour < 18 ? 'Bonjour' : 'Bonsoir';
                $content = $greet . ", je suis votre livreur pour la commande #" . ($od['id'] ?? $orderId)
                    . ". Quantité: " . $qty
                    . ", Prix: " . ($od['total_price'] ?? '')
                    . ", Adresse: " . ($od['delivery_address'] ?? '')
                    . ", Montant à payer: " . ($od['final_price'] ?? ($od['total_price'] ?? ''));
                $pdo->prepare("INSERT INTO messages (conversation_id, sender_id, receiver_id, content, type) VALUES (:conv, :sid, :rid, :content, 'text')")
                    ->execute([
                        'conv' => 'order_' . $orderId,
                        'sid' => $driverUserId,
                        'rid' => (int)($od['user_id'] ?? 0),
                        'content' => $content,
                    ]);
            } catch (Throwable $t) { /* ignore */ }
            drivers_resp(true, 'Commande acceptée', ['order_id' => $orderId]);
        }

        // If not assigned yet, atomically claim it
        if ($currentDriverId !== 0) {
            drivers_resp(false, 'Commande déjà attribuée à un autre livreur', null, 409);
        }
        if (!in_array(strtolower($currentStatus), ['pending','confirmed','preparing'], true)) {
            drivers_resp(false, 'Commande non disponible pour acceptation', null, 400);
        }

        $pdo->beginTransaction();
        try {
            $claim = $pdo->prepare("UPDATE orders 
                                    SET driver_id = :driver_id, status = 'delivery', updated_at = NOW()
                                    WHERE id = :id AND (driver_id IS NULL OR driver_id = 0)");
            $claim->execute(['driver_id' => $driverId, 'id' => $orderId]);
            if ($claim->rowCount() < 1) {
                $pdo->rollBack();
                drivers_resp(false, 'Commande déjà prise', null, 409);
            }
            $pdo->prepare("UPDATE drivers SET available = 0 WHERE id = :id")->execute(['id' => $driverId]);

            // Send auto message to customer
            try {
                $oStmt = $pdo->prepare("SELECT o.id, o.user_id, o.items_json, o.total_price, o.delivery_fee, o.final_price, o.delivery_address
                                        FROM orders o WHERE o.id = :id LIMIT 1");
                $oStmt->execute(['id' => $orderId]);
                $od = $oStmt->fetch(PDO::FETCH_ASSOC) ?: [];
                $qty = 0;
                $items = json_decode((string)($od['items_json'] ?? ''), true);
                if (is_array($items)) {
                    foreach ($items as $it) { $qty += (int)($it['qty'] ?? 1); }
                }
                $hour = (int)date('G');
                $greet = $hour < 18 ? 'Bonjour' : 'Bonsoir';
                $content = $greet . ", je suis votre livreur pour la commande #" . ($od['id'] ?? $orderId)
                    . ". Quantité: " . $qty
                    . ", Prix: " . ($od['total_price'] ?? '')
                    . ", Adresse: " . ($od['delivery_address'] ?? '')
                    . ", Montant à payer: " . ($od['final_price'] ?? ($od['total_price'] ?? ''));
                $pdo->prepare("INSERT INTO messages (conversation_id, sender_id, receiver_id, content, type) VALUES (:conv, :sid, :rid, :content, 'text')")
                    ->execute([
                        'conv' => 'order_' . $orderId,
                        'sid' => $driverUserId,
                        'rid' => (int)($od['user_id'] ?? 0),
                        'content' => $content,
                    ]);
            } catch (Throwable $t) { /* ignore */ }

            $pdo->commit();
        } catch (Throwable $t) {
            $pdo->rollBack();
            throw $t;
        }

        drivers_resp(true, 'Commande acceptée', ['order_id' => $orderId]);
    }

    // refuse
    // If not assigned yet, refusing just means "I skip it" (no DB mutation)
    if ($currentDriverId === 0) {
        drivers_resp(true, 'Commande refusée', ['order_id' => $orderId]);
    }

    if ($currentDriverId !== $driverId) {
        drivers_resp(false, 'Accès non autorisé', null, 403);
    }

    if ($currentStatus !== 'assigned') {
        drivers_resp(false, 'Commande non disponible pour refus', null, 400);
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("UPDATE orders SET driver_id = NULL, status = 'pending', updated_at = NOW() WHERE id = :id");
        $upd->execute(['id' => $orderId]);
        $pdo->prepare("UPDATE drivers SET available = 1 WHERE id = :id")->execute(['id' => $driverId]);
        $pdo->commit();
    } catch (Throwable $t) {
        $pdo->rollBack();
        throw $t;
    }

    drivers_resp(true, 'Commande refusée', ['order_id' => $orderId]);
} catch (Throwable $t) {
    drivers_resp(false, 'Erreur serveur', null, 500);
}
