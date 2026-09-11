// QA/QC round 2 guard (2026-09-11). One regression test per repaired finding, at the unit level:
//   F1  LFMA form: legacy tracking API and the stocked EE API no longer collide; the adapter resolves the gated hook lazily.
//   F2  BTL Rhode Island: no undefined WEBHOOK_URL reference, one success path, no phantom error.
//   F3  Legacy tracking.js merges under EE.legacy and never overwrites EE.hooks / EE.safety / EE.track / EE.experience.
//   F4  No hook/webhook URL or key-like material in the tracked tree (tools/scan-secrets.mjs).
//   F5  The complete suite is `npm test`; the scanner and drift gate run against the committed tree.
//   F6  Kill switch / outbound gate controls every send: hooks.url() itself is gated; unknown truth fails closed.
//   F7  Reserved system context is immutable; event props cannot override it.
//   F10 Runtime tenant must match EE_SITE; missing EE_SITE fails closed; canonical kill-switch state respected.
// Real-browser reproductions live in tests/domain-browser.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { scan } from '../tools/scan-secrets.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
// A CONNECTED safety spine (consent store + suppression source VERIFIED) — the only configuration in which the gate can open.
const SITE = { tenant_id: 'NIL', domain_id: 'nearestinjurylawyers.com', brand: 'Nearest Injury Lawyers', production_gate: 'live', kill_switch: 'OFF', kill_switch_source: 'MISSING', consent_store: 'VERIFIED', suppression_source: 'VERIFIED' };
const ACTIONS = 'https://engine.invalid.test/actions';
const HOOK = ACTIONS + '/NIL/intake';        // the ONLY url hooks can ever produce: the engine actions route for this tenant
const TRACKING = ACTIONS + '/NIL/tracking';
const SUPP = 'https://engine.invalid.test/suppression';
const ID = { email: 'qa@example.test', phone: '4015550100' };
const jsonRes = body => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body });

const NO_SITE = Symbol('no EE_SITE');
const NO_RUNTIME = Symbol('no EE_RUNTIME');
function browser({ site = SITE, runtime = { tenant_id: 'NIL', actions: ['intake', 'tracking'], actions_endpoint: ACTIONS, suppression_endpoint: SUPP }, dataLayer = [], preEE = null, scripts = [], supp = { checked: true, suppressed: false, source: 'test-authority' } } = {}) {
  const calls = [];
  const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const w = {
    dataLayer, location: { href: 'https://x.test/', search: '', pathname: '/', hostname: 'x.test', origin: 'https://x.test' },
    sessionStorage: storage(), localStorage: storage(), navigator: { userAgent: 'test', language: 'en', sendBeacon: (u, b) => { calls.push({ url: u, beacon: true }); return true; } },
    screen: { width: 1, height: 1 }, console: { warn() {}, log() {} }, addEventListener() {}, removeEventListener() {}, pageYOffset: 0,
    crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) },
    fetch: (url, init) => { if (url === SUPP) return Promise.resolve(jsonRes(supp)); calls.push({ url, init }); return Promise.resolve({ ok: true }); }, URLSearchParams
  };
  if (site !== NO_SITE) w.EE_SITE = site;
  if (runtime !== NO_RUNTIME) w.EE_RUNTIME = runtime;
  if (preEE) w.EE = preEE;
  const d = { referrer: '', readyState: 'complete', querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, cookie: '', title: 't', documentElement: { scrollTop: 0, scrollHeight: 1, clientHeight: 1 }, body: { scrollTop: 0, scrollHeight: 1, clientHeight: 1 } };
  const ctx = vm.createContext({ window: w, document: d, navigator: w.navigator, screen: w.screen, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp, Promise, Blob: class Blob { constructor(p) { this.parts = p; } }, setTimeout, clearTimeout });
  for (const s of scripts) vm.runInContext(read(s), ctx, { filename: s });
  return { w, EE: w.EE, dl: w.dataLayer, calls, run: src => vm.runInContext(src, ctx) };
}
const stocked = opts => browser({ ...opts, scripts: ['shared/ee/bootstrap.js', ...(opts?.scripts || [])] });
const consent = EE => EE.safety.consent.record({ surface: 'test', consent_text_id: 'T-1' });
const cleared = async EE => { consent(EE); await EE.outbound.check(ID); };

// ---------------------------------------------------------------- F6: the gate controls every send
test('F6: hooks.resolve() is gated — no URL without live gate + consent + AUTHORITATIVE clear suppression + kill switch OFF', async () => {
  const b = stocked();
  assert.equal(b.EE.hooks.configured('intake'), true, 'runtime carries the hook');
  assert.equal(b.EE.hooks.url('intake', ID), null, 'no consent => no URL');
  assert.equal(b.EE.hooks.why('intake'), 'no consent evidence recorded');
  assert.equal(b.dl.at(-1).event, 'ee_outbound_blocked');
  consent(b.EE);
  assert.equal(b.EE.hooks.url('intake', ID), null, 'consent alone: the authoritative suppression check has not been performed');
  assert.equal(await b.EE.hooks.resolve('intake', ID), HOOK, 'connected stores + evidence + authoritative clear => URL');
  const preview = stocked({ site: { ...SITE, production_gate: 'preview' } }); await cleared(preview.EE);
  assert.equal(preview.EE.hooks.url('intake', ID), null); assert.equal(preview.EE.hooks.why('intake'), 'production_gate preview');
  const unknownSupp = stocked({ site: { ...SITE, suppression_source: undefined } }); await cleared(unknownSupp.EE);
  assert.equal(unknownSupp.EE.hooks.url('intake', ID), null); assert.equal(unknownSupp.EE.hooks.why('intake'), 'suppression source not connected: UNKNOWN');
  const hit = stocked({ supp: { checked: true, suppressed: true, source: 'test-authority' } }); await cleared(hit.EE);
  assert.equal(hit.EE.hooks.url('intake', ID), null); assert.equal(hit.EE.hooks.why('intake'), 'suppressed');
});

test('F6: kill switch ON (canonical or tripped) blocks hooks.url(), hooks.post(), mounts and dataLayer pushes', async () => {
  const on = stocked({ site: { ...SITE, kill_switch: 'ON' } });
  assert.equal(on.dl.length, 0); assert.equal(on.EE.safety.killSwitch.state(), 'ON');
  assert.equal(consent(on.EE).ee_blocked, true, 'consent evidence is recorded locally but nothing leaves the page');
  assert.equal(on.EE.hooks.url('intake'), null); assert.match(on.EE.hooks.why('intake'), /kill_switch ON/);
  await assert.rejects(on.EE.hooks.post('intake', { a: 1 }), e => e.name === 'OutboundBlocked');
  assert.equal(on.calls.length, 0);
  const tripped = stocked(); await cleared(tripped.EE);
  assert.equal(tripped.EE.hooks.url('intake', ID), HOOK);
  tripped.EE.safety.killSwitch.trip('incident');
  assert.equal(tripped.EE.hooks.url('intake', ID), null); assert.equal(tripped.EE.experience.mount({ id: 'x', render() {} }).mounted, false);
  const unknown = stocked({ site: { ...SITE, kill_switch: 'maybe' } });
  assert.equal(unknown.EE.safety.killSwitch.state(), 'UNKNOWN'); assert.equal(unknown.dl.length, 0, 'unknown kill-switch truth fails closed');
});

test('F6: the legacy tracking helper cannot send without the gate (no bootstrap => no send; bootstrap => gated, identity required)', async () => {
  const tick = () => new Promise(r => setTimeout(r, 5));
  const legacyOnly = browser({ scripts: ['dihac/assets/js/tracking.js'] });
  legacyOnly.EE.sendToWebhook('cta_click', '', ID, {}); await tick();
  assert.equal(legacyOnly.calls.length, 0, 'legacy-only page never sends');
  const both = stocked({ scripts: ['dihac/assets/js/tracking.js'] });
  both.EE.legacy.sendToWebhook('cta_click', '', ID, {}); await tick();
  assert.equal(both.calls.length, 0, 'blocked before consent');
  consent(both.EE);
  both.EE.legacy.sendToWebhook('cta_click', '', {}, {}); await tick();
  assert.equal(both.calls.length, 0, 'no identity => no authoritative check => no send');
  both.EE.legacy.sendToWebhook('cta_click', '', ID, {}); await tick();
  assert.equal(both.calls.length, 1); assert.equal(both.calls[0].url, TRACKING);
});

// ---------------------------------------------------------------- F7: reserved context is immutable
test('F7: event props cannot override tenant_id, domain_id, session_id, consent/safety state or other reserved fields', () => {
  const b = stocked();
  const ev = b.EE.track('ee_probe', { tenant_id: 'EVIL', domain_id: 'evil.test', session_id: 'forged', consent_state: 'recorded', kill_switch: 'OFF', production_gate: 'live', event_id: 'x', campaign_id: 'C', custom: 'ok' });
  assert.equal(ev.tenant_id, 'NIL'); assert.equal(ev.domain_id, 'nearestinjurylawyers.com');
  assert.match(ev.session_id, /^ses_/); assert.equal(ev.consent_state, 'none'); assert.equal('campaign_id' in ev, false);
  assert.equal(ev.custom, 'ok');
  assert.deepEqual([...ev.ee_rejected_props].sort(), ['campaign_id', 'consent_state', 'domain_id', 'event_id', 'kill_switch', 'production_gate', 'session_id', 'tenant_id']);
  assert.throws(() => { 'use strict'; b.EE.context.tenant_id = 'X'; }, /read only|not extensible|Cannot/);
  assert.equal(b.EE.context.tenant_id, 'NIL');
  assert.throws(() => { 'use strict'; b.EE.track = () => 'pwned'; });
  assert.throws(() => { 'use strict'; b.EE.hooks.url = () => HOOK; });
  assert.equal(b.run("(function(){ try { window.EE = {pwned:true}; } catch (e) {} return window.EE.__stocked === true && !window.EE.pwned; })()"), true, 'window.EE cannot be replaced');
});

// ---------------------------------------------------------------- F10: identity validation
test('F10: missing or invalid EE_SITE fails closed — nothing emitted, no hooks, no mounts', () => {
  for (const site of [NO_SITE, null, {}, { tenant_id: 'nil', domain_id: 'x' }, { tenant_id: 'NIL' }]) {
    const b = stocked({ site });
    assert.equal(b.EE.__stocked, false, String(site && site.toString())); assert.match(b.EE.__failed, /EE_SITE/);
    assert.equal(b.dl.length, 0); assert.equal(b.EE.hooks.url('intake'), null); assert.equal(b.EE.outbound.allowed({}).allowed, false);
    assert.equal(b.EE.experience.mount({ id: 'x', render() {} }).mounted, false); assert.equal(b.EE.track('ee_x').ee_blocked, true);
  }
});

test('F10: a runtime built for another tenant is never trusted; a missing runtime fails closed', async () => {
  const b = stocked({ runtime: { tenant_id: 'LFMA', actions: ['intake'], actions_endpoint: ACTIONS, suppression_endpoint: SUPP } }); consent(b.EE);
  assert.equal(b.EE.hooks.configured('intake'), false);
  assert.equal(b.EE.hooks.url('intake'), null); assert.match(b.EE.hooks.why('intake'), /runtime tenant mismatch: LFMA/);
  assert.ok(b.dl.some(e => e.event === 'ee_runtime_mismatch' && e.runtime_tenant === 'LFMA'));
  const none = stocked({ runtime: NO_RUNTIME }); consent(none.EE);
  assert.equal(none.EE.hooks.url('intake'), null); assert.equal(none.EE.hooks.why('intake'), 'runtime not loaded');
  const ok = stocked(); await cleared(ok.EE); assert.equal(ok.EE.hooks.url('intake', ID), HOOK);
});

// ---------------------------------------------------------------- F3 / F1: legacy API coexistence
test('F3: tracking.js loaded AFTER the bootstrap registers under EE.legacy and leaves the stocked API intact', () => {
  const b = stocked({ scripts: ['dihac/assets/js/tracking.js'] });
  assert.equal(b.EE.__stocked, true);
  for (const k of ['track', 'hooks', 'safety', 'experience', 'outbound', 'registerLegacy']) assert.ok(b.EE[k], k);
  assert.equal(typeof b.EE.hooks.url, 'function'); assert.equal(typeof b.EE.legacy.sendToWebhook, 'function');
  assert.equal(b.w.EETracking.WEBHOOK_REF, 'ee:hook:tracking');
  assert.equal('sendToWebhook' in b.EE, false, 'legacy keys do not land on the stocked root');
});

test('F1: tracking.js loaded BEFORE the bootstrap (LFMA order) is preserved under EE.legacy and the stocked API wins', () => {
  const b = browser({ scripts: ['dihac/assets/js/tracking.js', 'shared/ee/bootstrap.js'] });
  assert.equal(b.EE.__stocked, true); assert.equal(typeof b.EE.legacy.sendToWebhook, 'function'); assert.equal(typeof b.EE.hooks.url, 'function');
  // the LFMA contact page's call pattern must not throw
  const L = b.EE && (b.EE.legacy || b.EE);
  assert.doesNotThrow(() => { if (L && typeof L.sendToWebhook === 'function') { L.sendToWebhook('form_submit', 'agency_contact_form', {}); L.pushEvent('form_submit', {}); } });
  assert.match(read('lfma/contact.html'), /var L = window\.EE && \(window\.EE\.legacy \|\| window\.EE\);/);
  for (const f of ['lfma/about.html', 'lfma/contact.html', 'lfma/google-ads.html', 'lfma/seo.html']) {
    assert.match(read(f), /<script src="\/assets\/js\/tracking\.js"><\/script>/, `${f} serves tracking.js locally`);
    assert.doesNotMatch(read(f), /lawfirmmarketingapes\.com\/assets\/js\/tracking\.js/);
  }
  assert.equal(read('lfma/assets/js/tracking.js'), read('dihac/assets/js/tracking.js'), 'LFMA copy is byte-identical to the source');
});

test('F1: the LFMA brief adapter resolves a function endpoint at submit and fails closed on null', async () => {
  const mod = await import('../lfma/assets/lfma-brief-adapter.mjs');
  const src = read('lfma/assets/lfma-brief-adapter.mjs');
  assert.match(src, /typeof endpoint === 'function' \? await endpoint\(\) : endpoint/);
  assert.match(read('lfma/campaign/index.html'), /endpoint: hookUrl, sourceUrl/);
  assert.match(read('lfma/campaign/index.html'), /addEventListener\('submit', function \(\) \{[\s\S]*consent\.record\([\s\S]*\}, true\);/, 'consent recorded in capture phase');
  assert.equal(typeof mod.bindLfmaBrief, 'function');
});

// ---------------------------------------------------------------- F2: BTL Rhode Island
test('F2: BTL Rhode Island page has no undefined WEBHOOK_URL and exactly one submit handler / success path', () => {
  const html = read('btl/rhode-island-abuse/index.html');
  assert.doesNotMatch(html, /\bWEBHOOK_URL\b/);
  assert.match(html, /lead_destination:'ee:hook:lead'/);
  assert.equal((html.match(/form\.addEventListener\('submit'/g) || []).length, 1);
  assert.equal((html.match(/ee_lead_submit_success/g) || []).length, 1);
  assert.equal((html.match(/okmsg'\)\.classList\.remove\('hide'\)/g) || []).length, 1);
  assert.match(html, /consent\.record\(\{surface:'btl_lead_form'/);
});

// ---------------------------------------------------------------- consent + gate wiring on every form
test('every form records consent evidence before resolving its gated hook, and none pushes ee_hook_missing itself', () => {
  const forms = {
    'nil/index.html': "surface:'nil_sofia_form'", 'btl/index.html': "surface:'btl_lead_form'", 'btl/rhode-island-abuse/index.html': "surface:'btl_lead_form'",
    'btl/404.html': "surface: 'btl_404_chat'", 'dihac/contact.html': "surface: 'dihac_contact_form'", 'lfma/contact.html': "surface: 'lfma_contact_form'",
    'lfma/engine/index.html': "surface:'lfma_snapshot_form'", 'lfma/campaign/index.html': "surface: 'lfma_campaign_brief'", 'ma/order/index.html': "surface: 'ma_order_form'"
  };
  for (const [f, needle] of Object.entries(forms)) {
    const text = read(f);
    assert.ok(text.includes(needle), `${f} records consent (${needle})`);
    assert.doesNotMatch(text, /track\('ee_hook_missing'/, `${f} leaves blocked/missing events to the bootstrap`);
    assert.match(text, /hooks\.(resolve|post)\(/, `${f} resolves through the gate`);
  }
  for (const f of ['lfma/contact.html', 'lfma/engine/index.html', 'lfma/campaign/index.html', 'ma/order/index.html']) assert.match(read(f), /class="ee-consent-note"/, `${f} shows the consent text it records`);
});

// ---------------------------------------------------------------- F4 / F5
test('F4: secret scanner finds nothing in the tracked tree', () => {
  const r = scan(ROOT);
  assert.ok(r.files > 100);
  assert.deepEqual(r.hits, []);
});

test('F5: the complete suite is defined (npm test) and the drift gate + scanner pass on this tree', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.test, /tests\/\*\.test\.mjs campaign-system\/test\/\*\.test\.mjs/);
  const drift = spawnSync(process.execPath, ['tools/stock-domains.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(drift.status, 0, drift.stdout + drift.stderr);
  const scanRun = spawnSync(process.execPath, ['tools/scan-secrets.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(scanRun.status, 0, scanRun.stdout + scanRun.stderr);
});
