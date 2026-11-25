import express from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

function maskKey(key) {
  if (!key || key.length < 10) return '••••••••';
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

// Get all API keys (masked) and task routing
router.get('/api-keys', async (req, res) => {
  try {
    const [keys] = await pool.query(
      `SELECT id, label, provider, model_name, api_key, task_type, token_limit, tokens_used, priority_order, is_active, status, created_at
       FROM ai_api_keys ORDER BY priority_order ASC, id ASC`
    );
    const [routing] = await pool.query(
      `SELECT r.task_type, r.primary_key_id, r.auto_failover, k.label AS key_label, k.model_name
       FROM ai_task_routing r
       LEFT JOIN ai_api_keys k ON r.primary_key_id = k.id`
    );

    res.json({
      keys: keys.map((k) => ({ ...k, api_key_masked: maskKey(k.api_key), api_key: undefined })),
      routing
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load API keys' });
  }
});

// Add a new API key
router.post('/api-keys', async (req, res) => {
  try {
    const { label, provider, model_name, api_key, task_type, token_limit, priority_order, make_active } = req.body;
    if (!label || !api_key) {
      return res.status(400).json({ error: 'Label and API key are required' });
    }

    if (make_active) {
      await pool.query('UPDATE ai_api_keys SET is_active = 0');
    }

    const [result] = await pool.query(
      `INSERT INTO ai_api_keys (firm_id, label, provider, model_name, api_key, task_type, token_limit, priority_order, is_active, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        req.user.firm_id || null,
        label.trim(),
        provider || 'gemini',
        model_name || 'gemini-2.0-flash',
        api_key.trim(),
        task_type || 'all',
        Number(token_limit || 50000),
        Number(priority_order || 1),
        make_active ? 1 : 0,
        req.user.id
      ]
    );

    res.status(201).json({ message: 'API key added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add API key' });
  }
});

// Make an API key active
router.patch('/api-keys/:id/activate', async (req, res) => {
  try {
    await pool.query('UPDATE ai_api_keys SET is_active = 0');
    await pool.query("UPDATE ai_api_keys SET is_active = 1, status = 'active' WHERE id = ?", [req.params.id]);
    res.json({ message: 'API key activated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to activate API key' });
  }
});

// Reset token usage for testing failover
router.patch('/api-keys/:id/reset-tokens', async (req, res) => {
  try {
    await pool.query("UPDATE ai_api_keys SET tokens_used = 0, status = 'active' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Token counter reset' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset tokens' });
  }
});

// Delete an API key
router.delete('/api-keys/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ai_api_keys WHERE id = ?', [req.params.id]);
    res.json({ message: 'API key deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Update task-to-LLM routing
router.put('/routing', async (req, res) => {
  try {
    const { task_type, primary_key_id, auto_failover } = req.body;
    if (!['text', 'image', 'audit', 'copilot'].includes(task_type)) {
      return res.status(400).json({ error: 'Invalid task_type' });
    }
    await pool.query(
      `INSERT INTO ai_task_routing (task_type, primary_key_id, auto_failover)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE primary_key_id = VALUES(primary_key_id), auto_failover = VALUES(auto_failover)`,
      [task_type, primary_key_id || null, auto_failover ? 1 : 0]
    );
    res.json({ message: `Routing updated for ${task_type}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task routing' });
  }
});

// Get all dropdown values (grouped + raw)
router.get('/dropdowns', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM dropdown_values ORDER BY category ASC, sort_order ASC, id ASC'
    );
    const grouped = {};
    for (const r of rows) {
      if (r.is_active) {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push({ value: r.value, label: r.label });
      }
    }
    res.json({ dropdowns: grouped, raw: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dropdown values' });
  }
});

// Add a dropdown value
router.post('/dropdowns', async (req, res) => {
  try {
    const { category, value, label, sort_order } = req.body;
    if (!category || !value || !label) {
      return res.status(400).json({ error: 'Category, value, and label are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO dropdown_values (category, value, label, sort_order, is_active) VALUES (?, ?, ?, ?, 1)',
      [category.trim(), value.trim(), label.trim(), Number(sort_order || 1)]
    );
    res.status(201).json({ message: 'Dropdown value added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'Value already exists in this category' : 'Failed to add dropdown value' });
  }
});

// Toggle or edit a dropdown value
router.patch('/dropdowns/:id', async (req, res) => {
  try {
    const { label, sort_order, is_active } = req.body;
    await pool.query(
      'UPDATE dropdown_values SET label = COALESCE(?, label), sort_order = COALESCE(?, sort_order), is_active = COALESCE(?, is_active) WHERE id = ?',
      [label ?? null, sort_order ?? null, is_active ?? null, req.params.id]
    );
    res.json({ message: 'Dropdown value updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update dropdown value' });
  }
});

// Delete a dropdown value
router.delete('/dropdowns/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM dropdown_values WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dropdown value deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete dropdown value' });
  }
});

export default router;
