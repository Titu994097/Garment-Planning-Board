<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Minimal router supporting {param} placeholders, route groups and middleware.
 */
final class Router
{
    private array $routes = [];
    private array $groupStack = [];

    public function get(string $path, array|callable $handler, array $mw = []): void { $this->add('GET', $path, $handler, $mw); }
    public function post(string $path, array|callable $handler, array $mw = []): void { $this->add('POST', $path, $handler, $mw); }
    public function put(string $path, array|callable $handler, array $mw = []): void { $this->add('PUT', $path, $handler, $mw); }
    public function delete(string $path, array|callable $handler, array $mw = []): void { $this->add('DELETE', $path, $handler, $mw); }

    public function group(array $attrs, callable $fn): void
    {
        $this->groupStack[] = $attrs;
        $fn($this);
        array_pop($this->groupStack);
    }

    private function add(string $method, string $path, array|callable $handler, array $mw): void
    {
        $prefix = '';
        $groupMw = [];
        foreach ($this->groupStack as $g) {
            $prefix .= '/' . trim($g['prefix'] ?? '', '/');
            $groupMw = [...$groupMw, ...($g['middleware'] ?? [])];
        }
        $full = '/' . trim(preg_replace('#/+#', '/', $prefix . '/' . trim($path, '/')), '/');
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $full) . '$#';
        $this->routes[] = compact('method', 'full', 'regex', 'handler') + ['middleware' => [...$groupMw, ...$mw]];
    }

    public function dispatch(Request $request): void
    {
        $method = $request->method();
        $path = $request->path();
        $allowed = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $m)) {
                continue;
            }
            $allowed = true;
            if ($route['method'] !== $method) {
                continue;
            }
            $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            foreach ($route['middleware'] as $mw) {
                [$name, $arg] = array_pad(explode(':', $mw, 2), 2, null);
                $class = 'App\\Middleware\\' . ucfirst($name) . 'Middleware';
                (new $class())->handle($request, $arg);
            }
            $handler = $route['handler'];
            if (is_callable($handler)) {
                $handler($request, ...array_values($params));
                return;
            }
            [$class, $action] = $handler;
            (new $class($request))->$action(...array_values($params));
            return;
        }
        Response::abort($allowed ? 405 : 404, $allowed ? 'Method not allowed' : 'Page not found');
    }
}
