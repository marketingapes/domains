// Glassman request brief: guided wizard controller. Deterministic, no AI, no analytics.
// Preview mode (the default) never makes a network request. A future same-origin endpoint
// counts a brief as received only after a durable, matching JSON receipt (see brief.js).
import {
  STEPS, BRIEF_TERMS, emptyDraft, normalizeDraft, validateStep, firstIncompleteStep, briefSections,
  briefText, briefHash, newRequestId, REQUEST_ID, RECEIPT_ID, parseEndpoint, parseTimeout, buildPayload,
  createSubmitter,
} from './brief.js';

const KEY = 'glassman-brief-v1';
const $ = (id) => document.getElementById(id);
const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
const endpoint = parseEndpoint(meta('glassman-request-endpoint'), location.origin);
const submitter = createSubmitter({ fetchImpl: endpoint ? window.fetch.bind(window) : null, endpoint, timeoutMs: parseTimeout(meta('glassman-request-timeout-ms')) });
const random = (n) => crypto.getRandomValues(new Uint8Array(n));
const LAST = STEPS.length - 1;
const FALLBACKS = new Set(['Not provided', 'Not chosen', 'None noted', 'Nothing noted', 'Same as requester']);

const form = $('wizard');
const steps = [...form.querySelectorAll('.step')];
const S = load();
let confirmedThisLoad = false;

function fresh() { return { draft: emptyDraft(), step: 0, request_id: null, hash: null, pending: false, receipt: null, returnToReview: false }; }
function load() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fresh();
    const s = fresh();
    s.draft = normalizeDraft(raw.draft);
    s.step = Number.isInteger(raw.step) ? Math.min(Math.max(raw.step, 0), LAST) : 0;
    if (typeof raw.request_id === 'string' && REQUEST_ID.test(raw.request_id) && raw.hash === briefHash(s.draft)) {
      s.request_id = raw.request_id; s.hash = raw.hash; s.pending = raw.pending === true;
      if (raw.receipt && raw.receipt.request_id === s.request_id && RECEIPT_ID.test(String(raw.receipt.receipt_id))) s.receipt = { request_id: s.request_id, receipt_id: raw.receipt.receipt_id };
    }
    return s;
  } catch { return fresh(); }
}
function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage unavailable: keep working in memory */ } }

function ensureId() {
  const h = briefHash(S.draft);
  if (!S.request_id || S.hash !== h) { S.request_id = newRequestId(random); S.hash = h; S.pending = false; S.receipt = null; }
  return S.request_id;
}
const locked = () => confirmedThisLoad && !!S.receipt;

/* ---------- fields ---------- */
function fill() {
  for (const el of form.elements) {
    if (!el.name || !(el.name in S.draft)) continue;
    if (el.type === 'radio') el.checked = S.draft[el.name] === el.value;
    else if (el.type === 'checkbox') el.checked = S.draft[el.name] === true;
    else el.value = S.draft[el.name];
  }
}
function read(el) {
  if (!el.name || !(el.name in S.draft) || locked()) return;
  if (el.type === 'radio') { if (el.checked) S.draft[el.name] = el.value; }
  else if (el.type === 'checkbox') S.draft[el.name] = el.checked;
  else S.draft[el.name] = el.value;
}
function inputFor(name) {
  return form.querySelector(`[name="${name}"]:checked`) || form.querySelector(`#${name}`) || form.querySelector(`[name="${name}"]`);
}

/* ---------- errors ---------- */
function clearErrors(i) {
  steps[i].querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  steps[i].querySelectorAll('.group.invalid').forEach((g) => g.classList.remove('invalid'));
  steps[i].querySelectorAll('.err').forEach((e) => { e.textContent = ''; });
  $('err-summary').hidden = true;
}
function markField(name, message) {
  const err = $(`${name}-e`);
  if (err) err.textContent = message || '';
  const group = $(`g-${name}`);
  if (group) { group.classList.toggle('invalid', !!message); group.querySelectorAll('input').forEach((r) => message ? r.setAttribute('aria-invalid', 'true') : r.removeAttribute('aria-invalid')); }
  else { const el = $(name); if (el) message ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'); }
}
function showErrors(i, errors) {
  clearErrors(i);
  const list = $('err-summary').querySelector('ul');
  list.replaceChildren();
  for (const [name, message] of Object.entries(errors)) {
    markField(name, message);
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = `#${name}`; a.textContent = message;
    a.addEventListener('click', (ev) => { ev.preventDefault(); inputFor(name)?.focus(); });
    li.append(a); list.append(li);
  }
  const box = $('err-summary');
  box.hidden = false; box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'start', behavior: 'instant' });
}
function revalidateLive(i) {
  if (!steps[i]) return;
  const errors = validateStep(i, S.draft);
  steps[i].querySelectorAll('.err').forEach((e) => {
    const name = e.id.replace(/-e$/, '');
    if (e.textContent && !errors[name]) markField(name, '');
    else if (e.textContent && errors[name] !== e.textContent) markField(name, errors[name]);
  });
  if (![...steps[i].querySelectorAll('.err')].some((e) => e.textContent)) $('err-summary').hidden = true;
}

/* ---------- preview + review ---------- */
function kvList(rows) {
  const dl = document.createElement('dl'); dl.className = 'kv';
  for (const [k, v] of rows) {
    const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k; dd.textContent = v;
    if (FALLBACKS.has(v)) dd.className = 'pending';
    div.append(dt, dd); dl.append(div);
  }
  return dl;
}
function renderPreview() {
  const body = $('brief-body'); body.replaceChildren();
  for (const sec of briefSections(S.draft)) {
    const div = document.createElement('div'); div.className = 'brief-sec' + (sec.step === S.step || S.step === LAST ? ' on' : '');
    const h = document.createElement('h3'); h.textContent = sec.title;
    div.append(h, kvList(sec.rows)); body.append(div);
  }
  const flag = $('brief-flag'); flag.replaceChildren();
  if (S.draft.request_type === 'new') {
    const f = document.createElement('span'); f.className = 'flag';
    f.textContent = 'Separate future request. Not part of the current SSDI campaign; scope and pricing require review.';
    flag.append(f);
  }
}
function renderReview() {
  const list = $('review-list'); list.replaceChildren();
  for (const sec of briefSections(S.draft)) {
    const wrap = document.createElement('section'); wrap.className = 'review-sec';
    const head = document.createElement('header'), h = document.createElement('h3');
    h.textContent = sec.title; head.append(h);
    if (!locked()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'linkish'; b.textContent = 'Edit';
      b.setAttribute('aria-label', `Edit ${sec.title}`);
      b.addEventListener('click', () => { S.returnToReview = true; go(sec.step); });
      head.append(b);
    }
    wrap.append(head, kvList(sec.rows)); list.append(wrap);
  }
  const terms = $('terms-list'); terms.replaceChildren(...BRIEF_TERMS.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  $('brief-text').value = briefText(S.draft, { requestId: S.request_id || '' });
}
function renderReveals() {
  $('reveal-new').hidden = S.draft.request_type !== 'new';
  $('reveal-budget').hidden = S.draft.budget_mode !== 'propose';
}

/* ---------- status ---------- */
function setStatus(kind, title, text) {
  const box = $('status'); box.className = 'status ' + (kind || ''); box.replaceChildren();
  if (!title) return;
  const b = document.createElement('b'); b.textContent = title; box.append(b);
  if (text) box.append(document.createTextNode(text));
}
function renderMode() {
  if (!endpoint) return;
  $('mode-ribbon').textContent = 'A brief counts as received only with a confirmed receipt';
  $('assure-send').textContent = 'When you send, the page waits for a confirmed receipt. Until then nothing counts as received, and you can always copy or download.';
  const chip = $('send-chip'); chip.className = 'chip wait'; chip.textContent = 'Receipt required';
  $('send-copy').textContent = 'Sending asks the server to save your brief and return a receipt. Only a confirmed receipt counts as received. You can also copy or download the brief.';
  $('btn-send').hidden = false;
}
function renderSendButton() {
  const b = $('btn-send');
  b.disabled = submitter.busy || locked();
  b.setAttribute('aria-busy', String(submitter.busy));
  b.textContent = submitter.busy ? 'Waiting for a receipt…' : locked() ? 'Received' : (S.pending || S.receipt || b.dataset.failed) ? (S.receipt ? 'Check again with the server' : 'Try again') : 'Send brief for review';
}

/* ---------- navigation ---------- */
const hashStep = () => { const m = /^#step-([1-5])$/.exec(location.hash); return m ? Number(m[1]) - 1 : null; };
function clamp(i) { return Math.min(i, firstIncompleteStep(S.draft, i)); }
function go(i, { push = true, replace = false, focus = true } = {}) {
  const target = clamp(Math.min(Math.max(i, 0), LAST));
  const prev = S.step;
  S.step = target; save();
  const url = `#step-${target + 1}`;
  if (replace || !push) { if (location.hash !== url || replace) history.replaceState({ i: target, prev: history.state?.prev ?? null }, '', url); }
  else if (location.hash !== url) history.pushState({ i: target, prev }, '', url);
  render();
  if (focus) { $('stepper').scrollIntoView({ block: 'start', behavior: 'instant' }); steps[target].querySelector('h2').focus({ preventScroll: true }); }
}
function render() {
  const i = S.step;
  $('builder').classList.toggle('is-reviewing', i === LAST);
  if (i === LAST) { ensureId(); save(); S.returnToReview = false; }
  steps.forEach((s, n) => { s.hidden = n !== i; s.disabled = locked() && n !== LAST; });
  $('acknowledged').disabled = locked();
  [...$('stepper').children].forEach((li, n) => {
    li.classList.toggle('done', n < i || (n < LAST && !Object.keys(validateStep(n, S.draft)).length && n !== i));
    if (n === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('step-count').textContent = `Step ${i + 1} of ${STEPS.length} · ${STEPS[i].title}`;
  $('err-summary').hidden = true;
  $('btn-back').hidden = i === 0;
  $('btn-next').hidden = i === LAST;
  $('btn-next').textContent = i === LAST - 1 ? 'Review brief' : 'Continue';
  $('btn-return').hidden = !(S.returnToReview && i < LAST);
  $('btn-new').hidden = !(i === LAST && (locked() || S.receipt));
  $('locked-note').hidden = !locked();
  renderReveals(); renderPreview();
  if (i === LAST) { renderReview(); renderSendButton(); }
  document.title = `${STEPS[i].title} · Request a campaign brief · Glassman Perspective`;
}
function next() {
  const errors = validateStep(S.step, S.draft);
  if (Object.keys(errors).length) { showErrors(S.step, errors); return; }
  go(S.step + 1);
}
function back() {
  if (S.step === 0) return;
  if (history.state && history.state.i === S.step && history.state.prev === S.step - 1) history.back();
  else go(S.step - 1, { replace: true });
}

/* ---------- finishing ---------- */
function readyToFinish() {
  const all = firstIncompleteStep(S.draft, LAST);
  if (all < LAST) { go(all); next(); return false; }
  const errors = validateStep(LAST, S.draft);
  if (Object.keys(errors).length) { showErrors(LAST, errors); return false; }
  ensureId(); save(); renderReview();
  return true;
}
async function copyBrief() {
  if (!readyToFinish()) return;
  const text = briefText(S.draft, { requestId: S.request_id });
  try {
    await navigator.clipboard.writeText(text);
    setStatus('info', 'Brief copied.', ` Paste it into an email to Kyle. Brief ID ${S.request_id}. Nothing has been sent from this page.`);
  } catch {
    const details = $('brief-text').closest('details'); details.open = true;
    $('brief-text').focus(); $('brief-text').select();
    setStatus('wait', 'Copy didn’t work in this browser.', ' The brief is selected below; copy it with your keyboard or menu.');
  }
}
function downloadBrief() {
  if (!readyToFinish()) return;
  const blob = new Blob([briefText(S.draft, { requestId: S.request_id })], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `glassman-brief-${S.request_id}.txt`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus('info', 'Brief downloaded.', ` Send the file to Kyle. Brief ID ${S.request_id}. Nothing has been sent from this page.`);
}
async function sendBrief() {
  if (!endpoint || submitter.busy || locked()) return;
  if (!readyToFinish()) return;
  const id = S.request_id;
  S.pending = true; save();
  const attempt = submitter.submit(buildPayload(S.draft, id));
  renderSendButton();
  setStatus('wait', 'Sending…', ' Waiting for the server to confirm a saved receipt. This brief is not received until it does.');
  const result = await attempt;
  if (S.request_id !== id) {
    // The old result cannot confirm this draft, but its completed operation must
    // release the busy UI even after an edit or a cleared/new brief.
    renderSendButton();
    return;
  }
  const b = $('btn-send');
  if (result.ok) {
    S.pending = false; S.receipt = { request_id: id, receipt_id: result.receipt_id }; confirmedThisLoad = true; delete b.dataset.failed; save();
    render();
    setStatus('good', 'Received for review.', ` Receipt ${result.receipt_id} · Brief ID ${id}. Kyle will review it and reply. Nothing is purchased, invoiced or launched by this brief.`);
  } else {
    b.dataset.failed = '1'; save(); renderSendButton();
    setStatus('bad', 'Receipt not confirmed.', ` ${result.message} The server may have saved the brief, but this page cannot confirm it. Trying again keeps brief ID ${id}, so the server can recognize it as the same brief. You can also copy or download it.`);
  }
}
function newBrief() {
  Object.assign(S, fresh()); confirmedThisLoad = false; delete $('btn-send').dataset.failed;
  try { sessionStorage.removeItem(KEY); } catch {}
  fill(); setStatus('', '');
  go(0);
}

/* ---------- wire up ---------- */
form.addEventListener('submit', (ev) => { ev.preventDefault(); if (S.step < LAST) next(); });
form.addEventListener('input', (ev) => onEdit(ev.target));
form.addEventListener('change', (ev) => onEdit(ev.target));
function onEdit(el) {
  if (locked()) return;
  read(el);
  if (S.request_id && S.hash !== briefHash(S.draft)) { S.request_id = null; S.hash = null; S.pending = false; S.receipt = null; delete $('btn-send').dataset.failed; setStatus('', ''); }
  save(); renderReveals(); renderPreview(); revalidateLive(S.step);
  if (S.step === LAST) { if (el.name !== 'acknowledged') renderReview(); renderSendButton(); }
}
$('btn-next').addEventListener('click', next);
$('btn-back').addEventListener('click', back);
$('btn-return').addEventListener('click', () => {
  const errors = validateStep(S.step, S.draft);
  if (Object.keys(errors).length) { showErrors(S.step, errors); return; }
  go(LAST);
});
$('btn-copy').addEventListener('click', copyBrief);
$('btn-download').addEventListener('click', downloadBrief);
$('btn-send').addEventListener('click', sendBrief);
$('btn-new').addEventListener('click', newBrief);
form.querySelectorAll('.starter').forEach((b) => b.addEventListener('click', () => {
  if (locked()) return;
  const ta = $('angle'), s = b.dataset.starter;
  if (!ta.value.includes(s)) ta.value = (ta.value.trim() ? ta.value.trimEnd() + ' ' : '') + s;
  ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  onEdit(ta);
}));
let clearArmed = null;
$('btn-clear').addEventListener('click', () => {
  const b = $('btn-clear');
  if (!clearArmed) { b.textContent = 'Select again to clear everything'; clearArmed = setTimeout(() => { clearArmed = null; b.textContent = 'Clear draft'; }, 4000); return; }
  clearTimeout(clearArmed); clearArmed = null; b.textContent = 'Clear draft';
  newBrief();
});
window.addEventListener('popstate', () => {
  const h = hashStep();
  go(h === null ? 0 : h, { push: false, focus: true });
  if (hashStep() !== S.step) history.replaceState({ i: S.step, prev: null }, '', `#step-${S.step + 1}`);
});

fill();
renderMode();
form.hidden = false;
const start = hashStep() ?? S.step;
go(start, { replace: true, focus: false });
if (endpoint && S.step === LAST) {
  if (S.receipt) setStatus('info', 'Earlier in this tab, the server returned a receipt.', ` Receipt ${S.receipt.receipt_id} for brief ID ${S.request_id}. A note stored in the browser isn’t proof, so this page doesn’t mark it received. Check again to confirm with the server.`);
  else if (S.pending) setStatus('wait', 'The last send wasn’t confirmed.', ` No receipt arrived for it, so nothing counts as received. Sending again reuses brief ID ${S.request_id}, so the server can recognize it as the same brief.`);
  renderSendButton();
}
