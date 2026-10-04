<?php
/**
 * Demo: a vertically integrated knit/woven group with spinning → dyeing → garments.
 * Included from bin/install.php --demo; idempotent on company code.
 */
use App\Core\Database;
use App\Services\FiscalPeriodGenerator;

if (Database::value("SELECT id FROM companies WHERE code = 'AGT'")) {
    return;
}
$groupId = (int) Database::value("SELECT id FROM companies WHERE code = 'HQ'");
$cid = Database::insert('companies', [
    'code' => 'AGT', 'name' => 'Apex Global Textiles Ltd.', 'legal_name' => 'Apex Global Textiles Limited', 'short_name' => 'Apex',
    'parent_id' => $groupId, 'company_type' => 'garments', 'base_currency' => 'USD', 'country' => 'Bangladesh',
    'trade_license_no' => 'TRAD/DNCC/045812/2019', 'tin_no' => '512345678901', 'vat_bin_no' => '000123456-0101',
    'irc_no' => 'IRC-260326110012345', 'erc_no' => 'ERC-RA-0012345', 'bonded_license_no' => 'BOND/DHK/2019/1123',
    'bgmea_bkmea_no' => 'BGMEA-5521', 'phone' => '+880-2-5500-1122', 'email' => 'info@apex-textiles.example',
    'address' => 'Plot 21-24, BSCIC Industrial Estate, Gazipur, Bangladesh', 'established_date' => '2009-03-01',
]);

$bu = [];
foreach ([['KNT', 'Knit Division'], ['WVN', 'Woven Division'], ['TXT', 'Textile (Spinning & Dyeing)']] as [$code, $name]) {
    $bu[$code] = Database::insert('business_units', ['company_id' => $cid, 'code' => $code, 'name' => $name]);
}

$factories = [
    ['GZP1', 'Gazipur Knit Composite', 'composite', 'KNT', 34, 2100, 5200, 62000, 'WRAP, BSCI, OEKO-TEX Standard 100, GOTS, LEED Platinum'],
    ['ASH1', 'Ashulia Woven Garments', 'sewing', 'WVN', 28, 1450, 3800, 38000, 'WRAP, Sedex SMETA, Higg FEM, ISO 9001'],
    ['NRS1', 'Narsingdi Spinning Mill', 'spinning', 'TXT', 0, 420, 650, 0, 'GOTS, OCS, BCI'],
    ['VAL1', 'Valuka Dyeing & Finishing', 'dyeing_finishing', 'TXT', 0, 180, 900, 0, 'ZDHC MRSL, bluesign, OEKO-TEX STeP'],
];
$fid = [];
foreach ($factories as [$code, $name, $type, $b, $lines, $machines, $workers, $cap, $cert]) {
    $fid[$code] = Database::insert('factories', [
        'company_id' => $cid, 'business_unit_id' => $bu[$b], 'code' => $code, 'name' => $name, 'factory_type' => $type,
        'country' => 'Bangladesh', 'total_lines' => $lines, 'total_machines' => $machines, 'worker_capacity' => $workers,
        'daily_capacity_pcs' => $cap ?: null, 'working_hours' => 10, 'certifications' => $cert,
    ]);
}

foreach (['GZP1' => 18, 'ASH1' => 12] as $f => $n) {
    for ($i = 1; $i <= $n; $i++) {
        $ops = random_int(28, 42);
        $help = random_int(6, 12);
        Database::insert('production_units', [
            'company_id' => $cid, 'factory_id' => $fid[$f], 'code' => sprintf('L%02d', $i), 'name' => sprintf('Sewing Line %02d', $i),
            'unit_type' => 'sewing_line', 'floor_no' => (string) (intdiv($i - 1, 6) + 1), 'machine_count' => $ops + 4,
            'operator_count' => $ops, 'helper_count' => $help, 'capacity_per_hour' => random_int(90, 160),
            'target_efficiency' => random_int(55, 72), 'available_minutes' => ($ops + $help) * 10 * 60,
        ]);
    }
    foreach (['CUT' => ['Cutting Section', 'cutting'], 'FIN' => ['Finishing & Packing', 'finishing'], 'SMP' => ['Sample Room', 'sample_room'], 'QA' => ['Quality Assurance', 'quality']] as $code => [$name, $type]) {
        Database::insert('production_units', ['company_id' => $cid, 'factory_id' => $fid[$f], 'code' => $code, 'name' => $name, 'unit_type' => $type]);
    }
}
Database::insert('production_units', ['company_id' => $cid, 'factory_id' => $fid['GZP1'], 'code' => 'KNT', 'name' => 'Circular Knitting', 'unit_type' => 'knitting', 'machine_count' => 64]);
Database::insert('production_units', ['company_id' => $cid, 'factory_id' => $fid['NRS1'], 'code' => 'RS1', 'name' => 'Ring Spinning Unit 1', 'unit_type' => 'spinning', 'machine_count' => 48]);
Database::insert('production_units', ['company_id' => $cid, 'factory_id' => $fid['VAL1'], 'code' => 'DY1', 'name' => 'Batch Dyeing Unit', 'unit_type' => 'dyeing', 'machine_count' => 36]);
Database::insert('production_units', ['company_id' => $cid, 'factory_id' => $fid['ASH1'], 'code' => 'WSH', 'name' => 'Denim Washing Plant', 'unit_type' => 'washing', 'machine_count' => 22]);

$cc = [];
foreach ([
    ['CC-PRD', 'Production Overhead', 'production', 2400000], ['CC-ADM', 'Administration', 'administrative', 650000],
    ['CC-MKT', 'Merchandising & Marketing', 'selling', 480000], ['CC-LOG', 'Logistics & Shipping', 'distribution', 900000],
    ['CC-UTL', 'Utilities & Maintenance', 'service', 1100000],
] as [$code, $name, $type, $budget]) {
    $cc[$code] = Database::insert('cost_centers', ['company_id' => $cid, 'code' => $code, 'name' => $name, 'cost_type' => $type, 'annual_budget' => $budget]);
}

$depts = [
    ['MER', 'Merchandising', 'মার্চেন্ডাইজিং', 'CC-MKT', 0], ['IE', 'Industrial Engineering', 'শিল্প প্রকৌশল', 'CC-PRD', 1],
    ['PPC', 'Planning & Production Control', 'পরিকল্পনা', 'CC-PRD', 1], ['CUT', 'Cutting', 'কাটিং', 'CC-PRD', 1],
    ['SEW', 'Sewing', 'সেলাই', 'CC-PRD', 1], ['FIN', 'Finishing', 'ফিনিশিং', 'CC-PRD', 1], ['QA', 'Quality Assurance', 'মান নিশ্চিতকরণ', 'CC-PRD', 1],
    ['STR', 'Store & Inventory', 'স্টোর', 'CC-LOG', 0], ['COM', 'Commercial', 'বাণিজ্যিক', 'CC-LOG', 0], ['ACC', 'Accounts & Finance', 'হিসাব', 'CC-ADM', 0],
    ['HR', 'HR, Admin & Compliance', 'মানবসম্পদ', 'CC-ADM', 0], ['MNT', 'Maintenance', 'রক্ষণাবেক্ষণ', 'CC-UTL', 0], ['IT', 'IT & ERP', 'আইটি', 'CC-ADM', 0],
];
$deptIds = [];
foreach ($depts as [$code, $name, $local, $ccode, $prod]) {
    $deptIds[$code] = Database::insert('departments', ['company_id' => $cid, 'code' => $code, 'name' => $name, 'name_local' => $local, 'cost_center_id' => $cc[$ccode], 'is_production' => $prod]);
}

foreach ([
    ['DHK-HO', 'Dhaka Corporate Office', 'head_office', 'Dhaka', 'Bangladesh'], ['CTG-LO', 'Chattogram Liaison Office', 'liaison_office', 'Chattogram', 'Bangladesh'],
    ['HK-SO', 'Hong Kong Sourcing Office', 'sales_office', 'Hong Kong', 'Hong Kong'], ['DE-SO', 'Hamburg Sales Office', 'sales_office', 'Hamburg', 'Germany'],
] as [$code, $name, $type, $city, $country]) {
    Database::insert('branches', ['company_id' => $cid, 'code' => $code, 'name' => $name, 'branch_type' => $type, 'city' => $city, 'country' => $country]);
}

$y = (int) date('Y');
$startYear = (int) date('n') >= 7 ? $y : $y - 1;
$fy = Database::insert('fiscal_years', ['company_id' => $cid, 'code' => sprintf('FY%d-%02d', $startYear, ($startYear + 1) % 100), 'name' => sprintf('Fiscal Year %d-%d', $startYear, $startYear + 1), 'start_date' => "$startYear-07-01", 'end_date' => ($startYear + 1) . '-06-30', 'is_current' => 1]);
FiscalPeriodGenerator::generate($fy);

foreach ([
    ['International Mother Language Day', 'public', '02-21', '02-21'], ['Independence Day', 'public', '03-26', '03-26'],
    ['Bengali New Year', 'festival', '04-14', '04-14'], ['May Day', 'public', '05-01', '05-01'],
    ['Victory Day', 'public', '12-16', '12-16'], ['Christmas Day', 'public', '12-25', '12-25'],
] as [$title, $type, $s, $e]) {
    foreach ([$y, $y + 1] as $yr) {
        Database::insert('holidays', ['company_id' => $cid, 'title' => $title, 'holiday_type' => $type, 'start_date' => "$yr-$s", 'end_date' => "$yr-$e"]);
    }
}

foreach ([['USD', 'BDT', 122.5], ['EUR', 'USD', 1.09], ['GBP', 'USD', 1.27], ['USD', 'CNY', 7.18]] as [$f, $t, $r]) {
    Database::insert('exchange_rates', ['company_id' => $cid, 'from_currency' => $f, 'to_currency' => $t, 'rate' => $r, 'effective_date' => date('Y-m-d')]);
}

// demo users (password: Demo@12345)
$role = fn (string $slug) => (int) Database::value('SELECT id FROM roles WHERE slug = ? AND company_id IS NULL', [$slug]);
$pwd = password_hash('Demo@12345', PASSWORD_DEFAULT);
$users = [
    ['md', 'Rahim Chowdhury', 'Managing Director', 'management', null],
    ['gm.ops', 'Farhana Akter', 'GM Operations', 'company-admin', null],
    ['fm.gazipur', 'Kamal Hossain', 'Factory Manager', 'factory-manager', 'PPC'],
    ['hr.head', 'Nusrat Jahan', 'Head of HR & Compliance', 'hr-admin', 'HR'],
    ['cfo', 'Imran Kabir', 'Chief Financial Officer', 'accounts', 'ACC'],
    ['auditor', 'Sadia Islam', 'Internal Auditor', 'auditor', 'ACC'],
];
$uid = [];
foreach ($users as [$username, $name, $desig, $r, $dept]) {
    $uid[$username] = Database::insert('users', [
        'company_id' => $cid, 'factory_id' => $username === 'fm.gazipur' ? $fid['GZP1'] : null, 'department_id' => $dept ? $deptIds[$dept] : null,
        'full_name' => $name, 'username' => $username, 'email' => $username . '@apex-textiles.example', 'designation' => $desig, 'password_hash' => $pwd,
        'password_changed_at' => date('Y-m-d H:i:s'),
    ]);
    Database::insert('user_roles', ['user_id' => $uid[$username], 'role_id' => $role($r)]);
}
// give the super admin access to the demo company
$adminId = (int) Database::value("SELECT id FROM users WHERE username = 'admin'");
Database::query('INSERT IGNORE INTO user_company_access (user_id, company_id) VALUES (?, ?)', [$adminId, $cid]);

// purchase order workflow: two amount bands
$wf1 = Database::insert('approval_workflows', ['company_id' => $cid, 'name' => 'PO up to USD 10,000', 'document_type' => 'purchase_order', 'min_amount' => 0, 'max_amount' => 10000]);
Database::insert('approval_workflow_steps', ['workflow_id' => $wf1, 'step_order' => 1, 'name' => 'Checked By', 'approver_type' => 'role', 'role_id' => $role('factory-manager'), 'sla_hours' => 24]);
Database::insert('approval_workflow_steps', ['workflow_id' => $wf1, 'step_order' => 2, 'name' => 'Approved By', 'approver_type' => 'role', 'role_id' => $role('accounts'), 'sla_hours' => 24]);

$wf2 = Database::insert('approval_workflows', ['company_id' => $cid, 'name' => 'PO above USD 10,000', 'document_type' => 'purchase_order', 'min_amount' => 10000.01, 'require_signature' => 1]);
foreach ([['Checked By', 'factory-manager', null], ['Verified By', 'accounts', null], ['Approved By', null, $uid['md']]] as $i => [$n, $r, $u]) {
    Database::insert('approval_workflow_steps', [
        'workflow_id' => $wf2, 'step_order' => $i + 1, 'name' => $n, 'approver_type' => $u ? 'user' : 'role',
        'role_id' => $r ? $role($r) : null, 'user_id' => $u, 'sla_hours' => 48,
    ]);
}
$wf3 = Database::insert('approval_workflows', ['company_id' => $cid, 'name' => 'Leave Application', 'document_type' => 'leave_application']);
Database::insert('approval_workflow_steps', ['workflow_id' => $wf3, 'step_order' => 1, 'name' => 'HR Approval', 'approver_type' => 'role', 'role_id' => $role('hr-admin'), 'sla_hours' => 8]);

// a pending request so the inbox has something
Database::insert('approval_requests', [
    'company_id' => $cid, 'workflow_id' => $wf1, 'document_type' => 'purchase_order', 'document_id' => 1001, 'document_no' => 'PO-2026-1001',
    'title' => 'Sewing thread — Coats Epic 120, 1,200 cones', 'amount' => 6840, 'currency' => 'USD', 'requested_by' => $uid['gm.ops'],
]);
$reqId = (int) Database::connection()->lastInsertId();
Database::insert('approval_actions', ['request_id' => $reqId, 'step_order' => 0, 'step_name' => 'Submitted', 'user_id' => $uid['gm.ops'], 'action' => 'submitted']);
