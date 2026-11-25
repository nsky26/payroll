const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('paypulse_token');
}

export function setAuth(token, user) {
  localStorage.setItem('paypulse_token', token);
  localStorage.setItem('paypulse_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('paypulse_token');
  localStorage.removeItem('paypulse_user');
  localStorage.removeItem('paypulse_firm_id');
}

export function getStoredUser() {
  const raw = localStorage.getItem('paypulse_user');
  return raw ? JSON.parse(raw) : null;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const activeFirmId = localStorage.getItem('paypulse_firm_id');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeFirmId ? { 'X-Firm-Id': activeFirmId } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function formatMoney(amount, currency = 'USD') {
  const symbols = { USD: '$', INR: '₹', GBP: '£', AED: 'د.إ ', SGD: 'S$' };
  const sym = symbols[currency] || `${currency} `;
  return `${sym}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
