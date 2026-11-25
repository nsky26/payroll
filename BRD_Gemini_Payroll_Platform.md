# Business Requirements Document (BRD)
## Project: **PayPulse AI** — Gemini-Powered Payroll & HR Compliance Platform (Zoho Payroll / Workday Clone)

**Document Version:** 1.0  
**Date:** November 25, 2026  
**Target Reference Applications:** Zoho Payroll, Workday (Sana Self-Service Agent powered by Google Gemini), Gusto  

---

## 1. Executive Summary

### 1.1 Purpose
This Business Requirements Document (BRD) defines the functional, non-functional, AI/LLM, compliance, and integration requirements for **PayPulse AI**, a multi-tenant SaaS payroll and HR compliance platform modeled after **Zoho Payroll** and enhanced with **Google Gemini** as its native intelligence layer.

### 1.2 Reference Vendor Benchmark (Using Google Gemini)
Several enterprise SaaS vendors have embedded Google Gemini into their core workflows:
- **Workday + Sana (Google Cloud Partnership):** Uses Google Gemini as a default underlying model for its **Sana Self-Service Agent**, allowing employees and HR teams to query payroll, HR policies, and financial data in natural language while strictly enforcing role-based access control (RBAC).
- **Zoho (Gemini Connected Apps / MCP):** Connects Zoho business applications (CRM, Desk, Mail, Projects) to Gemini via Model Context Protocol (MCP) for cross-app contextual prompting and action execution.
- **Shopify (Shopify Sidekick):** Embeds Gemini as an always-on conversational copilot for merchants to run reports, manage operations, and execute tasks via natural language.

**PayPulse AI** combines the structured payroll engine of **Zoho Payroll** with the conversational, agentic, and document-intelligence capabilities demonstrated by **Workday + Gemini** and **Shopify Sidekick**.

---

## 2. Business Objectives & Success Metrics

### 2.1 Business Objectives
1. **Automate End-to-End Payroll Processing:** Reduce manual payroll preparation time by 75% using Gemini-assisted anomaly detection, attendance reconciliation, and one-click pay runs.
2. **Eliminate Manual Document Entry:** Use Gemini's multimodal capabilities to extract structured employee, tax, and reimbursement data from PDFs, IDs, offer letters, and receipts.
3. **Ensure Statutory & Tax Compliance:** Automatically track tax slabs, statutory deductions (PF/ESI/TDS/401k/FICA depending on region), and generate audit-ready filings.
4. **Provide 24/7 Employee & Admin Self-Service:** Deploy an embedded Gemini Copilot to answer payslip queries, explain tax deductions, and execute approved HR actions.

### 2.2 Key Performance Indicators (KPIs)
| Metric | Target |
| :--- | :--- |
| Payroll Run Accuracy | ≥ 99.95% |
| Time to Complete Monthly Pay Run (50–500 employees) | < 10 minutes |
| Document Extraction Accuracy (IDs, Tax Forms, Receipts) | ≥ 97% |
| Employee Self-Service Ticket Deflection (via Gemini Copilot) | ≥ 65% |
| System Uptime (SLA) | 99.9% |

---

## 3. Target Users & Personas

1. **Super Admin / Business Owner:** Configures company entity, bank accounts, tax registrations, and approves final payroll disbursements.
2. **Payroll & HR Administrator:** Manages employee onboarding, salary structures, attendance/leave sync, reimbursements, and statutory filings.
3. **Finance / Accountant:** Reviews general ledger (GL) journal entries, cost center allocations, and tax liability reports.
4. **Employee (Self-Service Portal):** Views/downloads payslips, submits tax declarations, uploads expense receipts, applies for leave, and queries the Gemini Copilot.

---

## 4. Scope of the Application

### 4.1 In-Scope (MVP + Phase 2)
- Multi-tenant organization & entity management
- Employee lifecycle & onboarding (with Gemini multimodal document parsing)
- Flexible salary structure & earnings/deductions builder
- Automated monthly/bi-weekly payroll run engine
- Statutory compliance & tax calculation engine
- Reimbursements, loans, and off-cycle bonus runs
- Direct bank payout file generation & payment gateway integration
- Employee Self-Service (ESS) web & mobile-responsive portal
- **Gemini AI Copilot & Agentic Workflows** (Admin + Employee modes)
- Role-Based Access Control (RBAC) & immutable audit logs

### 4.2 Out-of-Scope (for Initial Release)
- Full applicant tracking system (ATS) / recruitment module
- Performance appraisal & OKR management
- Global Employer-of-Record (EOR) legal entity hosting

---

## 5. Functional Requirements

### 5.1 Organization & Statutory Setup
- **FR-1.1:** Support multiple legal entities, pay schedules (monthly, semi-monthly, bi-weekly), and workweek calendars per tenant.
- **FR-1.2:** Configure statutory identifiers (e.g., PAN/TAN/PF/ESI/PT in India or EIN/SSN/State Tax IDs in US) with validation rules.
- **FR-1.3:** Support multi-location tax rules and custom earning/deduction components (Basic, HRA, Special Allowance, Overtime, Gratuity, 401k/PF).

### 5.2 Employee Management & AI Onboarding
- **FR-2.1:** Maintain employee master records (personal info, bank details, tax regime, salary history, work location).
- **FR-2.2 (Gemini Multimodal Onboarding):** Allow HR to upload offer letters, government IDs, bank passbooks/voided checks, or prior-employment tax forms (PDF/JPEG/PNG). Gemini extracts fields into a structured JSON preview for one-click human verification.
- **FR-2.3:** Support bulk CSV/Excel import with automated schema mapping and validation error reporting.

### 5.3 Payroll Processing Engine
- **FR-3.1:** Automatically compute gross pay, proration (mid-month joiners/exits), Loss of Pay (LOP) from attendance/leave data, overtime, and arrears.
- **FR-3.2:** Calculate statutory deductions and income tax (TDS/withholding) based on employee declarations and active tax slabs.
- **FR-3.3:** Support **Draft → Review → Approve → Disburse** workflow with multi-level approval rules.
- **FR-3.4 (Gemini Pre-Run Anomaly Detection):** Before approval, Gemini scans the draft pay run against historical runs to flag anomalies (e.g., *"Employee #1042 net pay spiked +42% vs. 3-month average due to duplicate bonus entry"*).
- **FR-3.5:** Support off-cycle pay runs (bonuses, full-and-final settlements, reimbursements).

### 5.4 Reimbursements & Expense Claims
- **FR-4.1:** Employees upload receipts via ESS portal.
- **FR-4.2 (Gemini Receipt OCR & Policy Check):** Gemini extracts merchant, date, amount, currency, and tax, then checks against company expense policy before routing to manager approval.

### 5.5 Payslips, Reports & Payouts
- **FR-5.1:** Auto-generate branded PDF payslips and annual tax statements (e.g., Form 16 / W-2) upon pay run finalization.
- **FR-5.2:** Generate bank-ready NEFT/ACH/SEPA payout files or trigger direct API payouts.
- **FR-5.3:** Export accounting journal entries (QuickBooks, Zoho Books, Xero, Tally formats).

---

## 6. Google Gemini AI Capabilities & Architecture

### 6.1 AI Features Matrix
| Feature | User Persona | Gemini Capability Used | Grounding / Guardrails |
| :--- | :--- | :--- | :--- |
| **Document-to-Profile Onboarding** | HR Admin | Multimodal Vision + Structured JSON Output | Confidence score threshold; mandatory human review before DB commit |
| **Payroll Anomaly Auditor** | Payroll Admin | Long-context reasoning over current vs. historical pay runs | Deterministic math stays in payroll engine; Gemini only flags & explains |
| **Natural Language Reporting** | Finance / Admin | Function Calling / Text-to-SQL (read-only views) | Strict tenant isolation & RBAC row-level filtering |
| **Employee Payslip & Tax Copilot** | Employee | RAG (company policy + tax rules) + Function Calling (fetch own payslip) | User can ONLY access their own `employee_id` records |
| **Policy & Compliance Q&A** | HR / Employee | Grounded RAG over statutory & HR handbook docs | Citations required; disclaimer for formal legal/tax advice |

### 6.2 Strict AI Safety & Accuracy Rules
- **No LLM Math for Paychecks:** All currency, tax, and proration calculations MUST be executed by deterministic backend code. Gemini is used for extraction, explanation, anomaly detection, and orchestration—never for computing final net pay.
- **Zero Public Training:** All API calls must use enterprise-isolated Google Cloud Vertex AI / Gemini Enterprise endpoints with zero data retention for model training.
- **RBAC Enforcement:** Every Gemini tool call must pass the authenticated user's `tenant_id`, `role`, and `user_id` at the API gateway layer.

---

## 7. Non-Functional Requirements

- **Security & Privacy:** AES-256 encryption at rest (PII, SSN/PAN, bank accounts); TLS 1.3 in transit; SOC 2 Type II & GDPR/DPDP compliance readiness.
- **Performance:** Pay run calculation for 1,000 employees < 15 seconds; Gemini Copilot first-token latency < 1.5 seconds.
- **Auditability:** Immutable audit log capturing every salary edit, pay run approval, bank detail change, and AI tool invocation (who, what, when, before/after values).
- **Scalability:** Multi-tenant architecture with logical tenant isolation and horizontal scaling for peak month-end payroll loads.

---

## 8. High-Level Technical Architecture

- **Frontend:** Next.js / React + TypeScript + Tailwind CSS (Admin Dashboard & Employee Self-Service Portal)
- **Backend / Payroll Engine:** Node.js (NestJS) or Python (FastAPI) with deterministic decimal arithmetic (`Decimal` / `BigNumber`)
- **Database:** PostgreSQL (with Row-Level Security for multi-tenancy) + Redis (queues/caching)
- **AI Layer:** Google Gemini API via Vertex AI (Structured Outputs, Function Calling, Multimodal Input, Embeddings/Vector Search for HR policy RAG)
- **Integrations:**
  - Accounting: Zoho Books, QuickBooks, Xero
  - Attendance/HRMS: Biometric/API webhooks, Slack/Teams notifications
  - Banking/Payments: Stripe Treasury, RazorpayX, ACH/NEFT batch files

---

## 9. Phased Delivery Roadmap

| Phase | Scope | Target Timeline |
| :--- | :--- | :--- |
| **Phase 1: Core Payroll MVP** | Org setup, employee master, salary builder, deterministic pay run, PDF payslips, RBAC | Weeks 1–8 |
| **Phase 2: Gemini AI Layer** | Multimodal onboarding, receipt OCR, pre-run anomaly auditor, Employee Copilot | Weeks 9–14 |
| **Phase 3: Ecosystem & Scale** | Accounting GL sync, direct bank payouts, Slack/Teams bot, multi-region tax packs | Weeks 15–20 |
