<?php
$actions = can('workflows.create') ? '<a href="' . url('admin/workflows/create') . '" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> New Workflow</a>' : '';
echo App\Core\View::partial('partials/page_header', ['title' => __('approval_workflow'), 'icon' => 'bi-diagram-2', 'subtitle' => 'Multi-level approval chains by document type and amount band', 'actions' => $actions]);
?>
<div class="card erp-card">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Workflow</th><th>Document Type</th><th class="text-end">Amount Band</th><th class="text-center">Steps</th><th class="text-center">Signature</th><th class="text-center">Pending</th><th>Status</th><th></th></tr></thead>
            <tbody>
            <?php foreach ($workflows as $w): ?>
                <tr>
                    <td><strong><?= e($w['name']) ?></strong><div class="small text-body-secondary"><?= e($w['description']) ?></div></td>
                    <td><?= e($types[$w['document_type']] ?? $w['document_type']) ?></td>
                    <td class="text-end small"><?= $w['min_amount'] !== null ? number_format((float) $w['min_amount']) : '0' ?> – <?= $w['max_amount'] !== null ? number_format((float) $w['max_amount']) : '∞' ?></td>
                    <td class="text-center"><span class="badge text-bg-light"><?= (int) $w['steps'] ?></span></td>
                    <td class="text-center"><?= $w['require_signature'] ? '<i class="bi bi-pen text-success"></i>' : '—' ?></td>
                    <td class="text-center"><?= (int) $w['pending'] ?></td>
                    <td><span class="badge erp-status-<?= e($w['status']) ?>"><?= e(ucfirst($w['status'])) ?></span></td>
                    <td class="text-end text-nowrap">
                        <?php if (can('workflows.edit')): ?><a class="btn btn-sm btn-light" href="<?= url('admin/workflows/' . $w['id'] . '/edit') ?>"><i class="bi bi-pencil"></i></a><?php endif; ?>
                        <?php if (can('workflows.delete')): ?><button class="btn btn-sm btn-light text-danger" data-delete="<?= url('admin/workflows/' . $w['id']) ?>"><i class="bi bi-trash"></i></button><?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            <?php if (!$workflows): ?><tr><td colspan="8" class="text-center text-body-secondary py-5">No workflows configured yet.</td></tr><?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
