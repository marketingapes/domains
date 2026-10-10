import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const BUILDER = path.join(ROOT, 'tools/adsense-builders/ddm');
const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const htmlPages = walk(SITE).filter((f) => f.endsWith('.html'));
const pub = JSON.parse(read(path.join(SITE, 'data/deals.json')));
const internal = JSON.parse(read(path.join(BUILDER, 'deals_feed.json')));

test('DDM redesign: no cartoon fonts, mascots or character art left', () => {
  const css = read(path.join(SITE, 'assets/site.css'));
  for (const f of [...htmlPages, path.join(SITE, 'assets/site.css'), ...walk(path.join(SITE, 'images')).filter((x) => x.endsWith('.svg'))]) {
    const s = read(f);
    assert.doesNotMatch(s, /Fredoka|Baloo|Comic|Bubblegum|Chewy|Luckiest|Sniglet/i, `${path.relative(SITE, f)} uses a cartoon font`);
    assert.doesNotMatch(s, /mascot|piggy|smiley|googly/i, `${path.relative(SITE, f)} mentions a character`);
  }
  assert.match(css, /Inter/);
});

test('DDM redesign: public deal feed only has real CJ links from property 101511733 and no commission data', () => {
  assert.ok(pub.deals.length >= 5);
  assert.equal(pub.count, pub.deals.length);
  const raw = read(path.join(SITE, 'data/deals.json')) + read(path.join(BUILDER, 'deals_feed.json'));
  assert.doesNotMatch(raw, /"(epc|seven_day_epc|three_month_epc|commission|sale_commission)"/i);
  const ids = new Set(internal.deals.map((d) => d.link_id));
  for (const d of pub.deals) {
    assert.match(d.url, /^https:\/\/www\.(dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-101511733-\d+-\d+\?sid=ddm-finder$/);
    assert.ok(ids.has(d.id.replace(/^cj-/, '')), `${d.id} not in network snapshot`);
    assert.ok(d.network_terms.length > 10, `${d.id} has no verbatim network terms`);
    assert.ok(d.score >= 0 && d.score <= 100);
    assert.equal(Math.round(d.score_parts.reduce((a, p) => a + p.points, 0)), d.score, `${d.id} score parts do not add up`);
  }
});

test('DDM redesign: every number in an AI summary appears in the network terms', () => {
  for (const d of internal.deals) {
    const src = `${d.network.terms} ${d.network.link_name} ${d.network.code || ''}`.replace(/,/g, '');
    for (const m of d.summary_ai.replace(/,/g, '').matchAll(/\d+(?:\.\d+)?/g)) {
      assert.ok(src.includes(m[0]), `${d.link_id}: "${m[0]}" in AI summary is not in the network terms`);
    }
  }
});

test('DDM redesign: deal cards are labelled, disclosed and expire client-side', () => {
  const deals = read(path.join(SITE, 'deals/index.html'));
  const home = read(path.join(SITE, 'index.html'));
  for (const html of [deals, home]) {
    assert.match(html, /#ad/);
    assert.match(html, /AI summary/);
    for (const m of html.matchAll(/<a [^>]*href="https:\/\/www\.(?:dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)[^>]*>/g)) {
      assert.match(m[0], /rel="sponsored nofollow noopener"/);
    }
  }
  assert.equal((deals.match(/<article class="deal"/g) || []).length, pub.deals.length);
  assert.match(deals, /id="finder-form"/);
  const js = read(path.join(SITE, 'assets/site.js'));
  assert.match(js, /data-ends/);
  assert.match(js, /\/data\/deals\.json/);
  assert.doesNotMatch(js, /https?:\/\//, 'site.js must not call third-party services');
});

test('DDM redesign: Deal Score formula is published and guides stay affiliate-free', () => {
  const m = read(path.join(SITE, 'how-we-pick-deals/index.html'));
  for (const s of ['id="deal-score"', 'Savings size', 'Certainty', 'Ease', 'Deadline', 'commission']) assert.ok(m.includes(s), s);
  for (const f of htmlPages.filter((x) => x.includes('/articles/'))) {
    assert.doesNotMatch(read(f), /click-101511733|awin1\.com/, `${path.relative(SITE, f)} has an affiliate link`);
  }
});

test('DDM redesign: sign-up form kept and existing URLs still exist', () => {
  for (const u of ['index.html', 'about/index.html', 'contact/index.html', 'privacy/index.html', 'terms/index.html', 'articles/index.html', 'offers/index.html', 'deal-checklist/index.html', 'guides/checkout-comparison/index.html', 'deals/kitchenaid-harvest-event/index.html', '404.html', 'robots.txt', 'sitemap.xml']) {
    assert.ok(fs.existsSync(path.join(SITE, u)), `${u} missing`);
  }
  const home = read(path.join(SITE, 'index.html'));
  assert.match(home, /data-signup/);
  assert.match(home, /DDM_EMAIL_2026-10-09_V1/);
  const sm = read(path.join(SITE, 'sitemap.xml'));
  for (const u of ['/deals/', '/how-we-pick-deals/', '/articles/']) assert.ok(sm.includes(`https://discountdealme.com${u}`), u);
});

test('DDM redesign: builder output is reproducible', () => {
  const snap = (f) => read(path.join(SITE, f));
  const before = ['index.html', 'deals/index.html', 'data/deals.json', 'assets/site.css'].map(snap);
  execFileSync('python3', ['-B', path.join(BUILDER, 'build.py')], { cwd: ROOT, stdio: 'ignore' });
  const after = ['index.html', 'deals/index.html', 'data/deals.json', 'assets/site.css'].map(snap);
  assert.deepEqual(after, before);
});

test('DDM redesign: promo codes come only from the network coupon-code field', () => {
  const editorial = read(path.join(BUILDER, 'deals_editorial.json'));
  assert.doesNotMatch(editorial, /"code"\s*:/, 'codes must not be typed into the editorial layer');
  const byId = new Map(internal.deals.map((d) => [d.link_id, d]));
  for (const d of pub.deals) {
    const n = byId.get(d.id.replace(/^cj-/, '')).network;
    assert.equal(d.code, n.code, `${d.id} code differs from the network record`);
    if (d.code) assert.match(d.code, /^[A-Z0-9]{3,20}$/);
  }
});
