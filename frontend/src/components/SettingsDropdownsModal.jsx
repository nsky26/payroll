import React, { useEffect, useState } from 'react';
import { ListFilter, Plus, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiFetch } from '../api';
import HelpTip from './HelpTip';

const CATEGORY_OPTIONS = [
  { key: 'expense_category', label: 'Expense Categories' },
  { key: 'leave_type', label: 'Leave Types' },
  { key: 'employee_role', label: 'Employee Roles' },
  { key: 'pay_schedule', label: 'Pay Schedules' },
  { key: 'ai_model', label: 'AI Models' },
  { key: 'ai_task_type', label: 'AI Task Types' }
];

export default function SettingsDropdownsModal({ open, onClose, user, helpMap, onHelpUpdated, onDropdownsUpdated }) {
  const [raw, setRaw] = useState([]);
  const [activeCat, setActiveCat] = useState('expense_category');
  const [form, setForm] = useState({ value: '', label: '', sort_order: 1 });
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await apiFetch('/settings/dropdowns');
    setRaw(res.raw || []);
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  if (!open) return null;

  const filtered = raw.filter((r) => r.category === activeCat);

  async function handleAdd(e) {
    e.preventDefault();
    setMsg('');
    try {
      await apiFetch('/settings/dropdowns', {
        method: 'POST',
        body: JSON.stringify({ category: activeCat, ...form })
      });
      setForm({ value: '', label: '', sort_order: filtered.length + 2 });
      setMsg('Dropdown value added.');
      await load();
      if (onDropdownsUpdated) await onDropdownsUpdated();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function toggleActive(item) {
    await apiFetch(`/settings/dropdowns/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: item.is_active ? 0 : 1 })
    });
    await load();
    if (onDropdownsUpdated) await onDropdownsUpdated();
  }

  async function remove(id) {
    await apiFetch(`/settings/dropdowns/${id}`, { method: 'DELETE' });
    await load();
    if (onDropdownsUpdated) await onDropdownsUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ListFilter className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Settings — Application Dropdown Values</h3>
            <HelpTip sectionKey="settings_dropdowns" defaultTitle="Dropdown Values Manager" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {msg && <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs">{msg}</div>}

        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                activeCat === c.key ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white">{item.label}</span>
                <span className="ml-2 text-slate-500">(value: <code>{item.value}</code> • order: {item.sort_order})</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(item)} className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer">
                  {item.is_active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                  <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                </button>
                <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg bg-rose-600/15 text-rose-300 hover:bg-rose-600/25 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5"><Plus className="w-4 h-4 text-indigo-400" /> Add New Option to {activeCat}</h4>
          <div className="grid sm:grid-cols-4 gap-2.5 text-xs">
            <input required placeholder="Value (e.g. Parental)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white" />
            <input required placeholder="Display Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white" />
            <input type="number" placeholder="Sort Order" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer">Add Option</button>
          </div>
        </form>
      </div>
    </div>
  );
}
