<?php echo App\Core\View::partial('partials/page_header', ['title' => 'Verify Digital Signature', 'icon' => 'bi-patch-check']); ?>
<div class="row justify-content-center">
    <div class="col-lg-6">
        <form class="card erp-card mb-3" method="get" action="<?= url('signatures/verify') ?>">
            <div class="card-body d-flex gap-2">
                <input name="code" class="form-control text-uppercase" placeholder="16-character verification code" value="<?= e($code) ?>" maxlength="16" required>
                <button class="btn btn-primary">Verify</button>
            </div>
        </form>
        <?php if ($code !== ''): ?>
            <?php if ($row): ?>
                <div class="alert alert-success">
                    <h5 class="alert-heading"><i class="bi bi-patch-check-fill"></i> Signature found</h5>
                    <dl class="row mb-0 small">
                        <dt class="col-4">Signed by</dt><dd class="col-8"><?= e($row['full_name']) ?> (<?= e($row['designation']) ?>)</dd>
                        <dt class="col-4">Company</dt><dd class="col-8"><?= e($row['company_name']) ?></dd>
                        <dt class="col-4">Document</dt><dd class="col-8"><?= e($row['document_type']) ?> #<?= (int) $row['document_id'] ?></dd>
                        <dt class="col-4">Capacity</dt><dd class="col-8"><?= e($row['sign_role']) ?></dd>
                        <dt class="col-4">Signed at</dt><dd class="col-8"><?= e($row['signed_at']) ?> UTC</dd>
                        <dt class="col-4">Document hash</dt><dd class="col-8"><code class="text-break"><?= e($row['document_hash']) ?></code></dd>
                    </dl>
                </div>
            <?php else: ?>
                <div class="alert alert-danger"><i class="bi bi-x-octagon"></i> No signature matches this code.</div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>
