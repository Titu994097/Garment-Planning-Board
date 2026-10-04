<?php echo App\Core\View::partial('partials/page_header', [
    'title' => __('login_history'), 'icon' => 'bi-door-open',
    'actions' => '<a href="' . url('admin/audit') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> ' . __('audit_trail') . '</a>',
]); ?>
<div class="card erp-card"><div class="table-responsive">
    <table class="table table-sm table-hover mb-0">
        <thead><tr><th>Time</th><th>Username</th><th>User</th><th>Result</th><th>IP</th><th>Device</th></tr></thead>
        <tbody>
        <?php foreach ($rows as $r): ?>
            <tr>
                <td class="text-nowrap"><?= e($r['created_at']) ?></td><td><?= e($r['username']) ?></td><td><?= e($r['full_name'] ?? '—') ?></td>
                <td><?= $r['success'] ? '<span class="badge text-bg-success">Success</span>' : '<span class="badge text-bg-danger">Failed</span>' ?></td>
                <td><?= e($r['ip_address']) ?></td><td class="small text-truncate" style="max-width:320px"><?= e($r['user_agent']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div></div>
