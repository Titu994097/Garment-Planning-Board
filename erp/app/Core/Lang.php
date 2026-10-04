<?php
declare(strict_types=1);

namespace App\Core;

/** Simple key => string translation catalogue loaded from /lang/{locale}.php */
final class Lang
{
    private static array $lines = [];
    private static string $locale = 'en';

    public static function load(string $basePath, string $locale): void
    {
        $available = (array) Config::get('app.locales', ['en' => 'English']);
        self::$locale = array_key_exists($locale, $available) ? $locale : 'en';
        $fallback = require $basePath . '/lang/en.php';
        $file = $basePath . '/lang/' . self::$locale . '.php';
        self::$lines = self::$locale !== 'en' && is_file($file) ? array_merge($fallback, require $file) : $fallback;
    }

    public static function locale(): string
    {
        return self::$locale;
    }

    public static function get(string $key, array $replace = []): string
    {
        $line = self::$lines[$key] ?? ucwords(str_replace(['_', '.'], ' ', $key));
        foreach ($replace as $k => $v) {
            $line = str_replace(':' . $k, (string) $v, $line);
        }
        return $line;
    }
}
