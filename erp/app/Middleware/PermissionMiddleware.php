<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;

/** Usage: 'permission:user.view' */
final class PermissionMiddleware
{
    public function handle(Request $request, ?string $permission = null): void
    {
        if ($permission && !Auth::can($permission)) {
            Response::abort(403, 'You do not have permission to access this resource.');
        }
    }
}
