# Garment & Textile ERP — PHP 8 / MySQL 8

Enterprise ERP for vertically integrated textile & apparel manufacturers
(spinning → knitting/weaving → dyeing → cutting/sewing/washing → finishing → export).

This drop delivers the **platform core** and **Module 1 – Corporate Administration**.
Later modules (Merchandising, Planning, Inventory, Production, Commercial, Accounts, HR …) plug into the same
framework, permission registry, approval engine and audit trail.

## Stack
PHP 8.1+ (strict types, OOP, MVC) · MySQL 8 (InnoDB, utf8mb4) · Bootstrap 5 · jQuery + ES6 · DataTables (server-side) ·
ApexCharts · Select2 · REST/JSON API · RBAC. No framework or Composer dependency.

## Module 1 – Corporate Administration

| Feature | Where | Notes |
|---|---|---|
| Company Profile | `admin/companies` | Group/holding hierarchy, statutory IDs (TIN, VAT/BIN, IRC, ERC, bonded licence, BGMEA/BKMEA, EPZ) |
| Business Units | `admin/business_units` | Knit / Woven / Textile divisions |
| Factory Setup | `admin/factories` | Type, capacity, lines, machines, working hours, weekly off, certifications (WRAP, BSCI, OEKO-TEX, GOTS, LEED …) |
| Production Units | `admin/production_units` | Sewing lines, cutting, finishing, washing… with operators/helpers, capacity/hr, target efficiency, SMV minutes |
| Departments | `admin/departments` | Hierarchical, local-language name, cost-center link |
| Cost Centers | `admin/cost_centers` | Hierarchical, cost type, annual budget |
| Branch Management | `admin/branches` | Head / liaison / sales offices, warehouses |
| Fiscal Year | `admin/fiscal_years` | Auto-generates monthly periods; one current year per company; periods locked once closed |
| Holiday Calendar | `admin/holidays` | Company-wide or per factory, paid/unpaid |
| Currencies & FX | `admin/currencies`, `admin/exchange_rates` | Multi-currency with dated rates |
| User Management | `admin/users` | Multi-role, factory/department, lockout after 5 failures, forced password change |
| Roles & Permissions | `admin/roles` | Role × permission matrix (view/create/edit/delete/export/approve) |
| Approval Workflow | `admin/workflows`, `approvals` | Multi-step, by document type and amount band, role or named user per step, SLA, segregation of duties |
| Digital Signature | `signatures` | Draw or upload, PIN-protected, SHA-256 document hash + verification code |
| Audit Trail | `admin/audit` | Append-only (DB triggers block UPDATE/DELETE), before/after diff, login history |

Multi-company (company switcher + per-user company access), multi-factory, multi-currency, multi-language (EN / বাংলা / 中文), dark mode, responsive.

## Install

```bash
cd erp
cp .env.example .env             # set DB credentials
php bin/install.php --demo       # schema + reference data + demo group (omit --demo for a clean install)
php -S localhost:8080 -t public public/index.php
```
Production: point the Apache/Nginx document root at `erp/public` (an `.htaccess` is included).

Logins: `admin / Admin@12345` (super admin, must change on first login; set `ADMIN_PASSWORD` env to override).
Demo users (`--demo`) all use `Demo@12345`: `md`, `gm.ops`, `fm.gazipur`, `hr.head`, `cfo`, `auditor`.

## Architecture

```
erp/
├── app/
│   ├── Core/          App, Router, Request/Response, Database (PDO), Auth (RBAC), Validator, View, Csrf, Lang, AuditLogger
│   ├── Middleware/    auth, guest, csrf, permission, api (Bearer token)
│   ├── Services/      Resource (generic repository), ApprovalService, SignatureService, FiscalPeriodGenerator, PermissionRegistry
│   ├── Controllers/   Admin/* (web), Api/ApiController (REST)
│   └── Views/
├── config/resources.php   ← declarative master-data registry
├── database/schema.sql    demo_seed.php
├── lang/                  en, bn, zh
├── public/                front controller + assets
└── routes/                web.php, api.php
```

**Adding a master screen** is configuration only: add an entry to `config/resources.php` (table, fields, rules, list
columns, lookups) and run `php bin/install.php --sync-permissions`. You get the list grid, form, validation,
company scoping, permissions, CSV export, audit logging and REST endpoints automatically.

**Using approvals from another module:**
```php
$requestId = ApprovalService::submit('purchase_order', $po['id'], "PO {$po['no']}", $po['total'], 'USD', $po['no']);
```

## REST API (v1)

```
POST   /api/v1/auth/token              {username, password}         → {token}
GET    /api/v1/me
GET    /api/v1/{resource}?page=&per_page=&q=&sort=&dir=&filter[col]=
GET    /api/v1/{resource}/{id}
POST   /api/v1/{resource}
PUT    /api/v1/{resource}/{id}         (partial updates allowed)
DELETE /api/v1/{resource}/{id}
GET    /api/v1/approvals/inbox
POST   /api/v1/approvals               {document_type, document_id, title, amount?}
POST   /api/v1/approvals/{id}/action   {decision: approved|rejected|returned, comments, pin?}
```
`{resource}` is any key in `config/resources.php` (e.g. `factories`, `production_units`, `cost_centers`).
Send `Authorization: Bearer <token>`. Tokens are stored hashed and expire after 90 days. The API is stateless (no session cookie).

## Security
- Prepared statements everywhere; SQL identifiers come only from the trusted registry
- CSRF tokens on every state-changing web request; session cookies are HttpOnly + SameSite, session ID regenerated on login
- bcrypt/argon passwords with rehash-on-login, password policy, account lockout, login history
- Tenant isolation: every scoped query filters by active company; lookups are validated with `owned:` so a request can't reference another company's records
- Approval segregation of duties (requesters can't approve their own documents), row locking against double approval
- Audit log is append-only at DB level; sensitive columns are never written to it
- CSV export guards against spreadsheet formula injection; signature images are served only to their owner or authorised reviewers
