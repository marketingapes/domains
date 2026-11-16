import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const read = (p) => fs.readFileSync(p, 'utf8');
const data = JSON.parse(read(path.join(ROOT, 'tools/adsense-builders/ddm/bfcm_data.json')));
const GUIDES = ['under-25', 'under-50', 'under-100', 'for-mom', 'for-dad', 'for-teens', 'for-pets', 'for-the-kitchen'];
const PAGES = ['black-friday', 'cyber-monday', 'gifts', ...GUIDES.map((g) => `gifts/${g}`)];
const html = Object.fromEntries(PAGES.map((p) => [p, read(path.join(SITE, p, 'index.html'))]));
const DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases.';
const TAG = data.amazon.tag;

test('DDM BFCM: every hub and gift-guide page exists with canonical, description and no AdSense', () => {
  for (const [p, h] of Object.entries(html)) {
    assert.match(h, new RegExp(`<link rel="canonical" href="https://discountdealme\\.com/${p}/">`), `${p} canonical`);
    assert.match(h, /<meta name="description" content="[^"]{60,}"/, `${p} description`);
    assert.doesNotMatch(h, /adsbygoogle|google-adsense-account/, `${p} must not load AdSense`);
  }
});

test('DDM BFCM: AdSense stays off every deal page', () => {
  for (const p of ['deals/index.html', 'deals/kitchenaid-harvest-event/index.html', 'offers/index.html', 'gift-planner/index.html']) {
    assert.doesNotMatch(read(path.join(SITE, p)), /adsbygoogle|google-adsense-account/, p);
  }
  assert.match(read(path.join(SITE, 'index.html')), /adsbygoogle/, 'home keeps AdSense');
});

test('DDM BFCM: Amazon links are tagged dp links with the exact disclosure, no prices, ratings or Amazon images', () => {
  assert.match(TAG, /^[a-z0-9-]+-2\d$/);
  for (const [p, h] of Object.entries(html)) {
    const links = [...h.matchAll(/href="(https:\/\/www\.amazon\.com[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (!links.length) continue;
    assert.ok(h.includes(DISCLOSURE), `${p} missing exact Amazon disclosure`);
    for (const l of links) assert.match(l, new RegExp(`^https://www\\.amazon\\.com/dp/[A-Z0-9]{10}\\?tag=${TAG}$`), `${p} bad Amazon link ${l}`);
    for (const m of h.matchAll(/<article class="pick"[\s\S]*?<\/article>/g)) {
      assert.doesNotMatch(m[0], /\$\s?\d|stars?\b|ratings?\b|reviews?\b|\bwas\b/i, `${p} Amazon card shows a price, rating or was-price`);
      assert.match(m[0], /Check price on Amazon/);
      assert.match(m[0], /rel="sponsored nofollow noopener"/);
    }
    assert.doesNotMatch(h, /media-amazon\.com|images-amazon\.com|ssl-images-amazon/, `${p} uses an Amazon image`);
  }
});

test('DDM BFCM: guide product counts match the data and every ASIN is unique and well formed', () => {
  const asins = data.amazon.products.map((p) => p.asin);
  assert.equal(new Set(asins).size, asins.length);
  for (const g of GUIDES) {
    const want = data.amazon.products.filter((p) => p.guides.includes(g)).length;
    assert.ok(want >= 6, `${g} has only ${want} Amazon picks`);
    assert.equal((html[`gifts/${g}`].match(/<article class="pick"/g) || []).length, want, `${g} pick count`);
  }
});

test('DDM BFCM: store deals are CJ links on DDM property 101511733 with network terms and end times', () => {
  const ids = new Set(data.deals.map((d) => d.link_id));
  for (const [p, h] of Object.entries(html)) {
    for (const m of h.matchAll(/<article class="deal bf-deal"[\s\S]*?<\/article>/g)) {
      const card = m[0];
      const href = card.match(/class="btn btn-deal"[^>]*href="([^"]+)"/)[1];
      const mm = href.match(/^https:\/\/www\.(?:dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-101511733-(\d+)-\d+\?sid=ddm-[a-z0-9-]+$/);
      assert.ok(mm, `${p} bad CJ link ${href}`);
      assert.ok(ids.has(mm[1]), `${p} link ${mm[1]} not in data snapshot`);
      assert.match(card, /data-ends="\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ"/, `${p} card has no end time`);
      assert.match(card, /AI summary/);
      assert.match(card, /Terms as published by/);
    }
  }
  assert.match(html['gifts/for-mom'], /awin1\.com\/cread\.php\?awinmid=33247&amp;awinaffid=2572337/);
});

test('DDM BFCM: countdowns, explainer, price-drop alerts and expiry script are on every page', () => {
  for (const [p, h] of Object.entries(html)) {
    assert.match(h, /data-countdown data-target="2026-11-(27|30)T08:00:00Z"/, `${p} countdown`);
    assert.match(h, /Is it really a deal\?/, `${p} explainer`);
    assert.match(h, /href="\/how-we-pick-deals\/#deal-score"/, `${p} explainer links the Deal Score`);
    assert.match(h, /Price-drop alerts/, `${p} signup`);
    assert.match(h, /data-signup="[a-z0-9-]+"/);
    assert.match(h, /\/assets\/bfcm\.js/);
  }
  assert.match(html['black-friday'], /data-target="2026-11-27T08:00:00Z"/);
  assert.match(html['cyber-monday'], /data-target="2026-11-30T08:00:00Z"/);
  const js = read(path.join(SITE, 'assets/bfcm.js'));
  assert.match(js, /data-ends/);
  assert.match(js, /hidden=true/);
});

test('DDM BFCM: linked from nav, homepage and sitemap; internal links resolve', () => {
  const home = read(path.join(SITE, 'index.html'));
  assert.match(home, /class="main-nav"[^]*?href="\/black-friday\/"/);
  assert.match(home, /bfcm-banner[^]*?href="\/black-friday\/"[^]*?href="\/cyber-monday\/"[^]*?href="\/gifts\/"/);
  const sm = read(path.join(SITE, 'sitemap.xml'));
  for (const p of PAGES) assert.ok(sm.includes(`<loc>https://discountdealme.com/${p}/</loc>`), `sitemap missing ${p}`);
  const resolves = (href) => {
    const c = href.split(/[?#]/)[0];
    if (!c || c === '/') return true;
    const f = path.join(SITE, c);
    return (fs.existsSync(f) && fs.statSync(f).isFile()) || fs.existsSync(path.join(f, 'index.html'));
  };
  for (const [p, h] of Object.entries(html)) {
    for (const m of h.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g)) assert.ok(resolves(m[1]), `${p} -> ${m[1]} broken`);
  }
});

test('DDM BFCM: no invented stats, fake was-prices or review claims in page copy', () => {
  for (const [p, h] of Object.entries(html)) {
    const text = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /\bwas \$\d|list price: \$|\d(\.\d)? out of 5|\d[\d,]* (customer )?reviews|best-?selling #|#1 best/i, `${p}`);
  }
});
