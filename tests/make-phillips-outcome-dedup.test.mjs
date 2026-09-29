// Phillips transfer-confirmation reliability — Make scenario 6324097, route A.
//
// Every test runs the SAME assertion against the current flow and the patched
// flow. The current-flow cases are not decoration: they are what makes the
// patched-flow cases meaningful. If someone reverts the ordering, the
// "current" expectations start passing on the patched model and the paired
// patched case fails.
//
// Nothing here touches Make, Vapi, Gmail, BigQuery or a real mailbox.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runFlow, OUTCOME } from '../ops/make/lib/flow-sim.mjs';

const load = (f) => JSON.parse(readFileSync(new URL(`../ops/make/6324097-sofia-call-outcomes/${f}`, import.meta.url)));
const CURRENT = load('current.flow.json');
const PATCHED = load('patched.flow.json');

const CALL = { call_id: 'call-abc123' };
const T0 = '2026-09-20T12:00:00Z';
const T_PLUS_15M = '2026-09-20T12:15:00Z';
const T_PLUS_11M = '2026-09-20T12:11:00Z';
const T_PLUS_2M = '2026-09-20T12:02:00Z';

const delivered = (store) => Boolean(store[`xfer:${CALL.call_id}`]);
const emailsSent = (r) => r.effects.filter((e) => e.type === 'send.ok').length;

// A 15-minute cycle: the Vapi window is 25 minutes, so the same call is
// offered to the flow again on the next run.
function cycle(model, { store, fail = new Set(), now }) {
  return runFlow(model, { store, fail, input: CALL, now });
}

test('happy path: one email, one delivered marker, both models', () => {
  for (const [name, model] of [['current', CURRENT], ['patched', PATCHED]]) {
    const store = {};
    const run = cycle(model, { store, now: T0 });
    assert.equal(run.outcome, OUTCOME.COMPLETED, name);
    assert.equal(emailsSent(run), 1, `${name}: exactly one email`);
    assert.ok(delivered(store), `${name}: marker present`);
  }
});

test('happy path does not re-send on the next cycle (no duplicate to the firm)', () => {
  for (const [name, model] of [['current', CURRENT], ['patched', PATCHED]]) {
    const store = {};
    cycle(model, { store, now: T0 });
    const second = cycle(model, { store, now: T_PLUS_15M });
    assert.equal(second.outcome, OUTCOME.FILTERED, `${name}: second cycle filtered`);
    assert.equal(emailsSent(second), 0, `${name}: no duplicate email`);
  }
});

// ---------------------------------------------------------------------------
// The defect
// ---------------------------------------------------------------------------

test('CURRENT: an email failure permanently suppresses the confirmation', () => {
  const store = {};

  // Cycle 1 — Gmail is down.
  const first = cycle(CURRENT, { store, fail: new Set(['11']), now: T0 });
  assert.equal(first.outcome, OUTCOME.ERRORED, 'no handler on the email module');
  assert.equal(emailsSent(first), 0, 'nothing reached the firm');

  // ...but the marker was already written, before the send was attempted.
  assert.ok(delivered(store), 'marker was written ahead of the send');
  assert.equal(store[`xfer:${CALL.call_id}`].marker, 'claimed-before-send');

  // Cycle 2 — Gmail is healthy again. The call is still inside the window.
  const second = cycle(CURRENT, { store, now: T_PLUS_15M });
  assert.equal(second.outcome, OUTCOME.FILTERED, 'suppressed by its own marker');
  assert.equal(emailsSent(second), 0, 'the confirmation is lost for good');

  // And the record asserts a send that never happened.
  assert.equal(store[`xfer:${CALL.call_id}`].outcome, 'transfer_confirmation_sent');
});

test('PATCHED: an email failure is retried on the next cycle and then delivered', () => {
  const store = {};

  const first = cycle(PATCHED, { store, fail: new Set(['11']), now: T0 });
  assert.equal(emailsSent(first), 0, 'cycle 1 sent nothing');
  assert.equal(delivered(store), false, 'no delivered marker on failure');
  assert.ok(store[`xferfail:${CALL.call_id}`], 'failure is recorded');
  assert.ok(store[`xferlock:${CALL.call_id}`], 'claim was taken');

  // 15 minutes later the claim is stale (TTL 10m) and the call is still in the
  // 25-minute Vapi window.
  const second = cycle(PATCHED, { store, now: T_PLUS_15M });
  assert.equal(second.outcome, OUTCOME.COMPLETED);
  assert.equal(emailsSent(second), 1, 'retried and delivered');
  assert.ok(delivered(store), 'delivered marker now written');
  assert.equal(store[`xfer:${CALL.call_id}`].marker, 'delivered');
});

test('PATCHED: a delivered marker is only ever written after a real send', () => {
  const store = {};
  const run = cycle(PATCHED, { store, fail: new Set(['11']), now: T0 });
  const markerWrites = run.effects.filter((e) => e.type === 'store.put' && e.key.startsWith('xfer:'));
  assert.equal(markerWrites.length, 0, 'no delivered marker on a failed send');
});

// ---------------------------------------------------------------------------
// Concurrency: the scenario is sequential:false and the window overlaps two runs
// ---------------------------------------------------------------------------

test('PATCHED: an overlapping run inside the lock TTL does not double-send', () => {
  const store = {};

  // Run A takes the claim and stalls before the send (BigQuery slow, say).
  runFlow(PATCHED, {
    store,
    fail: new Set(['11']),
    input: CALL,
    now: T0,
  });
  delete store[`xferfail:${CALL.call_id}`]; // pretend A is still in flight

  // Run B starts 2 minutes later, well inside the 10-minute TTL.
  const runB = cycle(PATCHED, { store, now: T_PLUS_2M });
  assert.equal(runB.outcome, OUTCOME.FILTERED, 'blocked by the live claim');
  assert.equal(emailsSent(runB), 0, 'the firm is not emailed twice');
});

test('PATCHED: a claim older than the TTL is reclaimed, so a crashed run recovers', () => {
  const store = {
    [`xferlock:${CALL.call_id}`]: { state: 'pending', claimed_at: T0 },
  };
  const run = cycle(PATCHED, { store, now: T_PLUS_11M });
  assert.equal(run.outcome, OUTCOME.COMPLETED, '11m > 10m TTL, safe to reclaim');
  assert.equal(emailsSent(run), 1);
});

test('CURRENT has no claim concept at all — overlapping runs both send', () => {
  // Two runs that interleave before either writes its marker. Modelled as two
  // runs against the pre-write store.
  const storeA = {};
  const storeB = {};
  assert.equal(emailsSent(cycle(CURRENT, { store: storeA, now: T0 })), 1);
  assert.equal(emailsSent(cycle(CURRENT, { store: storeB, now: T0 })), 1);
  // Both sent. The current design's only guard is the marker, and the marker
  // is not read again between the two reads.
});

// ---------------------------------------------------------------------------
// Migration: deploying the patch must not replay anything already handled
// ---------------------------------------------------------------------------

test('PATCHED: a legacy marker written by the current design is never replayed', () => {
  // Exactly what the live datastore holds today for every handled call.
  const store = {
    [`xfer:${CALL.call_id}`]: {
      call_id: CALL.call_id,
      outcome: 'transfer_confirmation_sent:pi_mva:+16022003976',
      alerted_at: '2026-09-19 18:04:11',
    },
  };

  const run = cycle(PATCHED, { store, now: T0 });
  assert.equal(run.outcome, OUTCOME.FILTERED, 'legacy record still suppresses');
  assert.equal(emailsSent(run), 0, 'no historical call is re-emailed on deploy');
});

test('PATCHED: legacy records are left untouched — no backfill, no rewrite', () => {
  const legacy = {
    call_id: CALL.call_id,
    outcome: 'transfer_confirmation_sent:pi_mva:+16022003976',
    alerted_at: '2026-09-19 18:04:11',
  };
  const store = { [`xfer:${CALL.call_id}`]: legacy };
  const before = JSON.stringify(legacy);
  cycle(PATCHED, { store, now: T0 });
  assert.equal(JSON.stringify(store[`xfer:${CALL.call_id}`]), before);
});

// ---------------------------------------------------------------------------
// The one thing the patch does NOT fix, pinned so it cannot be forgotten
// ---------------------------------------------------------------------------

test('KNOWN GAP: a failure outlasting the 25-minute Vapi window is still lost', () => {
  const store = {};
  const T_PLUS_30M = '2026-09-20T12:30:00Z';

  cycle(PATCHED, { store, fail: new Set(['11']), now: T0 });
  assert.equal(delivered(store), false);

  // After 25 minutes the trigger no longer returns this call at all, so the
  // flow is never offered the chance to retry. Modelled as "no further runs".
  const windowClosed = Date.parse(T_PLUS_30M) - Date.parse(T0) > PATCHED.trigger.windowMinutes * 60_000;
  assert.ok(windowClosed, 'the call has aged out of the trigger window');
  assert.equal(delivered(store), false, 'still undelivered — needs the P2 sweeper');
});
