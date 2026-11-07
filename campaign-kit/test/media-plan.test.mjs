import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalize, renderBundle} from '../build.mjs';
import {validateCommercial, renderCommercial, allocateMedia} from '../media-plan.mjs';
const base = JSON.parse(readFileSync(new URL('../campaigns/btl-paraquat.json', import.meta.url)));
const clone = v => JSON.parse(JSON.stringify(v));
function config() {
  const c = clone(base);
  c.budget = {media_total_usd: 7500, days: 14};
  c.channels = {google: {match: 'EXACT'}};
  c.commercial = {currency: 'USD', package_total_usd: 10000, planned_media_usd: 7500};
  return c;
}
test('legacy campaigns keep existing budgets and have no invented paid/order status', () => {
  const c = normalize(clone(base)), b = renderBundle(c);
  assert.equal(c.budget.media_total_usd, base.budget.media_total_usd);
  assert.deepEqual(b['commercial.json'], {schema: 'btl.campaign.media-plan/v1', status: 'NOT_CONFIGURED', execution_enabled: false});
});
test('$10k package, $7.5k media, and $2.5k unitemized balance are separate', () => {
  const x = renderCommercial(normalize(config()));
  assert.equal(x.package_total_usd, 10000);
  assert.equal(x.planned_media_usd, 7500);
  assert.equal(x.non_media_balance_usd, 2500);
  assert.match(x.non_media_note, /not a profit estimate/);
  assert.equal(x.status, 'UNAPPROVED_PLAN');
  assert.equal(x.invoice_paid, 'UNKNOWN');
  assert.equal(x.queue_state, 'NOT_QUERIED');
  assert.match(x.order_workflow.reuse, /order-contract.mjs/);
});
test('rejects package/media confusion, invalid amounts, allocation and duration', () => {
  const mutate = [
    c => c.budget.media_total_usd = 10000,
    c => c.commercial.package_total_usd = 7000,
    c => c.commercial.currency = 'EUR',
    c => c.commercial.package_total_usd = '10000',
    c => c.commercial.package_total_usd = 10000.001,
    c => c.commercial.package_total_usd = Infinity,
    c => c.commercial.package_total_usd = Number.MAX_SAFE_INTEGER,
    c => c.commercial.planned_media_usd = -1,
    c => c.budget.days = 0,
    c => c.budget.days = 1.5,
    c => c.budget.days = 366,
    c => c.split = {meta: .6, google: .25, tiktok: .1, openai: .1},
    c => c.split = {meta: -.1, google: .9, tiktok: .1, openai: .1},
    c => c.split = {pmax: .1},
  ];
  for (const change of mutate) { const c = config(); change(c); assert.throws(() => normalize(c), /commercial\./); }
});
test('cent allocation reconciles exactly and keeps zero-share channels at zero', () => {
  for (const total of [0, .01, 1, 100.01, 7500, 7500.99]) {
    const plan = allocateMedia(total, {meta: .55, google: .25, tiktok: .1, openai: .1}, 14);
    assert.equal(Object.values(plan).reduce((n, x) => n + Math.round(x.lifetime_plan_usd * 100), 0), Math.round(total * 100));
    for (const x of Object.values(plan)) {
      assert.equal(Math.round(x.daily_reference_usd * 100) * 14 + Math.round(x.remainder_to_allocate_usd * 100), Math.round(x.lifetime_plan_usd * 100));
      assert.equal(x.enabled_for_spend, false);
    }
  }
  const c = config(); c.split = {meta: 1, google: 0, tiktok: 0, openai: 0};
  const b = renderBundle(normalize(c));
  for (const k of ['google-search.json', 'tiktok.json', 'openai-ads.json']) assert.equal(b[k].campaign.daily_budget_usd, 0);
  assert.throws(() => allocateMedia(100, {meta: 2, google: 0, tiktok: 0, openai: 0}, 14));
});
test('private reporting manifests disable self registration and open demo without claiming applied access controls', () => {
  for (const raw of [config(), clone(base)]) {
    const c = normalize(raw), p = renderBundle(c)['perspective.json'];
    const entry = p['evolutionengine/affiliate-hub/portal.py BASIC_PORTALS'][c.slug];
    assert.equal(entry.self_register, false); assert.equal(entry.open_demo, false);
    assert.equal(p.privacy.applied, false);
    assert.match(p.privacy.requires, /authorization/);
  }
});
test('near-one fractions never inflate total or fund zero-share channels', () => {
  for (const meta of [.5000000004, .4999999996]) {
    for (const total of [7500, 100000000, 123456789.12]) {
      const p = allocateMedia(total, {meta, google:.5, tiktok:0, openai:0}, 14);
      assert.equal(Object.values(p).reduce((n, x) => n + x.lifetime_plan_cents, 0), Math.round(total * 100));
      assert.equal(p.tiktok.lifetime_plan_cents, 0); assert.equal(p.openai.lifetime_plan_cents, 0);
    }
  }
  const tiny = allocateMedia(.01, {meta:1,google:1e-20,tiktok:0,openai:0}, 1);
  assert.equal(tiny.meta.lifetime_plan_cents, 1); assert.equal(tiny.google.lifetime_plan_cents, 0);
});
test('exact-only Search is honored; legacy match setting and paused draft boundaries remain', () => {
  const b = renderBundle(normalize(config()));
  assert.ok(b['google-search.json'].ad_group.keywords.every(x => x.match === 'EXACT'));
  assert.ok(renderBundle(normalize(clone(base)))['google-search.json'].ad_group.keywords.some(x => x.match === 'PHRASE'));
  for (const file of ['meta.json', 'google-search.json', 'tiktok.json', 'openai-ads.json']) assert.equal(b[file].status, 'PAUSED_DRAFT');
});
test('input fields cannot change plan status or masquerade as payment/queue verification', () => {
  const c = config(); Object.assign(c.commercial, {status: 'APPROVED', execution_enabled: true, invoice_paid: true, queue_state: 'ACTIVE'});
  const x = renderCommercial(normalize(c));
  assert.equal(x.status, 'UNAPPROVED_PLAN'); assert.equal(x.execution_enabled, false);
  assert.equal(x.invoice_paid, 'UNKNOWN'); assert.equal(x.queue_state, 'NOT_QUERIED');
});
test('invalid Search match settings fail closed instead of broadening targeting', () => {
  for (const match of ['EXACT_ONLY', 'exact', 'BROAD', '', null, 1, true]) {
    const c = config(); c.channels.google.match = match;
    assert.throws(() => normalize(c), /channels.google.match/);
  }
});
test('malformed commercial profile is rejected without changing legacy configurations', () => {
  for (const value of [[], 'invalid', 4, {}]) {
    const c = config(); c.commercial = value;
    assert.ok(validateCommercial(c).length); assert.throws(() => normalize(c), /commercial\./);
  }
});
