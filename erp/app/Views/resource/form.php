<?php
/** @var App\Services\Resource $r */
$id = $record['id'] ?? null;
$errors = $_SESSION['_errors'] ?? [];
unset($_SESSION['_errors']);
$val = fn (string $name, $default = '') => old($name, $record[$name] ?? $default);
echo App\Core\View::partial('partials/page_header', [
    'title' => $title, 'icon' => $r->def['icon'] ?? '',
    'actions' => '<a href="' . url('admin/' . $r->key) . '" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i> Back</a>',
]);
?>
<form method="post" action="<?= url('admin/' . $r->key . ($id ? '/' . $id : '')) ?>" data-ajax class="card erp-card" novalidate>
    <?= csrf_field() ?>
    <?php if ($id): ?><input type="hidden" name="_method" value="PUT"><?php endif; ?>
    <div class="card-body">
        <div class="row g-3">
            <?php foreach ($r->fields as $name => $f):
                $type = $f['type'] ?? 'text';
                $required = str_contains($f['rules'] ?? '', 'required');
                $err = $errors[$name] ?? null;
                $cls = 'form-control' . ($err ? ' is-invalid' : '');
                $v = $val($name, $type === 'select' && $name === 'status' ? array_key_first($f['options']) : ($f['default'] ?? ''));
            ?>
                <?php if (!empty($f['section'])): ?>
                    <div class="col-12"><h6 class="erp-section-title"><?= e($f['section']) ?></h6></div>
                <?php endif; ?>
                <div class="col-md-<?= (int) ($f['col'] ?? 6) ?>">
                    <?php if ($type === 'checkbox'): ?>
                        <div class="form-check form-switch mt-md-4">
                            <input type="hidden" name="<?= e($name) ?>" value="0">
                            <input class="form-check-input" type="checkbox" role="switch" id="f_<?= e($name) ?>" name="<?= e($name) ?>" value="1" <?= $v ? 'checked' : '' ?>>
                            <label class="form-check-label" for="f_<?= e($name) ?>"><?= e($f['label']) ?></label>
                        </div>
                    <?php else: ?>
                        <label class="form-label" for="f_<?= e($name) ?>"><?= e($f['label']) ?><?= $required ? ' <span class="text-danger">*</span>' : '' ?></label>
                        <?php if ($type === 'textarea'): ?>
                            <textarea class="<?= $cls ?>" id="f_<?= e($name) ?>" name="<?= e($name) ?>" rows="2"><?= e($v) ?></textarea>
                        <?php elseif ($type === 'select' || $type === 'lookup'): ?>
                            <select class="form-select<?= $err ? ' is-invalid' : '' ?><?= $type === 'lookup' ? ' select2' : '' ?>" id="f_<?= e($name) ?>" name="<?= e($name) ?>" <?= $required ? 'required' : '' ?>>
                                <?php if (!$required || $type === 'lookup'): ?><option value="">— Select —</option><?php endif; ?>
                                <?php foreach ($r->options($name) as $ov => $ol): if ($name === 'parent_id' && $id && (string) $ov === (string) $id) continue; ?>
                                    <option value="<?= e($ov) ?>" <?= (string) $ov === (string) $v ? 'selected' : '' ?>><?= e($ol) ?></option>
                                <?php endforeach; ?>
                            </select>
                        <?php else:
                            $htmlType = ['decimal' => 'number', 'number' => 'number', 'date' => 'date', 'email' => 'email'][$type] ?? 'text';
                            $step = $type === 'decimal' ? ($f['step'] ?? '0.01') : ($type === 'number' ? '1' : null); ?>
                            <input type="<?= $htmlType ?>" class="<?= $cls ?>" id="f_<?= e($name) ?>" name="<?= e($name) ?>" value="<?= e($v) ?>"
                                <?= $step ? 'step="' . $step . '"' : '' ?> <?= $required ? 'required' : '' ?>>
                        <?php endif; ?>
                        <div class="invalid-feedback"><?= e($err ?? '') ?></div>
                        <?php if (!empty($f['help'])): ?><div class="form-text"><?= e($f['help']) ?></div><?php endif; ?>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <div class="card-footer d-flex justify-content-end gap-2">
        <a href="<?= url('admin/' . $r->key) ?>" class="btn btn-light"><?= __('cancel') ?></a>
        <button class="btn btn-primary"><i class="bi bi-check2"></i> <?= __('save') ?></button>
    </div>
</form>
<?php if ($id && can('audit.view')): ?>
    <div class="small text-body-secondary mt-2">
        <i class="bi bi-clock-history"></i> Last updated <?= e($record['updated_at'] ?? '') ?> ·
        <a href="<?= url('admin/audit?table=' . $r->table . '&record=' . $id) ?>">View change history</a>
    </div>
<?php endif; ?>
