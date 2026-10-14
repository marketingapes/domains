/* Paraquat Perspective. Open demo by default (no code; Kyle 2026-10-14): every Paraquat inquiry and
 * Sofia call as ONE lead per phone number, click a lead for its path, play the real recordings.
 * The page ships with zero data. Everything comes from GET <hub>/portal/paraquat/basic with the session header.
 * The session lives in sessionStorage only; Lock or closing the tab clears it. Nothing here places calls or sends texts. */
const body = document.body, hub = body.dataset.hub, client = body.dataset.client, main = document.querySelector('#main');
const KEY = 'perspective-session-' + client;
const RELOAD_SECONDS = 60;                      // how often this page re-reads the feed while open (not real time)
let session = sessionStorage.getItem(KEY) || '', feed = null, lastError = '', selected = null, timer = null, email = '', signinOpen = false, signedUp = '';
let view = location.hash === '#records' ? 'records' : 'ads';   // 1 · the ads first, 2 · where it lands
try { signedUp = sessionStorage.getItem(KEY + ':signup') || ''; } catch (e) {}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = (label, cls = '') => `<span class="badge ${cls}">${esc(label)}</span>`;
const when = v => { if (!v) return '—'; const n = Number(v); const d = (typeof v === 'number' || /^[0-9.]+(E[0-9]+)?$/i.test(String(v))) && n > 1e9 ? new Date(n * 1000) : new Date(String(v).replace(' ', 'T').replace('+00', 'Z')); return isNaN(d) ? esc(v) : d.toLocaleString(); };
const secs = v => (v == null || v === '') ? '—' : Math.round(Number(v)) + 's';
const LABEL = {who:'Asking for',diagnosis:"Parkinson's diagnosis",lawyer:'Lawyer already involved',job:'Exposure at a job',role:'Role with Paraquat',product:'Where it came from',years:'Years of exposure',age:'Age at exposure',acres:'Area size',meth:'Methamphetamine',web_outcome:'Quiz outcome',quiz_version:'Quiz version',
  parkinsons_dx:"Parkinson's diagnosed",dx_year:'Diagnosis year',represented_or_signed:'Lawyer already involved',workplace_exposure:'Workplace exposure',exposure_role:'Role',product:'Product',mixed_with_water:'Mixed with water',retail_purchase:'Retail purchase',first_exposure_year:'First exposure',last_exposure_year:'Last exposure',age_at_first_exposure:'Age at first exposure',minor_full_season:'Full season as a minor',area_size:'Area size',exposure_description:'Exposure description',job_description:'Job description',meth_use:'Methamphetamine',provider_name:'Provider',provider_city_state:'Provider city/state',contact_method:'Contact method',contact_permission:'Contact permission',opt_out:'Opted out',human_requested:'Asked for a person',screen_outcome:'Sofia outcome',asking_for:'Asking for',pnc_living:'Person living',exposure_state:'State',dq_reasons:'Disqualifiers',firm_review_reasons:'Firm review reasons'};

function sourceLabel(s) { return ({quiz_inquiry:'Guided quiz', web_inquiry:'Page form', callback_request:'Callback request'})[s] || (s || 'Inquiry'); }
const ENDED = {'customer-ended-call':'caller hung up','assistant-forwarded-call':'transferred','assistant-ended-call':'Sofia ended the call','silence-timed-out':'silence timeout','voicemail':'voicemail','customer-did-not-answer':'no answer','assistant-error':'system error'};
function callStatus(c) {
  const o = (c.outcome || '').toUpperCase(), e = ENDED[c.ended_reason] || (c.ended_reason || '').replace(/-/g, ' ');
  const label = {INCOMPLETE:'Incomplete', FIRM_REVIEW:'Verified · firm review', QUALIFIED:'Verified', NOT_A_FIT:'Not a fit', OFF_TOPIC:'Off topic', OPTED_OUT:'Opted out'}[o] || (o ? o.toLowerCase() : 'No outcome');
  return c.transferred ? `${label} · transferred` : e ? `${label} · ${e}` : label;
}
function latestCall(l) { return l.calls.length ? l.calls[l.calls.length - 1] : null; }
function stageOf(l) {
  if (l.handoff_connected) return ['Transferred · connected', 'ok'];
  if (l.handoff_attempted) return ['Transfer attempted', 'gray'];
  const lc = latestCall(l); if (lc) return ['Sofia · ' + callStatus(lc), (lc.outcome === 'QUALIFIED' || lc.outcome === 'FIRM_REVIEW') ? 'ok' : 'gray'];
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
  return `<section class="signin"><p class="eyebrow">OWNER SIGN-IN</p><h1>Full view.</h1><p class="note">Approved emails only: a 6-digit code lands in your inbox. Everyone else already has the open demo — <button class="quiet" type="button" id="restart">back to it</button>.</p>
  <form id="login"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" value="${esc(email)}">
  <div id="code-wrap" ${email ? '' : 'hidden'}><label for="code">6-digit code</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"></div>
  <div class="actions" style="margin-top:18px"><button class="button" type="submit">${email ? 'Open full view' : 'Send my code'}</button>${email ? '<button class="quiet" type="button" id="resend">Send a new code</button>' : ''}</div>
  ${lastError ? `<p class="error">${esc(lastError)}</p>` : ''}</form></section>`;
}
function signup() {
  if (signedUp) return `<section class="panel signup"><p class="eyebrow">YOU'RE ON THE LIST</p><h2>Thanks${signedUp ? ', ' + esc(signedUp) : ''}. Watch the records fill in below.</h2><p class="note">I'll reach out about your tort. Meanwhile, click an ad and go through it like a client.</p></section>`;
  return `<section class="panel signup"><p class="eyebrow">WANT THIS FOR YOUR TORT?</p><h2>Name and email. That's it.</h2><p class="note">Optional — the demo works either way.</p>
  <form id="signup"><div class="signup-row"><input name="name" required maxlength="70" autocomplete="name" placeholder="Your name" aria-label="Name"><input name="email" type="email" required autocomplete="email" placeholder="you@firm.com" aria-label="Email"><button class="button" type="submit">Show me</button></div>
  ${lastError ? `<p class="error">${esc(lastError)}</p>` : ''}<p class="note" style="margin-top:10px">No code, no spam. The demo below is live either way.</p></form></section>`;
}
function freshness(f) {
  const n = f.data_notes || {};
  return `<div class="freshness"><div><b>Last updated</b>${esc(when(f.generated_at))} · this page re-reads every ${RELOAD_SECONDS}s</div><div><b>Form, quiz, callback</b>${esc(n.web || '')}</div><div><b>Sofia calls</b>${esc(n.sofia || '')}</div><div><b>Transfer legs (CallRail)</b>${esc(n.transfer || '')}</div><div><b>Firm outcomes</b>${esc(n.firm || '')}</div></div>`;
}
function tabs() {
  return `<nav class="tabs" aria-label="Demo steps"><a href="#ads" class="${view === 'ads' ? 'on' : ''}" data-view="ads"><span>1</span>Demo ad preview</a><a href="#records" class="${view === 'records' ? 'on' : ''}" data-view="records"><span>2</span>Where it lands</a></nav>`;
}
function adsView() {
  return `${tabs()}<div class="dashboard-intro" id="dashboard"><div><p class="eyebrow">DEMO AD PREVIEW · PARAQUAT-PILOT-001</p><h1>Pick an ad.<br><em>Go through it like a client.</em></h1><p class="lede">Three Preview ads, three doors into the live Paraquat funnel: the quiz, a call with Sofia, or the form page. Use made-up details. Then open <a href="#records" data-view="records">Where it lands</a>.</p></div></div>
  ${adset()}
  <div class="actions" style="margin-top:22px"><a class="button" href="#records" data-view="records">Next: see where it lands →</a></div>
  ${feed && feed.viewer.email ? '' : signup()}`;
}
function dashboard() {
  if (view === 'ads') return adsView();
  const f = feed, c = f.counts, leads = f.leads;
  const metrics = [['Leads', c.leads], ['Sofia calls', c.sofia_calls], ['Handoffs attempted', c.handoffs_attempted], ['Handoffs connected', c.handoffs_connected], ['Firm-reported signed', c.firm_reported_signed == null ? '—' : c.firm_reported_signed]];
  return `${tabs()}<div class="dashboard-intro" id="dashboard"><div><p class="eyebrow">WHERE IT LANDS · PARAQUAT-PILOT-001</p><h1>Now look where it lands.<br><em>Your lead is in here.</em></h1><p class="lede">Every Paraquat inquiry and Sofia call, one lead per phone number. Click a lead for Sofia's status, the handoff and the recording. Came through a door just now? It shows within about a minute.</p></div><aside class="dark-card"><p class="eyebrow">CONNECTED RECORDS</p><h2>Know what happened.<br>Know what needs attention.</h2><p>Where did the request come from? What did the person say? Did Sofia hand them to a person? Was the transfer answered?</p><p class="note">${f.viewer.email ? 'Signed in as ' + esc(f.viewer.email) + ' · ' + esc(f.viewer.role) : 'Open demo · live records · no claimant names, answers or recordings'}</p></aside></div>
  ${freshness(f)}
  <section class="metric-grid" aria-label="Campaign totals">${metrics.map(([l, v]) => `<article class="panel"><b>${esc(v)}</b><span>${esc(l)}</span><small>${l === 'Firm-reported signed' ? 'Not connected' : 'TEST leads excluded'}</small></article>`).join('')}</section>
  <section class="panel"><div class="section-head"><div><p class="eyebrow">AI CRM · LIVE RECORDS</p><h2>Click a lead for its path and recording.</h2></div>${badge(c.test_leads ? c.test_leads + ' TEST lead' + (c.test_leads > 1 ? 's' : '') + ' shown, excluded from totals' : 'No test leads', 'test')}</div>
  ${leads.length ? `<div class="lead-list">${leads.map(l => { const [stage, cls] = stageOf(l); const name = l.name || (l.has_web ? 'Web inquiry' : 'Inbound caller'); const src = l.sources.length ? sourceLabel(l.sources[0].kind) : (l.calls.length ? (l.calls[0].demo_line ? 'Demo line call' : 'Called (202) 932-9700') : 'Transfer leg only');
    return `<button class="lead-row ${l.is_test ? 'test' : ''}" data-lead="${esc(l.lead_uid)}" aria-label="Open ${esc(name)}"><span><small>Last activity ${esc(when(l.last_activity || l.first_seen))}${l.phone_last4 ? ' · …' + esc(l.phone_last4) : ''}</small><b>${esc(name)}${l.is_test ? ' · TEST' : ''}</b><small>${esc(src)}${l.state ? ' · ' + esc(l.state) : ''} · first seen ${esc(when(l.first_seen))}</small></span><span><small>Sofia · ${l.calls.length} call${l.calls.length === 1 ? '' : 's'}</small><b>${latestCall(l) ? esc(callStatus(latestCall(l))) : 'No call yet'}</b>${latestCall(l) ? `<small>latest ${esc(when(latestCall(l).at))}</small>` : ''}</span><span><small>Intake handoff</small><b>Attempted: ${l.handoff_attempted ? 'yes' : 'no'}</b><small>Connected: ${l.handoff_connected ? 'yes' : 'no'}</small></span><span><small>Status</small><b>${badge(stage, cls)}</b><small>Open the path →</small></span></button>`; }).join('')}</div>` : '<p class="empty">No Paraquat records yet. The first form, quiz or call will appear here.</p>'}
  <p class="note" style="margin-top:20px">A connected handoff means the transfer leg was answered on the receiving line. It is not an eligibility decision or a signed case.</p></section>
  ${walkthrough()}`;
}
// The ad set: three Paraquat ad previews, one per door into the real funnel. Marketing-ready previews, NOT live spending ads.
const FUNNEL = 'https://besttortlawyers.com/paraquat/';
const ADS = [
  { n: 1, door: 'Quiz path', path: 'quiz/', content: 'ad1-quiz', primary: 'Sprayed Paraquat on a farm, orchard or right-of-way — and later diagnosed with Parkinson\'s? Two minutes tells you if you may have a claim.', headline: 'Paraquat & Parkinson\'s: 2-minute eligibility check', cta: 'Take the quiz', art: 'Two minutes.<br>No phone call.' },
  { n: 2, door: 'Sofia / call path', path: 'talk-to-sofia/', content: 'ad2-sofia', primary: 'Rather talk than type? Sofia listens to your story, asks the questions a firm would, and connects you live if it fits. Calls are recorded.', headline: 'Talk to Sofia · (202) 932-9700', cta: 'Call now', art: 'Tell it once.<br>Sofia takes it from there.' },
  { n: 3, door: 'Form page', path: '', content: 'ad3-form', primary: 'Farmworkers, applicators, mixers and the families next to the fields. If Paraquat was part of your work, find out where you stand.', headline: 'Paraquat exposure? See if you qualify', cta: 'Learn more', art: 'Worked around Paraquat?<br>Start here.' },
];
const adHref = a => `${FUNNEL}${a.path}?utm_source=perspective-demo&utm_medium=ad-preview&utm_campaign=PARAQUAT-PILOT-001&utm_content=${a.content}`;
function adset() {
  return `<section class="panel" id="ads" style="margin-top:22px"><div class="section-head"><div><p class="eyebrow">THE AD SET · PREVIEW</p><h2>Three ads. Three doors.</h2></div>${badge('Preview · marketing ready · not a live ad', 'test')}</div>
  <div class="ad-grid">${ADS.map(a => `<article class="ad"><div class="ad-head"><span class="ad-avatar">B</span><div><b>Best Tort Lawyers</b><small>Sponsored · <em>Preview</em></small></div></div><p class="ad-primary">${esc(a.primary)}</p>
    <a class="ad-art" href="${esc(adHref(a))}" target="_blank" rel="noopener" aria-label="Ad ${a.n}: ${esc(a.cta)}"><span class="ad-pin">Ad ${a.n} · ${esc(a.door)}</span><strong>${a.art}</strong></a>
    <div class="ad-foot"><div><small>BESTTORTLAWYERS.COM</small><b>${esc(a.headline)}</b></div><a class="ad-cta" href="${esc(adHref(a))}" target="_blank" rel="noopener">${esc(a.cta)}</a></div></article>`).join('')}</div>
  <p class="note" style="margin-top:16px">Each ad opens the real page in a new tab. Your path lands in <a href="#records" data-view="records">Where it lands</a> as one lead within about a minute; a Sofia handoff shows its CallRail transfer leg within 15 minutes.</p></section>`;
}
function walkthrough() {
  const dots = [['The ad', '#ads', 'the preview set'], ['The page', FUNNEL, 'besttortlawyers.com/paraquat'], ['Sofia', FUNNEL + 'talk-to-sofia/', '(202) 932-9700'], ['The handoff', null, 'live transfer to the intake line, tracked in CallRail'], ['Perspective', '#dashboard', 'this workspace']];
  return `<section class="panel" id="how" style="margin-top:28px"><div class="section-head"><div><p class="eyebrow">HOW THE DOTS CONNECT</p><h2>Every record above came through this.</h2></div></div>
  <p class="dots">${dots.map(([t, href, x]) => `<span><b>${esc(t)}</b> <small>${href ? `<a href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(x)}</a>` : esc(x)}</small></span>`).join('<i aria-hidden="true">→</i>')}</p></section>
  <div class="dashboard-bottom"><section class="dark-card"><p class="eyebrow">WHY THESE NUMBERS</p><h2>I'm getting these results because I connected all the dots.</h2><p>Let a gorilla and AI show you how to consistently lower your CPA — by evolving your marketing, not making it just AI.</p><p class="note">One Gorilla + AI.</p></section>
  <section class="panel"><p class="eyebrow">YOUR TORT · YOUR PERSPECTIVE</p><div class="actions"><a class="button" href="https://lawfirmmarketingapes.com/campaign-offer-special/" target="_blank" rel="noopener">Request a campaign</a><a class="button secondary" href="tel:+12029329700">Call Sofia</a></div><p class="note" style="margin-top:14px">(202) 932-9700 is the live Paraquat line, inbound and outbound.</p></section></div>`;
}
function record() {
  const l = feed.leads.find(x => x.lead_uid === selected); if (!l) { selected = null; return dashboard(); }
  const name = l.name || (l.has_web ? 'Web inquiry' : 'Inbound caller'), [stage, cls] = stageOf(l);
  const steps = [];
  for (const s of l.sources) steps.push([sourceLabel(s.kind), when(s.at) + (s.outcome ? ' · quiz outcome ' + s.outcome : '') + (s.is_test ? ' · TEST record' : '')]);
  for (const c of l.calls) {
    steps.push(['Sofia call' + (c.demo_line ? ' (demo line)' : ' on (202) 932-9700'), when(c.at) + ' · ' + secs(c.seconds) + ' · ' + callStatus(c)]);
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
  ${l.calls.map(c => `<div class="call-card"><h3>Sofia call · ${esc(when(c.at))}</h3><p class="note">${c.demo_line ? 'Demo line (213)' : 'Line (202) 932-9700'} · ${esc(secs(c.seconds))} · ${esc(callStatus(c))}</p>${answers(c.answers)}
    ${c.has_recording ? `<button class="button secondary" data-play="${esc(l.lead_uid)}:${c.index}">Play the Sofia recording</button><div id="audio-${c.index}"></div>` : '<p class="note">No Sofia recording available for your access level, or none stored.</p>'}
    ${c.transfer_legs.map(t => `<div class="status-row"><small>CallRail transfer leg · ${esc(when(t.at))}</small><b>${t.answered ? 'Answered' : 'Not answered'} · ${esc(secs(t.seconds))}${t.player ? ` · <a href="${esc(t.player)}" target="_blank" rel="noopener">Open CallRail recording ↗</a>` : ''}</b></div>`).join('')}</div>`).join('')}
  </section><aside><div class="panel"><p class="eyebrow">STATUS</p><div class="status-row"><small>Source</small><b>${esc(l.sources.length ? sourceLabel(l.sources[0].kind) : (l.calls.length ? 'Inbound call' : '—'))}</b></div><div class="status-row"><small>Sofia</small><b>${esc(l.sofia_outcome || (l.calls.length ? 'No outcome' : 'No call yet'))}</b></div><div class="status-row"><small>Handoff attempted</small><b>${l.handoff_attempted ? 'Yes' : 'No'}</b></div><div class="status-row"><small>Receiver connected</small><b>${l.handoff_connected ? 'Yes' : 'No'}</b></div><div class="status-row"><small>Firm outcome</small><b>Not connected</b></div></div>
  <div class="panel" style="margin-top:20px"><p class="eyebrow">CONTACT</p>${feed.viewer.contact ? `<div class="status-row"><small>Name</small><b>${esc(l.name || '—')}</b></div><div class="status-row"><small>Phone</small><b>${l.phone_last4 ? '…' + esc(l.phone_last4) : '—'}</b></div><div class="status-row"><small>State</small><b>${esc(l.state || '—')}</b></div>` : '<p class="note">Not included for your access level.</p>'}</div></aside></div>
  <div class="actions"><button class="button secondary" id="back">Back to your Perspective</button></div>`;
}

// ---------- data ----------
async function load() {
  try {
    const r = await fetch(hub + '/portal/' + client + '/basic', { headers: session ? { Authorization: 'Bearer ' + session } : {}, cache: 'no-store', credentials: 'omit' });
    if (r.status === 401 && session) { session = ''; sessionStorage.removeItem(KEY); lastError = 'Your session ended; showing the open demo.'; return load(); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Portal data unavailable');
    feed = await r.json(); lastError = '';
  } catch (e) { lastError = e.message || 'Could not load'; }
  render();
}
function render() {
  const signed = !!session;
  document.querySelector('#refresh').hidden = signinOpen; document.querySelector('#lock').hidden = !signed; document.querySelector('#owner').hidden = signed || signinOpen;
  document.querySelector('#banner-status').textContent = feed ? (signed ? 'Full view · last updated ' : 'Open demo · last updated ') + when(feed.generated_at) : (lastError || 'Loading…');
  document.querySelector('#footer-updated').textContent = feed ? 'Last updated ' + when(feed.generated_at) : '';
  main.innerHTML = signinOpen ? signin() : (view === 'ads' && !selected) ? adsView() : !feed ? `<p class="empty">${esc(lastError || 'Loading…')}</p>` : selected ? record() : dashboard();
  if (!timer) timer = setInterval(load, RELOAD_SECONDS * 1000);
}
async function post(path, data) {
  const r = await fetch(hub + '/portal/' + client + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store', credentials: 'omit' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || 'Request failed');
  return j;
}
main.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'signup') {
    e.preventDefault(); const name = f.elements.name.value.trim(), em = f.elements.email.value.trim().toLowerCase();
    try { await post('/register', { name, email: em }); signedUp = name.split(' ')[0]; try { sessionStorage.setItem(KEY + ':signup', signedUp); } catch (x) {} lastError = ''; }
    catch (err) { lastError = err.message; }
    return render();
  }
  if (f.id !== 'login') return; e.preventDefault();
  email = f.elements.email.value.trim().toLowerCase(); const code = (f.elements.code?.value || '').replace(/\D/g, '');
  try {
    if (code.length === 6) { const j = await post('/verify', { email, code }); session = j.session; sessionStorage.setItem(KEY, session); lastError = ''; signinOpen = false; await load(); }
    else { await post('/login', { email }); lastError = ''; render(); document.querySelector('#code')?.focus(); }
  } catch (err) { lastError = err.message; render(); }
});
main.addEventListener('click', async e => {
  const t = e.target.closest('button, a'); if (!t) return;
  if (t.id === 'resend') { try { await post('/login', { email }); lastError = 'A new code was sent.'; } catch (err) { lastError = err.message; } return render(); }
  if (t.id === 'back') { selected = null; return render(); }
  if (t.dataset.view) { e.preventDefault(); view = t.dataset.view; selected = null; try { history.replaceState(null, '', '#' + view); } catch (x) {} render(); window.scrollTo({ top: 0 }); return; }
  if (t.id === 'restart') { email = ''; lastError = ''; signinOpen = false; return render(); }
  if (t.id === 'tour') { selected = null; render(); document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' }); return; }
  if (t.dataset.lead) { view = 'records'; selected = t.dataset.lead; render(); window.scrollTo({ top: 0 }); return; }
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
window.addEventListener('hashchange', () => { const v = location.hash === '#records' ? 'records' : location.hash === '#ads' ? 'ads' : null; if (v && v !== view) { view = v; selected = null; render(); } });
document.querySelector('header nav').addEventListener('click', e => { const a = e.target.closest('a[data-view]'); if (a) { e.preventDefault(); view = a.dataset.view; selected = null; render(); window.scrollTo({ top: 0 }); } });
document.querySelector('#lock').addEventListener('click', () => { session = ''; selected = null; sessionStorage.removeItem(KEY); load(); });
document.querySelector('#owner').addEventListener('click', () => { signinOpen = true; lastError = ''; render(); });
load();
