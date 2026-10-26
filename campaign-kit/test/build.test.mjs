import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize, renderPages, renderBundle, renderCss, assetManifest, checklist, imageSize, GATES, STATUSES, PREVIEW_CSP} from '../build.mjs';

const kit = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(kit, 'campaigns');
const configs = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f, JSON.parse(readFileSync(join(dir, f), 'utf8'))]);
const base = configs.find(([f]) => f === 'btl-paraquat.json')[1];
const clone = o => JSON.parse(JSON.stringify(o));
// A synthetic live config: every gate evidenced, firm transfer, a webhook. Never written to disk.
function liveConfig() {
  const c = clone(base);
  c.status = 'live';
  c.intake.webhook = 'https://hook.example.test/intake';
  c.delivery.transfer = {number: '+15555550100', kind: 'firm', label: 'Test firm intake', source: 'unit test'};
  c.gates = Object.fromEntries(GATES.map(([k]) => [k, {by: 'test', at: '2026-10-26', evidence: 'unit test'}]));
  return c;
}
// Anything a preview must never reference: dialing, tag managers, third-party scripts, intake endpoints.
const FORBIDDEN = [/href="tel:/, /googletagmanager\.com/, /api\.trustedform\.com/, /make\.com/, /onrender\.com/, /connect\.facebook/, /<script[^>]+src="https?:/];

test('every shipped config builds as a PREVIEW that cannot reach production', () => {
  for (const [f, raw] of configs) {
    const c = normalize(raw), pages = renderPages(c);
    assert.equal(c.mode, 'preview', f);
    assert.deepEqual(Object.keys(pages).sort(), ['ads.html', 'form.html', 'index.html', 'quiz.html', 'sofia.html'], f);
    for (const [n, html] of Object.entries(pages)) {
      for (const re of FORBIDDEN) assert.ok(!re.test(html), `${f} ${n} must not contain ${re}`);
      assert.ok(html.includes(`content="${PREVIEW_CSP}"`), `${f} ${n} carries the preview CSP`);
      assert.match(PREVIEW_CSP, /connect-src 'none'/);
      assert.match(html, /<meta name="robots" content="noindex,follow">/);
      assert.ok(html.includes('class="kit-preview"'), `${f} ${n} shows the preview banner`);
    }
    for (const n of ['quiz.html', 'form.html']) assert.ok(pages[n].includes('"webhook":null,"preview":true'), `${f} ${n} has no webhook`);
  }
});

test('live mode needs evidence on every gate, a webhook and a firm transfer', () => {
  assert.equal(normalize(liveConfig()).mode, 'live');
  for (const [k] of GATES) { const c = liveConfig(); delete c.gates[k]; assert.throws(() => normalize(c), new RegExp(k)); }
  const noHook = liveConfig(); noHook.intake.webhook = null; assert.throws(() => normalize(noHook), /intake.webhook/);
  const internal = liveConfig(); internal.delivery.transfer.kind = 'internal'; assert.throws(() => normalize(internal), /kind "firm"/);
  const blankGate = liveConfig(); blankGate.gates.billing = {by: 'x', at: '2026-10-26', evidence: ''}; assert.throws(() => normalize(blankGate), /billing/);
});

test('live pages send btl.intake.web/v1 and accept success only with a receipt', () => {
  const c = normalize(liveConfig()), p = renderPages(c);
  for (const n of ['quiz.html', 'form.html']) {
    assert.ok(p[n].includes('"webhook":"https://hook.example.test/intake","preview":false'), n);
    assert.ok(p[n].includes("schema:'btl.intake.web/v1'"), n);
    assert.ok(p[n].includes('new URLSearchParams({payload:JSON.stringify(p),submission_id:p.submission_id})'), n);
    assert.ok(p[n].includes("if(!r.ok||!j||!(j.receipt_id||j.lead_id)||C.statuses.indexOf(j.status)<0) throw Error('no receipt')"), `${n} requires a receipt`);
    assert.ok(p[n].includes('"statuses":["received","accepted","duplicate"]'), n);
    assert.ok(p[n].includes('saveReceipt(rec)') && p[n].includes('var kept=loadReceipt()'), `${n} keeps the receipt across reloads`);
    assert.ok(p[n].includes('api.trustedform.com/trustedform.js'), `${n} loads TrustedForm when live`);
    assert.ok(p[n].includes('ok=ok&&f.consent_call.checked'), `${n} blocks submit without call consent`);
  }
  assert.ok(p['index.html'].includes('googletagmanager.com/gtm.js') && p['index.html'].includes('href="tel:+12029329700"'));
  assert.ok(!p['index.html'].includes('Content-Security-Policy'));
});

test('transfer destinations are validated', () => {
  const self = clone(base); self.delivery.transfer.number = base.sofia.phone_tel;
  assert.throws(() => normalize(self), /transfer to itself/);
  const alt = clone(base); alt.delivery.transfer.number = base.sofia.inbound_numbers[0];
  assert.throws(() => normalize(alt), /transfer to itself/);
  const legacy = clone(base); legacy.delivery.transfer_number = '+15555550100';
  assert.throws(() => normalize(legacy), /replaced by delivery.transfer/);
  const nosrc = clone(base); delete nosrc.delivery.transfer.source;
  assert.throws(() => normalize(nosrc), /transfer.source/);
  const b = renderBundle(normalize(base));
  assert.equal(b['sofia.json'].provision_bot_input.transfer_number, null, 'a non-firm line is never handed to provision-bot');
  assert.equal(b['delivery.json'].firm_transfer_set, false);
  assert.equal(renderBundle(normalize(liveConfig()))['sofia.json'].provision_bot_input.transfer_number, '+15555550100');
});

test('image sizes are read from file headers', () => {
  const png = Buffer.alloc(33); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(1080, 16); png.writeUInt32BE(1920, 20);
  assert.deepEqual(imageSize(png), {w: 1080, h: 1920});
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x76, 0x04, 0xb0, 0x03, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(imageSize(jpg), {w: 1200, h: 630});
});

test('creative manifest separates real files, Meta-only creatives and missing slots', () => {
  const g = Object.fromEntries(assetManifest(normalize(configs.find(([f]) => f.startsWith('glassman'))[1])).map(a => [a.slot, a]));
  for (const s of ['ad_quiz', 'ad_sofia', 'ad_form']) assert.deepEqual([g[s].status, g[s].size], ['ACTUAL', '1080x1080'], s);
  assert.equal(g.og.status, 'WRONG SIZE');
  assert.equal(g.tiktok_video.status, 'MISSING');
  const p = Object.fromEntries(assetManifest(normalize(base)).map(a => [a.slot, a]));
  assert.equal(p.ad_quiz.status, 'ACTUAL'); assert.match(p.ad_quiz.where, /^Meta only · image_hash /);
  assert.deepEqual([p.og.status, p.og.size], ['ACTUAL', '1200x630']);
  const ph = clone(base); ph.placeholders = ['hero'];
  assert.equal(assetManifest(normalize(ph)).find(a => a.slot === 'hero').status, 'PLACEHOLDER');
  const gone = clone(base); gone.images.hero = '/assets/does-not-exist.jpg';
  assert.equal(assetManifest(normalize(gone)).find(a => a.slot === 'hero').status, 'MISSING');
});

test('checklist rows carry a status and evidence; nothing is WORKING without it', () => {
  for (const [f, raw] of configs) {
    const rows = checklist(normalize(raw));
    for (const r of rows) { assert.ok(STATUSES.includes(r.status), `${f} ${r.item}`); assert.ok(String(r.evidence).length > 3, `${f} ${r.item} has evidence`); }
    const gateRows = rows.filter(r => r.area === 'Gate');
    assert.equal(gateRows.length, GATES.length);
    assert.ok(gateRows.filter(r => r.status === 'WORKING').every(r => !/No signed evidence/.test(r.evidence)));
    assert.ok(rows.filter(r => r.area === 'Integration' && r.evidence === 'No evidence recorded in the config').every(r => r.status !== 'WORKING'));
  }
  const bad = clone(base); bad.evidence.intake.status = 'DONE';
  assert.throws(() => checklist(normalize(bad)), /evidence.intake.status/);
});

test('BRIEF.md checklist block matches the configs (run build --all after editing a config)', () => {
  const brief = readFileSync(join(kit, 'BRIEF.md'), 'utf8');
  for (const [f, raw] of configs) for (const r of checklist(normalize(raw))) assert.ok(brief.includes(`| ${r.item} | **${r.status}** |`), `${f}: "${r.item}" ${r.status} missing from BRIEF.md`);
});

test('config text is escaped and bad configs are refused', () => {
  const html = renderPages(normalize({...clone(base), tort: {...base.tort, name: '<script>x</script>', headline: '"><img src=x onerror=1>'}}))['index.html'];
  assert.ok(!html.includes('<script>x</script>') && !html.includes('<img src=x onerror=1>'));
  assert.throws(() => normalize({...clone(base), campaign_id: 'lower'}), /campaign_id/);
  assert.throws(() => normalize({...clone(base), quiz: base.quiz.slice(0, 2)}), /quiz: 3-10/);
  assert.throws(() => normalize({...clone(base), criteria: {qualifies: []}}), /criteria/);
  assert.match(renderCss(normalize(base)), /\.kit-preview/);
});

test('channel bundle is paused drafts only; preview-only campaigns get no kit landing links', () => {
  for (const [f, raw] of configs) {
    const c = normalize(raw), b = renderBundle(c);
    assert.equal(b['meta.json'].campaign.status, 'PAUSED', f);
    assert.equal(b['google-search.json'].campaign.status, 'PAUSED', f);
    assert.equal(b['tiktok.json'].campaign.operation_status, 'DISABLE', f);
    assert.equal(b['openai-ads.json'].campaign.status, 'paused', f);
    assert.ok(b['google-search.json'].responsive_search_ad.headlines.every(h => h.length <= 30), f);
    assert.ok(b['meta.json'].ads.every(a => a.status === 'PAUSED' && (a.link === null || a.link === undefined || !a.link.includes('/c/'))), `${f} no links to undeployed /c/ pages`);
    assert.match(b['perspective.json'].make_intake_scenario.must.join(' '), /respond only AFTER the write succeeds/);
    const daily = ['meta.json', 'google-search.json', 'tiktok.json', 'openai-ads.json'].reduce((s, k) => s + b[k].campaign.daily_budget_usd, 0);
    assert.ok(Math.abs(daily * c.budget.days - c.budget.media_total_usd) <= c.budget.days * 4, `${f} daily budgets ≈ media total`);
  }
});
