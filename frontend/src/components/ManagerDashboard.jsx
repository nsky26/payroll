import React, { useEffect, useState } from 'react';
import { Users, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import HelpTip from './HelpTip';

export default function ManagerDashboard({ user, helpMap, onHelpUpdated }) {
  const [data, setData] = useState(null);

  async function load() {
    const res = await apiFetch('/firm/dashboard');
    setData(res);
  }

  useEffect(() => {
    load();
  }, []);

  async function review(type, id, status) {
    await apiFetch(`/operations/${type}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  if (!data) return <div className="p-8 text-slate-400 text-sm">Loading Manager Portal...</div>;

  const { firm, team, reimbursements, leaves } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Manager Portal — {firm.name}</h2>
        <p className="text-xs text-slate-400 mt-1">Manage your direct reports, approve team leave, and review Gemini-checked expense claims</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">My Direct Reports ({team.length})</h3>
          <HelpTip sectionKey="manager_team" defaultTitle="My Direct Reports" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Designation</th>
              <th className="px-5 py-3">Country</th>
              <th className="px-5 py-3">Base Monthly Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {team.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 text-white font-medium">{m.full_name}<div className="text-[11px] text-slate-500">{m.email}</div></td>
                <td className="px-5 py-3 text-slate-300">{m.designation}</td>
                <td className="px-5 py-3 text-slate-300">{m.country_code}</td>
                <td className="px-5 py-3 text-emerald-400">{formatMoney(m.base_salary, m.currency_code)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Team Reimbursements
            <HelpTip sectionKey="manager_reimbursements" defaultTitle="Team Reimbursements" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </h3>
          {reimbursements.map((r) => (
            <div key={r.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="font-semibold text-white">{r.title}</span><span className="text-emerald-400">{formatMoney(r.amount, r.currency_code)}</span></div>
              <div className="text-slate-400">{r.full_name} • {r.category}</div>
              <div className="text-[11px] text-indigo-300 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {r.policy_check_status}</div>
              {r.status === 'pending' ? (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => review('reimbursements', r.id, 'approved')} className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => review('reimbursements', r.id, 'rejected')} className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-300 flex items-center gap-1 cursor-pointer"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                </div>
              ) : <div className="text-[11px] text-slate-400 capitalize">Status: {r.status}</div>}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Team Leave Requests
            <HelpTip sectionKey="manager_leaves" defaultTitle="Team Leave Requests" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </h3>
          {leaves.map((l) => (
            <div key={l.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="font-semibold text-white">{l.full_name}</span><span>{l.leave_type} ({l.days}d)</span></div>
              <div className="text-slate-400">{l.start_date?.slice(0, 10)} → {l.end_date?.slice(0, 10)} • {l.reason}</div>
              {l.status === 'pending' ? (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => review('leaves', l.id, 'approved')} className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 cursor-pointer">Approve</button>
                  <button onClick={() => review('leaves', l.id, 'rejected')} className="px-3 py-1 rounded-lg bg-rose-600/20 text-rose-300 cursor-pointer">Reject</button>
                </div>
              ) : <div className="text-[11px] text-slate-400 capitalize">Status: {l.status}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
