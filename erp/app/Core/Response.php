<?php
declare(strict_types=1);

namespace App\Core;

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function redirect(string $path): never
    {
        header('Location: ' . (str_starts_with($path, 'http') ? $path : url($path)));
        exit;
    }

    public static function back(): never
    {
        $ref = $_SERVER['HTTP_REFERER'] ?? url('/');
        // only allow same-host referers to prevent open redirects
        $host = parse_url($ref, PHP_URL_HOST);
        if ($host !== null && $host !== ($_SERVER['HTTP_HOST'] ?? null)) {
            $ref = url('/');
        }
        header('Location: ' . $ref);
        exit;
    }

    public static function abort(int $status, string $message = ''): never
    {
        http_response_code($status);
        $req = new Request();
        if ($req->isAjax() || str_starts_with($req->path(), '/api/')) {
            self::json(['success' => false, 'message' => $message ?: 'Error ' . $status], $status);
        }
        View::render('errors/error', ['status' => $status, 'message' => $message], 'blank');
        exit;
    }
}
