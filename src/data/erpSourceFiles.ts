export interface ERPSourceFile {
  path: string;
  name: string;
  language: 'sql' | 'php' | 'markdown' | 'javascript';
  category: 'database' | 'config' | 'module' | 'api' | 'docs';
  description: string;
  content: string;
}

export const ERP_SOURCE_FILES: ERPSourceFile[] = [
  {
    path: 'database/garments_erp.sql',
    name: 'garments_erp.sql',
    language: 'sql',
    category: 'database',
    description: 'Normalized MySQL 8 database schema with foreign keys, indexes, and sample Zara/H&M/Next/C&A/Uniqlo records',
    content: `-- ==============================================================================
-- GARMENTS ERP - PRODUCTION PLANNING & CONTROL (PPC) MODULE
-- Database Schema: MySQL 8.0+ Engine: InnoDB Charset: utf8mb4 Collate: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS \`garments_erp\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`garments_erp\`;

-- 1. BUYERS TABLE
DROP TABLE IF EXISTS \`buyers\`;
CREATE TABLE \`buyers\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(150) NOT NULL,
  \`code\` VARCHAR(50) NOT NULL UNIQUE,
  \`country\` VARCHAR(100) NOT NULL,
  \`contact_person\` VARCHAR(150) DEFAULT NULL,
  \`email\` VARCHAR(150) DEFAULT NULL,
  \`color_tag\` VARCHAR(50) DEFAULT '#0d6efd',
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_buyers_code\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PRODUCTION LINES TABLE
DROP TABLE IF EXISTS \`production_lines\`;
CREATE TABLE \`production_lines\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`line_code\` VARCHAR(50) NOT NULL UNIQUE,
  \`name\` VARCHAR(150) NOT NULL,
  \`floor\` VARCHAR(100) NOT NULL,
  \`supervisor\` VARCHAR(150) NOT NULL,
  \`operator_count\` INT UNSIGNED NOT NULL DEFAULT 40,
  \`helper_count\` INT UNSIGNED NOT NULL DEFAULT 8,
  \`working_hours\` DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  \`efficiency_rate\` DECIMAL(5,2) NOT NULL DEFAULT 75.00 COMMENT 'Average efficiency percentage',
  \`daily_capacity_target\` INT UNSIGNED NOT NULL DEFAULT 800,
  \`status\` ENUM('active', 'changeover', 'maintenance') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_lines_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. USERS & PLANNERS TABLE
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`username\` VARCHAR(100) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`role\` ENUM('admin', 'planner', 'line_chief', 'qa_manager', 'viewer') NOT NULL DEFAULT 'planner',
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PRODUCTION ORDERS TABLE
-- Note: Uses strict cumulative quantity tracking to eliminate double-counting!
-- Mathematical invariant: order_qty >= cut_qty >= sewing_qty >= finishing_qty >= packed_qty >= shipped_qty
DROP TABLE IF EXISTS \`production_orders\`;
CREATE TABLE \`production_orders\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`order_no\` VARCHAR(100) NOT NULL UNIQUE,
  \`buyer_id\` INT UNSIGNED NOT NULL,
  \`style_no\` VARCHAR(100) NOT NULL,
  \`item_type\` VARCHAR(150) NOT NULL,
  \`fabric_details\` TEXT DEFAULT NULL,
  \`order_qty\` INT UNSIGNED NOT NULL,
  \`smv\` DECIMAL(6,2) NOT NULL COMMENT 'Standard Minute Value (minutes/pc)',
  \`unit_price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`order_date\` DATE NOT NULL,
  \`delivery_date\` DATE NOT NULL,
  \`plan_start_date\` DATE NOT NULL,
  \`plan_end_date\` DATE NOT NULL,
  \`line_id\` INT UNSIGNED NOT NULL,
  \`current_stage\` ENUM('order_planned', 'fabric_inhouse', 'cutting', 'sewing', 'finishing', 'packing_shipped') NOT NULL DEFAULT 'order_planned',
  \`priority\` ENUM('normal', 'medium', 'high', 'critical') NOT NULL DEFAULT 'normal',
  \`fabric_status\` ENUM('pending', 'partially_inhouse', 'fully_inhouse') NOT NULL DEFAULT 'pending',
  \`fabric_inhouse_pct\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  
  -- Cumulative quantities:
  \`cut_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`sewing_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`finishing_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`packed_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`shipped_qty\` INT UNSIGNED NOT NULL DEFAULT 0,
  
  \`daily_target\` INT UNSIGNED NOT NULL DEFAULT 800,
  \`assigned_supervisor\` VARCHAR(150) DEFAULT NULL,
  \`remarks\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_orders_buyer\` (\`buyer_id\`),
  KEY \`idx_orders_line\` (\`line_id\`),
  KEY \`idx_orders_stage\` (\`current_stage\`),
  KEY \`idx_orders_delivery\` (\`delivery_date\`),
  CONSTRAINT \`fk_orders_buyer\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`buyers\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`fk_orders_line\` FOREIGN KEY (\`line_id\`) REFERENCES \`production_lines\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  -- Check constraints to enforce cumulative garment production mathematics:
  CONSTRAINT \`chk_cumulative_qty\` CHECK (
    \`cut_qty\` <= \`order_qty\` AND
    \`sewing_qty\` <= \`cut_qty\` AND
    \`finishing_qty\` <= \`sewing_qty\` AND
    \`packed_qty\` <= \`finishing_qty\` AND
    \`shipped_qty\` <= \`packed_qty\`
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PRODUCTION STAGE AUDIT LOGS TABLE
DROP TABLE IF EXISTS \`stage_logs\`;
CREATE TABLE \`stage_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`order_id\` INT UNSIGNED NOT NULL,
  \`line_id\` INT UNSIGNED NOT NULL,
  \`from_stage\` ENUM('order_planned', 'fabric_inhouse', 'cutting', 'sewing', 'finishing', 'packing_shipped') DEFAULT NULL,
  \`to_stage\` ENUM('order_planned', 'fabric_inhouse', 'cutting', 'sewing', 'finishing', 'packing_shipped') NOT NULL,
  \`qty_moved\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`total_cut_snapshot\` INT UNSIGNED NOT NULL,
  \`total_sew_snapshot\` INT UNSIGNED NOT NULL,
  \`total_finish_snapshot\` INT UNSIGNED NOT NULL,
  \`total_pack_snapshot\` INT UNSIGNED NOT NULL,
  \`total_ship_snapshot\` INT UNSIGNED NOT NULL,
  \`user_id\` INT UNSIGNED DEFAULT NULL,
  \`ip_address\` VARCHAR(45) DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_logs_order\` (\`order_id\`),
  KEY \`idx_logs_created\` (\`created_at\`),
  CONSTRAINT \`fk_logs_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`production_orders\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SAMPLE SEED DATA (5 REALISTIC APPAREL ORDERS: Zara, H&M, Next, C&A, Uniqlo)
-- ==============================================================================

INSERT INTO \`buyers\` (\`id\`, \`name\`, \`code\`, \`country\`, \`contact_person\`, \`email\`, \`color_tag\`) VALUES
(1, 'Zara (Inditex Group)', 'ZARA', 'Spain', 'Elena Rostova', 'e.rostova@inditex.com', '#198754'),
(2, 'H&M (Hennes & Mauritz)', 'HM', 'Sweden', 'Karl Lindqvist', 'k.lindqvist@hm.com', '#dc3545'),
(3, 'Next UK', 'NEXT', 'United Kingdom', 'Sarah Jenkins', 's.jenkins@next.co.uk', '#0d6efd'),
(4, 'C&A Europe', 'CA', 'Germany', 'Markus Weber', 'm.weber@c-and-a.com', '#ffc107'),
(5, 'Uniqlo (Fast Retailing)', 'UNIQLO', 'Japan', 'Kenji Takahashi', 'k.takahashi@fastretailing.com', '#d63384');

INSERT INTO \`production_lines\` (\`id\`, \`line_code\`, \`name\`, \`floor\`, \`supervisor\`, \`operator_count\`, \`helper_count\`, \`working_hours\`, \`efficiency_rate\`, \`daily_capacity_target\`, \`status\`) VALUES
(1, 'LINE-01', 'Tops & Chino Line A', 'Floor 2 (Block A)', 'Md. Rafiqul Islam', 42, 8, 8.00, 78.50, 850, 'active'),
(2, 'LINE-02', 'Knitwear & Polo Line B', 'Floor 2 (Block B)', 'Tanvir Hossain', 38, 6, 8.00, 82.00, 1200, 'active'),
(3, 'LINE-03', 'Heavy Fleece & Hoodie Line', 'Floor 3 (Block A)', 'Nasir Ahmed', 40, 10, 8.00, 74.00, 750, 'active'),
(4, 'LINE-04', 'Outerwear & Denim Line', 'Floor 3 (Block B)', 'Shahadat Ali', 46, 12, 8.00, 71.50, 600, 'active'),
(5, 'LINE-05', 'Activewear / T-Shirt High Speed', 'Floor 4 (Block A)', 'Farhana Sultana', 34, 6, 8.00, 88.00, 1800, 'active');

INSERT INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`full_name\`, \`role\`, \`email\`, \`status\`) VALUES
(1, 'planner.admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Chief Production Planner', 'admin', 'planner@factory-erp.com', 'active');

INSERT INTO \`production_orders\` (\`id\`, \`order_no\`, \`buyer_id\`, \`style_no\`, \`item_type\`, \`fabric_details\`, \`order_qty\`, \`smv\`, \`unit_price\`, \`order_date\`, \`delivery_date\`, \`plan_start_date\`, \`plan_end_date\`, \`line_id\`, \`current_stage\`, \`priority\`, \`fabric_status\`, \`fabric_inhouse_pct\`, \`cut_qty\`, \`sewing_qty\`, \`finishing_qty\`, \`packed_qty\`, \`shipped_qty\`, \`daily_target\`, \`assigned_supervisor\`, \`remarks\`) VALUES
(101, 'PO-ZR-9041', 1, 'ZR-SLIM-CHINO-26', 'Men\\'s Stretch Cotton Chino Pant', '98% Cotton 2% Spandex Twill 240 GSM', 15000, 18.50, 5.40, '2026-08-01', '2026-08-28', '2026-08-05', '2026-08-24', 1, 'sewing', 'high', 'fully_inhouse', 100, 15000, 11400, 8200, 5100, 0, 850, 'Md. Rafiqul Islam', 'Targeting 2nd shipment batch by Aug 22. In-line quality pass rate 98.2%.'),
(102, 'PO-HM-5512', 2, 'HM-CLASSIC-POLO-88', 'Men\\'s Regular Fit Pique Polo', '100% BCI Combed Cotton Pique 210 GSM', 24000, 11.20, 3.65, '2026-07-25', '2026-08-22', '2026-07-30', '2026-08-19', 2, 'finishing', 'medium', 'fully_inhouse', 100, 24000, 22500, 18900, 14200, 0, 1200, 'Tanvir Hossain', 'Finishing speed high. Button attach automatic feeders operational.'),
(103, 'PO-NX-3390', 3, 'NX-KIDS-HOODIE-12', 'Kids Raglan Pullover Fleece Hoodie', '80% Organic Cotton 20% Polyester Brushed Fleece 280 GSM', 8500, 15.00, 6.20, '2026-08-04', '2026-09-02', '2026-08-10', '2026-08-27', 3, 'cutting', 'high', 'fully_inhouse', 100, 6200, 2800, 0, 0, 0, 750, 'Nasir Ahmed', 'Auto spreader table 2 engaged. Embroidery batch 1 ready at line input.'),
(104, 'PO-CA-7741', 4, 'CA-DENIM-JACKET-04', 'Women\\'s Trucker Denim Jacket', '100% Rigid Indigo Denim 12.5 Oz', 10000, 22.00, 8.90, '2026-08-08', '2026-09-15', '2026-08-16', '2026-09-08', 4, 'fabric_inhouse', 'critical', 'fully_inhouse', 100, 0, 0, 0, 0, 0, 600, 'Shahadat Ali', 'Fabric lab dips approved. PP sample signed off by C&A QA team.'),
(105, 'PO-UQ-4480', 5, 'UQ-AIRISM-TEE-99', 'Unisex AIRism Oversized Crew Neck T-Shirt', '53% Cotton 47% Polyester AIRism Knit 180 GSM', 30000, 8.50, 2.85, '2026-07-15', '2026-08-18', '2026-07-22', '2026-08-15', 5, 'packing_shipped', 'normal', 'fully_inhouse', 100, 30000, 30000, 29800, 29800, 22000, 1800, 'Farhana Sultana', 'Batch 1 of 22k pcs dispatched to Chittagong port. Final 7.8k pcs in container loading.');
`
  },
  {
    path: 'config/database.php',
    name: 'database.php',
    language: 'php',
    category: 'config',
    description: 'PDO database connection with prepared statements, CSRF protection, session handling, and JSON error reporting',
    content: `<?php
/**
 * Garments ERP - Database Connection & Security Configuration
 * PHP 8.0+ PDO Wrapper with CSRF Protection and Transaction Utilities
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => isset($_SERVER['HTTPS']),
        'cookie_samesite' => 'Strict',
    ]);
}

class Database {
    private static ?PDO $instance = null;

    private static string $host = '127.0.0.1';
    private static string $dbName = 'garments_erp';
    private static string $user = 'root';
    private static string $password = '';
    private static string $charset = 'utf8mb4';

    /**
     * Get Singleton PDO Connection
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                self::$host,
                self::$dbName,
                self::$charset
            );

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, self::$user, self::$password, $options);
            } catch (PDOException $e) {
                self::sendJsonError('Database connection failed: ' . $e->getMessage(), 500);
            }
        }
        return self::$instance;
    }

    /**
     * Generate or Retrieve CSRF Token
     */
    public static function getCsrfToken(): string {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * Validate Incoming CSRF Token
     */
    public static function validateCsrfToken(?string $token): bool {
        if (!$token || empty($_SESSION['csrf_token'])) {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $token);
    }

    /**
     * Send standardized JSON error response and exit
     */
    public static function sendJsonError(string $message, int $statusCode = 400, array $extra = []): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array_merge([
            'success' => false,
            'error'   => $message,
            'timestamp' => date('c')
        ], $extra));
        exit;
    }

    /**
     * Send standardized JSON success response and exit
     */
    public static function sendJsonSuccess(array $data = [], string $message = 'Operation completed successfully'): void {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data'    => $data,
            'timestamp' => date('c')
        ]);
        exit;
    }
}
`
  },
  {
    path: 'modules/planning/planning_board.php',
    name: 'planning_board.php',
    language: 'php',
    category: 'module',
    description: 'Planning Board UI with 14-day Gantt timeline, 6-stage Kanban board, dynamic filters, live progress bars, and 30s auto-refresh',
    content: `<?php
/**
 * Garments ERP - Production Planning Board Module
 * PHP 8 + Bootstrap 5 + Vanilla JS / AJAX
 */
require_once __DIR__ . '/../../config/database.php';
$csrfToken = Database::getCsrfToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Garments ERP - Production Planning Board</title>
    <!-- Bootstrap 5 CSS & Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        :root {
            --erp-sidebar-width: 260px;
            --erp-bg: #f8fafc;
            --stage-planned: #64748b;
            --stage-fabric: #0284c7;
            --stage-cut: #d97706;
            --stage-sew: #2563eb;
            --stage-finish: #7c3aed;
            --stage-pack: #16a34a;
        }
        body { background-color: var(--erp-bg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .kanban-col { min-width: 310px; max-width: 340px; background: #f1f5f9; border-radius: 12px; height: calc(100vh - 310px); overflow-y: auto; }
        .kanban-card { cursor: grab; transition: transform 0.15s ease, box-shadow 0.15s ease; border-left: 4px solid var(--stage-planned); }
        .kanban-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); }
        .gantt-bar { height: 26px; border-radius: 6px; position: relative; cursor: pointer; transition: opacity 0.2s; }
        .gantt-bar:hover { opacity: 0.9; }
        .stage-badge { font-size: 0.72rem; letter-spacing: 0.03em; }
    </style>
</head>
<body class="d-flex flex-column min-vh-100">
    <!-- TOP NAVIGATION BAR -->
    <header class="navbar navbar-dark bg-dark px-3 py-2 sticky-top shadow-sm d-flex justify-content-between">
        <div class="d-flex align-items-center gap-3">
            <span class="navbar-brand mb-0 h1 fw-bold fs-5"><i class="bi bi-diagram-3-fill text-primary me-2"></i>GARMENTS ERP // PPC</span>
            <span class="badge bg-secondary">Production Planning Board</span>
        </div>
        <div class="d-flex align-items-center gap-3">
            <div id="liveClock" class="text-light small font-monospace"></div>
            <span class="badge bg-success-subtle text-success border border-success-subtle">
                <i class="bi bi-shield-check me-1"></i>CSRF Protected
            </span>
            <button id="btnRefresh" class="btn btn-sm btn-outline-light d-flex align-items-center gap-1">
                <i class="bi bi-arrow-repeat"></i> Refresh (<span id="refreshTimer">30</span>s)
            </button>
        </div>
    </header>

    <div class="container-fluid px-4 py-3">
        <!-- DYNAMIC FILTER BAR -->
        <div class="card border-0 shadow-sm rounded-3 mb-3 p-3 bg-white">
            <div class="row g-2 align-items-center">
                <div class="col-md-3">
                    <label class="form-label small text-muted mb-1">Filter by Buyer</label>
                    <select id="filterBuyer" class="form-select form-select-sm">
                        <option value="">All Buyers (Zara, H&M, Next, C&A, Uniqlo)</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small text-muted mb-1">Filter by Line</label>
                    <select id="filterLine" class="form-select form-select-sm">
                        <option value="">All Production Lines (01 - 05)</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small text-muted mb-1">Delivery Window</label>
                    <input type="date" id="filterDateStart" class="form-control form-control-sm">
                </div>
                <div class="col-md-3 d-flex align-items-end gap-2">
                    <button id="btnApplyFilter" class="btn btn-sm btn-primary w-100"><i class="bi bi-funnel me-1"></i>Apply Filters</button>
                    <button id="btnResetFilter" class="btn btn-sm btn-outline-secondary"><i class="bi bi-x-circle"></i></button>
                </div>
            </div>
        </div>

        <!-- 14-DAY GANTT TIMELINE SCHEDULE -->
        <div class="card border-0 shadow-sm rounded-3 mb-4 p-3 bg-white">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-calendar4-range me-2 text-primary"></i>14-Day Production Line Gantt Schedule</h6>
                <span class="small text-muted">Real-time floor scheduling & capacity loading</span>
            </div>
            <div id="ganttTimelineContainer" class="table-responsive border rounded-2 p-2">
                <!-- Dynamically rendered via AJAX -->
            </div>
        </div>

        <!-- 6-STAGE KANBAN BOARD -->
        <div class="d-flex gap-3 overflow-x-auto pb-3" id="kanbanBoardContainer">
            <!-- 1. Order Received / Planned -->
            <div class="kanban-col p-2 shadow-sm" data-stage="order_planned">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 fw-bold text-secondary border-bottom">
                    <span>1. Planned</span>
                    <span class="badge bg-secondary rounded-pill count-badge">0</span>
                </div>
                <div class="card-list d-flex flex-column gap-2" id="col_order_planned"></div>
            </div>

            <!-- 2. Fabric / Trims In-House -->
            <div class="kanban-col p-2 shadow-sm" data-stage="fabric_inhouse">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 fw-bold text-info border-bottom">
                    <span>2. Fabric In-House</span>
                    <span class="badge bg-info text-dark rounded-pill count-badge">0</span>
                </div>
                <div class="card-list d-flex flex-column gap-2" id="col_fabric_inhouse"></div>
            </div>

            <!-- 3. Cutting -->
            <div class="kanban-col p-2 shadow-sm" data-stage="cutting">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 fw-bold text-warning border-bottom">
                    <span>3. Cutting</span>
                    <span class="badge bg-warning text-dark rounded-pill count-badge">0</span>
                </div>
                <div class="card-list d-flex flex-column gap-2" id="col_cutting"></div>
            </div>

            <!-- 4. Sewing -->
            <div class="kanban-col p-2 shadow-sm" data-stage="sewing">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 fw-bold text-primary border-bottom">
                    <span>4. Sewing (Assembly)</span>
                    <span class="badge bg-primary rounded-pill count-badge">0</span>
                </div>
                <div class="card-list d-flex flex-column gap-2" id="col_sewing"></div>
            </div>

            <!-- 5. Finishing & Quality -->
            <div class="kanban-col p-2 shadow-sm" data-stage="finishing">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 fw-bold text-purple border-bottom">
                    <span>5. Finishing & QA</span>
                    <span class="badge bg-dark rounded-pill count-badge">0</span>
                </div>
                <div class="card-list d-flex flex-column gap-2" id="col_finishing"></div>
            </div>

            <!-- 6. Packing & Shipment -->
            <div class="kanban-col p-2 shadow-sm" data-stage="packing_shipped">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-2 fw-bold text-success border-bottom">
                    <span>6. Packed & Shipped</span>
                    <span class="badge bg-success rounded-pill count-badge">0</span>
                </div>
                <div class="card-list d-flex flex-column gap-2" id="col_packing_shipped"></div>
            </div>
        </div>
    </div>

    <!-- Hidden CSRF Form Token -->
    <input type="hidden" id="csrfToken" value="<?= htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">

    <!-- Bootstrap 5 JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Automatic AJAX Refresh every 30 seconds
        let countdown = 30;
        setInterval(() => {
            countdown--;
            document.getElementById('refreshTimer').innerText = countdown;
            if (countdown <= 0) {
                fetchPlanningData();
                countdown = 30;
            }
        }, 1000);

        async function fetchPlanningData() {
            try {
                const response = await fetch('/api/get_planning_data.php');
                const data = await response.json();
                if (data.success) {
                    renderKanban(data.data.orders);
                }
            } catch (err) {
                console.error('AJAX Fetch error:', err);
            }
        }
    </script>
</body>
</html>
`
  },
  {
    path: 'api/get_planning_data.php',
    name: 'get_planning_data.php',
    language: 'php',
    category: 'api',
    description: 'Fetches orders, lines, buyers, and computed KPIs with date and buyer filtering',
    content: `<?php
/**
 * Garments ERP - API: Get Planning Data
 * Method: GET
 * Query Params: ?buyer_id=1&line_id=2&start_date=2026-08-01&end_date=2026-08-31
 */

declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = Database::getConnection();

    // 1. Fetch Buyers
    $stmtBuyers = $pdo->query("SELECT id, name, code, country, contact_person, email, color_tag FROM buyers ORDER BY name ASC");
    $buyers = $stmtBuyers->fetchAll();

    // 2. Fetch Production Lines
    $stmtLines = $pdo->query("SELECT id, line_code, name, floor, supervisor, operator_count, helper_count, working_hours, efficiency_rate, daily_capacity_target, status FROM production_lines ORDER BY line_code ASC");
    $lines = $stmtLines->fetchAll();

    // 3. Build Filtered Orders Query
    $where = [];
    $params = [];

    if (!empty($_GET['buyer_id'])) {
        $where[] = "po.buyer_id = :buyer_id";
        $params['buyer_id'] = (int)$_GET['buyer_id'];
    }

    if (!empty($_GET['line_id'])) {
        $where[] = "po.line_id = :line_id";
        $params['line_id'] = (int)$_GET['line_id'];
    }

    if (!empty($_GET['start_date'])) {
        $where[] = "po.delivery_date >= :start_date";
        $params['start_date'] = $_GET['start_date'];
    }

    if (!empty($_GET['end_date'])) {
        $where[] = "po.delivery_date <= :end_date";
        $params['end_date'] = $_GET['end_date'];
    }

    $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sqlOrders = "
        SELECT 
            po.*,
            b.name AS buyer_name,
            b.code AS buyer_code,
            b.color_tag AS buyer_color_tag,
            pl.line_code,
            pl.name AS line_name,
            pl.supervisor AS line_supervisor,
            -- Calculated stage WIPs:
            (po.order_qty - po.cut_qty) AS cutting_wip,
            (po.cut_qty - po.sewing_qty) AS sewing_wip,
            (po.sewing_qty - po.finishing_qty) AS finishing_wip,
            (po.finishing_qty - po.packed_qty) AS packing_wip,
            (po.packed_qty - po.shipped_qty) AS ready_to_ship_wip,
            (po.order_qty - po.shipped_qty) AS balance_to_ship,
            ROUND((po.shipped_qty / po.order_qty) * 100, 1) AS completion_pct
        FROM production_orders po
        JOIN buyers b ON po.buyer_id = b.id
        JOIN production_lines pl ON po.line_id = pl.id
        {$whereSql}
        ORDER BY po.delivery_date ASC, po.priority DESC
    ";

    $stmtOrders = $pdo->prepare($sqlOrders);
    $stmtOrders->execute($params);
    $orders = $stmtOrders->fetchAll();

    // 4. Calculate Aggregate KPIs
    $kpiSql = "
        SELECT 
            COUNT(id) AS total_orders,
            COALESCE(SUM(order_qty), 0) AS total_planned_qty,
            COALESCE(SUM(cut_qty), 0) AS total_cut_qty,
            COALESCE(SUM(sewing_qty), 0) AS total_sewing_qty,
            COALESCE(SUM(finishing_qty), 0) AS total_finishing_qty,
            COALESCE(SUM(packed_qty), 0) AS total_packed_qty,
            COALESCE(SUM(shipped_qty), 0) AS total_shipped_qty,
            SUM(CASE WHEN priority = 'critical' AND current_stage != 'packing_shipped' THEN 1 ELSE 0 END) AS critical_orders_count
        FROM production_orders
    ";
    $kpis = $pdo->query($kpiSql)->fetch();

    Database::sendJsonSuccess([
        'buyers' => $buyers,
        'lines'  => $lines,
        'orders' => $orders,
        'kpis'   => $kpis,
        'csrf_token' => Database::getCsrfToken()
    ], 'Planning data loaded successfully');

} catch (Exception $e) {
    Database::sendJsonError('Error querying planning data: ' . $e->getMessage(), 500);
}
`
  },
  {
    path: 'api/update_card_status.php',
    name: 'update_card_status.php',
    language: 'php',
    category: 'api',
    description: 'Transaction-safe stage transitions with SELECT ... FOR UPDATE row locking and strict cumulative quantity mathematical validation',
    content: `<?php
/**
 * Garments ERP - API: Update Card Status & Stage Quantities
 * Method: POST (JSON)
 * Security: CSRF Validation + Transaction + Row-Level Locking (SELECT ... FOR UPDATE)
 */

declare(strict_types=1);
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Database::sendJsonError('Invalid HTTP method. Only POST is accepted.', 405);
}

// 1. Read and Decode Request Payload
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    Database::sendJsonError('Invalid JSON payload provided.', 400);
}

// 2. Validate CSRF Token
$token = $payload['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
if (!Database::validateCsrfToken($token)) {
    Database::sendJsonError('CSRF token validation failed. Unauthorized request.', 403);
}

$orderId = isset($payload['order_id']) ? (int)$payload['order_id'] : 0;
$newStage = $payload['new_stage'] ?? null;

// Optional stage quantity incremental inputs:
$cutAdd = isset($payload['cut_qty_add']) ? (int)$payload['cut_qty_add'] : 0;
$sewAdd = isset($payload['sewing_qty_add']) ? (int)$payload['sewing_qty_add'] : 0;
$finishAdd = isset($payload['finishing_qty_add']) ? (int)$payload['finishing_qty_add'] : 0;
$packAdd = isset($payload['packed_qty_add']) ? (int)$payload['packed_qty_add'] : 0;
$shipAdd = isset($payload['shipped_qty_add']) ? (int)$payload['shipped_qty_add'] : 0;
$notes = $payload['notes'] ?? 'Stage status updated via Kanban board';

$validStages = ['order_planned', 'fabric_inhouse', 'cutting', 'sewing', 'finishing', 'packing_shipped'];
if ($newStage !== null && !in_array($newStage, $validStages, true)) {
    Database::sendJsonError('Invalid production stage specified.', 400);
}

if ($orderId <= 0) {
    Database::sendJsonError('Valid order_id is required.', 400);
}

$pdo = Database::getConnection();

try {
    // 3. Begin Atomic Database Transaction
    $pdo->beginTransaction();

    // 4. Lock Order Row with SELECT ... FOR UPDATE to prevent race conditions
    $stmtLock = $pdo->prepare("SELECT * FROM production_orders WHERE id = :id FOR UPDATE");
    $stmtLock->execute(['id' => $orderId]);
    $order = $stmtLock->fetch();

    if (!$order) {
        $pdo->rollBack();
        Database::sendJsonError('Order not found.', 404);
    }

    $oldStage = $order['current_stage'];
    $orderQty = (int)$order['order_qty'];
    
    // Compute prospective new cumulative values
    $newCutQty = (int)$order['cut_qty'] + $cutAdd;
    $newSewQty = (int)$order['sewing_qty'] + $sewAdd;
    $newFinishQty = (int)$order['finishing_qty'] + $finishAdd;
    $newPackQty = (int)$order['packed_qty'] + $packAdd;
    $newShipQty = (int)$order['shipped_qty'] + $shipAdd;

    // 5. STRICT CUMULATIVE MATHEMATICAL VALIDATION CHECKS:
    // Invariant: order_qty >= cut_qty >= sewing_qty >= finishing_qty >= packed_qty >= shipped_qty
    if ($newCutQty > $orderQty) {
        $pdo->rollBack();
        Database::sendJsonError("Cut quantity ({$newCutQty}) cannot exceed total Order Quantity ({$orderQty}).", 422);
    }

    if ($newSewQty > $newCutQty) {
        $pdo->rollBack();
        Database::sendJsonError("Sewing quantity ({$newSewQty}) cannot exceed Cut Quantity ({$newCutQty}). Cutting is the bottleneck.", 422);
    }

    if ($newFinishQty > $newSewQty) {
        $pdo->rollBack();
        Database::sendJsonError("Finishing quantity ({$newFinishQty}) cannot exceed Sewing Quantity ({$newSewQty}). Garments must be sewn before finishing.", 422);
    }

    if ($newPackQty > $newFinishQty) {
        $pdo->rollBack();
        Database::sendJsonError("Packed quantity ({$newPackQty}) cannot exceed Finished Quantity ({$newFinishQty}). Quality check & finishing required prior to packing.", 422);
    }

    if ($newShipQty > $newPackQty) {
        $pdo->rollBack();
        Database::sendJsonError("Shipped quantity ({$newShipQty}) cannot exceed Packed Quantity ({$newPackQty}). Units must be boxed & palletized before dispatch.", 422);
    }

    // Determine target stage if not explicitly passed
    $targetStage = $newStage ?? $oldStage;

    // 6. Update Production Order Record
    $sqlUpdate = "
        UPDATE production_orders 
        SET 
            current_stage = :current_stage,
            cut_qty = :cut_qty,
            sewing_qty = :sewing_qty,
            finishing_qty = :finishing_qty,
            packed_qty = :packed_qty,
            shipped_qty = :shipped_qty,
            updated_at = NOW()
        WHERE id = :id
    ";

    $stmtUpdate = $pdo->prepare($sqlUpdate);
    $stmtUpdate->execute([
        'current_stage' => $targetStage,
        'cut_qty'       => $newCutQty,
        'sewing_qty'    => $newSewQty,
        'finishing_qty' => $newFinishQty,
        'packed_qty'    => $newPackQty,
        'shipped_qty'   => $newShipQty,
        'id'            => $orderId
    ]);

    // 7. Insert Audit Trail into stage_logs
    $sqlLog = "
        INSERT INTO stage_logs (
            order_id, line_id, from_stage, to_stage, qty_moved,
            total_cut_snapshot, total_sew_snapshot, total_finish_snapshot, total_pack_snapshot, total_ship_snapshot,
            ip_address, notes
        ) VALUES (
            :order_id, :line_id, :from_stage, :to_stage, :qty_moved,
            :cut_snap, :sew_snap, :finish_snap, :pack_snap, :ship_snap,
            :ip, :notes
        )
    ";

    $totalMoved = $cutAdd + $sewAdd + $finishAdd + $packAdd + $shipAdd;
    $stmtLog = $pdo->prepare($sqlLog);
    $stmtLog->execute([
        'order_id'    => $orderId,
        'line_id'     => $order['line_id'],
        'from_stage'  => $oldStage,
        'to_stage'    => $targetStage,
        'qty_moved'   => $totalMoved,
        'cut_snap'    => $newCutQty,
        'sew_snap'    => $newSewQty,
        'finish_snap' => $newFinishQty,
        'pack_snap'   => $newPackQty,
        'ship_snap'   => $newShipQty,
        'ip'          => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        'notes'       => $notes
    ]);

    // 8. Commit Transaction Safely
    $pdo->commit();

    Database::sendJsonSuccess([
        'order_id'      => $orderId,
        'old_stage'     => $oldStage,
        'current_stage' => $targetStage,
        'cut_qty'       => $newCutQty,
        'sewing_qty'    => $newSewQty,
        'finishing_qty' => $newFinishQty,
        'packed_qty'    => $newPackQty,
        'shipped_qty'   => $newShipQty,
        'wip_buffers'   => [
            'cutting_to_sewing'   => $newCutQty - $newSewQty,
            'sewing_to_finishing' => $newSewQty - $newFinishQty,
            'finishing_to_packing'=> $newFinishQty - $newPackQty,
            'packing_to_shipped'  => $newPackQty - $newShipQty,
        ]
    ], 'Production stage and cumulative quantities successfully updated with row lock.');

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Database::sendJsonError('Transaction failed: ' . $e->getMessage(), 500);
}
`
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    category: 'docs',
    description: 'XAMPP deployment guide, database setup instructions, and apparel production quantity mathematical proof',
    content: `# Garments ERP - Production Planning & Control (PPC) Module

A production planning module designed for apparel manufacturing factories, featuring a 14-day production line Gantt timeline, 6-stage Kanban board with drag-and-drop workflow, and strict cumulative stage mathematics.

---

## 🛠️ Tech Stack
- **Backend:** PHP 8.0+ / 8.2+ with PDO, Prepared Statements & Transactions
- **Database:** MySQL 8.0+ (InnoDB engine with row locking \`SELECT ... FOR UPDATE\` and foreign keys)
- **Frontend:** Bootstrap 5.3 + Vanilla JavaScript (Fetch API / AJAX)
- **Security:** Session-based CSRF generation & strict constant-time validation

---

## 📐 Mathematical Production Logic Correction

### Why the naive formula fails:
\`\`\`text
❌ INCORRECT: Order Qty = Cut Qty + Sewing Qty + Finishing Qty + Packing Qty + Balance
\`\`\`
This formula erroneously double-counts garments. In apparel manufacturing, the **same physical fabric pieces** flow sequentially through Cutting ➔ Sewing ➔ Finishing ➔ Packing.

### Cumulative Stage Invariant (Mathematically Consistent):
\`\`\`text
✅ CORRECT: Order Qty >= Cut Qty >= Sewing Qty >= Finishing Qty >= Packed Qty >= Shipped Qty
\`\`\`

### Inter-Stage Work-in-Progress (WIP) Buffers:
- **Cutting to Sewing Buffer:** \`Cut Qty - Sewing Qty\`
- **Sewing to Finishing Buffer:** \`Sewing Qty - Finishing Qty\`
- **Finishing to Packing Buffer:** \`Finishing Qty - Packed Qty\`
- **Packing to Shipped Buffer:** \`Packed Qty - Shipped Qty\`
- **Total Balance to Ship:** \`Order Qty - Shipped Qty\`

---

## 🚀 Installation on XAMPP (Local Environment)

1. **Clone or Copy Files:**
   Place the project files inside your Apache document root:
   \`\`\`bash
   C:\\xampp\\htdocs\\garments_erp\\
   \`\`\`

2. **Import MySQL Database:**
   - Open phpMyAdmin (\`http://localhost/phpmyadmin\`)
   - Create a database named \`garments_erp\`
   - Import the schema file: \`database/garments_erp.sql\`

3. **Configure Database Credentials:**
   Check \`config/database.php\`:
   \`\`\`php
   private static string $host = '127.0.0.1';
   private static string $dbName = 'garments_erp';
   private static string $user = 'root';
   private static string $password = '';
   \`\`\`

4. **Launch Application:**
   Navigate in your browser to:
   \`\`\`url
   http://localhost/garments_erp/modules/planning/planning_board.php
   \`\`\`

---

## 🔒 Concurrency & Row Locking
When updating production quantities across workstations, the backend executes:
\`\`\`sql
BEGIN;
SELECT * FROM production_orders WHERE id = ? FOR UPDATE;
-- Validates: new_sew_qty <= cut_qty, new_finish_qty <= sew_qty, etc.
UPDATE production_orders SET ... WHERE id = ?;
INSERT INTO stage_logs (...) VALUES (...);
COMMIT;
\`\`\`
This prevents race conditions between simultaneous supervisors logging output from multiple lines.
`
  }
];
