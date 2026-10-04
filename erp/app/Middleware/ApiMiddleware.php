<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Auth;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

/**
 * Bearer-token authentication for the REST API.
 * Tokens are stored as SHA-256 hashes in api_tokens; the raw token is shown once at creation.
 */
final class ApiMiddleware
{
    public function handle(Request $request, ?string $arg = null): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $auth = $request->header('Authorization') ?? '';
        if (!preg_match('/^Bearer\s+(\S+)$/i', $auth, $m)) {
            Response::json(['success' => false, 'message' => 'Missing bearer token'], 401);
        }
        $row = Database::fetch(
            'SELECT t.id AS token_id, u.* FROM api_tokens t JOIN users u ON u.id = t.user_id
              WHERE t.token_hash = ? AND t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at > NOW())
                AND u.status = "active" AND u.deleted_at IS NULL',
            [hash('sha256', $m[1])]
        );
        if (!$row) {
            Response::json(['success' => false, 'message' => 'Invalid or expired token'], 401);
        }
        Database::query('UPDATE api_tokens SET last_used_at = NOW() WHERE id = ?', [$row['token_id']]);
        unset($row['token_id']);
        Auth::setUser($row);
    }
}
