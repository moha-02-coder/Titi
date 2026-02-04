<?php

require_once __DIR__ . '/../../config/database.php';

function drivers_table_exists(PDO $pdo, string $table): bool {
    try {
        $stmt = $pdo->prepare('SHOW TABLES LIKE :t');
        $stmt->execute(['t' => $table]);
        return (bool)$stmt->fetchColumn();
    } catch (Throwable $t) {
        return false;
    }
}

function drivers_has_column(PDO $pdo, string $table, string $col): bool {
    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE :c");
        $stmt->execute(['c' => $col]);
        return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $t) {
        return false;
    }
}

function drivers_ensure_drivers_schema(PDO $pdo): void {
    if (!drivers_table_exists($pdo, 'drivers')) return;

    $wanted = [
        'available' => "ALTER TABLE drivers ADD COLUMN available TINYINT(1) DEFAULT 0",
        'updated_at' => "ALTER TABLE drivers ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP",
        'rating' => "ALTER TABLE drivers ADD COLUMN rating DECIMAL(3,2) DEFAULT 0",
        'total_deliveries' => "ALTER TABLE drivers ADD COLUMN total_deliveries INT DEFAULT 0",
        'current_lat' => "ALTER TABLE drivers ADD COLUMN current_lat DECIMAL(10,7) NULL",
        'current_lng' => "ALTER TABLE drivers ADD COLUMN current_lng DECIMAL(10,7) NULL",
        'current_address' => "ALTER TABLE drivers ADD COLUMN current_address TEXT NULL",
        'last_location_update' => "ALTER TABLE drivers ADD COLUMN last_location_update DATETIME NULL",
        'id_document' => "ALTER TABLE drivers ADD COLUMN id_document VARCHAR(255) NULL",
    ];

    foreach ($wanted as $col => $sql) {
        if (!drivers_has_column($pdo, 'drivers', $col)) {
            try { $pdo->exec($sql); } catch (Throwable $t) {}
        }
    }
}

function drivers_ensure_orders_schema(PDO $pdo): void {
    if (!drivers_table_exists($pdo, 'orders')) return;
    if (!drivers_has_column($pdo, 'orders', 'driver_id')) {
        try {
            $pdo->exec("ALTER TABLE orders ADD COLUMN driver_id INT NULL AFTER user_id");
        } catch (Throwable $t) {}
    }

    // Ensure orders.status supports 'assigned'
    try {
        $col = $pdo->query("SHOW COLUMNS FROM orders LIKE 'status'")->fetch(PDO::FETCH_ASSOC);
        $type = (string)($col['Type'] ?? '');
        if (stripos($type, 'enum(') === 0) {
            if (stripos($type, "'assigned'") === false) {
                // Extract enum values and append assigned
                $vals = trim(substr($type, 5)); // remove 'enum('
                $vals = preg_replace('/\)\s*$/', '', $vals);
                $vals = trim((string)$vals);
                if ($vals !== '') {
                    $new = 'enum(' . $vals . ",'assigned')";
                    // preserve default if possible
                    $default = (string)($col['Default'] ?? '');
                    $defaultSql = $default !== '' ? " DEFAULT '" . str_replace("'", "\\'", $default) . "'" : '';
                    $pdo->exec("ALTER TABLE orders MODIFY status $new NOT NULL$defaultSql");
                }
            }
        }
    } catch (Throwable $t) {}
}

function drivers_ensure_messages_schema(PDO $pdo): void {
    if (drivers_table_exists($pdo, 'messages')) return;

    // Create minimal messages table compatible with drivers/messages.php and drivers/send-message.php
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
            id INT PRIMARY KEY AUTO_INCREMENT,
            conversation_id VARCHAR(64) NOT NULL,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            content TEXT,
            type ENUM('text','image','file','system') DEFAULT 'text',
            attachments TEXT,
            read_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Throwable $t) {
        return;
    }

    try { $pdo->exec("CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at)"); } catch (Throwable $t) {}
}

function drivers_ensure_users_schema(PDO $pdo): void {
    if (!drivers_table_exists($pdo, 'users')) return;

    $wanted = [
        'marital_status' => "ALTER TABLE users ADD COLUMN marital_status VARCHAR(50) NULL",
        'profession' => "ALTER TABLE users ADD COLUMN profession VARCHAR(100) NULL",
    ];

    foreach ($wanted as $col => $sql) {
        if (!drivers_has_column($pdo, 'users', $col)) {
            try { $pdo->exec($sql); } catch (Throwable $t) {}
        }
    }
}

function drivers_extract_bearer() {
    $h = function_exists('getallheaders') ? getallheaders() : [];
    $a = $h['Authorization'] ?? $h['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (strpos($a, 'Bearer ') === 0) return substr($a, 7);
    return null;
}

function drivers_verify_jwt($token) {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($h, $p, $s) = $parts;
    $signature = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    $expected = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if (!hash_equals($expected, $s)) return false;
    $payload = json_decode(base64_decode($p), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}

function drivers_resp($ok, $msg, $data = null, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'message' => $msg, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function drivers_require_driver(PDO $pdo) {
    $token = drivers_extract_bearer();
    if (!$token) drivers_resp(false, 'Authentification requise', null, 401);
    $payload = drivers_verify_jwt($token);
    if (!$payload || empty($payload['user_id'])) drivers_resp(false, 'Token invalide', null, 401);

    drivers_ensure_drivers_schema($pdo);
    drivers_ensure_orders_schema($pdo);
    drivers_ensure_messages_schema($pdo);
    drivers_ensure_users_schema($pdo);

    $userCols = ['id','first_name','last_name','email','phone','role','active','verified','avatar','address'];
    if (drivers_has_column($pdo, 'users', 'marital_status')) $userCols[] = 'marital_status';
    if (drivers_has_column($pdo, 'users', 'profession')) $userCols[] = 'profession';
    if (drivers_has_column($pdo, 'users', 'city')) $userCols[] = 'city';
    if (drivers_has_column($pdo, 'users', 'quarter')) $userCols[] = 'quarter';

    $uSql = 'SELECT ' . implode(', ', $userCols) . ' FROM users WHERE id = :id LIMIT 1';
    $uStmt = $pdo->prepare($uSql);
    $uStmt->execute(['id' => (int)$payload['user_id']]);
    $user = $uStmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) drivers_resp(false, 'Utilisateur introuvable', null, 401);

    // Detect driver profile by presence in drivers table (users.role may be enum client/admin)
    $driverCols = ['id as driver_id','user_id','status'];
    $optionalDriverCols = ['available','vehicle_type','vehicle_brand','vehicle_model','vehicle_year','vehicle_plate','rating','total_deliveries','current_lat','current_lng','current_address','last_location_update','id_document'];
    foreach ($optionalDriverCols as $c) {
        if (drivers_has_column($pdo, 'drivers', $c)) $driverCols[] = $c;
    }
    $dSql = 'SELECT ' . implode(', ', $driverCols) . ' FROM drivers WHERE user_id = :uid LIMIT 1';
    $dStmt = $pdo->prepare($dSql);
    $dStmt->execute(['uid' => (int)$user['id']]);
    $driver = $dStmt->fetch(PDO::FETCH_ASSOC);
    if (!$driver) drivers_resp(false, 'Profil livreur introuvable', null, 404);

    return ['user' => $user, 'driver' => $driver];
}

function drivers_orders_has_driver_id(PDO $pdo) {
    try {
        $colCheck = $pdo->prepare("SHOW COLUMNS FROM orders LIKE 'driver_id'");
        $colCheck->execute();
        return (bool)$colCheck->fetch();
    } catch (Exception $e) {
        return false;
    }
}
