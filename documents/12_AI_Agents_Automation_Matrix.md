# 12 — AI Agents & Role-Based Task Automation Matrix

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:52:32 (+05:30)  
**Version:** 1.0  

---

## 1. Overview
PayPulse AI uses a **multi-agent LLM architecture** backed by the `ai_api_keys` pool and `ai_task_routing` engine (`text`, `image`, `audit`, `copilot`). Each agent automates repetitive operational tasks for specific user roles while keeping final financial disbursements and deterministic tax math under strict human-in-the-loop (HITL) and backend code control.

---

## 2. Recommended Set of LLM AI Agents

### Agent 1: **Onboarding & Document Extraction Agent**
* **Target Role:** Firm Admin (`firm_admin`), Super App Admin (`super_admin`)
* **Task Routing:** `text` / `image` (`LLM-1` / `LLM-2`)
* **Automated Tasks:**
  * Parses offer letters, candidate resumes, tax forms (W-4, Form 16), and government IDs.
  * Extracts structured JSON (`full_name`, `email`, `department`, `designation`, `base_salary`, `currency_code`) and pre-fills the onboarding form.
* **Guardrail:** Human admin clicks **Save Employee** to commit to MySQL.

### Agent 2: **Payroll Anomaly & Compliance Auditor Agent**
* **Target Role:** Firm Admin (`firm_admin`), Finance
* **Task Routing:** `audit` (`LLM-1` / `LLM-3`)
* **Automated Tasks:**
  * Scans every draft payroll run before approval.
  * Compares current run totals and individual payslips against historical `payroll_runs`.
  * Flags >10% net pay variances, LOP deductions, duplicate bonuses, or reimbursement spikes, and verifies country statutory alignment (EPF/FICA/NI/GPSSA/CPF).
* **Guardrail:** Never calculates net pay; deterministic `payrollEngine.js` performs all math.

### Agent 3: **Expense Receipt OCR & Policy Check Agent**
* **Target Role:** Employee (`employee`), Manager (`manager`)
* **Task Routing:** `image` (`LLM-2`)
* **Automated Tasks:**
  * Reads receipt text/images, extracts merchant, date, amount, currency, and category (`Travel`, `Home Office`, `Learning & Dev`, `Meals`).
  * Automatically checks the claim against company expense caps and attaches a **Policy Check Badge** (`Passed` / `Flagged`) for the Manager.
* **Guardrail:** Manager/Firm Admin retains final Approve/Reject authority for high-value claims.

### Agent 4: **Manager Triage & Approval Assistant Agent**
* **Target Role:** Manager (`manager`)
* **Task Routing:** `text` / `copilot`
* **Automated Tasks:**
  * Summarizes pending team leave requests and checks team overlap/coverage dates.
  * Pre-triages team expense claims by highlighting out-of-policy items and auto-approving low-risk claims under a configured threshold (e.g., < $50).
* **Guardrail:** Out-of-policy or high-value claims require explicit Manager click.

### Agent 5: **Employee Self-Service & Payslip Explainer Copilot**
* **Target Role:** Employee (`employee`)
* **Task Routing:** `copilot` (`LLM-1`)
* **Automated Tasks:**
  * Answers 24/7 natural-language questions (*"Why was my TDS higher this month?"*, *"How many pending leaves do I have?"*).
  * Explains payslip line items (Gross, Statutory, Tax, Net) and company HR/expense policies.
* **Guardrail:** Strictly RBAC-scoped to `req.user.id` and `req.user.firm_id`—cannot access other employees' salaries.

### Agent 6: **Global FX & Multi-Firm Executive Analyst Agent**
* **Target Role:** Super App Admin (`super_admin`)
* **Task Routing:** `audit` / `copilot`
* **Automated Tasks:**
  * Aggregates multi-currency payrolls (`INR`, `USD`, `GBP`, `AED`, `SGD`) into normalized `USD` insights.
  * Alerts on FX rate drift, suspended/inactive firms, or upcoming statutory filing deadlines across countries.

---

## 3. Role-to-Automation Summary Matrix

| Role | Automatable Tasks (LLM Agents) | Must Remain Deterministic / Human-Approved |
| :--- | :--- | :--- |
| **Super App Admin** | Multi-firm USD spend summaries, FX anomaly alerts, firm onboarding pre-fill | Suspending firms, editing FX rates, provisioning tenant credentials |
| **Firm Admin** | Offer-letter parsing, pre-run payroll anomaly audit, audit log Q&A | Net pay/tax math, final `Approve` & `Disburse` bank payouts |
| **Manager** | Leave overlap summaries, receipt policy pre-checks, low-risk claim triage | Final approval of team leave & high-value reimbursements |
| **Team User / Employee** | Receipt OCR & auto-fill, payslip explanations, tax/policy Q&A | Submitting claims, bank account updates |
