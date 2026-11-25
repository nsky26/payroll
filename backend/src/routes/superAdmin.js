import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireRole('super_admin'));

router.get('/overview', async (req, res) => {
  try {
    const [firms] = await pool.query(`
      SELECT f.*, c.name AS country_name, c.tax_authority, cur.symbol AS currency_symbol, cur.rate_to_usd,
        (SELECT COUNT(*) FROM users u WHERE u.firm_id = f.id AND u.status = 'active') AS employee_count,
        (SELECT COALESCE(SUM(pr.total_net), 0) FROM payroll_runs pr WHERE pr.firm_id = f.id AND pr.status = 'disbursed') AS total_disbursed_native
      FROM firms f
      JOIN countries c ON f.country_code = c.code
      JOIN currencies cur ON f.base_currency = cur.code
      ORDER BY f.id ASC
    `);

    const [countries] = await pool.query(`
      SELECT c.*, cur.symbol, cur.rate_to_usd
      FROM countries c
      JOIN currencies cur ON c.currency_code = cur.code
      ORDER BY c.name ASC
    `);

    const [currencies] = await pool.query('SELECT * FROM currencies ORDER BY code ASC');

    const totalUsdVolume = firms.reduce(
      (sum, f) => sum + Number(f.total_disbursed_native) * Number(f.rate_to_usd),
      0
    );

    const totalEmployees = firms.reduce((sum, f) => sum + Number(f.employee_count), 0);

    res.json({
      metrics: {
        totalFirms: firms.length,
        activeFirms: firms.filter((f) => f.status === 'active').length,
        totalEmployees,
        totalUsdVolume: Math.round(totalUsdVolume * 100) / 100,
        supportedCountries: countries.length,
        supportedCurrencies: currencies.length
      },
      firms,
      countries,
      currencies
    });
  } catch (err) {
    console.error('Super admin overview error:', err);
    res.status(500).json({ error: 'Failed to load super admin overview' });
  }
});

router.post('/firms', async (req, res) => {
  try {
    const { name, country_code, base_currency, statutory_id, pay_schedule, admin_name, admin_email, admin_password } = req.body;
    if (!name || !country_code || !base_currency || !admin_email || !admin_name) {
      return res.status(400).json({ error: 'Firm name, country, currency, and firm admin details are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    const [firmResult] = await pool.query(
      `INSERT INTO firms (name, slug, country_code, base_currency, statutory_id, pay_schedule)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, slug, country_code, base_currency, statutory_id || null, pay_schedule || 'monthly']
    );

    const firmId = firmResult.insertId;
    const pwHash = await bcrypt.hash(admin_password || 'Demo@123', 10);

    await pool.query(
      `INSERT INTO users (firm_id, email, password_hash, full_name, role, department, designation, country_code, currency_code, base_salary)
       VALUES (?, ?, ?, ?, 'firm_admin', 'HR & Payroll', 'Firm Administrator', ?, ?, 0)`,
      [firmId, admin_email.trim().toLowerCase(), pwHash, admin_name, country_code, base_currency]
    );

    await pool.query(
      `INSERT INTO audit_logs (firm_id, user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, 'FIRM_CREATED', 'firm', ?, ?)`,
      [firmId, req.user.id, String(firmId), JSON.stringify({ name, country_code, base_currency })]
    );

    res.status(201).json({ message: 'Firm and Firm Admin created successfully', firm_id: firmId });
  } catch (err) {
    console.error('Create firm error:', err);
    res.status(500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'Admin email or firm slug already exists' : 'Failed to create firm' });
  }
});

router.patch('/firms/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE firms SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Firm status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update firm status' });
  }
});

router.patch('/currencies/:code', async (req, res) => {
  try {
    const { rate_to_usd } = req.body;
    await pool.query('UPDATE currencies SET rate_to_usd = ? WHERE code = ?', [Number(rate_to_usd), req.params.code]);
    res.json({ message: 'Exchange rate updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update currency rate' });
  }
});

export default router;
