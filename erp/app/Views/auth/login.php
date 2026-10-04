<div class="erp-auth">
    <div class="erp-auth-panel d-none d-lg-flex">
        <div>
            <i class="bi bi-boxes display-3"></i>
            <h1 class="mt-3 fw-bold"><?= e(config('app.name')) ?></h1>
            <p class="lead opacity-75">Fibre to shipment — one integrated platform for spinning, weaving, knitting, dyeing, garments and export.</p>
            <ul class="list-unstyled opacity-75 mt-4">
                <li><i class="bi bi-check2-circle me-2"></i>Multi-company · multi-factory · multi-currency</li>
                <li><i class="bi bi-check2-circle me-2"></i>Role based access with multi-level approvals</li>
                <li><i class="bi bi-check2-circle me-2"></i>Tamper-evident audit trail & digital signatures</li>
            </ul>
        </div>
    </div>
    <div class="erp-auth-form">
        <form method="post" action="<?= url('login') ?>" class="w-100" style="max-width:380px" novalidate>
            <?= csrf_field() ?>
            <h2 class="fw-bold mb-1"><?= __('sign_in') ?></h2>
            <p class="text-body-secondary mb-4">Enter your credentials to continue.</p>
            <?php if ($m = flash('error')): ?><div class="alert alert-danger py-2"><?= e($m) ?></div><?php endif; ?>
            <?php $errors = $_SESSION['_errors'] ?? []; unset($_SESSION['_errors']); ?>
            <div class="mb-3">
                <label class="form-label" for="username"><?= __('username') ?></label>
                <input type="text" class="form-control form-control-lg <?= isset($errors['username']) ? 'is-invalid' : '' ?>" id="username" name="username" value="<?= e(old('username')) ?>" autocomplete="username" autofocus required>
                <div class="invalid-feedback"><?= e($errors['username'] ?? '') ?></div>
            </div>
            <div class="mb-4">
                <label class="form-label" for="password"><?= __('password') ?></label>
                <input type="password" class="form-control form-control-lg <?= isset($errors['password']) ? 'is-invalid' : '' ?>" id="password" name="password" autocomplete="current-password" required>
                <div class="invalid-feedback"><?= e($errors['password'] ?? '') ?></div>
            </div>
            <button class="btn btn-primary btn-lg w-100"><?= __('sign_in') ?> <i class="bi bi-arrow-right"></i></button>
            <div class="text-center mt-4 small">
                <?php foreach (config('app.locales') as $code => $name): ?>
                    <a href="?lang=<?= $code ?>" class="mx-1"><?= e($name) ?></a>
                <?php endforeach; ?>
            </div>
        </form>
    </div>
</div>
