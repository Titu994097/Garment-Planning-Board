<?php
$actions = can('users.create') ? '<a href="' . url('admin/users/create') . '" class="btn btn-primary btn-sm"><i class="bi bi-person-plus"></i> ' . __('add_new') . '</a>' : '';
echo App\Core\View::partial('partials/page_header', ['title' => __('user_management'), 'icon' => 'bi-person-badge', 'subtitle' => __('security'), 'actions' => $actions]);
?>
<div class="card erp-card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover align-middle w-100" id="usersGrid"
                   data-can-edit="<?= can('users.edit') ? 1 : 0 ?>" data-can-delete="<?= can('users.delete') ? 1 : 0 ?>">
                <thead><tr>
                    <th>Emp. Code</th><th>Name</th><th>Username</th><th>Email</th><th>Department</th>
                    <th>Roles</th><th>Last Login</th><th>Status</th><th class="text-end"><?= __('actions') ?></th>
                </tr></thead>
            </table>
        </div>
    </div>
</div>
<?php App\Core\View::push('<script>ERP.usersGrid("#usersGrid");</script>'); ?>
