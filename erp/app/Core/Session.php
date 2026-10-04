<?php
declare(strict_types=1);

namespace App\Core;

/** Hardened session bootstrap. */
final class Session
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE || PHP_SAPI === 'cli') {
            return;
        }
        session_name((string) Config::get('app.session_name', 'GTERPSESSID'));
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();

        $timeout = (int) Config::get('app.session_timeout', 1800);
        if (isset($_SESSION['_last']) && time() - $_SESSION['_last'] > $timeout) {
            session_unset();
            session_regenerate_id(true);
        }
        $_SESSION['_last'] = time();
    }

    public static function flash(string $type, string $message): void
    {
        $_SESSION['_flash'][$type] = $message;
    }

    public static function regenerate(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
    }
}
