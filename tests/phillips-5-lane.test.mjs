import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Phillips 5-lane go-live candidate — identity separation, tracking contract, survivor-lane safety.
const LANES = [
  {tenant: 'BTL', dir: 'btl/sex-abuse-la-county', survivor: true},
  {tenant: 'BTL', dir: 'btl/sex-abuse-ca-womens-prisons', survivor: true},
  {tenant: 'BTL', dir: 'btl/rideshare-sex-abuse', survivor: true},
  {tenant: 'NIL', dir: 'nil/mva-pi', survivor: false},
  {tenant: 'NIL', dir: 'nil/rideshare-sex-abuse', survivor: true},
];
const PAGES = ['index.html', 'quiz/index.html', 'talk-to-sofia/index.html'];
const ID = {
  BTL: {gtm: 'GTM-PHC7459M', ga4: '423835322', pixel: '673552078259404', tiktok: 'CTCC4OJC77UF4MDQQOA0', brand: 'Best Tort Lawyers'},
  NIL: {gtm: 'GTM-NKLD8KST', ga4: '530695235', pixel: '1464576608376747', tiktok: 'D77KL3RC77U88469GTT0', brand: 'Nearest Injury Lawyers'},
};
const OTHER = {BTL: 'NIL', NIL: 'BTL'};
// Bound public numbers per tenant (Kyle-authorized 2026-09-29). The other tenant's
// number, the MA/LFMA line, Phillips transfer lines, and the old 888 placeholder
// must never appear in a lane's files.
const TENANT_PHONE = {BTL: /202\D{0,3}932\D?9700/, NIL: /602\D{0,3}693\D?1461/};
const FORBIDDEN_NUMBERS = [/213\D{0,3}878\D?7408/, /213\D{0,3}513\D?7977/, /602\D{0,3}200\D?39(60|76)/, /888\D{0,3}888\D?8888/];
const FORBIDDEN_COPY = [/signed matters/i, /segment conversion/i, /hook\.us2\.make\.com/i, /you qualify\b/i];

// Everything a lane folder ships: pages plus any lane-local css/js.
function laneFiles(dir) {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(d, {withFileTypes: true})) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(html|css|js)$/.test(e.name)) out.push(p);
  } };
  walk(dir);
  return out;
}
const read = f => fs.readFileSync(f, 'utf8');

test('5 lanes × 3 pages = 15 pages exist', () => {
  let n = 0;
  for (const l of LANES) for (const p of PAGES) { assert.ok(fs.existsSync(`${l.dir}/${p}`), `${l.dir}/${p}`); n++; }
  assert.equal(n, 15);
});

test('BTL/NIL identity separation — no cross-tenant IDs, brand names or assets', () => {
  for (const l of LANES) {
    const other = ID[OTHER[l.tenant]];
    for (const f of laneFiles(l.dir)) {
      const s = read(f);
      for (const v of [other.gtm, other.ga4, other.pixel, other.tiktok, other.brand]) assert.ok(!s.includes(v), `${f} contains ${v}`);
      if (l.tenant === 'NIL') assert.ok(!/btl-seal|\/paraquat\//.test(s), `${f} references BTL assets`);
      if (l.tenant === 'BTL') assert.ok(!/\.\.\/nil\/|nil\/assets/.test(s), `${f} references NIL assets`);
    }
  }
});

test('BTL and NIL rideshare lanes are separate builds (no identical files)', () => {
  const hash = f => read(f).replace(/\s+/g, ' ');
  const btl = new Set(laneFiles('btl/rideshare-sex-abuse').map(hash));
  for (const f of laneFiles('nil/rideshare-sex-abuse')) assert.ok(!btl.has(hash(f)), `${f} duplicated from BTL`);
});

test('tracking contract on every page', () => {
  for (const l of LANES) for (const p of PAGES) {
    const f = `${l.dir}/${p}`, s = read(f), id = ID[l.tenant];
    assert.ok(s.includes(`googletagmanager.com/gtm.js`) && s.includes(id.gtm), `${f} GTM`);
    assert.ok(s.includes(`ns.html?id=${id.gtm}`), `${f} GTM noscript`);
    assert.match(s, /window\.EE_LANE\s*=/, `${f} EE_LANE`);
    assert.match(s, new RegExp(`tenant\\s*:\\s*["']${l.tenant}["']`), `${f} tenant`);
    assert.ok(s.includes(id.ga4), `${f} GA4 property`);
    assert.ok(s.includes(id.pixel), `${f} Meta pixel slot`);
    assert.match(s, new RegExp(`tiktok_pixel\\s*:\\s*["']${id.tiktok}["']`), `${f} TikTok pixel`);
    assert.ok(s.includes('ttq.load(L.tiktok_pixel)'), `${f} TikTok loader`);
    assert.match(s, /<meta name="ee-disclaimer-status" content="pending-attorney-review">/, `${f} disclaimer status`);
    assert.match(s, /<meta name="ee-state-disclaimer-status" content="pending-attorney-review">/, `${f} state disclaimer status`);
    assert.match(s, /ATTORNEY ADVERTISING/i, `${f} attorney advertising`);
  }
});

test('page events are wired (non-identifying)', () => {
  for (const l of LANES) {
    const all = laneFiles(l.dir).map(read).join('\n');
    for (const e of ['ee_page_view', 'ee_quiz_start', 'ee_qualification_complete', 'ee_qualified', 'ee_disqualified', 'ee_sofia_start', 'ee_call_request'])
      assert.ok(all.includes(e), `${l.dir} missing ${e}`);
  }
});

test('landing pages route to Sofia and the quiz', () => {
  for (const l of LANES) {
    const s = read(`${l.dir}/index.html`);
    assert.match(s, /href="(\.\/|\/[a-z-]+\/)talk-to-sofia\/"/, `${l.dir} Sofia CTA`);
    assert.match(s, /href="(\.\/|\/[a-z-]+\/)quiz\/"/, `${l.dir} quiz link`);
  }
});

test('bound tenant phones; no wrong-tenant, internal, or placeholder numbers', () => {
  for (const l of LANES) {
    for (const p of PAGES) {
      const f = `${l.dir}/${p}`, s = read(f);
      assert.ok(TENANT_PHONE[l.tenant].test(s), `${f} missing bound ${l.tenant} number`);
      assert.ok(!TENANT_PHONE[OTHER[l.tenant]].test(s), `${f} contains the other tenant's number`);
    }
    for (const f of laneFiles(l.dir)) {
      const s = read(f);
      for (const re of FORBIDDEN_NUMBERS) assert.ok(!re.test(s), `${f} contains forbidden number ${re}`);
      for (const re of FORBIDDEN_COPY) assert.ok(!re.test(s), `${f} contains forbidden copy ${re}`);
      assert.ok(!/fetch\(\s*["']https?:/.test(s), `${f} posts to a hard-coded URL`);
    }
  }
});

test('survivor lanes never ask for assault details', () => {
  for (const l of LANES.filter(x => x.survivor)) for (const p of PAGES) {
    const f = `${l.dir}/${p}`, s = read(f);
    assert.ok(!/<textarea/i.test(s), `${f} has a free-text field`);
    for (const m of s.matchAll(/<label[^>]*>([\s\S]*?)<\/label>|<legend[^>]*>([\s\S]*?)<\/legend>/gi)) {
      const t = (m[1] || m[2] || '').replace(/<[^>]+>/g, ' ');
      assert.ok(!/(what happened|describe|details? of|how did (it|he|she)|tell us about the (assault|abuse|incident))/i.test(t), `${f} asks: ${t.trim()}`);
    }
    assert.match(s, /1-800-656-4673/, `${f} RAINN support line`);
  }
});

test('candidate pages are not indexable yet', () => {
  for (const l of LANES) for (const p of PAGES)
    assert.match(read(`${l.dir}/${p}`), /<meta name="robots" content="noindex/, `${l.dir}/${p}`);
});
