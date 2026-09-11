// QA/QC round 4 guard (2026-09-11) — H1: browser/page JavaScript is NOT an authoritative suppression source.
//
// Reproduced on commit 506a969: `EE.safety.suppression.use(fn)` with fn returning {suppressed:false}, {}, undefined,
// null, a Promise, or a rejected Promise all flipped outbound.allowed() to true and hooks.url() to a URL; a suppressing
// checker could be replaced by a clearing one; hooks.url(name) with no identity resolved.
//
// Contract now: the ONLY clearance the gate accepts is a completed lookup against the engine's suppression endpoint
// (EE_RUNTIME.suppression_endpoint, captured once at init) that answered {checked:true, suppressed:false} for the
// identity fingerprint. Everything else BLOCKS. No endpoint => "authoritative suppression check unavailable".
// outbound.allowed() itself validates the tenant-matched runtime.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const HOOK = 'https://hooks.invalid.test/nil-intake';
const SUPP = 'https://engine.invalid.test/suppression';
const ID = { email: 'qa@example.test', phone: '(401) 555-0100' };
const CONNECTED = { tenant_id: 'NIL', domain_id: 'nearestinjurylawyers.com', production_gate: 'live', kill_switch: 'OFF', consent_store: 'VERIFIED', suppression_source: 'VERIFIED' };
const jsonRes = body => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body });

// `answer(init)` decides what the AUTHORITATIVE endpoint does: return a Response-like, a Promise, or throw.
function boot({ site = CONNECTED, runtime = { tenant_id: 'NIL', hooks: { intake: HOOK }, suppression_endpoint: SUPP }, answer = () => jsonRes({ checked: true, suppressed: false, source: 'test-authority' }), abort = false } = {}) {
  const calls = [], lookups = [];
  const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  class AbortController { constructor() { this.signal = { aborted: false }; } abort() { this.signal.aborted = true; if (this.onabort) this.onabort(); } }
  const w = { EE_SITE: site, EE_RUNTIME: runtime, dataLayer: [], location: { href: 'https://x.test/', search: '', pathname: '/' }, sessionStorage: storage(), localStorage: storage(),
    console: { warn() {} }, crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) }, URLSearchParams, AbortController,
    setTimeout: (fn, ms) => setTimeout(fn, abort ? 1 : ms), clearTimeout,
    fetch: (url, init) => {
      if (url === SUPP) {
        lookups.push(init);
        if (abort) return new Promise((_, rej) => { const e = new Error('aborted'); e.name = 'AbortError'; setTimeout(() => rej(e), 5); });
        try { return Promise.resolve(answer(init)); } catch (e) { return Promise.reject(e); }
      }
      calls.push({ url, init }); return Promise.resolve({ ok: true });
    } };
  const d = { referrer: '', querySelector: () => null, getElementById: () => null };
  const ctx = vm.createContext({ window: w, document: d, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp, Promise, setTimeout, clearTimeout });
  vm.runInContext(read('shared/ee/bootstrap.js'), ctx);
  return { EE: w.EE, dl: w.dataLayer, calls, lookups, w, run: src => vm.runInContext(src, ctx) };
}
const consent = EE => EE.safety.consent.record({ surface: 'form', consent_text_id: 'T-1', method: 'checkbox' });

test('H1 reproduction is closed: the public API has no way to register a page checker', () => {
  const b = boot(); consent(b.EE);
  for (const fn of [() => ({ suppressed: false }), () => ({ checked: true, suppressed: false }), () => ({}), () => undefined, () => null, () => Promise.resolve({ suppressed: false }), () => Promise.reject(new Error('x'))]) {
    assert.throws(() => b.EE.safety.suppression.use(fn), /page code is not an authoritative suppression source/);
    assert.equal(b.EE.outbound.allowed(ID).allowed, false);
    assert.equal(b.EE.hooks.url('intake', ID), null);
  }
  assert.ok(b.dl.some(e => e.event === 'ee_suppression_page_checker_rejected'));
  assert.equal(b.EE.hooks.url('intake'), null, 'no identity => no clearance');
  assert.equal(b.EE.hooks.why('intake'), 'no identity for suppression check');
  assert.equal(b.calls.length, 0);
});

test('authoritative contract: only a completed {checked:true, suppressed:false} JSON answer for the identity clears', async () => {
  const b = boot(); consent(b.EE);
  assert.equal(b.EE.outbound.allowed(ID).allowed, false, 'sync: not performed yet');
  assert.equal(b.EE.outbound.allowed(ID).reason, 'authoritative suppression check not performed');
  const g = await b.EE.outbound.check(ID);
  assert.equal(g.allowed, true); assert.equal(g.suppression, 'authoritative:VERIFIED'); assert.equal(g.identity_fingerprint, 'email:qa@example.test|phone:4015550100');
  assert.equal(b.lookups.length, 1);
  const body = JSON.parse(b.lookups[0].body);
  assert.deepEqual(body.identity, { email: 'qa@example.test', phone: '4015550100' }); assert.equal(body.tenant_id, 'NIL');
  assert.equal(await b.EE.hooks.resolve('intake', ID), HOOK);
  assert.equal(b.lookups.length, 1, 'clearance is cached per identity within the TTL');
  assert.equal(await b.EE.hooks.resolve('intake', { email: 'other@example.test' }), HOOK); assert.equal(b.lookups.length, 2, 'a different identity needs its own lookup');
  assert.equal(b.EE.outbound.allowed({ email: 'third@example.test' }).allowed, false, 'a never-checked identity is not cleared by another\'s clearance');
  assert.ok(b.dl.some(e => e.event === 'ee_suppression_clear'));
});

const BLOCKING_ANSWERS = {
  'undefined body': () => jsonRes(undefined),
  'null body': () => jsonRes(null),
  'empty object {}': () => jsonRes({}),
  'suppressed:true': () => jsonRes({ checked: true, suppressed: true, source: 'authority' }),
  'checked:false': () => jsonRes({ checked: false, suppressed: false }),
  'checked:"true" (string)': () => jsonRes({ checked: 'true', suppressed: false }),
  'suppressed:"false" (string)': () => jsonRes({ checked: true, suppressed: 'false' }),
  'suppressed:null': () => jsonRes({ checked: true, suppressed: null }),
  'HTTP 500': () => ({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ checked: true, suppressed: false }) }),
  'HTTP 200 non-JSON': () => ({ ok: true, status: 200, headers: { get: () => 'text/html' }, json: async () => { throw new Error('not json'); } }),
  'malformed JSON': () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => { throw new SyntaxError('bad'); } }),
  'rejected lookup': () => { throw new Error('lookup failed'); },
  'Promise resolving to a plain object (no Response)': () => ({ checked: true, suppressed: false })
};
for (const [name, answer] of Object.entries(BLOCKING_ANSWERS)) {
  test(`async/failure: authoritative answer "${name}" => BLOCK, nothing sent`, async () => {
    const b = boot({ answer }); consent(b.EE);
    const g = await b.EE.outbound.check(ID);
    assert.equal(g.allowed, false, name);
    assert.notEqual(g.reason, 'ok');
    assert.equal(await b.EE.hooks.resolve('intake', ID), null);
    await assert.rejects(b.EE.hooks.post('intake', {}, { identity: ID }), e => e.name === 'OutboundBlocked');
    assert.equal(b.calls.length, 0);
    assert.ok(b.dl.some(e => e.event === 'ee_suppression_failed' || e.event === 'ee_suppression_hit'));
  });
}

test('async/failure: a timed-out lookup blocks', async () => {
  const b = boot({ abort: true }); consent(b.EE);
  const g = await b.EE.outbound.check(ID);
  assert.equal(g.allowed, false); assert.match(g.reason, /timed out|aborted/);
  assert.equal(await b.EE.hooks.resolve('intake', ID), null);
});

test('no endpoint configured => BLOCK — authoritative suppression check unavailable (the state of every real tenant today)', async () => {
  const b = boot({ runtime: { tenant_id: 'NIL', hooks: { intake: HOOK } } }); consent(b.EE);
  assert.equal(b.EE.safety.suppression.endpoint_configured, false);
  assert.equal(b.EE.outbound.allowed(ID).reason, 'authoritative suppression check unavailable');
  assert.equal((await b.EE.outbound.check(ID)).allowed, false);
  assert.equal(await b.EE.hooks.resolve('intake', ID), null);
  assert.equal(b.EE.hooks.why('intake'), 'authoritative suppression check unavailable');
  for (const ep of ['http://engine.invalid.test/s', 'javascript:alert(1)', '', 42, null]) {
    const bad = boot({ runtime: { tenant_id: 'NIL', hooks: { intake: HOOK }, suppression_endpoint: ep } }); consent(bad.EE);
    assert.equal(bad.EE.safety.suppression.endpoint_configured, false, String(ep));
    assert.equal(await bad.EE.hooks.resolve('intake', ID), null);
  }
});

test('page-code bypass: a suppressing authoritative result cannot be replaced by any page-side clearance', async () => {
  let mode = 'hit';
  const b = boot({ answer: () => jsonRes(mode === 'hit' ? { checked: true, suppressed: true, source: 'a' } : { checked: true, suppressed: false, source: 'a' }) });
  consent(b.EE);
  assert.equal((await b.EE.outbound.check(ID)).reason, 'suppressed');
  for (const attack of [
    "try { window.EE.safety.suppression.use(function(){ return { checked: true, suppressed: false }; }); } catch (e) {}",
    "try { window.EE.safety.suppression.status = function(){ return { state: 'clear' }; }; } catch (e) {}",
    "try { window.EE.safety.suppression.check = function(){ return Promise.resolve({ state: 'clear' }); }; } catch (e) {}",
    "try { window.EE.outbound.check = function(){ return Promise.resolve({ allowed: true }); }; } catch (e) {}",
    "try { window.EE.hooks.resolve = function(){ return Promise.resolve('https://evil.test/x'); }; } catch (e) {}",
    "try { window.EE_RUNTIME = { tenant_id: 'NIL', hooks: { intake: 'https://evil.test/x' }, suppression_endpoint: 'https://evil.test/clear' }; } catch (e) {}",
    "try { window.fetch = function(){ return Promise.resolve({ ok: true, status: 200, headers: { get: function(){ return 'application/json'; } }, json: function(){ return Promise.resolve({ checked: true, suppressed: false }); } }); }; } catch (e) {}"
  ]) b.run(attack);
  assert.equal(b.EE.outbound.allowed(ID).allowed, false, 'cached suppressed result stands');
  assert.equal(b.EE.outbound.allowed(ID).reason, 'suppressed');
  assert.equal(await b.run("window.EE.hooks.resolve('intake', {email:'qa@example.test', phone:'4015550100'})"), null);
  assert.equal(b.calls.length, 0);
});

test('page-code bypass: hooks.url(name) with no identity, a junk identity, or a different identity never inherits a clearance', async () => {
  const b = boot(); consent(b.EE);
  await b.EE.outbound.check(ID);
  assert.equal(b.EE.outbound.allowed(ID).allowed, true);
  assert.equal(b.EE.hooks.url('intake'), null); assert.equal(b.EE.hooks.why('intake'), 'no identity for suppression check');
  assert.equal(b.EE.hooks.url('intake', {}), null);
  assert.equal(b.EE.hooks.url('intake', { email: 'nope', phone: '123' }), null);
  assert.equal(b.EE.hooks.url('intake', { email: 'someone-else@example.test' }), null);
  assert.equal(b.EE.hooks.url('intake', ID), HOOK);
});

test('runtime validation: outbound.allowed() itself denies a missing or mismatched runtime, before any other check', async () => {
  const mismatch = boot({ runtime: { tenant_id: 'LFMA', hooks: { intake: HOOK }, suppression_endpoint: SUPP } }); consent(mismatch.EE);
  assert.equal(mismatch.EE.outbound.allowed(ID).allowed, false);
  assert.match(mismatch.EE.outbound.allowed(ID).reason, /^runtime tenant mismatch: LFMA/);
  assert.equal((await mismatch.EE.outbound.check(ID)).allowed, false);
  assert.equal(mismatch.lookups.length, 0, 'never calls a mismatched runtime\'s endpoint');
  assert.ok(mismatch.dl.some(e => e.event === 'ee_runtime_mismatch'));
  const none = boot({ runtime: null }); consent(none.EE);
  assert.equal(none.EE.outbound.allowed(ID).reason, 'runtime not loaded');
  // a future non-hook outbound adapter that only calls outbound.allowed() is therefore still tenant-validated
  const ok = boot(); consent(ok.EE); await ok.EE.outbound.check(ID);
  assert.equal(ok.EE.outbound.allowed(ID).allowed, true);
});

test('prior gates still hold in front of suppression: kill switch, production gate, consent store, consent evidence', async () => {
  for (const [site, why] of [[{ ...CONNECTED, kill_switch: 'ON' }, /^kill_switch ON/], [{ ...CONNECTED, production_gate: 'preview' }, /^production_gate preview/], [{ ...CONNECTED, consent_store: 'MISSING' }, /^consent store not connected/]]) {
    const b = boot({ site }); consent(b.EE);
    assert.match((await b.EE.outbound.check(ID)).reason, why);
    assert.equal(b.lookups.length, 0, 'no authoritative lookup is attempted when an earlier gate already blocks');
  }
  const noConsent = boot();
  assert.equal((await noConsent.EE.outbound.check(ID)).reason, 'no consent evidence recorded');
});

test('build.sh carries EE_SUPPRESSION_<TENANT>_ENDPOINT into runtime.js and every page resolves through hooks.resolve()', () => {
  assert.match(read('build.sh'), /EE_SUPPRESSION_\$\{tenant\}_ENDPOINT/);
  assert.match(read('build.sh'), /suppression_endpoint:%s/);
  for (const f of ['nil/index.html', 'btl/index.html', 'btl/rhode-island-abuse/index.html', 'btl/404.html', 'dihac/contact.html', 'lfma/contact.html', 'lfma/engine/index.html', 'lfma/campaign/index.html', 'ma/order/index.html', 'dihac/assets/js/tracking.js']) {
    const text = read(f);
    assert.match(text, /hooks\.resolve\(/, `${f} uses the async authoritative path`);
    assert.doesNotMatch(text, /hooks\.url\(/, `${f} no longer calls the sync url() from page code`);
    assert.doesNotMatch(text, /suppression\.use\(/, `${f} registers no page checker`);
  }
});
