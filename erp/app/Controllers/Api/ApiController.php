<?php
declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\ApprovalService;
use App\Services\Resource;

/**
 * REST API v1 — JSON in/out, Bearer token auth.
 *
 *   POST   /api/v1/auth/token            {username, password, name?} → {token}
 *   GET    /api/v1/me
 *   GET    /api/v1/{resource}?page=&per_page=&q=&sort=&dir=&filter[col]=
 *   GET    /api/v1/{resource}/{id}
 *   POST   /api/v1/{resource}
 *   PUT    /api/v1/{resource}/{id}
 *   DELETE /api/v1/{resource}/{id}
 *   GET    /api/v1/approvals/inbox
 *   POST   /api/v1/approvals              {document_type, document_id, title, amount?}
 *   POST   /api/v1/approvals/{id}/action  {decision, comments, pin?}
 */
final class ApiController extends Controller
{
    public function token(): void
    {
        $v = Validator::make($this->request->all(), ['username' => 'required', 'password' => 'required', 'name' => 'max:100']);
        if ($v->fails()) {
            Response::json(['success' => false, 'errors' => $v->errors()], 422);
        }
        $result = \App\Core\Auth::attempt((string) $this->request->input('username'), (string) $this->request->input('password'), $this->request);
        if ($result !== true) {
            Response::json(['success' => false, 'message' => 'Invalid credentials'], 401);
        }
        $raw = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+' . (int) config('app.api_token_ttl_days', 90) . ' days'));
        Database::insert('api_tokens', [
            'user_id' => Auth::id(),
            'name' => (string) $this->request->input('name', 'api'),
            'token_hash' => hash('sha256', $raw),
            'expires_at' => $expires,
        ]);
        // API logins must not leave a web session behind
        $_SESSION = [];
        Response::json(['success' => true, 'token_type' => 'Bearer', 'token' => $raw, 'expires_at' => $expires], 201);
    }

    public function me(): void
    {
        $u = Auth::user();
        unset($u['password_hash']);
        Response::json(['success' => true, 'data' => $u, 'permissions' => Auth::isSuperAdmin() ? ['*'] : Auth::permissions()]);
    }

    public function index(string $key): void
    {
        $r = $this->resource($key, 'view');
        $perPage = max(1, min(200, (int) $this->request->input('per_page', 25)));
        $page = max(1, (int) $this->request->input('page', 1));
        $res = $r->paginate(($page - 1) * $perPage, $perPage, (string) $this->request->input('q', ''),
            $this->request->input('sort'), (string) $this->request->input('dir', 'asc'), (array) $this->request->input('filter', []));
        Response::json([
            'success' => true,
            'data' => $res['rows'],
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $res['filtered'], 'last_page' => (int) ceil($res['filtered'] / $perPage)],
        ]);
    }

    public function show(string $key, string $id): void
    {
        $r = $this->resource($key, 'view');
        $row = $r->findRecord((int) $id) ?? Response::json(['success' => false, 'message' => 'Not found'], 404);
        Response::json(['success' => true, 'data' => $row]);
    }

    public function store(string $key): void
    {
        $r = $this->resource($key, 'create');
        $data = $this->check($r, null);
        $id = $this->guard(fn () => $r->create($data));
        Response::json(['success' => true, 'data' => $r->findRecord($id)], 201);
    }

    public function update(string $key, string $id): void
    {
        $r = $this->resource($key, 'edit');
        $existing = $r->findRecord((int) $id) ?? Response::json(['success' => false, 'message' => 'Not found'], 404);
        // PUT semantics with partial support: merge onto existing record
        $input = array_merge($existing, $this->request->all());
        $data = $this->check($r, (int) $id, $input);
        $this->guard(fn () => $r->update((int) $id, $data));
        Response::json(['success' => true, 'data' => $r->findRecord((int) $id)]);
    }

    public function destroy(string $key, string $id): void
    {
        $r = $this->resource($key, 'delete');
        $ok = $this->guard(fn () => $r->delete((int) $id));
        Response::json(['success' => $ok], $ok ? 200 : 404);
    }

    public function approvalInbox(): void
    {
        Response::json(['success' => true, 'data' => ApprovalService::inbox()]);
    }

    public function approvalSubmit(): void
    {
        try {
            $id = ApprovalService::submit(
                (string) $this->request->input('document_type'),
                (int) $this->request->input('document_id'),
                (string) $this->request->input('title', 'Untitled'),
                $this->request->input('amount') !== null ? (float) $this->request->input('amount') : null,
                $this->request->input('currency'),
                $this->request->input('document_no'),
                $this->request->input('comments')
            );
        } catch (\RuntimeException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        Response::json(['success' => true, 'request_id' => $id], 201);
    }

    public function approvalAct(string $id): void
    {
        try {
            $res = ApprovalService::act((int) $id, (string) $this->request->input('decision'), $this->request->input('comments'), $this->request->input('pin'));
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        Response::json(['success' => true, 'result' => $res]);
    }

    private function resource(string $key, string $action): Resource
    {
        $r = Resource::find($key) ?? Response::json(['success' => false, 'message' => 'Unknown resource'], 404);
        if (!Auth::can($r->permission($action))) {
            Response::json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        return $r;
    }

    private function check(Resource $r, ?int $id, ?array $input = null): array
    {
        $v = Validator::make($input ?? $this->request->all(), $r->rules($id), $r->labels());
        if ($v->fails()) {
            Response::json(['success' => false, 'message' => 'Validation failed', 'errors' => $v->errors()], 422);
        }
        return array_intersect_key($input ?? $this->request->all(), $r->fields);
    }

    private function guard(callable $fn): mixed
    {
        try {
            return $fn();
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::json(['success' => false, 'message' => 'Integrity constraint violation (duplicate or referenced record).'], 409);
            }
            throw $e;
        }
    }
}
