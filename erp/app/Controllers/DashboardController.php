<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;
use App\Services\ApprovalService;

final class DashboardController extends Controller
{
    public function index(): void
    {
        $this->view('dashboard/index', [
            'title' => __('dashboard'),
            'stats' => $this->stats(),
            'inbox' => array_slice(ApprovalService::inbox(), 0, 6),
            'fiscal' => Database::fetch("SELECT * FROM fiscal_years WHERE company_id = ? AND is_current = 1 AND deleted_at IS NULL", [Auth::companyId()]),
            'holidays' => Database::fetchAll(
                "SELECT title, start_date, end_date, holiday_type FROM holidays
                  WHERE company_id = ? AND deleted_at IS NULL AND status = 'active' AND end_date >= CURDATE()
                  ORDER BY start_date LIMIT 6",
                [Auth::companyId()]
            ),
            'recent' => can('audit.view') ? Database::fetchAll(
                'SELECT a.action, a.table_name, a.record_id, a.created_at, u.full_name FROM audit_logs a
                   LEFT JOIN users u ON u.id = a.user_id WHERE a.company_id = ? ORDER BY a.id DESC LIMIT 8',
                [Auth::companyId()]
            ) : [],
        ]);
    }

    /** JSON feed for dashboard charts. */
    public function charts(): void
    {
        $cid = Auth::companyId();
        Response::json([
            'capacity' => Database::fetchAll(
                "SELECT f.name, COALESCE(f.daily_capacity_pcs,0) AS capacity,
                        (SELECT COUNT(*) FROM production_units p WHERE p.factory_id = f.id AND p.deleted_at IS NULL) AS units
                   FROM factories f WHERE f.company_id = ? AND f.deleted_at IS NULL ORDER BY f.name",
                [$cid]
            ),
            'unitTypes' => Database::fetchAll(
                "SELECT unit_type AS label, COUNT(*) AS total FROM production_units
                  WHERE company_id = ? AND deleted_at IS NULL GROUP BY unit_type ORDER BY total DESC",
                [$cid]
            ),
            'approvals' => Database::fetchAll(
                "SELECT status AS label, COUNT(*) AS total FROM approval_requests WHERE company_id = ? GROUP BY status",
                [$cid]
            ),
            'activity' => Database::fetchAll(
                "SELECT DATE(created_at) AS day, COUNT(*) AS total FROM audit_logs
                  WHERE company_id = ? AND created_at >= CURDATE() - INTERVAL 13 DAY GROUP BY DATE(created_at) ORDER BY day",
                [$cid]
            ),
        ]);
    }

    private function stats(): array
    {
        $cid = Auth::companyId();
        $count = static fn (string $t, string $extra = '') => (int) Database::value(
            "SELECT COUNT(*) FROM `$t` WHERE company_id = ? AND deleted_at IS NULL $extra",
            [$cid]
        );
        return [
            'factories' => $count('factories'),
            'units' => $count('production_units'),
            'lines' => $count('production_units', "AND unit_type = 'sewing_line'"),
            'departments' => $count('departments'),
            'users' => $count('users'),
            'capacity' => (int) Database::value('SELECT COALESCE(SUM(daily_capacity_pcs),0) FROM factories WHERE company_id = ? AND deleted_at IS NULL', [$cid]),
            'pending' => (int) Database::value("SELECT COUNT(*) FROM approval_requests WHERE company_id = ? AND status = 'pending'", [$cid]),
            'my_pending' => count(ApprovalService::inbox()),
        ];
    }
}
