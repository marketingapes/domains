// QA/QC repair guard (2026-09-11). One regression test per repair:
//   1. tools/verify-foundation.py fails CLOSED when jsonschema is unavailable.
//   2. NIL's homepage no longer hardcodes a campaign; campaign_id stays optional/null.
//   3. Site code loads only identities proven by provider evidence (NIL GTM, LFMA GA4).
//   4. No raw hook/webhook URL anywhere in the tracked tree; hooks resolve by name at runtime.
//   5. Tenant isolation of runtime hooks; campaign=null operation preserved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANON = ['BTL', 'NIL', 'DIHAC', 'LFMA', 'MA', 'KG', 'SLIQ', 'CGG', 'DDM', 'FPLB', 'PX', 'RI', 'TNT', 'TOSS'];
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const manifest = t => JSON.parse(read(`${t.toLowerCase()}/domain.json`));
const tracked = () => execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean);

// ---------------------------------------------------------------- 1. verifier fails closed
test('verify-foundation.py fails CLOSED when jsonschema cannot be imported', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'no-jsonschema-'));
  try {
    fs.writeFileSync(path.join(tmp, 'jsonschema.py'), "raise ImportError('jsonschema deliberately unavailable for this test')\n");
    const r = spawnSync('python3', ['tools/verify-foundation.py'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PYTHONPATH: tmp } });
    assert.notEqual(r.status, 0, 'must exit non-zero without jsonschema');
    assert.match(r.stdout, /FOUNDATION VERIFY: FAIL/);
    assert.match(r.stdout, /jsonschema is not installed/);
    assert.doesNotMatch(r.stdout, /SKIPPED/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('verify-foundation.py still passes with jsonschema present and reports 14/14 schema conformance', () => {
  const r = spawnSync('python3', ['tools/verify-foundation.py'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /schema conformance: 14\/14/);
  assert.match(r.stdout, /FOUNDATION VERIFY: PASS/);
});

// ---------------------------------------------------------------- 2. NIL campaign optional
test('NIL homepage carries no hardcoded campaign; campaign_id resolves lazily and is null by default', () => {
  const html = read('nil/index.html');
  assert.doesNotMatch(html, /\bCAMPAIGN\s*=\s*['"]/, 'no CAMPAIGN constant');
  assert.doesNotMatch(html, /NIL_MVA_SOFIA_V1/, 'legacy campaign id gone');
  assert.match(html, /const campaign=\(\)=>\(window\.EE&&window\.EE\.context&&window\.EE\.context\.campaign_id\)\|\|new URLSearchParams\(location\.search\)\.get\('ee_campaign'\)\|\|null;/);
  // every place the page stamps campaign_id uses the lazy resolver
  const stamps = html.match(/(?<![a-z_])campaign_id:[^,}]+/g);
  assert.ok(stamps.length >= 3, 'track(), context and payload all stamp campaign_id');
  for (const s of stamps) assert.equal(s, 'campaign_id:campaign()', s);
  // run the resolver exactly as the page defines it: no EE, no ?ee_campaign -> null; with ?ee_campaign -> value; with EE context -> context wins
  const src = html.match(/const campaign=\(\)=>[^\n]+?\|\|null;/)[0];
  const run = (search, ee) => vm.runInNewContext(`${src} campaign()`, { window: ee ? { EE: { context: { campaign_id: ee } } } : {}, location: { search }, URLSearchParams });
  assert.equal(run('', null), null);
  assert.equal(run('?campaign_id=PLATFORM-123', null), null, 'a platform campaign_id is not an EE campaign');
  assert.equal(run('?ee_campaign=NIL-TEST-1', null), 'NIL-TEST-1');
  assert.equal(run('?ee_campaign=URL', 'CTX'), 'CTX');
});

test('stocking audit no longer reports a hardcoded campaign on the NIL homepage', () => {
  const report = JSON.parse(read('stocking/report.json'));
  const nil = report.results.find(r => r.tenant_id === 'NIL');
  assert.doesNotMatch(nil.structural_gaps.join('\n'), /hardcodes a campaign/);
  assert.doesNotMatch(nil.structural_gaps.join('\n'), /container_id=GTM-PHC7459M/);
});

// ---------------------------------------------------------------- 3. provider identities
test('every tenant with a VERIFIED web GTM container loads exactly its own container, never another tenant\'s', () => {
  const containers = Object.fromEntries(CANON.map(t => [t, manifest(t).measurement.gtm_web.container_id]).filter(([, c]) => c));
  for (const t of CANON) {
    const html = read(`${t.toLowerCase()}/index.html`);
    const loaded = [...new Set(html.match(/GTM-[A-Z0-9]{6,}/g) || [])].filter(c => c !== 'GTM-PENDING');
    const own = containers[t];
    // A homepage may load its own verified container or none (BTL's homepage runs pixels only — reported as a gap,
    // not repaired here: adding tracking to a live face is a Kyle decision). It must never load another tenant's.
    if (own) assert.ok(loaded.every(c => c === own), `${t} must load only ${own}, loaded ${loaded.join(',') || 'none'}`);
    else assert.deepEqual(loaded, [], `${t} has no verified container and must load none`);
    for (const [o, c] of Object.entries(containers)) if (o !== t) assert.equal(loaded.includes(c), false, `${t} loads ${o}'s container ${c}`);
  }
  const report = JSON.parse(read('stocking/report.json'));
  const btl = report.results.find(r => r.tenant_id === 'BTL');
  assert.match(btl.notes.join('\n'), /does not load its VERIFIED gtm_web container GTM-PHC7459M/);
});

test('NIL homepage loads its own GTM container (GTM-NKLD8KST) and its own Meta pixel (1464576608376747)', () => {
  const html = read('nil/index.html');
  assert.equal((html.match(/GTM-NKLD8KST/g) || []).length, 2, 'script + noscript');
  assert.doesNotMatch(html, /GTM-PHC7459M/, "BTL's container is gone");
  assert.match(html, /fbq\('init','1464576608376747'/, 'pixel named "Nearest Injury Lawyers" in Meta (owner: Marketing Apes business)');
});

test('LFMA pages load the GA4 stream of LFMA\'s own property (G-RQ8EWFTVSW), not doihaveaclaim.ai\'s (G-9HSY1GEXZ6)', () => {
  // provider evidence 2026-09-11: GA4 property 530695424 "Law Firm Marketing Apes" -> G-RQ8EWFTVSW;
  //                               GA4 property 529255120 "doihaveaclaim.ai"        -> G-9HSY1GEXZ6
  const files = tracked().filter(f => f.startsWith('lfma/') && /\.(html|js|mjs)$/.test(f));
  assert.ok(files.length > 5);
  for (const f of files) {
    const text = read(f);
    assert.doesNotMatch(text, /G-9HSY1GEXZ6/, `${f} still loads DIHAC's GA4 stream`);
  }
  assert.match(read('lfma/index.html'), /G-RQ8EWFTVSW/);
  assert.match(read('dihac/config.js'), /G-9HSY1GEXZ6/, 'DIHAC keeps its own stream');
});

// ---------------------------------------------------------------- 4. no raw hook URLs
test('no raw hook/webhook URL anywhere in the tracked repository (delegates to tools/scan-secrets.mjs)', async () => {
  const { scan } = await import('../tools/scan-secrets.mjs');
  assert.deepEqual(scan(ROOT).hits, []);
});

test('every former hook call site resolves its hook by name and fails closed when unconfigured', () => {
  const expect = {
    'nil/index.html': "hooks.url('intake'",
    'btl/index.html': "hooks.url('lead'",
    'btl/rhode-island-abuse/index.html': "hooks.url('lead'",
    'btl/404.html': "HOOK_NAME: 'campaign_request'",
    'dihac/contact.html': "hooks.url('contact'",
    'dihac/assets/js/tracking.js': "hooks.url('tracking')",
    'lfma/engine/index.html': "hooks.url('order'",
    'lfma/campaign/index.html': 'hooks.url("order"',
    'lfma/contact.html': "hooks.url('order'",
    'ma/order/index.html': "hooks.url('order'",
    'lee/index.html': 'r.hooks.order'
  };
  for (const [f, needle] of Object.entries(expect)) {
    const text = read(f);
    assert.ok(text.includes(needle), `${f} resolves by name: ${needle}`);
    assert.ok(/ee_hook_missing|hooks\.why|err'\)\.style\.display='block'|\.style\.display = 'block'|return;/.test(text), `${f} fails closed`);
  }
  for (const f of ['dihac/about.html', 'dihac/faq.html', 'dihac/privacy.html', 'dihac/terms.html']) assert.match(read(f), /webhook_ref: 'ee:hook:lead'/);
  assert.match(read('lee/domain.json'), /"hook_ref": "EE_HOOK_LEE_ORDER/);
  assert.match(read('lee/index.html'), /<script src="\/ee\/runtime\.js"><\/script>/, 'LEE loads runtime.js itself (not stocked)');
});

// ---------------------------------------------------------------- 5. runtime hooks: bootstrap API + build isolation
function browser({ site, runtime, dataLayer = [] }) {
  const calls = [];
  const w = {
    EE_SITE: site, EE_RUNTIME: runtime, dataLayer,
    location: { href: 'https://x.test/', search: '', pathname: '/', hostname: 'x.test', origin: 'https://x.test' },
    sessionStorage: { getItem: () => null, setItem() {} }, localStorage: { getItem: () => null, setItem() {} },
    crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) },
    fetch: (url, init) => { calls.push({ url, init }); return Promise.resolve({ ok: true }); },
    URLSearchParams
  };
  const d = { referrer: '', querySelector: () => null, getElementById: () => null };
  const ctx = vm.createContext({ window: w, document: d, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp, Promise });
  vm.runInContext(read('shared/ee/bootstrap.js'), ctx);
  return { EE: w.EE, dl: w.dataLayer, calls };
}
// connected safety spine (simulated) — the only configuration in which the gate can open
const SITE = { tenant_id: 'NIL', domain_id: 'nearestinjurylawyers.com', production_gate: 'live', kill_switch: 'OFF', consent_store: 'VERIFIED', suppression_source: 'VERIFIED' };

test('EE.hooks resolves by name from EE_RUNTIME only (tenant-matched), through the outbound gate, and an unconfigured hook fails closed', async () => {
  const consent = EE => { EE.safety.suppression.use(() => ({ suppressed: false })); return EE.safety.consent.record({ surface: 'form', consent_text_id: 'T' }); };
  const none = browser({ site: SITE, runtime: undefined }); consent(none.EE);
  assert.equal(none.EE.hooks.url('intake'), null);
  assert.equal(none.EE.hooks.configured('intake'), false);
  await assert.rejects(none.EE.hooks.post('intake', { a: 1 }), e => e.name === 'OutboundBlocked' && /runtime not loaded/.test(e.message));
  assert.equal(none.calls.length, 0, 'nothing was sent');

  const empty = browser({ site: SITE, runtime: { tenant_id: 'NIL', hooks: {} } }); consent(empty.EE);
  await assert.rejects(empty.EE.hooks.post('intake', { a: 1 }), e => e.name === 'HookMissing');
  assert.equal(empty.dl.at(-1).event, 'ee_hook_missing'); assert.equal(empty.dl.at(-1).hook, 'intake');

  const bad = browser({ site: SITE, runtime: { tenant_id: 'NIL', hooks: { intake: 'http://insecure.example/x' } } }); consent(bad.EE);
  assert.equal(bad.EE.hooks.url('intake'), null, 'non-https hook is refused');

  const ok = browser({ site: SITE, runtime: { tenant_id: 'NIL', hooks: { intake: 'https://example.test/hook' } } });
  assert.equal(ok.EE.hooks.url('intake'), null, 'no consent => gated');
  consent(ok.EE);
  assert.equal(ok.EE.hooks.url('intake'), 'https://example.test/hook');
  await ok.EE.hooks.post('intake', { lead_id: 'L1' });
  assert.equal(ok.calls.length, 1);
  assert.equal(ok.calls[0].url, 'https://example.test/hook');
  const body = JSON.parse(ok.calls[0].init.body);
  assert.equal(body.tenant_id, 'NIL'); assert.equal(body.domain_id, 'nearestinjurylawyers.com'); assert.equal(body.lead_id, 'L1');
  assert.equal('campaign_id' in body, false, 'campaign stays absent when none exists');
  assert.equal(ok.EE.context.campaign_id, null);
});

test('kill switch ON blocks hook posts', async () => {
  const b = browser({ site: { ...SITE, kill_switch: 'ON' }, runtime: { tenant_id: 'NIL', hooks: { intake: 'https://example.test/hook' } } });
  await assert.rejects(b.EE.hooks.post('intake', {}), e => e.name === 'OutboundBlocked' && /kill_switch ON/.test(e.message));
  assert.equal(b.calls.length, 0);
});

test('build.sh writes runtime.js per tenant from EE_HOOK_<TENANT>_* env only, isolated by tenant, and the file is gitignored', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-build-'));
  try {
    fs.cpSync(path.join(ROOT, 'build.sh'), path.join(tmp, 'build.sh'));
    for (const t of ['nil', 'cgg', 'lee']) fs.cpSync(path.join(ROOT, t), path.join(tmp, t), { recursive: true });
    execFileSync('sh', ['build.sh'], { cwd: tmp, stdio: 'pipe', env: { ...process.env, EE_HOOK_NIL_INTAKE: 'https://hooks.example/nil"quoted', EE_HOOK_NIL_BAD: 'http://not-https.example/x', EE_HOOK_LEE_ORDER: 'https://hooks.example/lee' } });
    const nil = fs.readFileSync(path.join(tmp, 'nil/ee/runtime.js'), 'utf8');
    const cgg = fs.readFileSync(path.join(tmp, 'cgg/ee/runtime.js'), 'utf8');
    const lee = fs.readFileSync(path.join(tmp, 'lee/ee/runtime.js'), 'utf8');
    const load = src => { const w = {}; vm.runInNewContext(src, { window: w, Object }); return JSON.parse(JSON.stringify(w.EE_RUNTIME)); };
    assert.deepEqual(load(nil).hooks, { intake: 'https://hooks.example/nil"quoted' }, 'NIL gets its own hooks, quotes escaped, non-https dropped');
    assert.equal(load(nil).tenant_id, 'NIL');
    assert.deepEqual(load(cgg).hooks, {}, 'CGG never sees NIL hooks');
    assert.deepEqual(load(lee).hooks, { order: 'https://hooks.example/lee' });
    assert.equal(fs.existsSync(path.join(tmp, 'nil/ee/site.json')), true);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const ignored = spawnSync('git', ['check-ignore', '-q', 'nil/ee/runtime.js'], { cwd: ROOT });
  assert.equal(ignored.status, 0, '*/ee/runtime.js must be gitignored');
  assert.equal(tracked().some(f => f.endsWith('/ee/runtime.js')), false, 'no runtime.js is tracked');
});
