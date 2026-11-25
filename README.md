# PayPulse AI — Multi-Tenant, Multi-Country, Multi-Currency Payroll Platform

Powered by **React + Vite + Tailwind CSS**, **Node.js + Express**, **MySQL**, and **Google Gemini**.

## Developer Setup (Fresh Computer)

1. **Prerequisites:** Node.js v20+, MySQL 8.x running on `localhost:3306`.
2. **Configure Environment:**
   ```powershell
   copy backend\.env.example backend\.env
   ```
   Edit `backend\.env` with your local `DB_PASSWORD` and `GEMINI_API_KEY`.
3. **Install Dependencies:**
   ```powershell
   npm --prefix backend install
   npm --prefix frontend install
   ```
4. **Initialize & Seed MySQL Database:**
   ```powershell
   npm --prefix backend run init-db
   ```
5. **Run Servers:**
   ```powershell
   # Terminal 1 (Backend: http://localhost:5000)
   npm --prefix backend start

   # Terminal 2 (Frontend: http://localhost:5173)
   npm --prefix frontend run dev
   ```

## Documentation
See the [`documents/`](./documents/00_README_Index.md) folder for Use Cases, User Stories, User Manual (with all role logins), BRD, TRD, TD, DDL, Test Cases, and AI Agents Matrix.
