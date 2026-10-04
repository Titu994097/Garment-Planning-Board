<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Response;
use App\Services\ApprovalService;

/** Approval inbox, request history and decision actions. */
final class ApprovalController extends Controller
{
    public function inbox(): void
    {
        $this->view('approvals/inbox', [
            'title' => __('approval_inbox'),
            'inbox' => ApprovalService::inbox(),
            'mine' => Database::fetchAll(
                'SELECT ar.*, w.name AS workflow_name, s.name AS step_name
                   FROM approval_requests ar JOIN approval_workflows w ON w.id = ar.workflow_id
                   LEFT JOIN approval_workflow_steps s ON s.workflow_id = ar.workflow_id AND s.step_order = ar.current_step
                  WHERE ar.requested_by = ? AND ar.company_id = ? ORDER BY ar.id DESC LIMIT 50',
                [Auth::id(), Auth::companyId()]
            ),
            'types' => ApprovalService::DOCUMENT_TYPES,
        ]);
    }

    public function show(string $id): void
    {
        $req = Database::fetch(
            'SELECT ar.*, w.name AS workflow_name, w.require_signature, u.full_name AS requester
               FROM approval_requests ar JOIN approval_workflows w ON w.id = ar.workflow_id JOIN users u ON u.id = ar.requested_by
              WHERE ar.id = ? AND ar.company_id = ?',
            [$id, Auth::companyId()]
        ) ?? Response::abort(404, 'Request not found');

        $canAct = ApprovalService::canAct($req);
        // only participants or approvers with oversight may view
        if (!$canAct && (int) $req['requested_by'] !== Auth::id() && !can('approvals.view_all')
            && !Database::value('SELECT 1 FROM approval_actions WHERE request_id = ? AND user_id = ?', [$id, Auth::id()])) {
            Response::abort(403, 'You are not a participant in this approval.');
        }
        $steps = Database::fetchAll(
            'SELECT s.*, r.name AS role_name, u.full_name AS user_name FROM approval_workflow_steps s
               LEFT JOIN roles r ON r.id = s.role_id LEFT JOIN users u ON u.id = s.user_id
              WHERE s.workflow_id = ? ORDER BY s.step_order',
            [$req['workflow_id']]
        );
        $this->view('approvals/show', [
            'title' => 'Approval #' . $req['id'],
            'req' => $req,
            'steps' => $steps,
            'history' => ApprovalService::history((int) $id),
            'canAct' => $canAct,
            'types' => ApprovalService::DOCUMENT_TYPES,
        ]);
    }

    public function act(string $id): void
    {
        $data = $this->validate(['decision' => 'required|in:approved,rejected,returned', 'comments' => 'max:2000', 'pin' => 'max:20']);
        try {
            $res = ApprovalService::act((int) $id, $data['decision'], $data['comments'] ?? null, $data['pin'] ?? null);
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        $msg = match ($data['decision']) {
            'approved' => $res['final'] ? 'Document fully approved.' : 'Approved and forwarded to next step.',
            'rejected' => 'Document rejected.',
            default => 'Document returned to requester.',
        };
        $this->success($msg, 'approvals');
    }

    /** Generic submission endpoint used by any module (and for testing workflows). */
    public function submit(): void
    {
        $data = $this->validate([
            'document_type' => 'required|in:' . implode(',', array_keys(ApprovalService::DOCUMENT_TYPES)),
            'document_id' => 'required|integer|min:1',
            'document_no' => 'max:60',
            'title' => 'required|max:200',
            'amount' => 'numeric|min:0',
            'currency' => 'max:3',
            'comments' => 'max:2000',
        ]);
        try {
            $id = ApprovalService::submit(
                $data['document_type'], (int) $data['document_id'], $data['title'],
                ($data['amount'] ?? '') === '' ? null : (float) $data['amount'],
                ($data['currency'] ?? '') ?: Auth::user()['base_currency'],
                ($data['document_no'] ?? '') ?: null,
                ($data['comments'] ?? '') ?: null
            );
        } catch (\RuntimeException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        $this->success('Submitted for approval.', 'approvals/' . $id);
    }

    public function cancel(string $id): void
    {
        try {
            ApprovalService::cancel((int) $id);
        } catch (\RuntimeException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        $this->success('Request cancelled.', 'approvals');
    }
}
