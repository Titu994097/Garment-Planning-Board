<?php
declare(strict_types=1);

namespace App\Core;

/** Writes immutable audit trail records with before/after JSON snapshots. */
final class AuditLogger
{
    private const HIDDEN = ['password_hash', 'password', 'api_token', 'remember_token', 'two_factor_secret'];

    public static function log(string $action, string $table, ?int $recordId, ?array $old = null, ?array $new = null): void
    {
        $old = $old ? self::scrub($old) : null;
        $new = $new ? self::scrub($new) : null;

        // only keep changed keys on update to keep the trail readable
        if ($old && $new) {
            $changed = array_keys(array_filter($new, static fn ($v, $k) => !self::same($old[$k] ?? null, $v), ARRAY_FILTER_USE_BOTH));
            if ($action === 'update' && !$changed) {
                return;
            }
            $old = array_intersect_key($old, array_flip($changed));
            $new = array_intersect_key($new, array_flip($changed));
        }

        Database::insert('audit_logs', [
            'company_id' => Auth::companyId() ?: null,
            'user_id' => Auth::id(),
            'action' => $action,
            'table_name' => $table,
            'record_id' => $recordId,
            'old_values' => $old ? json_encode($old, JSON_UNESCAPED_UNICODE) : null,
            'new_values' => $new ? json_encode($new, JSON_UNESCAPED_UNICODE) : null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'cli',
            'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? 'cli', 0, 255),
            'url' => substr($_SERVER['REQUEST_URI'] ?? '', 0, 255),
        ]);
    }

    /** "10.00" from MySQL and "10" from a form are the same value. */
    private static function same(mixed $a, mixed $b): bool
    {
        if (is_numeric($a) && is_numeric($b)) {
            return (float) $a === (float) $b;
        }
        return (string) ($a ?? '') === (string) ($b ?? '');
    }

    private static function scrub(array $data): array
    {
        return array_diff_key($data, array_flip(self::HIDDEN));
    }
}
