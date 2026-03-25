<?php
/**
 * Compatibility alias: some frontend scripts call /backend/api/menu/list.php
 * This endpoint mirrors /backend/api/menu/all.php.
 */

require_once __DIR__ . '/all.php';
