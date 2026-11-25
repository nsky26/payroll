import React, { useState } from 'react';
import { Sparkles, Send, X, Bot } from 'lucide-react';
import { apiFetch } from '../api';

export default function CopilotDrawer({ user }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hi ${user.full_name}! I'm PayPulse Gemini Copilot (${user.role.replace('_', ' ')} mode). Ask me about payroll, tax rules, approvals, or your payslips.`
    }
  ]);

  async function askCopilot(e) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    const q = question.trim();
    setMessages((m) => [...m, { sender: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const res = await apiFetch('/ai/copilot', {
        method: 'POST',
        body: JSON.stringify({ question: q })
      });
      setMessages((m) => [...m, { sender: 'ai', text: res.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { sender: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/40 text-sm font-medium cursor-pointer transition-transform hover:scale-105"
      >
        <Sparkles className="w-4 h-4" />
        Gemini Copilot
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-sm font-semibold text-white">PayPulse Gemini Copilot</div>
                <div className="text-[11px] text-slate-400">RBAC Scoped • {user.role}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white ml-8'
                    : 'bg-slate-800 text-slate-200 mr-6 border border-slate-700'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-indigo-400 animate-pulse">Gemini is thinking...</div>}
          </div>

          <form onSubmit={askCopilot} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about payroll, tax, or team..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
