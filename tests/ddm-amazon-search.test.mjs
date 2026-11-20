import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const read = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');
const TAG = 'tonedntastyne-20'; // TNT Associates tag (tonedntasty.com generator/lib/offers.mjs), Kyle's call Nov 15 2026

test('DDM Amazon spec search: homepage form carries the TNT tag, disclosures, and no Amazon prices or ratings', () => {
  const home = read('index.html');
  assert.match(home, /<form class="finder-card" id="amz-form"[^>]*data-tag="tonedntastyne-20"/);
  assert.match(home, /<input type="hidden" name="tag" value="tonedntastyne-20">/);
  for (const name of ['k', 'min', 'max', 'size', 'use', 'feat', 'more', 's']) assert.match(home, new RegExp(`name="${name}"`), name);
  assert.match(home, /As an Amazon Associate, Discount Deal Me earns from qualifying purchases\./);
  assert.match(home, /Check on Amazon <span class="adchip-sm">#ad<\/span>/);
  assert.match(home, /We don&rsquo;t see or track Amazon prices/);
  for (const m of home.matchAll(/<a [^>]*href="https:\/\/www\.amazon\.com[^"]*"[^>]*>/g)) {
    assert.match(m[0], /tag=tonedntastyne-20/);
    assert.match(m[0], /rel="sponsored nofollow noopener"/);
  }
  assert.doesNotMatch(home, /cheapest on Amazon|lowest price on Amazon|★|stars? rating/i);
  assert.match(home, /\/assets\/amazon-search\.js/);
});

test('DDM Amazon spec search: the script builds a tagged, price-filtered Amazon search URL', () => {
  const js = read('assets/amazon-search.js');
  assert.doesNotMatch(js, /https?:\/\//, 'the Amazon base URL comes from the form, not the script');
  const fields = { k: 'air fryer', min: '40', max: '100', size: '6 qt', use: 'kitchen', more: '', s: 'price-asc-rank' };
  let submit; let shown = null;
  const el = (extra = {}) => ({ hidden: true, innerHTML: '', textContent: '', href: '', focus() {}, scrollIntoView() {}, ...extra });
  const nodes = { matches: el(), 'm-query': el(), 'm-amz': el(), 'm-deals': el(), 'm-none': el() };
  const form = {
    getAttribute: (a) => ({ 'data-tag': TAG, 'data-amz': 'https://www.amazon.com/s' })[a],
    elements: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { value: v, options: [{ text: 'Price: low to high' }], selectedIndex: 0 }])),
    querySelectorAll: () => [{ value: 'Dishwasher safe' }],
    addEventListener: (t, fn) => { if (t === 'submit') submit = fn; },
    reset() {},
  };
  const document = { getElementById: (id) => (id === 'amz-form' ? form : nodes[id]), querySelectorAll: () => [] };
  vm.runInNewContext(js, { document, window: {}, location: { search: '' }, URLSearchParams, fetch: () => new Promise(() => {}), Date, Math, JSON, parseFloat, String, Promise });
  submit({ preventDefault() {} });
  shown = new URL(nodes['m-amz'].href);
  assert.equal(shown.origin + shown.pathname, 'https://www.amazon.com/s');
  assert.equal(shown.searchParams.get('tag'), TAG);
  assert.equal(shown.searchParams.get('k'), 'air fryer 6 qt dishwasher safe for kitchen');
  assert.equal(shown.searchParams.get('rh'), 'p_36:4000-10000');
  assert.equal(shown.searchParams.get('s'), 'price-asc-rank');
  assert.equal(nodes.matches.hidden, false);
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
