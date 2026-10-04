<?php
use App\Core\Auth;
use App\Core\Database;
use App\Core\Lang;

$user = Auth::user();
$path = (new App\Core\Request())->path();
$menu = [
    __('organisation') => [
        ['companies', 'admin/companies', 'bi-building', 'Company Profile'],
        ['business_units', 'admin/business_units', 'bi-diagram-3', 'Business Units'],
        ['factories', 'admin/factories', 'bi-buildings', 'Factory Setup'],
        ['production_units', 'admin/production_units', 'bi-gear-wide-connected', 'Production Units'],
        ['departments', 'admin/departments', 'bi-people', 'Departments'],
        ['cost_centers', 'admin/cost_centers', 'bi-cash-coin', 'Cost Centers'],
        ['branches', 'admin/branches', 'bi-geo-alt', 'Branch Management'],
    ],
    __('calendar_finance') => [
        ['fiscal_years', 'admin/fiscal_years', 'bi-calendar-range', 'Fiscal Year'],
        ['holidays', 'admin/holidays', 'bi-calendar-heart', 'Holiday Calendar'],
        ['currencies', 'admin/currencies', 'bi-currency-exchange', 'Currencies'],
        ['exchange_rates', 'admin/exchange_rates', 'bi-graph-up-arrow', 'Exchange Rates'],
    ],
    __('security') => [
        ['users', 'admin/users', 'bi-person-badge', __('user_management')],
        ['roles', 'admin/roles', 'bi-shield-lock', __('roles_permissions')],
        ['workflows', 'admin/workflows', 'bi-diagram-2', __('approval_workflow')],
        [null, 'approvals', 'bi-inbox', __('approval_inbox')],
        [null, 'signatures', 'bi-pen', __('digital_signature')],
        ['audit', 'admin/audit', 'bi-journal-text', __('audit_trail')],
    ],
];
$companies = $user['is_super_admin']
    ? Database::fetchAll("SELECT id, name FROM companies WHERE deleted_at IS NULL AND status = 'active' ORDER BY name")
    : Database::fetchAll(
        "SELECT c.id, c.name FROM companies c WHERE c.deleted_at IS NULL AND (c.id = ? OR c.id IN (SELECT company_id FROM user_company_access WHERE user_id = ?)) ORDER BY c.name",
        [$user['company_id'], $user['id']]
    );
$activeCompany = Auth::companyId();
$inboxCount = count(App\Services\ApprovalService::inbox());
?>
<!DOCTYPE html>
<html lang="<?= e(Lang::locale()) ?>" data-bs-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
    <meta name="base-url" content="<?= e(url('')) ?>">
    <title><?= e($title ?? '') ?> · <?= e(config('app.name')) ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/2.1.8/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css">
    <link rel="stylesheet" href="<?= asset('css/app.css') ?>">
</head>
<body>
<div class="erp-shell">
    <aside class="erp-sidebar" id="sidebar">
        <a href="<?= url('dashboard') ?>" class="erp-brand">
            <i class="bi bi-boxes"></i><span>Textile<b>ERP</b></span>
        </a>
        <nav class="erp-nav">
            <a href="<?= url('dashboard') ?>" class="<?= $path === '/dashboard' ? 'active' : '' ?>"><i class="bi bi-speedometer2"></i><span><?= __('dashboard') ?></span></a>
            <div class="erp-nav-module"><?= __('corporate_admin') ?></div>
            <?php foreach ($menu as $group => $items):
                $visible = array_filter($items, fn ($i) => $i[0] === null || can($i[0] . '.view'));
                if (!$visible) continue; ?>
                <div class="erp-nav-group"><?= e($group) ?></div>
                <?php foreach ($visible as [$perm, $href, $icon, $label]): ?>
                    <a href="<?= url($href) ?>" class="<?= str_starts_with($path, '/' . $href) ? 'active' : '' ?>">
                        <i class="bi <?= $icon ?>"></i><span><?= e($label) ?></span>
                    </a>
                <?php endforeach; ?>
            <?php endforeach; ?>
        </nav>
    </aside>

    <div class="erp-main">
        <header class="erp-topbar">
            <button class="btn btn-link text-body p-0 me-3" id="sidebarToggle" aria-label="Toggle menu"><i class="bi bi-list fs-4"></i></button>

            <?php if (count($companies) > 1): ?>
                <form method="post" action="<?= url('profile/company') ?>" class="d-none d-md-block me-auto">
                    <?= csrf_field() ?>
                    <select name="company_id" class="form-select form-select-sm" onchange="this.form.submit()" aria-label="Active company">
                        <?php foreach ($companies as $c): ?>
                            <option value="<?= $c['id'] ?>" <?= (int) $c['id'] === $activeCompany ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </form>
            <?php else: ?>
                <div class="me-auto fw-semibold d-none d-md-block"><?= e($user['company_name']) ?></div>
            <?php endif; ?>

            <div class="dropdown me-2">
                <button class="btn btn-sm btn-light" data-bs-toggle="dropdown"><i class="bi bi-translate"></i> <?= strtoupper(Lang::locale()) ?></button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <?php foreach (config('app.locales') as $code => $name): ?>
                        <li><a class="dropdown-item" href="?lang=<?= $code ?>"><?= e($name) ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <button class="btn btn-sm btn-light me-2" id="themeToggle" aria-label="Toggle dark mode"><i class="bi bi-moon-stars"></i></button>
            <a href="<?= url('approvals') ?>" class="btn btn-sm btn-light me-2 position-relative" title="<?= __('approval_inbox') ?>">
                <i class="bi bi-bell"></i>
                <?php if ($inboxCount): ?><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"><?= $inboxCount ?></span><?php endif; ?>
            </a>
            <div class="dropdown">
                <button class="btn btn-sm btn-light d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                    <span class="erp-avatar"><?= e(mb_strtoupper(mb_substr($user['full_name'], 0, 1))) ?></span>
                    <span class="d-none d-sm-inline"><?= e($user['full_name']) ?></span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><h6 class="dropdown-header"><?= e($user['designation'] ?? $user['username']) ?></h6></li>
                    <li><a class="dropdown-item" href="<?= url('profile/password') ?>"><i class="bi bi-key me-2"></i><?= __('change_password') ?></a></li>
                    <li><a class="dropdown-item" href="<?= url('signatures') ?>"><i class="bi bi-pen me-2"></i><?= __('digital_signature') ?></a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <form method="post" action="<?= url('logout') ?>"><?= csrf_field() ?>
                            <button class="dropdown-item text-danger"><i class="bi bi-box-arrow-right me-2"></i><?= __('sign_out') ?></button>
                        </form>
                    </li>
                </ul>
            </div>
        </header>

        <main class="erp-content">
            <?php foreach (['success', 'error'] as $t): if ($m = flash($t)): ?>
                <div class="alert alert-<?= $t === 'error' ? 'danger' : 'success' ?> alert-dismissible fade show">
                    <?= e($m) ?><button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            <?php endif; endforeach; ?>
            <?= $content ?>
        </main>
        <footer class="erp-footer">© <?= date('Y') ?> <?= e(config('app.name')) ?> · v1.0</footer>
    </div>
</div>

<div class="toast-container position-fixed top-0 end-0 p-3" id="toasts"></div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.datatables.net/2.1.8/js/dataTables.min.js"></script>
<script src="https://cdn.datatables.net/2.1.8/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/apexcharts@3.54.0/dist/apexcharts.min.js"></script>
<script src="<?= asset('js/app.js') ?>"></script>
<?= App\Core\View::stack() ?>
</body>
</html>
