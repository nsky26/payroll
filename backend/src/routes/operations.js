import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, resolveFirmId } from '../middleware/auth.js';
import { convertCurrency } from '../services/payrollEngine.js';

const router = express.Router();

router.use(authenticate);

// Submit Reimbursement
router.post('/reimbursements', async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    const { title, category, amount, currency_code, receipt_text, policy_check_status } = req.body;
    if (!firmId || !title || !amount) {
      return res.status(400).json({ error: 'Title and amount are required' });
    }

    const [[firm]] = await pool.query('SELECT base_currency FROM firms WHERE id = ?', [firmId]);
    const [currencies] = await pool.query('SELECT code, rate_to_usd FROM currencies');
    const rateMap = Object.fromEntries(currencies.map((c) => [c.code, Number(c.rate_to_usd)]));

    const claimCurrency = currency_code || firm.base_currency;
    const convertedBase = convertCurrency(amount, rateMap[claimCurrency], rateMap[firm.base_currency]);

    const [result] = await pool.query(
      `INSERT INTO reimbursements (firm_id, user_id, title, category, amount, currency_code, converted_base_amount, receipt_text, policy_check_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firmId,
        req.user.id,
        title,
        category || 'Travel',
        Number(amount),
        claimCurrency,
        convertedBase,
        receipt_text || '',
        policy_check_status || 'Passed (Gemini Policy Check)'
      ]
    );

    res.status(201).json({ message: 'Reimbursement submitted', id: result.insertId });
  } catch (err) {
    console.error('Reimbursement error:', err);
    res.status(500).json({ error: 'Failed to submit reimbursement' });
  }
});

// Approve / Reject Reimbursement (manager or firm_admin)
router.patch('/reimbursements/:id', requireRole('super_admin', 'firm_admin', 'manager'), async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query(
      'UPDATE reimbursements SET status = ?, reviewed_by = ? WHERE id = ? AND firm_id = ?',
      [status, req.user.id, req.params.id, firmId]
    );
    res.json({ message: `Reimbursement ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reimbursement' });
  }
});

// Submit Leave Request
router.post('/leaves', async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    const { leave_type, start_date, end_date, days, reason } = req.body;
    if (!firmId || !start_date || !end_date || !days) {
      return res.status(400).json({ error: 'Start date, end date, and days are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO leave_requests (firm_id, user_id, leave_type, start_date, end_date, days, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firmId, req.user.id, leave_type || 'Annual', start_date, end_date, Number(days), reason || '']
    );
    res.status(201).json({ message: 'Leave request submitted', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

// Approve / Reject Leave Request
router.patch('/leaves/:id', requireRole('super_admin', 'firm_admin', 'manager'), async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query(
      'UPDATE leave_requests SET status = ?, reviewed_by = ? WHERE id = ? AND firm_id = ?',
      [status, req.user.id, req.params.id, firmId]
    );
    res.json({ message: `Leave request ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

export default router;
