<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\AuditLogger;
use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;

/** Roles and the role × permission matrix. */
final class RoleController extends Controller
{
    public function index(): void
    {
        $this->authorize('roles.view');
        $roles = Database::fetchAll(
            'SELECT r.*, (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS users,
                    (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS perms
               FROM roles r WHERE r.company_id IS NULL OR r.company_id = ? ORDER BY r.is_system DESC, r.name',
            [Auth::companyId()]
        );
        $this->view('roles/index', ['title' => __('roles_permissions'), 'roles' => $roles]);
    }

    public function store(): void
    {
        $this->authorize('roles.create');
        $data = $this->validate(['name' => 'required|max:100', 'description' => 'max:255']);
        $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($data['name'])), '-');
        if (Database::value('SELECT 1 FROM roles WHERE slug = ? AND (company_id = ? OR company_id IS NULL)', [$slug, Auth::companyId()])) {
            Response::json(['success' => false, 'message' => 'A role with this name already exists.', 'errors' => ['name' => 'Duplicate role']], 422);
        }
        $id = Database::insert('roles', [
            'company_id' => Auth::companyId(),
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
            'created_by' => Auth::id(),
        ]);
        AuditLogger::log('create', 'roles', $id, null, $data);
        $this->success('Role created.', 'admin/roles/' . $id . '/permissions');
    }

    public function permissions(string $id): void
    {
        $this->authorize('roles.view');
        $role = $this->findRole((int) $id);
        $perms = Database::fetchAll('SELECT * FROM permissions ORDER BY module, resource, FIELD(action,"view","create","edit","delete","export","approve")');
        $matrix = [];
        foreach ($perms as $p) {
            $matrix[$p['module']][$p['resource']][$p['action']] = $p;
        }
        $assigned = array_map('intval', array_column(Database::fetchAll('SELECT permission_id FROM role_permissions WHERE role_id = ?', [$id]), 'permission_id'));
        $actions = array_values(array_unique(array_column($perms, 'action')));
        $this->view('roles/permissions', compact('role', 'matrix', 'assigned', 'actions') + ['title' => 'Permissions: ' . $role['name']]);
    }

    public function savePermissions(string $id): void
    {
        $this->authorize('roles.edit');
        $role = $this->findRole((int) $id);
        if ($role['slug'] === 'super-admin') {
            Response::abort(422, 'The Super Admin role always has every permission.');
        }
        $ids = array_map('intval', (array) $this->request->input('permissions', []));
        $before = array_column(Database::fetchAll('SELECT p.slug FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?', [$id]), 'slug');

        Database::transaction(function () use ($id, $ids) {
            Database::query('DELETE FROM role_permissions WHERE role_id = ?', [$id]);
            if ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                Database::query("INSERT INTO role_permissions (role_id, permission_id) SELECT ?, id FROM permissions WHERE id IN ($in)", [$id, ...$ids]);
            }
        });
        $after = array_column(Database::fetchAll('SELECT p.slug FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?', [$id]), 'slug');
        AuditLogger::log('permissions_update', 'roles', (int) $id,
            ['revoked' => implode(',', array_diff($before, $after))],
            ['granted' => implode(',', array_diff($after, $before))]
        );
        $this->success('Permissions saved for ' . $role['name'] . '.', 'admin/roles/' . $id . '/permissions');
    }

    public function destroy(string $id): void
    {
        $this->authorize('roles.delete');
        $role = $this->findRole((int) $id);
        if ($role['is_system'] || $role['company_id'] === null) {
            Response::json(['success' => false, 'message' => 'System roles cannot be deleted.'], 422);
        }
        if ((int) Database::value('SELECT COUNT(*) FROM user_roles WHERE role_id = ?', [$id]) > 0) {
            Response::json(['success' => false, 'message' => 'Role is assigned to users. Unassign it first.'], 422);
        }
        Database::query('DELETE FROM roles WHERE id = ?', [$id]);
        AuditLogger::log('delete', 'roles', (int) $id, $role);
        $this->success('Role deleted.', 'admin/roles');
    }

    private function findRole(int $id): array
    {
        return Database::fetch('SELECT * FROM roles WHERE id = ? AND (company_id IS NULL OR company_id = ?)', [$id, Auth::companyId()])
            ?? Response::abort(404, 'Role not found');
    }
}
