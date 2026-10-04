<?php
/**
 * Declarative master-data registry.
 *
 * Each entry drives: list screen (DataTables server-side), create/edit form,
 * validation, company scoping, permission slugs ({key}.view/create/edit/delete/export),
 * audit logging and the REST API (/api/v1/{key}).
 *
 * Field keys:
 *   type     text|textarea|email|number|decimal|date|select|lookup|checkbox
 *   rules    Validator rule string ({id} and {company} are substituted at runtime)
 *   options  for select: [value => label]
 *   lookup   for lookup: [table, label column, scoped(bool)]
 *   list     show in grid
 *   col      bootstrap column width in form (default 6)
 */

$status = ['active' => 'Active', 'inactive' => 'Inactive'];

return [
    'companies' => [
        'title' => 'Company Profile',
        'icon' => 'bi-building',
        'table' => 'companies',
        'scope' => null,
        'module' => 'corporate',
        'order' => 'name',
        'fields' => [
            'code' => ['label' => 'Company Code', 'type' => 'text', 'rules' => 'required|max:20|regex:/^[A-Z0-9_-]+$/i|unique:companies,code,{id}', 'list' => true, 'col' => 3],
            'name' => ['label' => 'Company Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 5],
            'short_name' => ['label' => 'Short Name', 'type' => 'text', 'rules' => 'max:50', 'col' => 4],
            'legal_name' => ['label' => 'Legal Name', 'type' => 'text', 'rules' => 'max:200', 'col' => 8],
            'parent_id' => ['label' => 'Parent / Group', 'type' => 'lookup', 'lookup' => ['companies', 'name', false], 'rules' => 'exists:companies,id', 'col' => 4],
            'company_type' => ['label' => 'Company Type', 'type' => 'select', 'rules' => 'required', 'list' => true, 'col' => 4, 'options' => [
                'group' => 'Group / Holding', 'spinning' => 'Spinning Mill', 'weaving' => 'Weaving Mill', 'knitting' => 'Knitting',
                'dyeing' => 'Dyeing & Finishing', 'garments' => 'Garments Manufacturing', 'washing' => 'Washing Plant',
                'printing' => 'Printing', 'trading' => 'Trading', 'buying_house' => 'Buying House']],
            'base_currency' => ['label' => 'Base Currency', 'type' => 'lookup', 'lookup' => ['currencies', 'code', false, 'code'], 'rules' => 'required|exists:currencies,code', 'list' => true, 'col' => 4],
            'established_date' => ['label' => 'Established', 'type' => 'date', 'rules' => 'date', 'col' => 4],
            'trade_license_no' => ['label' => 'Trade License No', 'type' => 'text', 'rules' => 'max:60', 'col' => 4, 'section' => 'Statutory & Compliance'],
            'tin_no' => ['label' => 'TIN', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'vat_bin_no' => ['label' => 'VAT / BIN', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'irc_no' => ['label' => 'IRC No', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'erc_no' => ['label' => 'ERC No', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'bonded_license_no' => ['label' => 'Bonded Warehouse License', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'bgmea_bkmea_no' => ['label' => 'BGMEA / BKMEA Membership', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'epz_permit_no' => ['label' => 'EPZ Permit No', 'type' => 'text', 'rules' => 'max:60', 'col' => 4],
            'country' => ['label' => 'Country', 'type' => 'text', 'rules' => 'max:80', 'list' => true, 'col' => 4, 'section' => 'Contact'],
            'phone' => ['label' => 'Phone', 'type' => 'text', 'rules' => 'max:40', 'col' => 4],
            'email' => ['label' => 'Email', 'type' => 'email', 'rules' => 'email|max:150', 'col' => 4],
            'website' => ['label' => 'Website', 'type' => 'text', 'rules' => 'max:150', 'col' => 4],
            'address' => ['label' => 'Address', 'type' => 'textarea', 'col' => 12],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
        ],
    ],

    'business_units' => [
        'title' => 'Business Units',
        'icon' => 'bi-diagram-3',
        'table' => 'business_units',
        'scope' => 'company',
        'module' => 'corporate',
        'fields' => [
            'code' => ['label' => 'Code', 'type' => 'text', 'rules' => 'required|max:20|unique:business_units,code,{id},company_id,{company}', 'list' => true, 'col' => 4],
            'name' => ['label' => 'Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 8],
            'head_user_id' => ['label' => 'Business Head', 'type' => 'lookup', 'lookup' => ['users', 'full_name', true], 'rules' => 'exists:users,id', 'list' => true],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true],
            'description' => ['label' => 'Description', 'type' => 'textarea', 'col' => 12],
        ],
    ],

    'factories' => [
        'title' => 'Factory Setup',
        'icon' => 'bi-buildings',
        'table' => 'factories',
        'scope' => 'company',
        'module' => 'corporate',
        'fields' => [
            'code' => ['label' => 'Factory Code', 'type' => 'text', 'rules' => 'required|max:20|unique:factories,code,{id},company_id,{company}', 'list' => true, 'col' => 3],
            'name' => ['label' => 'Factory Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 5],
            'factory_type' => ['label' => 'Factory Type', 'type' => 'select', 'rules' => 'required', 'list' => true, 'col' => 4, 'options' => [
                'composite' => 'Composite (Vertical)', 'spinning' => 'Spinning', 'weaving' => 'Weaving', 'knitting' => 'Knitting',
                'dyeing_finishing' => 'Dyeing & Finishing', 'cutting' => 'Cutting', 'sewing' => 'Sewing', 'washing' => 'Washing',
                'printing' => 'Printing', 'embroidery' => 'Embroidery', 'finishing_packing' => 'Finishing & Packing']],
            'business_unit_id' => ['label' => 'Business Unit', 'type' => 'lookup', 'lookup' => ['business_units', 'name', true], 'rules' => 'exists:business_units,id', 'col' => 4],
            'country' => ['label' => 'Country', 'type' => 'text', 'rules' => 'max:80', 'col' => 4],
            'phone' => ['label' => 'Phone', 'type' => 'text', 'rules' => 'max:40', 'col' => 4],
            'email' => ['label' => 'Email', 'type' => 'email', 'rules' => 'email|max:150', 'col' => 4],
            'gps_lat' => ['label' => 'Latitude', 'type' => 'decimal', 'rules' => 'numeric|min:-90|max:90', 'col' => 4],
            'gps_lng' => ['label' => 'Longitude', 'type' => 'decimal', 'rules' => 'numeric|min:-180|max:180', 'col' => 4],
            'floor_area_sqft' => ['label' => 'Floor Area (sqft)', 'type' => 'decimal', 'rules' => 'numeric|min:0', 'col' => 3, 'section' => 'Capacity'],
            'total_lines' => ['label' => 'Total Lines', 'type' => 'number', 'rules' => 'integer|min:0', 'list' => true, 'col' => 3],
            'total_machines' => ['label' => 'Total Machines', 'type' => 'number', 'rules' => 'integer|min:0', 'col' => 3],
            'worker_capacity' => ['label' => 'Worker Capacity', 'type' => 'number', 'rules' => 'integer|min:0', 'col' => 3],
            'daily_capacity_pcs' => ['label' => 'Daily Capacity (pcs)', 'type' => 'number', 'rules' => 'integer|min:0', 'list' => true, 'col' => 3],
            'working_hours' => ['label' => 'Working Hours/Day', 'type' => 'decimal', 'rules' => 'required|numeric|min:1|max:24', 'col' => 3],
            'weekly_off_day' => ['label' => 'Weekly Off', 'type' => 'select', 'options' => ['friday' => 'Friday', 'saturday' => 'Saturday', 'sunday' => 'Sunday'], 'rules' => 'required', 'col' => 3],
            'certifications' => ['label' => 'Certifications', 'type' => 'text', 'rules' => 'max:255', 'col' => 12, 'help' => 'Comma separated — e.g. WRAP, BSCI, OEKO-TEX, GOTS, LEED Platinum, ISO 9001'],
            'address' => ['label' => 'Address', 'type' => 'textarea', 'col' => 8],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
        ],
    ],

    'production_units' => [
        'title' => 'Production Units',
        'icon' => 'bi-gear-wide-connected',
        'table' => 'production_units',
        'scope' => 'company',
        'module' => 'corporate',
        'fields' => [
            'factory_id' => ['label' => 'Factory', 'type' => 'lookup', 'lookup' => ['factories', 'name', true], 'rules' => 'required|exists:factories,id', 'list' => true, 'col' => 4],
            'code' => ['label' => 'Unit Code', 'type' => 'text', 'rules' => 'required|max:20', 'list' => true, 'col' => 4],
            'name' => ['label' => 'Unit / Line Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 4],
            'unit_type' => ['label' => 'Unit Type', 'type' => 'select', 'rules' => 'required', 'list' => true, 'col' => 4, 'options' => [
                'sewing_line' => 'Sewing Line', 'cutting' => 'Cutting', 'finishing' => 'Finishing', 'washing' => 'Washing',
                'printing' => 'Printing', 'embroidery' => 'Embroidery', 'knitting' => 'Knitting', 'dyeing' => 'Dyeing',
                'spinning' => 'Spinning', 'weaving' => 'Weaving', 'sample_room' => 'Sample Room', 'quality' => 'Quality']],
            'floor_no' => ['label' => 'Floor', 'type' => 'text', 'rules' => 'max:20', 'col' => 4],
            'supervisor_name' => ['label' => 'Supervisor', 'type' => 'text', 'rules' => 'max:100', 'col' => 4],
            'machine_count' => ['label' => 'Machines', 'type' => 'number', 'rules' => 'integer|min:0', 'col' => 3, 'section' => 'Capacity & Efficiency'],
            'operator_count' => ['label' => 'Operators', 'type' => 'number', 'rules' => 'integer|min:0', 'list' => true, 'col' => 3],
            'helper_count' => ['label' => 'Helpers', 'type' => 'number', 'rules' => 'integer|min:0', 'col' => 3],
            'capacity_per_hour' => ['label' => 'Capacity / Hour', 'type' => 'number', 'rules' => 'integer|min:0', 'list' => true, 'col' => 3],
            'target_efficiency' => ['label' => 'Target Efficiency %', 'type' => 'decimal', 'rules' => 'numeric|min:0|max:100', 'list' => true, 'col' => 4],
            'available_minutes' => ['label' => 'Available Minutes/Day', 'type' => 'number', 'rules' => 'integer|min:0', 'col' => 4, 'help' => '(Operators + Helpers) × Working Hours × 60'],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status + ['maintenance' => 'Maintenance'], 'rules' => 'required|in:active,inactive,maintenance', 'list' => true, 'col' => 4],
        ],
    ],

    'departments' => [
        'title' => 'Departments',
        'icon' => 'bi-people',
        'table' => 'departments',
        'scope' => 'company',
        'module' => 'corporate',
        'fields' => [
            'code' => ['label' => 'Code', 'type' => 'text', 'rules' => 'required|max:20|unique:departments,code,{id},company_id,{company}', 'list' => true, 'col' => 3],
            'name' => ['label' => 'Department Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 5],
            'name_local' => ['label' => 'Name (Local Language)', 'type' => 'text', 'rules' => 'max:150', 'col' => 4],
            'factory_id' => ['label' => 'Factory', 'type' => 'lookup', 'lookup' => ['factories', 'name', true], 'rules' => 'exists:factories,id', 'list' => true, 'col' => 4],
            'parent_id' => ['label' => 'Parent Department', 'type' => 'lookup', 'lookup' => ['departments', 'name', true], 'rules' => 'exists:departments,id', 'col' => 4],
            'cost_center_id' => ['label' => 'Cost Center', 'type' => 'lookup', 'lookup' => ['cost_centers', 'name', true], 'rules' => 'exists:cost_centers,id', 'list' => true, 'col' => 4],
            'head_name' => ['label' => 'Department Head', 'type' => 'text', 'rules' => 'max:100', 'col' => 4],
            'is_production' => ['label' => 'Production Department', 'type' => 'checkbox', 'col' => 4],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
        ],
    ],

    'cost_centers' => [
        'title' => 'Cost Centers',
        'icon' => 'bi-cash-coin',
        'table' => 'cost_centers',
        'scope' => 'company',
        'module' => 'corporate',
        'fields' => [
            'code' => ['label' => 'Code', 'type' => 'text', 'rules' => 'required|max:20|unique:cost_centers,code,{id},company_id,{company}', 'list' => true, 'col' => 3],
            'name' => ['label' => 'Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 5],
            'cost_type' => ['label' => 'Cost Type', 'type' => 'select', 'rules' => 'required', 'list' => true, 'col' => 4, 'options' => [
                'production' => 'Production', 'service' => 'Service', 'administrative' => 'Administrative', 'selling' => 'Selling', 'distribution' => 'Distribution']],
            'parent_id' => ['label' => 'Parent Cost Center', 'type' => 'lookup', 'lookup' => ['cost_centers', 'name', true], 'rules' => 'exists:cost_centers,id', 'col' => 4],
            'factory_id' => ['label' => 'Factory', 'type' => 'lookup', 'lookup' => ['factories', 'name', true], 'rules' => 'exists:factories,id', 'list' => true, 'col' => 4],
            'annual_budget' => ['label' => 'Annual Budget', 'type' => 'decimal', 'rules' => 'numeric|min:0', 'list' => true, 'col' => 4, 'format' => 'money'],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
        ],
    ],

    'branches' => [
        'title' => 'Branch Management',
        'icon' => 'bi-geo-alt',
        'table' => 'branches',
        'scope' => 'company',
        'module' => 'corporate',
        'fields' => [
            'code' => ['label' => 'Code', 'type' => 'text', 'rules' => 'required|max:20|unique:branches,code,{id},company_id,{company}', 'list' => true, 'col' => 3],
            'name' => ['label' => 'Branch Name', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 5],
            'branch_type' => ['label' => 'Branch Type', 'type' => 'select', 'rules' => 'required', 'list' => true, 'col' => 4, 'options' => [
                'head_office' => 'Head Office', 'corporate_office' => 'Corporate Office', 'liaison_office' => 'Liaison Office',
                'sales_office' => 'Sales Office', 'warehouse' => 'Warehouse', 'showroom' => 'Showroom']],
            'city' => ['label' => 'City', 'type' => 'text', 'rules' => 'max:80', 'list' => true, 'col' => 4],
            'country' => ['label' => 'Country', 'type' => 'text', 'rules' => 'max:80', 'list' => true, 'col' => 4],
            'manager_name' => ['label' => 'Manager', 'type' => 'text', 'rules' => 'max:100', 'col' => 4],
            'phone' => ['label' => 'Phone', 'type' => 'text', 'rules' => 'max:40', 'col' => 4],
            'email' => ['label' => 'Email', 'type' => 'email', 'rules' => 'email|max:150', 'col' => 4],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
            'address' => ['label' => 'Address', 'type' => 'textarea', 'col' => 12],
        ],
    ],

    'fiscal_years' => [
        'title' => 'Fiscal Years',
        'icon' => 'bi-calendar-range',
        'table' => 'fiscal_years',
        'scope' => 'company',
        'module' => 'corporate',
        'order' => 'start_date DESC',
        'fields' => [
            'code' => ['label' => 'Code', 'type' => 'text', 'rules' => 'required|max:20|unique:fiscal_years,code,{id},company_id,{company}', 'list' => true, 'col' => 4, 'help' => 'e.g. FY2026-27'],
            'name' => ['label' => 'Name', 'type' => 'text', 'rules' => 'required|max:100', 'list' => true, 'col' => 8],
            'start_date' => ['label' => 'Start Date', 'type' => 'date', 'rules' => 'required|date', 'list' => true, 'col' => 4],
            'end_date' => ['label' => 'End Date', 'type' => 'date', 'rules' => 'required|date|after_or_equal:start_date', 'list' => true, 'col' => 4],
            'is_current' => ['label' => 'Current Year', 'type' => 'checkbox', 'list' => true, 'col' => 4],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => ['open' => 'Open', 'closed' => 'Closed', 'locked' => 'Locked'], 'rules' => 'required|in:open,closed,locked', 'list' => true, 'col' => 4],
        ],
    ],

    'holidays' => [
        'title' => 'Holiday Calendar',
        'icon' => 'bi-calendar-heart',
        'table' => 'holidays',
        'scope' => 'company',
        'module' => 'corporate',
        'order' => 'start_date DESC',
        'fields' => [
            'title' => ['label' => 'Holiday', 'type' => 'text', 'rules' => 'required|max:150', 'list' => true, 'col' => 8],
            'holiday_type' => ['label' => 'Type', 'type' => 'select', 'rules' => 'required', 'list' => true, 'col' => 4, 'options' => [
                'public' => 'Public / Govt.', 'festival' => 'Festival', 'weekly' => 'Weekly', 'company' => 'Company',
                'compensatory' => 'Compensatory', 'optional' => 'Optional']],
            'start_date' => ['label' => 'From', 'type' => 'date', 'rules' => 'required|date', 'list' => true, 'col' => 4],
            'end_date' => ['label' => 'To', 'type' => 'date', 'rules' => 'required|date|after_or_equal:start_date', 'list' => true, 'col' => 4],
            'factory_id' => ['label' => 'Factory', 'type' => 'lookup', 'lookup' => ['factories', 'name', true], 'rules' => 'exists:factories,id', 'list' => true, 'col' => 4, 'help' => 'Leave blank for all factories'],
            'is_paid' => ['label' => 'Paid Holiday', 'type' => 'checkbox', 'col' => 4],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
            'remarks' => ['label' => 'Remarks', 'type' => 'text', 'rules' => 'max:255', 'col' => 12],
        ],
    ],

    'currencies' => [
        'title' => 'Currencies',
        'icon' => 'bi-currency-exchange',
        'table' => 'currencies',
        'scope' => null,
        'module' => 'corporate',
        'order' => 'code',
        'soft_delete' => false,
        'fields' => [
            'code' => ['label' => 'ISO Code', 'type' => 'text', 'rules' => 'required|regex:/^[A-Z]{3}$/|unique:currencies,code,{id}', 'list' => true, 'col' => 3],
            'name' => ['label' => 'Name', 'type' => 'text', 'rules' => 'required|max:60', 'list' => true, 'col' => 5],
            'symbol' => ['label' => 'Symbol', 'type' => 'text', 'rules' => 'required|max:8', 'list' => true, 'col' => 2],
            'decimal_places' => ['label' => 'Decimals', 'type' => 'number', 'rules' => 'required|integer|min:0|max:6', 'col' => 2],
            'status' => ['label' => 'Status', 'type' => 'select', 'options' => $status, 'rules' => 'required|in:active,inactive', 'list' => true, 'col' => 4],
        ],
    ],

    'exchange_rates' => [
        'title' => 'Exchange Rates',
        'icon' => 'bi-graph-up-arrow',
        'table' => 'exchange_rates',
        'scope' => 'company',
        'module' => 'corporate',
        'order' => 'effective_date DESC',
        'soft_delete' => false,
        'fields' => [
            'from_currency' => ['label' => 'From', 'type' => 'lookup', 'lookup' => ['currencies', 'code', false, 'code'], 'rules' => 'required|exists:currencies,code', 'list' => true, 'col' => 3],
            'to_currency' => ['label' => 'To', 'type' => 'lookup', 'lookup' => ['currencies', 'code', false, 'code'], 'rules' => 'required|exists:currencies,code', 'list' => true, 'col' => 3],
            'rate' => ['label' => 'Rate', 'type' => 'decimal', 'step' => '0.000001', 'rules' => 'required|numeric|min:0', 'list' => true, 'col' => 3],
            'effective_date' => ['label' => 'Effective Date', 'type' => 'date', 'rules' => 'required|date', 'list' => true, 'col' => 3],
        ],
    ],
];
