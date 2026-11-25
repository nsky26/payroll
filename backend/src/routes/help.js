import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Get all section help texts
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT section_key, title, help_text, updated_at FROM section_helps');
    const helpMap = Object.fromEntries(rows.map((r) => [r.section_key, r]));
    res.json({ helpMap });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load help texts' });
  }
});

// Admin (super_admin or firm_admin) can update or add more help text for any section
router.put('/:sectionKey', requireRole('super_admin', 'firm_admin'), async (req, res) => {
  try {
    const { sectionKey } = req.params;
    const { title, help_text } = req.body;
    if (!help_text || !help_text.trim()) {
      return res.status(400).json({ error: 'help_text is required' });
    }

    await pool.query(
      `INSERT INTO section_helps (section_key, title, help_text, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         help_text = VALUES(help_text),
         updated_by = VALUES(updated_by)`,
      [sectionKey, title || sectionKey, help_text.trim(), req.user.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (firm_id, user_id, action, entity_type, entity_id, details_json)
       VALUES (?, ?, 'HELP_TEXT_UPDATED', 'section_help', ?, ?)`,
      [req.user.firm_id || null, req.user.id, sectionKey, JSON.stringify({ title })]
    );

    res.json({ message: 'Help text saved', section_key: sectionKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save help text' });
  }
});

export default router;
