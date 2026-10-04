<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuditLogger;
use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;
use App\Core\Session;

final class ProfileController extends Controller
{
    public function password(): void
    {
        $this->view('auth/password', ['title' => 'Change Password']);
    }

    public function updatePassword(): void
    {
        $data = $this->validate(['current_password' => 'required', 'password' => 'required|password|confirmed']);
        $user = Auth::user();
        if (!password_verify($data['current_password'], $user['password_hash'])) {
            Response::json(['success' => false, 'message' => 'Current password is incorrect.', 'errors' => ['current_password' => 'Incorrect password']], 422);
        }
        if (password_verify($data['password'], $user['password_hash'])) {
            Response::json(['success' => false, 'message' => 'New password must differ from the current one.', 'errors' => ['password' => 'Choose a different password']], 422);
        }
        Database::update('users', [
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            'must_change_password' => 0,
            'password_changed_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [$user['id']]);
        AuditLogger::log('password_change', 'users', (int) $user['id']);
        Session::regenerate();
        $this->success('Password changed.', 'dashboard');
    }

    /** Switch active company for users with multi-company access. */
    public function switchCompany(): void
    {
        $cid = (int) $this->request->input('company_id');
        $allowed = Auth::isSuperAdmin()
            ? Database::value('SELECT 1 FROM companies WHERE id = ? AND deleted_at IS NULL AND status = "active"', [$cid])
            : ($cid === (int) Auth::user()['company_id'] || Database::value('SELECT 1 FROM user_company_access WHERE user_id = ? AND company_id = ?', [Auth::id(), $cid]));
        if (!$allowed) {
            Response::abort(403, 'No access to that company.');
        }
        $_SESSION['company_id'] = $cid;
        AuditLogger::log('switch_company', 'companies', $cid);
        Response::redirect('dashboard');
    }

    /** Issue a personal REST API token (shown once). */
    public function createToken(): void
    {
        $data = $this->validate(['name' => 'required|max:100']);
        $raw = bin2hex(random_bytes(32));
        $id = Database::insert('api_tokens', [
            'user_id' => Auth::id(),
            'name' => $data['name'],
            'token_hash' => hash('sha256', $raw),
            'expires_at' => date('Y-m-d H:i:s', strtotime('+' . (int) config('app.api_token_ttl_days', 90) . ' days')),
        ]);
        AuditLogger::log('api_token_create', 'api_tokens', $id);
        Response::json(['success' => true, 'token' => $raw, 'message' => 'Copy this token now — it will not be shown again.']);
    }
}
