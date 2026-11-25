-- PayPulse AI Multi-Tenant, Multi-Country, Multi-Currency MySQL Schema

CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(10) PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(60) NOT NULL,
  rate_to_usd DECIMAL(12, 6) NOT NULL DEFAULT 1.000000
);

CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  statutory_name VARCHAR(80) NOT NULL,
  statutory_rate_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  default_tax_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  tax_authority VARCHAR(80) NOT NULL,
  FOREIGN KEY (currency_code) REFERENCES currencies(code)
);

CREATE TABLE IF NOT EXISTS firms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  country_code VARCHAR(10) NOT NULL,
  base_currency VARCHAR(10) NOT NULL,
  statutory_id VARCHAR(80) DEFAULT NULL,
  pay_schedule ENUM('monthly', 'biweekly', 'semimonthly') NOT NULL DEFAULT 'monthly',
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_code) REFERENCES countries(code),
  FOREIGN KEY (base_currency) REFERENCES currencies(code)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firm_id INT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('super_admin', 'firm_admin', 'manager', 'employee') NOT NULL,
  manager_id INT NULL,
  department VARCHAR(80) DEFAULT 'General',
  designation VARCHAR(100) DEFAULT 'Team Member',
  country_code VARCHAR(10) NOT NULL DEFAULT 'US',
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
  base_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  tax_regime VARCHAR(40) DEFAULT 'standard',
  bank_account_last4 VARCHAR(10) DEFAULT '4242',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (country_code) REFERENCES countries(code),
  FOREIGN KEY (currency_code) REFERENCES currencies(code)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firm_id INT NOT NULL,
  pay_period VARCHAR(30) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  employee_count INT NOT NULL DEFAULT 0,
  total_gross DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  total_deductions DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  total_net DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  status ENUM('draft', 'review', 'approved', 'disbursed') NOT NULL DEFAULT 'draft',
  anomaly_summary TEXT NULL,
  created_by INT NULL,
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
  FOREIGN KEY (currency_code) REFERENCES currencies(code)
);

CREATE TABLE IF NOT EXISTS payslips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payroll_run_id INT NOT NULL,
  firm_id INT NOT NULL,
  user_id INT NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  gross_pay DECIMAL(14, 2) NOT NULL,
  statutory_deduction DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  income_tax DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  reimbursement_add DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  lop_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  net_pay DECIMAL(14, 2) NOT NULL,
  breakdown_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reimbursements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firm_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Travel',
  amount DECIMAL(14, 2) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  converted_base_amount DECIMAL(14, 2) NOT NULL,
  receipt_text TEXT NULL,
  policy_check_status VARCHAR(80) DEFAULT 'Verified by Gemini',
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firm_id INT NOT NULL,
  user_id INT NOT NULL,
  leave_type ENUM('Annual', 'Sick', 'Casual', 'Unpaid') NOT NULL DEFAULT 'Annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(5, 1) NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firm_id INT NULL,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(60) NULL,
  details_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS section_helps (
  section_key VARCHAR(80) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  help_text TEXT NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firm_id INT NULL,
  label VARCHAR(100) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'gemini',
  model_name VARCHAR(60) NOT NULL DEFAULT 'gemini-2.0-flash',
  api_key VARCHAR(255) NOT NULL,
  task_type ENUM('all', 'text', 'image', 'audit', 'copilot') NOT NULL DEFAULT 'all',
  token_limit INT NOT NULL DEFAULT 100000,
  tokens_used INT NOT NULL DEFAULT 0,
  priority_order INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active', 'exhausted', 'disabled') NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_task_routing (
  task_type ENUM('text', 'image', 'audit', 'copilot') PRIMARY KEY,
  primary_key_id INT NULL,
  auto_failover TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (primary_key_id) REFERENCES ai_api_keys(id) ON DELETE SET NULL
);
