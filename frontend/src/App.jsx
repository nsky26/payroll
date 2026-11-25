import React, { useEffect, useState } from 'react';
import { Sparkles, LogOut, Building2, Settings, Key, ChevronDown } from 'lucide-react';
import { apiFetch, clearAuth, getStoredUser } from './api';
import LoginPage from './components/LoginPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import FirmAdminDashboard from './components/FirmAdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import CopilotDrawer from './components/CopilotDrawer';
import SettingsApiKeysModal from './components/SettingsApiKeysModal';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [inspectingFirm, setInspectingFirm] = useState(null);
  const [helpMap, setHelpMap] = useState({});
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  async function loadHelp() {
    try {
      const res = await apiFetch('/help');
      setHelpMap(res.helpMap || {});
    } catch {
      // Ignore if unauthenticated
    }
  }

  useEffect(() => {
    if (user) loadHelp();
  }, [user?.id]);

  function handleLogout() {
    clearAuth();
    setInspectingFirm(null);
    setUser(null);
  }

  function handleInspectFirm(firm) {
    localStorage.setItem('paypulse_firm_id', String(firm.id));
    setInspectingFirm(firm);
  }

  function handleBackToSuper() {
    localStorage.removeItem('paypulse_firm_id');
    setInspectingFirm(null);
  }

  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">PayPulse AI</span>
              <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{inspectingFirm ? `Inspecting: ${inspectingFirm.name}` : user.firm_name || 'Global Platform'}</span>
              <span>•</span>
              <span className="text-slate-200">{user.full_name}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setSettingsMenuOpen((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" /> Settings <ChevronDown className="w-3 h-3" />
              </button>
              {settingsMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                  <button
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setApiKeysOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-indigo-400" /> API Keys & LLM Routing
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {user.role === 'super_admin' && !inspectingFirm && (
          <SuperAdminDashboard user={user} helpMap={helpMap} onHelpUpdated={loadHelp} onInspectFirm={handleInspectFirm} />
        )}
        {(user.role === 'firm_admin' || (user.role === 'super_admin' && inspectingFirm)) && (
          <FirmAdminDashboard
            user={user}
            helpMap={helpMap}
            onHelpUpdated={loadHelp}
            inspectingFirm={inspectingFirm}
            onBackToSuper={user.role === 'super_admin' ? handleBackToSuper : null}
          />
        )}
        {user.role === 'manager' && <ManagerDashboard user={user} helpMap={helpMap} onHelpUpdated={loadHelp} />}
        {user.role === 'employee' && <EmployeeDashboard user={user} helpMap={helpMap} onHelpUpdated={loadHelp} />}
      </main>

      <CopilotDrawer user={user} />
      <SettingsApiKeysModal open={apiKeysOpen} onClose={() => setApiKeysOpen(false)} user={user} helpMap={helpMap} onHelpUpdated={loadHelp} />
    </div>
  );
}
