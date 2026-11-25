# 03 — User Manual (URLs, Logins & Step-by-Step Guide)

**Project:** PayPulse AI  
**Last Updated:** 2026-11-25 17:48:37 (+05:30)  
**Version:** 1.1  

---

## 1. Application URLs

| Service | Local URL | Purpose |
| :--- | :--- | :--- |
| **Frontend Web App (React + Vite)** | `http://localhost:5173` | Main user interface for all 4 roles |
| **Backend REST API (Node + Express)** | `http://localhost:5000` | API server & MySQL/Gemini integration |
| **Backend Health Check** | `http://localhost:5000/api/health` | Verifies backend server is running |
| **MySQL Database** | `localhost:3306` (DB: `paypulse_ai`) | Multi-tenant relational data store |

---

## 2. Login Details by Role & Firm Level

All seeded demo accounts share the same password: **`Demo@123`**  
*(You can also click any role card on the left side of the Login screen at `http://localhost:5173` to auto-fill credentials.)*

| Access Level | Role Code | Firm / Country / Currency | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Super App Admin** | `super_admin` | Global (All Firms) • `USD` | `super@paypulse.ai` | `Demo@123` |
| **Firm Admin (India)** | `firm_admin` | Apex FinTech India Pvt Ltd • `IN` / `INR` | `admin@apexindia.com` | `Demo@123` |
| **Manager (India)** | `manager` | Apex FinTech India (Engineering) • `INR` | `manager@apexindia.com` | `Demo@123` |
| **Team User / Employee (India)** | `employee` | Apex FinTech India (Backend Eng) • `INR` | `dev@apexindia.com` | `Demo@123` |
| **Team User / Employee 2 (India)** | `employee` | Apex FinTech India (QA Lead) • `INR` | `qa@apexindia.com` | `Demo@123` |
| **Firm Admin (USA)** | `firm_admin` | NovaCloud Corp USA • `US` / `USD` | `admin@novacloud.us` | `Demo@123` |
| **Manager (USA)** | `manager` | NovaCloud Corp USA (Product) • `USD` | `manager@novacloud.us` | `Demo@123` |
| **Team User / Employee (USA)** | `employee` | NovaCloud Corp USA (Frontend Eng) • `USD` | `eng@novacloud.us` | `Demo@123` |
| **Firm Admin (UK)** | `firm_admin` | Thames Digital UK Ltd • `GB` / `GBP` | `admin@thamesuk.co.uk` | `Demo@123` |
| **Team User / Employee (UK)** | `employee` | Thames Digital UK Ltd (Design) • `GBP` | `emp@thamesuk.co.uk` | `Demo@123` |

---

## 3. Role-by-Role Walkthrough

### A. Super App Admin (`super@paypulse.ai`)
1. Sign in to view **Global Multi-Firm Console** (Active Firms, Global Workforce, Normalized USD Disbursed Volume, Supported Countries & FX Rates).
2. Click **Onboard New Firm** to create a new tenant company in any supported country (`IN`, `US`, `GB`, `AE`, `SG`) along with its Firm Admin login.
3. Click **Inspect** on any firm row to switch into that firm's Admin Console, or **Suspend / Activate** to toggle tenant access.

### B. Firm Admin (`admin@apexindia.com` / `admin@novacloud.us` / `admin@thamesuk.co.uk`)
1. **Payroll Tab:** Choose a month (`YYYY-MM`) and click **Run Payroll & Gemini Audit**. Review the Gemini anomaly note, click **Payslips** to inspect individual breakdowns, then click **Approve** → **Disburse**.
2. **Employees Tab:** View active staff, paste offer-letter text into **Add Employee (Gemini Onboarding)** and click **Auto-Fill with Gemini**, then click **Save Employee**.
3. **Approvals Tab:** Approve or reject pending expense reimbursements and leave requests.
4. **Audit Tab:** View immutable compliance events.

### C. Manager (`manager@apexindia.com` / `manager@novacloud.us`)
1. View **My Direct Reports** table.
2. Approve or reject pending **Team Reimbursements** (with Gemini policy check status) and **Team Leave Requests**.

### D. Team User / Employee (`dev@apexindia.com` / `eng@novacloud.us` / `emp@thamesuk.co.uk`)
1. View **My Payslips** with itemized Gross, Statutory, Tax, and Net Take-Home Pay.
2. Under **Submit Expense Claim**, paste receipt text (e.g., `Uber Airport Ride 45 USD`) and click **Parse Receipt with Gemini**, then submit.
3. Under **Apply for Leave**, select leave type, dates, days, and submit.
4. Click **Gemini Copilot** (bottom-right button) at any time to ask questions about your payslips, approvals, or policies.

---

## 4. Section-Level `?` Help System
Every dashboard section displays a **`?`** icon next to its heading:
* **All Users:** Click **`?`** on any section to view pre-filled guidance, policy notes, and instructions stored in MySQL (`section_helps` table).
* **Admins (`super_admin` & `firm_admin`):** Inside any **`?`** help modal, click **Add More Help Text** (appends a bullet note) or **Edit All** to update the help documentation live for all users.
