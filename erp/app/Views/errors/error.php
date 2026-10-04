<div class="min-vh-100 d-flex align-items-center justify-content-center text-center p-4">
    <div>
        <div class="display-1 fw-bold text-primary"><?= (int) $status ?></div>
        <p class="lead"><?= e($message ?: 'Something went wrong.') ?></p>
        <a href="<?= url('dashboard') ?>" class="btn btn-primary"><i class="bi bi-house"></i> Back to dashboard</a>
    </div>
</div>
