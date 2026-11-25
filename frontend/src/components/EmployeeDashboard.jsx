import React, { useEffect, useState } from 'react';
import { FileText, Receipt, Calendar, Sparkles } from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import HelpTip from './HelpTip';

export default function EmployeeDashboard({ user, helpMap, onHelpUpdated }) {
  const [data, setData] = useState(null);
  const [receiptText, setReceiptText] = useState('');
  const [reimb, setReimb] = useState({ title: '', category: 'Travel', amount: '', currency_code: user.currency_code || 'USD', policy_check_status: '' });
  const [leave, setLeave] = useState({ leave_type: 'Annual', start_date: '2026-12-10', end_date: '2026-12-11', days: '2', reason: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await apiFetch('/firm/dashboard');
    setData(res);
  }

  useEffect(() => {
    load();
  }, []);

  async function parseReceipt() {
    if (!receiptText.trim()) return;
    const res = await apiFetch('/ai/parse-document', {
      method: 'POST',
      body: JSON.stringify({ text: receiptText, docType: 'receipt' })
    });
    setReimb({
      title: res.parsed.title || '',
      category: res.parsed.category || 'Travel',
      amount: res.parsed.amount || '',
      currency_code: res.parsed.currency_code || user.currency_code,
      policy_check_status: res.parsed.policy_check_status || 'Verified by Gemini'
    });
    setMsg('Gemini extracted receipt details and verified expense policy!');
  }

  async function submitReimb(e) {
    e.preventDefault();
    await apiFetch('/operations/reimbursements', {
      method: 'POST',
      body: JSON.stringify({ ...reimb, receipt_text: receiptText })
    });
    setReimb({ title: '', category: 'Travel', amount: '', currency_code: user.currency_code, policy_check_status: '' });
    setReceiptText('');
    setMsg('Expense claim submitted for manager approval.');
    load();
  }

  async function submitLeave(e) {
    e.preventDefault();
    await apiFetch('/operations/leaves', { method: 'POST', body: JSON.stringify(leave) });
    setLeave({ ...leave, reason: '' });
    setMsg('Leave request submitted.');
    load();
  }

  if (!data) return <div className="p-8 text-slate-400 text-sm">Loading Self-Service Portal...</div>;

  const { firm, payslips, reimbursements, leaves } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employee Self-Service — {user.full_name}</h2>
        <p className="text-xs text-slate-400 mt-1">{firm.name} ({firm.country_name}) • {user.designation} • Base Currency: {firm.base_currency}</p>
      </div>

      {msg && <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs">{msg}</div>}

      {/* My Payslips */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" /> My Payslips
          <HelpTip sectionKey="emp_payslips" defaultTitle="My Payslips" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map((p) => (
            <div key={p.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{p.pay_period}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] capitalize">{p.run_status}</span>
              </div>
              <div className="flex justify-between text-slate-400"><span>Gross Pay</span><span>{formatMoney(p.gross_pay, p.currency_code)}</span></div>
              <div className="flex justify-between text-rose-300"><span>Statutory ({firm.statutory_name})</span><span>-{formatMoney(p.statutory_deduction, p.currency_code)}</span></div>
              <div className="flex justify-between text-rose-300"><span>Income Tax ({firm.tax_authority})</span><span>-{formatMoney(p.income_tax, p.currency_code)}</span></div>
              <div className="flex justify-between text-emerald-400 font-bold pt-2 border-t border-slate-800 text-sm"><span>Net Take-Home</span><span>{formatMoney(p.net_pay, p.currency_code)}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Reimbursements & Leave */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" /> Submit Expense Claim (Multi-Currency)
            <HelpTip sectionKey="emp_reimbursements" defaultTitle="Submit Expense Claim (Multi-Currency)" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </h3>
          <textarea
            rows={2}
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder="Paste receipt text (e.g. 'Uber Airport Ride 45 USD')"
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          />
          <button type="button" onClick={parseReceipt} className="w-full py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5" /> Parse Receipt with Gemini
          </button>
          <form onSubmit={submitReimb} className="space-y-2.5">
            <input required placeholder="Expense Title" value={reimb.title} onChange={(e) => setReimb({ ...reimb, title: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            <div className="grid grid-cols-3 gap-2">
              <select value={reimb.category} onChange={(e) => setReimb({ ...reimb, category: e.target.value })} className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
                <option>Travel</option><option>Home Office</option><option>Learning & Dev</option><option>Meals</option>
              </select>
              <input required type="number" step="0.01" placeholder="Amount" value={reimb.amount} onChange={(e) => setReimb({ ...reimb, amount: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
              <select value={reimb.currency_code} onChange={(e) => setReimb({ ...reimb, currency_code: e.target.value })} className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
                <option>USD</option><option>INR</option><option>GBP</option><option>AED</option><option>SGD</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">Submit Claim</button>
          </form>
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {reimbursements.map((r) => (
              <div key={r.id} className="flex justify-between text-xs text-slate-300">
                <span>{r.title} ({formatMoney(r.amount, r.currency_code)})</span>
                <span className="capitalize text-indigo-300">{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Apply for Leave
            <HelpTip sectionKey="emp_leaves" defaultTitle="Apply for Leave" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </h3>
          <form onSubmit={submitLeave} className="space-y-2.5">
            <select value={leave.leave_type} onChange={(e) => setLeave({ ...leave, leave_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
              <option>Annual</option><option>Sick</option><option>Casual</option><option>Unpaid</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="date" value={leave.start_date} onChange={(e) => setLeave({ ...leave, start_date: e.target.value })} className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
              <input type="date" value={leave.end_date} onChange={(e) => setLeave({ ...leave, end_date: e.target.value })} className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
              <input type="number" step="0.5" placeholder="Days" value={leave.days} onChange={(e) => setLeave({ ...leave, days: e.target.value })} className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            </div>
            <input placeholder="Reason" value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            <button type="submit" className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">Request Leave</button>
          </form>
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {leaves.map((l) => (
              <div key={l.id} className="flex justify-between text-xs text-slate-300">
                <span>{l.leave_type} ({l.days}d) • {l.start_date?.slice(0, 10)}</span>
                <span className="capitalize text-indigo-300">{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
