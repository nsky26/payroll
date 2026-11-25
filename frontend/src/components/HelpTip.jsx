import React, { useState } from 'react';
import { HelpCircle, X, Pencil, Plus, Check } from 'lucide-react';
import { apiFetch } from '../api';

export default function HelpTip({ sectionKey, defaultTitle, user, helpMap = {}, onHelpUpdated }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const entry = helpMap[sectionKey];
  const title = entry?.title || defaultTitle || sectionKey;
  const helpText = entry?.help_text || 'No help text configured for this section yet.';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'firm_admin';

  function openModal() {
    setEditing(false);
    setAppendMode(false);
    setDraft('');
    setOpen(true);
  }

  function startEdit(isAppend) {
    setAppendMode(isAppend);
    setDraft(isAppend ? '' : helpText);
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const nextText = appendMode ? `${helpText}\n\n• ${draft.trim()}` : draft.trim();
      await apiFetch(`/help/${sectionKey}`, {
        method: 'PUT',
        body: JSON.stringify({ title, help_text: nextText })
      });
      setEditing(false);
      if (onHelpUpdated) await onHelpUpdated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title={`Help: ${title}`}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer align-middle"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-white">{title}</h4>
                  <div className="text-[11px] text-slate-500">Section Key: {sectionKey}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editing ? (
              <div className="space-y-4">
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  {helpText}
                </div>
                {isAdmin && (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(true)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add More Help Text
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit All
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  {appendMode ? 'Add additional help note (appended to existing help):' : 'Edit full section help text:'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Enter clear instructions or policy notes for users..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Help'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
