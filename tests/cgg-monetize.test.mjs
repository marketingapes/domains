import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cgg');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const ALL = walk(ROOT).map((f) => path.relative(ROOT, f).split(path.sep).join('/')).filter((r) => !r.startsWith('preview/'));
const DEAL = ['offers/index.html', 'gear/index.html', 'black-friday-golf-deals-2026/index.html'];
const NO_UNITS = ['about/index.html', 'contact/index.html', 'contact.html', 'privacy/index.html', 'terms/index.html', 'credits/index.html', '404.html'];

test('CGG deal pages carry no AdSense script and no ad units', () => {
  for (const rel of DEAL) assert.doesNotMatch(read(rel), /adsbygoogle|cgg-ads\.js/, rel);
});

test('CGG in-content units: content pages only, labelled, no hard-coded slot IDs', () => {
  let total = 0;
  for (const rel of ALL) {
    const html = read(rel);
    const units = html.match(/<ins class="adsbygoogle"[^>]*data-cgg-ad="[^"]+"[^>]*>/g) || [];
    if (DEAL.includes(rel) || NO_UNITS.includes(rel)) { assert.equal(units.length, 0, rel); continue; }
    if (!units.length) continue;
    total += units.length;
    assert.ok(units.length <= 3, `${rel} has ${units.length} units`);
    for (const u of units) {
      assert.match(u, /data-ad-client="ca-pub-5194583669093303"/);
      assert.doesNotMatch(u, /data-ad-slot=/, `${rel} hard-codes a slot`);
    }
    assert.equal((html.match(/<aside class="cgg-ad" aria-label="Advertisement"/g) || []).length, units.length, rel);
    assert.match(html, /<script src="\/assets\/cgg-ads\.js" defer><\/script>/, rel);
    assert.match(html, /data-cgg="nov15-tags"/, `${rel} lost the lazy loader`);
  }
  assert.ok(total >= 70, `only ${total} units`);
});

test('CGG ad slot is one config value and requests nothing until it is real', () => {
  const js = read('assets/cgg-ads.js');
  assert.equal((js.match(/var CGG_AD_SLOT = "[^"]*";/g) || []).length, 1);
  assert.match(js, /\^\\d\{6,\}\$/);
});

test('CGG affiliate links are sponsored+nofollow and their pages are disclosed', () => {
  for (const rel of ALL) {
    const html = read(rel);
    const aff = html.match(/<a [^>]*data-offer="[^"]+"[^>]*>/g) || [];
    for (const a of aff) assert.match(a, /rel="sponsored nofollow noopener"/, `${rel}: ${a.slice(0, 80)}`);
    if (aff.length) assert.match(html, /data-cgg="nov25-disclosure"/, `${rel} lacks the disclosure`);
  }
  assert.match(read('offers/index.html'), /id="disclosure"/);
});
