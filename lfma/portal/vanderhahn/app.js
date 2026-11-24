/* Perspective CRM (Kyle 2026-11-24): the firm's clean follow-up page for one campaign.
 * Every captured lead, where it came from, and a status the firm sets. Sign-in is the emailed 6-digit code.
 * The page ships with zero data: leads come from GET <hub>/portal/<client>/basic with the session header, and a
 * status save is POST <hub>/portal/<client>/basic/leads/<lead>/status. The session lives in sessionStorage only. */
const body = document.body, hub = body.dataset.hub, client = body.dataset.client, main = document.querySelector('#main');
const KEY = 'perspective-session-' + client;
const RELOAD_SECONDS = 120;
let session = sessionStorage.getItem(KEY) || '', feed = null, error = '', notice = '', email = '', codeSent = false;
let tab = 'leads', filter = 'all', search = '', showTests = false, saving = '', timer = null;
let open = location.hash.startsWith('#lead=') ? decodeURIComponent(location.hash.slice(6)) : '';   // a link can open one lead
const drafts = {};   // lead_uid -> unsaved form values, so a background refresh never wipes what someone is typing

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = v => v == null ? '—' : '$' + Number(v).toLocaleString(undefined, {maximumFractionDigits: 0});
const day = v => { const d = new Date(v); return !v || isNaN(d) ? '—' : d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}); };
const stamp = v => { const d = new Date(v); return !v || isNaN(d) ? '' : d.toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}); };
const words = s => String(s || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const KIND = {screened_inquiry: 'Provider review', quiz_submission: 'Provider review', callback_request: 'Callback request', 'Web lead': 'Web lead', 'Updates signup': 'Updates signup'};
const SOURCE = {facebook: 'Facebook ad', email: 'Welcome email', direct: 'Direct visit', google: 'Google'};
const BADGE = {'New': 'new', 'Contacted': 'blue', 'Consult booked': 'blue', 'Retained': 'ok', 'Not a fit': 'off', 'No response': 'off'};
const safeUrl = u => /^https:\/\//.test(u || '') ? u : '';

async function post(path, payload, auth) {
  const r = await fetch(hub + '/portal/' + client + path, {method: 'POST', cache: 'no-store', credentials: 'omit',
    headers: Object.assign({'Content-Type': 'application/json'}, auth ? {Authorization: 'Bearer ' + session} : {}), body: JSON.stringify(payload)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(typeof j.detail === 'string' ? j.detail : 'That did not work. Try again.'); e.status = r.status; throw e; }
  return j;
}

function signOut(msg) { session = ''; feed = null; open = ''; sessionStorage.removeItem(KEY); error = msg || ''; clearTimeout(timer); render(); }

async function load(quiet) {
  if (!session) return render();
  try {
    const r = await fetch(hub + '/portal/' + client + '/basic', {headers: {Authorization: 'Bearer ' + session}, cache: 'no-store', credentials: 'omit'});
    if (r.status === 401 || r.status === 403) return signOut(r.status === 403 ? 'Sign in with your own email.' : 'Your session ended. Sign in again.');
    if (!r.ok) throw new Error('The workspace could not load. Try Refresh.');
    feed = await r.json(); if (!quiet) error = '';
  } catch (e) { if (!quiet || !feed) error = e.message || 'The workspace could not load.'; }
  render();
  clearTimeout(timer); timer = setTimeout(() => load(true), RELOAD_SECONDS * 1000);
}

function statusBadge(l) {
  const s = l.status.status;
  if (l.status.signed) return `<span class="badge ok">Signed${s && s !== 'Retained' ? ' · ' + esc(s) : ''}</span>`;
  return s ? `<span class="badge ${BADGE[s] || ''}">${esc(s)}</span>` : '<span class="badge new">Needs status</span>';
}
function cameFrom(l) {
  const src = SOURCE[l.source] || words(l.source) || 'Unknown';
  const ad = l.ad.label && l.ad.label !== 'welcome' ? l.ad.label : '';
  return {src, ad, url: safeUrl(l.ad.url)};
}
function title(l) { return l.name ? l.name : (KIND[l.kind] || words(l.kind) || 'Lead'); }

function visible() {
  const q = search.trim().toLowerCase();
  return feed.leads.filter(l => {
    if (l.is_test && !showTests) return false;
    if (filter === 'none' && l.status.status) return false;
    if (filter !== 'all' && filter !== 'none' && l.status.status !== filter) return false;
    if (!q) return true;
    return [l.name, l.organization, l.email, l.phone, l.state, l.role, l.tier, l.kind, l.source, l.ad.label].some(v => String(v || '').toLowerCase().includes(q));
  });
}

function leadCard(l) {
  const c = cameFrom(l), isOpen = open === l.lead_uid, can = feed.viewer.can_edit;
  const d = drafts[l.lead_uid] || {status: l.status.status || '', consult_date: l.status.consult_date || '', signed: l.status.signed, note: l.status.note || ''};
  const sub = [l.organization, words(l.role), l.state].filter(Boolean).join(' · ');
  let h = `<article class="lead${l.is_test ? ' test' : ''}">
    <button class="lead-head" data-open="${esc(l.lead_uid)}" aria-expanded="${isOpen}">
      <span class="who"><b>${esc(title(l))}${l.is_test ? ' <span class="badge">Test</span>' : ''}</b><span>${esc(sub || (feed.viewer.contact ? '' : 'Contact details need more access'))}</span></span>
      <span class="kind"><span class="badge">${esc(KIND[l.kind] || words(l.kind))}</span>${l.tier ? ` <span class="badge blue">Tier ${esc(l.tier)}</span>` : ''}</span>
      <span class="came"><b>${esc(c.src)}</b><span>${esc(c.ad || day(l.first_seen))}${c.ad ? ' · ' + esc(day(l.first_seen)) : ''}</span></span>
      <span>${statusBadge(l)}</span>
    </button>`;
  if (!isOpen) return h + '</article>';
  h += '<div class="lead-body"><section class="contact"><h3>Follow up</h3><dl>';
  if (feed.viewer.contact) {
    h += `<dt>Name</dt><dd>${esc(l.name || '—')}</dd><dt>Organization</dt><dd>${esc(l.organization || '—')}</dd>`;
    h += `<dt>Email</dt><dd>${l.email ? `<a href="mailto:${esc(encodeURI(l.email))}">${esc(l.email)}</a>` : '—'}</dd>`;
    h += `<dt>Phone</dt><dd>${l.phone ? `<a href="tel:${esc(l.phone.replace(/[^+0-9]/g, ''))}">${esc(l.phone)}</a>` : '—'}</dd><dt>State</dt><dd>${esc(l.state || '—')}</dd>`;
  }
  h += `<dt>Role</dt><dd>${esc(words(l.role) || '—')}</dd><dt>Practice type</dt><dd>${esc(l.org_type || '—')}</dd>`;
  h += `<dt>Came in</dt><dd>${esc(stamp(l.first_seen))} · ${esc(KIND[l.kind] || words(l.kind))}${l.tier ? ' · Tier ' + esc(l.tier) : ''}</dd>`;
  h += `<dt>Came from</dt><dd>${esc(c.src)}${c.ad ? ' · ' + (c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.ad)}</a>` : esc(c.ad)) : ''}</dd></dl>`;
  if (feed.viewer.contact && (l.email || l.phone)) {
    h += '<div class="quick">' + (l.phone ? `<a class="btn ghost" href="tel:${esc(l.phone.replace(/[^+0-9]/g, ''))}">Call</a>` : '') +
         (l.email ? `<a class="btn ghost" href="mailto:${esc(encodeURI(l.email))}">Email</a>` : '') + '</div>';
  }
  h += '</section><section class="form"><h3>Status</h3>';
  if (!can) return h + `<p class="muted">${statusBadge(l)} Your access can view leads but not change status.</p></section></div></article>`;
  h += `<form data-lead="${esc(l.lead_uid)}"><div class="row2"><div><label for="st">Where is this lead?</label><select id="st" name="status" required>
      <option value="">Choose a status</option>${feed.statuses.map(s => `<option${d.status === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div><label for="cd">Consult date</label><input id="cd" type="date" name="consult_date" value="${esc(d.consult_date)}"></div></div>
      <label class="check"><input type="checkbox" name="signed"${d.signed ? ' checked' : ''}> Signed as a client</label>
      <label for="nt">Notes (only your firm sees these)</label><textarea id="nt" name="note" maxlength="1000">${esc(d.note)}</textarea>
      <div class="save"><button class="btn" type="submit"${saving === l.lead_uid ? ' disabled' : ''}>${saving === l.lead_uid ? 'Saving…' : 'Save status'}</button>
      <span class="saved">${l.status.at ? 'Last saved ' + esc(stamp(l.status.at)) + (l.status.by ? ' by ' + esc(l.status.by) : '') : 'No status saved yet'}</span></div>
      ${open === l.lead_uid && error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}${open === l.lead_uid && notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}
    </form></section></div></article>`;
  return h;
}

function leadsView() {
  const c = feed.counts, by = c.by_status || {};
  const stats = [['', c.leads, 'Leads'], [' hot', c.no_status, 'Need a status'], ['', by['Contacted'] || 0, 'Contacted'], ['', by['Consult booked'] || 0, 'Consults booked'], [' win', c.signed, 'Signed']];
  const chips = [['all', 'All'], ['none', 'Needs status']].concat(feed.statuses.map(s => [s, s]));
  const list = visible();
  return `<div class="stats">${stats.map(s => `<div class="stat${s[0]}"><b>${esc(s[1])}</b><span>${esc(s[2])}</span></div>`).join('')}</div>
    <div class="bar"><input type="search" id="q" placeholder="Search name, practice, email, state" value="${esc(search)}" aria-label="Search leads">
      <div class="chips">${chips.map(([k, t]) => `<button class="chip" data-filter="${esc(k)}" aria-pressed="${filter === k}">${esc(t)}</button>`).join('')}
      ${c.test_leads ? `<button class="chip" data-tests aria-pressed="${showTests}">Show ${esc(c.test_leads)} test${c.test_leads === 1 ? '' : 's'}</button>` : ''}</div></div>
    ${list.length ? list.map(leadCard).join('') : `<div class="empty">${feed.leads.length ? 'No leads match this view.' : 'No leads yet. New signups and provider reviews appear here within a minute or two.'}</div>`}
    <p class="notes">${Object.values(feed.data_notes || {}).map(esc).join(' ')}</p>`;
}

function marketingView() {
  const m = feed.marketing;
  if (!m) return '<div class="empty">Your access does not include the marketing view.</div>';
  const pct = m.ad_budget ? Math.min(100, Math.round(100 * (m.spend_total || 0) / m.ad_budget)) : 0;
  const cpl = feed.counts.leads && m.spend_total ? money(m.spend_total / feed.counts.leads) : '—';
  const cps = feed.counts.signed && m.spend_total ? money(m.spend_total / feed.counts.signed) : '—';
  const link = a => safeUrl(a.url) ? `<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.label)}</a>` : '';
  return `<div class="cards">
    <div class="card"><h3>Ad budget</h3><div class="kv"><span>Spent so far</span><b>${money(m.spend_total)} of ${money(m.ad_budget)}</b></div>
      <div class="meter"><i data-w="${pct}"></i></div><div class="kv"><span>Left to spend</span><b>${money(m.ad_budget_remaining)}</b></div>
      <div class="kv"><span>Spend read on</span><b>${esc(m.spend_as_of || 'No spend yet')}</b></div></div>
    <div class="card"><h3>What it is producing</h3><div class="kv"><span>Leads</span><b>${esc(feed.counts.leads)}</b></div>
      <div class="kv"><span>Cost per lead</span><b>${cpl}</b></div><div class="kv"><span>Signed</span><b>${esc(feed.counts.signed)}</b></div>
      <div class="kv"><span>Cost per signed client</span><b>${cps}</b></div></div>
    <div class="card"><h3>Invoice</h3><div class="kv"><span>${esc(m.invoices || 'Invoice')}</span><b>${money(m.paid_total)} paid</b></div>
      <div class="kv"><span>Ad budget</span><b>${money(m.ad_budget)}</b></div><div class="kv"><span>Management</span><b>${money(m.fees)}</b></div></div>
    <div class="card"><h3>Ads running for you</h3><div class="links">${m.ads.map(link).join('') || '<span class="muted">No previews filed yet.</span>'}</div></div>
    <div class="card"><h3>Files</h3><div class="links">${m.files.map(link).join('') || '<span class="muted">No files filed yet.</span>'}</div></div>
  </div>`;
}

function signInView() {
  return `<form class="signin" id="login"><h1>Sign in</h1><p>Enter your work email. We email you a 6-digit code. No password.</p>
    <label for="email">Work email</label><input id="email" type="email" name="email" autocomplete="email" required value="${esc(email)}"${codeSent ? ' readonly' : ''}>
    ${codeSent ? '<label for="code">6-digit code</label><input id="code" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>' : ''}
    <div class="save"><button class="btn" type="submit">${codeSent ? 'Open workspace' : 'Email me a code'}</button>${codeSent ? '<button class="btn ghost" type="button" id="resend">Send a new code</button>' : ''}</div>
    ${error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}</form>`;
}

function render() {
  const active = document.activeElement, keep = active && active.id === 'q';
  document.querySelector('#refresh').hidden = document.querySelector('#lock').hidden = !session;
  document.querySelector('#updated').textContent = feed ? 'Updated ' + stamp(feed.generated_at) : '';
  if (!session) { main.innerHTML = signInView(); return; }
  if (!feed) { main.innerHTML = `<div class="empty">${error ? esc(error) : 'Loading…'}</div>`; return; }
  main.innerHTML = `<div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="leads" aria-selected="${tab === 'leads'}">Leads</button>
    <button class="tab" role="tab" data-tab="marketing" aria-selected="${tab === 'marketing'}">Marketing</button></div>` + (tab === 'leads' ? leadsView() : marketingView());
  main.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
  if (keep) { const q = document.querySelector('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}

main.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; error = notice = ''; return render(); }
  if (t.dataset.filter) { filter = t.dataset.filter; return render(); }
  if ('tests' in t.dataset) { showTests = !showTests; return render(); }
  if (t.dataset.open) { open = open === t.dataset.open ? '' : t.dataset.open; error = notice = ''; return render(); }
  if (t.id === 'resend') { try { await post('/login', {email}); notice = 'A new code is on its way.'; error = ''; } catch (err) { error = err.message; notice = ''; } return render(); }
});
main.addEventListener('input', e => {
  if (e.target.id === 'q') { search = e.target.value; return render(); }
  const f = e.target.closest('form[data-lead]');
  if (f) drafts[f.dataset.lead] = {status: f.status.value, consult_date: f.consult_date.value, signed: f.signed.checked, note: f.note.value};
});
main.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'login') {
    email = f.email.value.trim().toLowerCase(); error = notice = '';
    try {
      if (codeSent) { const j = await post('/verify', {email, code: f.code.value.trim()}); session = j.session; sessionStorage.setItem(KEY, session); codeSent = false; return load(); }
      await post('/login', {email}); codeSent = true; notice = 'Check your email for the code.';
    } catch (err) { error = err.message; }
    render(); const c = document.querySelector('#code'); if (c) c.focus();
    return;
  }
  if (f.dataset.lead) {
    const uid = f.dataset.lead, payload = {status: f.status.value, consult_date: f.consult_date.value || null, signed: f.signed.checked, note: f.note.value};
    drafts[uid] = {status: payload.status, consult_date: payload.consult_date || '', signed: payload.signed, note: payload.note};
    saving = uid; error = notice = ''; render();
    try {
      await post('/basic/leads/' + encodeURIComponent(uid) + '/status', payload, true);
      delete drafts[uid]; notice = 'Saved.'; saving = ''; await load(true); notice = 'Saved.'; render();
    } catch (err) { saving = ''; if (err.status === 401) return signOut('Your session ended. Sign in again.'); error = err.message; render(); }
  }
});
document.querySelector('#refresh').addEventListener('click', () => load());
document.querySelector('#lock').addEventListener('click', () => signOut(''));
load();
