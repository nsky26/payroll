# 11 — API Reference & Local Deployment Runbook

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.0  

---

## 1. REST API Endpoints (`http://localhost:5000/api`)

All protected routes require header: `Authorization: Bearer <jwt_token>`.  
Super Admin firm inspection uses optional header: `X-Firm-Id: <firm_id>`.

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Server health check |
| `POST` | `/auth/login` | Public | Authenticate & receive JWT |
| `GET` | `/auth/me` | All Auth | Current user profile |
| `GET` | `/super-admin/overview` | `super_admin` | Global USD metrics, firms, countries, FX rates |
| `POST` | `/super-admin/firms` | `super_admin` | Provision new firm + Firm Admin |
| `PATCH` | `/super-admin/firms/:id/status` | `super_admin` | Activate or suspend a firm |
| `PATCH` | `/super-admin/currencies/:code` | `super_admin` | Update `rate_to_usd` |
| `GET` | `/firm/reference` | All Auth | Countries & currencies list |
| `GET` | `/firm/dashboard` | All Auth | Role-scoped dashboard payload |
| `POST` | `/firm/employees` | `super_admin`, `firm_admin` | Add employee or manager |
| `POST` | `/payroll/run` | `super_admin`, `firm_admin` | Generate payroll run + Gemini audit |
| `PATCH` | `/payroll/:id/status` | `super_admin`, `firm_admin` | Approve or disburse payroll run |
| `GET` | `/payroll/:id/payslips` | All Auth | View payslips for a run (employees see own only) |
| `POST` | `/operations/reimbursements` | All Auth | Submit multi-currency expense claim |
| `PATCH` | `/operations/reimbursements/:id` | `super_admin`, `firm_admin`, `manager` | Approve/reject claim |
| `POST` | `/operations/leaves` | All Auth | Submit leave request |
| `PATCH` | `/operations/leaves/:id` | `super_admin`, `firm_admin`, `manager` | Approve/reject leave |
| `POST` | `/ai/parse-document` | All Auth | Gemini receipt or onboarding parser |
| `POST` | `/ai/copilot` | All Auth | RBAC-scoped Gemini Copilot Q&A |

---

## 2. Local Setup & Runbook

1. **Configure `backend/.env`:** Set `DB_PASSWORD` (for MySQL `localhost:3306`) and `GEMINI_API_KEY`.
2. **Initialize Database & Start Backend:**
   ```powershell
   cd c:\Users\nanne\Downloads\myblock\backend
   npm run init-db
   npm start
   ```
3. **Start Frontend:**
   ```powershell
   cd c:\Users\nanne\Downloads\myblock\frontend
   npm run dev
   ```
4. **Open App:** Navigate to `http://localhost:5173`.
