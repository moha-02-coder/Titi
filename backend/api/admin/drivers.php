<?php
/**
 * API admin pour la gestion des livreurs
 * GET /backend/api/admin/drivers.php
 *
 * - If `drivers` table exists, returns driver profile + status.
 * - Otherwise falls back to users.role='livreur'.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

function extractBearerToken() {
    $h = getallheaders();
    $a = $h['Authorization'] ?? $h['authorization'] ?? '';
    if (strpos($a, 'Bearer ') === 0) return substr($a, 7);
    return null;
}

function verifyJWTToken($token) {
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

function requireAdmin(PDO $pdo) {
    $token = extractBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentification requise'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $payload = verifyJWTToken($token);
    if (!$payload || empty($payload['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token invalide'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id, role, active FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => (int)$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || (int)($user['active'] ?? 0) !== 1) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès non autorisé'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function tableExists(PDO $pdo, $tableName) {
    try {
        $stmt = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t LIMIT 1');
        $stmt->execute(['t' => $tableName]);
        return (bool)$stmt->fetchColumn();
    } catch (Exception $e) {
        return false;
    }
}

function columnExists(PDO $pdo, $tableName, $columnName) {
    try {
        $stmt = $pdo->prepare('SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c LIMIT 1');
        $stmt->execute(['t' => $tableName, 'c' => $columnName]);
        return (bool)$stmt->fetchColumn();
    } catch (Exception $e) {
        return false;
    }
}

function ensureDriversSchema(PDO $pdo) {
    if (!tableExists($pdo, 'drivers')) return;

    $migrations = [];

    if (!columnExists($pdo, 'drivers', 'available')) {
        $migrations[] = "ALTER TABLE drivers ADD COLUMN available TINYINT(1) NOT NULL DEFAULT 0";
    }
    if (!columnExists($pdo, 'drivers', 'updated_at')) {
        $migrations[] = "ALTER TABLE drivers ADD COLUMN updated_at DATETIME NULL";
    }
    if (!columnExists($pdo, 'drivers', 'rejection_reason')) {
        $migrations[] = "ALTER TABLE drivers ADD COLUMN rejection_reason VARCHAR(255) NULL";
    }

    // Optional metrics columns used by dashboards
    if (!columnExists($pdo, 'drivers', 'rating')) {
        $migrations[] = "ALTER TABLE drivers ADD COLUMN rating DECIMAL(3,2) NULL";
    }
    if (!columnExists($pdo, 'drivers', 'total_deliveries')) {
        $migrations[] = "ALTER TABLE drivers ADD COLUMN total_deliveries INT NULL DEFAULT 0";
    }

    if (!$migrations) return;
    foreach ($migrations as $sql) {
        try { $pdo->exec($sql); } catch (Exception $e) { /* ignore */ }
    }
}

function selectDriversCols(PDO $pdo) {
    $cols = [
        "d.id as driver_id",
        "d.status as driver_status",
    ];

    if (columnExists($pdo, 'drivers', 'available')) {
        $cols[] = "d.available as driver_available";
    } else {
        $cols[] = "0 as driver_available";
    }

    $optional = [
        'id_document' => 'd.id_document',
        'vehicle_type' => 'd.vehicle_type',
        'vehicle_brand' => 'd.vehicle_brand',
        'vehicle_model' => 'd.vehicle_model',
        'vehicle_plate' => 'd.vehicle_plate',
        'rating' => 'd.rating',
        'total_deliveries' => 'd.total_deliveries',
        'current_lat' => 'd.current_lat',
        'current_lng' => 'd.current_lng',
        'current_address' => 'd.current_address',
        'last_location_update' => 'd.last_location_update',
    ];

    foreach ($optional as $c => $expr) {
        if (columnExists($pdo, 'drivers', $c)) $cols[] = $expr;
    }
    return implode(",\n                         ", $cols);
}

function selectOptionalUserCols(PDO $pdo) {
    $cols = [];
    $optional = [
        'avatar' => 'u.avatar',
        'address' => 'u.address',
        'city' => 'u.city',
        'quarter' => 'u.quarter',
    ];
    foreach ($optional as $c => $expr) {
        if (columnExists($pdo, 'users', $c)) $cols[] = $expr;
    }
    return $cols ? (", " . implode(", ", $cols)) : '';
}

try {
    $pdo = getDatabaseConnection();
    requireAdmin($pdo);

    // Ensure schema is compatible with admin features
    ensureDriversSchema($pdo);

    // POST: update driver status / block
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'JSON invalide'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
        $action = strtolower((string)($data['action'] ?? ''));
        $reason = trim((string)($data['reason'] ?? ''));

        if (!$userId || !in_array($action, ['approve', 'reject', 'block', 'unblock'], true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Paramètres invalides'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (!tableExists($pdo, 'drivers')) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Table drivers manquante'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Make sure columns exist before issuing UPDATEs
        ensureDriversSchema($pdo);

        $uStmt = $pdo->prepare("SELECT id, role, active, verified FROM users WHERE id = :id LIMIT 1");
        $uStmt->execute(['id' => $userId]);
        $u = $uStmt->fetch(PDO::FETCH_ASSOC);
        if (!$u) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $dStmt = $pdo->prepare("SELECT id, status FROM drivers WHERE user_id = :uid LIMIT 1");
        $dStmt->execute(['uid' => $userId]);
        $drv = $dStmt->fetch(PDO::FETCH_ASSOC);
        if (!$drv) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Profil drivers introuvable pour ce livreur'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $pdo->beginTransaction();
        try {
            if ($action === 'approve') {
                $sets = ["status = 'approved'"];
                if (columnExists($pdo, 'drivers', 'available')) $sets[] = "available = 0";
                if (columnExists($pdo, 'drivers', 'updated_at')) $sets[] = "updated_at = NOW()";
                $pdo->prepare("UPDATE drivers SET " . implode(', ', $sets) . " WHERE id = :id")
                    ->execute(['id' => (int)$drv['id']]);
                $pdo->prepare("UPDATE users SET active = 1, verified = 1 WHERE id = :id")
                    ->execute(['id' => $userId]);
            }

            if ($action === 'reject') {
                $sets = ["status = 'rejected'"];
                if (columnExists($pdo, 'drivers', 'available')) $sets[] = "available = 0";
                if (columnExists($pdo, 'drivers', 'rejection_reason')) $sets[] = "rejection_reason = :r";
                if (columnExists($pdo, 'drivers', 'updated_at')) $sets[] = "updated_at = NOW()";
                $sql = "UPDATE drivers SET " . implode(', ', $sets) . " WHERE id = :id";
                $params = ['id' => (int)$drv['id']];
                if (strpos($sql, ':r') !== false) $params['r'] = ($reason !== '' ? $reason : null);
                $pdo->prepare($sql)->execute($params);
            }

            if ($action === 'block') {
                $sets = ["status = 'suspended'"];
                if (columnExists($pdo, 'drivers', 'available')) $sets[] = "available = 0";
                if (columnExists($pdo, 'drivers', 'updated_at')) $sets[] = "updated_at = NOW()";
                $pdo->prepare("UPDATE drivers SET " . implode(', ', $sets) . " WHERE id = :id")
                    ->execute(['id' => (int)$drv['id']]);
                $pdo->prepare("UPDATE users SET active = 0 WHERE id = :id")
                    ->execute(['id' => $userId]);
            }

            if ($action === 'unblock') {
                $pdo->prepare("UPDATE users SET active = 1 WHERE id = :id")
                    ->execute(['id' => $userId]);
                // If suspended, restore to pending (admin can approve later) or keep approved
                $newStatus = (strtolower((string)($drv['status'] ?? '')) === 'suspended') ? 'pending' : ($drv['status'] ?? 'pending');
                $sets = ["status = :s"]; 
                if (columnExists($pdo, 'drivers', 'updated_at')) $sets[] = "updated_at = NOW()";
                $pdo->prepare("UPDATE drivers SET " . implode(', ', $sets) . " WHERE id = :id")
                    ->execute(['id' => (int)$drv['id'], 's' => $newStatus]);

                // If driver is already approved, ensure user is marked verified
                if (strtolower((string)$newStatus) === 'approved') {
                    $pdo->prepare("UPDATE users SET verified = 1 WHERE id = :id")
                        ->execute(['id' => $userId]);
                }
            }

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

        echo json_encode(['success' => true, 'message' => 'Livreur mis à jour', 'action' => $action], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $params = $_GET;
    $search = isset($params['search']) ? trim((string)$params['search']) : '';
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $page = isset($params['page']) ? max(1, (int)$params['page']) : 1;
    $offset = ($page - 1) * $limit;

    $hasDrivers = tableExists($pdo, 'drivers');

    $queryParams = [
        'limit' => $limit,
        'offset' => $offset,
    ];

    if ($hasDrivers) {
        // Source of truth: drivers table (list all driver profiles even if users.role is incorrect)
        $dCols = selectDriversCols($pdo);
        $uCols = selectOptionalUserCols($pdo);
        $query = "SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.verified, u.active, u.created_at$uCols,
                         $dCols
                  FROM drivers d
                  INNER JOIN users u ON u.id = d.user_id
                  WHERE 1=1";

        if ($search !== '') {
            $query .= " AND (u.first_name LIKE :search OR u.last_name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search)";
            $queryParams['search'] = '%' . $search . '%';
        }

        if (!empty($params['status'])) {
            $query .= " AND COALESCE(d.status, 'pending') = :status";
            $queryParams['status'] = $params['status'];
        }

        if (isset($params['available']) && $params['available'] !== '') {
            // Only filter by availability if the column exists
            if (columnExists($pdo, 'drivers', 'available')) {
                $query .= " AND COALESCE(d.available, 0) = :available";
                $queryParams['available'] = (int)$params['available'];
            }
        }

        $orderBy = 'u.created_at DESC';
        if (columnExists($pdo, 'drivers', 'updated_at')) {
            $orderBy = 'd.updated_at DESC';
        } elseif (columnExists($pdo, 'drivers', 'created_at')) {
            $orderBy = 'd.created_at DESC';
        }
        $query .= " ORDER BY $orderBy LIMIT :limit OFFSET :offset";

        $stmt = $pdo->prepare($query);
        foreach ($queryParams as $k => $v) {
            $param = ':' . $k;
            if ($k === 'limit' || $k === 'offset' || $k === 'available') $stmt->bindValue($param, $v, PDO::PARAM_INT);
            else $stmt->bindValue($param, $v);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'drivers' => $rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Fallback: only users table
    $query = "SELECT id, first_name, last_name, email, phone, verified, active, created_at
              FROM users
              WHERE role IN ('livreur','delivery')";

    if ($search !== '') {
        $query .= " AND (first_name LIKE :search OR last_name LIKE :search OR email LIKE :search OR phone LIKE :search)";
        $queryParams['search'] = '%' . $search . '%';
    }

    if (isset($params['verified']) && $params['verified'] !== '') {
        $query .= " AND verified = :verified";
        $queryParams['verified'] = (int)$params['verified'];
    }

    if (isset($params['available']) && $params['available'] !== '') {
        // When drivers table doesn't exist, approximate availability by users.active
        $query .= " AND active = :available";
        $queryParams['available'] = (int)$params['available'];
    }

    $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($query);
    foreach ($queryParams as $k => $v) {
        $param = ':' . $k;
        if ($k === 'limit' || $k === 'offset' || $k === 'verified' || $k === 'available') {
            $stmt->bindValue($param, $v, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($param, $v);
        }
    }
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'drivers' => $rows], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la récupération des livreurs',
        'debug' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
