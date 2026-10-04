<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Core\Database;

/** Derives the full permission catalogue from the resource registry plus hand-written controllers. */
final class PermissionRegistry
{
    public static function definitions(): array
    {
        $defs = [];
        foreach (Config::get('resources', []) as $key => $r) {
            foreach (['view', 'create', 'edit', 'delete', 'export'] as $a) {
                $defs[] = [$r['module'] ?? 'corporate', $key, $a];
            }
        }
        $extra = [
            'users' => ['view', 'create', 'edit', 'delete'],
            'roles' => ['view', 'create', 'edit', 'delete'],
            'workflows' => ['view', 'create', 'edit', 'delete'],
            'approvals' => ['view_all'],
            'signatures' => ['view_all'],
            'audit' => ['view'],
        ];
        foreach ($extra as $res => $actions) {
            foreach ($actions as $a) {
                $defs[] = ['security', $res, $a];
            }
        }
        return $defs;
    }

    /** Insert any missing permissions; returns number added. */
    public static function sync(): int
    {
        $added = 0;
        foreach (self::definitions() as [$module, $res, $action]) {
            $slug = "$res.$action";
            $n = Database::query(
                'INSERT IGNORE INTO permissions (module, resource, action, slug, description) VALUES (?,?,?,?,?)',
                [$module, $res, $action, $slug, ucfirst(str_replace('_', ' ', $action)) . ' ' . str_replace('_', ' ', $res)]
            )->rowCount();
            $added += $n;
        }
        return $added;
    }
}
