// First-party click-ID capture (tools/ee-click) and the AdSense-on-content-pages-only rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('tools/ee-click/ee-click.js');
const SITES = { fplb: 'forpetslikeblue.com', ddm: 'discountdealme.com', h2m: 'hair2makeup.com', px: 'pillowexchange.com',
  cgg: 'crazygolfgame.com', kg: 'kylegosselin.com', ma: 'marketingapes.com', btl: 'besttortlawyers.com' };
// Byte-pinned by tests/affiliate-guides.test.mjs, so it cannot take the tag.
const PINNED = new Set(['px/guides/pillow-cover-fit/index.html']);
const DEAL = /^(offers|deals|gift-finder|gift-planner|gifts|black-friday|cyber-monday|coupons|deal-checklist|deal-checker|black-friday-golf-deals-2026)(\/|$)/;

for (const [site, host] of Object.entries(SITES)) {
  test(`ee-click ${site}: copy is byte-identical to tools/ee-click/ee-click.js`, () => {
    assert.equal(read(`${site}/assets/ee-click.js`), SRC);
  });
  test(`ee-click ${site}: every sitemap page loads the capture script`, () => {
    const sm = read(`${site}/sitemap.xml`);
    const locs = [...sm.matchAll(/<loc>\s*https:\/\/(?:www\.)?[^/]+\/([^<\s]*)\s*<\/loc>/g)].map((m) => m[1]);
    assert.ok(locs.length > 0);
    for (const rel of locs) {
      let f = rel === '' || rel.endsWith('/') ? `${site}/${rel}index.html` : `${site}/${rel}`;
      if (!fs.existsSync(path.join(ROOT, f))) continue;
      const html = read(f);
      if (/http-equiv="refresh"/.test(html) || PINNED.has(f)) continue;
      assert.match(html, /<script src="\/assets\/ee-click\.js\?v=1" defer data-site="[a-z0-9]+"/, `${f} missing ee-click`);
    }
  });
}

test('AdSense loader is never on deal or shopping pages', () => {
  // FPLB exception (Kyle, Nov 20 2026): labeled display units were requested on
  // /deals/, /offers/, /gift-finder/ and /amazon-dog-deals/. Other FPLB shopping
  // paths, and deal pages on other brands, still must not load the AdSense script.
  const FPLB_ADS_OK = /^(offers|deals|gift-finder)\/index\.html$/;
  for (const site of ['fplb', 'ddm', 'h2m', 'px', 'cgg']) {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    for (const f of walk(path.join(ROOT, site)).filter((x) => x.endsWith('.html'))) {
      const rel = path.relative(path.join(ROOT, site), f).split(path.sep).join('/');
      if (!DEAL.test(rel)) continue;
      if (site === 'fplb' && FPLB_ADS_OK.test(rel)) continue;
      assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /adsbygoogle\.js/, `${site}/${rel} loads AdSense`);
    }
  }
});

function boot(url, cookie = '') {
  const jar = new Map(cookie.split('; ').filter(Boolean).map((c) => c.split('=')));
  const store = new Map();
  const listeners = {};
  const document = {
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(v) { const [kv] = v.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); },
    currentScript: { getAttribute: (n) => (n === 'data-site' ? 'fplb' : null) },
    referrer: '', readyState: 'complete',
    querySelectorAll: () => [], addEventListener: (t, f) => { (listeners[t] ||= []).push(f); },
  };
  const u = new URL(url);
  const window = { dataLayer: [] };
  const ctx = { window, document, location: { href: u.href, hostname: u.hostname, pathname: u.pathname, search: u.search, origin: u.origin, protocol: u.protocol },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    URL, URLSearchParams, crypto: globalThis.crypto, JSON, Math, Date, String, Object, Uint8Array, RegExp };
  vm.runInNewContext(SRC, ctx);
  return { ee: window.eeClick, jar, dataLayer: window.dataLayer };
}

test('ee-click: stores click IDs, builds _fbc/_fbp and a visitor id', () => {
  const { ee, jar, dataLayer } = boot('https://forpetslikeblue.com/black-friday/?gclid=abc123&fbclid=FBX&utm_source=facebook&utm_campaign=bf');
  assert.match(ee.id, /^[a-z0-9]{10}$/);
  const f = ee.fields();
  assert.equal(f.gclid, 'abc123'); assert.equal(f.fbclid, 'FBX'); assert.equal(f.utm_source, 'facebook');
  assert.match(f.fbc, /^fb\.1\.\d+\.FBX$/); assert.match(f.fbp, /^fb\.1\.\d+\.\d{10}$/);
  assert.equal(f.ee_source, 'g');
  assert.ok(jar.get('ee_id') && jar.get('ee_attr') && jar.get('_fbc') && jar.get('_fbp'));
  assert.equal(dataLayer[0].event, 'ee_click_ids');
});

test('ee-click: keeps existing tags and appends the visitor id per network', () => {
  const { ee } = boot('https://forpetslikeblue.com/?ttclid=T1');
  const id = ee.id;
  const cj = new URL(ee.tag('https://www.tkqlhce.com/click-101511028-13084479?sid=fplb-bf-chewy&url=https%3A%2F%2Fx.com'));
  assert.equal(cj.searchParams.get('sid'), `fplb-bf-chewy_${id}_t`);
  assert.equal(cj.searchParams.get('url'), 'https://x.com');
  const again = new URL(ee.tag(cj.toString()));
  assert.equal(again.searchParams.get('sid'), `fplb-bf-chewy_${id}_t`, 'idempotent');
  const cjPath = ee.tag('https://www.anrdoezrs.net/links/101511028/type/dlg/sid/tnt-x/https://www.vitamix.com/');
  assert.ok(cjPath.includes(`/sid/tnt-x_${id}_t/`));
  const aw = new URL(ee.tag('https://www.awin1.com/cread.php?awinmid=1&awinaffid=2&clickref=fplb-bf-a&ued=https%3A%2F%2Fy.com'));
  assert.equal(aw.searchParams.get('clickref'), 'fplb-bf-a'); assert.equal(aw.searchParams.get('clickref2'), id); assert.equal(aw.searchParams.get('clickref3'), 't');
  const im = new URL(ee.tag('https://bestchoiceproducts.sjv.io/c/335485/2873487/33479?subId1=fplb-bf-bestchoice&u=https%3A%2F%2Fz.com'));
  assert.equal(im.searchParams.get('subId1'), 'fplb-bf-bestchoice'); assert.equal(im.searchParams.get('subId2'), id);
  const amz = new URL(ee.tag('https://www.amazon.com/dp/B000?tag=tonedntasty-20'));
  assert.equal(amz.searchParams.get('tag'), 'tonedntasty-20'); assert.match(amz.searchParams.get('ascsubtag'), new RegExp(`_${id}_t$`));
  assert.equal(ee.tag('https://www.chewy.com/x?y=1'), 'https://www.chewy.com/x?y=1', 'non-affiliate links untouched');
  assert.ok(cj.searchParams.get('sid').length <= 64);
});

test('ee-click: the visitor id survives a later visit', () => {
  const first = boot('https://forpetslikeblue.com/?gclid=G1');
  const cookie = [...first.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const second = boot('https://forpetslikeblue.com/offers/', cookie);
  assert.equal(second.ee.id, first.ee.id);
  assert.equal(second.ee.fields().gclid, 'G1');
});
