<?php
$readonly = !can('roles.edit') || $role['slug'] === 'super-admin';
echo App\Core\View::partial('partials/page_header', [
    'title' => $title, 'icon' => 'bi-grid-3x3-gap', 'subtitle' => $role['description'] ?? '',
    'actions' => '<a href="' . url('admin/roles') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> Roles</a>',
]);
?>
<?php if ($role['slug'] === 'super-admin'): ?>
    <div class="alert alert-info">Super Admin implicitly holds every permission.</div>
<?php endif; ?>
<form method="post" action="<?= url('admin/roles/' . $role['id'] . '/permissions') ?>" data-ajax>
    <?= csrf_field() ?>
    <?php foreach ($matrix as $module => $resources): ?>
        <div class="card erp-card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <strong class="text-uppercase small"><?= e(str_replace('_', ' ', $module)) ?></strong>
                <?php if (!$readonly): ?><button type="button" class="btn btn-sm btn-link" data-toggle-all>Toggle all</button><?php endif; ?>
            </div>
            <div class="table-responsive">
                <table class="table table-sm align-middle mb-0 erp-matrix">
                    <thead><tr><th>Resource</th><?php foreach ($actions as $a): ?><th class="text-center"><?= e(ucwords(str_replace('_', ' ', $a))) ?></th><?php endforeach; ?></tr></thead>
                    <tbody>
                    <?php foreach ($resources as $res => $acts): ?>
                        <tr>
                            <td><button type="button" class="btn btn-link btn-sm p-0 text-body" data-toggle-row <?= $readonly ? 'disabled' : '' ?>><?= e(ucwords(str_replace('_', ' ', $res))) ?></button></td>
                            <?php foreach ($actions as $a): ?>
                                <td class="text-center">
                                    <?php if (isset($acts[$a])): $p = $acts[$a]; ?>
                                        <input class="form-check-input" type="checkbox" name="permissions[]" value="<?= $p['id'] ?>" title="<?= e($p['slug']) ?>"
                                            <?= in_array((int) $p['id'], $assigned, true) || $role['slug'] === 'super-admin' ? 'checked' : '' ?> <?= $readonly ? 'disabled' : '' ?>>
                                    <?php endif; ?>
                                </td>
                            <?php endforeach; ?>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endforeach; ?>
    <?php if (!$readonly): ?>
        <div class="erp-sticky-actions"><button class="btn btn-primary"><i class="bi bi-check2"></i> Save Permissions</button></div>
    <?php endif; ?>
</form>
