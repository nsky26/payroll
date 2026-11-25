import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, f.name AS firm_name, f.country_code AS firm_country_code, f.base_currency AS firm_currency
       FROM users u
       LEFT JOIN firms f ON u.firm_id = f.id
       WHERE u.email = ? AND u.status = 'active'`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      firm_id: user.firm_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      country_code: user.country_code,
      currency_code: user.currency_code
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'paypulse_super_secret_jwt_key_change_in_prod', {
      expiresIn: '12h'
    });

    res.json({
      token,
      user: {
        ...payload,
        department: user.department,
        designation: user.designation,
        base_salary: Number(user.base_salary),
        firm_name: user.firm_name,
        firm_country_code: user.firm_country_code,
        firm_currency: user.firm_currency
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.firm_id, u.email, u.full_name, u.role, u.department, u.designation,
              u.country_code, u.currency_code, u.base_salary, u.tax_regime,
              f.name AS firm_name, f.country_code AS firm_country_code, f.base_currency AS firm_currency
       FROM users u
       LEFT JOIN firms f ON u.firm_id = f.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;
