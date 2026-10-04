<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\AuditLogger;
use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;
use App\Services\ApprovalService;

/** Approval workflow designer: workflow header + ordered steps. */
final class WorkflowController extends Controller
{
    public function index(): void
    {
        $this->authorize('workflows.view');
        $rows = Database::fetchAll(
            'SELECT w.*, (SELECT COUNT(*) FROM approval_workflow_steps s WHERE s.workflow_id = w.id) AS steps,
                    (SELECT COUNT(*) FROM approval_requests r WHERE r.workflow_id = w.id AND r.status = "pending") AS pending
               FROM approval_workflows w WHERE w.company_id = ? AND w.deleted_at IS NULL ORDER BY w.document_type, w.min_amount',
            [Auth::companyId()]
        );
        $this->view('approvals/workflows', ['title' => __('approval_workflow'), 'workflows' => $rows, 'types' => ApprovalService::DOCUMENT_TYPES]);
    }

    public function create(): void
    {
        $this->authorize('workflows.create');
        $this->form(['steps' => []], 'New Approval Workflow');
    }

    public function edit(string $id): void
    {
        $this->authorize('workflows.edit');
        $wf = $this->find((int) $id);
        $wf['steps'] = Database::fetchAll('SELECT * FROM approval_workflow_steps WHERE workflow_id = ? ORDER BY step_order', [$id]);
        $this->form($wf, 'Edit Approval Workflow');
    }

    public function store(): void
    {
        $this->authorize('workflows.create');
        [$header, $steps] = $this->input();
        $id = Database::transaction(function () use ($header, $steps) {
            $id = Database::insert('approval_workflows', $header + ['company_id' => Auth::companyId(), 'created_by' => Auth::id()]);
            $this->saveSteps($id, $steps);
            AuditLogger::log('create', 'approval_workflows', $id, null, $header + ['steps' => count($steps)]);
            return $id;
        });
        $this->success('Workflow created.', 'admin/workflows');
    }

    public function update(string $id): void
    {
        $this->authorize('workflows.edit');
        $old = $this->find((int) $id);
        [$header, $steps] = $this->input();
        $pending = (int) Database::value("SELECT COUNT(*) FROM approval_requests WHERE workflow_id = ? AND status = 'pending'", [$id]);
        $oldSteps = (int) Database::value('SELECT COUNT(*) FROM approval_workflow_steps WHERE workflow_id = ?', [$id]);
        if ($pending > 0 && count($steps) < $oldSteps) {
            Response::json(['success' => false, 'message' => "Cannot remove steps while $pending request(s) are pending."], 422);
        }
        Database::transaction(function () use ($id, $header, $steps, $old) {
            Database::update('approval_workflows', $header + ['updated_by' => Auth::id()], 'id = ?', [$id]);
            $this->saveSteps((int) $id, $steps);
            AuditLogger::log('update', 'approval_workflows', (int) $id, $old, $header);
        });
        $this->success('Workflow updated.', 'admin/workflows');
    }

    public function destroy(string $id): void
    {
        $this->authorize('workflows.delete');
        $wf = $this->find((int) $id);
        if ((int) Database::value("SELECT COUNT(*) FROM approval_requests WHERE workflow_id = ? AND status = 'pending'", [$id]) > 0) {
            Response::json(['success' => false, 'message' => 'Workflow has pending requests.'], 422);
        }
        Database::update('approval_workflows', ['deleted_at' => date('Y-m-d H:i:s'), 'status' => 'inactive'], 'id = ?', [$id]);
        AuditLogger::log('delete', 'approval_workflows', (int) $id, $wf);
        $this->success('Workflow deleted.', 'admin/workflows');
    }

    private function input(): array
    {
        $data = $this->validate([
            'name' => 'required|max:150',
            'document_type' => 'required|in:' . implode(',', array_keys(ApprovalService::DOCUMENT_TYPES)),
            'min_amount' => 'numeric|min:0',
            'max_amount' => 'numeric|min:0',
            'description' => 'max:255',
            'status' => 'required|in:active,inactive',
        ]);
        $steps = [];
        $roleIds = array_column(Database::fetchAll('SELECT id FROM roles WHERE company_id IS NULL OR company_id = ?', [Auth::companyId()]), 'id');
        $userIds = array_column(Database::fetchAll('SELECT id FROM users WHERE company_id = ? AND deleted_at IS NULL', [Auth::companyId()]), 'id');
        foreach ((array) $this->request->input('steps', []) as $s) {
            $name = trim((string) ($s['name'] ?? ''));
            $type = ($s['approver_type'] ?? 'role') === 'user' ? 'user' : 'role';
            $ref = (int) ($type === 'role' ? ($s['role_id'] ?? 0) : ($s['user_id'] ?? 0));
            if ($name === '' || !in_array($ref, array_map('intval', $type === 'role' ? $roleIds : $userIds), true)) {
                continue;
            }
            $steps[] = [
                'name' => mb_substr($name, 0, 100),
                'approver_type' => $type,
                'role_id' => $type === 'role' ? $ref : null,
                'user_id' => $type === 'user' ? $ref : null,
                'sla_hours' => ($s['sla_hours'] ?? '') !== '' ? max(0, (int) $s['sla_hours']) : null,
                'can_reject' => !empty($s['can_reject']) ? 1 : 0,
            ];
        }
        if (!$steps) {
            Response::json(['success' => false, 'message' => 'Add at least one valid approval step.', 'errors' => ['steps' => 'At least one step is required']], 422);
        }
        $min = $data['min_amount'] ?? '';
        $max = $data['max_amount'] ?? '';
        if ($min !== '' && $max !== '' && (float) $max < (float) $min) {
            Response::json(['success' => false, 'message' => 'Max amount must be ≥ min amount.', 'errors' => ['max_amount' => 'Must be ≥ min amount']], 422);
        }
        $header = [
            'name' => $data['name'],
            'document_type' => $data['document_type'],
            'min_amount' => $min === '' ? null : $min,
            'max_amount' => $max === '' ? null : $max,
            'require_signature' => $this->request->input('require_signature') ? 1 : 0,
            'description' => ($data['description'] ?? '') ?: null,
            'status' => $data['status'],
        ];
        return [$header, $steps];
    }

    private function saveSteps(int $wfId, array $steps): void
    {
        Database::query('DELETE FROM approval_workflow_steps WHERE workflow_id = ?', [$wfId]);
        foreach ($steps as $i => $s) {
            Database::insert('approval_workflow_steps', $s + ['workflow_id' => $wfId, 'step_order' => $i + 1]);
        }
    }

    private function find(int $id): array
    {
        return Database::fetch('SELECT * FROM approval_workflows WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [$id, Auth::companyId()])
            ?? Response::abort(404, 'Workflow not found');
    }

    private function form(array $wf, string $title): void
    {
        $cid = Auth::companyId();
        $this->view('approvals/workflow_form', [
            'title' => $title,
            'wf' => $wf,
            'types' => ApprovalService::DOCUMENT_TYPES,
            'roles' => Database::fetchAll("SELECT id, name FROM roles WHERE (company_id IS NULL OR company_id = ?) AND status = 'active' ORDER BY name", [$cid]),
            'users' => Database::fetchAll("SELECT id, full_name, designation FROM users WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL ORDER BY full_name", [$cid]),
        ]);
    }
}
