<?php
declare(strict_types=1);

namespace App\Core;

/** PSR-4 style autoloader mapping the App\ namespace to /app. */
final class Autoloader
{
    public static function register(string $appDir): void
    {
        spl_autoload_register(static function (string $class) use ($appDir): void {
            if (!str_starts_with($class, 'App\\')) {
                return;
            }
            $file = $appDir . '/' . str_replace('\\', '/', substr($class, 4)) . '.php';
            if (is_file($file)) {
                require $file;
            }
        });
    }
}
