# 02 — User Stories

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.0  

---

## Epic 1: Multi-Tenant & Global Administration (`super_admin`)
- **US-101:** As a **Super App Admin**, I want to view all onboarded firms, their active employee counts, and total disbursed payroll normalized in **USD**, so I can monitor global platform volume.
  - *Acceptance Criteria:* `GET /api/super-admin/overview` returns firm-level native totals and a single `totalUsdVolume` computed via `currencies.rate_to_usd`.
- **US-102:** As a **Super App Admin**, I want to onboard a new firm with its country, base currency, statutory ID, and initial Firm Admin account, so new tenants can start using PayPulse AI immediately.
  - *Acceptance Criteria:* `POST /api/super-admin/firms` creates both the `firms` row and the `firm_admin` user in `users`.
- **US-103:** As a **Super App Admin**, I want to suspend or reactivate a firm, so I can enforce billing or compliance holds.

## Epic 2: Firm Administration & Payroll Processing (`firm_admin`)
- **US-201:** As a **Firm Admin**, I want to add employees and managers using either a form or Gemini offer-letter text extraction, so onboarding is fast and error-free.
- **US-202:** As a **Firm Admin**, I want to run monthly/bi-weekly payroll for my firm with automatic country-specific statutory and tax calculations, so paychecks are accurate.
  - *Acceptance Criteria:* India applies EPF (12%) + TDS; USA applies FICA (7.65%) + Federal; UK applies NI (12%) + PAYE.
- **US-203:** As a **Firm Admin**, I want Gemini to audit the draft payroll run before I approve it, so I catch anomalies like LOP deductions or >10% net pay shifts.
- **US-204:** As a **Firm Admin**, I want an immutable audit log of employee additions and payroll state transitions (`review → approved → disbursed`), so my firm is audit-ready.

## Epic 3: Manager Self-Service (`manager`)
- **US-301:** As a **Manager**, I want to see only my direct reports and their pending leave/reimbursement requests, so I can approve my team's requests without seeing other teams' data.
- **US-302:** As a **Manager**, I want to see Gemini's automated expense policy check on each claim before I approve it.

## Epic 4: Employee Self-Service (`employee`)
- **US-401:** As an **Employee**, I want to view my itemized payslips showing gross pay, statutory deductions, income tax, and net take-home pay in my firm's currency.
- **US-402:** As an **Employee**, I want to submit expense claims in any supported currency (USD, INR, GBP, AED, SGD) and have Gemini auto-fill the form from my receipt text.
- **US-403:** As an **Employee**, I want to apply for leave and ask the Gemini Copilot questions about my payslip or pending requests.
