<?php
$id = $wf['id'] ?? null;
$steps = $wf['steps'] ?: [['name' => 'Checked By', 'approver_type' => 'role', 'role_id' => null, 'user_id' => null, 'sla_hours' => 24, 'can_reject' => 1]];
echo App\Core\View::partial('partials/page_header', [
    'title' => $title, 'icon' => 'bi-diagram-2',
    'actions' => '<a href="' . url('admin/workflows') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> Back</a>',
]);
?>
<form method="post" action="<?= url('admin/workflows' . ($id ? '/' . $id : '')) ?>" data-ajax novalidate>
    <?= csrf_field() ?>
    <?php if ($id): ?><input type="hidden" name="_method" value="PUT"><?php endif; ?>
    <div class="card erp-card mb-3">
        <div class="card-body row g-3">
            <div class="col-md-6"><label class="form-label">Workflow Name <span class="text-danger">*</span></label><input name="name" class="form-control" value="<?= e($wf['name'] ?? '') ?>" required><div class="invalid-feedback"></div></div>
            <div class="col-md-6"><label class="form-label">Document Type <span class="text-danger">*</span></label>
                <select name="document_type" class="form-select"><?php foreach ($types as $k => $l): ?><option value="<?= $k ?>" <?= ($wf['document_type'] ?? '') === $k ? 'selected' : '' ?>><?= e($l) ?></option><?php endforeach; ?></select></div>
            <div class="col-md-3"><label class="form-label">Min Amount</label><input type="number" step="0.01" name="min_amount" class="form-control" value="<?= e($wf['min_amount'] ?? '') ?>"><div class="invalid-feedback"></div></div>
            <div class="col-md-3"><label class="form-label">Max Amount</label><input type="number" step="0.01" name="max_amount" class="form-control" value="<?= e($wf['max_amount'] ?? '') ?>"><div class="invalid-feedback"></div></div>
            <div class="col-md-3"><label class="form-label">Status</label><select name="status" class="form-select"><option value="active">Active</option><option value="inactive" <?= ($wf['status'] ?? '') === 'inactive' ? 'selected' : '' ?>>Inactive</option></select></div>
            <div class="col-md-3"><div class="form-check form-switch mt-md-4"><input class="form-check-input" type="checkbox" name="require_signature" value="1" id="rs" <?= !empty($wf['require_signature']) ? 'checked' : '' ?>><label class="form-check-label" for="rs">Require digital signature</label></div></div>
            <div class="col-12"><label class="form-label">Description</label><input name="description" class="form-control" value="<?= e($wf['description'] ?? '') ?>"></div>
        </div>
    </div>

    <div class="card erp-card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span>Approval Steps <small class="text-body-secondary">— executed top to bottom; drag ⇅ to reorder</small></span>
            <button type="button" class="btn btn-sm btn-outline-primary" id="addStep"><i class="bi bi-plus"></i> Add Step</button>
        </div>
        <div class="card-body" id="steps">
            <?php foreach ($steps as $i => $s): ?>
                <div class="erp-step row g-2 align-items-end" draggable="true">
                    <div class="col-auto"><span class="erp-step-no"><?= $i + 1 ?></span></div>
                    <div class="col-md-3"><label class="form-label small">Step Name</label><input class="form-control form-control-sm" data-name="name" value="<?= e($s['name']) ?>"></div>
                    <div class="col-md-2"><label class="form-label small">Approver Type</label>
                        <select class="form-select form-select-sm" data-name="approver_type"><option value="role">Role</option><option value="user" <?= $s['approver_type'] === 'user' ? 'selected' : '' ?>>Specific User</option></select></div>
                    <div class="col-md-3 step-role <?= $s['approver_type'] === 'user' ? 'd-none' : '' ?>"><label class="form-label small">Role</label>
                        <select class="form-select form-select-sm" data-name="role_id"><option value="">—</option><?php foreach ($roles as $r): ?><option value="<?= $r['id'] ?>" <?= (int) $s['role_id'] === (int) $r['id'] ? 'selected' : '' ?>><?= e($r['name']) ?></option><?php endforeach; ?></select></div>
                    <div class="col-md-3 step-user <?= $s['approver_type'] === 'user' ? '' : 'd-none' ?>"><label class="form-label small">User</label>
                        <select class="form-select form-select-sm" data-name="user_id"><option value="">—</option><?php foreach ($users as $u): ?><option value="<?= $u['id'] ?>" <?= (int) $s['user_id'] === (int) $u['id'] ? 'selected' : '' ?>><?= e($u['full_name'] . ($u['designation'] ? ' — ' . $u['designation'] : '')) ?></option><?php endforeach; ?></select></div>
                    <div class="col-md-1"><label class="form-label small">SLA (h)</label><input type="number" min="0" class="form-control form-control-sm" data-name="sla_hours" value="<?= e($s['sla_hours']) ?>"></div>
                    <div class="col-md-1"><div class="form-check"><input class="form-check-input" type="checkbox" data-name="can_reject" value="1" <?= $s['can_reject'] ? 'checked' : '' ?>><label class="form-check-label small">Can reject</label></div></div>
                    <div class="col-auto ms-auto"><button type="button" class="btn btn-sm btn-light text-danger" data-remove-step><i class="bi bi-x-lg"></i></button></div>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="card-footer text-end"><button class="btn btn-primary"><i class="bi bi-check2"></i> <?= __('save') ?></button></div>
    </div>
</form>
<?php App\Core\View::push('<script>ERP.workflowDesigner();</script>'); ?>
