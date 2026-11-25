# 01 — Use Cases

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.0  

---

## Actors
1. **Super App Admin (`super_admin`)** — Global platform operator across all firms.
2. **Firm Admin (`firm_admin`)** — HR/Payroll administrator scoped to a single firm.
3. **Manager (`manager`)** — People manager scoped to direct reports within a firm.
4. **Team User / Employee (`employee`)** — Individual contributor scoped to self-service data.
5. **Google Gemini AI Layer** — Intelligence subsystem for document parsing, anomaly auditing, and Q&A.

---

## Core Use Cases

### UC-01: Provision New Multi-Country Firm (Super App Admin)
- **Actor:** Super App Admin
- **Precondition:** Authenticated with `super_admin` JWT.
- **Main Flow:**
  1. Admin opens Global Multi-Firm Console and clicks **Onboard New Firm**.
  2. Admin enters firm name, selects country (e.g., `AE` - UAE), base currency (`AED`), statutory tax ID, pay schedule, and initial Firm Admin credentials.
  3. System creates the firm record in `firms`, hashes the Firm Admin password, creates the `firm_admin` user in `users`, and writes `FIRM_CREATED` to `audit_logs`.
- **Postcondition:** New isolated tenant is active and ready for login.

### UC-02: Inspect Tenant Firm Context (Super App Admin)
- **Actor:** Super App Admin
- **Main Flow:**
  1. Admin clicks **Inspect** on any firm row (e.g., Apex FinTech India).
  2. Frontend stores `paypulse_firm_id` and sends `X-Firm-Id` header on API calls.
  3. Backend `resolveFirmId()` switches context to that firm so the Super Admin can view/manage its payroll and employees.

### UC-03: Gemini Multimodal Employee Onboarding (Firm Admin)
- **Actor:** Firm Admin
- **Main Flow:**
  1. Firm Admin navigates to **Employees** tab and pastes offer letter/candidate text.
  2. Admin clicks **Auto-Fill with Gemini** (`POST /api/ai/parse-document`).
  3. System extracts `full_name`, `email`, `department`, `designation`, `base_salary`, and `currency_code`.
  4. Admin reviews/edits fields and clicks **Save Employee** (`POST /api/firm/employees`).

### UC-04: Generate, Audit, Approve & Disburse Payroll Run (Firm Admin)
- **Actor:** Firm Admin
- **Main Flow:**
  1. Admin selects pay period (e.g., `2026-11`) and clicks **Run Payroll & Gemini Audit** (`POST /api/payroll/run`).
  2. Deterministic Payroll Engine calculates gross pay, LOP, country statutory deductions (EPF/FICA/NI/CPF/GPSSA), income tax, approved reimbursements (converted to firm base currency), and net pay.
  3. Gemini Anomaly Auditor compares draft payslips against the previous run and generates an audit summary.
  4. Run is saved in `review` status. Admin clicks **Approve** (`approved`) and then **Disburse** (`disbursed`).

### UC-05: Approve Team Leave & Reimbursements (Manager)
- **Actor:** Manager
- **Main Flow:**
  1. Manager logs into Manager Portal and views direct reports (`manager_id = req.user.id`).
  2. Manager reviews pending reimbursement claims (with Gemini policy check badge) and leave requests.
  3. Manager clicks **Approve** or **Reject** (`PATCH /api/operations/reimbursements/:id` or `/leaves/:id`).

### UC-06: Submit Multi-Currency Expense Claim with Gemini Receipt Parser (Employee)
- **Actor:** Employee
- **Main Flow:**
  1. Employee pastes receipt text (e.g., `"Uber Airport Ride 45 USD"`) and clicks **Parse Receipt with Gemini**.
  2. Gemini extracts title, category, amount, currency, and policy check status.
  3. Employee submits claim (`POST /api/operations/reimbursements`); backend converts claim currency to firm base currency using `currencies.rate_to_usd`.

### UC-07: Query RBAC-Scoped Gemini Copilot (All Roles)
- **Actor:** Any Authenticated User
- **Main Flow:**
  1. User opens **Gemini Copilot** drawer and asks a question (e.g., *"Explain my latest payslip"* or *"How many pending leaves?"*).
  2. Backend gathers strictly RBAC-filtered context for that user's `role`, `firm_id`, and `user_id` and invokes Gemini (`POST /api/ai/copilot`).
