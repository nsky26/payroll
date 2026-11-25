# Technical Requirements Document (TRD)
## PayPulse AI — Multi-Tenant, Multi-Country, Multi-Currency Payroll Platform

### 1. Technology Stack
- **Frontend:** React 19, Vite, Tailwind CSS v3/v4, Lucide React
- **Backend:** Node.js (Express.js), JWT Authentication (`jsonwebtoken`), Password Hashing (`bcryptjs`)
- **Database:** MySQL 8.x (`localhost:3306`, driver: `mysql2/promise`)
- **AI Layer:** Google Gemini API (`@google/generative-ai`) with deterministic fallback when `GEMINI_API_KEY` is omitted

### 2. Multi-Tenancy & RBAC Model
| Role | Scope | Capabilities |
| :--- | :--- | :--- |
| `super_admin` | Global (All Firms) | Create/manage firms, configure countries & FX rates, view global USD-normalized metrics, inspect any tenant |
| `firm_admin` | Single Firm (`firm_id`) | Manage firm employees, salary structures, run/approve/disburse payroll, view audit logs, use Admin AI Copilot |
| `manager` | Assigned Team (`manager_id`) | View direct reports, approve/reject team leaves and reimbursements, view team payroll summary |
| `employee` | Self (`user_id`) | View own payslips, submit reimbursements & leaves, query personal AI Copilot |

### 3. Multi-Country & Multi-Currency Design
- Supported Countries & Statutory Profiles:
  - **India (`IN` / `INR`):** PF (12%), Income Tax (TDS)
  - **United States (`US` / `USD`):** FICA (7.65%), Federal Withholding
  - **United Kingdom (`GB` / `GBP`):** National Insurance (12%), PAYE Tax
  - **UAE (`AE` / `AED`):** 0% Income Tax, Pension/End-of-Service accrual
  - **Singapore (`SG` / `SGD`):** CPF (20% employee / 17% employer), Income Tax
- Currencies store `rate_to_usd` so `super_admin` dashboards aggregate multi-currency payrolls into USD accurately, while each firm operates in its native `base_currency`.

### 4. Security & Data Isolation
- Every tenant-scoped API query filters strictly by `req.user.firm_id`.
- Deterministic decimal arithmetic (`Number((val).toFixed(2))` / integer cents) is used for all payroll math; Gemini is strictly isolated to anomaly detection, document extraction, and conversational Q&A.
