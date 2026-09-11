// QA/QC round 3 guard (2026-09-11) — G1..G4 at the unit level, plus the G4 adversarial harness.
//   G1  lfma-brief-adapter lifecycle: bind never dereferences a null client; explicit failure path; one send.
//   G2  lfma/contact.html: real submission state; redirect only after confirmed success; safe retry.
//   G3  scanner catches bare known hook tokens (digest denylist) and Make-style bare tokens without flagging hashes.
//   G4  fail-closed safety contract: page-local consent.record() can never open the gate when the tenant's
//       consent store / suppression source is not CONNECTED; NOT_APPLICABLE is not an exemption.
// Browser reproductions: tests/domain-browser.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { scanText, KNOWN_TOKEN_HASHES, scan } from '../tools/scan-secrets.mjs';
import { bindLfmaBrief } from '../lfma/assets/lfma-brief-adapter.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const HOOK = 'https://hooks.invalid.test/nil-intake';
const BASE = { tenant_id: 'NIL', domain_id: 'nearestinjurylawyers.com', production_gate: 'live', kill_switch: 'OFF', kill_switch_source: 'MISSING' };
const CONNECTED = { ...BASE, consent_store: 'VERIFIED', suppression_source: 'VERIFIED' };
const NOT_CONNECTED = ['MISSING', 'NEEDS_AUTH', 'UNKNOWN', 'NOT_APPLICABLE', undefined, null, '', 'verified', 'ON', 'true'];

function boot(site, runtime = { tenant_id: 'NIL', hooks: { intake: HOOK, order: HOOK } }) {
  const calls = [];
  const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const w = { EE_SITE: site, EE_RUNTIME: runtime, dataLayer: [], location: { href: 'https://x.test/', search: '', pathname: '/' }, sessionStorage: storage(), localStorage: storage(),
    console: { warn() {} }, crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) }, fetch: (url, init) => { calls.push({ url, init }); return Promise.resolve({ ok: true }); }, URLSearchParams };
  const d = { referrer: '', querySelector: () => null, getElementById: () => null };
  const ctx = vm.createContext({ window: w, document: d, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp, Promise });
  vm.runInContext(read('shared/ee/bootstrap.js'), ctx);
  return { EE: w.EE, dl: w.dataLayer, calls, run: src => vm.runInContext(src, ctx) };
}
const record = EE => EE.safety.consent.record({ surface: 'form', consent_text_id: 'T-1', method: 'checkbox' });

// ================================================================= G4 — fail-closed safety contract
test('G4: with a CONNECTED consent store + suppression source, the gate opens only after evidence AND a completed clear check', () => {
  const b = boot(CONNECTED);
  assert.equal(b.EE.hooks.url('intake'), null); assert.equal(b.EE.hooks.why('intake'), 'no consent evidence recorded');
  record(b.EE);
  assert.equal(b.EE.hooks.url('intake'), null); assert.equal(b.EE.hooks.why('intake'), 'suppression check did not complete');
  b.EE.safety.suppression.use(() => ({ suppressed: true }));
  assert.equal(b.EE.hooks.url('intake'), null); assert.equal(b.EE.hooks.why('intake'), 'suppressed');
  b.EE.safety.suppression.use(() => { throw new Error('source down'); });
  assert.equal(b.EE.hooks.url('intake'), null, 'a failing suppression source fails closed');
  b.EE.safety.suppression.use(() => ({ suppressed: false }));
  assert.equal(b.EE.hooks.url('intake'), HOOK);
  const g = b.EE.outbound.allowed({});
  assert.equal(g.allowed, true); assert.equal(g.consent_store, 'VERIFIED'); assert.equal(g.suppression, 'checked:VERIFIED');
});

for (const cs of NOT_CONNECTED) {
  test(`G4 adversarial: consent_store=${JSON.stringify(cs)} — page JS calling consent.record() (repeatedly) never opens the gate`, () => {
    const b = boot({ ...CONNECTED, consent_store: cs });
    b.EE.safety.suppression.use(() => ({ suppressed: false }));
    for (let i = 0; i < 5; i++) record(b.EE);
    assert.equal(b.EE.safety.consent.state(), 'recorded', 'evidence is recorded locally');
    assert.equal(b.EE.hooks.url('intake'), null);
    assert.match(b.EE.hooks.why('intake'), /^consent store not connected: /);
    assert.equal(b.EE.outbound.allowed({}).allowed, false);
    assert.equal(b.calls.length, 0);
  });
}
for (const ss of NOT_CONNECTED) {
  test(`G4 adversarial: suppression_source=${JSON.stringify(ss)} — a page-registered clearing checker never opens the gate`, () => {
    const b = boot({ ...CONNECTED, suppression_source: ss });
    record(b.EE);
    b.EE.safety.suppression.use(() => ({ checked: true, suppressed: false, source: 'page-claims-authority' }));
    assert.equal(b.EE.hooks.url('intake'), null);
    assert.match(b.EE.hooks.why('intake'), /^suppression source not connected: /);
    assert.equal(b.EE.outbound.allowed({}).allowed, false);
  });
}

test('G4 adversarial: NOT_APPLICABLE is not an exemption for consent or suppression', () => {
  const a = boot({ ...CONNECTED, consent_store: 'NOT_APPLICABLE' }); record(a.EE); a.EE.safety.suppression.use(() => ({ suppressed: false }));
  assert.equal(a.EE.hooks.url('intake'), null); assert.equal(a.EE.hooks.why('intake'), 'consent store not connected: NOT_APPLICABLE');
  const s = boot({ ...CONNECTED, suppression_source: 'NOT_APPLICABLE' }); record(s.EE); s.EE.safety.suppression.use(() => ({ suppressed: false }));
  assert.equal(s.EE.hooks.url('intake'), null); assert.equal(s.EE.hooks.why('intake'), 'suppression source not connected: NOT_APPLICABLE');
});

test('G4 adversarial: page JS cannot promote the store/source or forge the gate after load', () => {
  const b = boot({ ...CONNECTED, consent_store: 'MISSING', suppression_source: 'MISSING' });
  record(b.EE); b.EE.safety.suppression.use(() => ({ suppressed: false }));
  for (const attack of [
    "try { window.EE.safety.consent.store = 'VERIFIED'; } catch (e) {}",
    "try { window.EE.safety.suppression.source = 'VERIFIED'; } catch (e) {}",
    "try { window.EE.outbound.allowed = function(){ return { allowed: true }; }; } catch (e) {}",
    "try { window.EE.hooks.url = function(){ return 'https://evil.test/x'; }; } catch (e) {}",
    "try { Object.defineProperty(window.EE.safety.consent, 'store', { value: 'VERIFIED' }); } catch (e) {}",
    "try { window.EE_SITE.consent_store = 'VERIFIED'; window.EE_SITE.suppression_source = 'VERIFIED'; } catch (e) {}",
    "try { window.EE = { hooks: { url: function(){ return 'https://evil.test/x'; } }, __stocked: true }; } catch (e) {}"
  ]) b.run(attack);
  assert.equal(b.EE.safety.consent.store, 'MISSING'); assert.equal(b.EE.safety.suppression.source, 'MISSING');
  assert.equal(b.run("window.EE.hooks.url('intake')"), null);
  assert.equal(b.run("window.EE.outbound.allowed({}).allowed"), false);
  assert.equal(b.calls.length, 0);
});

test('G4: kill switch must be exactly OFF, gate live and runtime tenant-matched even with a connected spine', () => {
  for (const site of [{ ...CONNECTED, kill_switch: 'ON' }, { ...CONNECTED, kill_switch: 'off ' }, { ...CONNECTED, kill_switch: undefined }, { ...CONNECTED, production_gate: 'preview' }]) {
    const b = boot(site); record(b.EE); b.EE.safety.suppression.use(() => ({ suppressed: false }));
    assert.equal(b.EE.hooks.url('intake'), null, JSON.stringify(site));
  }
  const rt = boot(CONNECTED, { tenant_id: 'LFMA', hooks: { intake: HOOK } }); record(rt.EE); rt.EE.safety.suppression.use(() => ({ suppressed: false }));
  assert.equal(rt.EE.hooks.url('intake'), null); assert.match(rt.EE.hooks.why('intake'), /runtime tenant mismatch/);
});

test('G4: every REAL tenant config in this tree fails closed today (no connected safety spine anywhere)', () => {
  const report = JSON.parse(read('stocking/report.json'));
  for (const t of report.tenants.canonical) {
    const site = JSON.parse(read(`${t.toLowerCase()}/ee/site.json`));
    const cs = site.sockets.consent.connection_status, ss = site.sockets.suppression.connection_status;
    assert.ok(!['VERIFIED', 'CURRENT'].includes(cs) || !['VERIFIED', 'CURRENT'].includes(ss), `${t} declares a connected spine`);
    const home = read(`${t.toLowerCase()}/index.html`);
    const cfg = JSON.parse(home.match(/window\.EE_SITE=Object\.freeze\((\{.*?\})\);<\/script>/)[1]);
    const b = boot(cfg, { tenant_id: t, hooks: { intake: HOOK, order: HOOK, lead: HOOK, contact: HOOK } });
    record(b.EE); b.EE.safety.suppression.use(() => ({ suppressed: false }));
    for (const name of ['intake', 'order', 'lead', 'contact']) assert.equal(b.EE.hooks.url(name), null, `${t}/${name} must be blocked`);
  }
});

// ================================================================= G1 — adapter lifecycle
function fakeForm({ valid = true } = {}) {
  const listeners = {};
  const button = { textContent: 'Send the brief', disabled: false, type: 'submit' };
  const el = tag => ({ tag, textContent: '', hidden: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, focus() {}, replaceChildren(...c) { this.children = c; } });
  const fields = { firm: 'Test Firm', name: 'QA', email: 'qa@example.test', tort: 'mva', geo: 'AZ', no: 'none', budget: '$10,000 — two weeks', intake: 'deliver' };
  const form = {
    hidden: false, ownerDocument: { createElement: el },
    querySelector: sel => (sel === 'button[type="submit"]' ? button : null),
    append() {}, addEventListener: (t, fn) => { listeners[t] = fn; }, removeEventListener() {},
    reportValidity: () => valid
  };
  const sent = el('div'); sent.hidden = true;
  const submit = () => listeners.submit({ preventDefault() {} });
  return { form, sent, button, submit, fields };
}
const fd = fields => ({ get: k => fields[k] ?? null, getAll: k => (fields[k] ? [fields[k]] : []), entries: () => Object.entries(fields), has: k => k in fields, forEach: fn => Object.entries(fields).forEach(([k, v]) => fn(v, k)) });

test('G1: binding with a function endpoint that resolves to null does not throw and reports IDLE; submit follows the explicit failure path; retry allowed', async () => {
  const f = fakeForm();
  globalThis.FormData = class { constructor() { return fd(f.fields); } };
  let bound;
  assert.doesNotThrow(() => { bound = bindLfmaBrief({ form: f.form, sent: f.sent, endpoint: () => null, sourceUrl: 'https://x.test/campaign/', dataLayer: [], fetchImpl: async () => ({ ok: true }) }); });
  assert.equal(bound.getState().phase, 'IDLE'); assert.equal(bound.getState().status, 'IDLE'); assert.equal(f.button.disabled, false, 'button usable');
  await f.submit(); await new Promise(r => setTimeout(r, 0));
  assert.equal(bound.getState().phase, 'IDLE', 'failure returns to IDLE');
  assert.equal(f.button.disabled, false, 'retry allowed'); assert.equal(f.button.textContent, 'Send the brief');
  assert.equal(f.sent.hidden, true, 'no fake success'); assert.equal(f.form.hidden, false);
});

test('G1: a configured endpoint follows exactly one send/success path; a second submit during flight or after success never sends again', async () => {
  const f = fakeForm();
  globalThis.FormData = class { constructor() { return fd(f.fields); } };
  const sends = [];
  let release; const gate = new Promise(r => { release = r; });
  // the intake client only ACKNOWLEDGES a JSON {ok:true} response; anything else is an uncertain receipt
  const fetchImpl = async (url, init) => { sends.push({ url, init }); await gate; return { ok: true, status: 200, type: 'basic', headers: { get: () => 'application/json' }, json: async () => ({ ok: true }) }; };
  const bound = bindLfmaBrief({ form: f.form, sent: f.sent, endpoint: () => 'https://hook.us2.make.com/' + 'a'.repeat(20), sourceUrl: 'https://x.test/campaign/', dataLayer: [], fetchImpl });
  const p1 = f.submit(); await new Promise(r => setTimeout(r, 0));
  assert.equal(bound.getState().phase, 'SUBMITTING');
  await f.submit(); await f.submit();
  release(); await p1; await new Promise(r => setTimeout(r, 0));
  assert.equal(sends.length, 1, 'exactly one POST');
  assert.equal(bound.getState().phase, 'ACKNOWLEDGED'); assert.equal(f.sent.hidden, false); assert.equal(f.form.hidden, true);
  await f.submit(); assert.equal(sends.length, 1, 'no send after success');
});

test('G1: adapter source never dereferences client.getState while client may be null', () => {
  const src = read('lfma/assets/lfma-brief-adapter.mjs');
  assert.doesNotMatch(src, /getState: client\.getState/);
  assert.match(src, /const state = \(\) => \(client \? client\.getState\(\) : idleState\)/);
  for (const m of src.matchAll(/client\.getState\(\)/g)) {
    const before = src.slice(Math.max(0, m.index - 12), m.index);
    assert.match(before, /client \? $/, `unguarded client.getState() near: ${src.slice(m.index - 40, m.index + 20)}`);
  }
});

// ================================================================= G2 — contact form state machine
test('G2: lfma/contact.html has real submission state: guard, in-flight lock, success only after res.ok, visible failure, retry', () => {
  const html = read('lfma/contact.html');
  const script = html.slice(html.indexOf("var form = document.getElementById('agency-contact-form')"), html.indexOf('<!-- ee:socket -->'));
  assert.match(script, /if \(phase !== 'idle'\) return;/);
  assert.match(script, /phase = 'sending';/);
  assert.match(script, /if \(!res\.ok\) throw new Error/);
  assert.match(script, /phase = 'sent';\s*[\s\S]*?window\.location\.href = 'thank-you\.html';/);
  assert.doesNotMatch(script, /setTimeout\(function\(\) \{ window\.location\.href/, 'no timer-based fake success');
  assert.match(script, /function fail\(message\) \{\s*phase = 'idle';/);
  assert.match(script, /\.catch\(function \(\) \{\s*fail\(/);
  assert.match(script, /if \(!hook\) \{ fail\(/);
  assert.match(script, /if \(!ee\) \{ fail\(/);
  assert.equal((script.match(/fetch\(hook/g) || []).length, 1);
  assert.equal((html.match(/addEventListener\('submit'/g) || []).length, 1);
});

// ================================================================= G3 — scanner
test('G3: scanner flags Make-style bare hook tokens and known exposed tokens by digest, but not hashes/commits/uuids', () => {
  const bare = ['abcdefghjkmn', 'pqrstuvwxyz0', '12345678'].join(''); // assembled at runtime so this file never contains a bare token
  assert.equal(bare.length, 32);
  assert.ok(scanText(`Hook preserved: \`${bare}\`, one occurrence`).some(h => h.pattern === 'bare_make_style_hook_token'));
  assert.ok(scanText(`/${bare}`).some(h => h.pattern === 'bare_make_style_hook_token'));
  assert.deepEqual(scanText('**Deployed commit:** `0123456789abcdef0123456789abcdef41e47fa0`'), [], '40-hex commit is not flagged');
  assert.deepEqual(scanText('md5 0123456789abcdef0123456789abcdef'), [], '32-hex hash is not flagged');
  assert.deepEqual(scanText('blob `' + bare + 'e8c19de6`'), [], 'longer words are not 32-char tokens');
  assert.deepEqual(scanText('id 550e8400-e29b-41d4-a716-446655440000'), [], 'uuid not flagged');
  assert.ok(scanText('see ' + ['hooks', 'catch', '2296909', 'abcdefg', ''].join('/') + ' here').some(h => h.pattern === 'zapier_catch_path_fragment'), 'bare zapier path fragment');
  assert.deepEqual(scanText('hooks/catch/12/abc'), []);
  const synthetic = 'synthetictokenfordigesttest';
  const digest = crypto.createHash('sha256').update(synthetic).digest('hex');
  assert.ok(scanText(`x ${synthetic} y`, { hashes: new Set([digest]) }).some(h => h.pattern === 'known_exposed_hook_token'));
  assert.deepEqual(scanText(`x ${synthetic} y`), [], 'not flagged without the digest');
  assert.ok(KNOWN_TOKEN_HASHES.size >= 6, 'the six historically exposed hook tokens are in the denylist');
  for (const h of KNOWN_TOKEN_HASHES) assert.match(h, /^[0-9a-f]{64}$/);
  for (const sample of scanText('anything').map(h => h.sample)) assert.ok(sample.length < 20, 'samples are masked');
});

test('G3: the current tracked tree scans clean, including the LFMA receipt release note', () => {
  const r = scan(ROOT);
  assert.deepEqual(r.hits, []);
  assert.doesNotMatch(read('releases/2026-09-09-lfma-receipt.md'), /Hook preserved: `/);
  assert.match(read('releases/2026-09-09-lfma-receipt.md'), /Hook identifier redacted 2026-09-11/);
});
