// Shared social publisher — Make scenario 6145431.
//
// The question under test is the one SOCIAL-PUBLISHER-READINESS.md raises:
// can a 200 with ok:true be treated as proof that every requested channel
// actually published? Today it cannot. These tests pin why, and pin the
// patched behaviour that makes the response a receipt.
//
// No network, no Meta, no Sheets.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runFlow, OUTCOME } from '../ops/make/lib/flow-sim.mjs';

const load = (f) => JSON.parse(readFileSync(new URL(`../ops/make/6145431-all-domains-social-post/${f}`, import.meta.url)));
const CURRENT = load('current.flow.json');
const PATCHED = load('patched.flow.json');

const post = (model, input, fail = new Set()) => runFlow(model, { input, fail });

// Modules live inside router routes in the patched model, so look through both.
function findStep(model, id) {
  const walk = (steps) => {
    for (const s of steps) {
      if (s.id === id) return s;
      if (s.routes) for (const r of s.routes) {
        const hit = walk(r);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(model.steps);
}

const responseOf = (r) => r.effects.find((e) => e.type === 'respond') ?? null;
const ledgerFor = (r, channel) => r.effects.filter((e) => e.type === 'ledger' && e.channel === channel);
const postedTo = (r, channel) => r.effects.some((e) => e.type === 'send.ok' && e.channel === channel);

// A tenant mapped on both Facebook and Instagram, asking for both.
const BOTH = { tenant_id: 'NIL', message: 'hello', image_url: 'https://x/i.png', post_ig: 'yes' };
// A tenant mapped on Facebook only, asking for Instagram anyway.
const FB_ONLY = { tenant_id: 'TOSS', message: 'hello', image_url: 'https://x/i.png', post_ig: 'yes' };

test('happy path: both channels publish, both models', () => {
  for (const [name, model] of [['current', CURRENT], ['patched', PATCHED]]) {
    const r = post(model, BOTH);
    assert.ok(postedTo(r, 'facebook'), `${name}: fb`);
    assert.ok(postedTo(r, 'instagram'), `${name}: ig`);
    assert.equal(responseOf(r).body.ok, 'true', `${name}: ok`);
  }
});

// ---------------------------------------------------------------------------
// Defect 1 — the response precedes Instagram
// ---------------------------------------------------------------------------

test('CURRENT: the caller is told ok:true before Instagram is even attempted', () => {
  const r = post(CURRENT, BOTH);
  const order = r.effects.map((e) => (e.type === 'send.ok' ? `send:${e.channel}` : e.type));
  const respondAt = order.indexOf('respond');
  const igAt = order.indexOf('send:instagram');
  assert.ok(respondAt !== -1 && igAt !== -1);
  assert.ok(respondAt < igAt, 'response is emitted before the Instagram post');
});

test('PATCHED: the response is the last thing that happens', () => {
  const r = post(PATCHED, BOTH);
  const order = r.effects.map((e) => e.type);
  assert.equal(order[order.length - 1], 'respond', 'response comes last');
});

test('CURRENT: Instagram fails, caller still received ok:true and a 200', () => {
  const r = post(CURRENT, BOTH, new Set(['3']));
  assert.equal(r.outcome, OUTCOME.ERRORED, 'the execution errors on the IG module');
  assert.equal(postedTo(r, 'instagram'), false, 'nothing published to Instagram');

  const res = responseOf(r);
  assert.ok(res, 'a response was already sent');
  assert.equal(res.body.ok, 'true', 'and it claims success');
  assert.equal(res.status, '200');
  assert.equal(res.body.ig_status, undefined, 'the body says nothing about Instagram at all');
});

test('PATCHED: Instagram fails, the response says so', () => {
  const r = post(PATCHED, BOTH, new Set(['3']));
  const res = responseOf(r);
  assert.ok(res, 'the caller still gets a reply');
  assert.equal(res.body.fb_status, 'posted');
  assert.equal(res.body.ig_status, 'not_posted', 'the failing channel is named');
});

test('PATCHED: a Facebook failure does not abort before the reply', () => {
  const r = post(PATCHED, BOTH, new Set(['2']));
  const res = responseOf(r);
  assert.ok(res, 'reply still emitted');
  assert.equal(res.body.ok, 'false');
  assert.equal(res.status, '502');
});

// ---------------------------------------------------------------------------
// Defect 2 — the ledger cannot prove which account received the post
// ---------------------------------------------------------------------------

test('CURRENT: the ledger records the caller-supplied destination, which is usually empty', () => {
  // The publisher derives the Page from tenant_id; callers do not send page_id.
  const r = post(CURRENT, BOTH);
  const [fbRow] = ledgerFor(r, 'facebook');
  assert.equal(fbRow.destination, '', 'no Page id recorded — the row cannot prove where it went');

  const [igRow] = ledgerFor(r, 'instagram');
  assert.equal(igRow.destination, '', 'same for Instagram');
});

test('PATCHED: the ledger reads its destination from the resolver, not from caller input', () => {
  // The simulator has no switch() table, so this asserts the wiring rather
  // than a literal id: the row must source from module 7 (which resolves
  // tenant_id → Page / IG account) instead of from the webhook payload.
  assert.equal(findStep(PATCHED, '4').destination, '@7.page_id', 'FB row reads the resolved Page id');
  assert.equal(findStep(PATCHED, '6').destination, '@7.ig_account_id', 'IG row reads the resolved IG account id');

  assert.equal(findStep(CURRENT, '4').destination, '$page_id', 'current reads caller input — the bug being fixed');
  assert.equal(findStep(CURRENT, '6').destination, '$ig_id', 'same on the IG row');
});

test('CURRENT: the ledger status is a literal, so a failure can never be recorded', () => {
  for (const step of CURRENT.steps.filter((s) => s.kind === 'ledger')) {
    assert.equal(step.status, 'posted', 'hardcoded');
  }
  const r = post(CURRENT, BOTH, new Set(['3']));
  assert.equal(ledgerFor(r, 'instagram').length, 0, 'a failed channel writes no row at all');
});

test('PATCHED: the ledger status reflects what actually happened', () => {
  const r = post(PATCHED, BOTH, new Set(['3']));
  const [igRow] = ledgerFor(r, 'instagram');
  assert.ok(igRow, 'a row is still written for the attempted channel');
  assert.equal(igRow.status, 'failed');
});

// ---------------------------------------------------------------------------
// Defect 3 — an unmapped Instagram tenant is silently ignored
// ---------------------------------------------------------------------------

test('CURRENT: an IG-unmapped tenant asks for Instagram and is told ok:true anyway', () => {
  const r = post(CURRENT, FB_ONLY);
  assert.equal(r.outcome, OUTCOME.FILTERED, 'IG branch filtered out — fails closed, correctly');
  assert.equal(postedTo(r, 'instagram'), false);
  assert.equal(responseOf(r).body.ok, 'true', 'but the caller was told it succeeded');
});

test('PATCHED: an IG-unmapped tenant gets a reply that names the skip', () => {
  const r = post(PATCHED, FB_ONLY);
  const res = responseOf(r);
  assert.ok(res, 'route C is unfiltered, so the reply still happens');
  assert.equal(res.body.fb_status, 'posted');
  assert.equal(res.body.ig_status, 'not_posted', 'not silently swallowed');
});

test('both models still fail closed: an unknown tenant publishes nothing', () => {
  for (const [name, model] of [['current', CURRENT], ['patched', PATCHED]]) {
    const r = post(model, { tenant_id: 'NOPE', message: 'hi', post_ig: 'yes', image_url: 'https://x/i.png' });
    assert.equal(postedTo(r, 'facebook'), false, `${name}: no FB post`);
    assert.equal(postedTo(r, 'instagram'), false, `${name}: no IG post`);
  }
});
