<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;

final class AuthMiddleware
{
    public function handle(Request $request, ?string $arg = null): void
    {
        if (!Auth::check()) {
            if ($request->isAjax()) {
                Response::json(['success' => false, 'message' => 'Session expired'], 401);
            }
            $_SESSION['_intended'] = $request->path();
            Response::redirect('login');
        }
        $user = Auth::user();
        if (!empty($user['must_change_password']) && !in_array($request->path(), ['/profile/password', '/logout'], true)) {
            Response::redirect('profile/password');
        }
    }
}
