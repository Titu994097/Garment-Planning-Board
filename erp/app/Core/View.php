<?php
declare(strict_types=1);

namespace App\Core;

final class View
{
    private static array $stack = [];

    /** Queue page-specific script markup to be printed at the end of the layout. */
    public static function push(string $html): void
    {
        self::$stack[] = $html;
    }

    public static function stack(): string
    {
        return implode("\n", self::$stack);
    }

    public static function render(string $view, array $data = [], ?string $layout = 'main'): void
    {
        echo self::make($view, $data, $layout);
    }

    public static function make(string $view, array $data = [], ?string $layout = 'main'): string
    {
        $content = self::capture(self::path($view), $data);
        if ($layout === null) {
            return $content;
        }
        return self::capture(self::path('layouts/' . $layout), [...$data, 'content' => $content]);
    }

    public static function partial(string $view, array $data = []): string
    {
        return self::capture(self::path($view), $data);
    }

    private static function path(string $view): string
    {
        $file = BASE_PATH . '/app/Views/' . str_replace('.', '/', $view) . '.php';
        if (!is_file($file)) {
            throw new \RuntimeException("View [$view] not found.");
        }
        return $file;
    }

    private static function capture(string $__file, array $__data): string
    {
        extract($__data, EXTR_SKIP);
        ob_start();
        require $__file;
        return (string) ob_get_clean();
    }
}
