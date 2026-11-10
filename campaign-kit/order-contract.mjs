// BTL firm-order domain contract. No HTTP, persistence, billing, sends or release side effects.
// Browser input is a proposal. Only an authenticated server adapter may call the trusted-state
// functions below. Naming, booleans and source references are NOT authentication or signature
// verification. The adapter must verify authority, re-read provider state and atomically persist
// each transition + unique inbox/outbox keys before performing any external operation.
import {createHash} from 'node:crypto';

function createBrowserOrderContract() {
  const ORDER_SCHEMA = 'btl.campaign.order/v1';
  const COMMERCIAL_MODELS = Object.freeze(['managed_campaign', 'qualified_lead_program', 'network_membership', 'founding_partner']);
  const SERVICE_FEE_CENTS = 250000;
  const QB_PRODUCTS = Object.freeze({service_fee: '53', media_budget: '1010000001'});
  const CHANNELS = Object.freeze(['meta', 'google', 'tiktok', 'openai', 'organic', 'email', 'sms']);
  const INTAKE_MODES = Object.freeze(['live_transfer', 'scheduled_callback', 'api_webhook', 'secure_delivery', 'review_needed']);
  const METHODS = ['ask_or_verify_existing', 'ask', 'verified_existing', 'manual_review'];
  const US_STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
  const text = value => typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
  const list = value => Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : [];
  const numberOrNull = value => value === '' || value == null ? null : typeof value === 'number' ? value : /^\d+$/.test(text(value)) ? Number(value) : NaN;
  function parseUsdCents(value) {
    if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError('Enter a dollar amount with at most two decimal places.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Dollar amount must be finite.');
    const amount = String(value).trim().replace(/^\$\s*/, '');
    const match = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(amount);
    if (!match) throw new TypeError('Enter a nonnegative dollar amount with at most two decimal places; no exponent notation.');
    const cents = BigInt(match[1].replace(/,/g, '')) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Dollar amount is too large.');
    return Number(cents);
  }
  function normalizeOrderRequest(input = {}) {
    const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const f = raw.firm || {}, b = raw.billing || {}, c = raw.criteria || {}, i = raw.intake || {};
    const money = raw.budget || {}, n = raw.network || {}, t = raw.terms || {}, lp = raw.lead_program || {};
    const phone = text(f.phone).replace(/[() .-]/g, '');
    return {
      schema: ORDER_SCHEMA,
      commercial_model: text(raw.commercial_model),
      template_id: text(raw.template_id), topic: text(raw.topic),
      geo: {states: list(raw.geo?.states).map(v => v.toUpperCase()).sort(), excluded_states: list(raw.geo?.excluded_states).map(v => v.toUpperCase()).sort()},
      channels: list(raw.channels).sort(),
      firm: {name: text(f.name), website: text(f.website), contact_name: text(f.contact_name), email: text(f.email).toLowerCase(), phone},
      billing: {name: text(b.name), email: text(b.email).toLowerCase()},
      criteria: {
        version: text(c.version), source: text(c.source), exclusions: Array.isArray(c.exclusions) ? list(c.exclusions) : text(c.exclusions),
        qualifiers: (Array.isArray(c.qualifiers) ? c.qualifiers : []).map((q, index) => ({
          key: text(q?.key) || `qualifier_${index + 1}`, label: text(q?.label), rule: text(q?.rule),
          verification_method: text(q?.verification_method) || 'manual_review', required: q?.required === true, evidence_source: text(q?.evidence_source),
        })),
      },
      intake: {mode: text(i.mode) || 'review_needed', endpoint: text(i.endpoint), hours: text(i.hours), timezone: text(i.timezone), languages: list(i.languages), capacity_per_day: numberOrNull(i.capacity_per_day)},
      budget: {media_usd: text(money.media_usd ?? money.media_total_usd), duration_days: numberOrNull(money.duration_days ?? 14)},
      network: {alternate_routing: n.alternate_routing === true, distribution: text(n.distribution) || 'undecided'},
      lead_program: {billable_event: text(lp.billable_event), acceptance_definition: text(lp.acceptance_definition), delivery_definition: text(lp.delivery_definition), funding_model: text(lp.funding_model), dispute_window_days: numberOrNull(lp.dispute_window_days), proposed_rate_usd: text(lp.proposed_rate_usd)},
      terms: {version: text(t.version), source: text(t.source), scope_acknowledged: t.scope_acknowledged === true},
    };
  }
  function validateOrderRequest(raw) {
    const order = normalizeOrderRequest(raw), errors = [], review_reasons = [];
    const error = (field, code, message) => errors.push({field, code, message});
    const need = (ok, field, message) => { if (!ok) error(field, 'required', message); };
    const review = (ok, message) => { if (!ok) review_reasons.push(message); };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) error('request', 'invalid', 'Request must be an object.');
    if (raw?.schema && raw.schema !== ORDER_SCHEMA) error('schema', 'unsupported', 'Unsupported order schema.');
    if (!COMMERCIAL_MODELS.includes(order.commercial_model)) error('commercial_model', 'unsupported', 'Choose a commercial model.');
    need(order.topic, 'topic', 'Choose a campaign topic or describe the requested program.');
    need(order.firm.name, 'firm.name', 'Firm name is required.');
    need(order.firm.contact_name, 'firm.contact_name', 'Firm contact is required.');
    need(order.billing.name, 'billing.name', 'Billing name is required.');
    for (const [field, value] of [['firm.email', order.firm.email], ['billing.email', order.billing.email]]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error(field, 'invalid', 'Enter a valid business email.');
    }
    if (order.firm.website && !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(order.firm.website)) error('firm.website', 'invalid', 'Website must be a public http or https URL.');
    if (order.firm.phone && !/^\+?\d{10,15}$/.test(order.firm.phone)) error('firm.phone', 'invalid', 'Enter a business phone number, including country code where applicable.');
    need(order.geo.states.length, 'geo.states', 'Select the states to review.');
    for (const [field, states] of [['geo.states', order.geo.states], ['geo.excluded_states', order.geo.excluded_states]]) {
      if (states.some(s => !US_STATES.includes(s) && !(field === 'geo.states' && s === 'US'))) error(field, 'invalid', 'Use US state abbreviations, or US for a national request.');
    }
    if (order.geo.states.includes('US') && order.geo.states.length > 1) error('geo.states', 'conflict', 'Use US alone for a national request and list exclusions separately.');
    if (order.geo.excluded_states.some(s => order.geo.states.includes(s))) error('geo.excluded_states', 'conflict', 'A state cannot be both included and excluded.');
    if (order.channels.some(c => !CHANNELS.includes(c))) error('channels', 'unsupported', 'One or more requested channels are unsupported.');
    if (!INTAKE_MODES.includes(order.intake.mode)) error('intake.mode', 'unsupported', 'Choose a supported delivery method.');
    if (!['exclusive', 'shared', 'undecided'].includes(order.network.distribution)) error('network.distribution', 'unsupported', 'Choose exclusive, shared or undecided.');
    if (order.intake.capacity_per_day != null && (!Number.isSafeInteger(order.intake.capacity_per_day) || order.intake.capacity_per_day < 0)) error('intake.capacity_per_day', 'invalid', 'Capacity must be a nonnegative whole number; zero places the request on hold.');
    if (order.lead_program.dispute_window_days != null && (!Number.isSafeInteger(order.lead_program.dispute_window_days) || order.lead_program.dispute_window_days < 0)) error('lead_program.dispute_window_days', 'invalid', 'A proposed dispute window must be a nonnegative whole number of days.');
    if (!Number.isSafeInteger(order.budget.duration_days) || order.budget.duration_days < 1 || order.budget.duration_days > 365) error('budget.duration_days', 'invalid', 'Duration must be a whole number from 1 to 365 days.');
    const keys = new Set();
    order.criteria.qualifiers.forEach((q, index) => {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(q.key) || keys.has(q.key)) error(`criteria.qualifiers.${index}.key`, 'invalid', 'Qualifier keys must be unique lowercase identifiers.');
      keys.add(q.key);
      if (!q.label || !q.rule) error(`criteria.qualifiers.${index}`, 'required', 'Each qualifier needs a label and a decision rule.');
      if (!METHODS.includes(q.verification_method)) error(`criteria.qualifiers.${index}.verification_method`, 'unsupported', 'Choose a supported verification method.');
    });
    need(order.terms.scope_acknowledged, 'terms.scope_acknowledged', 'Acknowledge this is a request for review, not an approved launch or payment.');
    // References collected in a form are not proof of an attorney's approval or claimant permission.
    review(order.template_id && order.template_id !== 'custom', 'A compatible campaign template must be selected and verified.');
    review(order.criteria.version && order.criteria.source && order.criteria.qualifiers.length, 'Written firm criteria and their version require review.');
    review(order.terms.version && order.terms.source, 'Commercial scope and terms require a versioned written approval.');
    review(order.intake.mode !== 'review_needed' && order.intake.endpoint && order.intake.hours && order.intake.timezone && order.intake.capacity_per_day, 'Intake destination, hours, timezone and capacity require confirmation.');
    review(order.network.distribution !== 'undecided', 'Exclusive or shared delivery terms must be agreed.');
    if (order.network.alternate_routing) review_reasons.push('Alternate firm routing needs separate recipient eligibility and claimant permission; firm participation is not claimant permission.');
    let media = null, lines = [], total = null, fee = null;
    if (order.commercial_model === 'managed_campaign') {
      fee = SERVICE_FEE_CENTS;
      review(order.channels.length, 'At least one permitted channel must be selected and reviewed.');
      if (!order.budget.media_usd) review_reasons.push('An explicit media budget is required before invoicing.');
      else {
        try {
          media = parseUsdCents(order.budget.media_usd);
          if (media <= 0) error('budget.media_usd', 'invalid', 'Media budget must be greater than zero.');
          if (!Number.isSafeInteger(media + fee)) error('budget.media_usd', 'invalid', 'Combined total is too large.');
        } catch (err) { error('budget.media_usd', 'invalid', err.message); }
      }
      if (Number.isSafeInteger(media) && media > 0 && Number.isSafeInteger(media + fee)) {
        total = media + fee;
        lines = [{product_id: QB_PRODUCTS.service_fee, description: 'MA Test Fee', quantity: 1, unit_amount_cents: fee}, {product_id: QB_PRODUCTS.media_budget, description: 'Ad Budget', quantity: 1, unit_amount_cents: media}];
      }
    } else {
      review_reasons.push('This commercial model is a proposed program. Price, scope, funding and provider product mapping require a separate approved quote.');
      if (order.commercial_model === 'qualified_lead_program') review_reasons.push('Define the billable accepted inquiry, exclusivity, dispute window and funding before selling a lead program.');
      if (order.commercial_model === 'network_membership') review_reasons.push('Firm membership includes only agreed profile, criteria, capacity and reporting access; media and guaranteed leads are not included.');
      if (order.commercial_model === 'founding_partner') review_reasons.push('Founding partner scope and monthly economics are custom scenarios, not an approved subscription.');
    }
    const inspectLengths = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string' && value.length > 4000) error(path, 'too_long', 'Keep each field under 4,000 characters.');
        else if (value && typeof value === 'object') inspectLengths(value, path);
      }
    };
    inspectLengths(order);
    if (order.criteria.qualifiers.length > 50) error('criteria.qualifiers', 'too_many', 'At most 50 qualifiers per request.');
    return {valid: errors.length === 0, errors, review_reasons, normalized: order, quote: {currency: 'USD', service_fee_cents: fee, media_budget_cents: media, total_cents: total, line_items: lines, requires_review: true}};
  }
  return {ORDER_SCHEMA, COMMERCIAL_MODELS, SERVICE_FEE_CENTS, QB_PRODUCTS, CHANNELS, INTAKE_MODES, normalizeOrderRequest, validateOrderRequest, parseUsdCents};
}

export const {ORDER_SCHEMA, COMMERCIAL_MODELS, SERVICE_FEE_CENTS, QB_PRODUCTS, CHANNELS, INTAKE_MODES, normalizeOrderRequest, validateOrderRequest, parseUsdCents} = createBrowserOrderContract();
// Embed this in the existing build.mjs renderer. It contains no privileged state transitions.
export const browserOrderContractSource = () => `const BTL_ORDER = (${createBrowserOrderContract.toString()})();`;
export const ORDER_STATES = Object.freeze(['request', 'review_needed', 'invoice_draft', 'awaiting_payment', 'paid_build_queued', 'building', 'client_review', 'changes_requested', 'launch_queue', 'approved_for_launch', 'live']);
export const LAUNCH_GATES = Object.freeze(['criteria', 'copy', 'intake_receipt', 'delivery', 'consent', 'tracking', 'reporting', 'channel_policy']);
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
export const orderContentHash = value => createHash('sha256').update(canonical(value)).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const hashOk = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const timeOk = value => typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const evidenceOk = (e, state) => e && nonempty(e.by) && timeOk(e.at) && nonempty(e.evidence_ref) && e.order_version === state.order_version && e.request_hash === state.request_hash;
const requireState = (state, allowed, event) => assert(allowed.includes(state.status), `${event.type} is not valid from ${state.status}.`);
const requireFinancialClear = state => assert(state.payment?.verified === true && !state.financial_hold, 'Verified payment is required and financial holds must be cleared.');

export function createOrderState(raw, {order_id, order_version = 1, received_at} = {}) {
  const check = validateOrderRequest(raw);
  assert(check.valid, `Invalid request: ${check.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`);
  assert(/^[A-Za-z0-9][A-Za-z0-9_-]{2,99}$/.test(order_id || ''), 'A server-assigned order_id is required.');
  assert(Number.isSafeInteger(order_version) && order_version > 0, 'A positive order_version is required.');
  assert(timeOk(received_at), 'A trusted received_at timestamp with timezone is required.');
  return freeze({schema: 'btl.campaign.order.state/v1', order_id, order_version, status: check.review_reasons.length ? 'review_needed' : 'request', request: check.normalized, request_hash: orderContentHash(check.normalized), received_at, review_reasons: check.review_reasons, quote: check.quote, commercial_approval: null, invoice: null, payment: null, payment_provider_cursor: null, payment_snapshot_hash: null, build_key: null, build_started: false, artifact: null, client_acceptance: null, owner_approval: null, release: null, financial_hold: null, processed_event_ids: [], history: [], prior_financial_receipts: []});
}

// trustedProviderSnapshot must come from the authenticated provider readback adapter, never
// directly from a browser or webhook payload. A valid webhook signature identifies the sender;
// it does not establish invoice payment, settlement, order ownership or sufficient funds.
export function evaluateTrustedPayment(state, trustedProviderSnapshot) {
  const p = trustedProviderSnapshot || {}, invoice = state.invoice, reasons = [];
  const need = (ok, message) => { if (!ok) reasons.push(message); };
  need(!!invoice, 'No issued invoice is bound to this order.');
  need(p.provider === 'quickbooks', 'Unexpected payment provider.');
  for (const [key, expected] of Object.entries({order_id: state.order_id, order_version: state.order_version, request_hash: state.request_hash, realm_id: invoice?.realm_id, invoice_id: invoice?.invoice_id, customer_id: invoice?.customer_id, currency: 'USD'})) need(expected != null && p[key] === expected, `Payment ${key} does not match the issued order/invoice.`);
  need(Number.isSafeInteger(p.invoice_total_cents) && p.invoice_total_cents > 0 && p.invoice_total_cents === invoice?.total_cents && p.invoice_total_cents === state.quote.total_cents, 'Invoice amount does not match the approved quote.');
  need(p.invoice_balance_cents === 0, 'Invoice is not fully paid.');
  need(p.invoice_status === 'paid', 'Invoice is not in a paid state.');
  need(p.funds_status === 'settled', 'Payment funds are pending or unavailable.');
  need(timeOk(p.provider_updated_at), 'Provider update timestamp is missing.');
  need(nonempty(p.evidence_ref), 'Authoritative payment readback receipt is missing.');
  const payments = Array.isArray(p.payments) ? p.payments : [];
  need(payments.length > 0, 'No actual applied payment exists; a credit-only or zero-balance invoice is insufficient.');
  const ids = new Set(); let applied = 0;
  for (const item of payments) {
    const payment = item && typeof item === 'object' ? item : {};
    need(nonempty(payment.provider_payment_id) && !ids.has(payment.provider_payment_id), 'Applied payment IDs must be present and unique.');
    ids.add(payment.provider_payment_id);
    need(payment.invoice_id === invoice?.invoice_id, 'Applied payment belongs to a different invoice.');
    need(payment.status === 'settled' && payment.reversed === false && payment.refunded_cents === 0, 'Applied payment is pending, reversed or refunded.');
    need(Number.isSafeInteger(payment.applied_cents) && payment.applied_cents > 0, 'Applied payment amount must be positive integer cents.');
    if (Number.isSafeInteger(payment.applied_cents)) applied += payment.applied_cents;
  }
  need(Number.isSafeInteger(applied) && applied === state.quote.total_cents, 'Actual applied payments do not exactly fund this order.');
  return freeze({verified: reasons.length === 0, reasons, applied_cents: applied, provider_updated_at: p.provider_updated_at || null, evidence_ref: p.evidence_ref || null, payment_ids: [...ids]});
}

const paymentSnapshotHash = p => orderContentHash({
  provider: p?.provider ?? null, order_id: p?.order_id ?? null, order_version: p?.order_version ?? null,
  request_hash: p?.request_hash ?? null, realm_id: p?.realm_id ?? null, invoice_id: p?.invoice_id ?? null,
  customer_id: p?.customer_id ?? null, currency: p?.currency ?? null, invoice_total_cents: p?.invoice_total_cents ?? null,
  invoice_balance_cents: p?.invoice_balance_cents ?? null, invoice_status: p?.invoice_status ?? null, funds_status: p?.funds_status ?? null,
  payments: (Array.isArray(p?.payments) ? p.payments : []).map(payment => ({provider_payment_id: payment?.provider_payment_id ?? null, invoice_id: payment?.invoice_id ?? null, applied_cents: payment?.applied_cents ?? null, status: payment?.status ?? null, reversed: payment?.reversed ?? null, refunded_cents: payment?.refunded_cents ?? null})).sort((a, b) => String(a.provider_payment_id).localeCompare(String(b.provider_payment_id))),
});

function addReceipt(next, event, result) {
  next.processed_event_ids.push(event.id);
  next.history.push({event_id: event.id, type: event.type, at: event.at, result, status: next.status, order_version: next.order_version, request_hash: next.request_hash});
  return freeze(next);
}

// This domain reducer checks evidence binding; callers must authenticate every event producer.
// Persist its result with compare-and-swap on the prior state version and an outbox uniqueness
// constraint on build_key. An in-memory reducer is not a substitute for a transactional adapter.
export function transitionTrustedOrder(state, trustedEvent) {
  const event = trustedEvent || {};
  assert(ORDER_STATES.includes(state?.status), 'Invalid order state.');
  assert(nonempty(event.id) && event.id.length <= 200 && timeOk(event.at), 'A trusted event ID and timestamp are required.');
  if (state.processed_event_ids.includes(event.id)) return state;
  const next = clone(state);
  switch (event.type) {
    case 'review_required':
      requireState(state, ['request', 'review_needed'], event);
      assert(nonempty(event.reason), 'A review reason is required.');
      next.status = 'review_needed'; next.review_reasons.push(event.reason); break;
    case 'quote_approved': {
      requireState(state, ['request', 'review_needed'], event);
      assert(!state.invoice, 'An invoice is already bound to this order/version. Resolve the financial hold or use a material revision/adjustment; quote approval cannot replace it.');
      assert(state.request.commercial_model === 'managed_campaign', 'This proposed commercial model needs a separately approved quote and billing adapter; no invoice is generated.');
      assert(Number.isSafeInteger(state.quote.total_cents) && state.quote.total_cents > SERVICE_FEE_CENTS, 'An explicit valid media budget is required.');
      const approved = event.approval;
      assert(evidenceOk(approved, state), 'Commercial approval must bind to the current request hash and version.');
      assert(approved.total_cents === state.quote.total_cents && approved.currency === 'USD', 'Approved amount/currency must match the computed quote.');
      assert(approved.template_id === state.request.template_id && approved.commercial_model === state.request.commercial_model, 'Approved template and commercial model must match the request.');
      for (const key of ['template', 'criteria', 'terms', 'intake', 'distribution']) assert(evidenceOk(approved.checks?.[key], state), `Trusted ${key} review evidence is required.`);
      assert(nonempty(approved.template_version) && nonempty(approved.criteria_version) && nonempty(approved.terms_version), 'Approved template, criteria and terms versions are required.');
      assert(approved.criteria_version === state.request.criteria.version && approved.terms_version === state.request.terms.version, 'Approved criteria/terms versions do not match the request.');
      assert(state.request.template_id && state.request.template_id !== 'custom' && state.request.criteria.qualifiers.length > 0, 'Unknown templates or missing criteria need revision before invoicing.');
      assert(state.request.criteria.source && state.request.terms.source && state.request.channels.length, 'Criteria source, terms source and channel selection are required before invoicing.');
      assert(state.request.intake.mode !== 'review_needed' && state.request.intake.endpoint && state.request.intake.hours && state.request.intake.timezone && state.request.intake.capacity_per_day, 'Intake details must be complete before invoicing.');
      assert(state.request.network.distribution !== 'undecided', 'Delivery distribution must be agreed before invoicing.');
      // This standard-price path cannot reuse retained funds or silently invoice twice after a
      // material change. Credit/reallocation or incremental invoices need a separate adapter.
      for (const previous of state.prior_financial_receipts.filter(receipt => receipt.invoice)) {
        const resolution = approved.prior_invoice_resolutions?.find(item => item.realm_id === previous.invoice.realm_id && item.invoice_id === previous.invoice.invoice_id);
        assert(evidenceOk(resolution, state) && resolution.unallocated_funds_cents === 0 && ['voided_unpaid', 'fully_refunded'].includes(resolution.provider_status), 'Prior invoice/funds need verified resolution before a replacement invoice; credits or incremental billing require a separate adjustment adapter.');
        if (previous.payment?.verified) assert(resolution.provider_status === 'fully_refunded', 'Previously paid funds cannot be treated as an unpaid void.');
      }
      next.commercial_approval = clone(approved); next.quote.requires_review = false; next.review_reasons = []; next.status = 'invoice_draft'; break;
    }
    case 'invoice_issued': {
      requireState(state, ['invoice_draft'], event);
      assert(!state.invoice, 'An invoice is already bound to this order/version; replacement requires an explicit financial resolution and adjustment.');
      const invoice = event.invoice;
      assert(invoice?.provider === 'quickbooks' && nonempty(invoice.realm_id) && nonempty(invoice.invoice_id) && nonempty(invoice.customer_id), 'Issued provider invoice identity is required.');
      assert(invoice.order_id === state.order_id && invoice.order_version === state.order_version && invoice.request_hash === state.request_hash, 'Invoice does not belong to the approved order/version.');
      assert(invoice.currency === 'USD' && invoice.total_cents === state.quote.total_cents && nonempty(invoice.evidence_ref), 'Issued invoice amount and provider receipt are required.');
      next.invoice = clone(invoice); next.status = 'awaiting_payment'; break;
    }
    case 'payment_reconciled': {
      assert(state.invoice, 'Payment cannot advance an order without an issued invoice.');
      const p = event.provider_snapshot, verdict = evaluateTrustedPayment(state, p);
      // Older snapshots must not resurrect a returned payment or invalidate newer evidence.
      if (timeOk(p?.provider_updated_at) && state.payment_provider_cursor && Date.parse(p.provider_updated_at) < Date.parse(state.payment_provider_cursor)) return addReceipt(next, event, 'ignored_stale_payment_snapshot');
      const snapshotHash = paymentSnapshotHash(p);
      if (timeOk(p?.provider_updated_at) && state.payment_provider_cursor && Date.parse(p.provider_updated_at) === Date.parse(state.payment_provider_cursor)) {
        if (snapshotHash === state.payment_snapshot_hash) return addReceipt(next, event, 'duplicate_provider_snapshot');
        next.financial_hold = {reasons: ['Conflicting payment snapshots share the same provider timestamp. Reconcile with newer provider evidence.'], at: event.at, evidence_ref: p.evidence_ref || null};
        next.client_acceptance = null; next.owner_approval = null;
        if (state.status !== 'live') next.status = 'review_needed';
        return addReceipt(next, event, 'conflicting_payment_snapshot');
      }
      if (timeOk(p?.provider_updated_at)) { next.payment_provider_cursor = p.provider_updated_at; next.payment_snapshot_hash = snapshotHash; }
      if (!verdict.verified) {
        next.financial_hold = {reasons: [...verdict.reasons], at: event.at, evidence_ref: verdict.evidence_ref};
        next.payment = verdict; next.client_acceptance = null; next.owner_approval = null;
        // Actual releases cannot be undone by changing a database status. Escalate a live hold.
        if (state.status !== 'live') next.status = ['awaiting_payment', 'invoice_draft'].includes(state.status) ? 'awaiting_payment' : 'review_needed';
        return addReceipt(next, event, 'payment_not_verified');
      }
      next.payment = verdict; next.financial_hold = null;
      if (!state.build_key) {
        next.build_key = `btl-build:${state.order_id}:v${state.order_version}:${state.request_hash}`;
        next.status = 'paid_build_queued';
      } else if (state.status === 'review_needed') {
        // An existing job is resumed/reviewed; another charge/event cannot create another job.
        next.status = state.artifact ? 'client_review' : state.build_started ? 'building' : 'paid_build_queued';
      }
      break;
    }
    case 'build_started':
      requireState(state, ['paid_build_queued', 'changes_requested'], event); requireFinancialClear(state);
      assert(event.build_key === state.build_key, 'Build key does not match the paid order.');
      next.status = 'building'; next.build_started = true; break;
    case 'build_completed': {
      requireState(state, ['building'], event); requireFinancialClear(state);
      const artifact = event.artifact;
      assert(event.build_key === state.build_key && hashOk(artifact?.hash) && nonempty(artifact.version) && nonempty(artifact.evidence_ref), 'Versioned build artifact hash and receipt are required.');
      assert(artifact.request_hash === state.request_hash && artifact.order_version === state.order_version, 'Build artifact does not match the current order.');
      next.artifact = clone(artifact); next.client_acceptance = null; next.owner_approval = null; next.status = 'client_review'; break;
    }
    case 'client_changes_requested':
      requireState(state, ['client_review', 'launch_queue', 'approved_for_launch'], event);
      assert(nonempty(event.change_request_id) && nonempty(event.reason), 'A client revision receipt and reason are required.');
      next.client_acceptance = null; next.owner_approval = null; next.status = 'changes_requested'; break;
    case 'client_accepted': {
      requireState(state, ['client_review'], event); requireFinancialClear(state);
      const approval = event.approval;
      assert(evidenceOk(approval, state) && approval.artifact_hash === state.artifact?.hash && approval.artifact_version === state.artifact?.version, 'Client acceptance must bind to this exact artifact and order version.');
      next.client_acceptance = clone(approval); next.status = 'launch_queue'; break;
    }
    case 'owner_approved': {
      requireState(state, ['launch_queue'], event); requireFinancialClear(state);
      const approval = event.approval;
      assert(evidenceOk(approval, state) && approval.actor_role === 'owner' && approval.artifact_hash === state.artifact?.hash && approval.artifact_version === state.artifact?.version, 'Authenticated owner approval must bind to the exact artifact and order version.');
      assert(approval.media_budget_cents === state.quote.media_budget_cents && approval.duration_days === state.request.budget.duration_days && nonempty(approval.campaign_id), 'Owner approval must name the campaign, exact media budget and duration.');
      for (const gate of LAUNCH_GATES) {
        const evidence = approval.gates?.[gate];
        assert(evidenceOk(evidence, state) && evidence.artifact_hash === state.artifact.hash, `Launch gate ${gate} needs evidence for this exact artifact.`);
      }
      next.owner_approval = clone(approval); next.status = 'approved_for_launch'; break;
    }
    case 'release_verified': {
      requireState(state, ['approved_for_launch'], event); requireFinancialClear(state);
      const release = event.release;
      assert(nonempty(release?.release_id) && nonempty(release.evidence_ref) && timeOk(release.live_at) && /^https:\/\//.test(release.production_url || ''), 'A verified production release receipt is required.');
      assert(release.request_hash === state.request_hash && release.order_version === state.order_version && release.artifact_hash === state.artifact?.hash && release.artifact_version === state.artifact?.version, 'Released artifact must match current approvals.');
      assert(release.owner_approval_ref === state.owner_approval?.evidence_ref && release.campaign_id === state.owner_approval?.campaign_id, 'Release must reference this exact owner authorization and campaign.');
      next.release = clone(release); next.status = 'live'; break;
    }
    case 'material_revision': {
      assert(state.status !== 'live', 'A live campaign needs a separate change/release plan; this reducer cannot silently replace it.');
      const check = validateOrderRequest(event.request);
      assert(check.valid, 'Revised order request is invalid.');
      assert(nonempty(event.reason), 'A material revision reason is required.');
      assert(orderContentHash(check.normalized) !== state.request_hash, 'A material revision must change the request.');
      const revised = createOrderState(check.normalized, {order_id: state.order_id, order_version: state.order_version + 1, received_at: event.at});
      const previous = {order_version: state.order_version, request_hash: state.request_hash, invoice: state.invoice, payment: state.payment, build_key: state.build_key, artifact: state.artifact};
      Object.assign(next, clone(revised), {status: 'review_needed', processed_event_ids: [...state.processed_event_ids], history: [...state.history], prior_financial_receipts: [...state.prior_financial_receipts, previous]});
      next.review_reasons.push('Material revision invalidated prior quote, payment allocation and approvals. Reconcile any prior funds; do not charge or refund automatically.');
      break;
    }
    default: throw new Error(`Unsupported trusted event type: ${event.type || '(missing)'}.`);
  }
  return addReceipt(next, event, 'applied');
}
