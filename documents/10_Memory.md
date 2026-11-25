# 10 — Project Memory

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Workspace:** `c:\Users\nanne\Downloads\myblock`  

---

## 1. Key Architectural Decisions
- **Stack:** React 19 + Vite 6 + Tailwind CSS v4 (`frontend/`), Node.js v24 + Express 4 (`backend/`), MySQL 8.x (`localhost:3306`, DB: `paypulse_ai`).
- **Multi-Tenancy:** Shared database, `firm_id` row-level isolation enforced by `resolveFirmId()` in `backend/src/middleware/auth.js`. Only `super_admin` can switch firms via `X-Firm-Id`.
- **AI Safety:** All payroll/tax/FX math is deterministic in `backend/src/services/payrollEngine.js`. Gemini (`gemini-2.0-flash`) handles anomaly auditing, document parsing, and RBAC-scoped Q&A in `backend/src/services/geminiService.js`, with a built-in deterministic fallback when `GEMINI_API_KEY` is empty.

## 2. Current Environment & Build State
- **Node.js:** `v24.12.0` | **npm:** `11.6.2`
- **Dependencies:** Installed in both `backend/` (99 packages) and `frontend/` (87 packages).
- **Build Verification:**
  - `frontend`: `vite build` passed (`dist/assets/index-ByQfZ3EM.js`).
  - `backend`: `node --check` passed on `server.js`, `init.js`, `payrollEngine.js`, `geminiService.js`.
- **Local MySQL (`localhost:3306`):** Port 3306 is open and running, but `init.js` returned `ER_ACCESS_DENIED_ERROR` for `root@localhost` with empty password.

## 3. Pending User Configuration (`backend/.env`)
Before running `npm run init-db` and starting servers, `backend/.env` needs:
1. `DB_PASSWORD=<local_mysql_root_password>` (line 5)
2. `GEMINI_API_KEY=<google_ai_studio_key>` (line 8, optional — fallback works without it)
