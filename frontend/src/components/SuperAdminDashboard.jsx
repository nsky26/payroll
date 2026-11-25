import React, { useEffect, useState } from 'react';
import { Building2, Globe2, DollarSign, Users, Plus, Eye, RefreshCw } from 'lucide-react';
import { apiFetch, formatMoney } from '../api';
import HelpTip from './HelpTip';

export default function SuperAdminDashboard({ user, helpMap, onHelpUpdated, onInspectFirm }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    country_code: 'AE',
    base_currency: 'AED',
    statutory_id: '',
    pay_schedule: 'monthly',
    admin_name: '',
    admin_email: '',
    admin_password: 'Demo@123'
  });
  const [msg, setMsg] = useState('');

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await apiFetch('/super-admin/overview');
      setData(res);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleCreateFirm(e) {
    e.preventDefault();
    setMsg('');
    try {
      await apiFetch('/super-admin/firms', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ ...form, name: '', statutory_id: '', admin_name: '', admin_email: '' });
      setMsg('New firm & firm admin provisioned successfully.');
      loadOverview();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function toggleStatus(firm) {
    const next = firm.status === 'active' ? 'suspended' : 'active';
    await apiFetch(`/super-admin/firms/${firm.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next })
    });
    loadOverview();
  }

  if (loading || !data) {
    return <div className="p-8 text-slate-400 text-sm">Loading Global Platform Console...</div>;
  }

  const { metrics, firms, countries, currencies } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Super App Admin — Global Multi-Firm Console</h2>
          <p className="text-xs text-slate-400 mt-1">Manage tenant firms, countries, statutory engines, and normalized USD payroll volume</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadOverview} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Onboard New Firm
          </button>
        </div>
      </div>

      {msg && <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">{msg}</div>}

      {/* KPI Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Global Platform KPIs</h3>
          <HelpTip sectionKey="super_kpis" defaultTitle="Global Platform KPIs" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs">Active Firms <Building2 className="w-4 h-4 text-indigo-400" /></div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.activeFirms} / {metrics.totalFirms}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs">Global Workforce <Users className="w-4 h-4 text-emerald-400" /></div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.totalEmployees}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs">Normalized Disbursed (USD) <DollarSign className="w-4 h-4 text-amber-400" /></div>
          <div className="text-2xl font-bold text-white mt-2">{formatMoney(metrics.totalUsdVolume, 'USD')}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs">Countries & Currencies <Globe2 className="w-4 h-4 text-purple-400" /></div>
          <div className="text-2xl font-bold text-white mt-2">{metrics.supportedCountries} / {metrics.supportedCurrencies}</div>
        </div>
      </div>
      </div>

      {/* Create Firm Modal/Panel */}
      {showCreate && (
        <form onSubmit={handleCreateFirm} className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Provision New Tenant Firm & Firm Admin</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required placeholder="Firm Name (e.g. DesertTech LLC)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            <select
              value={form.country_code}
              onChange={(e) => {
                const c = countries.find((x) => x.code === e.target.value);
                setForm({ ...form, country_code: e.target.value, base_currency: c ? c.currency_code : form.base_currency });
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
            <select value={form.base_currency} onChange={(e) => setForm({ ...form, base_currency: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
              {currencies.map((cur) => <option key={cur.code} value={cur.code}>{cur.code} ({cur.symbol})</option>)}
            </select>
            <input placeholder="Statutory Tax ID (e.g. TRN-100291)" value={form.statutory_id} onChange={(e) => setForm({ ...form, statutory_id: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            <input required placeholder="Firm Admin Full Name" value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            <input required type="email" placeholder="Firm Admin Email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-medium text-white cursor-pointer">Create Firm</button>
          </div>
        </form>
      )}

      {/* Firms Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Tenant Firms Directory
            <HelpTip sectionKey="super_firms" defaultTitle="Tenant Firms Directory" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3">Firm</th>
                <th className="px-6 py-3">Country / Authority</th>
                <th className="px-6 py-3">Base Currency</th>
                <th className="px-6 py-3">Employees</th>
                <th className="px-6 py-3">Disbursed (Native)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {firms.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/40">
                  <td className="px-6 py-4 font-medium text-white">
                    {f.name}
                    <div className="text-[11px] text-slate-500">{f.statutory_id || 'No Tax ID'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{f.country_name} <span className="text-slate-500">({f.tax_authority})</span></td>
                  <td className="px-6 py-4 text-slate-300">{f.base_currency} ({f.currency_symbol})</td>
                  <td className="px-6 py-4 text-slate-300">{f.employee_count}</td>
                  <td className="px-6 py-4 text-emerald-400 font-medium">{formatMoney(f.total_disbursed_native, f.base_currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${f.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => onInspectFirm(f)} className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 inline-flex items-center gap-1 cursor-pointer">
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                    <button onClick={() => toggleStatus(f)} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer">
                      {f.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Country Statutory & FX Registry */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Supported Countries, Statutory Rules & FX Rates
            <HelpTip sectionKey="super_countries" defaultTitle="Supported Countries, Statutory Rules & FX Rates" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3">Country</th>
                <th className="px-6 py-3">Currency</th>
                <th className="px-6 py-3">FX Rate (to USD)</th>
                <th className="px-6 py-3">Statutory Fund</th>
                <th className="px-6 py-3">Default Tax %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {countries.map((c) => (
                <tr key={c.code}>
                  <td className="px-6 py-3 text-white font-medium">{c.name} ({c.code})</td>
                  <td className="px-6 py-3 text-slate-300">{c.currency_code} ({c.symbol})</td>
                  <td className="px-6 py-3 text-slate-300">1 {c.currency_code} = ${Number(c.rate_to_usd).toFixed(4)} USD</td>
                  <td className="px-6 py-3 text-slate-300">{c.statutory_name} ({c.statutory_rate_pct}%)</td>
                  <td className="px-6 py-3 text-slate-300">{c.default_tax_pct}% ({c.tax_authority})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
