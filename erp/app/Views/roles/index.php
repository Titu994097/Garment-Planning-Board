<?php
$actions = can('roles.create') ? '<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#roleModal"><i class="bi bi-plus-lg"></i> New Role</button>' : '';
echo App\Core\View::partial('partials/page_header', ['title' => __('roles_permissions'), 'icon' => 'bi-shield-lock', 'subtitle' => __('security'), 'actions' => $actions]);
?>
<div class="row g-3">
    <?php foreach ($roles as $r): ?>
        <div class="col-md-6 col-xl-4">
            <div class="card erp-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1"><?= e($r['name']) ?></h6>
                        <?php if ($r['is_system']): ?><span class="badge text-bg-dark">System</span><?php endif; ?>
                    </div>
                    <p class="small text-body-secondary mb-3"><?= e($r['description'] ?: '—') ?></p>
                    <div class="d-flex gap-3 small">
                        <span><i class="bi bi-people"></i> <?= (int) $r['users'] ?> users</span>
                        <span><i class="bi bi-key"></i> <?= $r['slug'] === 'super-admin' ? 'All' : (int) $r['perms'] ?> permissions</span>
                    </div>
                </div>
                <div class="card-footer d-flex gap-2">
                    <a href="<?= url('admin/roles/' . $r['id'] . '/permissions') ?>" class="btn btn-sm btn-outline-primary"><i class="bi bi-grid-3x3-gap"></i> Permissions</a>
                    <?php if (!$r['is_system'] && can('roles.delete')): ?>
                        <button class="btn btn-sm btn-outline-danger ms-auto" data-delete="<?= url('admin/roles/' . $r['id']) ?>"><i class="bi bi-trash"></i></button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<div class="modal fade" id="roleModal" tabindex="-1">
    <div class="modal-dialog">
        <form class="modal-content" method="post" action="<?= url('admin/roles') ?>" data-ajax>
            <?= csrf_field() ?>
            <div class="modal-header"><h5 class="modal-title">New Role</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label class="form-label">Role Name</label><input name="name" class="form-control" required><div class="invalid-feedback"></div></div>
                <div><label class="form-label">Description</label><input name="description" class="form-control"><div class="invalid-feedback"></div></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button><button class="btn btn-primary"><?= __('save') ?></button></div>
        </form>
    </div>
</div>
