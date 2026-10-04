<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Auth;
use App\Core\AuditLogger;
use App\Core\Config;
use App\Core\Database;
use App\Core\Schema;

/**
 * Generic, company-scoped repository for a master-data resource defined in config/resources.php.
 * All identifiers come from the trusted registry; all values are bound parameters.
 */
final class Resource
{
    public readonly string $key;
    public readonly string $table;
    public readonly string $title;
    public readonly array $fields;
    public readonly array $def;

    private function __construct(string $key, array $def)
    {
        $this->key = $key;
        $this->def = $def;
        $this->table = $def['table'];
        $this->title = $def['title'];
        $this->fields = $def['fields'];
    }

    public static function find(string $key): ?self
    {
        $def = Config::get('resources.' . $key);
        return is_array($def) ? new self($key, $def) : null;
    }

    /** @return array<string, array> */
    public static function all(): array
    {
        return (array) Config::get('resources', []);
    }

    public function permission(string $action): string
    {
        return $this->key . '.' . $action;
    }

    public function isScoped(): bool
    {
        return ($this->def['scope'] ?? null) === 'company';
    }

    public function softDeletes(): bool
    {
        return ($this->def['soft_delete'] ?? true) && Schema::hasColumn($this->table, 'deleted_at');
    }

    public function listColumns(): array
    {
        return array_filter($this->fields, static fn ($f) => !empty($f['list']));
    }

    /** Base WHERE clause enforcing tenancy and soft-delete. */
    private function baseWhere(string $alias = 't'): array
    {
        $where = ['1=1'];
        $bind = [];
        if ($this->softDeletes()) {
            $where[] = "$alias.deleted_at IS NULL";
        }
        if ($this->isScoped()) {
            $where[] = "$alias.company_id = ?";
            $bind[] = Auth::companyId();
        }
        if ($this->table === 'companies' && !Auth::isSuperAdmin()) {
            // non-group admins only see the companies they have access to
            $where[] = "($alias.id = ? OR $alias.id IN (SELECT company_id FROM user_company_access WHERE user_id = ?))";
            array_push($bind, Auth::companyId(), Auth::id());
        }
        return [$where, $bind];
    }

    /** SELECT list with joined labels for lookup columns. */
    private function selectSql(): array
    {
        $select = ['t.*'];
        $joins = [];
        $i = 0;
        foreach ($this->fields as $name => $f) {
            if (($f['type'] ?? '') !== 'lookup') {
                continue;
            }
            [$lt, $lc] = $f['lookup'];
            $vc = $f['lookup'][3] ?? 'id';
            if ($vc !== 'id') {
                continue; // value already human readable (e.g. currency code)
            }
            $a = 'l' . $i++;
            $joins[] = "LEFT JOIN `$lt` $a ON $a.`$vc` = t.`$name`";
            $select[] = "$a.`$lc` AS `{$name}__label`";
        }
        return [implode(', ', $select), implode(' ', $joins)];
    }

    /**
     * Server-side paging for DataTables / API.
     * @return array{total:int, filtered:int, rows:array}
     */
    public function paginate(int $start, int $length, string $search = '', ?string $orderCol = null, string $dir = 'asc', array $filters = []): array
    {
        [$where, $bind] = $this->baseWhere();
        [$select, $joins] = $this->selectSql();
        $total = (int) Database::value("SELECT COUNT(*) FROM `{$this->table}` t WHERE " . implode(' AND ', $where), $bind);

        foreach ($filters as $col => $val) {
            if (isset($this->fields[$col]) && $val !== '' && $val !== null) {
                $where[] = "t.`$col` = ?";
                $bind[] = $val;
            }
        }
        if ($search !== '') {
            $like = [];
            foreach ($this->listColumns() as $name => $f) {
                $like[] = "t.`$name` LIKE ?";
                $bind[] = '%' . $search . '%';
            }
            if ($like) {
                $where[] = '(' . implode(' OR ', $like) . ')';
            }
        }
        $whereSql = implode(' AND ', $where);
        $filtered = (int) Database::value("SELECT COUNT(*) FROM `{$this->table}` t $joins WHERE $whereSql", $bind);

        $order = $orderCol !== null && isset($this->fields[$orderCol])
            ? "t.`$orderCol` " . (strtolower($dir) === 'desc' ? 'DESC' : 'ASC')
            : 't.' . ($this->def['order'] ?? 'id DESC');
        $length = max(1, min($length, 1000));
        $rows = Database::fetchAll(
            "SELECT $select FROM `{$this->table}` t $joins WHERE $whereSql ORDER BY $order LIMIT " . (int) $length . ' OFFSET ' . max(0, $start),
            $bind
        );
        return ['total' => $total, 'filtered' => $filtered, 'rows' => $rows];
    }

    public function findRecord(int $id): ?array
    {
        [$where, $bind] = $this->baseWhere();
        [$select, $joins] = $this->selectSql();
        return Database::fetch(
            "SELECT $select FROM `{$this->table}` t $joins WHERE t.id = ? AND " . implode(' AND ', $where),
            [$id, ...$bind]
        );
    }

    /** Validation rules with runtime placeholders resolved. */
    public function rules(?int $id = null): array
    {
        $rules = [];
        foreach ($this->fields as $name => $f) {
            $r = $f['rules'] ?? '';
            if (($f['type'] ?? '') === 'lookup' && !empty($f['lookup'][2])) {
                $r = trim($r . '|owned:' . $f['lookup'][0], '|');
            }
            $rules[$name] = str_replace(['{id}', '{company}'], [(string) ($id ?? 'NULL'), (string) Auth::companyId()], $r);
        }
        return $rules;
    }

    public function labels(): array
    {
        return array_map(static fn ($f) => $f['label'], $this->fields);
    }

    /** Cast raw input into DB-ready values. */
    public function normalize(array $input): array
    {
        $data = [];
        foreach ($this->fields as $name => $f) {
            $type = $f['type'] ?? 'text';
            if ($type === 'checkbox') {
                $data[$name] = !empty($input[$name]) ? 1 : 0;
                continue;
            }
            $v = $input[$name] ?? null;
            $v = is_string($v) ? trim($v) : $v;
            $data[$name] = ($v === '' || $v === null) ? null : $v;
        }
        return $data;
    }

    public function create(array $input): int
    {
        $data = $this->normalize($input);
        if ($this->isScoped()) {
            $data['company_id'] = Auth::companyId();
        }
        if (Schema::hasColumn($this->table, 'created_by')) {
            $data['created_by'] = Auth::id();
        }
        return Database::transaction(function () use ($data) {
            $id = Database::insert($this->table, $data);
            $this->afterSave($id, $data);
            AuditLogger::log('create', $this->table, $id, null, $data);
            return $id;
        });
    }

    public function update(int $id, array $input): bool
    {
        $old = $this->findRecord($id);
        if (!$old) {
            return false;
        }
        $data = $this->normalize($input);
        if (Schema::hasColumn($this->table, 'updated_by')) {
            $data['updated_by'] = Auth::id();
        }
        Database::transaction(function () use ($id, $data, $old) {
            Database::update($this->table, $data, 'id = ?', [$id]);
            $this->afterSave($id, $data);
            AuditLogger::log('update', $this->table, $id, $old, $data);
        });
        return true;
    }

    public function delete(int $id): bool
    {
        $old = $this->findRecord($id);
        if (!$old) {
            return false;
        }
        if ($this->softDeletes()) {
            Database::update($this->table, ['deleted_at' => date('Y-m-d H:i:s')], 'id = ?', [$id]);
        } else {
            Database::query("DELETE FROM `{$this->table}` WHERE id = ?", [$id]);
        }
        AuditLogger::log('delete', $this->table, $id, $old, null);
        return true;
    }

    /** Domain rules that span records. */
    private function afterSave(int $id, array $data): void
    {
        if ($this->table === 'fiscal_years') {
            if (!empty($data['is_current'])) {
                Database::query('UPDATE fiscal_years SET is_current = 0 WHERE company_id = ? AND id <> ?', [Auth::companyId(), $id]);
            }
            FiscalPeriodGenerator::generate($id);
        }
    }

    /** Options for lookup / select fields. */
    public function options(string $field): array
    {
        $f = $this->fields[$field] ?? null;
        if (!$f) {
            return [];
        }
        if (($f['type'] ?? '') === 'select') {
            return $f['options'];
        }
        [$lt, $lc, $scoped] = $f['lookup'];
        $vc = $f['lookup'][3] ?? 'id';
        $where = [];
        $bind = [];
        if ($scoped && Schema::hasColumn($lt, 'company_id')) {
            $where[] = 'company_id = ?';
            $bind[] = Auth::companyId();
        }
        if (Schema::hasColumn($lt, 'deleted_at')) {
            $where[] = 'deleted_at IS NULL';
        }
        if (Schema::hasColumn($lt, 'status')) {
            $where[] = "status = 'active'";
        }
        $sql = "SELECT `$vc` AS v, `$lc` AS l FROM `$lt`" . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY `$lc` LIMIT 2000";
        return array_column(Database::fetchAll($sql, $bind), 'l', 'v');
    }

    /** Human readable value for list / export. */
    public function display(string $field, array $row): string
    {
        $f = $this->fields[$field];
        $v = $row[$field] ?? null;
        return match ($f['type'] ?? 'text') {
            'lookup' => (string) ($row[$field . '__label'] ?? $v ?? ''),
            'select' => (string) ($f['options'][$v] ?? $v ?? ''),
            'checkbox' => $v ? 'Yes' : 'No',
            'decimal' => ($f['format'] ?? '') === 'money' && $v !== null ? number_format((float) $v, 2) : (string) ($v ?? ''),
            default => (string) ($v ?? ''),
        };
    }
}
