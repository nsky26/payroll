# 04 — Business Requirements Document (BRD)

**Project:** PayPulse AI (Gemini-Powered Payroll & HR Compliance Platform)  
**Last Updated:** 2026-11-25 17:38:23 (+05:30)  
**Version:** 1.1  
**Reference Benchmark:** Zoho Payroll, Workday (Sana Self-Service Agent powered by Google Gemini), Shopify Sidekick  

---

## 1. Executive Summary
**PayPulse AI** is a multi-tenant, multi-country, multi-currency SaaS payroll and HR compliance platform modeled after **Zoho Payroll** and enhanced with **Google Gemini** for document intelligence, anomaly auditing, and conversational self-service.

## 2. Business Objectives & KPIs
- **Automate Payroll Runs:** Cut monthly/bi-weekly payroll preparation time by 75% with deterministic country-specific tax/statutory rules.
- **Eliminate Manual Data Entry:** Use Gemini document parsing for employee onboarding and expense receipt extraction.
- **Multi-Tenant & Multi-Country Scale:** Support multiple independent firms (`firms`) across India (`INR`), USA (`USD`), UK (`GBP`), UAE (`AED`), and Singapore (`SGD`) with USD-normalized global reporting.
- **Target KPIs:** ≥ 99.95% payroll math accuracy, < 10 min pay run cycle, ≥ 65% employee query deflection via Gemini Copilot.

## 3. Target Personas & Access Tiers
1. **Super App Admin (`super_admin`):** Global multi-firm governance, tenant provisioning, FX & country registry.
2. **Firm Admin (`firm_admin`):** Single-firm payroll runs, employee onboarding, compliance approvals, audit logs.
3. **Manager (`manager`):** Team roster oversight, leave & reimbursement approvals.
4. **Team User / Employee (`employee`):** Payslip access, multi-currency expense claims, leave requests, personal AI Copilot.

## 4. Core Functional Requirements
- **Multi-Tenancy:** Strict firm-level data isolation (`firm_id`) across all queries.
- **Multi-Country & Multi-Currency:** Country-specific statutory funds (EPF, FICA, NI, GPSSA, CPF), tax authorities, and FX conversion (`rate_to_usd`).
- **Payroll Workflow:** `draft → review → approved → disbursed` with Gemini pre-run anomaly detection.
- **AI Safety Rule:** Zero LLM arithmetic for paychecks; all monetary math is deterministic backend code.
