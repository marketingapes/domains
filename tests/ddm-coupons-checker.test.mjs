import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const BUILDER = path.join(ROOT, 'tools/adsense-builders/ddm');
const read = (p) => fs.readFileSync(p, 'utf8');
const feed = JSON.parse(read(path.join(BUILDER, 'coupons_feed.json')));
const policy = read(path.join(BUILDER, 'coupons_policy.json'));
const hist = JSON.parse(read(path.join(BUILDER, 'price_history.json')));
const pages = () => [path.join(SITE, 'coupons/index.html'), path.join(SITE, 'how-we-verify-codes/index.html'), path.join(SITE, 'deal-checker/index.html'),
  ...feed.stores.map((s) => path.join(SITE, `coupons/${s.slug}/index.html`))];
const CJ = /^https:\/\/www\.(dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-101511733-\d+(-\d+)?(\?|&)/;

test('DDM coupons: a page exists for every store in the feed and nothing else', () => {
  const dirs = fs.readdirSync(path.join(SITE, 'coupons'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  assert.deepEqual(dirs, feed.stores.map((s) => s.slug).sort());
  assert.ok(feed.stores.length >= 10);
});

test('DDM coupons: codes come only from network code fields, never from the policy file', () => {
  assert.doesNotMatch(policy, /"code"\s*:/);
  for (const s of feed.stores) {
    for (const r of [...s.codes, ...s.offers]) {
      if (r.code) assert.match(r.code_field, /^(CJ coupon-code|Impact DefaultPromoCode|Impact PromoCode|Awin voucher code)$/, `${s.slug} ${r.id}`);
      assert.match(r.id, /^(cj|impact|awin)-/);
      assert.ok(['live', 'upcoming'].includes(r.state));
      if (r.ends) assert.ok(r.ends > feed.checked_at, `${r.id} had ended at the pull`);
    }
    assert.equal(s.live_codes, s.codes.filter((r) => r.state === 'live').length);
  }
});

test('DDM coupons: every code shown on a page is in that store\'s network records', () => {
  for (const s of feed.stores) {
    const html = read(path.join(SITE, `coupons/${s.slug}/index.html`));
    const shown = [...html.matchAll(/<code>([^<]+)<\/code>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    const known = new Set(s.codes.map((r) => r.code));
    for (const c of shown) assert.ok(known.has(c), `${s.slug}: ${c} is not a network code`);
    assert.equal(shown.length, s.codes.length);
  }
});

test('DDM coupons: affiliate links are network tracking links and marked sponsored', () => {
  for (const s of feed.stores) {
    const html = read(path.join(SITE, `coupons/${s.slug}/index.html`));
    for (const m of html.matchAll(/<a [^>]*rel="sponsored[^"]*"[^>]*href="([^"]+)"/g)) {
      const u = m[1].replace(/&amp;/g, '&');
      assert.ok(CJ.test(u) || /subId1=ddm-coupons/.test(u) || /clickref=ddm-coupons/.test(u), `${s.slug}: unexpected link ${u.slice(0, 80)}`);
    }
    for (const m of html.matchAll(/<a [^>]*href="https:\/\/www\.(?:dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)[^>]*>/g)) assert.match(m[0], /rel="sponsored nofollow noopener"/);
  }
});

test('DDM coupons and checker: disclosure on every page, no AdSense, no invented stats', () => {
  for (const f of pages()) {
    const html = read(f);
    const rel = path.relative(SITE, f);
    assert.match(html, /#ad/, `${rel} lacks the affiliate disclosure`);
    assert.doesNotMatch(html, /adsbygoogle|google-adsense-account/, `${rel} must not carry AdSense`);
    // Sentences that say what we do NOT publish are fine; anything else naming these stats is not.
    const claims = html.replace(/<[^>]+>/g, ' ').split(/(?<=[.!?])\s+/).filter((t) => !/\b(not|never|no|don.t)\b/i.test(t)).join(' ');
    assert.doesNotMatch(claims, /success rate|\d+% success|worked for \d|user rating|\bvotes?\b/i, `${rel} has an invented stat`);
    assert.doesNotMatch(html, /aggregateRating|reviewCount/, `${rel} has rating schema`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
  }
  const raw = read(path.join(BUILDER, 'coupons_feed.json')) + read(path.join(SITE, 'data/coupons.json')) + read(path.join(SITE, 'data/price-check.json'));
  assert.doesNotMatch(raw, /"(epc|commission|sale_commission|seven-day-epc|IMPACT_AUTH_TOKEN|CJ_API_TOKEN)"/i);
  assert.doesNotMatch(raw, /\/Mediapartners\/IR/);
});

test('DDM coupons: thin pages are noindex and left out of the sitemap; indexable ones are listed', () => {
  const sm = read(path.join(SITE, 'sitemap-tools.xml'));
  assert.match(read(path.join(SITE, 'robots.txt')), /Sitemap: https:\/\/discountdealme\.com\/sitemap-tools\.xml/);
  for (const s of feed.stores) {
    const html = read(path.join(SITE, `coupons/${s.slug}/index.html`));
    const listed = sm.includes(`/coupons/${s.slug}/<`);
    if (s.indexable) { assert.doesNotMatch(html, /noindex/); assert.ok(listed, s.slug); }
    else { assert.match(html, /<meta name="robots" content="noindex,follow">/); assert.ok(!listed, s.slug); }
    assert.match(html, new RegExp(`<title>${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;').replace(/'/g, '&#x27;')} (Promo Codes|Coupons)`));
    if (!s.live_codes) assert.match(html, /No verified .* codes right now/);
  }
  for (const u of ['/coupons/', '/how-we-verify-codes/', '/deal-checker/']) assert.ok(sm.includes(u));
});

test('DDM checker: price log is honest (runs only, no invented history) and the page says when history is thin', () => {
  const pub = JSON.parse(read(path.join(SITE, 'data/price-check.json')));
  assert.ok(pub.check_dates.length >= 1);
  for (const p of pub.products) {
    for (const [f, l, price, sale] of p.r) {
      assert.ok(pub.check_dates.includes(f) && pub.check_dates.includes(l), `${p.id} has a run outside a check date`);
      assert.ok(price > 0 || sale > 0);
      if (sale != null) assert.ok(sale < price);
    }
  }
  assert.equal(Object.keys(hist.products).length, pub.products.length);
  const js = read(path.join(SITE, 'assets/tools.js'));
  const page = read(path.join(SITE, 'deal-checker/index.html'));
  assert.match(js, /Not enough history yet/);
  assert.match(page, /rule-based, not written by AI/);
  assert.match(js, /ai-tag">AI summary/);  // any AI text from the optional live lookup is labelled
  const cfg = JSON.parse(page.match(/window\.DDM_CHECKER=(\{.*?\});/)[1]);
  if (cfg.amazonTag) assert.match(page, /As an Amazon Associate, Discount Deal Me earns from qualifying purchases/);
  if (cfg.api) assert.match(cfg.api, /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/);
});

test('DDM coupons: builder output is reproducible', () => {
  const files = ['coupons/index.html', 'deal-checker/index.html', 'data/coupons.json', 'data/price-check.json', `coupons/${feed.stores[0].slug}/index.html`, 'sitemap-tools.xml'];
  const before = files.map((f) => read(path.join(SITE, f)));
  execFileSync('python3', ['-B', path.join(BUILDER, 'build.py')], { cwd: ROOT, stdio: 'ignore' });
  assert.deepEqual(files.map((f) => read(path.join(SITE, f))), before);
});
