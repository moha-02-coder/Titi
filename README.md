Titi Golden Taste — Installation & Run (local WAMP/XAMPP)
=====================================================

Quick start (Windows, WAMP/XAMPP):

1) Import the database:

   - Open phpMyAdmin or MySQL CLI and import `backend/init.sql`.

2) Configure database:

   - Edit `backend/config/database.php` and set your local MySQL credentials (host, user, pass, dbname `titi`).

3) Set real bcrypt passwords for test accounts (recommended):

   - Run this small PHP one-liner from project root to set passwords for demo accounts:

```bash
php -r "require 'backend/config/database.php';\$db = (function(){include 'backend/config/database.php'; return (isset($pdo) ? $pdo : null);})(); if(!\$db) exit('Configure database.php first');\$pdo= new PDO(DSN, DB_USER, DB_PASS);\$stmt=\$pdo->prepare('UPDATE users SET password = ? WHERE email = ?');\$stmt->execute([password_hash('admin123', PASSWORD_BCRYPT),'admin@titi-golden-taste.ci']);\$stmt->execute([password_hash('client123', PASSWORD_BCRYPT),'client@email.com']); echo "Passwords set.\n";"
```

4) Run the WebSocket server (for real-time chat & notifications):

```bash
php -q backend/websocket-server/server.php
```

5) Place the project in your webroot (e.g., `c:/wamp64/www/titi-golden-taste`) and open `http://localhost/titi-golden-taste`.

Notes & next steps
- The included WebSocket server is a simple demo server for local development only. For production, use a robust solution and TLS.
- Configure `backend/config/websocket.php` to match your environment and set a secure `jwt_secret`.
- The API endpoints are in `backend/api/` (skeletons). Implement JWT auth using `password_verify()` and `password_hash()`.
- See `backend/init.sql` for seed accounts and demo data.

Test accounts (after you run the PHP password helper):
- Admin: admin@titi-golden-taste.ci / admin123
- Client: client@email.com / client123
