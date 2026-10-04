<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Session authentication + RBAC.
 * Permissions are slugs like "company.view", "user.create"; super admins bypass checks.
 */
final class Auth
{
    private static ?array $user = null;
    private static ?array $permissions = null;

    public static function attempt(string $username, string $password, Request $req): bool|string
    {
        $user = Database::fetch(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND deleted_at IS NULL LIMIT 1',
            [$username, $username]
        );
        $maxAttempts = (int) Config::get('app.max_login_attempts', 5);

        if (!$user) {
            self::logLogin(null, $username, false, $req);
            return 'invalid';
        }
        if ($user['locked_until'] !== null && strtotime($user['locked_until']) > time()) {
            return 'locked';
        }
        if ($user['status'] !== 'active') {
            return 'inactive';
        }
        if (!password_verify($password, $user['password_hash'])) {
            $fails = (int) $user['failed_attempts'] + 1;
            Database::update('users', [
                'failed_attempts' => $fails,
                'locked_until' => $fails >= $maxAttempts ? date('Y-m-d H:i:s', time() + 900) : null,
            ], 'id = ?', [$user['id']]);
            self::logLogin((int) $user['id'], $username, false, $req);
            return 'invalid';
        }
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            Database::update('users', ['password_hash' => password_hash($password, PASSWORD_DEFAULT)], 'id = ?', [$user['id']]);
        }
        Database::update('users', [
            'failed_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => date('Y-m-d H:i:s'),
            'last_login_ip' => $req->ip(),
        ], 'id = ?', [$user['id']]);

        Session::regenerate();
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['company_id'] = (int) $user['company_id'];
        $_SESSION['factory_id'] = $user['factory_id'] ? (int) $user['factory_id'] : null;
        self::logLogin((int) $user['id'], $username, true, $req);
        AuditLogger::log('login', 'users', (int) $user['id']);
        return true;
    }

    public static function loginById(int $id): void
    {
        $_SESSION['user_id'] = $id;
        self::$user = null;
        self::$permissions = null;
        $u = self::user();
        $_SESSION['company_id'] = (int) ($u['company_id'] ?? 0);
    }

    public static function logout(): void
    {
        if (self::check()) {
            AuditLogger::log('logout', 'users', self::id());
        }
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public static function check(): bool
    {
        return self::user() !== null;
    }

    public static function id(): ?int
    {
        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : (self::$user['id'] ?? null);
    }

    public static function user(): ?array
    {
        if (self::$user === null && !empty($_SESSION['user_id'])) {
            self::$user = Database::fetch(
                'SELECT u.*, c.name AS company_name, c.base_currency
                   FROM users u LEFT JOIN companies c ON c.id = u.company_id
                  WHERE u.id = ? AND u.deleted_at IS NULL AND u.status = "active"',
                [$_SESSION['user_id']]
            );
        }
        return self::$user;
    }

    /** Used by API token auth to set the user for one request. */
    public static function setUser(array $user): void
    {
        self::$user = $user;
        self::$permissions = null;
        $_SESSION['company_id'] = (int) $user['company_id'];
    }

    public static function companyId(): int
    {
        return (int) ($_SESSION['company_id'] ?? self::user()['company_id'] ?? 0);
    }

    public static function isSuperAdmin(): bool
    {
        return (bool) (self::user()['is_super_admin'] ?? false);
    }

    public static function permissions(): array
    {
        if (self::$permissions === null) {
            self::$permissions = [];
            if ($id = self::user()['id'] ?? null) {
                $rows = Database::fetchAll(
                    'SELECT DISTINCT p.slug FROM permissions p
                       JOIN role_permissions rp ON rp.permission_id = p.id
                       JOIN user_roles ur ON ur.role_id = rp.role_id
                       JOIN roles r ON r.id = ur.role_id AND r.status = "active"
                      WHERE ur.user_id = ?',
                    [$id]
                );
                self::$permissions = array_column($rows, 'slug');
            }
        }
        return self::$permissions;
    }

    public static function can(string $permission): bool
    {
        if (!self::check()) {
            return false;
        }
        return self::isSuperAdmin() || in_array($permission, self::permissions(), true);
    }

    private static function logLogin(?int $userId, string $username, bool $success, Request $req): void
    {
        Database::insert('login_history', [
            'user_id' => $userId,
            'username' => substr($username, 0, 100),
            'success' => (int) $success,
            'ip_address' => $req->ip(),
            'user_agent' => $req->userAgent(),
        ]);
    }
}
