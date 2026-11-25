import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, requireRole, resolveFirmId } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Reference countries & currencies for all authenticated users
router.get('/reference', async (req, res) => {
  try {
    const [countries] = await pool.query(`
      SELECT c.*, cur.symbol, cur.rate_to_usd
      FROM countries c
      JOIN currencies cur ON c.currency_code = cur.code
    `);
    const [currencies] = await pool.query('SELECT * FROM currencies');
    res.json({ countries, currencies });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reference data' });
  }
});

// Firm dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    if (!firmId) {
      return res.status(400).json({ error: 'Firm context required' });
    }

    const [[firm]] = await pool.query(
      `SELECT f.*, c.name AS country_name, c.statutory_name, c.statutory_rate_pct, c.default_tax_pct, c.tax_authority, cur.symbol AS currency_symbol
       FROM firms f
       JOIN countries c ON f.country_code = c.code
       JOIN currencies cur ON f.base_currency = cur.code
       WHERE f.id = ?`,
      [firmId]
    );

    if (!firm) return res.status(404).json({ error: 'Firm not found' });

    if (req.user.role === 'employee') {
      const [payslips] = await pool.query(
        `SELECT p.*, pr.pay_period, pr.status AS run_status
         FROM payslips p
         JOIN payroll_runs pr ON p.payroll_run_id = pr.id
         WHERE p.firm_id = ? AND p.user_id = ?
         ORDER BY pr.pay_period DESC`,
        [firmId, req.user.id]
      );
      const [reimbursements] = await pool.query(
        'SELECT * FROM reimbursements WHERE firm_id = ? AND user_id = ? ORDER BY created_at DESC',
        [firmId, req.user.id]
      );
      const [leaves] = await pool.query(
        'SELECT * FROM leave_requests WHERE firm_id = ? AND user_id = ? ORDER BY created_at DESC',
        [firmId, req.user.id]
      );
      return res.json({ firm, payslips, reimbursements, leaves });
    }

    if (req.user.role === 'manager') {
      const [team] = await pool.query(
        `SELECT id, full_name, email, department, designation, country_code, currency_code, base_salary, status
         FROM users WHERE firm_id = ? AND manager_id = ?`,
        [firmId, req.user.id]
      );
      const teamIds = team.map((t) => t.id);
      const [reimbursements] = teamIds.length
        ? await pool.query(
            `SELECT r.*, u.full_name FROM reimbursements r JOIN users u ON r.user_id = u.id
             WHERE r.firm_id = ? AND r.user_id IN (?) ORDER BY r.created_at DESC`,
            [firmId, teamIds]
          )
        : [[]];
      const [leaves] = teamIds.length
        ? await pool.query(
            `SELECT l.*, u.full_name FROM leave_requests l JOIN users u ON l.user_id = u.id
             WHERE l.firm_id = ? AND l.user_id IN (?) ORDER BY l.created_at DESC`,
            [firmId, teamIds]
          )
        : [[]];
      return res.json({ firm, team, reimbursements, leaves });
    }

    // firm_admin or super_admin inspecting a firm
    const [employees] = await pool.query(
      `SELECT id, full_name, email, role, manager_id, department, designation, country_code, currency_code, base_salary, tax_regime, status
       FROM users WHERE firm_id = ? ORDER BY id ASC`,
      [firmId]
    );
    const [payrollRuns] = await pool.query(
      'SELECT * FROM payroll_runs WHERE firm_id = ? ORDER BY created_at DESC',
      [firmId]
    );
    const [reimbursements] = await pool.query(
      `SELECT r.*, u.full_name FROM reimbursements r JOIN users u ON r.user_id = u.id
       WHERE r.firm_id = ? ORDER BY r.created_at DESC`,
      [firmId]
    );
    const [leaves] = await pool.query(
      `SELECT l.*, u.full_name FROM leave_requests l JOIN users u ON l.user_id = u.id
       WHERE l.firm_id = ? ORDER BY l.created_at DESC`,
      [firmId]
    );
    const [auditLogs] = await pool.query(
      `SELECT a.*, u.full_name FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
       WHERE a.firm_id = ? ORDER BY a.created_at DESC LIMIT 20`,
      [firmId]
    );

    res.json({ firm, employees, payrollRuns, reimbursements, leaves, auditLogs });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Add employee / manager (firm_admin or super_admin)
router.post('/employees', requireRole('super_admin', 'firm_admin'), async (req, res) => {
  try {
    const firmId = resolveFirmId(req);
    if (!firmId) return res.status(400).json({ error: 'Firm context required' });

    const { full_name, email, role, manager_id, department, designation, country_code, currency_code, base_salary, tax_regime, password } = req.body;
    if (!full_name || !email || !base_salary) {
      return res.status(400).json({ error: 'Full name, email, and base salary are required' });
    }

    const safeRole = ['firm_admin', 'manager', 'employee'].includes(role) ? role : 'employee';
    const pwHash = await bcrypt.hash(password || 'Demo@123', 10);

    const [result] = await pool.query(
      `INSERT INTO users (firm_id, email, password_hash, full_name, role, manager_id, department, designation, country_code, currency_code, base_salary, tax_regime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firmId,
        email.trim().toLowerCase(),
        pwHash,
        full_name,
        safeRole,
        manager_id || null,
        department || 'Engineering',
        designation || 'Team Member',
        country_code || 'US',
        currency_code || 'USD',
        Number(base_salary),
        tax_regime || 'standard'
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (firm_id, user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, 'EMPLOYEE_ADDED', 'user', ?, ?)`,
      [firmId, req.user.id, String(result.insertId), JSON.stringify({ full_name, role: safeRole, base_salary, currency_code })]
    );

    res.status(201).json({ message: 'Employee added successfully', id: result.insertId });
  } catch (err) {
    console.error('Add employee error:', err);
    res.status(500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'Email already exists' : 'Failed to add employee' });
  }
});

export default router;
