import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function initDatabase() {
  const dbName = process.env.DB_NAME || 'paypulse_ai';
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await rootConn.query(`USE \`${dbName}\`;`);

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await rootConn.query(schemaSql);

  // Always ensure pre-filled section help texts exist
  await rootConn.query(`
    INSERT IGNORE INTO section_helps (section_key, title, help_text) VALUES
    ('super_kpis', 'Global Platform KPIs', 'Displays total active firms, global headcount, normalized USD disbursed payroll volume across all currencies, and supported countries.'),
    ('super_firms', 'Tenant Firms Directory', 'Lists all onboarded firms. Use "Onboard New Firm" to provision a new country/currency tenant, "Inspect" to enter a firm console, or "Suspend/Activate" to control access.'),
    ('super_countries', 'Supported Countries, Statutory Rules & FX Rates', 'Shows each supported country, its base currency, USD exchange rate, statutory fund (EPF/FICA/NI/GPSSA/CPF), and default tax authority.'),
    ('firm_payroll', 'Payroll Runs & Gemini Audit', 'Select a pay period (YYYY-MM) and click "Run Payroll & Gemini Audit". Gemini scans for >10% net pay shifts, LOP deductions, and approved reimbursements before you Approve and Disburse.'),
    ('firm_employees', 'Employee Directory & Gemini Onboarding', 'View all active employees in your firm. Paste an offer letter or candidate summary and click "Auto-Fill with Gemini" to extract name, email, role, and salary automatically.'),
    ('firm_approvals', 'Firm Expense & Leave Approvals', 'Review pending multi-currency expense claims (converted to firm base currency) and employee leave requests across the firm.'),
    ('firm_audit', 'Immutable Compliance Audit Log', 'Tracks every sensitive action—firm creation, employee onboarding, payroll generation, approvals, disbursements, and help text updates.'),
    ('manager_team', 'My Direct Reports', 'Lists employees reporting directly to you along with their designation, country, and monthly base salary.'),
    ('manager_reimbursements', 'Team Reimbursements', 'Review expense claims submitted by your direct reports. Check the Gemini Policy Check badge before approving or rejecting.'),
    ('manager_leaves', 'Team Leave Requests', 'Approve or reject Annual, Sick, Casual, or Unpaid leave requests from your direct reports.'),
    ('emp_payslips', 'My Payslips', 'View your monthly/bi-weekly payslips with itemized Gross Pay, Statutory Deductions, Income Tax, and Net Take-Home Pay.'),
    ('emp_reimbursements', 'Submit Expense Claim (Multi-Currency)', 'Paste receipt text and click "Parse Receipt with Gemini" to auto-fill category, amount, and currency. Foreign currency claims are automatically converted to your firm base currency.'),
    ('emp_leaves', 'Apply for Leave', 'Submit a new leave request by selecting leave type, start/end dates, days, and reason. Track approval status below.'),
    ('settings_api_keys', 'API Keys & Task-Based LLM Routing', 'Add multiple LLM API keys, set one active, and assign different keys per task (Text, Image/OCR, Payroll Audit, Copilot). When a key reaches its token limit, PayPulse AI automatically fails over to the next available key.');
  `);

  // Seed default AI API keys and task routing if empty
  const [existingKeys] = await rootConn.query('SELECT COUNT(*) AS cnt FROM ai_api_keys');
  if (existingKeys[0].cnt === 0) {
    const envKey = process.env.GEMINI_API_KEY || 'GEMINI_ENV_PLACEHOLDER_KEY';
    await rootConn.query(
      `INSERT INTO ai_api_keys (id, label, provider, model_name, api_key, task_type, token_limit, tokens_used, priority_order, is_active, status) VALUES
       (1, 'LLM-1 Gemini Flash (Text & Copilot)', 'gemini', 'gemini-2.0-flash', ?, 'text', 50000, 1250, 1, 1, 'active'),
       (2, 'LLM-2 Gemini Vision (Image / OCR)', 'gemini', 'gemini-2.0-flash', ?, 'image', 50000, 420, 2, 0, 'active'),
       (3, 'LLM-3 Gemini Backup Failover', 'gemini', 'gemini-1.5-flash', ?, 'all', 100000, 0, 3, 0, 'active')`,
      [envKey, envKey, envKey]
    );
    await rootConn.query(`
      INSERT IGNORE INTO ai_task_routing (task_type, primary_key_id, auto_failover) VALUES
      ('text', 1, 1),
      ('image', 2, 1),
      ('audit', 1, 1),
      ('copilot', 1, 1)
    `);
  }

  // Check if already seeded
  const [existingFirms] = await rootConn.query('SELECT COUNT(*) AS cnt FROM firms');
  if (existingFirms[0].cnt > 0) {
    await rootConn.end();
    return { seeded: false, message: 'Database already initialized and seeded.' };
  }

  // 1. Seed Currencies
  await rootConn.query(`
    INSERT INTO currencies (code, symbol, name, rate_to_usd) VALUES
    ('USD', '$', 'US Dollar', 1.000000),
    ('INR', '₹', 'Indian Rupee', 0.011900),
    ('GBP', '£', 'British Pound', 1.270000),
    ('AED', 'د.إ', 'UAE Dirham', 0.272300),
    ('SGD', 'S$', 'Singapore Dollar', 0.745000);
  `);

  // 2. Seed Countries
  await rootConn.query(`
    INSERT INTO countries (code, name, currency_code, statutory_name, statutory_rate_pct, default_tax_pct, tax_authority) VALUES
    ('US', 'United States', 'USD', 'FICA (Social Security + Medicare)', 7.65, 18.00, 'IRS'),
    ('IN', 'India', 'INR', 'EPF (Provident Fund)', 12.00, 10.00, 'CBDT / EPFO'),
    ('GB', 'United Kingdom', 'GBP', 'National Insurance (NI)', 12.00, 20.00, 'HMRC'),
    ('AE', 'United Arab Emirates', 'AED', 'GPSSA Pension / EOSB', 5.00, 0.00, 'FTA / MOHRE'),
    ('SG', 'Singapore', 'SGD', 'CPF Contribution', 20.00, 8.00, 'IRAS');
  `);

  // 3. Seed Multi-Tenant Firms
  await rootConn.query(`
    INSERT INTO firms (id, name, slug, country_code, base_currency, statutory_id, pay_schedule, status) VALUES
    (1, 'Apex FinTech India Pvt Ltd', 'apex-india', 'IN', 'INR', 'TAN-MUM99210A', 'monthly', 'active'),
    (2, 'NovaCloud Corp USA', 'novacloud-us', 'US', 'USD', 'EIN-84-2910441', 'biweekly', 'active'),
    (3, 'Thames Digital UK Ltd', 'thames-uk', 'GB', 'GBP', 'PAYE-475/GB8821', 'monthly', 'active');
  `);

  const pwHash = await bcrypt.hash('Demo@123', 10);

  // 4. Seed Users across all 4 roles
  await rootConn.query(`
    INSERT INTO users (id, firm_id, email, password_hash, full_name, role, manager_id, department, designation, country_code, currency_code, base_salary, tax_regime, bank_account_last4) VALUES
    (1, NULL, 'super@paypulse.ai', ?, 'Arjun Mehta (Super App Admin)', 'super_admin', NULL, 'Platform Ops', 'Global Platform Admin', 'US', 'USD', 0.00, 'standard', '0000'),
    
    -- Firm 1: Apex FinTech India (INR)
    (2, 1, 'admin@apexindia.com', ?, 'Priya Sharma', 'firm_admin', NULL, 'HR & Payroll', 'VP People Operations', 'IN', 'INR', 220000.00, 'new_regime', '8812'),
    (3, 1, 'manager@apexindia.com', ?, 'Rohan Verma', 'manager', 2, 'Engineering', 'Engineering Manager', 'IN', 'INR', 185000.00, 'new_regime', '3341'),
    (4, 1, 'dev@apexindia.com', ?, 'Ananya Iyer', 'employee', 3, 'Engineering', 'Senior Backend Engineer', 'IN', 'INR', 125000.00, 'new_regime', '9024'),
    (5, 1, 'qa@apexindia.com', ?, 'Vikram Nair', 'employee', 3, 'Engineering', 'QA Automation Lead', 'IN', 'INR', 95000.00, 'old_regime', '5519'),

    -- Firm 2: NovaCloud Corp USA (USD)
    (6, 2, 'admin@novacloud.us', ?, 'Sarah Jenkins', 'firm_admin', NULL, 'Finance & HR', 'Director of People', 'US', 'USD', 14500.00, 'W4-Single', '7741'),
    (7, 2, 'manager@novacloud.us', ?, 'Marcus Vance', 'manager', 6, 'Product', 'Product Lead', 'US', 'USD', 12000.00, 'W4-Married', '6612'),
    (8, 2, 'eng@novacloud.us', ?, 'Elena Rostova', 'employee', 7, 'Product', 'Staff Frontend Engineer', 'US', 'USD', 10500.00, 'W4-Single', '1190'),

    -- Firm 3: Thames Digital UK (GBP)
    (9, 3, 'admin@thamesuk.co.uk', ?, 'Oliver Bennett', 'firm_admin', NULL, 'Operations', 'Head of HR UK', 'GB', 'GBP', 8200.00, 'PAYE-1257L', '3091'),
    (10, 3, 'emp@thamesuk.co.uk', ?, 'Chloe Hughes', 'employee', 9, 'Design', 'Lead Product Designer', 'GB', 'GBP', 5800.00, 'PAYE-1257L', '4482');
  `, Array(10).fill(pwHash));

  // 5. Seed Historical Disbursed Payroll Runs & Payslips
  await rootConn.query(`
    INSERT INTO payroll_runs (id, firm_id, pay_period, currency_code, employee_count, total_gross, total_deductions, total_net, status, anomaly_summary, created_by, approved_by) VALUES
    (1, 1, '2026-10', 'INR', 4, 625000.00, 137500.00, 487500.00, 'disbursed', 'Gemini Audit: 0 anomalies detected. All EPF & TDS slabs match CBDT FY26-27 rules.', 2, 2),
    (2, 2, '2026-10', 'USD', 3, 37000.00, 9490.50, 27509.50, 'disbursed', 'Gemini Audit: 0 anomalies detected. FICA 7.65% & Federal withholding verified.', 6, 6),
    (3, 3, '2026-10', 'GBP', 2, 14000.00, 4480.00, 9520.00, 'disbursed', 'Gemini Audit: 0 anomalies detected. HMRC NI & PAYE 1257L verified.', 9, 9);
  `);

  await rootConn.query(`
    INSERT INTO payslips (payroll_run_id, firm_id, user_id, currency_code, gross_pay, statutory_deduction, income_tax, reimbursement_add, lop_days, net_pay, breakdown_json) VALUES
    (1, 1, 2, 'INR', 220000.00, 26400.00, 22000.00, 0.00, 0.0, 171600.00, '{"basic": 110000, "hra": 55000, "special": 55000, "epf": 26400, "tds": 22000}'),
    (1, 1, 3, 'INR', 185000.00, 22200.00, 18500.00, 0.00, 0.0, 144300.00, '{"basic": 92500, "hra": 46250, "special": 46250, "epf": 22200, "tds": 18500}'),
    (1, 1, 4, 'INR', 125000.00, 15000.00, 12500.00, 0.00, 0.0, 97500.00, '{"basic": 62500, "hra": 31250, "special": 31250, "epf": 15000, "tds": 12500}'),
    (1, 1, 5, 'INR', 95000.00, 11400.00, 9500.00, 0.00, 0.0, 74100.00, '{"basic": 47500, "hra": 23750, "special": 23750, "epf": 11400, "tds": 9500}'),
    (2, 2, 6, 'USD', 14500.00, 1109.25, 2610.00, 0.00, 0.0, 10780.75, '{"base": 14500, "fica": 1109.25, "federal_tax": 2610}'),
    (2, 2, 7, 'USD', 12000.00, 918.00, 2160.00, 0.00, 0.0, 8922.00, '{"base": 12000, "fica": 918, "federal_tax": 2160}'),
    (2, 2, 8, 'USD', 10500.00, 803.25, 1890.00, 0.00, 0.0, 7806.75, '{"base": 10500, "fica": 803.25, "federal_tax": 1890}'),
    (3, 3, 9, 'GBP', 8200.00, 984.00, 1640.00, 0.00, 0.0, 5576.00, '{"base": 8200, "ni": 984, "paye": 1640}'),
    (3, 3, 10, 'GBP', 5800.00, 696.00, 1160.00, 0.00, 0.0, 3944.00, '{"base": 5800, "ni": 696, "paye": 1160}');
  `);

  // 6. Seed Reimbursements & Leave Requests
  await rootConn.query(`
    INSERT INTO reimbursements (firm_id, user_id, title, category, amount, currency_code, converted_base_amount, receipt_text, policy_check_status, status) VALUES
    (1, 4, 'AWS re:Invent Virtual Pass', 'Learning & Dev', 150.00, 'USD', 12605.04, 'Invoice #AWS-2026-8812 - $150.00 USD', 'Passed (Within ₹25,000 L&D cap)', 'pending'),
    (1, 5, 'Client Onsite Cab & Meals', 'Travel', 3450.00, 'INR', 3450.00, 'Uber + Restaurant receipt total ₹3,450', 'Passed (Travel policy compliant)', 'approved'),
    (2, 8, 'Ergonomic Monitor Stand', 'Home Office', 220.00, 'USD', 220.00, 'Amazon Business Order #114-9283 - $220.00', 'Passed (Under $500 WFH allowance)', 'pending');
  `);

  await rootConn.query(`
    INSERT INTO leave_requests (firm_id, user_id, leave_type, start_date, end_date, days, reason, status) VALUES
    (1, 4, 'Annual', '2026-12-02', '2026-12-04', 3.0, 'Family wedding in Jaipur', 'pending'),
    (2, 8, 'Sick', '2026-11-18', '2026-11-19', 2.0, 'Seasonal flu recovery', 'approved');
  `);

  await rootConn.query(`
    INSERT INTO audit_logs (firm_id, user_id, action, entity_type, entity_id, details_json) VALUES
    (1, 2, 'PAYROLL_DISBURSED', 'payroll_run', '1', '{"period": "2026-10", "total_net": 487500, "currency": "INR"}'),
    (2, 6, 'PAYROLL_DISBURSED', 'payroll_run', '2', '{"period": "2026-10", "total_net": 27509.5, "currency": "USD"}');
  `);

  await rootConn.end();
  return { seeded: true, message: 'Database initialized and seeded successfully.' };
}

if (process.argv[1] === __filename) {
  initDatabase()
    .then((res) => {
      console.log(res.message);
      process.exit(0);
    })
    .catch((err) => {
      console.error('DB Init Error:', err);
      process.exit(1);
    });
}
