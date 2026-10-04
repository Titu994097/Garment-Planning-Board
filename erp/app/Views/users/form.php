<?php
$id = $user['id'] ?? null;
$v = fn ($k, $d = '') => old($k, $user[$k] ?? $d);
echo App\Core\View::partial('partials/page_header', [
    'title' => $title, 'icon' => 'bi-person-badge',
    'actions' => '<a href="' . url('admin/users') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> Back</a>',
]);
?>
<form method="post" action="<?= url('admin/users' . ($id ? '/' . $id : '')) ?>" data-ajax novalidate>
    <?= csrf_field() ?>
    <?php if ($id): ?><input type="hidden" name="_method" value="PUT"><?php endif; ?>
    <div class="row g-3">
        <div class="col-lg-8">
            <div class="card erp-card">
                <div class="card-header">Profile</div>
                <div class="card-body row g-3">
                    <div class="col-md-8"><label class="form-label">Full Name <span class="text-danger">*</span></label><input name="full_name" class="form-control" value="<?= e($v('full_name')) ?>" required><div class="invalid-feedback"></div></div>
                    <div class="col-md-4"><label class="form-label">Employee Code</label><input name="employee_code" class="form-control" value="<?= e($v('employee_code')) ?>"><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Username <span class="text-danger">*</span></label><input name="username" class="form-control" value="<?= e($v('username')) ?>" required autocomplete="off"><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Email <span class="text-danger">*</span></label><input type="email" name="email" class="form-control" value="<?= e($v('email')) ?>" required><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Designation</label><input name="designation" class="form-control" value="<?= e($v('designation')) ?>"><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Phone</label><input name="phone" class="form-control" value="<?= e($v('phone')) ?>"><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Factory</label>
                        <select name="factory_id" class="form-select select2"><option value="">— All factories —</option>
                            <?php foreach ($factories as $f): ?><option value="<?= $f['id'] ?>" <?= (string) $v('factory_id') === (string) $f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option><?php endforeach; ?>
                        </select><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Department</label>
                        <select name="department_id" class="form-select select2"><option value="">— Select —</option>
                            <?php foreach ($departments as $d): ?><option value="<?= $d['id'] ?>" <?= (string) $v('department_id') === (string) $d['id'] ? 'selected' : '' ?>><?= e($d['name']) ?></option><?php endforeach; ?>
                        </select><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Language</label>
                        <select name="locale" class="form-select"><?php foreach (config('app.locales') as $c => $n): ?><option value="<?= $c ?>" <?= $v('locale', 'en') === $c ? 'selected' : '' ?>><?= e($n) ?></option><?php endforeach; ?></select></div>
                    <div class="col-md-6"><label class="form-label">Status</label>
                        <select name="status" class="form-select"><?php foreach (['active', 'inactive', 'suspended'] as $s): ?><option value="<?= $s ?>" <?= $v('status', 'active') === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option><?php endforeach; ?></select></div>
                </div>
            </div>
            <div class="card erp-card mt-3">
                <div class="card-header">Password <?= $id ? '<span class="small text-body-secondary">(leave blank to keep current)</span>' : '' ?></div>
                <div class="card-body row g-3">
                    <div class="col-md-6"><label class="form-label">Password</label><input type="password" name="password" class="form-control" autocomplete="new-password" <?= $id ? '' : 'required' ?>><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Confirm Password</label><input type="password" name="password_confirmation" class="form-control" autocomplete="new-password"></div>
                    <div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" name="must_change_password" value="1" id="mcp" <?= $id ? '' : 'checked' ?>><label class="form-check-label" for="mcp">Require password change at next login</label></div></div>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card erp-card">
                <div class="card-header">Roles</div>
                <div class="card-body erp-scroll">
                    <?php foreach ($roles as $r): ?>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" name="roles[]" value="<?= $r['id'] ?>" id="role<?= $r['id'] ?>" <?= in_array($r['id'], $userRoles) ? 'checked' : '' ?>>
                            <label class="form-check-label" for="role<?= $r['id'] ?>"><strong><?= e($r['name']) ?></strong><br><small class="text-body-secondary"><?= e($r['description']) ?></small></label>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <button class="btn btn-primary w-100 mt-3"><i class="bi bi-check2"></i> <?= __('save') ?></button>
        </div>
    </div>
</form>
