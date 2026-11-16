import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = path.join(ROOT, 'ddm');
const read = (p) => fs.readFileSync(path.join(SITE, p), 'utf8');
const require = createRequire(import.meta.url);
const P = require(path.join(SITE, 'assets/gift-planner.js'));
const feed = JSON.parse(read('data/deals.json'));
const NOW = Date.parse(feed.checked_at);

test('DDM gift planner: page exists, is linked, disclosed and has no AI label or em dash', () => {
  const html = read('gift-planner/index.html');
  assert.match(html, /<h1>Holiday gift budget planner<\/h1>/);
  assert.match(html, /#ad/);
  assert.match(html, /may earn a commission/);
  assert.match(html, /\/assets\/gift-planner\.js/);
  assert.match(html, /rel="canonical" href="https:\/\/discountdealme\.com\/gift-planner\/"/);
  assert.doesNotMatch(html + read('assets/gift-planner.js'), /AI[- ]generated|AI summary|\u2014/);
  assert.match(read('index.html'), /href="\/gift-planner\/"/);
  assert.ok(read('sitemap.xml').includes('https://discountdealme.com/gift-planner/'));
});

test('DDM gift planner: browser code only reads this site\'s deal feed', () => {
  const js = read('assets/gift-planner.js');
  assert.doesNotMatch(js, /https?:\/\//, 'no third-party calls');
  assert.match(js, /fetch\('\/data\/deals\.json'/);
  assert.doesNotMatch(js, /XMLHttpRequest|sendBeacon|openai|api\./i);
});

test('DDM gift planner: every giftable deal carries known interests', () => {
  const known = new Set(Object.keys(P.INTERESTS));
  const giftable = feed.deals.filter((d) => d.gift_for.length);
  assert.ok(giftable.length >= 15, `only ${giftable.length} giftable deals`);
  for (const d of giftable) for (const g of d.gift_for) assert.ok(known.has(g), `${d.id}: unknown interest ${g}`);
});

test('DDM gift planner: plans use only live feed deals, tracked with the planner SID', () => {
  const plan = P.plan(feed, { budget: 400, people: [
    { label: 'Mom', interests: ['cooking'] }, { label: 'Dad', interests: ['coffee'] },
    { label: 'Kid', interests: ['sweets', 'kids'] }, { label: 'Dog', interests: ['pets'] }] }, NOW);
  const ids = new Map(feed.deals.map((d) => [d.id, d]));
  assert.equal(plan.people.length, 4);
  assert.equal(plan.allocated, 400);
  for (const r of plan.people) {
    assert.equal(r.budget, 100);
    assert.ok(r.picks.length >= 1 && r.picks.length <= 3, `${r.label} has ${r.picks.length} picks`);
    for (const k of r.picks) {
      const d = ids.get(k.id);
      assert.ok(d, `${k.id} not in feed`);
      assert.ok(!d.ends || Date.parse(d.ends) > NOW, `${k.id} expired`);
      assert.ok(r.interests.some((i) => d.gift_for.includes(i)), `${k.id} does not match ${r.label}`);
      assert.match(k.url, /^https:\/\/www\.(dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|anrdoezrs\.net|kqzyfj\.com)\/click-101511733-\d+-\d+\?sid=ddm-planner$/);
      assert.equal(k.code, d.code);
    }
  }
});

test('DDM gift planner: minimum-spend deals only show when the budget covers them, expired deals never show', () => {
  const ms = feed.deals.find((d) => P.minSpend(d) > 0 && d.gift_for.length);
  assert.ok(ms, 'feed has a min-spend gift deal');
  const low = P.plan(feed, { budget: P.minSpend(ms) - 1, people: [{ interests: ms.gift_for }] }, NOW);
  assert.ok(!low.people[0].picks.some((k) => k.id === ms.id));
  const later = Date.parse('2031-01-01T00:00:00Z');
  const p = P.plan(feed, { budget: 500, people: [{ interests: ['cooking'] }] }, later);
  for (const k of p.people[0].picks) assert.ok(!k.ends || Date.parse(k.ends) > later);
});

test('DDM gift planner: fixed amounts, budget split, over-budget flag and estimate math', () => {
  const p = P.plan(feed, { budget: 300, people: [{ amount: 200, interests: ['pets'] }, { interests: ['coffee'] }, { interests: ['coffee'] }] }, NOW);
  assert.deepEqual(p.people.map((r) => r.budget), [200, 50, 50]);
  assert.equal(p.over_budget, false);
  assert.equal(P.plan(feed, { budget: 100, people: [{ amount: 150, interests: ['pets'] }] }, NOW).over_budget, true);
  for (const r of p.people) {
    const top = r.picks[0]; const d = feed.deals.find((x) => x.id === top.id);
    if (d.kind === 'pct') assert.equal(top.est_saving, Math.round(r.budget * d.pct) / 100);
    else assert.equal(top.est_saving, 0);
  }
  assert.equal(P.plan(feed, { budget: 100, people: [] }, NOW).people.length, 0);
});
