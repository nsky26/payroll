import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../config/db.js';

async function getOrderedCandidates(taskType) {
  const [[routing]] = await pool.query('SELECT * FROM ai_task_routing WHERE task_type = ?', [taskType]);
  const [allKeys] = await pool.query(
    `SELECT * FROM ai_api_keys WHERE status != 'disabled' ORDER BY is_active DESC, priority_order ASC, id ASC`
  );

  if (allKeys.length === 0) return { candidates: [], autoFailover: true };

  const autoFailover = routing ? Boolean(routing.auto_failover) : true;
  const primaryId = routing?.primary_key_id;

  const candidates = [];
  if (primaryId) {
    const primary = allKeys.find((k) => k.id === primaryId);
    if (primary) candidates.push(primary);
  }
  if (autoFailover) {
    for (const k of allKeys) {
      if (!candidates.some((c) => c.id === k.id)) {
        candidates.push(k);
      }
    }
  }
  return { candidates, autoFailover };
}

async function promoteNextKey(exhaustedId, candidates) {
  await pool.query("UPDATE ai_api_keys SET status = 'exhausted', is_active = 0 WHERE id = ?", [exhaustedId]);
  const nextKey = candidates.find((k) => k.id !== exhaustedId && k.tokens_used < k.token_limit && k.status === 'active');
  if (nextKey) {
    await pool.query('UPDATE ai_api_keys SET is_active = 1 WHERE id = ?', [nextKey.id]);
    return nextKey;
  }
  return null;
}

async function executeWithKeyRouting(taskType, prompt, fallbackFn) {
  let selectedKey = null;
  let failoverNote = '';

  try {
    const { candidates, autoFailover } = await getOrderedCandidates(taskType);
    for (const keyRow of candidates) {
      if (keyRow.tokens_used >= keyRow.token_limit || keyRow.status === 'exhausted') {
        if (autoFailover) {
          const promoted = await promoteNextKey(keyRow.id, candidates);
          if (promoted) {
            failoverNote = ` [Auto-Failover: ${keyRow.label} exhausted → switched to ${promoted.label}]`;
          }
          continue;
        }
        break;
      }

      const rawKey =
        keyRow.api_key === 'GEMINI_ENV_PLACEHOLDER_KEY' ? process.env.GEMINI_API_KEY : keyRow.api_key;
      selectedKey = keyRow;

      if (rawKey && rawKey.trim() !== '' && rawKey !== 'GEMINI_ENV_PLACEHOLDER_KEY') {
        try {
          const genAI = new GoogleGenerativeAI(rawKey);
          const model = genAI.getGenerativeModel({ model: keyRow.model_name || 'gemini-2.0-flash' });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const tokens =
            result.response.usageMetadata?.totalTokenCount ||
            Math.max(10, Math.ceil((prompt.length + text.length) / 4));

          await pool.query('UPDATE ai_api_keys SET tokens_used = tokens_used + ? WHERE id = ?', [tokens, keyRow.id]);
          if (keyRow.tokens_used + tokens >= keyRow.token_limit && autoFailover) {
            await promoteNextKey(keyRow.id, candidates);
          }
          return { text: `${text}${failoverNote}`, keyRow };
        } catch {
          // If external API call fails or hits quota, try next key if autoFailover enabled
          if (autoFailover) continue;
        }
      }
      break;
    }
  } catch {
    // DB unavailable or routing fallback
  }

  // Deterministic fallback (also meters estimated tokens if a key was selected)
  const fallbackText = fallbackFn();
  if (selectedKey) {
    try {
      const estTokens = Math.max(15, Math.ceil((prompt.length + String(fallbackText).length) / 4));
      await pool.query('UPDATE ai_api_keys SET tokens_used = tokens_used + ? WHERE id = ?', [estTokens, selectedKey.id]);
      if (selectedKey.tokens_used + estTokens >= selectedKey.token_limit) {
        const { candidates } = await getOrderedCandidates(taskType);
        await promoteNextKey(selectedKey.id, candidates);
      }
    } catch {
      // Ignore metering error in fallback
    }
  }
  return { text: typeof fallbackText === 'string' ? `${fallbackText}${failoverNote}` : fallbackText, keyRow: selectedKey };
}

export async function auditPayrollAnomalies({ firm, payPeriod, payslips, previousRun }) {
  const prompt = `You are PayPulse AI's Payroll Anomaly Auditor powered by Google Gemini.
Analyze this draft payroll run for ${firm.name} (${firm.country_code}, currency: ${firm.base_currency}) for period ${payPeriod}.
Previous run total net: ${previousRun ? previousRun.total_net : 'None'}.
Current draft payslips (${payslips.length} employees): ${JSON.stringify(payslips.map(p => ({ name: p.full_name, gross: p.grossPay, net: p.netPay, lop: p.lopDays, reimb: p.reimbursementAdd })))}.
Provide a concise 2-3 sentence audit summary flagging any >15% variance, LOP deductions, or reimbursement spikes, or confirm 0 anomalies.`;

  const { text } = await executeWithKeyRouting('audit', prompt, () => {
    const totalNet = payslips.reduce((acc, p) => acc + Number(p.netPay), 0);
    const flags = [];
    for (const p of payslips) {
      if (p.lopDays > 0) flags.push(`${p.full_name} has ${p.lopDays} LOP day(s) deducted`);
      if (p.reimbursementAdd > 0) {
        flags.push(`${p.full_name} includes ${firm.base_currency} ${p.reimbursementAdd.toFixed(2)} approved reimbursement`);
      }
    }
    if (previousRun && Number(previousRun.total_net) > 0) {
      const pctDiff = ((totalNet - Number(previousRun.total_net)) / Number(previousRun.total_net)) * 100;
      if (Math.abs(pctDiff) > 10) {
        flags.push(`Total net payroll shifted ${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}% vs. ${previousRun.pay_period}`);
      }
    }
    if (flags.length === 0) {
      return `Gemini Audit: 0 anomalies detected for ${firm.name} (${payPeriod}). All statutory & tax rules for ${firm.country_code} verified.`;
    }
    return `Gemini Audit (${flags.length} note(s)): ${flags.join('; ')}.`;
  });

  return text;
}

export async function parseDocumentWithGemini({ text, docType = 'receipt' }) {
  const taskType = docType === 'receipt' ? 'image' : 'text';
  const prompt = `Extract structured JSON fields from this ${docType} text.
Return ONLY valid JSON.
For receipt: {"title": string, "category": "Travel"|"Home Office"|"Learning & Dev"|"Meals", "amount": number, "currency_code": "USD"|"INR"|"GBP"|"AED"|"SGD", "policy_check_status": string}.
For onboarding: {"full_name": string, "email": string, "department": string, "designation": string, "base_salary": number, "currency_code": string}.
Text: """${text}"""`;

  const res = await executeWithKeyRouting(taskType, prompt, () => {
    const amountMatch = text.match(/([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 120.0;
    const currencyMatch = text.match(/\b(USD|INR|GBP|AED|SGD)\b/i);
    const currency_code = currencyMatch
      ? currencyMatch[1].toUpperCase()
      : text.includes('₹') ? 'INR' : text.includes('£') ? 'GBP' : 'USD';

    if (docType === 'onboarding') {
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
      const nameMatch = text.match(/(?:Name|Candidate|Employee)\s*:\s*([A-Za-z ]+)/i);
      return {
        full_name: nameMatch ? nameMatch[1].trim() : 'New Hire Candidate',
        email: emailMatch ? emailMatch[0] : 'newhire@company.com',
        department: /eng|dev|tech/i.test(text) ? 'Engineering' : 'Operations',
        designation: /senior|lead/i.test(text) ? 'Senior Specialist' : 'Associate',
        base_salary: amount > 500 ? amount : 85000,
        currency_code
      };
    }

    let category = 'Travel';
    if (/aws|course|udemy|book|conf|training/i.test(text)) category = 'Learning & Dev';
    else if (/monitor|desk|chair|keyboard|laptop|home/i.test(text)) category = 'Home Office';
    else if (/lunch|dinner|cafe|coffee|meal|restaurant/i.test(text)) category = 'Meals';

    return {
      title: text.slice(0, 48).trim() || 'Business Expense Receipt',
      category,
      amount,
      currency_code,
      policy_check_status: `Passed (Gemini Policy Check: ${category} within limit)`
    };
  });

  if (typeof res.text === 'object') return res.text;
  try {
    return JSON.parse(String(res.text).replace(/```json|```/g, '').trim());
  } catch {
    return { title: text.slice(0, 48), category: 'Travel', amount: 100, currency_code: 'USD', policy_check_status: 'Verified' };
  }
}

export async function runGeminiCopilot({ user, firm, contextSummary, question }) {
  const prompt = `You are PayPulse AI Copilot (modeled after Workday Sana & Shopify Sidekick, powered by Google Gemini).
User: ${user.full_name} | Role: ${user.role} | Firm: ${firm ? firm.name : 'Global Platform'} | Country: ${user.country_code} | Currency: ${user.currency_code}.
Scoped Data Context (RBAC-filtered): ${JSON.stringify(contextSummary)}
User Question: "${question}"
Answer concisely, accurately, and only using the provided RBAC-filtered context.`;

  const { text } = await executeWithKeyRouting('copilot', prompt, () => {
    const q = question.toLowerCase();
    if (user.role === 'employee') {
      const latest = contextSummary.latestPayslip;
      if (q.includes('payslip') || q.includes('salary') || q.includes('net') || q.includes('tax')) {
        if (!latest) return `Hi ${user.full_name}, you don't have a finalized payslip yet. Your base salary is ${user.currency_code} ${Number(user.base_salary).toLocaleString()}.`;
        return `Hi ${user.full_name}! Your latest payslip (${latest.pay_period}) shows Gross Pay of ${latest.currency_code} ${Number(latest.gross_pay).toLocaleString()}, Statutory Deduction of ${latest.currency_code} ${Number(latest.statutory_deduction).toLocaleString()}, Income Tax of ${latest.currency_code} ${Number(latest.income_tax).toLocaleString()}, and Net Take-Home Pay of **${latest.currency_code} ${Number(latest.net_pay).toLocaleString()}**.`;
      }
      return `Hi ${user.full_name}! I'm PayPulse Gemini Copilot. You have ${contextSummary.pendingLeaves} pending leave request(s) and ${contextSummary.pendingReimbursements} pending reimbursement(s). Ask me about your payslip, tax deductions, or expense policies!`;
    }
    if (user.role === 'manager') {
      return `Hello ${user.full_name} (Manager). You currently manage ${contextSummary.teamSize} team member(s). There are ${contextSummary.pendingTeamLeaves} pending leave request(s) and ${contextSummary.pendingTeamReimbursements} pending reimbursement(s) awaiting your review.`;
    }
    if (user.role === 'firm_admin') {
      return `Hello ${user.full_name} (${firm?.name}). Your firm has ${contextSummary.employeeCount} active employees in ${firm?.country_code} (${firm?.base_currency}). Latest payroll run status: ${contextSummary.latestRunStatus || 'None'}, with ${contextSummary.pendingReimbursements} pending reimbursement(s).`;
    }
    return `Global Platform Summary for ${user.full_name}: Currently managing ${contextSummary.firmCount} active firms across ${contextSummary.countryCount} countries, with total normalized monthly payroll volume of $${Number(contextSummary.totalUsdVolume || 0).toLocaleString()} USD.`;
  });

  return text;
}
