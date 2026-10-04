<?php
$badge = ['pending' => 'warning', 'approved' => 'success', 'rejected' => 'danger', 'returned' => 'info', 'cancelled' => 'secondary'];
echo App\Core\View::partial('partials/page_header', [
    'title' => __('approval_inbox'), 'icon' => 'bi-inbox',
    'actions' => '<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#submitModal"><i class="bi bi-send"></i> Submit Document</button>',
]);
?>
<ul class="nav nav-tabs mb-3" role="tablist">
    <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabInbox">Awaiting Me <span class="badge text-bg-danger"><?= count($inbox) ?></span></button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabMine">My Requests</button></li>
</ul>
<div class="tab-content">
    <div class="tab-pane fade show active" id="tabInbox">
        <div class="card erp-card"><div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead><tr><th>#</th><th>Document</th><th>Requested By</th><th>Step</th><th class="text-end">Amount</th><th>Waiting</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($inbox as $a):
                    $hours = (time() - strtotime($a['requested_at'])) / 3600;
                    $overdue = $a['sla_hours'] && $hours > $a['sla_hours']; ?>
                    <tr class="<?= $overdue ? 'table-danger' : '' ?>">
                        <td><?= (int) $a['id'] ?></td>
                        <td><strong><?= e($a['title']) ?></strong><div class="small text-body-secondary"><?= e($types[$a['document_type']] ?? $a['document_type']) ?> <?= e($a['document_no']) ?></div></td>
                        <td><?= e($a['requester']) ?></td>
                        <td><?= e($a['step_name']) ?> <span class="small text-body-secondary">(<?= (int) $a['current_step'] ?>/<?= (int) $a['total_steps'] ?>)</span></td>
                        <td class="text-end"><?= $a['amount'] !== null ? money($a['amount'], $a['currency']) : '—' ?></td>
                        <td><?= $hours < 24 ? round($hours) . 'h' : round($hours / 24, 1) . 'd' ?><?= $overdue ? ' <span class="badge text-bg-danger">SLA</span>' : '' ?></td>
                        <td class="text-end"><a href="<?= url('approvals/' . $a['id']) ?>" class="btn btn-sm btn-primary">Review</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$inbox): ?><tr><td colspan="7" class="text-center text-body-secondary py-5">Your inbox is clear.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div></div>
    </div>
    <div class="tab-pane fade" id="tabMine">
        <div class="card erp-card"><div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead><tr><th>#</th><th>Document</th><th>Workflow</th><th>Current Step</th><th class="text-end">Amount</th><th>Status</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($mine as $a): ?>
                    <tr>
                        <td><?= (int) $a['id'] ?></td>
                        <td><strong><?= e($a['title']) ?></strong><div class="small text-body-secondary"><?= e($a['document_no']) ?></div></td>
                        <td><?= e($a['workflow_name']) ?></td>
                        <td><?= $a['status'] === 'pending' ? e($a['step_name']) : '—' ?></td>
                        <td class="text-end"><?= $a['amount'] !== null ? money($a['amount'], $a['currency']) : '—' ?></td>
                        <td><span class="badge text-bg-<?= $badge[$a['status']] ?>"><?= e(ucfirst($a['status'])) ?></span></td>
                        <td class="text-end"><a href="<?= url('approvals/' . $a['id']) ?>" class="btn btn-sm btn-light">Open</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$mine): ?><tr><td colspan="7" class="text-center text-body-secondary py-5">You have not submitted any documents.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div></div>
    </div>
</div>

<div class="modal fade" id="submitModal" tabindex="-1">
    <div class="modal-dialog">
        <form class="modal-content" method="post" action="<?= url('approvals') ?>" data-ajax>
            <?= csrf_field() ?>
            <div class="modal-header"><h5 class="modal-title">Submit Document for Approval</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body row g-3">
                <div class="col-12"><label class="form-label">Document Type</label><select name="document_type" class="form-select"><?php foreach ($types as $k => $l): ?><option value="<?= $k ?>"><?= e($l) ?></option><?php endforeach; ?></select></div>
                <div class="col-6"><label class="form-label">Document ID</label><input type="number" min="1" name="document_id" class="form-control" required><div class="invalid-feedback"></div></div>
                <div class="col-6"><label class="form-label">Document No</label><input name="document_no" class="form-control" placeholder="PO-2026-0001"><div class="invalid-feedback"></div></div>
                <div class="col-12"><label class="form-label">Title</label><input name="title" class="form-control" required><div class="invalid-feedback"></div></div>
                <div class="col-8"><label class="form-label">Amount</label><input type="number" step="0.01" min="0" name="amount" class="form-control"><div class="invalid-feedback"></div></div>
                <div class="col-4"><label class="form-label">Currency</label><input name="currency" maxlength="3" class="form-control text-uppercase" value="<?= e(auth()['base_currency'] ?? 'USD') ?>"></div>
                <div class="col-12"><label class="form-label">Comments</label><textarea name="comments" class="form-control" rows="2"></textarea></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button><button class="btn btn-primary">Submit</button></div>
        </form>
    </div>
</div>
