<?php
echo App\Core\View::partial('partials/page_header', [
    'title' => __('audit_trail'), 'icon' => 'bi-journal-text', 'subtitle' => 'Append-only log of every change, login and approval',
    'actions' => '<a href="' . url('admin/audit/logins') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-door-open"></i> ' . __('login_history') . '</a>',
]);
?>
<div class="card erp-card mb-3">
    <div class="card-body row g-2" id="auditFilters">
        <div class="col-md-2"><select class="form-select form-select-sm" data-filter="table_name"><option value="">All tables</option><?php foreach ($tables as $t): ?><option <?= ($_GET['table'] ?? '') === $t ? 'selected' : '' ?>><?= e($t) ?></option><?php endforeach; ?></select></div>
        <div class="col-md-2"><select class="form-select form-select-sm" data-filter="user_id"><option value="">All users</option><?php foreach ($users as $u): ?><option value="<?= $u['id'] ?>"><?= e($u['full_name']) ?></option><?php endforeach; ?></select></div>
        <div class="col-md-2"><select class="form-select form-select-sm" data-filter="action"><option value="">All actions</option><?php foreach (['create', 'update', 'delete', 'login', 'logout', 'approval_submit', 'approval_approved', 'approval_rejected', 'permissions_update', 'sign'] as $a): ?><option><?= $a ?></option><?php endforeach; ?></select></div>
        <div class="col-md-2"><input type="number" class="form-control form-control-sm" placeholder="Record ID" data-filter="record_id" value="<?= e($_GET['record'] ?? '') ?>"></div>
        <div class="col-md-2"><input type="date" class="form-control form-control-sm" data-filter="from"></div>
        <div class="col-md-2"><input type="date" class="form-control form-control-sm" data-filter="to"></div>
    </div>
</div>
<div class="card erp-card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-sm table-hover align-middle w-100" id="auditGrid">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Record</th><th>IP</th><th>Changes</th></tr></thead>
            </table>
        </div>
    </div>
</div>
<?php App\Core\View::push('<script>ERP.auditGrid("#auditGrid");</script>'); ?>
