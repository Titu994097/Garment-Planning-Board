<?php
declare(strict_types=1);

namespace App\Core;

/** Cached information_schema lookups. */
final class Schema
{
    private static array $columns = [];

    public static function columns(string $table): array
    {
        if (!isset(self::$columns[$table])) {
            $rows = Database::fetchAll(
                'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
                [$table]
            );
            self::$columns[$table] = array_column($rows, 'COLUMN_NAME');
        }
        return self::$columns[$table];
    }

    public static function hasColumn(string $table, string $column): bool
    {
        return in_array($column, self::columns($table), true);
    }
}
