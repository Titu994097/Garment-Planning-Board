<?php
declare(strict_types=1);

namespace App\Core;

final class App
{
    public function __construct(private readonly string $basePath)
    {
        require_once $basePath . '/app/Core/helpers.php';
        Config::load($basePath);
        date_default_timezone_set((string) Config::get('app.timezone', 'UTC'));
        $this->registerErrorHandling();
    }

    public function run(): void
    {
        $request = new Request();
        $isApi = str_starts_with($request->path(), '/api/');
        if ($isApi) {
            $_SESSION = []; // stateless: token auth only, no cookie
        } else {
            Session::start();
        }
        if (isset($_GET['lang'])) {
            $_SESSION['locale'] = preg_replace('/[^a-z]/', '', (string) $_GET['lang']);
        }
        Lang::load($this->basePath, $_SESSION['locale'] ?? (string) Config::get('app.locale', 'en'));

        $this->sendSecurityHeaders();

        $router = new Router();
        require $this->basePath . '/routes/' . ($isApi ? 'api.php' : 'web.php');
        $router->dispatch($request);
    }

    private function sendSecurityHeaders(): void
    {
        if (headers_sent()) {
            return;
        }
        header('X-Frame-Options: SAMEORIGIN');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    }

    private function registerErrorHandling(): void
    {
        $debug = (bool) Config::get('app.debug', false);
        error_reporting(E_ALL);
        ini_set('display_errors', $debug ? '1' : '0');

        set_exception_handler(function (\Throwable $e) use ($debug): void {
            $log = sprintf("[%s] %s: %s in %s:%d\n%s\n", date('c'), $e::class, $e->getMessage(), $e->getFile(), $e->getLine(), $e->getTraceAsString());
            @file_put_contents($this->basePath . '/storage/logs/app-' . date('Y-m-d') . '.log', $log, FILE_APPEND);
            http_response_code(500);
            if ($debug) {
                echo '<pre>' . htmlspecialchars($log) . '</pre>';
                return;
            }
            echo 'An unexpected error occurred. Reference: ' . date('YmdHis');
        });
    }
}
