<?php
/** @var App\Services\Resource $r */
$cols = $r->listColumns();
ob_start(); ?>
<?php if (can($r->permission('export'))): ?>
    <a href="<?= url('admin/' . $r->key . '/export') ?>" class="btn btn-outline-secondary btn-sm" id="exportBtn"><i class="bi bi-download"></i> <?= __('export') ?></a>
<?php endif; ?>
<?php if (can($r->permission('create'))): ?>
    <a href="<?= url('admin/' . $r->key . '/create') ?>" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> <?= __('add_new') ?></a>
<?php endif;
$actions = ob_get_clean();
echo App\Core\View::partial('partials/page_header', ['title' => $r->title, 'icon' => $r->def['icon'] ?? '', 'subtitle' => __('corporate_admin'), 'actions' => $actions]);
?>
<div class="card erp-card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover align-middle w-100" id="grid"
                   data-source="<?= url('admin/' . $r->key . '/data') ?>"
                   data-edit="<?= can($r->permission('edit')) ? url('admin/' . $r->key . '/{id}/edit') : '' ?>"
                   data-delete="<?= can($r->permission('delete')) ? url('admin/' . $r->key . '/{id}') : '' ?>">
                <thead>
                <tr>
                    <?php foreach ($cols as $name => $f): ?>
                        <th data-col="<?= e($name) ?>"><?= e($f['label']) ?></th>
                    <?php endforeach; ?>
                    <th class="text-end no-sort"><?= __('actions') ?></th>
                </tr>
                </thead>
            </table>
        </div>
    </div>
</div>
<?php App\Core\View::push('<script>ERP.resourceGrid("#grid");</script>'); ?>
