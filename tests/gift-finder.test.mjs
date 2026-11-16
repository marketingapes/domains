import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'tools/gift-finder');
const require = createRequire(import.meta.url);
const GF = require(path.join(SRC, 'gift-finder.js'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SITES = ['fplb', 'px', 'h2m'].filter((s) => fs.existsSync(path.join(ROOT, s, 'gift-finder/index.html')));
const HOSTS = { fplb: 'forpetslikeblue.com', px: 'pillowexchange.com', h2m: 'hair2makeup.com' };
const AFF = /^https:\/\/(www\.awin1\.com\/(cread|awclick)\.php\?|www\.(tkqlhce|jdoqocy|kqzyfj|dpbolvw|anrdoezrs)\.com\/click-101511028-|bestchoiceproducts\.sjv\.io\/c\/335485\/)/;

test('gift finder: at least one site ships it', () => assert.ok(SITES.length >= 1));

for (const site of SITES) {
  const gifts = JSON.parse(read(`${site}/data/gifts.json`));
  const cat = JSON.parse(read(`tools/gift-finder/catalogs/${site}.json`));

  test(`gift finder ${site}: shared component copies are byte-identical to the source`, () => {
    assert.equal(read(`${site}/assets/gift-finder.js`), read('tools/gift-finder/gift-finder.js'));
    assert.equal(read(`${site}/assets/gift-finder.css`), read('tools/gift-finder/gift-finder.css'));
  });

  test(`gift finder ${site}: page is disclosed, canonical, linked, and has no AI label or em dash`, () => {
    const html = read(`${site}/gift-finder/index.html`);
    assert.match(html, /#ad/);
    assert.match(html, /affiliate links/);
    assert.match(html, /may earn a commission/);
    assert.match(html, new RegExp(`rel="canonical" href="https://${HOSTS[site]}/gift-finder/"`));
    assert.match(html, /id="gift-finder" data-site="/);
    assert.match(html, /\/assets\/gift-finder\.js/);
    assert.match(html, /googletagmanager|GTM-/, 'keeps the site tag manager');
    assert.match(html, /ca-pub-5194583669093303/, 'keeps AdSense');
    for (const s of [html, JSON.stringify(gifts), read(`${site}/assets/gift-finder.js`)]) {
      assert.doesNotMatch(s, /AI[- ]generated|AI summary|\u2014/);
    }
    assert.match(read(`${site}/index.html`), /href="\/gift-finder\/"/);
    assert.ok(read(`${site}/sitemap.xml`).includes(`https://${HOSTS[site]}/gift-finder/`));
  });

  test(`gift finder ${site}: only checked products with existing affiliate programs, tagged for this site, no Amazon`, () => {
    assert.ok(gifts.products.length >= 5, `${site} has ${gifts.products.length} products`);
    assert.ok(Date.parse(gifts.checked_at) > Date.parse('2026-11-01'));
    const byId = new Map(cat.products.map((p) => [p.id, p]));
    for (const p of gifts.products) {
      const src = byId.get(p.id);
      assert.ok(src, `${p.id} not in the catalog`);
      assert.equal(p.url, src.url, `${p.id} url differs from catalog`);
      assert.match(p.url, AFF, `${p.id} is not an existing affiliate link`);
      assert.match(p.url, new RegExp(`(clickref|sid|subId1)=${site}-gift-`), `${p.id} missing ${site}-gift tracking tag`);
      assert.doesNotMatch(p.url, /amazon\.|amzn\./i);
      assert.ok(p.verified_host.endsWith(src.expect_host), `${p.id} landed on ${p.verified_host}`);
      assert.equal(p.available, true);
      if (p.price_from != null) assert.ok(p.price_from > 0 && p.price_to >= p.price_from);
      if (p.image) assert.match(p.image, /^https:\/\/[^/]+\/.+/);
      for (const q of gifts.questions) for (const t of p.tags[q.id] || []) {
        assert.ok(t === 'any' || q.options.some((o) => o.v === t), `${p.id}: tag ${q.id}=${t} is not an option`);
      }
    }
    assert.doesNotMatch(read(`${site}/gift-finder/index.html`), /amazon\.com|amzn\.to/);
  });

  test(`gift finder ${site}: every answer combination returns picks that respect required answers and budget`, () => {
    const qs = gifts.questions;
    const combos = qs.reduce((acc, q) => acc.flatMap((a) => [undefined, ...q.options.map((o) => o.v)].map((v) => ({ ...a, [q.id]: v }))), [{}]);
    let empty = 0;
    for (const base of combos) for (const b of [undefined, ...gifts.budgets.map((x) => x.v)]) {
      const ans = { ...base, budget: b };
      const picks = GF.pick(gifts, ans, 6);
      if (!picks.length) empty++;
      const band = gifts.budgets.find((x) => x.v === b);
      for (const { p } of picks) {
        for (const q of qs.filter((x) => x.required && ans[x.id])) {
          const t = p.tags[q.id] || [];
          assert.ok(t.includes(ans[q.id]) || t.includes('any'), `${p.id} ignores required ${q.id}`);
        }
        if (band && p.price_from != null) assert.ok(p.price_from <= band.max, `${p.id} over budget ${b}`);
      }
      assert.ok(picks.length <= 6);
    }
    assert.ok(empty / (combos.length * (gifts.budgets.length + 1)) < 0.35, `${site}: too many empty results (${empty})`);
  });
}

test('gift finder: pick() ranks matches first, hides sold-out items and caps each merchant at two before others', () => {
  const cat = { questions: [{ id: 'pet', required: true, weight: 12, options: [{ v: 'dog', label: 'Dog' }, { v: 'cat', label: 'Cat' }] }],
    budgets: [{ v: 'u25', label: 'Under $25', min: 0, max: 25 }],
    products: [
      { id: 'a', merchant: 'M1', tags: { pet: ['dog'] }, price_from: 10 }, { id: 'b', merchant: 'M1', tags: { pet: ['dog'] }, price_from: 12 },
      { id: 'c', merchant: 'M1', tags: { pet: ['dog'] }, price_from: 14 }, { id: 'd', merchant: 'M2', tags: { pet: ['dog'] }, price_from: 20 },
      { id: 'e', merchant: 'M3', tags: { pet: ['cat'] }, price_from: 5 }, { id: 'f', merchant: 'M4', tags: { pet: ['dog'] }, price_from: 90 },
      { id: 'g', merchant: 'M5', tags: { pet: ['dog'] }, price_from: 8, available: false }] };
  const ids = GF.pick(cat, { pet: 'dog', budget: 'u25' }, 6).map((x) => x.p.id);
  assert.deepEqual(ids, ['a', 'b', 'd', 'c']);
});

test('gift finder: build is reproducible', () => {
  if (!SITES.length) return;
  const snap = () => SITES.flatMap((s) => [`${s}/gift-finder/index.html`, `${s}/index.html`, `${s}/sitemap.xml`, `${s}/assets/gift-finder.js`].map(read));
  const before = snap();
  execFileSync('python3', ['-B', path.join(SRC, 'build.py'), ...SITES], { cwd: ROOT, stdio: 'ignore' });
  assert.deepEqual(snap(), before);
});
