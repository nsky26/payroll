import React, { useState } from 'react';
import { Sparkles, Globe2, ShieldCheck, Building2, Users, UserCheck } from 'lucide-react';
import { apiFetch, setAuth } from '../api';

const DEMO_ACCOUNTS = [
  { label: 'Super App Admin', sub: 'Global Multi-Firm', email: 'super@paypulse.ai', role: 'super_admin', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { label: 'Firm Admin (India)', sub: 'Apex FinTech • INR', email: 'admin@apexindia.com', role: 'firm_admin', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { label: 'Firm Admin (USA)', sub: 'NovaCloud Corp • USD', email: 'admin@novacloud.us', role: 'firm_admin', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { label: 'Firm Admin (UK)', sub: 'Thames Digital • GBP', email: 'admin@thamesuk.co.uk', role: 'firm_admin', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { label: 'Manager (India)', sub: 'Engineering Team • INR', email: 'manager@apexindia.com', role: 'manager', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { label: 'Team User (India)', sub: 'Employee Self-Service', email: 'dev@apexindia.com', role: 'employee', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' }
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('super@paypulse.ai');
  const [password, setPassword] = useState('Demo@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setAuth(data.token, data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function quickSelect(acc) {
    setEmail(acc.email);
    setPassword('Demo@123');
    setError('');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Left Brand & Demo Accounts */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Google Gemini • Multi-Tenant Global Payroll
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            PayPulse <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Enterprise multi-firm payroll, statutory compliance, and HR self-service across India (INR), USA (USD), UK (GBP), UAE (AED), and Singapore (SGD).
          </p>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              One-Click Demo Logins (Password: <code className="text-slate-200">Demo@123</code>)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickSelect(acc)}
                  className={`text-left p-3 rounded-xl border transition-all hover:scale-[1.01] ${
                    email === acc.email
                      ? 'bg-slate-800/90 border-indigo-500 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{acc.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${acc.badge}`}>{acc.role}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{acc.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-indigo-400" /> 5 Countries & FX</span>
            <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-emerald-400" /> Multi-Firm Isolation</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-amber-400" /> 4-Tier RBAC</span>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Sign in to workspace</h2>
          <p className="text-xs text-slate-400 mb-6">Select a demo role on the left or enter credentials</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
