# 05 — Technical Requirements Document (TRD)

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.1  

---

## 1. Technology Stack
- **Frontend:** React 19, Vite 6, Tailwind CSS v4, Lucide React
- **Backend:** Node.js (v24.x ESM), Express 4, `jsonwebtoken` (JWT 12h expiry), `bcryptjs` (cost 10)
- **Database:** MySQL 8.x (`localhost:3306`, `mysql2/promise` connection pool)
- **AI SDK:** `@google/generative-ai` (`gemini-2.0-flash`) with deterministic fallback when `GEMINI_API_KEY` is unset or unreachable

## 2. System Architecture
```
[React SPA :5173] ──(/api proxy)──▶ [Express API :5000]
                                          ├── Auth & RBAC Middleware (JWT + X-Firm-Id)
                                          ├── Payroll Engine (Deterministic Math + FX)
                                          ├── Gemini AI Service (Audit / Parse / Copilot)
                                          └── MySQL Pool (localhost:3306 / paypulse_ai)
```

## 3. Security & Multi-Tenancy Controls
- **JWT Claims:** `{ id, firm_id, email, full_name, role, country_code, currency_code }`
- **Tenant Resolution (`resolveFirmId`):**
  - `super_admin`: Optional `?firm_id=` or `X-Firm-Id` header to inspect a firm.
  - `firm_admin`, `manager`, `employee`: Strictly locked to `req.user.firm_id` from the signed JWT.
- **Password Storage:** Bcrypt hashed (`password_hash`), never returned in API responses.
- **Auditability:** All firm creation, employee onboarding, payroll generation, and status transitions write to `audit_logs`.

## 4. Non-Functional Requirements
- **Arithmetic Precision:** Fixed-precision rounding (`Math.round((val + Number.EPSILON) * 100) / 100`) and `DECIMAL(14,2)` / `DECIMAL(16,2)` MySQL columns.
- **API Timeout & Resilience:** Gemini calls gracefully degrade to deterministic rule-based parsing/auditing if `GEMINI_API_KEY` is blank or an external API error occurs.
