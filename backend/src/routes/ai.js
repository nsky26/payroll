import express from 'express';
import pool from '../config/db.js';
import { authenticate, resolveFirmId } from '../middleware/auth.js';
import { parseDocumentWithGemini, runGeminiCopilot } from '../services/geminiService.js';

const router = express.Router();

router.use(authenticate);

// Gemini Receipt / Onboarding Document Parser
router.post('/parse-document', async (req, res) => {
  try {
    const { text, docType } = req.body;
    if (!text) return res.status(400).json({ error: 'Document text is required' });
    const parsed = await parseDocumentWithGemini({ text, docType: docType || 'receipt' });
    res.json({ parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse document' });
  }
});

// Role-aware Gemini Copilot
router.post('/copilot', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const firmId = resolveFirmId(req);
    let firm = null;
    if (firmId) {
      const [[f]] = await pool.query('SELECT * FROM firms WHERE id = ?', [firmId]);
      firm = f || null;
    }

    let contextSummary = {};

    if (req.user.role === 'super_admin') {
      const [firms] = await pool.query('SELECT f.id, f.name, f.country_code, f.base_currency, cur.rate_to_usd FROM firms f JOIN currencies cur ON f.base_currency = cur.code');
      const [runs] = await pool.query("SELECT pr.total_net, cur.rate_to_usd FROM payroll_runs pr JOIN currencies cur ON pr.currency_code = cur.code WHERE pr.status = 'disbursed'");
      const totalUsdVolume = runs.reduce((s, r) => s + Number(r.total_net) * Number(r.rate_to_usd), 0);
      const [[countryCnt]] = await pool.query('SELECT COUNT(*) AS cnt FROM countries');
      contextSummary = { firmCount: firms.length, countryCount: countryCnt.cnt, totalUsdVolume: Math.round(totalUsdVolume * 100) / 100 };
    } else if (req.user.role === 'firm_admin') {
      const [[empCnt]] = await pool.query("SELECT COUNT(*) AS cnt FROM users WHERE firm_id = ? AND status = 'active'", [firmId]);
      const [runs] = await pool.query('SELECT pay_period, status, total_net FROM payroll_runs WHERE firm_id = ? ORDER BY created_at DESC LIMIT 1', [firmId]);
      const [[reimbCnt]] = await pool.query("SELECT COUNT(*) AS cnt FROM reimbursements WHERE firm_id = ? AND status = 'pending'", [firmId]);
      contextSummary = {
        employeeCount: empCnt.cnt,
        latestRunStatus: runs[0] ? `${runs[0].pay_period} (${runs[0].status})` : 'None',
        pendingReimbursements: reimbCnt.cnt
      };
    } else if (req.user.role === 'manager') {
      const [team] = await pool.query('SELECT id, full_name FROM users WHERE firm_id = ? AND manager_id = ?', [firmId, req.user.id]);
      const teamIds = team.map((t) => t.id);
      let pendingTeamLeaves = 0;
      let pendingTeamReimbursements = 0;
      if (teamIds.length) {
        const [[l]] = await pool.query("SELECT COUNT(*) AS cnt FROM leave_requests WHERE firm_id = ? AND user_id IN (?) AND status = 'pending'", [firmId, teamIds]);
        const [[r]] = await pool.query("SELECT COUNT(*) AS cnt FROM reimbursements WHERE firm_id = ? AND user_id IN (?) AND status = 'pending'", [firmId, teamIds]);
        pendingTeamLeaves = l.cnt;
        pendingTeamReimbursements = r.cnt;
      }
      contextSummary = { teamSize: team.length, pendingTeamLeaves, pendingTeamReimbursements };
    } else {
      const [payslips] = await pool.query(
        `SELECT p.*, pr.pay_period FROM payslips p JOIN payroll_runs pr ON p.payroll_run_id = pr.id
         WHERE p.firm_id = ? AND p.user_id = ? ORDER BY pr.pay_period DESC LIMIT 1`,
        [firmId, req.user.id]
      );
      const [[l]] = await pool.query("SELECT COUNT(*) AS cnt FROM leave_requests WHERE firm_id = ? AND user_id = ? AND status = 'pending'", [firmId, req.user.id]);
      const [[r]] = await pool.query("SELECT COUNT(*) AS cnt FROM reimbursements WHERE firm_id = ? AND user_id = ? AND status = 'pending'", [firmId, req.user.id]);
      contextSummary = { latestPayslip: payslips[0] || null, pendingLeaves: l.cnt, pendingReimbursements: r.cnt };
    }

    const answer = await runGeminiCopilot({ user: req.user, firm, contextSummary, question });
    res.json({ answer });
  } catch (err) {
    console.error('Copilot error:', err);
    res.status(500).json({ error: 'Gemini Copilot failed to respond' });
  }
});

export default router;
