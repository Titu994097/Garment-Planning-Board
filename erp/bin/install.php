<?php
declare(strict_types=1);

/**
 * CLI installer.
 *   php bin/install.php                 # create schema + seed reference data
 *   php bin/install.php --demo          # also load a demo vertical textile group
 *   php bin/install.php --sync-permissions
 */
if (PHP_SAPI !== 'cli') {
    exit("CLI only\n");
}
define('BASE_PATH', dirname(__DIR__));
require BASE_PATH . '/app/Core/Autoloader.php';
App\Core\Autoloader::register(BASE_PATH . '/app');
require BASE_PATH . '/app/Core/helpers.php';

use App\Core\Config;
use App\Core\Database;
use App\Services\FiscalPeriodGenerator;
use App\Services\PermissionRegistry;

Config::load(BASE_PATH);
$args = array_slice($argv, 1);
$out = static fn (string $m) => fwrite(STDOUT, $m . PHP_EOL);

if (in_array('--sync-permissions', $args, true)) {
    $out('Permissions added: ' . PermissionRegistry::sync());
    exit(0);
}

// 1. create database if missing
$c = Config::get('database');
$pdo = new PDO(sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $c['host'], $c['port']), $c['username'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '', $c['database']) . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$out("Database `{$c['database']}` ready.");

// 2. run schema, honouring DELIMITER blocks for triggers
$db = Database::connection();
$sql = file_get_contents(BASE_PATH . '/database/schema.sql');
$delimiter = ';';
$buffer = '';
foreach (preg_split('/\R/', $sql) as $line) {
    if (preg_match('/^\s*DELIMITER\s+(\S+)\s*$/i', $line, $m)) {
        $delimiter = $m[1];
        continue;
    }
    if ($buffer === '' && preg_match('/^\s*(--.*)?$/', $line)) {
        continue;
    }
    $buffer .= $line . "\n";
    if (str_ends_with(rtrim($line), $delimiter)) {
        $stmt = substr(rtrim($buffer), 0, -strlen($delimiter));
        if (trim($stmt) !== '') {
            $db->exec($stmt);
        }
        $buffer = '';
    }
}
$out('Schema applied.');

// 3. reference data
$currencies = [
    ['USD', 'US Dollar', '$', 2], ['EUR', 'Euro', '€', 2], ['GBP', 'Pound Sterling', '£', 2], ['BDT', 'Bangladeshi Taka', '৳', 2],
    ['CNY', 'Chinese Yuan', '¥', 2], ['INR', 'Indian Rupee', '₹', 2], ['VND', 'Vietnamese Dong', '₫', 0], ['PKR', 'Pakistani Rupee', '₨', 2],
    ['TRY', 'Turkish Lira', '₺', 2], ['JPY', 'Japanese Yen', '¥', 0], ['HKD', 'Hong Kong Dollar', 'HK$', 2], ['LKR', 'Sri Lankan Rupee', 'Rs', 2],
];
foreach ($currencies as [$code, $name, $sym, $dp]) {
    Database::query('INSERT IGNORE INTO currencies (code, name, symbol, decimal_places) VALUES (?,?,?,?)', [$code, $name, $sym, $dp]);
}
$out('Permissions synced: ' . PermissionRegistry::sync() . ' new.');

// 4. system roles with sensible default permission bundles
$roles = [
    'super-admin' => ['Super Admin', 'Unrestricted access to every module and company', ['*']],
    'company-admin' => ['Company Administrator', 'Manages organisation setup, users and workflows for a company', ['%.view', '%.create', '%.edit', '%.delete', '%.export', 'audit.view', 'approvals.view_all']],
    'management' => ['Management / Director', 'Read-only oversight and final approvals', ['%.view', '%.export', 'approvals.view_all', 'signatures.view_all']],
    'factory-manager' => ['Factory Manager', 'Maintains factories, production units and calendars', ['factories.%', 'production_units.%', 'departments.view', 'holidays.%', 'cost_centers.view']],
    'hr-admin' => ['HR & Admin', 'Departments, holidays and user directory', ['departments.%', 'holidays.%', 'users.view', 'branches.view']],
    'accounts' => ['Accounts & Finance', 'Fiscal years, cost centers, currencies and exchange rates', ['fiscal_years.%', 'cost_centers.%', 'currencies.%', 'exchange_rates.%']],
    'auditor' => ['Internal Auditor', 'Read-only access to everything including the audit trail', ['%.view', '%.export', 'audit.view', 'approvals.view_all', 'signatures.view_all']],
];
foreach ($roles as $slug => [$name, $desc, $patterns]) {
    Database::query('INSERT IGNORE INTO roles (company_id, name, slug, description, is_system) VALUES (NULL,?,?,?,1)', [$name, $slug, $desc]);
    $roleId = (int) Database::value('SELECT id FROM roles WHERE slug = ? AND company_id IS NULL', [$slug]);
    if ($patterns === ['*']) {
        continue; // super admin bypasses permission checks
    }
    foreach ($patterns as $p) {
        Database::query('INSERT IGNORE INTO role_permissions (role_id, permission_id) SELECT ?, id FROM permissions WHERE slug LIKE ?', [$roleId, $p]);
    }
    if ($slug === 'company-admin') {
        // creating / removing legal entities and global currencies is a group-level (super admin) decision
        Database::query("DELETE rp FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
                          WHERE rp.role_id = ? AND p.slug IN ('companies.create','companies.delete','currencies.create','currencies.edit','currencies.delete')", [$roleId]);
    }
}
$out('System roles seeded.');

// 5. first company + super admin
if (!Database::value('SELECT COUNT(*) FROM companies')) {
    $companyId = Database::insert('companies', [
        'code' => 'HQ', 'name' => 'Head Office', 'company_type' => 'group', 'base_currency' => 'USD',
    ]);
    $password = getenv('ADMIN_PASSWORD') ?: 'Admin@12345';
    $adminId = Database::insert('users', [
        'company_id' => $companyId, 'full_name' => 'System Administrator', 'username' => 'admin', 'email' => 'admin@example.com',
        'designation' => 'ERP Administrator', 'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'is_super_admin' => 1, 'must_change_password' => 1, 'password_changed_at' => date('Y-m-d H:i:s'),
    ]);
    Database::query("INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE slug = 'super-admin' AND company_id IS NULL", [$adminId]);
    $out("Super admin created → username: admin  password: $password  (change on first login)");
}

if (in_array('--demo', $args, true)) {
    require BASE_PATH . '/database/demo_seed.php';
    $out('Demo data loaded.');
}
$out('Installation complete.');
