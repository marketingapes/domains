// QA/QC round 5 guard (2026-09-11) — PROVIDER ISOLATION.
// Rejected candidate 450fb05: build.sh emitted raw provider hook URLs into the publicly served /ee/runtime.js as
// window.EE_RUNTIME.hooks, so page JS could fetch() the provider directly and bypass every gate. Contract now:
//   page -> named action -> Evolution Engine governed server-side adapter (EE_RUNTIME.actions_endpoint) -> provider.
// The page never possesses a provider URL or credential. The page-side gate is a fail-closed PRE-CHECK; the engine is
// the enforcement boundary. Nothing here relies on Object.freeze / closures / naming / hidden globals to keep a secret,
// because there is no secret in the browser to keep. Every test below fails on 450fb05 and passes now.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ACTIONS = 'https://engine.invalid.test/actions';
const SUPP = 'https://engine.invalid.test/suppression';
const PROVIDER = 'https://provider-hooks.invalid.test/legacy/secret-path';
const ROUTE = ACTIONS + '/NIL/intake';
const ID = { email: 'qa@example.test', phone: '(401) 555-0100' };
const CONNECTED = { tenant_id: 'NIL', domain_id: 'nearestinjurylawyers.com', production_gate: 'live', kill_switch: 'OFF', consent_store: 'VERIFIED', suppression_source: 'VERIFIED' };
const RUNTIME = { tenant_id: 'NIL', actions: ['intake', 'tracking'], actions_endpoint: ACTIONS, suppression_endpoint: SUPP };
const jsonRes = body => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body });
const NO_RUNTIME = Symbol('no runtime');
const plain = v => JSON.parse(JSON.stringify(v)); // vm contexts have their own Array/Object realms

function boot({ site = CONNECTED, runtime = RUNTIME, supp = { checked: true, suppressed: false, source: 'test-authority' } } = {}) {
  const calls = [], lookups = [];
  const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const w = { EE_SITE: site, dataLayer: [], location: { href: 'https://x.test/p?ee_campaign=C-1', search: '?ee_campaign=C-1', pathname: '/p' }, sessionStorage: storage(), localStorage: storage(),
    console: { warn() {} }, crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) }, URLSearchParams,
    fetch: (url, init) => {
      if (url === SUPP) { lookups.push(init); return Promise.resolve(jsonRes(supp)); }
      calls.push({ url, init }); return Promise.resolve({ ok: true, status: 200 });
    } };
  if (runtime !== NO_RUNTIME) w.EE_RUNTIME = runtime;
  const d = { referrer: '', querySelector: () => null, getElementById: () => null };
  const ctx = vm.createContext({ window: w, document: d, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp, Promise, setTimeout, clearTimeout });
  vm.runInContext(read('shared/ee/bootstrap.js'), ctx);
  return { EE: w.EE, dl: w.dataLayer, calls, lookups, w, run: src => vm.runInContext(src, ctx) };
}
const consent = EE => EE.safety.consent.record({ surface: 'form', consent_text_id: 'T-1', method: 'checkbox' });
const cleared = async b => { consent(b.EE); await b.EE.outbound.check(ID); return b; };
// every string reachable from an object graph (own property names incl. non-enumerable, function sources, 8 levels)
function reachableStrings(root) {
  const seen = new Set(), out = [];
  (function walk(v, depth) {
    if (depth > 8 || v == null) return;
    if (typeof v === 'string') { out.push(v); return; }
    if (typeof v === 'function') { out.push(String(v)); }
    if (typeof v !== 'object' && typeof v !== 'function') return;
    if (seen.has(v)) return; seen.add(v);
    for (const k of Object.getOwnPropertyNames(v)) { const dsc = Object.getOwnPropertyDescriptor(v, k); if (dsc && 'value' in dsc) walk(dsc.value, depth + 1); }
  })(root, 0);
  return out;
}
const ENV_PROVIDER = { EE_ACTIONS_NIL_ENDPOINT: ACTIONS, EE_ACTIONS_NIL_NAMES: 'intake', EE_HOOK_NIL_INTAKE: PROVIDER, EE_HOOK_LFMA_ORDER: PROVIDER + '/lfma', EE_SUPPRESSION_NIL_ENDPOINT: SUPP };

// ================================================================= build: the served tree never carries a provider URL
test('R5 build: build.sh never writes a provider URL (legacy EE_HOOK_* value) into any served file; runtime.js carries names + engine endpoints only', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r5-build-'));
  try {
    fs.cpSync(path.join(ROOT, 'build.sh'), path.join(tmp, 'build.sh'));
    for (const t of ['nil', 'lfma', 'cgg']) fs.cpSync(path.join(ROOT, t), path.join(tmp, t), { recursive: true });
    const r = spawnSync('sh', ['build.sh'], { cwd: tmp, encoding: 'utf8', env: { ...process.env, ...ENV_PROVIDER } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /warn EE_HOOK_NIL_INTAKE: provider hook URLs are never emitted to the page/);
    assert.match(r.stderr, /warn EE_HOOK_LFMA_ORDER/);
    const files = execFileSync('find', ['.', '-type', 'f'], { cwd: tmp, encoding: 'utf8' }).split('\n').filter(Boolean);
    assert.ok(files.length > 20);
    for (const f of files) assert.doesNotMatch(fs.readFileSync(path.join(tmp, f), 'latin1'), /provider-hooks\.invalid\.test|secret-path/, `${f} carries the provider URL`);
    const load = src => { const w = {}; vm.runInNewContext(src, { window: w, Object }); return JSON.parse(JSON.stringify(w.EE_RUNTIME)); };
    assert.deepEqual(load(fs.readFileSync(path.join(tmp, 'nil/ee/runtime.js'), 'utf8')), { tenant_id: 'NIL', actions: ['intake'], actions_endpoint: ACTIONS, suppression_endpoint: SUPP });
    assert.deepEqual(load(fs.readFileSync(path.join(tmp, 'lfma/ee/runtime.js'), 'utf8')), { tenant_id: 'LFMA', actions: ['order'], actions_endpoint: null, suppression_endpoint: null }, 'legacy name kept, value discarded, no endpoint => fails closed');
    assert.deepEqual(load(fs.readFileSync(path.join(tmp, 'cgg/ee/runtime.js'), 'utf8')), { tenant_id: 'CGG', actions: [], actions_endpoint: null, suppression_endpoint: null });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.doesNotMatch(read('build.sh'), /hooks:\{/, 'build.sh has no hook-map emission left');
  assert.doesNotMatch(read('build.sh'), /"\$hooks"|hooks="\$hooks/, 'build.sh accumulates no hook URLs');
});

test('R5 static: no page, shared script or doc claims a provider URL is injected into the browser-readable runtime.js', () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(f => /\.(html|js|mjs|md)$/.test(f) && !f.startsWith('releases/') && !f.startsWith('tests/'));
  for (const f of tracked) {
    const t = read(f);
    if (!f.endsWith('.md')) assert.doesNotMatch(t, /EE_RUNTIME\.hooks|rt\.hooks\[|\.hooks\[name\]/, `${f} still references the removed hook map`);
    assert.doesNotMatch(t, /Render injects them at build time into \/ee\/runtime\.js/, `${f} still claims hook URLs are injected into runtime.js`);
  }
  for (const f of ['nil/index.html', 'btl/index.html', 'btl/rhode-island-abuse/index.html', 'btl/404.html', 'dihac/contact.html', 'lfma/contact.html', 'lfma/engine/index.html', 'ma/order/index.html', 'dihac/assets/js/tracking.js']) {
    const t = read(f);
    assert.match(t, /hooks\.post\(/, `${f} sends through the governed action`);
    assert.doesNotMatch(t, /sendBeacon\(\s*(WEBHOOK_URL|url|hook)/, `${f} has no beacon to a resolved URL`);
    assert.doesNotMatch(t, /fetch\((WEBHOOK_URL|hook|url)\b/, `${f} fetches no resolved URL itself`);
  }
  assert.match(read('shared/ee/README.md'), /PROVIDER ISOLATION|never receives a provider/i);
  assert.match(read('shared/ee/bootstrap.js'), /PROVIDER ISOLATION/);
});

// ================================================================= bootstrap: the page cannot obtain a provider destination
test('R5 bootstrap: a runtime carrying a legacy hook map (the rejected shape) is ignored — no API, property or function source ever yields the provider URL', async () => {
  const b = await cleared(boot({ runtime: { ...RUNTIME, hooks: { intake: PROVIDER, order: PROVIDER } } }));
  assert.equal(b.EE.hooks.url('intake', ID), ROUTE, 'only the engine route exists');
  assert.equal(await b.EE.hooks.resolve('intake', ID), ROUTE);
  assert.deepEqual(plain(b.EE.hooks.actions()), ['intake', 'tracking']);
  const strings = reachableStrings(b.EE);
  assert.ok(strings.length > 20);
  assert.deepEqual(strings.filter(s => s.includes('provider-hooks') || s.includes('secret-path')), [], 'nothing reachable from window.EE names the provider');
  assert.equal(b.run("JSON.stringify(window.EE_RUNTIME).indexOf('provider-hooks') >= 0"), true, 'the (adversarial) global still holds it, but...');
  await b.EE.hooks.post('intake', { a: 1 }, { identity: ID });
  assert.equal(b.calls.length, 1); assert.equal(b.calls[0].url, ROUTE, '...the transport only ever targets the engine route');
});

test('R5 bootstrap: the only URL shape hooks can produce is <actions_endpoint>/<TENANT>/<action>; action names are validated and path traversal is impossible', async () => {
  const b = await cleared(boot());
  for (const name of ['INTAKE', 'intake/../LFMA/order', '../suppression', 'intake?x=1', '', null, undefined, {}, 42, 'order', 'a'.repeat(41)]) {
    assert.equal(b.EE.hooks.url(name, ID), null, `refused: ${String(name)}`);
    assert.equal(b.EE.hooks.why(name), 'action not configured');
    await assert.rejects(b.EE.hooks.post(name, {}, { identity: ID }), e => e.name === 'HookMissing' && e.reason === 'action not configured');
  }
  assert.equal(b.calls.length, 0);
  assert.equal(b.EE.hooks.url('intake', ID), ROUTE);
  const weird = await cleared(boot({ runtime: { ...RUNTIME, actions: ['intake', 'Bad-Name', 'ok_1', 42, null, 'intake'], actions_endpoint: ACTIONS + '///' } }));
  assert.deepEqual(plain(weird.EE.hooks.actions()), ['intake', 'ok_1'], 'invalid names dropped, duplicates collapsed');
  assert.equal(weird.EE.hooks.url('intake', ID), ROUTE, 'trailing slashes normalised');
  for (const ep of ['http://engine.invalid.test/actions', 'javascript:alert(1)', 'https://engine.invalid.test/a b', '', null, 42]) {
    const bad = await cleared(boot({ runtime: { ...RUNTIME, actions_endpoint: ep } }));
    assert.equal(bad.EE.hooks.configured('intake'), false, String(ep));
    assert.equal(bad.EE.hooks.url('intake', ID), null); assert.equal(bad.EE.hooks.why('intake'), 'governed actions endpoint unavailable');
    await assert.rejects(bad.EE.hooks.post('intake', {}, { identity: ID }), e => e.name === 'HookMissing' && /unavailable/.test(e.reason));
    assert.equal(bad.calls.length, 0);
  }
});

test('R5 bootstrap: post() sends the governed envelope to the engine route only — identity, consent evidence, suppression status, payload, tenant headers, credentials omitted', async () => {
  const b = await cleared(boot());
  const res = await b.EE.hooks.post('intake', { lead_id: 'L-1', tenant_id: 'EVIL' }, { identity: ID });
  assert.equal(res.ok, true);
  assert.equal(b.calls.length, 1);
  const { url, init } = b.calls[0];
  assert.equal(url, ROUTE);
  assert.equal(init.method, 'POST'); assert.equal(init.credentials, 'omit'); assert.equal(init.keepalive, true);
  assert.deepEqual(plain(init.headers), { 'X-EE-Tenant': 'NIL', 'X-EE-Action': 'intake', 'Content-Type': 'application/json' });
  const env = JSON.parse(init.body);
  assert.equal(env.ee_system_id, 'evolution_engine'); assert.equal(env.ee_bootstrap_version, 'stocking-v1.3');
  assert.equal(env.tenant_id, 'NIL'); assert.equal(env.domain_id, 'nearestinjurylawyers.com'); assert.equal(env.action, 'intake');
  assert.match(env.session_id, /^ses_/); assert.match(env.page_view_id, /^pv_/); assert.equal(env.campaign_id, 'C-1'); assert.equal(env.variant_id, null);
  assert.deepEqual(env.identity, { email: 'qa@example.test', phone: '4015550100' });
  assert.equal(env.consent.consent_text_id, 'T-1'); assert.equal(env.consent.evidence_store, 'VERIFIED');
  assert.equal(env.suppression.state, 'clear'); assert.equal(env.suppression.fingerprint, 'email:qa@example.test|phone:4015550100');
  assert.deepEqual(env.payload, { lead_id: 'L-1', tenant_id: 'EVIL' }, 'page payload is carried verbatim under `payload`; the envelope tenant_id is system-owned');
  // form bodies pass through raw (the engine parses them) with the tenant/action headers only
  const f = await cleared(boot());
  const body = new URLSearchParams({ name: 'QA' });
  await f.EE.hooks.post('intake', body, { identity: ID, keepalive: false });
  assert.equal(f.calls[0].init.body, body); assert.equal(f.calls[0].init.keepalive, false);
  assert.deepEqual(plain(f.calls[0].init.headers), { 'X-EE-Tenant': 'NIL', 'X-EE-Action': 'intake' });
});

test('R5 bootstrap: every gate blocks post() before any transport — tenant mismatch, no runtime, kill switch, preview, consent store, no evidence, suppression source, suppressed:true, no identity', async () => {
  const cases = [
    ['tenant mismatch', boot({ runtime: { ...RUNTIME, tenant_id: 'LFMA' } }), true, /^runtime tenant mismatch: LFMA/],
    ['runtime missing', boot({ runtime: NO_RUNTIME }), true, /^runtime not loaded$/],
    ['kill switch ON', boot({ site: { ...CONNECTED, kill_switch: 'ON' } }), true, /^kill_switch ON$/],
    ['kill switch unknown', boot({ site: { ...CONNECTED, kill_switch: 'off ' } }), true, /^kill_switch UNKNOWN$/],
    ['preview gate', boot({ site: { ...CONNECTED, production_gate: 'preview' } }), true, /^production_gate preview$/],
    ['consent store MISSING', boot({ site: { ...CONNECTED, consent_store: 'MISSING' } }), true, /^consent store not connected: MISSING$/],
    ['no consent evidence', boot(), false, /^no consent evidence recorded$/],
    ['suppression source NEEDS_AUTH', boot({ site: { ...CONNECTED, suppression_source: 'NEEDS_AUTH' } }), true, /^suppression source not connected: NEEDS_AUTH$/],
    ['suppression endpoint missing', boot({ runtime: { ...RUNTIME, suppression_endpoint: null } }), true, /^authoritative suppression check unavailable$/],
    ['suppressed:true', boot({ supp: { checked: true, suppressed: true } }), true, /^suppressed$/],
    ['malformed lookup', boot({ supp: { checked: 'yes' } }), true, /malformed/],
  ];
  for (const [label, b, doConsent, why] of cases) {
    if (doConsent) consent(b.EE);
    await assert.rejects(b.EE.hooks.post('intake', { x: 1 }, { identity: ID }), e => e.name === 'OutboundBlocked' && why.test(e.reason), label);
    assert.match(b.EE.hooks.why('intake'), why, label);
    assert.equal(b.calls.length, 0, `${label}: nothing sent`);
    if (b.EE.safety.killSwitch.state() === 'OFF') assert.ok(b.dl.some(e => e.event === 'ee_outbound_blocked' && e.hook === 'intake'), `${label}: block event emitted`);
    else assert.equal(b.dl.length, 0, `${label}: kill switch => nothing leaves the page, not even the block event`);
  }
  const noid = await cleared(boot());
  for (const identity of [undefined, {}, { email: 'nope' }, { phone: '12' }]) {
    await assert.rejects(noid.EE.hooks.post('intake', {}, { identity }), e => e.name === 'OutboundBlocked' && /no identity for suppression check/.test(e.reason));
  }
  assert.equal(noid.calls.length, 0);
});

test('R5 bootstrap: replacing window.fetch after load neither clears a suppressed identity nor redirects a send (captured transport; defense in depth, not the boundary)', async () => {
  const hit = boot({ supp: { checked: true, suppressed: true } }); consent(hit.EE);
  let stubCalls = 0;
  hit.w.fetch = () => { stubCalls++; return Promise.resolve(jsonRes({ checked: true, suppressed: false })); };
  assert.equal(await hit.EE.hooks.resolve('intake', ID), null); assert.equal(hit.EE.hooks.why('intake'), 'suppressed');
  assert.equal(stubCalls, 0, 'the stub was never used'); assert.equal(hit.lookups.length, 1, 'the authoritative endpoint was asked');
  const ok = await cleared(boot());
  ok.w.fetch = () => { stubCalls++; return Promise.resolve({ ok: true }); };
  await ok.EE.hooks.post('intake', {}, { identity: ID });
  assert.equal(stubCalls, 0); assert.equal(ok.calls.length, 1); assert.equal(ok.calls[0].url, ROUTE);
  // a page without fetch at all fails closed instead of falling back to anything else
  const nofetch = boot(); delete nofetch.w.fetch; // deleting before boot would matter; here we prove the captured one is what counts
  consent(nofetch.EE); assert.equal(await nofetch.EE.hooks.resolve('intake', ID), ROUTE, 'captured transport still works after the global is removed');
});

test('R5 bootstrap: a page booted with no fetch fails closed — no suppression clearance, no send, HookMissing', async () => {
  const calls = [];
  const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const w = { EE_SITE: CONNECTED, EE_RUNTIME: RUNTIME, dataLayer: [], location: { href: 'https://x.test/', search: '', pathname: '/' }, sessionStorage: storage(), localStorage: storage(), console: { warn() {} }, crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) }, URLSearchParams };
  const ctx = vm.createContext({ window: w, document: { referrer: '', querySelector: () => null, getElementById: () => null }, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp, Promise, setTimeout, clearTimeout });
  vm.runInContext(read('shared/ee/bootstrap.js'), ctx);
  consent(w.EE);
  assert.equal(await w.EE.hooks.resolve('intake', ID), null);
  assert.equal(w.EE.hooks.why('intake'), 'authoritative suppression check unavailable (no fetch)');
  await assert.rejects(w.EE.hooks.post('intake', {}, { identity: ID }), e => e.name === 'OutboundBlocked');
  assert.equal(calls.length, 0);
});

// ================================================================= LFMA intake client: only the governed route is acceptable
test('R5 LFMA order-intake client accepts only an Evolution Engine actions route and rejects provider hosts', async () => {
  const { validateEndpoint } = await import('../lfma/assets/order-intake-client.mjs');
  assert.equal(validateEndpoint('https://engine.invalid.test/actions/LFMA/order'), 'https://engine.invalid.test/actions/LFMA/order');
  for (const bad of ['https://hook.us2.make.com/' + 'a'.repeat(32), ['https://hooks.', 'zapier.com/hooks/', 'catch/1/x/'].join(''), 'https://engine.invalid.test/actions/LFMA/intake', 'https://engine.invalid.test/actions/lfma/order', 'http://engine.invalid.test/actions/LFMA/order', 'https://user:pw@engine.invalid.test/actions/LFMA/order', 'https://engine.invalid.test/actions/LFMA/order?x=1', '', null]) {
    assert.throws(() => validateEndpoint(bad), /governed Order Intake action route|not configured/i, String(bad));
  }
});
