<div class="row justify-content-center">
    <div class="col-lg-5">
        <div class="card erp-card">
            <div class="card-header"><h5 class="mb-0"><i class="bi bi-key me-2"></i><?= __('change_password') ?></h5></div>
            <div class="card-body">
                <?php if (!empty(auth()['must_change_password'])): ?>
                    <div class="alert alert-warning">You must change your password before continuing.</div>
                <?php endif; ?>
                <form method="post" action="<?= url('profile/password') ?>" data-ajax>
                    <?= csrf_field() ?>
                    <div class="mb-3"><label class="form-label">Current Password</label><input type="password" name="current_password" class="form-control" required autocomplete="current-password"><div class="invalid-feedback"></div></div>
                    <div class="mb-3"><label class="form-label">New Password</label><input type="password" name="password" class="form-control" required autocomplete="new-password"><div class="form-text">Min 8 characters with upper case, lower case and a number.</div><div class="invalid-feedback"></div></div>
                    <div class="mb-4"><label class="form-label">Confirm New Password</label><input type="password" name="password_confirmation" class="form-control" required autocomplete="new-password"></div>
                    <button class="btn btn-primary w-100"><?= __('save') ?></button>
                </form>
            </div>
        </div>
    </div>
</div>
