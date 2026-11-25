# 08 — Test Cases

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.0  

---

| ID | Category | Test Case | Steps / Input | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Auth & RBAC | Valid login for all 4 roles | `POST /api/auth/login` with `super@paypulse.ai`, `admin@apexindia.com`, `manager@apexindia.com`, `dev@apexindia.com` (`Demo@123`) | HTTP 200, valid JWT & matching `role` and `firm_id` |
| **TC-02** | Auth & RBAC | Invalid password rejection | `POST /api/auth/login` with wrong password | HTTP 401 `Invalid credentials` |
| **TC-03** | Tenant Isolation | Firm Admin cannot access Super Admin console | Call `GET /api/super-admin/overview` with `firm_admin` JWT | HTTP 403 `Forbidden: insufficient role permissions` |
| **TC-04** | Tenant Isolation | Firm Admin cannot inspect another firm via `X-Firm-Id` | `admin@apexindia.com` sends `X-Firm-Id: 2` to `GET /api/firm/dashboard` | `resolveFirmId()` ignores header and returns Firm 1 (`Apex FinTech India`) only |
| **TC-05** | Multi-Firm Super Admin | Super Admin provisions UAE firm | `POST /api/super-admin/firms` with `country_code: 'AE'`, `base_currency: 'AED'` | HTTP 201, new firm + `firm_admin` created, `FIRM_CREATED` logged |
| **TC-06** | Multi-Country Payroll | Run payroll for India firm (`INR`) | `POST /api/payroll/run` (`pay_period: '2026-11'`) as `admin@apexindia.com` | Calculates 12% EPF, 10% (or 8% old_regime) TDS, includes approved reimbursements, generates Gemini audit summary |
| **TC-07** | Multi-Country Payroll | Run payroll for USA firm (`USD`) | `POST /api/payroll/run` as `admin@novacloud.us` | Calculates 7.65% FICA, 18% (or 15% W4-Married) Federal tax in `USD` |
| **TC-08** | Multi-Currency Claim | Employee submits USD expense in INR firm | `dev@apexindia.com` submits `150 USD` claim | `converted_base_amount` computed as `12605.04 INR` using `rate_to_usd` |
| **TC-09** | Manager Workflow | Manager approves direct report leave | `manager@apexindia.com` calls `PATCH /api/operations/leaves/1` (`approved`) | Leave status updates to `approved` |
| **TC-10** | Gemini AI | Parse receipt & query Copilot | `POST /api/ai/parse-document` (`"Uber 45 USD"`) and `POST /api/ai/copilot` | Structured JSON extracted; Copilot answers using only caller's RBAC-scoped data |
