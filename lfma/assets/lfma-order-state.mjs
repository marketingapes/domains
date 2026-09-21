/**
 * LFMA commercial transaction state. Pure, deterministic, no I/O.
 *
 * DRAFT → REQUESTED → PRICED → INVOICE_CREATED → PAID
 *       → SETUP_REQUIRED → QA → AUTHORIZED → LIVE
 *
 * The rule this file exists to enforce:
 *   PAYMENT IS NOT LAUNCH AUTHORIZATION.
 * A paid order still has to clear SETUP_REQUIRED and QA, and only an explicit
 * human AUTHORIZED step can reach LIVE. There is no edge from PAID to LIVE and
 * no function here that creates one.
 *
 * This module tracks state and builds an invoice-READY object. It does not
 * create invoices, take payment, hold credentials, or start ad delivery.
 */
export const ORDER_STATE_VERSION = 'lfma-order-state-v1';

export class OrderStateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OrderStateError';
    this.code = code;
  }
}

export const STATES = Object.freeze([
  'DRAFT', 'REQUESTED', 'PRICED', 'INVOICE_CREATED', 'INVOICE_FAILED',
  'PAID', 'SETUP_REQUIRED', 'QA', 'AUTHORIZED', 'LIVE'
]);

export const TRANSITIONS = Object.freeze({
  DRAFT:           Object.freeze(['REQUESTED']),
  REQUESTED:       Object.freeze(['PRICED']),
  PRICED:          Object.freeze(['INVOICE_CREATED', 'INVOICE_FAILED']),
  INVOICE_CREATED: Object.freeze(['PAID', 'INVOICE_FAILED']),
  INVOICE_FAILED:  Object.freeze(['PRICED', 'INVOICE_CREATED']),
  PAID:            Object.freeze(['SETUP_REQUIRED']),
  SETUP_REQUIRED:  Object.freeze(['QA']),
  QA:              Object.freeze(['AUTHORIZED', 'SETUP_REQUIRED']),
  AUTHORIZED:      Object.freeze(['LIVE']),
  LIVE:            Object.freeze([])
});

/** States from which a submission may still be sent. */
export const SUBMITTABLE = Object.freeze(['DRAFT']);

/** Human-readable reason a state is not yet live. Drives the public status copy. */
export const STATE_NOTE = Object.freeze({
  DRAFT: 'Not submitted yet.',
  REQUESTED: 'Request received. Nothing is charged and nothing is running.',
  PRICED: 'Priced and awaiting invoice.',
  INVOICE_CREATED: 'Invoice issued. Not paid.',
  INVOICE_FAILED: 'Invoice could not be issued. No charge was made.',
  PAID: 'Funded. Not live — setup and QA still required.',
  SETUP_REQUIRED: 'Build in progress.',
  QA: 'In QA against the launch gates.',
  AUTHORIZED: 'Cleared for launch by a human reviewer.',
  LIVE: 'Campaign is live.'
});

export function isState(value) {
  return typeof value === 'string' && STATES.includes(value);
}

export function canTransition(from, to) {
  if (!isState(from) || !isState(to)) return false;
  return TRANSITIONS[from].includes(to);
}

/** Returns the next state, or throws. Never mutates its argument. */
export function advance(from, to) {
  if (!isState(from)) throw new OrderStateError('UNKNOWN_STATE', `Unknown state ${String(from)}.`);
  if (!isState(to)) throw new OrderStateError('UNKNOWN_STATE', `Unknown state ${String(to)}.`);
  if (!canTransition(from, to)) {
    throw new OrderStateError('ILLEGAL_TRANSITION', `${from} cannot move directly to ${to}.`);
  }
  return to;
}

/**
 * The single question every launch path must ask. Payment alone is never
 * sufficient; only an explicit human authorization is.
 */
export function isLaunchAuthorized(state) {
  return state === 'AUTHORIZED' || state === 'LIVE';
}

/** Documented constant so no caller has to guess. Payment does not launch ads. */
export function paymentAuthorizesLaunch() {
  return false;
}

export function canSubmit(state) {
  return SUBMITTABLE.includes(state);
}

/**
 * Stable dedupe key for a request. FNV-1a over canonical JSON.
 * This is a duplicate-submission guard, NOT a security primitive.
 */
export function idempotencyKey(parts) {
  const canonical = JSON.stringify(parts, Object.keys(parts ?? {}).sort());
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < canonical.length; i++) {
    const c = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ((c << 3) | (c >>> 5)), 0x85ebca6b) >>> 0;
  }
  return `lfma-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/** In-memory guard. Callers persist the set if they need cross-reload safety. */
export function createSubmissionGuard(seen = new Set()) {
  return Object.freeze({
    seen,
    /** @returns {boolean} true if this is the first time we've seen the key. */
    claim(key) {
      if (typeof key !== 'string' || !key) throw new OrderStateError('INVALID_KEY', 'Missing idempotency key.');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    has(key) { return seen.has(key); }
  });
}

/**
 * Deterministic invoice-READY object. Nothing here contacts a payment
 * provider or holds a credential — it is the handoff payload a human or an
 * already-approved integration uses to raise the actual invoice.
 *
 * Fees and media stay separated so media can be booked as a liability.
 */
export function toInvoiceDraft({ quote, customer, campaign, nowIso, key }) {
  if (!quote || !Array.isArray(quote.lines)) throw new OrderStateError('INVALID_QUOTE', 'A priced quote is required.');
  if (!customer || typeof customer !== 'object') throw new OrderStateError('INVALID_CUSTOMER', 'Customer details are required.');
  for (const field of ['firm', 'contact', 'email']) {
    if (typeof customer[field] !== 'string' || !customer[field].trim()) {
      throw new OrderStateError('INVALID_CUSTOMER', `Missing ${field}.`);
    }
  }
  if (typeof nowIso !== 'string' || !nowIso) throw new OrderStateError('INVALID_CLOCK', 'A timestamp must be supplied.');

  const idem = key || idempotencyKey({
    firm: customer.firm, email: customer.email,
    product: quote.product, markets: quote.markets, total: quote.totalCents
  });

  return Object.freeze({
    version: ORDER_STATE_VERSION,
    state: 'PRICED',
    idempotencyKey: idem,
    createdAt: nowIso,
    customer: Object.freeze({
      firm: customer.firm.trim(),
      contact: customer.contact.trim(),
      email: customer.email.trim()
    }),
    campaign: Object.freeze({ ...(campaign ?? {}) }),
    lines: quote.lines,
    feesCents: quote.feesCents,
    mediaCents: quote.mediaCents,
    totalCents: quote.totalCents,
    memo: 'Media is collected as a media liability and spent on ad platforms. It is not agency income. '
        + 'Payment funds the campaign; it does not authorize launch. Setup, QA and human authorization still apply.',
    authorizesLaunch: false
  });
}
