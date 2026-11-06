import { summary } from './model.js';
const HUB = 'https://perspective-s3b8.onrender.com/portal/glassman/';
const $ = id => document.getElementById(id);
let token = '', email = '', generation = 0, pending;
function controls(busy) { document.querySelectorAll('button[type="submit"], #refresh').forEach(b => b.disabled = busy); }
function state(name, message) { $('status').dataset.state = name; $('status').textContent = message; }
function clearSummary() {
  $('summary').hidden = true;
  for (const id of ['production', 'synthetic', 'total', 'freshness', 'limit']) $(id).textContent = '';
}
function reset(message = 'Signed out. Sign in with an approved firm account.') {
  generation++; pending?.abort(); pending = null; controls(false); token = ''; email = ''; clearSummary();
  $('signin').reset(); $('verify').reset(); $('signin').hidden = false; $('verify').hidden = true; $('session').hidden = true;
  state('unauthorized', message);
}
async function request(path, body) {
  pending?.abort(); const controller = new AbortController(); pending = controller;
  const mine = ++generation;
  const timeout = setTimeout(() => controller.abort(), 20000);
  clearSummary(); state('loading', 'Checking secure reporting…');
  controls(true);
  try {
    const response = await fetch(HUB + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' });
    if (mine !== generation) return null;
    const data = await response.json();
    if (mine !== generation) return null;
    if (response.status === 401 || response.status === 403) { reset('Access is unavailable or has expired. Sign in again, or ask Kyle to verify your access.'); return null; }
    if (!response.ok) {
      state(data?.status === 'unconfigured' ? 'unconfigured' : 'error', data?.status === 'unconfigured' ? 'Reporting is not connected yet. Kyle needs to finish activation.' : 'Reporting could not be verified. No numbers are shown. Try again later.'); return null;
    }
    return data;
  } catch {
    if (mine === generation) state('error', 'Reporting could not be reached. No numbers are shown. Try again later.');
    return null;
  } finally {
    clearTimeout(timeout);
    if (mine === generation) { pending = null; controls(false); }
  }
}
async function refresh() {
  if (!token) return;
  const data = await request('reporting-summary'); if (!data) return;
  try {
    const view = summary(data);
    for (const id of ['production', 'synthetic', 'total']) $(id).textContent = view[id].toLocaleString();
    $('freshness').textContent = `Last successful source refresh: ${new Date(view.asOf).toLocaleString()} (${view.asOf}).`;
    $('limit').textContent = view.limited ? `The source limit of ${view.bound} events was reached. These are partial counts, not whole-campaign totals.` : `Source read covers at most ${view.bound} events.`;
    $('summary').hidden = false;
    state(view.stale ? 'stale' : 'ok', view.stale ? 'Stale summary: the source was last refreshed more than 24 hours ago. Counts are historical.' : 'Last saved summary loaded. Source refresh is on demand.');
  } catch { clearSummary(); state('error', 'The summary did not pass its checks. No numbers are shown.'); }
}
$('signin').addEventListener('submit', async event => {
  event.preventDefault(); email = $('email').value.trim().toLowerCase();
  const data = await request('login', { email }); if (!data) return;
  $('signin').hidden = true; $('verify').hidden = false; $('code').focus();
  state('unauthorized', 'If your address is approved, a sign-in code will arrive. Enter it here.');
});
$('verify').addEventListener('submit', async event => {
  event.preventDefault(); const data = await request('verify', { email, code: $('code').value });
  if (!data) return;
  if (typeof data.session !== 'string' || !data.session.startsWith('ps1.')) { state('error', 'Sign-in could not be verified.'); return; }
  token = data.session; email = ''; $('signin').reset(); $('verify').reset(); $('verify').hidden = true; $('session').hidden = false;
  await refresh();
});
$('restart').addEventListener('click', () => reset());
$('signout').addEventListener('click', () => reset());
$('refresh').addEventListener('click', refresh);
setInterval(() => { if (token && !pending && document.visibilityState === 'visible') refresh(); }, 60000);
window.addEventListener('pagehide', () => reset());
