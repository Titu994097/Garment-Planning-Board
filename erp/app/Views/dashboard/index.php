<?php
$cards = [
    ['factories', $stats['factories'], 'bi-buildings', 'primary', 'admin/factories'],
    ['production_units', $stats['units'], 'bi-gear-wide-connected', 'info', 'admin/production_units'],
    ['sewing_lines', $stats['lines'], 'bi-scissors', 'success', 'admin/production_units'],
    ['daily_capacity', number_format($stats['capacity']), 'bi-speedometer', 'warning', 'admin/factories'],
    ['pending_approvals', $stats['pending'], 'bi-hourglass-split', 'secondary', 'approvals'],
    ['awaiting_me', $stats['my_pending'], 'bi-inbox', 'danger', 'approvals'],
];
echo App\Core\View::partial('partials/page_header', [
    'title' => __('dashboard'), 'icon' => 'bi-speedometer2',
    'subtitle' => 'Welcome back, ' . auth()['full_name'] . ' · ' . date('l, d F Y'),
]);
?>
<div class="row g-3 mb-3">
    <?php foreach ($cards as [$label, $value, $icon, $color, $href]): ?>
        <div class="col-6 col-md-4 col-xl-2">
            <a href="<?= url($href) ?>" class="erp-kpi text-decoration-none">
                <div class="erp-kpi-icon bg-<?= $color ?>-subtle text-<?= $color ?>"><i class="bi <?= $icon ?>"></i></div>
                <div><div class="erp-kpi-value"><?= e($value) ?></div><div class="erp-kpi-label"><?= __($label) ?></div></div>
            </a>
        </div>
    <?php endforeach; ?>
</div>

<div class="row g-3 mb-3">
    <div class="col-xl-8">
        <div class="card erp-card h-100">
            <div class="card-header d-flex justify-content-between"><span>Factory Capacity (pcs/day)</span><span class="small text-body-secondary">by factory</span></div>
            <div class="card-body"><div id="chartCapacity" style="min-height:300px"></div></div>
        </div>
    </div>
    <div class="col-xl-4">
        <div class="card erp-card h-100">
            <div class="card-header">Production Unit Mix</div>
            <div class="card-body"><div id="chartUnits" style="min-height:300px"></div></div>
        </div>
    </div>
</div>

<div class="row g-3">
    <div class="col-xl-5">
        <div class="card erp-card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-inbox me-1"></i><?= __('awaiting_me') ?></span>
                <a href="<?= url('approvals') ?>" class="small">View all</a>
            </div>
            <ul class="list-group list-group-flush">
                <?php foreach ($inbox as $a): ?>
                    <a href="<?= url('approvals/' . $a['id']) ?>" class="list-group-item list-group-item-action">
                        <div class="d-flex justify-content-between">
                            <strong><?= e($a['title']) ?></strong>
                            <?php if ($a['amount'] !== null): ?><span><?= money($a['amount'], $a['currency']) ?></span><?php endif; ?>
                        </div>
                        <div class="small text-body-secondary">
                            <?= e($a['requester']) ?> · Step <?= (int) $a['current_step'] ?>/<?= (int) $a['total_steps'] ?> (<?= e($a['step_name']) ?>) · <?= e(date('d M H:i', strtotime($a['requested_at']))) ?>
                        </div>
                    </a>
                <?php endforeach; ?>
                <?php if (!$inbox): ?><li class="list-group-item text-body-secondary text-center py-4"><i class="bi bi-check2-all fs-3 d-block"></i>Nothing waiting for you.</li><?php endif; ?>
            </ul>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="card erp-card h-100">
            <div class="card-header"><i class="bi bi-calendar-event me-1"></i><?= __('upcoming_holidays') ?></div>
            <div class="card-body">
                <?php if ($fiscal): ?>
                    <div class="erp-fiscal mb-3">
                        <div class="small text-body-secondary"><?= __('current_fiscal_year') ?></div>
                        <div class="fw-semibold"><?= e($fiscal['name']) ?></div>
                        <?php
                        $span = max(1, strtotime($fiscal['end_date']) - strtotime($fiscal['start_date']));
                        $pct = (int) min(100, max(0, (time() - strtotime($fiscal['start_date'])) / $span * 100)); ?>
                        <div class="progress mt-1" style="height:6px" role="progressbar" aria-valuenow="<?= $pct ?>"><div class="progress-bar" style="width:<?= $pct ?>%"></div></div>
                        <div class="small text-body-secondary mt-1"><?= $pct ?>% elapsed</div>
                    </div>
                <?php endif; ?>
                <?php foreach ($holidays as $h): ?>
                    <div class="d-flex gap-3 mb-2 align-items-center">
                        <div class="erp-date"><span><?= date('d', strtotime($h['start_date'])) ?></span><small><?= date('M', strtotime($h['start_date'])) ?></small></div>
                        <div><div class="fw-semibold small"><?= e($h['title']) ?></div>
                            <div class="small text-body-secondary"><?= e(ucfirst($h['holiday_type'])) ?><?= $h['end_date'] !== $h['start_date'] ? ' · until ' . date('d M', strtotime($h['end_date'])) : '' ?></div></div>
                    </div>
                <?php endforeach; ?>
                <?php if (!$holidays): ?><div class="text-body-secondary small">No upcoming holidays.</div><?php endif; ?>
            </div>
        </div>
    </div>
    <div class="col-xl-4 col-md-6">
        <div class="card erp-card h-100">
            <div class="card-header"><i class="bi bi-activity me-1"></i><?= __('recent_activity') ?></div>
            <div class="card-body">
                <div id="chartActivity" style="min-height:120px"></div>
                <?php foreach ($recent as $a): ?>
                    <div class="erp-activity">
                        <span class="badge text-bg-<?= ['create' => 'success', 'update' => 'primary', 'delete' => 'danger'][$a['action']] ?? 'secondary' ?>"><?= e($a['action']) ?></span>
                        <span class="small"><?= e($a['full_name'] ?? 'System') ?> · <?= e($a['table_name']) ?><?= $a['record_id'] ? ' #' . (int) $a['record_id'] : '' ?></span>
                        <span class="small text-body-secondary ms-auto"><?= e(date('d M H:i', strtotime($a['created_at']))) ?></span>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>
<?php App\Core\View::push('<script>ERP.dashboard();</script>'); ?>
