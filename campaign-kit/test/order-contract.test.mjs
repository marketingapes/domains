import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {ORDER_SCHEMA, COMMERCIAL_MODELS, LAUNCH_GATES, parseUsdCents, normalizeOrderRequest, validateOrderRequest, createOrderState, transitionTrustedOrder, evaluateTrustedPayment, browserOrderContractSource, orderContentHash} from '../order-contract.mjs';

const copy = v => JSON.parse(JSON.stringify(v));
const at = second => `2026-10-27T16:00:${String(second).padStart(2, '0')}Z`;
const base = () => ({
  schema: ORDER_SCHEMA, commercial_model: 'managed_campaign', template_id: 'btl-paraquat', topic: 'Paraquat',
  geo: {states: ['CA'], excluded_states: []}, channels: ['meta', 'google'],
  firm: {name: 'Synthetic Test Firm', contact_name: 'Test Operator', email: 'operator@example.test', phone: '+15555550101', website: 'https://example.test'},
  billing: {name: 'Synthetic Test Firm', email: 'billing@example.test'},
  criteria: {version: 'criteria-v1', source: 'test-fixture:written-criteria', qualifiers: [{key: 'exposure', label: 'Exposure', rule: 'Ask about exposure; unknown goes to review.', verification_method: 'ask_or_verify_existing', required: true, evidence_source: 'test-fixture:written-criteria'}], exclusions: ['Already represented: manual review.']},
  intake: {mode: 'secure_delivery', endpoint: 'test-fixture:intake-destination', hours: 'Mon–Fri 9–5', timezone: 'America/Los_Angeles', languages: ['English'], capacity_per_day: 10},
  budget: {media_usd: '5,000.00', duration_days: 14}, network: {alternate_routing: false, distribution: 'exclusive'},
  terms: {version: 'terms-v1', source: 'test-fixture:commercial-terms', scope_acknowledged: true},
});
const start = raw => createOrderState(raw || base(), {order_id: 'ORDER-TEST-001', received_at: at(0)});
const boundEvidence = state => ({by: 'authenticated-test-operator', at: at(1), evidence_ref: 'test-fixture:approval', order_version: state.order_version, request_hash: state.request_hash});
const approvedQuote = state => ({...boundEvidence(state), total_cents: 750000, currency: 'USD', template_id: state.request.template_id, commercial_model: state.request.commercial_model, template_version: '2026-10-26.2', criteria_version: 'criteria-v1', terms_version: 'terms-v1', checks: Object.fromEntries(['template', 'criteria', 'terms', 'intake', 'distribution'].map(key => [key, boundEvidence(state)]))});
const event = (type, number, data = {}) => ({type, id: `EVENT-${number}-${type}`, at: at(number), ...data});
function awaiting() {
  let state = start();
  state = transitionTrustedOrder(state, event('quote_approved', 1, {approval: approvedQuote(state)}));
  state = transitionTrustedOrder(state, event('invoice_issued', 2, {invoice: {provider: 'quickbooks', realm_id: 'TEST-REALM', invoice_id: 'TEST-INVOICE', customer_id: 'TEST-CUSTOMER', order_id: state.order_id, order_version: state.order_version, request_hash: state.request_hash, currency: 'USD', total_cents: 750000, evidence_ref: 'test-fixture:issued-invoice'}}));
  return state;
}
const snapshot = (state, second = 3) => ({provider: 'quickbooks', order_id: state.order_id, order_version: state.order_version, request_hash: state.request_hash, realm_id: state.invoice.realm_id, invoice_id: state.invoice.invoice_id, customer_id: state.invoice.customer_id, currency: 'USD', invoice_total_cents: 750000, invoice_balance_cents: 0, invoice_status: 'paid', funds_status: 'settled', provider_updated_at: at(second), evidence_ref: 'test-fixture:payment-readback', payments: [{provider_payment_id: 'TEST-PAYMENT', invoice_id: state.invoice.invoice_id, applied_cents: 750000, status: 'settled', reversed: false, refunded_cents: 0}]});
function paid() {
  const state = awaiting();
  return transitionTrustedOrder(state, event('payment_reconciled', 3, {provider_snapshot: snapshot(state)}));
}
function clientReview() {
  let state = paid();
  state = transitionTrustedOrder(state, event('build_started', 4, {build_key: state.build_key}));
  return transitionTrustedOrder(state, event('build_completed', 5, {build_key: state.build_key, artifact: {hash: 'a'.repeat(64), version: 'artifact-v1', request_hash: state.request_hash, order_version: state.order_version, evidence_ref: 'test-fixture:build-receipt'}}));
}
function launchQueue() {
  const state = clientReview();
  return transitionTrustedOrder(state, event('client_accepted', 6, {approval: {...boundEvidence(state), artifact_hash: state.artifact.hash, artifact_version: state.artifact.version}}));
}
const ownerApproval = state => ({...boundEvidence(state), actor_role: 'owner', artifact_hash: state.artifact.hash, artifact_version: state.artifact.version, media_budget_cents: state.quote.media_budget_cents, duration_days: 14, campaign_id: 'TEST-CAMPAIGN', gates: Object.fromEntries(LAUNCH_GATES.map(key => [key, {...boundEvidence(state), artifact_hash: state.artifact.hash}]))});

test('dollar parsing is exact, bounded and rejects rounding, negatives and exponent strings', () => {
  for (const [value, cents] of [['0', 0], ['0.01', 1], ['0.10', 10], ['2500', 250000], ['$5,000.25', 500025], [12.34, 1234]]) assert.equal(parseUsdCents(value), cents);
  for (const value of ['', '-1', '1e3', '1.001', '1,00', '1,000,00', 'Infinity', NaN, Infinity, null, {}, '90071992547410']) assert.throws(() => parseUsdCents(value), undefined, String(value));
});

test('managed invoice draft uses exactly existing fee and explicit media products', () => {
  const result = validateOrderRequest(base());
  assert.equal(result.valid, true);
  assert.deepEqual(result.review_reasons, []);
  assert.equal(result.quote.total_cents, 750000);
  assert.equal(result.quote.requires_review, true);
  assert.deepEqual(result.quote.line_items.map(line => [line.product_id, line.quantity, line.unit_amount_cents]), [['53', 1, 250000], ['1010000001', 1, 500000]]);
  const missing = base(); missing.budget.media_usd = '';
  assert.equal(validateOrderRequest(missing).quote.total_cents, null);
  assert.deepEqual(validateOrderRequest(missing).quote.line_items, []);
  assert.match(validateOrderRequest(missing).review_reasons.join(' '), /explicit media budget/);
  const bad = base(); bad.budget.media_usd = '3.005';
  assert.equal(validateOrderRequest(bad).valid, false);
});

test('lead, membership and founding partner requests never inherit managed charges', () => {
  assert.deepEqual([...COMMERCIAL_MODELS], ['managed_campaign', 'qualified_lead_program', 'network_membership', 'founding_partner']);
  for (const model of COMMERCIAL_MODELS.filter(v => v !== 'managed_campaign')) {
    const raw = {...base(), commercial_model: model};
    const result = validateOrderRequest(raw);
    assert.equal(result.valid, true);
    assert.deepEqual([result.quote.service_fee_cents, result.quote.media_budget_cents, result.quote.total_cents], [null, null, null]);
    assert.deepEqual(result.quote.line_items, []);
    const state = start(raw);
    assert.equal(state.status, 'review_needed');
    assert.throws(() => transitionTrustedOrder(state, event('quote_approved', 1, {approval: approvedQuote(state)})), /separately approved quote/);
  }
});

test('missing criteria/terms and alternate network request produce review without inventing approval', () => {
  const raw = base(); raw.criteria = {}; raw.terms.version = ''; raw.terms.source = ''; raw.template_id = 'custom'; raw.network.alternate_routing = true;
  const result = validateOrderRequest(raw);
  assert.equal(result.valid, true);
  assert.match(result.review_reasons.join(' '), /Written firm criteria/);
  assert.match(result.review_reasons.join(' '), /claimant permission/);
  assert.equal(start(raw).status, 'review_needed');
  const state = start(raw);
  assert.throws(() => transitionTrustedOrder(state, event('quote_approved', 1, {approval: approvedQuote(state)})), /versions do not match|missing criteria/);
});

test('normalization retains meaningful zero values, rejects invalid selections, and never mutates input', () => {
  const raw = base(); raw.geo = {states: ['US'], excluded_states: ['CA']}; raw.intake.capacity_per_day = '0';
  const before = copy(raw), result = validateOrderRequest(raw);
  assert.deepEqual(raw, before);
  assert.equal(result.valid, true);
  assert.equal(result.normalized.intake.capacity_per_day, 0);
  assert.match(result.review_reasons.join(' '), /capacity require confirmation/);
  const badGeo = base(); badGeo.geo = {states: ['CA'], excluded_states: ['CA']};
  assert.equal(validateOrderRequest(badGeo).valid, false);
  const badSchema = {...base(), schema: 'pretend/v9'};
  assert.equal(validateOrderRequest(badSchema).valid, false);
});

test('browser authority flags are discarded and initial state is immutable', () => {
  const raw = {...base(), approved: true, payment_verified: true, owner_approval: {by: 'Kyle'}, invoice: {invoice_id: 'fake'}, status: 'live'};
  const state = start(raw);
  assert.equal(state.status, 'request'); assert.equal(state.invoice, null); assert.equal(state.owner_approval, null);
  assert.equal('approved' in state.request, false);
  assert.throws(() => { state.request.budget.media_usd = '0'; }, TypeError);
  assert.equal(orderContentHash(state.request), state.request_hash);
});

test('commercial approval is bound to exact order versions and requires all trusted reviews', () => {
  const state = start(), approval = approvedQuote(state);
  approval.request_hash = 'b'.repeat(64);
  assert.throws(() => transitionTrustedOrder(state, event('quote_approved', 1, {approval})), /current request hash/);
  const withoutCriteria = approvedQuote(state); delete withoutCriteria.checks.criteria;
  assert.throws(() => transitionTrustedOrder(state, event('quote_approved', 1, {approval: withoutCriteria})), /criteria review/);
  assert.throws(() => transitionTrustedOrder(state, event('payment_reconciled', 3, {provider_snapshot: {}})), /without an issued invoice/);
});

test('payment verification requires real applied settled payments, correct identity, exact funding', () => {
  const state = awaiting(); assert.equal(evaluateTrustedPayment(state, snapshot(state)).verified, true);
  const variations = [
    p => { p.payments = []; }, // credit-only zero balance
    p => { p.payments[0].applied_cents = 250000; },
    p => { p.invoice_balance_cents = 500000; },
    p => { p.funds_status = 'pending'; },
    p => { p.payments[0].status = 'pending'; },
    p => { p.payments[0].reversed = true; },
    p => { p.payments[0].refunded_cents = 1; },
    p => { p.currency = 'CAD'; },
    p => { p.customer_id = 'ANOTHER-CUSTOMER'; },
    p => { p.realm_id = 'ANOTHER-REALM'; },
    p => { p.order_version = 2; },
    p => { p.invoice_total_cents = 700000; },
    p => { p.payments[0].invoice_id = 'ANOTHER-INVOICE'; },
    p => { p.payments.push(copy(p.payments[0])); },
    p => { p.evidence_ref = ''; },
    p => { p.invoice_status = 'voided'; },
  ];
  for (const mutate of variations) { const p = snapshot(state); mutate(p); assert.equal(evaluateTrustedPayment(state, p).verified, false, mutate.toString()); }
});

test('two partial payments can fund the order only after both are settled and fully applied', () => {
  const state = awaiting(), p = snapshot(state);
  p.payments[0].applied_cents = 250000;
  p.payments.push({...p.payments[0], provider_payment_id: 'SECOND-PAYMENT', applied_cents: 500000});
  assert.equal(evaluateTrustedPayment(state, p).verified, true);
  p.payments[1].status = 'pending';
  assert.equal(evaluateTrustedPayment(state, p).verified, false);
});

test('payment queues exactly one deterministic build and never authorizes launch', () => {
  const state = awaiting(), paymentEvent = event('payment_reconciled', 3, {provider_snapshot: snapshot(state)});
  const first = transitionTrustedOrder(state, paymentEvent);
  assert.equal(first.status, 'paid_build_queued'); assert.equal(first.owner_approval, null); assert.equal(first.release, null);
  assert.equal(transitionTrustedOrder(first, paymentEvent), first, 'same event is a no-op');
  const repeated = transitionTrustedOrder(first, event('payment_reconciled', 4, {provider_snapshot: {...snapshot(state), evidence_ref: 'test-fixture:new-read-same-financial-state'}}));
  assert.equal(repeated.build_key, first.build_key); assert.equal(repeated.status, 'paid_build_queued');
  assert.equal(repeated.history.at(-1).result, 'duplicate_provider_snapshot');
  assert.throws(() => transitionTrustedOrder(first, event('release_verified', 5, {})), /not valid from paid_build_queued/);
});

test('out-of-order success cannot resurrect a newer reversed payment', () => {
  const state = paid(), reversal = snapshot(state, 10); reversal.payments[0].reversed = true; reversal.invoice_status = 'open'; reversal.invoice_balance_cents = 750000;
  const held = transitionTrustedOrder(state, event('payment_reconciled', 11, {provider_snapshot: reversal}));
  assert.equal(held.status, 'review_needed'); assert.ok(held.financial_hold); assert.equal(held.payment.verified, false);
  const stale = transitionTrustedOrder(held, event('payment_reconciled', 12, {provider_snapshot: snapshot(state, 3)}));
  assert.equal(stale.status, 'review_needed'); assert.equal(stale.payment.verified, false);
  assert.equal(stale.history.at(-1).result, 'ignored_stale_payment_snapshot');
  assert.equal(stale.build_key, state.build_key);
});

test('conflicting same-timestamp snapshots fail closed until newer reconciliation', () => {
  const state = paid(), reversal = snapshot(state, 3); reversal.payments[0].reversed = true;
  const held = transitionTrustedOrder(state, event('payment_reconciled', 10, {provider_snapshot: reversal}));
  assert.equal(held.status, 'review_needed'); assert.ok(held.financial_hold);
  const recovered = transitionTrustedOrder(held, event('payment_reconciled', 12, {provider_snapshot: snapshot(state, 11)}));
  assert.equal(recovered.status, 'paid_build_queued'); assert.equal(recovered.financial_hold, null);
  assert.equal(recovered.build_key, state.build_key);
});

test('a financial hold cannot reopen quote approval or replace the bound invoice', () => {
  const state = paid();
  const reversed = snapshot(state, 10); reversed.payments[0].reversed = true;
  const conflict = snapshot(state, 3); conflict.payments[0].reversed = true;
  for (const provider_snapshot of [reversed, conflict]) {
    const held = transitionTrustedOrder(state, event('payment_reconciled', 11, {provider_snapshot}));
    assert.equal(held.status, 'review_needed'); assert.ok(held.financial_hold);
    assert.equal(held.invoice.invoice_id, 'TEST-INVOICE');
    assert.throws(() => transitionTrustedOrder(held, event('quote_approved', 12, {approval: approvedQuote(held)})), /invoice is already bound/);
    // Defensive reducer boundary: even a stale persisted status cannot overwrite its invoice.
    const staleDraft = {...copy(held), status: 'invoice_draft'};
    assert.throws(() => transitionTrustedOrder(staleDraft, event('invoice_issued', 13, {invoice: {...held.invoice, invoice_id: 'SECOND-INVOICE'}})), /invoice is already bound/);
    assert.equal(held.invoice.invoice_id, 'TEST-INVOICE');
  }
});

test('client revisions invalidate acceptance and owner approval on the exact artifact', () => {
  const queue = launchQueue(), approved = transitionTrustedOrder(queue, event('owner_approved', 7, {approval: ownerApproval(queue)}));
  assert.equal(approved.status, 'approved_for_launch');
  const revised = transitionTrustedOrder(approved, event('client_changes_requested', 8, {change_request_id: 'CHANGE-1', reason: 'Revise the headline.'}));
  assert.equal(revised.status, 'changes_requested'); assert.equal(revised.owner_approval, null); assert.equal(revised.client_acceptance, null);
  assert.throws(() => transitionTrustedOrder(revised, event('owner_approved', 9, {approval: ownerApproval(queue)})), /not valid from changes_requested/);
});

test('stale owner approval, wrong media authorization and missing launch evidence are rejected', () => {
  const state = launchQueue();
  const stale = ownerApproval(state); stale.artifact_hash = 'b'.repeat(64);
  assert.throws(() => transitionTrustedOrder(state, event('owner_approved', 7, {approval: stale})), /exact artifact/);
  const wrongBudget = ownerApproval(state); wrongBudget.media_budget_cents = 300000;
  assert.throws(() => transitionTrustedOrder(state, event('owner_approved', 7, {approval: wrongBudget})), /exact media budget/);
  const missingGate = ownerApproval(state); delete missingGate.gates.consent;
  assert.throws(() => transitionTrustedOrder(state, event('owner_approved', 7, {approval: missingGate})), /consent needs evidence/);
});

test('material changes preserve historical financial receipts and reset all usable approvals/jobs', () => {
  const state = launchQueue(), raw = copy(state.request); raw.budget.media_usd = '6000';
  const revised = transitionTrustedOrder(state, event('material_revision', 9, {request: raw, reason: 'Media budget changed.'}));
  assert.equal(revised.order_version, 2); assert.notEqual(revised.request_hash, state.request_hash);
  assert.equal(revised.status, 'review_needed'); assert.equal(revised.invoice, null); assert.equal(revised.payment, null); assert.equal(revised.build_key, null);
  assert.equal(revised.client_acceptance, null); assert.equal(revised.owner_approval, null);
  assert.equal(revised.prior_financial_receipts[0].invoice.invoice_id, state.invoice.invoice_id);
  assert.throws(() => transitionTrustedOrder(revised, event('quote_approved', 10, {approval: approvedQuote(state)})), /current request hash/);
  assert.equal(state.order_version, 1, 'original object was not changed');
  const replacementApproval = {...approvedQuote(revised), total_cents: 850000};
  assert.throws(() => transitionTrustedOrder(revised, event('quote_approved', 10, {approval: replacementApproval})), /Prior invoice\/funds need verified resolution/);
});

test('live state needs an exact release receipt; payment reversal records a live hold without claiming rollback', () => {
  const queue = launchQueue(), approved = transitionTrustedOrder(queue, event('owner_approved', 7, {approval: ownerApproval(queue)}));
  const release = {release_id: 'RELEASE-1', evidence_ref: 'test-fixture:release', live_at: at(8), production_url: 'https://example.test/c/test/', request_hash: approved.request_hash, order_version: approved.order_version, artifact_hash: approved.artifact.hash, artifact_version: approved.artifact.version, owner_approval_ref: approved.owner_approval.evidence_ref, campaign_id: 'TEST-CAMPAIGN'};
  assert.throws(() => transitionTrustedOrder(approved, event('release_verified', 8, {release: {...release, artifact_hash: 'f'.repeat(64)}})), /must match current approvals/);
  const live = transitionTrustedOrder(approved, event('release_verified', 8, {release}));
  assert.equal(live.status, 'live');
  const p = snapshot(live, 10); p.payments[0].reversed = true;
  const held = transitionTrustedOrder(live, event('payment_reconciled', 11, {provider_snapshot: p}));
  assert.equal(held.status, 'live'); assert.ok(held.financial_hold); assert.equal(held.owner_approval, null); assert.equal(held.release.release_id, 'RELEASE-1');
});

test('browser bundle runs without Node/network/storage and exposes no privileged transitions', () => {
  const context = vm.createContext({});
  vm.runInContext(`${browserOrderContractSource()} globalThis.contract = BTL_ORDER;`, context);
  assert.equal(context.contract.ORDER_SCHEMA, ORDER_SCHEMA);
  for (const name of ['transitionTrustedOrder', 'evaluateTrustedPayment', 'createOrderState']) assert.equal(context.contract[name], undefined);
  const result = context.contract.validateOrderRequest(base());
  assert.deepEqual(copy(result.normalized), normalizeOrderRequest(base()));
  assert.equal(result.quote.total_cents, 750000);
  assert.doesNotMatch(browserOrderContractSource(), /fetch\(|XMLHttpRequest|localStorage|sessionStorage|node:crypto/);
});
