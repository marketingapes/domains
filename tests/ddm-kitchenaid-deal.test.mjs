import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGE = path.join(ROOT, 'ddm/deals/kitchenaid-harvest-event/index.html');

test('DDM KitchenAid deal page: CJ links from DDM property 101511733 with site SID', () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  const cj = [...html.matchAll(/href="(https:\/\/www\.(?:dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-[^"]+)"/g)].map((m) => m[1]);
  assert.ok(cj.length >= 3);
  for (const href of cj) {
    assert.match(href, /\/click-101511733-/);
    assert.match(href, /\?sid=ddm-site-20261010$/);
  }
  assert.match(html, /click-101511733-17342552-/); // up to 25% off select countertop appliances
  assert.match(html, /click-101511733-17342535-/); // up to $120 off select stand mixers
  for (const m of html.matchAll(/<a [^>]*href="https:\/\/www\.(?:dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)[^>]*>/g)) {
    assert.match(m[0], /rel="sponsored nofollow noopener"/);
  }
});

test('DDM KitchenAid deal page: disclosure, end time, select-models warning, no codes', () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  assert.match(html, /#ad/);
  assert.match(html, /may earn a commission/);
  assert.match(html, /11:59 PM ET \(8:59 PM PT\)/);
  assert.match(html, /check the price in your cart/i);
  assert.match(html, /data-deal-end="2026-10-11T03:59:00Z"/); // Oct 10 11:59 PM EDT
  assert.match(html, /This sale has ended/);
  assert.match(html, /is-ended/);
  assert.doesNotMatch(html, /coupon code:|promo code:|use code/i);
  assert.match(html, /rel="canonical" href="https:\/\/discountdealme\.com\/deals\/kitchenaid-harvest-event\/"/);
  assert.match(html, /GTM-W3D26R29/);
});

test('DDM KitchenAid deal page carries the consented sign-up and is linked from offers and sitemap', () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  assert.equal((html.match(/data-signup="/g) || []).length, 1);
  assert.match(html, /name="consent" value="yes" required/);
  assert.match(html, /\/assets\/signup\.js/);
  const offers = fs.readFileSync(path.join(ROOT, 'ddm/offers/index.html'), 'utf8');
  assert.match(offers, /href="\/deals\/kitchenaid-harvest-event\/"/);
  const sitemap = fs.readFileSync(path.join(ROOT, 'ddm/sitemap.xml'), 'utf8');
  assert.match(sitemap, /discountdealme\.com\/deals\/kitchenaid-harvest-event\//);
});

test('DDM offers card for the KitchenAid deal hides itself after the sale ends', () => {
  const offers = fs.readFileSync(path.join(ROOT, 'ddm/offers/index.html'), 'utf8');
  assert.match(offers, /data-expires="2026-10-11T03:59:00Z"/);
  assert.match(offers, /\[data-expires\]/);
});
