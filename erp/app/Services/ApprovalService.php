<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\AuditLogger;
use App\Core\Auth;
use App\Core\Database;

/**
 * Multi-level approval engine.
 *
 * Any module submits a document with ApprovalService::submit('purchase_order', $id, ...).
 * The matching workflow is selected by document type and amount band; each step is
 * resolved to a role or a specific user. Approving the final step marks the request approved.
 */
final class ApprovalService
{
    public const DOCUMENT_TYPES = [
        'purchase_requisition' => 'Purchase Requisition',
        'purchase_order' => 'Purchase Order',
        'sales_order' => 'Sales Order / Export Order',
        'costing' => 'Pre-Costing / Budget',
        'proforma_invoice' => 'Proforma Invoice',
        'btb_lc' => 'Back-to-Back L/C',
        'material_issue' => 'Material Issue',
        'payment_voucher' => 'Payment Voucher',
        'leave_application' => 'Leave Application',
        'sample_request' => 'Sample Request',
        'general' => 'General Document',
    ];

    public static function findWorkflow(string $docType, ?float $amount): ?array
    {
        return Database::fetch(
            "SELECT * FROM approval_workflows
              WHERE company_id = ? AND document_type = ? AND status = 'active' AND deleted_at IS NULL
                AND (min_amount IS NULL OR ? IS NULL OR min_amount <= ?)
                AND (max_amount IS NULL OR ? IS NULL OR max_amount >= ?)
              ORDER BY (min_amount IS NULL), min_amount DESC LIMIT 1",
            [Auth::companyId(), $docType, $amount, $amount, $amount, $amount]
        );
    }

    public static function submit(string $docType, int $docId, string $title, ?float $amount = null, ?string $currency = null, ?string $docNo = null, ?string $comments = null): int
    {
        $wf = self::findWorkflow($docType, $amount);
        if (!$wf) {
            throw new \RuntimeException('No active approval workflow is configured for ' . (self::DOCUMENT_TYPES[$docType] ?? $docType) . '.');
        }
        $pending = Database::value(
            "SELECT id FROM approval_requests WHERE document_type = ? AND document_id = ? AND company_id = ? AND status = 'pending'",
            [$docType, $docId, Auth::companyId()]
        );
        if ($pending) {
            throw new \RuntimeException('This document already has a pending approval request.');
        }
        $first = self::step((int) $wf['id'], 1) ?? throw new \RuntimeException('Workflow has no steps.');

        return Database::transaction(function () use ($wf, $docType, $docId, $title, $amount, $currency, $docNo, $comments, $first) {
            $id = Database::insert('approval_requests', [
                'company_id' => Auth::companyId(),
                'workflow_id' => $wf['id'],
                'document_type' => $docType,
                'document_id' => $docId,
                'document_no' => $docNo,
                'title' => $title,
                'amount' => $amount,
                'currency' => $currency,
                'requested_by' => Auth::id(),
            ]);
            self::recordAction($id, 0, 'Submitted', 'submitted', $comments);
            AuditLogger::log('approval_submit', 'approval_requests', $id, null, ['document' => "$docType#$docId", 'first_step' => $first['name']]);
            return $id;
        });
    }

    public static function step(int $workflowId, int $order): ?array
    {
        return Database::fetch('SELECT * FROM approval_workflow_steps WHERE workflow_id = ? AND step_order = ?', [$workflowId, $order]);
    }

    /** Can the current user act on the request's current step? */
    public static function canAct(array $request): bool
    {
        if ($request['status'] !== 'pending' || (int) $request['company_id'] !== Auth::companyId()) {
            return false;
        }
        $step = self::step((int) $request['workflow_id'], (int) $request['current_step']);
        if (!$step) {
            return false;
        }
        // segregation of duties: requester can never approve their own document
        if ((int) $request['requested_by'] === Auth::id()) {
            return false;
        }
        if ($step['approver_type'] === 'user') {
            return (int) $step['user_id'] === Auth::id();
        }
        return (bool) Database::value('SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?', [Auth::id(), $step['role_id']]);
    }

    /** Requests currently waiting on the logged-in user. */
    public static function inbox(): array
    {
        return Database::fetchAll(
            "SELECT ar.*, s.name AS step_name, s.sla_hours, u.full_name AS requester, w.name AS workflow_name,
                    (SELECT COUNT(*) FROM approval_workflow_steps x WHERE x.workflow_id = ar.workflow_id) AS total_steps
               FROM approval_requests ar
               JOIN approval_workflows w ON w.id = ar.workflow_id
               JOIN approval_workflow_steps s ON s.workflow_id = ar.workflow_id AND s.step_order = ar.current_step
               JOIN users u ON u.id = ar.requested_by
              WHERE ar.company_id = ? AND ar.status = 'pending' AND ar.requested_by <> ?
                AND ((s.approver_type = 'user' AND s.user_id = ?)
                  OR (s.approver_type = 'role' AND s.role_id IN (SELECT role_id FROM user_roles WHERE user_id = ?)))
              ORDER BY ar.requested_at",
            [Auth::companyId(), Auth::id(), Auth::id(), Auth::id()]
        );
    }

    /**
     * @param string $decision approved|rejected|returned
     */
    public static function act(int $requestId, string $decision, ?string $comments, ?string $pin = null): array
    {
        if (!in_array($decision, ['approved', 'rejected', 'returned'], true)) {
            throw new \InvalidArgumentException('Invalid decision.');
        }
        return Database::transaction(function () use ($requestId, $decision, $comments, $pin) {
            // lock the row so two approvers can't act on the same step concurrently
            $req = Database::fetch('SELECT * FROM approval_requests WHERE id = ? FOR UPDATE', [$requestId]);
            if (!$req || !self::canAct($req)) {
                throw new \RuntimeException('You are not authorised to act on this request.');
            }
            $wf = Database::fetch('SELECT * FROM approval_workflows WHERE id = ?', [$req['workflow_id']]);
            $step = self::step((int) $req['workflow_id'], (int) $req['current_step']);
            if ($decision !== 'approved' && !$step['can_reject']) {
                throw new \RuntimeException('This step cannot reject or return the document.');
            }
            if ($decision !== 'approved' && trim((string) $comments) === '') {
                throw new \RuntimeException('Comments are required when rejecting or returning.');
            }

            $sigId = null;
            if ($decision === 'approved' && $wf['require_signature']) {
                $sigId = SignatureService::sign(
                    $req['document_type'],
                    (int) $req['document_id'],
                    ['request' => (int) $req['id'], 'document_no' => $req['document_no'], 'amount' => $req['amount'], 'title' => $req['title']],
                    $pin,
                    $step['name'],
                    (int) $req['id']
                );
            }
            self::recordAction($requestId, (int) $req['current_step'], $step['name'], $decision, $comments, $sigId);

            $next = self::step((int) $req['workflow_id'], (int) $req['current_step'] + 1);
            $update = match (true) {
                $decision === 'approved' && $next !== null => ['current_step' => (int) $req['current_step'] + 1],
                $decision === 'approved' => ['status' => 'approved', 'completed_at' => date('Y-m-d H:i:s')],
                default => ['status' => $decision, 'completed_at' => date('Y-m-d H:i:s')],
            };
            Database::update('approval_requests', $update, 'id = ?', [$requestId]);
            AuditLogger::log('approval_' . $decision, 'approval_requests', $requestId, ['current_step' => $req['current_step'], 'status' => $req['status']], $update);

            return $update + ['final' => isset($update['status'])];
        });
    }

    public static function cancel(int $requestId): void
    {
        $req = Database::fetch('SELECT * FROM approval_requests WHERE id = ? AND company_id = ?', [$requestId, Auth::companyId()]);
        if (!$req || $req['status'] !== 'pending' || (int) $req['requested_by'] !== Auth::id()) {
            throw new \RuntimeException('Only the requester can cancel a pending request.');
        }
        Database::update('approval_requests', ['status' => 'cancelled', 'completed_at' => date('Y-m-d H:i:s')], 'id = ?', [$requestId]);
        self::recordAction($requestId, (int) $req['current_step'], 'Cancelled', 'cancelled', null);
    }

    public static function history(int $requestId): array
    {
        return Database::fetchAll(
            'SELECT a.*, u.full_name, u.designation, ds.verification_code
               FROM approval_actions a JOIN users u ON u.id = a.user_id
               LEFT JOIN document_signatures ds ON ds.id = a.document_signature_id
              WHERE a.request_id = ? ORDER BY a.id',
            [$requestId]
        );
    }

    private static function recordAction(int $requestId, int $stepOrder, string $stepName, string $action, ?string $comments, ?int $sigId = null): void
    {
        Database::insert('approval_actions', [
            'request_id' => $requestId,
            'step_order' => $stepOrder,
            'step_name' => $stepName,
            'user_id' => Auth::id(),
            'action' => $action,
            'comments' => $comments,
            'document_signature_id' => $sigId,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    }
}
