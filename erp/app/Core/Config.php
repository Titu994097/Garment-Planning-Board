<?php
declare(strict_types=1);

namespace App\Core;

/** Dot-notation access to /config/*.php arrays, with .env overrides. */
final class Config
{
    private static array $items = [];
    private static string $path = '';

    public static function load(string $basePath): void
    {
        self::$path = $basePath . '/config';
        self::loadEnv($basePath . '/.env');
        foreach (glob(self::$path . '/*.php') as $file) {
            self::$items[basename($file, '.php')] = require $file;
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $value = self::$items;
        foreach (explode('.', $key) as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }
        return $value;
    }

    private static function loadEnv(string $file): void
    {
        if (!is_file($file)) {
            return;
        }
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                continue;
            }
            [$k, $v] = array_map('trim', explode('=', $line, 2));
            $v = trim($v, "\"'");
            $_ENV[$k] = $v;
            putenv("$k=$v");
        }
    }
}

