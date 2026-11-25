import React, { useEffect, useState } from 'react';
import { Key, Plus, CheckCircle2, RotateCcw, Trash2, X, Cpu, Zap } from 'lucide-react';
import { apiFetch } from '../api';
import HelpTip from './HelpTip';

const TASK_LABELS = {
  text: 'Text Generation & Onboarding Extraction',
  image: 'Image / Receipt OCR & Multimodal',
  audit: 'Payroll Anomaly Auditor',
  copilot: 'Conversational Gemini Copilot'
};

export default function SettingsApiKeysModal({ open, onClose, user, helpMap, onHelpUpdated }) {
  const [keys, setKeys] = useState([]);
  const [routing, setRouting] = useState([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    label: '',
    provider: 'gemini',
    model_name: 'gemini-2.0-flash',
    api_key: '',
    task_type: 'all',
    token_limit: 50000,
    priority_order: 4,
    make_active: false
  });

  async function load() {
    const res = await apiFetch('/settings/api-keys');
    setKeys(res.keys || []);
    setRouting(res.routing || []);
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  if (!open) return null;

  async function handleAddKey(e) {
    e.preventDefault();
    setMsg('');
    await apiFetch('/settings/api-keys', { method: 'POST', body: JSON.stringify(form) });
    setForm({ ...form, label: '', api_key: '' });
    setMsg('API key added to pool.');
    load();
  }

  async function activateKey(id) {
    await apiFetch(`/settings/api-keys/${id}/activate`, { method: 'PATCH' });
    setMsg('Active API key switched.');
    load();
  }

  async function resetTokens(id) {
    await apiFetch(`/settings/api-keys/${id}/reset-tokens`, { method: 'PATCH' });
    setMsg('Token counter reset & key re-enabled.');
    load();
  }

  async function deleteKey(id) {
    await apiFetch(`/settings/api-keys/${id}`, { method: 'DELETE' });
    load();
  }

  async function updateRouting(task_type, primary_key_id, auto_failover) {
    await apiFetch('/settings/routing', {
      method: 'PUT',
      body: JSON.stringify({ task_type, primary_key_id: Number(primary_key_id), auto_failover })
    });
    setMsg(`Updated LLM assignment for ${task_type} tasks.`);
    load();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Settings — API Keys & Multi-LLM Task Routing</h3>
            <HelpTip sectionKey="settings_api_keys" defaultTitle="API Keys & Task-Based LLM Routing" user={user} helpMap={helpMap} onHelpUpdated={onHelpUpdated} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {msg && <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs">{msg}</div>}

        {/* Task-to-LLM Routing */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-400" /> Task-Based API Key Assignment & Auto-Failover
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {routing.map((r) => (
              <div key={r.task_type} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="font-medium text-white">{TASK_LABELS[r.task_type] || r.task_type}</div>
                <select
                  value={r.primary_key_id || ''}
                  onChange={(e) => updateRouting(r.task_type, e.target.value, r.auto_failover)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label} ({k.model_name})
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(r.auto_failover)}
                    onChange={(e) => updateRouting(r.task_type, r.primary_key_id, e.target.checked)}
                  />
                  Auto-failover to next available key when tokens are exhausted
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* API Keys Pool */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" /> Configured API Keys Pool ({keys.length})
          </h4>
          <div className="space-y-2">
            {keys.map((k) => {
              const pct = Math.min(100, Math.round((k.tokens_used / Math.max(1, k.token_limit)) * 100));
              return (
                <div key={k.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{k.label}</span>
                      {k.is_active === 1 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">ACTIVE</span>}
                      {k.status === 'exhausted' && <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px]">EXHAUSTED</span>}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {k.provider} • {k.model_name} • Key: <code>{k.api_key_masked}</code> • Priority #{k.priority_order}
                    </div>
                  </div>

                  <div className="w-48 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Tokens: {k.tokens_used.toLocaleString()}</span>
                      <span>/ {k.token_limit.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${pct >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {k.is_active !== 1 && (
                      <button onClick={() => activateKey(k.id)} className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 flex items-center gap-1 cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Make Active
                      </button>
                    )}
                    <button onClick={() => resetTokens(k.id)} title="Reset token counter" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteKey(k.id)} title="Delete key" className="p-1.5 rounded-lg bg-rose-600/15 text-rose-300 hover:bg-rose-600/25 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New API Key */}
        <form onSubmit={handleAddKey} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5"><Plus className="w-4 h-4 text-indigo-400" /> Add New API Key</h4>
          <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
            <input required placeholder="Label (e.g. LLM-4 Gemini Pro)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white" />
            <input required placeholder="API Key (AIza...)" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white" />
            <select value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white">
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-2.0-pro">gemini-2.0-pro</option>
            </select>
            <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white">
              <option value="all">Task: All (Failover Pool)</option>
              <option value="text">Task: Text</option>
              <option value="image">Task: Image / OCR</option>
              <option value="audit">Task: Payroll Audit</option>
              <option value="copilot">Task: Copilot</option>
            </select>
            <input type="number" placeholder="Token Limit" value={form.token_limit} onChange={(e) => setForm({ ...form, token_limit: e.target.value })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white" />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.make_active} onChange={(e) => setForm({ ...form, make_active: e.target.checked })} />
                Make Active
              </label>
              <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer">Add Key</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
