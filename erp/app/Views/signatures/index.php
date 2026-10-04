<?php
echo App\Core\View::partial('partials/page_header', [
    'title' => __('digital_signature'), 'icon' => 'bi-pen',
    'actions' => '<a href="' . url('signatures/verify') . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-patch-check"></i> Verify a code</a>',
]);
?>
<div class="row g-3">
    <div class="col-lg-5">
        <div class="card erp-card h-100">
            <div class="card-header">Current Signature</div>
            <div class="card-body text-center">
                <?php if ($signature): ?>
                    <img src="<?= url('signatures/' . $signature['id'] . '/image') ?>" alt="Your signature" class="erp-signature-img">
                    <div class="small text-body-secondary mt-2">Registered <?= e(date('d M Y H:i', strtotime($signature['created_at']))) ?>
                        <?= $signature['pin_hash'] ? ' · <i class="bi bi-lock"></i> PIN protected' : '' ?></div>
                    <div class="small mt-1"><code title="SHA-256 fingerprint"><?= e(substr($signature['signature_hash'], 0, 16)) ?>…</code></div>
                <?php else: ?>
                    <div class="text-body-secondary py-5"><i class="bi bi-pen fs-1 d-block"></i>No signature registered yet.</div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <div class="col-lg-7">
        <form class="card erp-card h-100" method="post" action="<?= url('signatures') ?>" data-ajax enctype="multipart/form-data" id="sigForm">
            <?= csrf_field() ?>
            <input type="hidden" name="signature_data" id="sigData">
            <div class="card-header"><?= $signature ? 'Replace' : 'Register' ?> Signature</div>
            <div class="card-body">
                <ul class="nav nav-pills nav-sm mb-2">
                    <li class="nav-item"><button type="button" class="nav-link active" data-bs-toggle="pill" data-bs-target="#sigDraw">Draw</button></li>
                    <li class="nav-item"><button type="button" class="nav-link" data-bs-toggle="pill" data-bs-target="#sigUpload">Upload</button></li>
                </ul>
                <div class="tab-content mb-3">
                    <div class="tab-pane fade show active" id="sigDraw">
                        <canvas id="sigPad" class="erp-sigpad" width="600" height="180"></canvas>
                        <button type="button" class="btn btn-sm btn-link" id="sigClear">Clear</button>
                    </div>
                    <div class="tab-pane fade" id="sigUpload">
                        <input type="file" name="signature_file" accept="image/png,image/jpeg" class="form-control">
                        <div class="form-text">PNG/JPEG, transparent background recommended, max 512 KB.</div>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label">Signing PIN (optional)</label><input type="password" name="pin" class="form-control" inputmode="numeric" autocomplete="new-password"><div class="form-text">4–20 digits, asked every time you sign.</div><div class="invalid-feedback"></div></div>
                    <div class="col-md-6"><label class="form-label">Confirm with account password <span class="text-danger">*</span></label><input type="password" name="current_password" class="form-control" required autocomplete="current-password"><div class="invalid-feedback"></div></div>
                </div>
            </div>
            <div class="card-footer text-end"><button class="btn btn-primary"><i class="bi bi-check2"></i> Save Signature</button></div>
        </form>
    </div>
    <div class="col-12">
        <div class="card erp-card">
            <div class="card-header">Documents I Have Signed</div>
            <div class="table-responsive"><table class="table table-sm mb-0">
                <thead><tr><th>Date</th><th>Document</th><th>Role</th><th>Verification Code</th><th>Hash</th></tr></thead>
                <tbody>
                <?php foreach ($signed as $s): ?>
                    <tr><td><?= e($s['signed_at']) ?></td><td><?= e($s['document_type']) ?> #<?= (int) $s['document_id'] ?></td><td><?= e($s['sign_role']) ?></td>
                        <td><code><?= e($s['verification_code']) ?></code></td><td><code class="small"><?= e(substr($s['document_hash'], 0, 20)) ?>…</code></td></tr>
                <?php endforeach; ?>
                <?php if (!$signed): ?><tr><td colspan="5" class="text-center text-body-secondary py-3">None yet.</td></tr><?php endif; ?>
                </tbody>
            </table></div>
        </div>
    </div>
</div>
<?php App\Core\View::push('<script>ERP.signaturePad();</script>'); ?>
