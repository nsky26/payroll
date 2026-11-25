import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2, Sparkles, UserPlus, FileText, ShieldAlert, ArrowLeft } from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import HelpTip from './HelpTip';

export default function FirmAdminDashboard({ user, helpMap, onHelpUpdated, inspectingFirm, onBackToSuper }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('payroll');
  const [payPeriod, setPayPeriod] = useState('2026-11');
  const [msg, setMsg] = useState('');
  const [selectedPayslips, setSelectedPayslips] = useState(null);

  // Employee + Gemini Onboarding state
  const [aiOfferText, setAiOfferText] = useState('');
  const [empForm, setEmpForm] = useState({
    full_name: '',
    email: '',
    role: 'employee',
    department: 'Engineering',
    designation: 'Software Engineer',
    base_salary: '',
    country_code: 'IN',
    currency_code: 'INR'
  });

  async function loadDashboard() {
    const res = await apiFetch('/firm/dashboard');
    setData(res);
    if (res.firm) {
      setEmpForm((f) => ({ ...f, country_code: res.firm.country_code, currency_code: res.firm.base_currency }));
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [inspectingFirm?.id]);

  async function handleRunPayroll() {
    setMsg('');
    try {
      const res = await apiFetch('/payroll/run', { method: 'POST', body: JSON.stringify({ pay_period: payPeriod }) });
      setMsg(res.anomaly_summary);
      loadDashboard();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function updateRunStatus(runId, status) {
    await apiFetch(`/payroll/${runId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    loadDashboard();
  }

  async function viewPayslips(runId) {
    const res = await apiFetch(`/payroll/${runId}/payslips`);
    setSelectedPayslips(res.payslips);
  }

  async function parseOnboardingWithGemini() {
    if (!aiOfferText.trim()) return;
    const res = await apiFetch('/ai/parse-document', {
      method: 'POST',
      body: JSON.stringify({ text: aiOfferText, docType: 'onboarding' })
    });
    setEmpForm((f) => ({
      ...f,
      full_name: res.parsed.full_name || f.full_name,
      email: res.parsed.email || f.email,
      department: res.parsed.department || f.department,
      designation: res.parsed.designation || f.designation,
      base_salary: res.parsed.base_salary || f.base_salary,
      currency_code: res.parsed.currency_code || f.currency_code
    }));
    setMsg('Gemini extracted candidate details into the onboarding form.');
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    try {
      await apiFetch('/firm/employees', { method: 'POST', body: JSON.stringify(empForm) });
      setEmpForm({ ...empForm, full_name: '', email: '', base_salary: '' });
      setAiOfferText('');
      setMsg('Employee added to firm payroll.');
      loadDashboard();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function handleReview(type, id, status) {
    await apiFetch(`/operations/${type}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    loadDashboard();
  }

  if (!data) return <div className="p-8 text-slate-400 text-sm">Loading Firm Console...</div>;

  const { firm, employees, payrollRuns, reimbursements, leaves, auditLogs } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBackToSuper && (
            <button onClick={onBackToSuper} className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mb-1 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Super App Admin
            </button>
          )}
          <h2 className="text-2xl font-bold text-white">{firm.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {firm.country_name} ({firm.tax_authority}) • Base Currency: <strong className="text-slate-200">{firm.base_currency}</strong> • Statutory: {firm.statutory_name} ({firm.statutory_rate_pct}%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
          />
          <button onClick={handleRunPayroll} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer">
            <Play className="w-3.5 h-3.5" /> Run Payroll & Gemini Audit
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <div className="flex gap-2">
          {['payroll', 'employees', 'approvals', 'audit'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-medium capitalize cursor-pointer ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t === 'approvals' ? `Approvals (${reimbursements.filter((r) => r.status === 'pending').length + leaves.filter((l) => l.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 pr-1">
          <span>Section Help</span>
          <HelpTip sectionKey={`firm_${tab}`} defaultTitle={`Firm ${tab}`} user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
        </div>
      </div>

      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Employees</th>
                  <th className="px-5 py-3">Gross</th>
                  <th className="px-5 py-3">Deductions</th>
                  <th className="px-5 py-3">Net Pay</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payrollRuns.map((run) => (
                  <React.Fragment key={run.id}>
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-semibold text-white">{run.pay_period}</td>
                      <td className="px-5 py-4 text-slate-300">{run.employee_count}</td>
                      <td className="px-5 py-4 text-slate-300">{formatMoney(run.total_gross, run.currency_code)}</td>
                      <td className="px-5 py-4 text-rose-300">-{formatMoney(run.total_deductions, run.currency_code)}</td>
                      <td className="px-5 py-4 text-emerald-400 font-semibold">{formatMoney(run.total_net, run.currency_code)}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/15 text-indigo-300 capitalize">{run.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button onClick={() => viewPayslips(run.id)} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer">Payslips</button>
                        {run.status === 'review' && (
                          <button onClick={() => updateRunStatus(run.id, 'approved')} className="px-2.5 py-1 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 cursor-pointer">Approve</button>
                        )}
                        {run.status === 'approved' && (
                          <button onClick={() => updateRunStatus(run.id, 'disbursed')} className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 cursor-pointer">Disburse</button>
                        )}
                      </td>
                    </tr>
                    {run.anomaly_summary && (
                      <tr className="bg-slate-950/40">
                        <td colSpan={7} className="px-5 py-2 text-[11px] text-indigo-300">
                          <Sparkles className="w-3 h-3 inline mr-1.5" />
                          {run.anomaly_summary}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {selectedPayslips && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-white">Generated Payslips</h3>
                <button onClick={() => setSelectedPayslips(null)} className="text-xs text-slate-400 hover:text-white cursor-pointer">Close</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedPayslips.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                    <div className="font-semibold text-white">{p.full_name}</div>
                    <div className="text-slate-400">{p.designation} • {p.department}</div>
                    <div className="flex justify-between pt-2 border-t border-slate-800"><span>Gross:</span><span>{formatMoney(p.gross_pay, p.currency_code)}</span></div>
                    <div className="flex justify-between text-rose-300"><span>Statutory + Tax:</span><span>-{formatMoney(Number(p.statutory_deduction) + Number(p.income_tax), p.currency_code)}</span></div>
                    <div className="flex justify-between text-emerald-400 font-bold"><span>Net Pay:</span><span>{formatMoney(p.net_pay, p.currency_code)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'employees' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Base Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-white font-medium">{e.full_name}<div className="text-[11px] text-slate-500">{e.email}</div></td>
                    <td className="px-4 py-3 text-slate-300 capitalize">{e.role}</td>
                    <td className="px-4 py-3 text-slate-300">{e.department}</td>
                    <td className="px-4 py-3 text-emerald-400">{formatMoney(e.base_salary, e.currency_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-indigo-400" /> Add Employee (Gemini Onboarding)</h3>
            <div className="space-y-2">
              <textarea
                rows={3}
                value={aiOfferText}
                onChange={(e) => setAiOfferText(e.target.value)}
                placeholder="Paste offer letter snippet (e.g. 'Name: Rahul Roy, rahul@apexindia.com, Senior Dev, 140000 INR')"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <button type="button" onClick={parseOnboardingWithGemini} className="w-full py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer">
                <Sparkles className="w-3.5 h-3.5" /> Auto-Fill with Gemini
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-2.5 pt-2 border-t border-slate-800">
              <input required placeholder="Full Name" value={empForm.full_name} onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
              <input required type="email" placeholder="Work Email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
              <div className="grid grid-cols-2 gap-2">
                <select value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
                <input required type="number" placeholder="Monthly Salary" value={empForm.base_salary} onChange={(e) => setEmpForm({ ...empForm, base_salary: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
              </div>
              <button type="submit" className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">Save Employee</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Expense Reimbursements</h3>
            {reimbursements.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="font-semibold text-white">{r.title}</span><span className="text-emerald-400">{formatMoney(r.amount, r.currency_code)}</span></div>
                <div className="text-slate-400">{r.full_name} • {r.category} • Converted: {formatMoney(r.converted_base_amount, firm.base_currency)}</div>
                <div className="text-[11px] text-indigo-300">{r.policy_check_status}</div>
                {r.status === 'pending' ? (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleReview('reimbursements', r.id, 'approved')} className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 cursor-pointer">Approve</button>
                    <button onClick={() => handleReview('reimbursements', r.id, 'rejected')} className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-300 cursor-pointer">Reject</button>
                  </div>
                ) : <span className="inline-block text-[11px] text-slate-400 capitalize">Status: {r.status}</span>}
              </div>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Leave Requests</h3>
            {leaves.map((l) => (
              <div key={l.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="font-semibold text-white">{l.full_name} ({l.leave_type})</span><span>{l.days} day(s)</span></div>
                <div className="text-slate-400">{l.start_date?.slice(0, 10)} → {l.end_date?.slice(0, 10)} • {l.reason}</div>
                {l.status === 'pending' ? (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleReview('leaves', l.id, 'approved')} className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 cursor-pointer">Approve</button>
                    <button onClick={() => handleReview('leaves', l.id, 'rejected')} className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-300 cursor-pointer">Reject</button>
                  </div>
                ) : <span className="inline-block text-[11px] text-slate-400 capitalize">Status: {l.status}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-3">Immutable Compliance Audit Log</h3>
          {auditLogs.map((a) => (
            <div key={a.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between">
              <span><strong className="text-indigo-300">{a.action}</strong> by {a.full_name || 'System'} ({a.entity_type} #{a.entity_id})</span>
              <span className="text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
