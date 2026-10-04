<div class="erp-page-header">
    <div>
        <h1 class="h4 mb-0"><?php if (!empty($icon)): ?><i class="bi <?= e($icon) ?> me-2 text-primary"></i><?php endif; ?><?= e($title) ?></h1>
        <?php if (!empty($subtitle)): ?><div class="text-body-secondary small"><?= e($subtitle) ?></div><?php endif; ?>
    </div>
    <div class="d-flex gap-2 flex-wrap"><?= $actions ?? '' ?></div>
</div>
