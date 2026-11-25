# 06 — Tech Document (TD): Technical, Functional & Business Logic

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.0  

---

## 1. Technical Logic

### 1.1 Authentication & Tenant Context Resolution
- **Login (`POST /api/auth/login`):** Looks up active user in `users` joined with `firms`, verifies `bcryptjs` hash, and signs a 12h JWT containing `id`, `firm_id`, `role`, `country_code`, `currency_code`.
- **Middleware (`backend/src/middleware/auth.js`):**
  - `authenticate`: Validates `Bearer <token>`.
  - `requireRole(...roles)`: Enforces RBAC at route level.
  - `resolveFirmId(req)`: If `req.user.role === 'super_admin'`, reads `req.query.firm_id`, `req.headers['x-firm-id']`, or `req.body.firm_id`. For all other roles, **always** returns `Number(req.user.firm_id)`, preventing horizontal privilege escalation across firms.

### 1.2 Database Connection & Auto-Initialization
- `backend/src/config/db.js` creates a `mysql2/promise` pool targeting `localhost:3306` (`paypulse_ai`).
- `backend/src/db/init.js` creates the database if missing, executes `schema.sql`, and seeds currencies, countries, 3 firms, 10 users, 3 historical payroll runs, 9 payslips, reimbursements, leave requests, and audit logs idempotently.

---

## 2. Functional Logic

### 2.1 Payroll Run Lifecycle
1. **Trigger (`POST /api/payroll/run`):** Firm Admin submits `pay_period` (e.g., `2026-11`).
2. **Fetch Active Employees & Approved Reimbursements:** Queries `users` (`firm_id = ? AND status = 'active' AND base_salary > 0`) and aggregates `reimbursements` (`status = 'approved'`) per `user_id`.
3. **Calculate Payslips:** Calls `calculateEmployeePayslip()` per employee.
4. **Gemini Pre-Run Audit:** Calls `auditPayrollAnomalies()` comparing current draft against the most recent `payroll_runs` record.
5. **Persist:** Inserts `payroll_runs` row with `status = 'review'`, inserts `payslips` rows, and logs `PAYROLL_RUN_CREATED` to `audit_logs`.
6. **Transitions (`PATCH /api/payroll/:id/status`):** `review` → `approved` → `disbursed` (each logged to `audit_logs`).

### 2.2 Role-Scoped Dashboards (`GET /api/firm/dashboard`)
- `employee`: Returns only own `payslips`, `reimbursements`, and `leave_requests`.
- `manager`: Queries direct reports (`manager_id = req.user.id`) and returns only their `reimbursements` and `leave_requests`.
- `firm_admin` / `super_admin` (inspecting): Returns firm's `employees`, `payrollRuns`, `reimbursements`, `leaves`, and latest 20 `auditLogs`.

---

## 3. Business Logic

### 3.1 Multi-Currency Conversion (`convertCurrency`)
All currencies store `rate_to_usd` in `currencies`:
$$\text{convertedAmount} = \text{roundMoney}\left(\frac{\text{amount} \times \text{fromRateToUsd}}{\text{toRateToUsd}}\right)$$
- Used when an employee's salary currency differs from the firm's `base_currency`.
- Used when an employee submits an expense claim in a foreign currency (e.g., `150 USD` claim inside an `INR` firm → `converted_base_amount = 12,605.04 INR`).
- Used by Super App Admin to normalize all firms' disbursed payrolls into `USD`.

### 3.2 Country-Specific Statutory & Tax Calculation (`calculateEmployeePayslip`)
1. **Proration & LOP:**
   $$\text{lopDeduction} = \text{roundMoney}\left(\frac{\text{baseSalaryInFirmCurrency}}{30} \times \text{lopDays}\right)$$
   $$\text{grossPay} = \text{baseSalaryInFirmCurrency} - \text{lopDeduction}$$
2. **Statutory Deduction:** `grossPay * (country.statutory_rate_pct / 100)`
   - India (`IN`): 12.00% EPF (plus 50% Basic / 25% HRA / 25% Special Allowance breakdown)
   - USA (`US`): 7.65% FICA
   - UK (`GB`): 12.00% National Insurance
   - UAE (`AE`): 5.00% GPSSA
   - Singapore (`SG`): 20.00% CPF
3. **Tax Regime Adjustments:**
   - India `old_regime`: `-2.0%` from `default_tax_pct` (10% → 8%).
   - USA `W4-Married`: `-3.0%` from `default_tax_pct` (18% → 15%).
4. **Net Pay:**
   $$\text{netPay} = \text{grossPay} - \text{statutoryDeduction} - \text{incomeTax} + \text{reimbursementAdd}$$

### 3.3 Gemini AI Guardrails & Fallback
- **Deterministic Math Guarantee:** Gemini never computes salary, tax, or FX math.
- **Fallback:** If `GEMINI_API_KEY` is blank or an API error occurs, `geminiService.js` executes deterministic regex/rule-based extraction, anomaly flagging, and RBAC-scoped Q&A so the application remains 100% functional offline/without a key.
