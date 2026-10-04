<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Rule syntax: "required|email|max:150|unique:users,email,{id}|in:a,b|numeric|date|min:0"
 */
final class Validator
{
    private array $errors = [];

    public function __construct(private readonly array $data, private readonly array $rules, private readonly array $labels = [])
    {
    }

    public static function make(array $data, array $rules, array $labels = []): self
    {
        $v = new self($data, $rules, $labels);
        $v->run();
        return $v;
    }

    public function fails(): bool { return $this->errors !== []; }
    public function errors(): array { return $this->errors; }

    private function run(): void
    {
        foreach ($this->rules as $field => $ruleString) {
            $value = $this->data[$field] ?? null;
            $rules = is_array($ruleString) ? $ruleString : explode('|', $ruleString);
            $label = $this->labels[$field] ?? ucwords(str_replace('_', ' ', $field));
            $empty = $value === null || $value === '' || $value === [];

            if (!in_array('required', $rules, true) && $empty) {
                continue;
            }
            foreach ($rules as $rule) {
                [$name, $param] = array_pad(explode(':', $rule, 2), 2, null);
                $error = match ($name) {
                    'required' => $empty ? "$label is required." : null,
                    'email' => !filter_var($value, FILTER_VALIDATE_EMAIL) ? "$label must be a valid email." : null,
                    'numeric' => !is_numeric($value) ? "$label must be numeric." : null,
                    'integer' => filter_var($value, FILTER_VALIDATE_INT) === false ? "$label must be an integer." : null,
                    'date' => strtotime((string) $value) === false ? "$label must be a valid date." : null,
                    'min' => is_numeric($value) ? ((float) $value < (float) $param ? "$label must be at least $param." : null)
                        : (mb_strlen((string) $value) < (int) $param ? "$label must be at least $param characters." : null),
                    'max' => is_numeric($value) && !is_string($value) ? ((float) $value > (float) $param ? "$label may not exceed $param." : null)
                        : (mb_strlen((string) $value) > (int) $param ? "$label may not exceed $param characters." : null),
                    'in' => !in_array((string) $value, explode(',', (string) $param), true) ? "$label is invalid." : null,
                    'regex' => !preg_match((string) $param, (string) $value) ? "$label format is invalid." : null,
                    'confirmed' => $value !== ($this->data[$field . '_confirmation'] ?? null) ? "$label confirmation does not match." : null,
                    'after_or_equal' => strtotime((string) $value) < strtotime((string) ($this->data[$param] ?? '')) ? "$label must be on or after " . str_replace('_', ' ', (string) $param) . '.' : null,
                    'unique' => $this->checkUnique((string) $param, $value) ? null : "$label has already been taken.",
                    'exists' => $this->checkExists((string) $param, $value) ? null : "Selected $label is invalid.",
                    'owned' => $this->checkOwned((string) $param, $value) ? null : "Selected $label is invalid.",
                    'password' => !preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', (string) $value)
                        ? "$label must be 8+ chars with upper, lower case and a number." : null,
                    default => null,
                };
                if ($error) {
                    $this->errors[$field] = $error;
                    break;
                }
            }
        }
    }

    /** unique:table,column[,ignoreId[,scopeColumn,scopeValue]] */
    private function checkUnique(string $param, mixed $value): bool
    {
        $p = explode(',', $param);
        [$table, $column] = [self::ident($p[0]), self::ident($p[1])];
        $sql = "SELECT COUNT(*) FROM `$table` WHERE `$column` = ?";
        $bind = [$value];
        if (!empty($p[2]) && $p[2] !== 'NULL') {
            $sql .= ' AND id <> ?';
            $bind[] = (int) $p[2];
        }
        if (!empty($p[3])) {
            $sql .= ' AND `' . self::ident($p[3]) . '` = ?';
            $bind[] = $p[4] ?? null;
        }
        if (Schema::hasColumn($table, 'deleted_at')) {
            $sql .= ' AND deleted_at IS NULL';
        }
        return (int) Database::value($sql, $bind) === 0;
    }

    private function checkExists(string $param, mixed $value): bool
    {
        [$table, $column] = array_pad(explode(',', $param), 2, 'id');
        return (int) Database::value('SELECT COUNT(*) FROM `' . self::ident($table) . '` WHERE `' . self::ident($column) . '` = ?', [$value]) > 0;
    }

    /** owned:table — row must exist AND belong to the active company (tenant isolation). */
    private function checkOwned(string $table, mixed $value): bool
    {
        $t = self::ident($table);
        return (int) Database::value("SELECT COUNT(*) FROM `$t` WHERE id = ? AND company_id = ?", [$value, Auth::companyId()]) > 0;
    }

    private static function ident(string $s): string
    {
        return preg_replace('/[^A-Za-z0-9_]/', '', $s);
    }
}
