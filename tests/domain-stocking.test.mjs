// Domain stocking v1 guard.
//
// Proves, for the canonical 14: generated outputs are in sync with source (no drift), every site
// builds and carries the web foundation, the event bootstrap emits canonical fields with campaign
// optional, the dynamic experience socket and safety hooks exist, LEE is untouched, no secrets were
// introduced, and Foundation v1.2 did not move a byte.
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
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
const manifest = t => JSON.parse(read(`${t.toLowerCase()}/domain.json`));

// ------------------------------------------------------------------ minimal browser for the bootstrap
function browser({ url = 'https://example.test/?utm_source=meta&utm_campaign=spring&fbclid=abc123', site = {}, page = {}, metas = {}, dataLayer = [], socket = true } = {}) {
  const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m }; };
  const socketEl = { hidden: true, innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; }, removeAttribute(k) { delete this.attrs[k]; } };
  const u = new URL(url);
  const w = {
    EE_SITE: site, EE_PAGE: page, dataLayer,
    location: { href: u.href, search: u.search, pathname: u.pathname, hostname: u.hostname, origin: u.origin },
    sessionStorage: storage(), localStorage: storage(),
    crypto: { randomUUID: () => crypto.randomUUID(), getRandomValues: a => crypto.getRandomValues(a) }
  };
  const d = {
    referrer: 'https://ref.test/',
    querySelector: sel => { const m = sel.match(/meta\[name="([^"]+)"\]/); if (m) return metas[m[1]] ? { getAttribute: () => metas[m[1]] } : null; if (/data-ee-socket/.test(sel)) return socket ? socketEl : null; return null; },
    getElementById: id => (id === 'ee-experience' && socket ? socketEl : null)
  };
  const ctx = vm.createContext({ window: w, document: d, Uint32Array, URLSearchParams, Date, Math, Object, String, Error, JSON, RegExp });
  vm.runInContext(read('shared/ee/bootstrap.js'), ctx, { filename: 'bootstrap.js' });
  return { w, d, socketEl, EE: w.EE, dl: w.dataLayer };
}
const SITE = { tenant_id: 'TNT', domain_id: 'tonedntasty.com', brand: 'Toned N Tasty', production_gate: 'preview', kill_switch: 'OFF', kill_switch_source: 'MISSING', consent_store: 'MISSING', suppression_source: 'MISSING' };

test('bootstrap emits ee_page_context with canonical fields; campaign stays optional', () => {
  const { dl, EE } = browser({ site: SITE });
  assert.equal(dl.length, 1);
  const e = dl[0];
  assert.equal(e.event, 'ee_page_context');
  for (const k of ['tenant_id', 'domain_id', 'session_id', 'landing_page_url', 'page_view_id', 'event_id', 'event_ts']) assert.ok(e[k], `${k} present`);
  assert.equal(e.tenant_id, 'TNT'); assert.equal(e.domain_id, 'tonedntasty.com');
  assert.equal(e.utm_source, 'meta'); assert.equal(e.utm_campaign, 'spring'); assert.equal(e.fbclid, 'abc123');
  assert.equal('campaign_id' in e, false, 'no campaign key when no campaign exists');
  assert.equal(EE.context.campaign_id, null);
  assert.equal(e.production_gate, 'preview'); assert.equal(e.kill_switch, 'OFF'); assert.equal(e.consent_state, 'none');
});

test('campaign_id / variant_id attach from the URL, a page override, or setCampaign — never from the site config', () => {
  const a = browser({ site: SITE, url: 'https://x.test/lp?campaign_id=C-9&variant_id=B' });
  assert.equal(a.dl[0].campaign_id, 'C-9'); assert.equal(a.dl[0].variant_id, 'B');
  const b = browser({ site: SITE, page: { campaign_id: 'PAGE-1' } });
  assert.equal(b.dl[0].campaign_id, 'PAGE-1');
  const c = browser({ site: { ...SITE, campaign_id: 'SHOULD-NOT-LEAK' } });
  assert.equal('campaign_id' in c.dl[0], false);
  c.EE.setCampaign('LATE-7', 'v2'); const ev = c.EE.track('ee_cta_click', { cta_id: 'x' });
  assert.equal(ev.campaign_id, 'LATE-7'); assert.equal(ev.variant_id, 'v2');
});

test('session and landing page persist across page views in one session', () => {
  const first = browser({ site: SITE, url: 'https://x.test/?gclid=g1' });
  const ss = first.w.sessionStorage;
  assert.equal(ss.getItem('ee_landing_page_url'), 'https://x.test/?gclid=g1');
  assert.equal(ss.getItem('ee_gclid'), 'g1');
  assert.match(first.dl[0].session_id, /^ses_/);
});

test('existing inline ee_page_context is not doubled — bootstrap emits ee_context_update instead', () => {
  const { dl } = browser({ site: SITE, dataLayer: [{ event: 'ee_page_context', tenant_id: 'TNT' }] });
  assert.equal(dl.filter(e => e.event === 'ee_page_context').length, 1);
  assert.equal(dl.at(-1).event, 'ee_context_update');
  assert.equal(dl.at(-1).session_id.length > 4, true);
});

test('track() enforces the ee_* contract', () => {
  const { EE } = browser({ site: SITE });
  assert.throws(() => EE.track('pageview'), /ee_snake_case/);
  assert.equal(EE.track('ee_form_start', { form_id: 'f' }).form_id, 'f');
});

test('dynamic experience socket mounts, emits, and unmounts', () => {
  const { EE, dl, socketEl } = browser({ site: SITE });
  const r = EE.experience.mount({ id: 'quiz-v1', render: (el, ctx) => { el.innerHTML = '<p>' + ctx.tenant_id + '</p>'; } });
  assert.equal(r.mounted, true); assert.equal(socketEl.hidden, false); assert.equal(socketEl.innerHTML, '<p>TNT</p>');
  assert.equal(dl.at(-1).event, 'ee_experience_mount'); assert.equal(dl.at(-1).experience_id, 'quiz-v1');
  assert.equal(EE.experience.mount({ id: 'live-only', render() {}, requires_live: true }).mounted, false);
  assert.equal(EE.experience.unmount(), true); assert.equal(socketEl.hidden, true); assert.equal(dl.at(-1).event, 'ee_experience_unmount');
  assert.equal(browser({ site: SITE, socket: false }).EE.experience.mount({ id: 'x', render() {} }).reason, 'no socket');
});

test('safety hooks exist on every domain and default OFF: consent, suppression, kill switch, production gate', () => {
  const { EE, dl } = browser({ site: SITE });
  assert.equal(EE.safety.consent.state(), 'none'); assert.equal(EE.safety.consent.store, 'MISSING');
  assert.deepEqual(EE.safety.suppression.check({ email: 'a@b.c' }).checked, false);
  assert.equal(EE.safety.killSwitch.state(), 'OFF'); assert.equal(EE.safety.productionGate.state(), 'preview');
  assert.equal(EE.outbound.allowed({}).allowed, false, 'nothing outbound while preview / no consent');
  assert.throws(() => EE.safety.consent.record({}), /surface/);
  const rec = EE.safety.consent.record({ surface: 'form', consent_text_id: 'TCPA-1' });
  assert.equal(rec.event, 'ee_consent_evidence'); assert.equal(EE.safety.consent.state(), 'recorded');
  assert.equal(dl.at(-1).event, 'ee_consent_evidence');
  EE.safety.suppression.use(() => ({ suppressed: true, source: 'test-list' }));
  assert.equal(EE.safety.suppression.check({}).suppressed, true);
});

test('kill switch ON blocks every dataLayer push and every outbound gate', () => {
  const { EE, dl } = browser({ site: { ...SITE, kill_switch: 'ON' } });
  assert.equal(dl.length, 0, 'load event blocked');
  const ev = EE.track('ee_cta_click'); assert.equal(ev.ee_blocked, true); assert.equal(dl.length, 0);
  assert.equal(EE.experience.mount({ id: 'x', render() {} }).mounted, false);
  assert.equal(EE.outbound.allowed({}).reason, 'kill_switch ON');
  const live = browser({ site: { ...SITE, production_gate: 'live' } });
  live.EE.safety.consent.record({ surface: 'form', consent_text_id: 'T' });
  assert.equal(live.EE.outbound.allowed({}).allowed, true);
  live.EE.safety.killSwitch.trip('test');
  assert.equal(live.EE.outbound.allowed({}).allowed, false);
});

// ------------------------------------------------------------------ generated outputs
test('stocking outputs are in sync with source (node tools/stock-domains.mjs --check)', () => {
  const r = spawnSync(process.execPath, ['tools/stock-domains.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /no drift/);
});

test('14/14 canonical tenants are stocked; LEE is excluded and untouched', () => {
  const bootstrap = read('shared/ee/bootstrap.js');
  for (const t of CANON) {
    const d = t.toLowerCase();
    assert.equal(read(`${d}/ee/bootstrap.js`), bootstrap, `${t} bootstrap is a verbatim copy`);
    const site = JSON.parse(read(`${d}/ee/site.json`));
    assert.equal(site.tenant_id, t); assert.equal(site.domain_id, manifest(t).domain_id);
    assert.equal(site.derived_from.sha256, sha(`${d}/domain.json`), `${t} site.json derived from the current frozen manifest`);
    assert.equal(site.event_bootstrap.campaign_required, false);
    for (const s of ['web_dynamic_experience', 'email_human', 'email_transactional', 'email_bulk', 'sms', 'phone', 'vapi_sofia', 'facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'threads', 'pinterest', 'meta_ads', 'google_ads', 'tiktok_ads', 'affiliate_api_feeds', 'commerce', 'ga4_gtm', 'bigquery', 'drive', 'consent', 'suppression', 'kill_switch', 'production_gate']) {
      assert.ok(site.sockets[s], `${t} socket ${s}`);
      assert.ok(['VERIFIED', 'CURRENT', 'MISSING', 'NEEDS_AUTH', 'NOT_APPLICABLE'].includes(site.sockets[s].connection_status), `${t}.${s} connection_status`);
      assert.ok(['ON', 'OFF', 'NOT_APPLICABLE'].includes(site.sockets[s].activation_state), `${t}.${s} activation_state`);
      if (['MISSING', 'NEEDS_AUTH'].includes(site.sockets[s].connection_status)) assert.notEqual(site.sockets[s].activation_state, 'ON', `${t}.${s}: not connected cannot be ON`);
    }
    const home = read(`${d}/index.html`);
    assert.match(home, /<meta[^>]+name=["']viewport["']/i, `${t} viewport`);
    assert.match(home, /<title>[^<]+<\/title>/i, `${t} title`);
    assert.ok(home.includes(`href="https://${manifest(t).hostname.intended_canonical_hostname}/"`), `${t} canonical`);
    assert.ok(home.includes(`<script>window.EE_SITE=Object.freeze({"tenant_id":"${t}","domain_id":"${manifest(t).domain_id}"`), `${t} EE_SITE block`);
    assert.ok(home.includes('<script src="/ee/bootstrap.js" defer></script>'), `${t} bootstrap tag`);
    assert.ok(home.includes(`<div id="ee-experience" data-ee-socket="primary" data-tenant-id="${t}" hidden></div>`), `${t} socket`);
    assert.equal((home.match(/ee:stocking v1/g) || []).length, 1, `${t} injected exactly once`);
  }
  assert.equal(fs.existsSync(path.join(ROOT, 'lee/ee')), false, 'LEE has no stocking layer');
  assert.equal(read('lee/index.html').includes('ee:stocking'), false, 'LEE page untouched');
  assert.equal(JSON.parse(read('portfolio.json')).tenants.includes('LEE'), false);
});

test('no borrowed tenant identity and no secrets in anything the stocking layer generates', () => {
  const secret = /hooks\.zapier\.com\/hooks\/catch\/|hook\.[a-z0-9-]+\.make\.com\/|\bsk-[A-Za-z0-9]{16,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
  const ids = [];
  for (const t of CANON) (function walk(n) { if (!n || typeof n !== 'object') return; for (const [k, v] of Object.entries(n)) { if (['e164', 'assistant_id', 'container_id', 'measurement_id', 'dataset_id', 'page_id', 'account_id', 'hook_id', 'scenario_id', 'address'].includes(k) && typeof v === 'string' && v.length >= 6) ids.push({ t, v }); else walk(v); } })(manifest(t));
  for (const t of CANON) {
    const d = t.toLowerCase();
    for (const f of [`${d}/ee/site.json`, `${d}/ee/bootstrap.js`]) {
      const text = read(f);
      assert.doesNotMatch(text, secret, `${f} secret-like`);
      for (const { t: owner, v } of ids) if (owner !== t) assert.equal(text.includes(v), false, `${f} carries ${owner}'s identifier ${v}`);
      for (const { v } of ids) assert.equal(text.includes(v), false, `${f} should carry statuses only, found identifier ${v}`);
    }
    const block = read(`${d}/index.html`).match(/<!-- ee:stocking v1 -->[\s\S]*?<!-- \/ee:stocking -->/)[0];
    assert.doesNotMatch(block, secret);
    for (const { t: owner, v } of ids) if (owner !== t) assert.equal(block.includes(v), false, `${t} EE_SITE block carries ${owner}'s ${v}`);
  }
  const report = JSON.parse(read('stocking/report.json'));
  assert.equal(report.summary.BLOCKED, 0);
  assert.equal(report.tenants.count, 14);
  assert.deepEqual(report.tenants.excluded, ['LEE']);
  for (const r of report.results) assert.doesNotMatch(r.structural_gaps.join('\n'), /secret-like material in generated output/);
});

test('every site builds with the repo build (sh build.sh) and serves an index.html per publish path', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'domains-build-'));
  try {
    fs.cpSync(path.join(ROOT, 'build.sh'), path.join(tmp, 'build.sh'));
    for (const t of CANON) fs.cpSync(path.join(ROOT, t.toLowerCase()), path.join(tmp, t.toLowerCase()), { recursive: true });
    execFileSync('sh', ['build.sh'], { cwd: tmp, stdio: 'pipe' });
    for (const t of CANON) {
      const d = t.toLowerCase();
      assert.ok(fs.existsSync(path.join(tmp, d, 'index.html')), `${t} publish path serves index.html`);
      assert.ok(fs.existsSync(path.join(tmp, d, 'ee', 'bootstrap.js')), `${t} serves /ee/bootstrap.js`);
    }
    for (const b64 of ['nil/assets/og.png', 'nil/assets/pin.png']) assert.ok(fs.existsSync(path.join(tmp, b64)), `${b64} decoded by build.sh`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('Foundation v1.2 did not move: frozen hashes + frozen validator still pass', () => {
  for (const line of read('foundation.sha256').trim().split('\n')) {
    const [h, p] = line.trim().split(/\s+/);
    assert.equal(sha(p), h, `${p} byte-identical to the frozen manifest`);
  }
  const r = spawnSync('python3', ['tools/verify-foundation.py'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /FOUNDATION VERIFY: PASS/);
});
