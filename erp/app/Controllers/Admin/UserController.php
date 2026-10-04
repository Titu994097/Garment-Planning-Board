<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\AuditLogger;
use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;

final class UserController extends Controller
{
    public function index(): void
    {
        $this->authorize('users.view');
        $this->view('users/index', ['title' => __('user_management')]);
    }

    public function data(): void
    {
        $this->authorize('users.view');
        $cid = Auth::companyId();
        $search = trim((string) ($this->request->input('search')['value'] ?? ''));
        $where = 'u.company_id = ? AND u.deleted_at IS NULL';
        $bind = [$cid];
        $total = (int) Database::value("SELECT COUNT(*) FROM users u WHERE $where", $bind);
        if ($search !== '') {
            $where .= ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ?)';
            array_push($bind, ...array_fill(0, 4, "%$search%"));
        }
        $filtered = (int) Database::value("SELECT COUNT(*) FROM users u WHERE $where", $bind);
        $cols = ['u.employee_code', 'u.full_name', 'u.username', 'u.email', 'd.name', 'roles', 'u.last_login_at', 'u.status'];
        $oc = $cols[(int) ($this->request->input('order')[0]['column'] ?? 1)] ?? 'u.full_name';
        $dir = ($this->request->input('order')[0]['dir'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';
        $rows = Database::fetchAll(
            "SELECT u.id, u.employee_code, u.full_name, u.username, u.email, u.designation, u.status, u.last_login_at,
                    u.is_super_admin, u.locked_until, d.name AS department,
                    (SELECT GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ', ') FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id) AS roles
               FROM users u LEFT JOIN departments d ON d.id = u.department_id
              WHERE $where ORDER BY $oc $dir LIMIT " . max(1, min(500, (int) $this->request->input('length', 25))) . ' OFFSET ' . max(0, (int) $this->request->input('start', 0)),
            $bind
        );
        Response::json(['draw' => (int) $this->request->input('draw'), 'recordsTotal' => $total, 'recordsFiltered' => $filtered, 'data' => $rows]);
    }

    public function create(): void
    {
        $this->authorize('users.create');
        $this->view('users/form', ['title' => 'New User', 'user' => [], 'userRoles' => []] + $this->lookups());
    }

    public function store(): void
    {
        $this->authorize('users.create');
        $data = $this->validate($this->rules(null));
        $roles = $this->allowedRoles((array) $this->request->input('roles', []));

        Database::transaction(function () use ($data, $roles) {
            $row = $this->payload($data) + [
                'company_id' => Auth::companyId(),
                'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
                'must_change_password' => $this->request->input('must_change_password') ? 1 : 0,
                'password_changed_at' => date('Y-m-d H:i:s'),
                'created_by' => Auth::id(),
            ];
            $id = Database::insert('users', $row);
            $this->syncRoles($id, $roles);
            AuditLogger::log('create', 'users', $id, null, $row + ['roles' => implode(',', $roles)]);
            return $id;
        });
        $this->success('User created successfully.', 'admin/users');
    }

    public function edit(string $id): void
    {
        $this->authorize('users.edit');
        $user = $this->findUser((int) $id);
        $userRoles = array_column(Database::fetchAll('SELECT role_id FROM user_roles WHERE user_id = ?', [$id]), 'role_id');
        $this->view('users/form', ['title' => 'Edit User', 'user' => $user, 'userRoles' => $userRoles] + $this->lookups());
    }

    public function update(string $id): void
    {
        $this->authorize('users.edit');
        $old = $this->findUser((int) $id);
        $data = $this->validate($this->rules((int) $id));
        $roles = $this->allowedRoles((array) $this->request->input('roles', []));

        Database::transaction(function () use ($id, $data, $roles, $old) {
            $row = $this->payload($data) + ['updated_by' => Auth::id()];
            if (!empty($data['password'])) {
                $row['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
                $row['password_changed_at'] = date('Y-m-d H:i:s');
                $row['must_change_password'] = $this->request->input('must_change_password') ? 1 : 0;
            }
            Database::update('users', $row, 'id = ?', [$id]);
            $this->syncRoles((int) $id, $roles);
            AuditLogger::log('update', 'users', (int) $id, $old, $row);
        });
        $this->success('User updated successfully.', 'admin/users');
    }

    public function destroy(string $id): void
    {
        $this->authorize('users.delete');
        $user = $this->findUser((int) $id);
        if ((int) $id === Auth::id()) {
            Response::json(['success' => false, 'message' => 'You cannot delete your own account.'], 422);
        }
        Database::update('users', ['deleted_at' => date('Y-m-d H:i:s'), 'status' => 'inactive'], 'id = ?', [$id]);
        Database::query('UPDATE api_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [$id]);
        AuditLogger::log('delete', 'users', (int) $id, $user);
        $this->success('User deleted.', 'admin/users');
    }

    public function unlock(string $id): void
    {
        $this->authorize('users.edit');
        $this->findUser((int) $id);
        Database::update('users', ['failed_attempts' => 0, 'locked_until' => null], 'id = ?', [$id]);
        AuditLogger::log('unlock', 'users', (int) $id);
        $this->success('User account unlocked.', 'admin/users');
    }

    private function findUser(int $id): array
    {
        return Database::fetch('SELECT * FROM users WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [$id, Auth::companyId()])
            ?? Response::abort(404, 'User not found');
    }

    private function rules(?int $id): array
    {
        $idParam = $id ?? 'NULL';
        return [
            'full_name' => 'required|max:150',
            'username' => "required|min:3|max:60|regex:/^[a-zA-Z0-9._-]+$/|unique:users,username,$idParam",
            'email' => "required|email|max:150|unique:users,email,$idParam",
            'employee_code' => 'max:30',
            'phone' => 'max:40',
            'designation' => 'max:100',
            'factory_id' => 'exists:factories,id',
            'department_id' => 'exists:departments,id',
            'locale' => 'required|in:' . implode(',', array_keys((array) config('app.locales'))),
            'status' => 'required|in:active,inactive,suspended',
            'password' => ($id ? '' : 'required|') . 'password|confirmed',
        ];
    }

    private function payload(array $d): array
    {
        $nullable = static fn ($v) => ($v === '' || $v === null) ? null : $v;
        return [
            'full_name' => trim($d['full_name']),
            'username' => strtolower(trim($d['username'])),
            'email' => strtolower(trim($d['email'])),
            'employee_code' => $nullable($d['employee_code'] ?? null),
            'phone' => $nullable($d['phone'] ?? null),
            'designation' => $nullable($d['designation'] ?? null),
            'factory_id' => $this->ownedId('factories', $nullable($d['factory_id'] ?? null)),
            'department_id' => $this->ownedId('departments', $nullable($d['department_id'] ?? null)),
            'locale' => $d['locale'],
            'status' => $d['status'],
        ];
    }

    /** Reject references to another company's factory / department. */
    private function ownedId(string $table, mixed $id): ?int
    {
        if ($id === null) {
            return null;
        }
        $ok = Database::value("SELECT 1 FROM `$table` WHERE id = ? AND company_id = ?", [$id, Auth::companyId()]);
        return $ok ? (int) $id : null;
    }

    /** Only roles visible to this company may be assigned. */
    private function allowedRoles(array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if (!$ids) {
            return [];
        }
        $in = implode(',', array_fill(0, count($ids), '?'));
        $rows = Database::fetchAll("SELECT id FROM roles WHERE id IN ($in) AND (company_id IS NULL OR company_id = ?)", [...$ids, Auth::companyId()]);
        return array_map('intval', array_column($rows, 'id'));
    }

    private function syncRoles(int $userId, array $roleIds): void
    {
        Database::query('DELETE FROM user_roles WHERE user_id = ?', [$userId]);
        foreach ($roleIds as $rid) {
            Database::insert('user_roles', ['user_id' => $userId, 'role_id' => $rid]);
        }
    }

    private function lookups(): array
    {
        $cid = Auth::companyId();
        return [
            'factories' => Database::fetchAll('SELECT id, name FROM factories WHERE company_id = ? AND deleted_at IS NULL ORDER BY name', [$cid]),
            'departments' => Database::fetchAll('SELECT id, name FROM departments WHERE company_id = ? AND deleted_at IS NULL ORDER BY name', [$cid]),
            'roles' => Database::fetchAll("SELECT id, name, description FROM roles WHERE (company_id IS NULL OR company_id = ?) AND status = 'active' ORDER BY name", [$cid]),
        ];
    }
}
