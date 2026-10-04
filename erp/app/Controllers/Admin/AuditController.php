<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;

final class AuditController extends Controller
{
    public function index(): void
    {
        $this->authorize('audit.view');
        $this->view('audit/index', [
            'title' => __('audit_trail'),
            'tables' => array_column(Database::fetchAll('SELECT DISTINCT table_name FROM audit_logs WHERE company_id = ? ORDER BY table_name', [Auth::companyId()]), 'table_name'),
            'users' => Database::fetchAll('SELECT id, full_name FROM users WHERE company_id = ? ORDER BY full_name', [Auth::companyId()]),
        ]);
    }

    public function data(): void
    {
        $this->authorize('audit.view');
        $where = ['a.company_id = ?'];
        $bind = [Auth::companyId()];
        $total = (int) Database::value('SELECT COUNT(*) FROM audit_logs a WHERE a.company_id = ?', $bind);

        $f = (array) $this->request->input('filter', []);
        foreach (['table_name' => 'a.table_name', 'user_id' => 'a.user_id', 'action' => 'a.action', 'record_id' => 'a.record_id'] as $k => $col) {
            if (($f[$k] ?? '') !== '') {
                $where[] = "$col = ?";
                $bind[] = $f[$k];
            }
        }
        if (($f['from'] ?? '') !== '') { $where[] = 'a.created_at >= ?'; $bind[] = $f['from'] . ' 00:00:00'; }
        if (($f['to'] ?? '') !== '') { $where[] = 'a.created_at <= ?'; $bind[] = $f['to'] . ' 23:59:59'; }
        $search = trim((string) ($this->request->input('search')['value'] ?? ''));
        if ($search !== '') {
            $where[] = '(a.ip_address LIKE ? OR a.url LIKE ? OR u.full_name LIKE ?)';
            array_push($bind, "%$search%", "%$search%", "%$search%");
        }
        $w = implode(' AND ', $where);
        $filtered = (int) Database::value("SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE $w", $bind);
        $rows = Database::fetchAll(
            "SELECT a.id, a.created_at, a.action, a.table_name, a.record_id, a.ip_address, a.old_values, a.new_values, u.full_name
               FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE $w ORDER BY a.id DESC
              LIMIT " . max(1, min(500, (int) $this->request->input('length', 50))) . ' OFFSET ' . max(0, (int) $this->request->input('start', 0)),
            $bind
        );
        Response::json(['draw' => (int) $this->request->input('draw'), 'recordsTotal' => $total, 'recordsFiltered' => $filtered, 'data' => $rows]);
    }

    public function logins(): void
    {
        $this->authorize('audit.view');
        $rows = Database::fetchAll(
            'SELECT h.*, u.full_name FROM login_history h LEFT JOIN users u ON u.id = h.user_id
              WHERE h.user_id IS NULL OR u.company_id = ? ORDER BY h.id DESC LIMIT 200',
            [Auth::companyId()]
        );
        $this->view('audit/logins', ['title' => 'Login History', 'rows' => $rows]);
    }
}
