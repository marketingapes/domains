import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const read = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');
const TAG = 'tonedntastyne-20'; // TNT Associates tag (tonedntasty.com generator/lib/offers.mjs), Kyle's call Nov 15 2026

test('DDM smart search: one box with the TNT tag, the Amazon-offers button, disclosures, and no Amazon prices, ratings or images', () => {
  const home = read('index.html');
  assert.match(home, /<form class="smart" id="amz-form"[^>]*data-tag="tonedntastyne-20"/);
  assert.match(home, /<input type="hidden" name="tag" value="tonedntastyne-20">/);
  assert.match(home, /<input id="amz-q" name="k" type="search" placeholder="What are you shopping for\? e\.g\. air fryer under \$100"/);
  assert.match(home, /<button class="btn btn-amz" type="submit">Find the best Amazon offers<\/button>/);
  assert.equal((home.match(/<form class="smart"[\s\S]*?<\/form>/)[0].match(/<input /g) || []).length, 3, 'one visible input plus hidden tag and sort');
  assert.match(home, /As an Amazon Associate, Discount Deal Me earns from qualifying purchases\./);
  assert.match(home, /we don&rsquo;t track or show Amazon prices/);
  for (const m of home.matchAll(/<a [^>]*href="https:\/\/www\.amazon\.com[^"]*"[^>]*>/g)) assert.match(m[0], /tag=tonedntastyne-20/);
  assert.doesNotMatch(home, /media-amazon\.com|ssl-images-amazon|images-na\.ssl/i, 'no Amazon-hosted images');
  assert.doesNotMatch(home, /cheapest on Amazon|lowest price on Amazon|★|stars? rating/i);
  assert.match(home, /\/assets\/amazon-search\.js/);
  // other offers with images, category tiles with photos, and a carousel
  assert.ok((home.match(/<article class="ocard"/g) || []).length >= 8);
  assert.match(home, /id="offers-grid"/);
  assert.ok((home.match(/<a class="ctile"/g) || []).length >= 5);
  assert.match(home, /data-carousel/);
  for (const m of home.matchAll(/<img [^>]*>/g)) {
    assert.match(m[0], /width="\d+" height="\d+"/, `image without dimensions: ${m[0]}`);
    const src = m[0].match(/src="([^"]+)"/)[1];
    if (src.startsWith('/')) assert.ok(fs.existsSync(path.join(SITE, src)), `missing ${src}`);
  }
});

test('DDM smart search: budget words become Amazon price filters, sorted low to high, tagged', () => {
  const js = read('assets/amazon-search.js');
  assert.doesNotMatch(js, /https?:\/\//, 'the Amazon base URL comes from the form, not the script');
  assert.match(js, /prefers-reduced-motion/);
  const form = { getAttribute: (a) => ({ 'data-tag': TAG, 'data-amz': 'https://www.amazon.com/s' })[a], elements: { k: { value: '' } }, addEventListener() {} };
  const window = {};
  const document = { getElementById: (id) => (id === 'amz-form' ? form : null), querySelectorAll: () => [] };
  vm.runInNewContext(js, { document, window, location: { search: '' }, URLSearchParams, fetch: () => new Promise(() => {}), Date, Math, JSON, String, Promise, matchMedia: () => ({ matches: true }) });
  const u = (q) => new URL(window.DDM_AMZ.build(q));
  let x = u('air fryer under $100');
  assert.equal(x.origin + x.pathname, 'https://www.amazon.com/s');
  assert.equal(x.searchParams.get('k'), 'air fryer');
  assert.equal(x.searchParams.get('rh'), 'p_36:-10000');
  assert.equal(x.searchParams.get('s'), 'price-asc-rank');
  assert.equal(x.searchParams.get('tag'), TAG);
  x = u('standing desk $150-$300');
  assert.equal(x.searchParams.get('k'), 'standing desk');
  assert.equal(x.searchParams.get('rh'), 'p_36:15000-30000');
  x = u('mugs between 40 and 20');
  assert.equal(x.searchParams.get('rh'), 'p_36:2000-4000');
  x = u('tv over 300 dollars');
  assert.equal(x.searchParams.get('k'), 'tv');
  assert.equal(x.searchParams.get('rh'), 'p_36:30000-');
  x = u('coffee maker');
  assert.equal(x.searchParams.get('rh'), null);
  assert.equal(x.searchParams.get('tag'), TAG);
  assert.equal(window.DDM_AMZ.build('   '), '');
});

test('DDM redesign 2026-11: site-wide footer carries the affiliate and Amazon Associates lines; deal pages stay AdSense-free', () => {
  for (const p of ['index.html', 'deals/index.html', 'coupons/index.html', 'deal-checker/index.html', 'black-friday/index.html', 'about/index.html']) {
    const html = read(p);
    assert.match(html, /Some links are affiliate links \(#ad\)/, p);
    assert.match(html, /As an Amazon Associate, Discount Deal Me earns from qualifying purchases\./, p);
  }
  for (const p of ['deals/index.html', 'coupons/index.html', 'deal-checker/index.html', 'black-friday/index.html', 'cyber-monday/index.html', 'gifts/index.html']) {
    assert.doesNotMatch(read(p), /adsbygoogle|ca-pub-5194583669093303/, p);
  }
});
