<?php
// WebSocket configuration for Titi Golden Taste
return [
    'host' => '127.0.0.1',
    'port' => 8080,
    'allowed_origins' => ['*'],
    // Secret used to sign internal messages or simple auth tokens (change in production)
    'jwt_secret' => 'CHANGE_THIS_SECRET_FOR_PRODUCTION',
    // Heartbeat interval seconds
    'heartbeat_interval' => 25,
];
