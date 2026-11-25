import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, resolveFirmId } from '../middleware/auth.js';
import { calculateEmployeePayslip, roundMoney } from '../services/payrollEngine.js';
import { auditPayrollAnomalies } from '../services/geminiService.js';

const router = express.Router();

router.use(authenticate);

// Create a draft payroll run for a firm
router.post('/run', requireRole('super_admin', 'firm_admin'), async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    const { pay_period } = req.body;
    if (!firmId || !pay_period) {
      return res.status(400).json({ error: 'Firm context and pay_period (e.g. 2026-11) are required' });
    }

    const [[firm]] = await pool.query('SELECT * FROM firms WHERE id = ?', [firmId]);
    if (!firm) return res.status(404).json({ error: 'Firm not found' });

    const [[country]] = await pool.query('SELECT * FROM countries WHERE code = ?', [firm.country_code]);
    const [currencies] = await pool.query('SELECT * FROM currencies');
    const currencyMap = Object.fromEntries(currencies.map((c) => [c.code, Number(c.rate_to_usd)]));

    const [employees] = await pool.query(
      `SELECT * FROM users WHERE firm_id = ? AND status = 'active' AND base_salary > 0`,
      [firmId]
    );

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No active salaried employees in this firm' });
    }

    // Fetch approved reimbursements not yet paid (simplified: approved reimbursements in firm)
    const [approvedReimbs] = await pool.query(
      `SELECT user_id, SUM(converted_base_amount) AS total_reimb
       FROM reimbursements WHERE firm_id = ? AND status = 'approved' GROUP BY user_id`,
      [firmId]
    );
    const reimbMap = Object.fromEntries(approvedReimbs.map((r) => [r.user_id, Number(r.total_reimb)]));

    const [prevRuns] = await pool.query(
      'SELECT * FROM payroll_runs WHERE firm_id = ? ORDER BY created_at DESC LIMIT 1',
      [firmId]
    );

    const calculatedPayslips = employees.map((emp) => {
      const calc = calculateEmployeePayslip({
        employee: emp,
        country,
        lopDays: 0,
        reimbursementAdd: reimbMap[emp.id] || 0,
        firmCurrencyRate: currencyMap[firm.base_currency],
        empCurrencyRate: currencyMap[emp.currency_code]
      });
      return { user_id: emp.id, full_name: emp.full_name, ...calc };
    });

    const totalGross = roundMoney(calculatedPayslips.reduce((s, p) => s + p.grossPay, 0));
    const totalDeductions = roundMoney(calculatedPayslips.reduce((s, p) => s + p.statutoryDeduction + p.incomeTax, 0));
    const totalNet = roundMoney(calculatedPayslips.reduce((s, p) => s + p.netPay, 0));

    const anomalySummary = await auditPayrollAnomalies({
      firm,
      payPeriod: pay_period,
      payslips: calculatedPayslips,
      previousRun: prevRuns[0] || null
    });

    const [runResult] = await pool.query(
      `INSERT INTO payroll_runs (firm_id, pay_period, currency_code, employee_count, total_gross, total_deductions, total_net, status, anomaly_summary, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'review', ?, ?)`,
      [firmId, pay_period, firm.base_currency, employees.length, totalGross, totalDeductions, totalNet, anomalySummary, req.user.id]
    );

    const runId = runResult.insertId;
    for (const p of calculatedPayslips) {
      await pool.query(
        `INSERT INTO payslips (payroll_run_id, firm_id, user_id, currency_code, gross_pay, statutory_deduction, income_tax, reimbursement_add, lop_days, net_pay, breakdown_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [runId, firmId, p.user_id, firm.base_currency, p.grossPay, p.statutoryDeduction, p.incomeTax, p.reimbursementAdd, p.lopDays, p.netPay, JSON.stringify(p.breakdown)]
      );
    }

    await pool.query(
      `INSERT INTO audit_logs (firm_id, user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, 'PAYROLL_RUN_CREATED', 'payroll_run', ?, ?)`,
      [firmId, req.user.id, String(runId), JSON.stringify({ pay_period, total_net: totalNet, currency: firm.base_currency })]
    );

    res.status(201).json({ message: 'Payroll run generated and audited by Gemini', run_id: runId, anomaly_summary: anomalySummary });
  } catch (err) {
    console.error('Payroll run error:', err);
    res.status(500).json({ error: 'Failed to generate payroll run' });
  }
});

// Approve or Disburse payroll run
router.patch('/:id/status', requireRole('super_admin', 'firm_admin'), async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    const { status } = req.body;
    if (!['approved', 'disbursed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or disbursed' });
    }

    await pool.query(
      `UPDATE payroll_runs SET status = ?, approved_by = ? WHERE id = ? AND firm_id = ?`,
      [status, req.user.id, req.params.id, firmId]
    );

    await pool.query(
      `INSERT INTO audit_logs (firm_id, user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, ?, 'payroll_run', ?, ?)`,
      [firmId, req.user.id, `PAYROLL_${status.toUpperCase()}`, String(req.params.id), JSON.stringify({ status })]
    );

    res.json({ message: `Payroll run marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payroll status' });
  }
});

// Get payslips for a specific payroll run
router.get('/:id/payslips', async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    let query = `SELECT p.*, u.full_name, u.email, u.department, u.designation
                 FROM payslips p JOIN users u ON p.user_id = u.id
                 WHERE p.payroll_run_id = ? AND p.firm_id = ?`;
    const params = [req.params.id, firmId];

    if (req.user.role === 'employee') {
      query += ' AND p.user_id = ?';
      params.push(req.user.id);
    }

    const [payslips] = await pool.query(query, params);
    res.json({ payslips });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payslips' });
  }
});

export default router;
