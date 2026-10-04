<?php
$badge = ['pending' => 'warning', 'approved' => 'success', 'rejected' => 'danger', 'returned' => 'info', 'cancelled' => 'secondary'];
$done = [];
foreach ($history as $h) { if ($h['step_order'] > 0) { $done[$h['step_order']] = $h; } }
echo App\Core\View::partial('partials/page_header', [
    'title' => $req['title'], 'icon' => 'bi-file-earmark-check',
    'subtitle' => ($types[$req['document_type']] ?? $req['document_type']) . ' · ' . ($req['document_no'] ?? '#' . $req['document_id']),
    'actions' => '<a href="' . url('approvals') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> Inbox</a>',
]);
?>
<div class="row g-3">
    <div class="col-lg-8">
        <div class="card erp-card mb-3">
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-sm-3"><div class="small text-body-secondary">Status</div><span class="badge text-bg-<?= $badge[$req['status']] ?> fs-6"><?= e(ucfirst($req['status'])) ?></span></div>
                    <div class="col-sm-3"><div class="small text-body-secondary">Amount</div><div class="fw-semibold"><?= $req['amount'] !== null ? money($req['amount'], $req['currency']) : '—' ?></div></div>
                    <div class="col-sm-3"><div class="small text-body-secondary">Requested by</div><div><?= e($req['requester']) ?></div></div>
                    <div class="col-sm-3"><div class="small text-body-secondary">Workflow</div><div><?= e($req['workflow_name']) ?></div></div>
                </div>
            </div>
        </div>

        <div class="card erp-card mb-3">
            <div class="card-header">Approval Chain</div>
            <div class="card-body">
                <div class="erp-stepper">
                    <?php foreach ($steps as $s):
                        $h = $done[$s['step_order']] ?? null;
                        $state = $h ? $h['action'] : ($req['status'] === 'pending' && (int) $req['current_step'] === (int) $s['step_order'] ? 'current' : 'waiting'); ?>
                        <div class="erp-stepper-item is-<?= e($state) ?>">
                            <div class="erp-stepper-dot"><?= (int) $s['step_order'] ?></div>
                            <div class="erp-stepper-body">
                                <div class="fw-semibold"><?= e($s['name']) ?></div>
                                <div class="small text-body-secondary"><?= e($s['approver_type'] === 'role' ? 'Role: ' . $s['role_name'] : $s['user_name']) ?><?= $s['sla_hours'] ? ' · SLA ' . (int) $s['sla_hours'] . 'h' : '' ?></div>
                                <?php if ($h): ?><div class="small mt-1"><strong><?= e($h['full_name']) ?></strong> — <?= e(ucfirst($h['action'])) ?> <?= e(date('d M Y H:i', strtotime($h['acted_at']))) ?></div><?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="card erp-card">
            <div class="card-header">History</div>
            <ul class="list-group list-group-flush">
                <?php foreach ($history as $h): ?>
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between">
                            <div><strong><?= e($h['full_name']) ?></strong> <span class="text-body-secondary small"><?= e($h['designation']) ?></span>
                                <span class="badge text-bg-<?= ['approved' => 'success', 'rejected' => 'danger', 'returned' => 'info', 'submitted' => 'primary'][$h['action']] ?? 'secondary' ?> ms-1"><?= e($h['action']) ?></span>
                                <span class="small text-body-secondary">· <?= e($h['step_name']) ?></span></div>
                            <span class="small text-body-secondary"><?= e(date('d M Y H:i', strtotime($h['acted_at']))) ?></span>
                        </div>
                        <?php if ($h['comments']): ?><div class="mt-1"><?= nl2br(e($h['comments'])) ?></div><?php endif; ?>
                        <?php if ($h['verification_code']): ?><div class="small mt-1"><i class="bi bi-patch-check text-success"></i> Digitally signed · code <code><?= e($h['verification_code']) ?></code></div><?php endif; ?>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>
    <div class="col-lg-4">
        <?php if ($canAct): ?>
            <form class="card erp-card border-primary" method="post" action="<?= url('approvals/' . $req['id'] . '/act') ?>" data-ajax>
                <?= csrf_field() ?>
                <div class="card-header bg-primary text-white">Your Decision</div>
                <div class="card-body">
                    <div class="mb-3"><label class="form-label">Comments</label><textarea name="comments" class="form-control" rows="4" placeholder="Required when rejecting or returning"></textarea><div class="invalid-feedback"></div></div>
                    <?php if ($req['require_signature']): ?>
                        <div class="mb-3"><label class="form-label"><i class="bi bi-pen"></i> Signature PIN</label><input type="password" name="pin" class="form-control" inputmode="numeric" autocomplete="off"><div class="form-text">This workflow applies your registered digital signature on approval.</div></div>
                    <?php endif; ?>
                    <div class="d-grid gap-2">
                        <button name="decision" value="approved" class="btn btn-success"><i class="bi bi-check2-circle"></i> Approve</button>
                        <button name="decision" value="returned" class="btn btn-outline-info"><i class="bi bi-arrow-return-left"></i> Return for correction</button>
                        <button name="decision" value="rejected" class="btn btn-outline-danger"><i class="bi bi-x-circle"></i> Reject</button>
                    </div>
                </div>
            </form>
        <?php elseif ($req['status'] === 'pending' && (int) $req['requested_by'] === (int) auth()['id']): ?>
            <form method="post" action="<?= url('approvals/' . $req['id'] . '/cancel') ?>" data-ajax data-confirm="Cancel this approval request?">
                <?= csrf_field() ?><button class="btn btn-outline-danger w-100"><i class="bi bi-x"></i> Cancel Request</button>
            </form>
        <?php endif; ?>
    </div>
</div>
