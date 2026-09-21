/**
 * DoIHaveAClaim.ai — text-first claim checker UI.
 *
 * VOICE GATE. Voice is configuration-gated and OFF by default. When it is off
 * this file performs ZERO Vapi work: the SDK sits behind a dynamic import that
 * is never reached, so no Vapi script is fetched and no Vapi object exists.
 * dihac/domain.json declares vapi and phone MISSING/OFF with assistant_id null
 * and "borrowing another tenant's assistant is prohibited", so the gate stays
 * shut until that file says otherwise.
 *
 * Turning voice on later is a config change, not a rewrite: set
 * DIHAC_CONFIG.voice = { enabled: true, assistantId, publicKey, sdkUrl } and
 * the affordance appears. It will refuse an assistant id owned by another
 * tenant.
 *
 * No PII ever goes in the URL. Answers live in sessionStorage only.
 */
import {
  STATES, advance, categorise, questionsFor, nextQuestion, structure, CATEGORIES
} from './claim-check.mjs';

const $ = id => document.getElementById(id);
const STORE = 'dihac-check-v1';
/** Assistants owned by other tenants. Never borrowable, whatever config says. */
const FOREIGN_ASSISTANTS = Object.freeze(['908118d7-f221-429f-8855-55dd1d72c193']);

let description = '', category = 'other', answers = {}, state = 'DRAFT', ref = null, editing = null;

/* -------------------------------------------------------------- voice gate */
export function voiceGate(config) {
  const v = (config && config.voice) || null;
  if (!v || v.enabled !== true) return { enabled: false, reason: 'voice is off for this domain' };
  if (!v.assistantId) return { enabled: false, reason: 'no assistant is configured for this domain' };
  if (FOREIGN_ASSISTANTS.includes(v.assistantId)) {
    return { enabled: false, reason: 'that assistant belongs to another tenant and cannot be borrowed' };
  }
  return { enabled: true, reason: 'configured', config: v };
}

/* ------------------------------------------------------------ persistence */
function save() {
  try { sessionStorage.setItem(STORE, JSON.stringify({ description, category, answers, state, ref })); } catch {}
}
function load() {
  try {
    const p = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (!p || typeof p !== 'object') return false;
    description = typeof p.description === 'string' ? p.description : '';
    category = CATEGORIES.some(c => c.id === p.category) ? p.category : 'other';
    answers = p.answers && typeof p.answers === 'object' ? p.answers : {};
    state = STATES.includes(p.state) ? p.state : 'DRAFT';
    ref = typeof p.ref === 'string' ? p.ref : null;
    return !!description;
  } catch { return false; }
}
function newRef() {
  const b = new Uint32Array(2);
  (globalThis.crypto || {}).getRandomValues?.(b);
  return 'DIHAC-' + Array.from(b, n => n.toString(16).padStart(8, '0')).join('').slice(0, 12).toUpperCase();
}

/* ------------------------------------------------------------------- view */
function turn(who, text) {
  const el = document.createElement('div');
  el.className = 'turn ' + (who === 'you' ? 'you' : 'sys');
  const b = document.createElement('b');
  b.textContent = who === 'you' ? 'You' : 'Claim checker';
  el.append(b, document.createTextNode(text));
  $('thread').append(el);
  $('thread').scrollTop = $('thread').scrollHeight;
}

function track(event, extra) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, dihac_state: state, dihac_category: category, ...(extra || {}) });
  } catch {}
}

function renderQuestion(q) {
  $('asklabel').textContent = q.q;
  $('entry').placeholder = q.ph || 'Your answer';
  $('entry').value = answers[q.k] ?? '';
  $('entry').rows = 2;
  $('skip').hidden = !q.optional;
  const chips = $('chips');
  chips.textContent = '';
  chips.hidden = !q.chips;
  if (q.chips) {
    for (const c of q.chips) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = c;
      b.addEventListener('click', e => { if (e.detail > 0) b.blur(); answer(c); });
      chips.append(b);
    }
  }
}

function renderReview() {
  const list = $('reviewList');
  list.textContent = '';
  const rows = [['What happened', description, null],
    ...questionsFor(category).filter(q => q.k in answers).map(q => [q.q, answers[q.k] || 'Skipped', q.k])];
  for (const [label, value, key] of rows) {
    const row = document.createElement('div'); row.className = 'r';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'edit'; btn.textContent = 'Edit';
    btn.setAttribute('aria-label', 'Edit: ' + label);
    btn.addEventListener('click', e => { if (e.detail > 0) btn.blur(); startEdit(key); });
    row.append(dt, dd, btn); list.append(row);
  }
}

function render() {
  const inReview = state === 'REVIEW';
  const done = state === 'ACKNOWLEDGED' || state === 'NEEDS_REVIEW';
  $('ask').hidden = inReview || done;
  $('reviewPanel').hidden = !inReview;
  if (state === 'DRAFT') {
    $('progress').textContent = 'Step 1 — tell us what happened';
    $('asklabel').textContent = 'Type what happened, in your own words.';
    $('entry').rows = 5; $('chips').hidden = true; $('skip').hidden = true;
    $('send').textContent = 'Type what happened';
  } else if (state === 'ANSWERING') {
    const q = nextQuestion(category, answers);
    const all = questionsFor(category);
    const at = all.findIndex(x => q && x.k === q.k);
    $('progress').textContent = `Step 2 — question ${at < 0 ? all.length : at + 1} of ${all.length}`;
    $('send').textContent = 'Next';
    if (q) renderQuestion(q);
  } else if (inReview) {
    $('progress').textContent = 'Step 3 — check this is right';
    renderReview();
  }
  save();
}

/* ------------------------------------------------------------------ flow */
function startEdit(key) {
  editing = key;
  state = 'ANSWERING';
  if (key === null) { $('entry').value = description; $('asklabel').textContent = 'Type what happened, in your own words.'; state = 'DRAFT'; }
  else { delete answers[key]; }
  render();
  $('entry').focus();
}

function answer(value) {
  const v = String(value ?? '').trim();
  if (state === 'DRAFT') {
    if (!v) { turn('sys', 'Tell us what happened first — a sentence is enough.'); return; }
    description = v;
    category = categorise(v);
    ref = ref || newRef();
    state = advance('DRAFT', 'ANSWERING');
    turn('you', v);
    const label = (CATEGORIES.find(c => c.id === category) || {}).label || 'Something else';
    turn('sys', `Thanks. That reads like a ${label.toLowerCase()} matter, so a few follow-ups.`);
    track('dihac_check_start');
  } else if (state === 'ANSWERING') {
    const q = nextQuestion(category, answers);
    if (!q) { state = advance('ANSWERING', 'REVIEW'); render(); return; }
    if (!v && !q.optional) { turn('sys', 'We need that one to put this together.'); return; }
    answers[q.k] = v;
    turn('you', v || 'Skipped');
  }
  const next = nextQuestion(category, answers);
  if (state === 'ANSWERING' && !next) {
    state = advance('ANSWERING', 'REVIEW');
    turn('sys', 'That is everything. Check it below and send it when it looks right.');
  }
  $('entry').value = '';
  render();
  if (!$('ask').hidden) $('entry').focus();
}

function submit() {
  let result;
  try {
    result = structure({ description, category, answers, nowIso: new Date().toISOString(), referenceId: ref });
  } catch (err) {
    $('out').textContent = '';
    $('out').append(verdict('hold', 'We could not put this together', err.message));
    return;
  }
  state = advance('REVIEW', result.state);
  save();
  track('dihac_check_submit', { dihac_route: result.routing.ruleId });
  $('out').textContent = '';
  const ack = result.state === 'ACKNOWLEDGED';
  const v = verdict(ack ? 'ack' : 'hold',
    ack ? 'Received — a person will review this' : 'We are holding this for a person to look at',
    result.routing.because + ' ' + result.disclaimer);
  const code = document.createElement('code');
  code.textContent = 'Reference ' + (result.referenceId || '—');
  v.append(document.createElement('br'), code);
  $('out').append(v);
  render();
}

function verdict(kind, title, body) {
  const d = document.createElement('div');
  d.className = 'verdict ' + kind;
  const b = document.createElement('b'); b.textContent = title;
  d.append(b, document.createTextNode(body));
  return d;
}

/* ------------------------------------------------------------------ boot */
$('ask').addEventListener('submit', e => { e.preventDefault(); answer($('entry').value); });
$('skip').addEventListener('click', () => answer(''));
$('submitClaim').addEventListener('click', submit);
$('restart').addEventListener('click', () => {
  description = ''; category = 'other'; answers = {}; state = 'DRAFT'; ref = null;
  try { sessionStorage.removeItem(STORE); } catch {}
  $('thread').textContent = ''; $('out').textContent = ''; $('entry').value = '';
  render(); $('entry').focus();
});
$('entry').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && state !== 'DRAFT') { e.preventDefault(); answer($('entry').value); }
});

const y = $('year'); if (y) y.textContent = String(new Date().getFullYear());

const gate = voiceGate(window.DIHAC_CONFIG);
if (gate.enabled) {
  // Only reached when the domain owns a verified assistant. Never on a shut gate.
  import(/* webpackIgnore: true */ gate.config.sdkUrl).then(() => track('dihac_voice_available')).catch(() => {});
}

if (load()) {
  turn('sys', 'Picking up where you left off.');
  if (description) turn('you', description);
  render();
} else {
  render();
}
