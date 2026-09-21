import test from 'node:test';
import assert from 'node:assert/strict';
import {
  priceCampaign, usd, PRODUCTS, SOFIA_CENTS, MAX_MARKETS, PricingError
} from '../lfma/assets/lfma-pricing.mjs';
import {
  STATES, TRANSITIONS, canTransition, advance, isLaunchAuthorized,
  paymentAuthorizesLaunch, canSubmit, idempotencyKey, createSubmissionGuard,
  toInvoiceDraft, OrderStateError
} from '../lfma/assets/lfma-order-state.mjs';

/* ---------------------------------------------------------------- pricing */

test('tort campaign is $7,500 = $2,500 service + $5,000 media', () => {
  const q = priceCampaign({ product: 'tort' });
  assert.equal(q.feesCents, 250000);
  assert.equal(q.mediaCents, 500000);
  assert.equal(q.totalCents, 750000);
  assert.equal(q.total, '$7,500.00');
});

test('MVA is $10,000 per 30-mile ZIP market = $3,000 service + $7,000 media', () => {
  const q = priceCampaign({ product: 'mva' });
  assert.equal(q.feesCents, 300000);
  assert.equal(q.mediaCents, 700000);
  assert.equal(q.totalCents, 1000000);
});

test('MVA scales linearly across multiple markets', () => {
  for (const n of [1, 2, 3, 7, MAX_MARKETS]) {
    const q = priceCampaign({ product: 'mva', markets: n });
    assert.equal(q.mediaCents, 700000 * n, `media for ${n} markets`);
    assert.equal(q.totalCents, 1000000 * n, `total for ${n} markets`);
  }
});

test('Sofia is free on a first campaign and $2,500 after', () => {
  const first = priceCampaign({ product: 'tort', firstCampaign: true });
  const later = priceCampaign({ product: 'tort', firstCampaign: false });
  assert.equal(later.totalCents - first.totalCents, SOFIA_CENTS);
  const included = first.lines.find(l => l.code === 'SOFIA-DESK');
  assert.equal(included.amountCents, 0);
  assert.equal(included.included, true);
  assert.equal(included.listCents, SOFIA_CENTS);
});

test('Sofia is charged once per campaign, never per market', () => {
  const a = priceCampaign({ product: 'mva', markets: 1, firstCampaign: false });
  const b = priceCampaign({ product: 'mva', markets: 5, firstCampaign: false });
  const sofia = q => q.lines.find(l => l.code === 'SOFIA-DESK').amountCents;
  assert.equal(sofia(a), SOFIA_CENTS);
  assert.equal(sofia(b), SOFIA_CENTS);
  assert.equal(b.totalCents, 1000000 * 5 + SOFIA_CENTS);
});

test('house rule: no discount line is ever emitted', () => {
  for (const firstCampaign of [true, false]) {
    for (const product of Object.keys(PRODUCTS)) {
      const q = priceCampaign({ product, firstCampaign });
      for (const l of q.lines) {
        assert.ok(l.amountCents >= 0, `${product}/${l.code} must not be negative`);
        assert.ok(!/discount/i.test(l.label), `${l.code} must not read as a discount`);
      }
    }
  }
});

test('house rule: media is a separate liability and never merges into fees', () => {
  const q = priceCampaign({ product: 'mva', markets: 2 });
  const media = q.lines.filter(l => l.category === 'media');
  assert.equal(media.length, 1);
  assert.equal(media[0].code, 'MEDIA-FUND');
  assert.equal(media[0].liability, true);
  assert.equal(q.feesCents + q.mediaCents, q.totalCents);
  assert.notEqual(q.feesCents, q.totalCents);
});

test('dropping Sofia does not change fees or media', () => {
  const withSofia = priceCampaign({ product: 'tort', sofia: true, firstCampaign: true });
  const without = priceCampaign({ product: 'tort', sofia: false });
  assert.equal(withSofia.totalCents, without.totalCents);
  assert.equal(without.lines.some(l => l.code === 'SOFIA-DESK'), false);
});

test('pricing rejects bad input rather than guessing', () => {
  const bad = [
    [{ product: 'nope' }, 'UNKNOWN_PRODUCT'],
    [{ product: 'tort', markets: 2 }, 'SINGLE_MARKET_PRODUCT'],
    [{ product: 'mva', markets: 0 }, 'INVALID_MARKETS'],
    [{ product: 'mva', markets: 1.5 }, 'INVALID_MARKETS'],
    [{ product: 'mva', markets: MAX_MARKETS + 1 }, 'TOO_MANY_MARKETS'],
    [{ product: 'mva', sofia: 'yes' }, 'INVALID_INPUT']
  ];
  for (const [input, code] of bad) {
    assert.throws(() => priceCampaign(input), e => e instanceof PricingError && e.code === code,
      `${JSON.stringify(input)} should raise ${code}`);
  }
});

test('usd formats whole cents without float drift', () => {
  assert.equal(usd(0), '$0.00');
  assert.equal(usd(5), '$0.05');
  assert.equal(usd(750000), '$7,500.00');
  assert.equal(usd(3250000), '$32,500.00');
});

/* ------------------------------------------------------------ order state */

test('the happy path walks every commercial state in order', () => {
  const path = ['DRAFT', 'REQUESTED', 'PRICED', 'INVOICE_CREATED', 'PAID',
                'SETUP_REQUIRED', 'QA', 'AUTHORIZED', 'LIVE'];
  let state = path[0];
  for (const next of path.slice(1)) state = advance(state, next);
  assert.equal(state, 'LIVE');
});

test('PAYMENT IS NOT LAUNCH: PAID can never reach LIVE', () => {
  assert.equal(canTransition('PAID', 'LIVE'), false);
  assert.equal(isLaunchAuthorized('PAID'), false);
  assert.equal(paymentAuthorizesLaunch(), false);
  assert.throws(() => advance('PAID', 'LIVE'),
    e => e instanceof OrderStateError && e.code === 'ILLEGAL_TRANSITION');
});

test('LIVE is reachable only from AUTHORIZED', () => {
  const sources = STATES.filter(s => TRANSITIONS[s].includes('LIVE'));
  assert.deepEqual(sources, ['AUTHORIZED']);
});

test('no state may skip QA on the way to authorization', () => {
  const sources = STATES.filter(s => TRANSITIONS[s].includes('AUTHORIZED'));
  assert.deepEqual(sources, ['QA']);
});

test('invoice failure is a real state that can be retried without charging', () => {
  assert.equal(canTransition('PRICED', 'INVOICE_FAILED'), true);
  assert.equal(canTransition('INVOICE_CREATED', 'INVOICE_FAILED'), true);
  assert.equal(canTransition('INVOICE_FAILED', 'INVOICE_CREATED'), true);
  assert.equal(canTransition('INVOICE_FAILED', 'PAID'), false);
});

test('QA can send a build back for more setup', () => {
  assert.equal(canTransition('QA', 'SETUP_REQUIRED'), true);
});

test('every state has a declared transition list and no unknown targets', () => {
  for (const s of STATES) {
    assert.ok(Array.isArray(TRANSITIONS[s]), `${s} needs a transition list`);
    for (const t of TRANSITIONS[s]) assert.ok(STATES.includes(t), `${s} -> ${t} is not a known state`);
  }
});

test('only a draft may be submitted', () => {
  assert.equal(canSubmit('DRAFT'), true);
  for (const s of STATES.filter(x => x !== 'DRAFT')) assert.equal(canSubmit(s), false, `${s} must not resubmit`);
});

/* ------------------------------------------------- duplicate + invoice obj */

test('duplicate submissions are rejected by the guard', () => {
  const parts = { firm: 'Example Law', email: 'a@example.com', product: 'tort', markets: 1, total: 750000 };
  const key = idempotencyKey(parts);
  const guard = createSubmissionGuard();
  assert.equal(guard.claim(key), true);
  assert.equal(guard.claim(key), false);
  assert.equal(guard.claim(idempotencyKey({ ...parts, markets: 2 })), true);
});

test('idempotency key is stable regardless of key order', () => {
  const a = idempotencyKey({ firm: 'X', email: 'e@x.com', total: 1 });
  const b = idempotencyKey({ total: 1, email: 'e@x.com', firm: 'X' });
  assert.equal(a, b);
});

test('invoice draft is deterministic, separates media, and does not authorize launch', () => {
  const quote = priceCampaign({ product: 'mva', markets: 2 });
  const args = {
    quote,
    customer: { firm: 'Example Law', contact: 'Pat Example', email: 'pat@example.com' },
    campaign: { tort: 'MVA', geo: 'Phoenix metro' },
    nowIso: '2026-09-21T18:00:00.000Z'
  };
  const one = toInvoiceDraft(args);
  const two = toInvoiceDraft(args);
  assert.deepEqual(one, two);
  assert.equal(one.state, 'PRICED');
  assert.equal(one.authorizesLaunch, false);
  assert.equal(one.feesCents + one.mediaCents, one.totalCents);
  assert.equal(one.mediaCents, 1400000);
  assert.match(one.memo, /not agency income/i);
  assert.match(one.memo, /does not authorize launch/i);
});

test('invoice draft refuses incomplete customers rather than inventing them', () => {
  const quote = priceCampaign({ product: 'tort' });
  const now = '2026-09-21T18:00:00.000Z';
  for (const customer of [
    { contact: 'A', email: 'a@b.com' },
    { firm: 'F', email: 'a@b.com' },
    { firm: 'F', contact: 'A' },
    { firm: '  ', contact: 'A', email: 'a@b.com' }
  ]) {
    assert.throws(() => toInvoiceDraft({ quote, customer, nowIso: now }),
      e => e instanceof OrderStateError && e.code === 'INVALID_CUSTOMER');
  }
  assert.throws(() => toInvoiceDraft({ quote, customer: { firm: 'F', contact: 'A', email: 'a@b.com' } }),
    e => e.code === 'INVALID_CLOCK');
});

test('invoice draft carries no raw PII in its idempotency key', () => {
  const quote = priceCampaign({ product: 'tort' });
  const draft = toInvoiceDraft({
    quote,
    customer: { firm: 'Example Law', contact: 'Pat Example', email: 'pat@example.com' },
    nowIso: '2026-09-21T18:00:00.000Z'
  });
  assert.doesNotMatch(draft.idempotencyKey, /pat|example|@/i);
  assert.match(draft.idempotencyKey, /^lfma-[0-9a-f]{16}$/);
});

test('idempotencyKey rejects non-objects with a typed error', () => {
  for (const bad of [undefined, null, 'x', 7, ['a']]) {
    assert.throws(() => idempotencyKey(bad),
      e => e instanceof OrderStateError && e.code === 'INVALID_KEY_PARTS',
      `${JSON.stringify(bad)} should raise INVALID_KEY_PARTS`);
  }
  assert.match(idempotencyKey({}), /^lfma-[0-9a-f]{16}$/);
});

test('a rehydrated guard still refuses keys it has already seen', () => {
  const key = idempotencyKey({ firm: 'A', total: 1 });
  const first = createSubmissionGuard();
  assert.equal(first.claim(key), true);
  const persisted = [...first.seen];
  const restored = createSubmissionGuard(new Set(persisted));
  assert.equal(restored.claim(key), false, 'a reload must not reopen a claimed key');
});
