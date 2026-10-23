/* LA County Perspective (Kyle 2026-10-23): every LA County abuse lead Phillips received, one row per person,
 * with Phillips' own Litify outcome and the LA County Sofia pre-qual (age, where, abused, lawyer).
 * Phillips sign-in only (same emailed code as the Phillips portal). The page ships with zero data; everything comes
 * from GET <hub>/portal/plg/basic with the session header. The session lives in sessionStorage only. */
const body = document.body, hub = body.dataset.hub, client = body.dataset.client, main = document.querySelector('#main');
const KEY = 'perspective-session-la-county';
const RELOAD_SECONDS = 120;
let session = sessionStorage.getItem(KEY) || '', feed = null, lastError = '', selected = null, timer = null, email = '', filter = 'all', search = '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = (label, cls = '') => `<span class="badge ${cls}">${esc(label)}</span>`;
const when = v => { if (!v) return '—'; const d = new Date(String(v).replace(' ', 'T').replace(/\+00$/, 'Z')); return isNaN(d) ? esc(v) : d.toLocaleDateString(); };
const FACILITY = {juvenile_hall:'Juvenile hall', probation_camp:'Probation camp', other_juvenile_detention:'Other juvenile detention', foster_care:'Foster care', group_home:'Group home', other_ca_youth_facility:'Other CA youth facility', not_a_facility:'Not a facility', unknown:'Unknown'};
const OUTCOME = {transferred:'Transferred to Phillips', declined_transfer:'Declined transfer', outside_california:'Outside California', not_facility:'Not a facility', no_or_prefer_not:'No / prefer not', has_lawyer:'Has a lawyer', bad_time:'Bad time', wrong_person:'Wrong person', voicemail:'Voicemail', dnc:'Do not contact', transfer_failed:'Transfer failed', incomplete:'Incomplete'};

function litifyBadge(l) {
  const s = l.litify.status;
  if (!s) return badge('Not in Litify', 'neutral');
  if (l.litify.converted) return badge('Signed · Converted', 'ok');
  if (s === 'Turned Down') return badge('Turned down' + (l.litify.reason ? ' · ' + l.litify.reason : ''), 'gray');
  return badge(s, 'neutral');
}
function prequalLine(c) {
  if (!c) return 'No Sofia call yet';
  const p = c.prequal, o = OUTCOME[c.outcome] || c.outcome || (c.transferred ? 'Transferred' : 'No outcome');
  if (!p) return o;
  const bits = [p.current_age != null ? 'Age ' + p.current_age : null, FACILITY[p.facility_type] || null,
    p.abused ? 'Abused: ' + p.abused.replace(/_/g, ' ') : null, p.has_lawyer != null ? (p.has_lawyer ? 'Has lawyer' : 'No lawyer') : null].filter(Boolean);
  return o + (bits.length ? ' · ' + bits.join(' · ') : '');
}
const lastCall = l => l.calls.length ? l.calls[l.calls.length - 1] : null;
const FILTERS = [['all', 'All', () => true], ['signed', 'Signed', l => l.litify.converted], ['down', 'Turned down', l => l.litify.status === 'Turned Down'],
  ['notlit', 'Not in Litify', l => !l.litify.status], ['sofia', 'Sofia called', l => l.calls.length > 0], ['transfer', 'Transferred', l => l.handoff_attempted]];

// ---------- views ----------
function signin() {
  return `<section class="signin"><p class="eyebrow">PHILLIPS LAW GROUP · LA COUNTY</p><h1>Sign in.</h1><p class="note">Approved emails only. A 6-digit code lands in your inbox.</p>
  <form id="login"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" value="${esc(email)}">
  <div id="code-wrap" ${email ? '' : 'hidden'}><label for="code">6-digit code</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"></div>
  <div class="actions" style="margin-top:18px"><button class="button" type="submit">${email ? 'Open LA County' : 'Send my code'}</button>${email ? '<button class="quiet" type="button" id="resend">Send a new code</button>' : ''}</div>
  ${lastError ? `<p class="error">${esc(lastError)}</p>` : ''}</form></section>`;
}
function dashboard() {
  const c = feed.counts, q = search.trim().toLowerCase();
  const [, , test] = FILTERS.find(f => f[0] === filter) || FILTERS[0];
  const leads = feed.leads.filter(test).filter(l => !q || (l.name || '').toLowerCase().includes(q) || (l.phone_last4 || '').includes(q));
  const metrics = [['Leads', c.leads], ['In Litify', c.in_litify], ['Signed', c.converted], ['Turned down', c.turned_down], ['Sofia pre-quals', c.sofia_calls], ['Transferred', c.handoffs_attempted]];
  const reasons = Object.entries(c.turn_down_reasons || {});
  return `<div class="dashboard-intro"><div><p class="eyebrow">LA COUNTY · PHILLIPS LAW GROUP</p><h1>Every LA County lead.<br><em>Phillips' outcome and Sofia's pre-qual.</em></h1>
  <p class="lede">One row per person. Litify status and reason are Phillips' own. Sofia asks four quick questions: age, where it happened, yes or no to abuse, and whether they have a lawyer.</p></div></div>
  <section class="metric-grid" aria-label="Totals">${metrics.map(([l, v]) => `<article class="panel"><b>${esc(v)}</b><span>${esc(l)}</span></article>`).join('')}</section>
  ${reasons.length ? `<section class="panel reasons"><p class="eyebrow">WHY PHILLIPS TURNED LEADS DOWN</p>${reasons.map(([r, n]) => `<div class="reason"><span>${esc(r)}</span><i style="width:${Math.max(4, Math.round(100 * n / reasons[0][1]))}%"></i><b>${esc(n)}</b></div>`).join('')}</section>` : ''}
  <section class="panel"><div class="section-head"><div><p class="eyebrow">LEADS</p><h2>${esc(leads.length)} shown</h2></div>
  <input class="search" id="search" type="search" placeholder="Search name or last 4" value="${esc(search)}" aria-label="Search leads"></div>
  <div class="chips">${FILTERS.map(([k, label]) => `<button class="chip ${filter === k ? 'on' : ''}" data-filter="${k}">${esc(label)}</button>`).join('')}</div>
  ${leads.length ? `<div class="lead-list">${leads.map(l => { const name = l.name || 'Lead'; const lc = lastCall(l);
    return `<button class="lead-row" data-lead="${esc(l.lead_uid)}" aria-label="Open ${esc(name)}"><span><small>${esc(when(l.first_seen))}${l.phone_last4 ? ' · …' + esc(l.phone_last4) : ''}</small><b>${esc(name)}</b><small>${esc(l.channel || 'Sofia call')}</small></span>
      <span><small>Phillips (Litify)</small><b>${litifyBadge(l)}</b></span><span><small>Sofia pre-qual</small><b>${esc(prequalLine(lc))}</b></span></button>`; }).join('')}</div>`
    : '<p class="empty">No leads match.</p>'}</section>
  <p class="note">${esc((feed.data_notes || {}).intake || '')} ${esc((feed.data_notes || {}).sofia || '')}</p>`;
}
function record() {
  const l = feed.leads.find(x => x.lead_uid === selected); if (!l) { selected = null; return dashboard(); }
  return `<div class="section-head"><div><p class="eyebrow">LEAD · FIRST SEEN ${esc(when(l.first_seen))}${l.phone_last4 ? ' · …' + esc(l.phone_last4) : ''}</p><h1>${esc(l.name || 'Lead')}</h1></div>${litifyBadge(l)}</div>
  <div class="perspective-grid"><section class="panel"><h2>Phillips (Litify)</h2>
  ${l.intakes.length ? l.intakes.map(i => `<div class="call-card"><h3>${esc(i.status || 'Not in Litify')}${i.reason ? ' · ' + esc(i.reason) : ''}</h3><p class="note">${esc(i.channel || '')} · ${esc(i.case_type || '')}${i.litify_created ? ' · created ' + esc(i.litify_created) : ''}</p>${i.details ? `<p>${esc(i.details)}</p>` : ''}</div>`).join('') : '<p class="note">No Phillips intake on file.</p>'}
  <h2 style="margin-top:24px">Sofia pre-qual</h2>
  ${l.calls.length ? l.calls.map(c => `<div class="call-card"><h3>${esc(OUTCOME[c.outcome] || c.outcome || 'No outcome')} · ${esc(when(c.at))}</h3><p class="note">${c.seconds != null ? esc(c.seconds) + 's · ' : ''}${c.transferred ? 'Transferred to Phillips' : 'Not transferred'}</p>
    ${c.prequal ? `<div class="answers">${[['Age now', c.prequal.current_age], ['Where', FACILITY[c.prequal.facility_type] || c.prequal.facility_type], ['Facility name', c.prequal.facility_name], ['City or county', c.prequal.city_or_county], ['In California', c.prequal.in_california == null ? null : (c.prequal.in_california ? 'Yes' : 'No')], ['Abused there', c.prequal.abused], ['Has a lawyer', c.prequal.has_lawyer == null ? null : (c.prequal.has_lawyer ? 'Yes' : 'No')], ['Safe callback time', c.prequal.safe_callback_time]].filter(([, v]) => v != null && v !== '').map(([k, v]) => `<div class="answer-row"><span>${esc(k)}</span><b>${esc(String(v).replace(/_/g, ' '))}</b></div>`).join('')}</div>` : '<p class="note">Answers are not included for your access level.</p>'}
    ${c.has_recording ? `<button class="button secondary" data-play="${esc(l.lead_uid)}:${c.index}">Play the recording</button><div id="audio-${c.index}"></div>` : ''}</div>`).join('') : '<p class="note">Sofia hasn\'t called this lead yet.</p>'}
  </section></div>
  <div class="actions"><button class="button secondary" id="back">Back to all leads</button></div>`;
}

// ---------- data ----------
async function load() {
  if (!session) { feed = null; return render(); }
  try {
    const r = await fetch(hub + '/portal/' + client + '/basic', { headers: { Authorization: 'Bearer ' + session }, cache: 'no-store', credentials: 'omit' });
    if (r.status === 401 || r.status === 403) { session = ''; sessionStorage.removeItem(KEY); lastError = r.status === 403 ? 'Sign in with your own email.' : 'Your session ended. Sign in again.'; feed = null; return render(); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Portal data unavailable');
    feed = await r.json(); lastError = '';
  } catch (e) { lastError = e.message || 'Could not load'; }
  render();
}
function render() {
  const signed = !!session;
  document.querySelector('#refresh').hidden = !signed; document.querySelector('#lock').hidden = !signed;
  document.querySelector('#banner-status').textContent = feed ? 'Last updated ' + new Date(feed.generated_at).toLocaleString() : (signed ? (lastError || 'Loading…') : 'Sign in');
  document.querySelector('#footer-updated').textContent = feed ? 'Last updated ' + new Date(feed.generated_at).toLocaleString() : '';
  main.innerHTML = !signed ? signin() : !feed ? `<p class="empty">${esc(lastError || 'Loading…')}</p>` : selected ? record() : dashboard();
  if (signed && !timer) timer = setInterval(load, RELOAD_SECONDS * 1000);
}
async function post(path, data) {
  const r = await fetch(hub + '/portal/' + client + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store', credentials: 'omit' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || 'Request failed');
  return j;
}
main.addEventListener('submit', async e => {
  const f = e.target; if (f.id !== 'login') return; e.preventDefault();
  email = f.elements.email.value.trim().toLowerCase(); const code = (f.elements.code?.value || '').replace(/\D/g, '');
  try {
    if (code.length === 6) { const j = await post('/verify', { email, code }); session = j.session; sessionStorage.setItem(KEY, session); lastError = ''; await load(); }
    else { await post('/login', { email }); lastError = ''; render(); document.querySelector('#code')?.focus(); }
  } catch (err) { lastError = err.message; render(); }
});
main.addEventListener('input', e => {
  if (e.target.id !== 'search') return; search = e.target.value; const pos = e.target.selectionStart; render();
  const s = document.querySelector('#search'); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
});
main.addEventListener('click', async e => {
  const t = e.target.closest('button, a'); if (!t) return;
  if (t.id === 'resend') { try { await post('/login', { email }); lastError = 'A new code was sent.'; } catch (err) { lastError = err.message; } return render(); }
  if (t.id === 'back') { selected = null; return render(); }
  if (t.dataset.filter) { filter = t.dataset.filter; return render(); }
  if (t.dataset.lead) { selected = t.dataset.lead; render(); window.scrollTo({ top: 0 }); return; }
  if (t.dataset.play) {
    const [uid, idx] = t.dataset.play.split(':'); t.disabled = true; t.textContent = 'Loading recording…';
    try {
      const r = await fetch(hub + '/portal/' + client + '/basic/recordings/' + encodeURIComponent(uid) + '/' + idx, { headers: { Authorization: 'Bearer ' + session }, cache: 'no-store', credentials: 'omit' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Recording unavailable');
      const url = URL.createObjectURL(await r.blob()); const a = document.createElement('audio'); a.controls = true; a.src = url; document.querySelector('#audio-' + idx).replaceChildren(a); a.play().catch(() => {}); t.remove();
    } catch (err) { t.disabled = false; t.textContent = 'Play the recording'; alert(err.message); }
  }
});
document.querySelector('#refresh').addEventListener('click', load);
document.querySelector('#lock').addEventListener('click', () => { session = ''; selected = null; feed = null; sessionStorage.removeItem(KEY); render(); });
load();
