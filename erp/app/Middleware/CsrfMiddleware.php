<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Csrf;
use App\Core\Request;
use App\Core\Response;

final class CsrfMiddleware
{
    public function handle(Request $request, ?string $arg = null): void
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        $token = $request->input('_token') ?? $request->header('X-CSRF-TOKEN');
        if (!Csrf::verify($token)) {
            Response::abort(419, 'Your session has expired. Please refresh and try again.');
        }
    }
}
