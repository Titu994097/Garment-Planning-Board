-- =====================================================================
--  Garment & Textile ERP — Module 1: Corporate Administration
--  MySQL 8.0+  |  InnoDB  |  utf8mb4
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS currencies (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            CHAR(3)       NOT NULL,
    name            VARCHAR(60)   NOT NULL,
    symbol          VARCHAR(8)    NOT NULL,
    decimal_places  TINYINT UNSIGNED NOT NULL DEFAULT 2,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_currency_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exchange_rates (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    from_currency   CHAR(3) NOT NULL,
    to_currency     CHAR(3) NOT NULL,
    rate            DECIMAL(18,6) NOT NULL,
    effective_date  DATE NOT NULL,
    created_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rate (company_id, from_currency, to_currency, effective_date),
    KEY idx_rate_lookup (from_currency, to_currency, effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Company / organisation hierarchy
-- Company → Business Unit → Factory/Branch → Production Unit → Department
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(150) NOT NULL,
    legal_name          VARCHAR(200) NULL,
    short_name          VARCHAR(50)  NULL,
    parent_id           INT UNSIGNED NULL COMMENT 'Group / holding company',
    company_type        ENUM('group','spinning','weaving','knitting','dyeing','garments','washing','printing','trading','buying_house') NOT NULL DEFAULT 'garments',
    trade_license_no    VARCHAR(60)  NULL,
    tin_no              VARCHAR(60)  NULL,
    vat_bin_no          VARCHAR(60)  NULL,
    irc_no              VARCHAR(60)  NULL COMMENT 'Import Registration Certificate',
    erc_no              VARCHAR(60)  NULL COMMENT 'Export Registration Certificate',
    bonded_license_no   VARCHAR(60)  NULL,
    bgmea_bkmea_no      VARCHAR(60)  NULL COMMENT 'Trade association membership',
    epz_permit_no       VARCHAR(60)  NULL,
    base_currency       CHAR(3)      NOT NULL DEFAULT 'USD',
    country             VARCHAR(80)  NULL,
    address             TEXT         NULL,
    phone               VARCHAR(40)  NULL,
    email               VARCHAR(150) NULL,
    website             VARCHAR(150) NULL,
    logo_path           VARCHAR(255) NULL,
    established_date    DATE         NULL,
    status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by          INT UNSIGNED NULL,
    updated_by          INT UNSIGNED NULL,
    created_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL,
    UNIQUE KEY uq_company_code (code),
    KEY idx_company_parent (parent_id),
    CONSTRAINT fk_company_parent FOREIGN KEY (parent_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_units (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    code            VARCHAR(20)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    head_user_id    INT UNSIGNED NULL,
    description     TEXT NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    UNIQUE KEY uq_bu_code (company_id, code),
    CONSTRAINT fk_bu_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS factories (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    business_unit_id    INT UNSIGNED NULL,
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(150) NOT NULL,
    factory_type        ENUM('spinning','weaving','knitting','dyeing_finishing','cutting','sewing','washing','printing','embroidery','finishing_packing','composite') NOT NULL DEFAULT 'composite',
    address             TEXT NULL,
    country             VARCHAR(80) NULL,
    phone               VARCHAR(40) NULL,
    email               VARCHAR(150) NULL,
    gps_lat             DECIMAL(10,7) NULL,
    gps_lng             DECIMAL(10,7) NULL,
    floor_area_sqft     DECIMAL(12,2) NULL,
    total_lines         SMALLINT UNSIGNED NULL,
    total_machines      INT UNSIGNED NULL,
    worker_capacity     INT UNSIGNED NULL,
    daily_capacity_pcs  INT UNSIGNED NULL,
    working_hours       DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    weekly_off_day      ENUM('friday','saturday','sunday') NOT NULL DEFAULT 'friday',
    certifications      VARCHAR(255) NULL COMMENT 'WRAP, BSCI, OEKO-TEX, GOTS, LEED, Accord...',
    factory_manager_id  INT UNSIGNED NULL,
    status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by          INT UNSIGNED NULL,
    updated_by          INT UNSIGNED NULL,
    created_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL,
    UNIQUE KEY uq_factory_code (company_id, code),
    KEY idx_factory_bu (business_unit_id),
    CONSTRAINT fk_factory_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_factory_bu FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branches (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    code            VARCHAR(20)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    branch_type     ENUM('head_office','corporate_office','liaison_office','sales_office','warehouse','showroom') NOT NULL DEFAULT 'corporate_office',
    address         TEXT NULL,
    city            VARCHAR(80) NULL,
    country         VARCHAR(80) NULL,
    phone           VARCHAR(40) NULL,
    email           VARCHAR(150) NULL,
    manager_name    VARCHAR(100) NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    UNIQUE KEY uq_branch_code (company_id, code),
    CONSTRAINT fk_branch_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS production_units (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    factory_id          INT UNSIGNED NOT NULL,
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(150) NOT NULL,
    unit_type           ENUM('cutting','sewing_line','finishing','washing','printing','embroidery','knitting','dyeing','spinning','weaving','sample_room','quality') NOT NULL DEFAULT 'sewing_line',
    floor_no            VARCHAR(20) NULL,
    machine_count       SMALLINT UNSIGNED NULL,
    operator_count      SMALLINT UNSIGNED NULL,
    helper_count        SMALLINT UNSIGNED NULL,
    capacity_per_hour   INT UNSIGNED NULL,
    target_efficiency   DECIMAL(5,2) NULL COMMENT '% planned efficiency',
    available_minutes   INT UNSIGNED NULL COMMENT 'Standard minutes available per day',
    supervisor_name     VARCHAR(100) NULL,
    status              ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
    created_by          INT UNSIGNED NULL,
    updated_by          INT UNSIGNED NULL,
    created_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL,
    UNIQUE KEY uq_pu_code (factory_id, code),
    KEY idx_pu_company (company_id),
    CONSTRAINT fk_pu_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_pu_factory FOREIGN KEY (factory_id) REFERENCES factories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cost_centers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    parent_id       INT UNSIGNED NULL,
    code            VARCHAR(20)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    cost_type       ENUM('production','service','administrative','selling','distribution') NOT NULL DEFAULT 'production',
    factory_id      INT UNSIGNED NULL,
    annual_budget   DECIMAL(18,2) NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    UNIQUE KEY uq_cc_code (company_id, code),
    CONSTRAINT fk_cc_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_cc_parent FOREIGN KEY (parent_id) REFERENCES cost_centers(id) ON DELETE SET NULL,
    CONSTRAINT fk_cc_factory FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    factory_id      INT UNSIGNED NULL,
    parent_id       INT UNSIGNED NULL,
    cost_center_id  INT UNSIGNED NULL,
    code            VARCHAR(20)  NOT NULL,
    name            VARCHAR(150) NOT NULL,
    name_local      VARCHAR(150) NULL,
    head_name       VARCHAR(100) NULL,
    is_production   TINYINT(1) NOT NULL DEFAULT 0,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    UNIQUE KEY uq_dept_code (company_id, code),
    CONSTRAINT fk_dept_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_dept_factory FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE SET NULL,
    CONSTRAINT fk_dept_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_dept_cc FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Fiscal calendar
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_years (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    code            VARCHAR(20) NOT NULL COMMENT 'e.g. FY2026-27',
    name            VARCHAR(100) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_current      TINYINT(1) NOT NULL DEFAULT 0,
    status          ENUM('open','closed','locked') NOT NULL DEFAULT 'open',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    UNIQUE KEY uq_fy_code (company_id, code),
    CONSTRAINT fk_fy_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT chk_fy_dates CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fiscal_periods (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fiscal_year_id  INT UNSIGNED NOT NULL,
    period_no       TINYINT UNSIGNED NOT NULL,
    name            VARCHAR(40) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          ENUM('open','closed') NOT NULL DEFAULT 'open',
    UNIQUE KEY uq_period (fiscal_year_id, period_no),
    CONSTRAINT fk_period_fy FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    factory_id      INT UNSIGNED NULL COMMENT 'NULL = applies to all factories',
    title           VARCHAR(150) NOT NULL,
    holiday_type    ENUM('public','festival','weekly','company','compensatory','optional') NOT NULL DEFAULT 'public',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_paid         TINYINT(1) NOT NULL DEFAULT 1,
    remarks         VARCHAR(255) NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    KEY idx_holiday_dates (company_id, start_date, end_date),
    CONSTRAINT fk_holiday_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_holiday_factory FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE,
    CONSTRAINT chk_holiday_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Users & RBAC
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id              INT UNSIGNED NOT NULL,
    factory_id              INT UNSIGNED NULL,
    department_id           INT UNSIGNED NULL,
    employee_code           VARCHAR(30) NULL,
    full_name               VARCHAR(150) NOT NULL,
    username                VARCHAR(60) NOT NULL,
    email                   VARCHAR(150) NOT NULL,
    phone                   VARCHAR(40) NULL,
    designation             VARCHAR(100) NULL,
    password_hash           VARCHAR(255) NOT NULL,
    locale                  VARCHAR(5) NOT NULL DEFAULT 'en',
    avatar_path             VARCHAR(255) NULL,
    is_super_admin          TINYINT(1) NOT NULL DEFAULT 0,
    must_change_password    TINYINT(1) NOT NULL DEFAULT 0,
    failed_attempts         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until            DATETIME NULL,
    last_login_at           DATETIME NULL,
    last_login_ip           VARCHAR(45) NULL,
    password_changed_at     DATETIME NULL,
    status                  ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    created_by              INT UNSIGNED NULL,
    updated_by              INT UNSIGNED NULL,
    created_at              TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP NULL,
    UNIQUE KEY uq_username (username),
    UNIQUE KEY uq_user_email (email),
    KEY idx_user_company (company_id),
    CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_user_factory FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users may work across several companies / factories (multi-company access)
CREATE TABLE IF NOT EXISTS user_company_access (
    user_id     INT UNSIGNED NOT NULL,
    company_id  INT UNSIGNED NOT NULL,
    factory_id  INT UNSIGNED NULL,
    PRIMARY KEY (user_id, company_id),
    CONSTRAINT fk_uca_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uca_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NULL COMMENT 'NULL = global system role',
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     VARCHAR(255) NULL,
    is_system       TINYINT(1) NOT NULL DEFAULT 0,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_role_slug (company_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module          VARCHAR(60) NOT NULL,
    resource        VARCHAR(60) NOT NULL,
    action          VARCHAR(30) NOT NULL,
    slug            VARCHAR(120) NOT NULL,
    description     VARCHAR(255) NULL,
    UNIQUE KEY uq_perm_slug (slug),
    KEY idx_perm_module (module, resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         INT UNSIGNED NOT NULL,
    permission_id   INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id         INT UNSIGNED NOT NULL,
    role_id         INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_tokens (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    name            VARCHAR(100) NOT NULL,
    token_hash      CHAR(64) NOT NULL,
    last_used_at    DATETIME NULL,
    expires_at      DATETIME NULL,
    revoked_at      DATETIME NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_token_hash (token_hash),
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_history (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NULL,
    username        VARCHAR(100) NOT NULL,
    success         TINYINT(1) NOT NULL,
    ip_address      VARCHAR(45) NULL,
    user_agent      VARCHAR(255) NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_login_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Digital signatures
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_signatures (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    signature_path  VARCHAR(255) NOT NULL,
    signature_hash  CHAR(64) NOT NULL COMMENT 'SHA-256 of image for tamper detection',
    is_default      TINYINT(1) NOT NULL DEFAULT 1,
    pin_hash        VARCHAR(255) NULL COMMENT 'Optional PIN required to apply signature',
    status          ENUM('active','revoked') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at      DATETIME NULL,
    KEY idx_sig_user (user_id, status),
    CONSTRAINT fk_sig_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every applied signature is recorded with a verification hash over the document payload
CREATE TABLE IF NOT EXISTS document_signatures (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    document_type       VARCHAR(60) NOT NULL,
    document_id         BIGINT UNSIGNED NOT NULL,
    user_id             INT UNSIGNED NOT NULL,
    user_signature_id   INT UNSIGNED NOT NULL,
    approval_request_id BIGINT UNSIGNED NULL,
    sign_role           VARCHAR(60) NULL COMMENT 'Prepared / Checked / Approved ...',
    document_hash       CHAR(64) NOT NULL,
    verification_code   CHAR(16) NOT NULL,
    ip_address          VARCHAR(45) NULL,
    signed_at           TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_verification (verification_code),
    KEY idx_docsig_doc (document_type, document_id),
    CONSTRAINT fk_docsig_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_docsig_sig FOREIGN KEY (user_signature_id) REFERENCES user_signatures(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Approval workflow engine
--   workflow (per document type, optional amount band)
--     → ordered steps (approver = role | specific user | department head)
--   request (one per document submission) → actions (one per step decision)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_workflows (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    name            VARCHAR(150) NOT NULL,
    document_type   VARCHAR(60)  NOT NULL COMMENT 'purchase_requisition, purchase_order, sales_order, budget, leave ...',
    min_amount      DECIMAL(18,2) NULL,
    max_amount      DECIMAL(18,2) NULL,
    require_signature TINYINT(1) NOT NULL DEFAULT 0,
    description     VARCHAR(255) NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL,
    KEY idx_wf_doc (company_id, document_type, status),
    CONSTRAINT fk_wf_company FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workflow_id     INT UNSIGNED NOT NULL,
    step_order      TINYINT UNSIGNED NOT NULL,
    name            VARCHAR(100) NOT NULL COMMENT 'Checked By, Verified By, Approved By',
    approver_type   ENUM('role','user') NOT NULL DEFAULT 'role',
    role_id         INT UNSIGNED NULL,
    user_id         INT UNSIGNED NULL,
    sla_hours       SMALLINT UNSIGNED NULL,
    can_reject      TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_step (workflow_id, step_order),
    CONSTRAINT fk_step_wf FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_step_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
    CONSTRAINT fk_step_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_requests (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    workflow_id     INT UNSIGNED NOT NULL,
    document_type   VARCHAR(60) NOT NULL,
    document_id     BIGINT UNSIGNED NOT NULL,
    document_no     VARCHAR(60) NULL,
    title           VARCHAR(200) NOT NULL,
    amount          DECIMAL(18,2) NULL,
    currency        CHAR(3) NULL,
    current_step    TINYINT UNSIGNED NOT NULL DEFAULT 1,
    status          ENUM('pending','approved','rejected','cancelled','returned') NOT NULL DEFAULT 'pending',
    requested_by    INT UNSIGNED NOT NULL,
    requested_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME NULL,
    KEY idx_ar_status (company_id, status, current_step),
    KEY idx_ar_doc (document_type, document_id),
    CONSTRAINT fk_ar_wf FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id),
    CONSTRAINT fk_ar_user FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_actions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id      BIGINT UNSIGNED NOT NULL,
    step_order      TINYINT UNSIGNED NOT NULL,
    step_name       VARCHAR(100) NOT NULL,
    user_id         INT UNSIGNED NOT NULL,
    action          ENUM('submitted','approved','rejected','returned','cancelled','commented') NOT NULL,
    comments        TEXT NULL,
    document_signature_id BIGINT UNSIGNED NULL,
    ip_address      VARCHAR(45) NULL,
    acted_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_aa_request (request_id),
    CONSTRAINT fk_aa_request FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_aa_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Audit trail (append-only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NULL,
    user_id         INT UNSIGNED NULL,
    action          VARCHAR(30) NOT NULL,
    table_name      VARCHAR(64) NOT NULL,
    record_id       BIGINT UNSIGNED NULL,
    old_values      JSON NULL,
    new_values      JSON NULL,
    ip_address      VARCHAR(45) NULL,
    user_agent      VARCHAR(255) NULL,
    url             VARCHAR(255) NULL,
    created_at      TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_audit_table (table_name, record_id),
    KEY idx_audit_user (user_id, created_at),
    KEY idx_audit_company (company_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Make the audit trail tamper-resistant at the database level
DROP TRIGGER IF EXISTS trg_audit_no_update;
DROP TRIGGER IF EXISTS trg_audit_no_delete;
DELIMITER $$
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- System settings (key/value per company)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id  INT UNSIGNED NULL,
    `key`       VARCHAR(100) NOT NULL,
    `value`     TEXT NULL,
    UNIQUE KEY uq_setting (company_id, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
