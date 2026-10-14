/* Paraquat private Perspective. One clean workspace: sign in with an emailed code, see every Paraquat inquiry and
 * Sofia call as ONE lead per phone number, click a lead for its path, play the real recordings.
 * The page ships with zero data. Everything comes from GET <hub>/portal/paraquat/basic with the session header.
 * The session lives in sessionStorage only; Lock or closing the tab clears it. Nothing here places calls or sends texts. */
const body = document.body, hub = body.dataset.hub, client = body.dataset.client, main = document.querySelector('#main');
const KEY = 'perspective-session-' + client;
const RELOAD_SECONDS = 60;                      // how often this page re-reads the feed while open (not real time)
let session = sessionStorage.getItem(KEY) || '', feed = null, lastError = '', selected = null, timer = null, email = '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = (label, cls = '') => `<span class="badge ${cls}">${esc(label)}</span>`;
const when = v => { if (!v) return '—'; const d = new Date(String(v).replace(' ', 'T').replace('+00', 'Z')); return isNaN(d) ? esc(v) : d.toLocaleString(); };
const secs = v => (v == null || v === '') ? '—' : Math.round(Number(v)) + 's';
const LABEL = {who:'Asking for',diagnosis:"Parkinson's diagnosis",lawyer:'Lawyer already involved',job:'Exposure at a job',role:'Role with Paraquat',product:'Where it came from',years:'Years of exposure',age:'Age at exposure',acres:'Area size',meth:'Methamphetamine',web_outcome:'Quiz outcome',quiz_version:'Quiz version',
  parkinsons_dx:"Parkinson's diagnosed",dx_year:'Diagnosis year',represented_or_signed:'Lawyer already involved',workplace_exposure:'Workplace exposure',exposure_role:'Role',product:'Product',mixed_with_water:'Mixed with water',retail_purchase:'Retail purchase',first_exposure_year:'First exposure',last_exposure_year:'Last exposure',age_at_first_exposure:'Age at first exposure',minor_full_season:'Full season as a minor',area_size:'Area size',exposure_description:'Exposure description',job_description:'Job description',meth_use:'Methamphetamine',provider_name:'Provider',provider_city_state:'Provider city/state',contact_method:'Contact method',contact_permission:'Contact permission',opt_out:'Opted out',human_requested:'Asked for a person',screen_outcome:'Sofia outcome',asking_for:'Asking for',pnc_living:'Person living',exposure_state:'State',dq_reasons:'Disqualifiers',firm_review_reasons:'Firm review reasons'};

function sourceLabel(s) { return ({quiz_inquiry:'Guided quiz', web_inquiry:'Page form', callback_request:'Callback request'})[s] || (s || 'Inquiry'); }
function stageOf(l) {
  if (l.handoff_connected) return ['Transferred · connected', 'ok'];
  if (l.handoff_attempted) return ['Transfer attempted', 'gray'];
  if (l.sofia_outcome) return ['Sofia · ' + l.sofia_outcome, l.sofia_outcome === 'QUALIFIED' ? 'ok' : 'gray'];
  if (l.web_outcome) return ['Web · ' + l.web_outcome, 'neutral'];
  return ['Received', 'neutral'];
}
function answers(obj) {
  if (!obj || typeof obj !== 'object') return '<p class="note">Answers are not included for your access level.</p>';
  const rows = Object.entries(obj).filter(([k, v]) => v !== null && v !== '' && v !== 'not_asked' && !(Array.isArray(v) && !v.length));
  if (!rows.length) return '<p class="note">No answers recorded.</p>';
  return `<div class="answers">${rows.map(([k, v]) => `<div class="answer-row"><span>${esc(LABEL[k] || k)}</span><b>${esc(Array.isArray(v) ? v.join(', ') : v)}</b></div>`).join('')}</div>`;
}

// ---------- views ----------
function signin() {
  return `<section class="signin"><p class="eyebrow">PERSPECTIVE · PARAQUAT · LIVE</p><h1>See the campaign.<br><em>As it happens.</em></h1><p class="note">Your name and email, and a 6-digit code lands in your inbox. It works once, for 10 minutes. You will see real Paraquat records as they come in.</p>
  <form id="login">${email ? '' : '<label for="name">Name</label><input id="name" name="name" required maxlength="70" autocomplete="name">'}<label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" value="${esc(email)}">
  <div id="code-wrap" ${email ? '' : 'hidden'}><label for="code">6-digit code</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"></div>
  <div class="actions" style="margin-top:18px"><button class="button" type="submit">${email ? 'Open Perspective' : 'Show me'}</button>${email ? '<button class="quiet" type="button" id="resend">Send a new code</button><button class="quiet" type="button" id="restart">Different email</button>' : ''}</div>
  ${lastError ? `<p class="error">${esc(lastError)}</p>` : ''}<p class="note" style="margin-top:14px">Private · no index · no spam. Already approved? Just enter your email.</p></form></section>`;
}
function freshness(f) {
  const n = f.data_notes || {};
  return `<div class="freshness"><div><b>Last updated</b>${esc(when(f.generated_at))} · this page re-reads every ${RELOAD_SECONDS}s</div><div><b>Form, quiz, callback</b>${esc(n.web || '')}</div><div><b>Sofia calls</b>${esc(n.sofia || '')}</div><div><b>Transfer legs (CallRail)</b>${esc(n.transfer || '')}</div><div><b>Firm outcomes</b>${esc(n.firm || '')}</div></div>`;
}
function dashboard() {
  const f = feed, c = f.counts, leads = f.leads;
  const metrics = [['Leads', c.leads], ['Sofia calls', c.sofia_calls], ['Handoffs attempted', c.handoffs_attempted], ['Handoffs connected', c.handoffs_connected], ['Firm-reported signed', c.firm_reported_signed == null ? '—' : c.firm_reported_signed]];
  return `<div class="dashboard-intro"><div><p class="eyebrow">YOUR PERSPECTIVE · PARAQUAT-PILOT-001</p><h1>Here is what is happening<br><em>in your campaign.</em></h1><p class="lede">Every Paraquat inquiry and Sofia call, one lead per phone number. Click a lead to follow its path from source to handoff.</p></div><aside class="dark-card"><p class="eyebrow">CONNECTED RECORDS</p><h2>Know what happened.<br>Know what needs attention.</h2><p>Where did the request come from? What did the person say? Did Sofia hand them to a person? Was the transfer answered?</p><p class="note">Signed in as ${esc(f.viewer.email)} · ${esc(f.viewer.role)}</p></aside></div>
  ${freshness(f)}
  <section class="metric-grid" aria-label="Campaign totals">${metrics.map(([l, v]) => `<article class="panel"><b>${esc(v)}</b><span>${esc(l)}</span><small>${l === 'Firm-reported signed' ? 'Not connected' : 'TEST leads excluded'}</small></article>`).join('')}</section>
  <section class="panel"><div class="section-head"><div><p class="eyebrow">CLICK A LEAD</p><h2>The story behind the totals.</h2></div>${badge(c.test_leads ? c.test_leads + ' TEST lead' + (c.test_leads > 1 ? 's' : '') + ' shown, excluded from totals' : 'No test leads', 'test')}</div>
  ${leads.length ? `<div class="lead-list">${leads.map(l => { const [stage, cls] = stageOf(l); const name = l.name || (l.has_web ? 'Web inquiry' : 'Inbound caller'); const src = l.sources.length ? sourceLabel(l.sources[0].kind) : (l.calls.length ? (l.calls[0].demo_line ? 'Demo line call' : 'Called (202) 932-9700') : 'Transfer leg only');
    return `<button class="lead-row ${l.is_test ? 'test' : ''}" data-lead="${esc(l.lead_uid)}" aria-label="Open ${esc(name)}"><span><small>${esc(when(l.first_seen))}${l.phone_last4 ? ' · …' + esc(l.phone_last4) : ''}</small><b>${esc(name)}${l.is_test ? ' · TEST' : ''}</b><small>${esc(src)}${l.state ? ' · ' + esc(l.state) : ''}</small></span><span><small>Sofia</small><b>${l.calls.length ? l.calls.length + ' call' + (l.calls.length > 1 ? 's' : '') + (l.sofia_outcome ? ' · ' + esc(l.sofia_outcome) : '') : 'No call yet'}</b></span><span><small>Intake handoff</small><b>Attempted: ${l.handoff_attempted ? 'yes' : 'no'}</b><small>Connected: ${l.handoff_connected ? 'yes' : 'no'}</small></span><span><small>Status</small><b>${badge(stage, cls)}</b><small>Open the path →</small></span></button>`; }).join('')}</div>` : '<p class="empty">No Paraquat records yet. The first form, quiz or call will appear here.</p>'}
  <p class="note" style="margin-top:20px">A connected handoff means the transfer leg was answered on the receiving line. It is not an eligibility decision or a signed case.</p></section>
  ${walkthrough()}`;
}
function walkthrough() {
  const steps = [
    ['01 · The ad', 'One Paraquat ad. Every click carries its own ID into everything below.', 'https://besttortlawyers.com/paraquat/quiz/', 'See the campaign page ↗'],
    ['02 · The page', 'Three ways in: a form, a guided quiz, or a call. Nothing sits in an inbox.', 'https://besttortlawyers.com/paraquat/', 'Open the page ↗'],
    ['03 · Sofia', 'The AI intake guide screens against the firm\'s criteria, one question at a time, and records the call.', 'https://besttortlawyers.com/paraquat/talk-to-sofia/', 'Meet Sofia ↗'],
    ['04 · The handoff', 'A qualified caller is transferred live to the intake line. The transfer leg is tracked and recorded separately.', null, null],
    ['05 · This Perspective', 'Source, answers, Sofia outcome, transfer result, recording — one record per person, as it happens.', null, null],
  ];
  return `<section class="panel" id="how" style="margin-top:28px"><div class="section-head"><div><p class="eyebrow">HOW THE DOTS CONNECT</p><h2>Every record above came through this.</h2></div></div>
  <ol class="record-chain">${steps.map(([t, x, href, label]) => `<li><span>${esc(t.slice(0, 2))}</span><div><b>${esc(t.slice(5))}</b><p>${esc(x)}${href ? ` <a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>` : ''}</p></div></li>`).join('')}</ol></section>
  <div class="dashboard-bottom"><section class="dark-card"><p class="eyebrow">WHY THESE NUMBERS</p><h2>I'm getting these results<br>because I connected all the dots.</h2><p>Click, page, Sofia, the handoff and what your team does next — one loop, measured end to end. That's what lowers cost per acquisition month after month: evolving the marketing, not handing it to AI.</p><p class="note">One gorilla + AI. I bring the strategy and direct the system; AI does the repetitive work.</p></section>
  <section class="panel"><p class="eyebrow">I CAN DO THIS FOR YOU</p><h2>Your tort.<br>Your Perspective.</h2><p>Same loop, your firm's criteria, your intake line. Watch your own records fill this workspace instead of mine.</p><div class="actions"><a class="button" href="https://lawfirmmarketingapes.com/campaign-offer-special/" target="_blank" rel="noopener">Request a campaign ↗</a><a class="button secondary" href="tel:+12029329700">Call Sofia now</a></div><p class="note" style="margin-top:14px">(202) 932-9700 is the live Paraquat line. Use made-up details; your test call becomes a record here.</p></section></div>`;
}
function record() {
  const l = feed.leads.find(x => x.lead_uid === selected); if (!l) { selected = null; return dashboard(); }
  const name = l.name || (l.has_web ? 'Web inquiry' : 'Inbound caller'), [stage, cls] = stageOf(l);
  const steps = [];
  for (const s of l.sources) steps.push([sourceLabel(s.kind), when(s.at) + (s.outcome ? ' · quiz outcome ' + s.outcome : '') + (s.is_test ? ' · TEST record' : '')]);
  for (const c of l.calls) {
    steps.push(['Sofia call' + (c.demo_line ? ' (demo line)' : ' on (202) 932-9700'), when(c.at) + ' · ' + secs(c.seconds) + (c.outcome ? ' · ' + c.outcome : '') + ' · ended: ' + (c.ended_reason || '—')]);
    steps.push(['Handoff attempted', c.transferred ? 'Yes · Sofia transferred to the BTL team line (619) 853-0048' : 'No']);
    for (const t of c.transfer_legs) steps.push(['Receiver ' + (t.answered ? 'connected' : 'not connected'), when(t.at) + ' · ' + secs(t.seconds) + (t.voicemail ? ' · voicemail' : '') + ' · CallRail transfer leg']);
    if (c.transferred && !c.transfer_legs.length) steps.push(['Receiver', 'Transfer leg not in CallRail yet (polled every 15 minutes)']);
  }
  for (const t of l.unlinked_transfer_legs) steps.push(['Transfer leg (not matched to a Sofia call)', when(t.at) + ' · ' + (t.answered ? 'answered' : 'not answered')]);
  steps.push(['Firm-reported outcome', 'Not connected']);
  return `<div class="section-head"><div><p class="eyebrow">LEAD · ${esc(when(l.first_seen))}${l.phone_last4 ? ' · …' + esc(l.phone_last4) : ''}</p><h1>${esc(name)}${l.is_test ? ' · TEST' : ''}.<br><em>The path through intake.</em></h1></div>${l.is_test ? badge('TEST LEAD · excluded from totals and outreach', 'test') : badge(stage, cls)}</div>
  ${l.is_test ? `<div class="sample-notice"><b>Test record.</b> ${esc(l.test_label || 'Fictional test lead.')}</div>` : ''}
  <div class="perspective-grid"><section class="panel"><h2>The accountability chain</h2><ol class="record-chain">${steps.map(([t, x], i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><b>${esc(t)}</b><p>${esc(x)}</p></div></li>`).join('')}</ol>
  ${l.sources.map(s => `<div class="call-card"><h3>${esc(sourceLabel(s.kind))} · ${esc(when(s.at))}</h3><p class="note">Page ${esc(s.page || '—')}</p>${answers(s.screening)}</div>`).join('')}
  ${l.calls.map(c => `<div class="call-card"><h3>Sofia call · ${esc(when(c.at))}</h3><p class="note">${c.demo_line ? 'Demo line (213)' : 'Line (202) 932-9700'} · ${esc(secs(c.seconds))} · ${esc(c.outcome || 'no outcome')} · ${esc(c.ended_reason || '')}</p>${answers(c.answers)}
    ${c.has_recording ? `<button class="button secondary" data-play="${esc(l.lead_uid)}:${c.index}">Play the Sofia recording</button><div id="audio-${c.index}"></div>` : '<p class="note">No Sofia recording available for your access level, or none stored.</p>'}
    ${c.transfer_legs.map(t => `<div class="status-row"><small>CallRail transfer leg · ${esc(when(t.at))}</small><b>${t.answered ? 'Answered' : 'Not answered'} · ${esc(secs(t.seconds))}${t.player ? ` · <a href="${esc(t.player)}" target="_blank" rel="noopener">Open CallRail recording ↗</a>` : ''}</b></div>`).join('')}</div>`).join('')}
  </section><aside><div class="panel"><p class="eyebrow">STATUS</p><div class="status-row"><small>Source</small><b>${esc(l.sources.length ? sourceLabel(l.sources[0].kind) : (l.calls.length ? 'Inbound call' : '—'))}</b></div><div class="status-row"><small>Sofia</small><b>${esc(l.sofia_outcome || (l.calls.length ? 'No outcome' : 'No call yet'))}</b></div><div class="status-row"><small>Handoff attempted</small><b>${l.handoff_attempted ? 'Yes' : 'No'}</b></div><div class="status-row"><small>Receiver connected</small><b>${l.handoff_connected ? 'Yes' : 'No'}</b></div><div class="status-row"><small>Firm outcome</small><b>Not connected</b></div></div>
  <div class="panel" style="margin-top:20px"><p class="eyebrow">CONTACT</p>${feed.viewer.contact ? `<div class="status-row"><small>Name</small><b>${esc(l.name || '—')}</b></div><div class="status-row"><small>Phone</small><b>${l.phone_last4 ? '…' + esc(l.phone_last4) : '—'}</b></div><div class="status-row"><small>State</small><b>${esc(l.state || '—')}</b></div>` : '<p class="note">Not included for your access level.</p>'}</div></aside></div>
  <div class="actions"><button class="button secondary" id="back">Back to your Perspective</button></div>`;
}

// ---------- data ----------
async function load() {
  if (!session) return render();
  try {
    const r = await fetch(hub + '/portal/' + client + '/basic', { headers: { Authorization: 'Bearer ' + session }, cache: 'no-store', credentials: 'omit' });
    if (r.status === 401) { session = ''; sessionStorage.removeItem(KEY); lastError = 'Your session ended. Sign in again.'; return render(); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Portal data unavailable');
    feed = await r.json(); lastError = '';
  } catch (e) { lastError = e.message || 'Could not load'; }
  render();
}
function render() {
  const signed = !!session;
  document.querySelector('#refresh').hidden = !signed; document.querySelector('#lock').hidden = !signed;
  document.querySelector('#banner-status').textContent = signed ? (feed ? 'Connected records · last updated ' + when(feed.generated_at) : (lastError || 'Loading…')) : 'Sign in to view connected records';
  document.querySelector('#footer-updated').textContent = feed ? 'Last updated ' + when(feed.generated_at) : '';
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
  if (e.target.id !== 'login') return; e.preventDefault();
  const f = e.target; email = f.elements.email.value.trim().toLowerCase(); const code = (f.elements.code?.value || '').replace(/\D/g, '');
  try {
    if (code.length === 6) { const j = await post('/verify', { email, code }); session = j.session; sessionStorage.setItem(KEY, session); lastError = ''; await load(); }
    else { const name = (f.elements.name?.value || '').trim(); await post(name ? '/register' : '/login', name ? { name, email } : { email }); lastError = ''; render(); document.querySelector('#code')?.focus(); }
  } catch (err) { lastError = err.message; render(); }
});
main.addEventListener('click', async e => {
  const t = e.target.closest('button, a'); if (!t) return;
  if (t.id === 'resend') { try { await post('/login', { email }); lastError = 'A new code was sent.'; } catch (err) { lastError = err.message; } return render(); }
  if (t.id === 'back') { selected = null; return render(); }
  if (t.id === 'restart') { email = ''; lastError = ''; return render(); }
  if (t.id === 'tour') { selected = null; render(); document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' }); return; }
  if (t.dataset.lead) { selected = t.dataset.lead; render(); window.scrollTo({ top: 0 }); return; }
  if (t.dataset.play) {
    const [uid, idx] = t.dataset.play.split(':'); t.disabled = true; t.textContent = 'Loading recording…';
    try {
      const r = await fetch(hub + '/portal/' + client + '/basic/recordings/' + encodeURIComponent(uid) + '/' + idx, { headers: { Authorization: 'Bearer ' + session }, cache: 'no-store', credentials: 'omit' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Recording unavailable');
      const url = URL.createObjectURL(await r.blob()); const a = document.createElement('audio'); a.controls = true; a.src = url; document.querySelector('#audio-' + idx).replaceChildren(a); a.play().catch(() => {}); t.remove();
    } catch (err) { t.disabled = false; t.textContent = 'Play the Sofia recording'; alert(err.message); }
  }
});
document.querySelector('#refresh').addEventListener('click', load);
document.querySelector('#lock').addEventListener('click', () => { session = ''; feed = null; selected = null; sessionStorage.removeItem(KEY); clearInterval(timer); timer = null; render(); });
load();
