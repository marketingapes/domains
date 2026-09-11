/**
 * Receipt adapter for the EXISTING MA Order Intake workflow (Make 6145362).
 * No new builder, webhook, AI call, invoice, payment or campaign activation.
 * An acknowledgement is not a payment or an assurance of eventual fulfillment.
 */
export const VERSION = 'ma-order-receipt-v1';
const FIELDS = Object.freeze([
  'buyer_name', 'type', 'contact_name', 'email', 'phone', 'case_types',
  'states', 'turn_downs', 'transfer_number', 'intake_hours', 'delivery',
  'product', 'price_usd', 'daily_cap', 'outcome_return', 'notes',
  'media_budget_usd', 'media_daily_budget_usd'
]);
const REQUIRED = ['buyer_name', 'contact_name', 'email', 'phone', 'states', 'product'];
const ATTRIBUTION = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'ttclid', 'campaign_id', 'ad_id', 'creative_id'
]);

export class IntakeError extends Error {
  constructor(code, message, { referenceId = null, uncertain = false } = {}) {
    super(message);
    this.name = 'IntakeError';
    this.code = code;
    this.referenceId = referenceId;
    this.uncertain = uncertain;
  }
}

const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'u');

function text(value, field, limit = 1000) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    if (field !== 'case_types') throw new IntakeError('INVALID_FIELD', `Invalid ${field}.`);
    value = value.map(item => text(item, field, 120)).join(', ');
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new IntakeError('INVALID_FIELD', `Invalid ${field}.`);
  }
  const result = String(value).trim();
  if (CONTROL_CHARS.test(result)) {
    throw new IntakeError('INVALID_FIELD', `Unsupported control characters in ${field}.`);
  }
  if (result.length > limit) throw new IntakeError('FIELD_TOO_LONG', `${field} is too long.`);
  return result;
}

// Defense in depth for Make's current USER_ENTERED sheet write. Server-side
// validation/RAW writes are still required: a public browser can bypass this.
export function sheetSafeText(value) {
  return /^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
}

export function readFormData(formData) {
  if (!formData || typeof formData.entries !== 'function') {
    throw new IntakeError('INVALID_FORM', 'Expected form data.');
  }
  const data = Object.create(null);
  for (const [key, value] of formData.entries()) {
    if (!FIELDS.includes(key)) continue;
    if (typeof value !== 'string') throw new IntakeError('INVALID_FIELD', 'File uploads are not supported here.');
    if (key === 'case_types') {
      (data.case_types ??= []).push(value);
    } else if (Object.hasOwn(data, key)) {
      throw new IntakeError('DUPLICATE_FIELD', `Repeated ${key}.`);
    } else {
      data[key] = value;
    }
  }
  return data;
}

function cleanSourceUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new IntakeError('INVALID_SOURCE', 'A valid source URL is required.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new IntakeError('INVALID_SOURCE', 'A public page URL is required.');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (!ATTRIBUTION.has(key)) url.searchParams.delete(key);
  }
  if (url.href.length > 4096) throw new IntakeError('INVALID_SOURCE', 'Source URL is too long.');
  return url.href;
}

export function createReferenceId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new IntakeError('SECURE_CONTEXT_REQUIRED', 'Use HTTPS to submit this form.');
  }
  return `MAO-${globalThis.crypto.randomUUID()}`;
}

export function buildOrderPayload(raw, {
  referenceId, tenantId, sourceUrl, pageVersion = VERSION, now = new Date(), requirePhone = true
}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new IntakeError('INVALID_FORM', 'Expected an order brief.');
  }
  if (!/^MAO-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(referenceId || '')) {
    throw new IntakeError('INVALID_REFERENCE', 'A valid submission reference is required.');
  }
  if (!/^[A-Z0-9_-]{2,32}$/i.test(tenantId || '')) {
    throw new IntakeError('INVALID_TENANT', 'A tenant ID is required.');
  }
  if (typeof requirePhone !== 'boolean') throw new IntakeError('INVALID_CONFIG', 'requirePhone must be boolean.');
  const normalized = Object.create(null);
  for (const key of FIELDS) normalized[key] = text(raw[key], key, key === 'notes' ? 6000 : 1000);
  for (const key of REQUIRED) {
    if (key === 'phone' && !requirePhone) continue;
    if (!normalized[key]) throw new IntakeError('MISSING_FIELD', `Please complete ${key}.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new IntakeError('INVALID_EMAIL', 'Please enter a valid email address.');
  }
  for (const key of ['price_usd', 'media_budget_usd', 'media_daily_budget_usd']) {
    if (normalized[key] && !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(normalized[key])) {
      throw new IntakeError('INVALID_PRICE', key + ' must be a nonnegative dollar amount with at most two decimals.');
    }
  }
  if (normalized.daily_cap && !/^[1-9]\d{0,6}$/.test(normalized.daily_cap)) {
    throw new IntakeError('INVALID_CAP', 'Daily cap must be a positive whole number.');
  }
  const submittedAt = new Date(now).toISOString();
  const cleanVersion = text(pageVersion, 'page_version', 100);
  if (!cleanVersion || /[\r\n\t]/.test(cleanVersion)) {
    throw new IntakeError('INVALID_VERSION', 'Invalid page version.');
  }
  const payload = new URLSearchParams();
  for (const key of FIELDS) {
    payload.set(key, ['price_usd', 'daily_cap', 'media_budget_usd', 'media_daily_budget_usd'].includes(key)
      ? normalized[key] : sheetSafeText(normalized[key]));
  }
  payload.set('tenant_id', tenantId);
  payload.set('source_url', cleanSourceUrl(sourceUrl));
  payload.set('submission_id', referenceId);
  payload.set('page_version', cleanVersion);
  payload.set('submitted_at', submittedAt);
  // Make currently maps notes, not submission_id. Embed the join key here
  // without pretending a new sheet column or payment webhook already exists.
  payload.set('notes', [
    `Submission reference: ${referenceId}`,
    `Tenant: ${tenantId} | Page version: ${cleanVersion} | Submitted: ${submittedAt}`,
    'Payment: NOT VERIFIED by this form. Price is a buyer-supplied request, not an invoice.',
    `Buyer notes: ${normalized.notes}`
  ].join('\n'));
  return payload;
}

export function validateEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { throw new IntakeError('INVALID_ENDPOINT', 'Order intake is not configured.'); }
  // The endpoint is the Evolution Engine's governed action route for this tenant's `order` action
  // (…/actions/<TENANT>/order), handed out by EE.hooks.resolve() after the page-side gate passes. The provider
  // webhook lives on the engine, never here. Do not accept a destination from URL params or a form field.
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      !/\/[A-Z][A-Z0-9]{1,11}\/order$/.test(url.pathname)) {
    throw new IntakeError('INVALID_ENDPOINT', 'Use the governed Order Intake action route.');
  }
  return url.href;
}

async function sendOnce(endpoint, body, { referenceId, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  let timer;
  const uncertain = (code, message) => new IntakeError(code, message, { referenceId, uncertain: true });
  const operation = async () => {
    const response = await fetchImpl(endpoint, {
      method: 'POST', mode: 'cors', credentials: 'omit',
      redirect: 'error', referrerPolicy: 'no-referrer',
      body, signal: controller.signal
      // URLSearchParams supplies a CORS-safelisted form Content-Type.
      // No custom header or JSON Content-Type that would require preflight.
    });
    if (response.type === 'opaque' || response.type === 'opaqueredirect') {
      throw uncertain('OPAQUE_RESPONSE', 'The intake response could not be read.');
    }
    if (!response.ok) throw uncertain('HTTP_ERROR', 'The intake workflow did not confirm completion.');
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
      throw uncertain('UNCONFIRMED_RESPONSE', 'The intake workflow returned no verified acknowledgement.');
    }
    let result;
    try { result = await response.json(); } catch {
      throw uncertain('INVALID_RESPONSE', 'The intake acknowledgement could not be read.');
    }
    if (!result || result.ok !== true) {
      throw uncertain('UNCONFIRMED_RESPONSE', 'The intake workflow did not acknowledge this request.');
    }
    return Object.freeze({
      status: 'ACKNOWLEDGED', referenceId,
      paymentStatus: 'NOT_VERIFIED', campaignStatus: 'NOT_ACTIVATED',
      serverAcknowledgement: 'legacy_ok_true_no_echoed_reference'
    });
  };
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(uncertain('TIMEOUT', 'No acknowledgement arrived before the timeout.'));
          controller.abort();
        }, timeoutMs);
      })
    ]);
  } catch (error) {
    if (error instanceof IntakeError) throw error;
    throw uncertain('NETWORK_OR_CORS', 'The request may have arrived, but receipt could not be confirmed.');
  } finally {
    clearTimeout(timer);
  }
}

/** One submission per mounted form. Not server-side idempotency. */
export function createOrderSubmitter({
  endpoint, tenantId, sourceUrl, pageVersion = VERSION,
  referenceId = createReferenceId(), fetchImpl = globalThis.fetch,
  timeoutMs = 12000, now = () => new Date(), requirePhone = true
}) {
  endpoint = validateEndpoint(endpoint);
  if (typeof fetchImpl !== 'function') throw new IntakeError('UNSUPPORTED', 'Fetch is unavailable.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new IntakeError('INVALID_TIMEOUT', 'Timeout must be between 1 and 30000 milliseconds.');
  }
  let state = 'IDLE', inFlight = null, receipt = null;
  return Object.freeze({
    getState: () => Object.freeze({ status: state, referenceId }),
    submit(raw) {
      if (state === 'SUBMITTING') return inFlight;
      if (state === 'ACKNOWLEDGED') return Promise.resolve(receipt);
      if (state === 'UNKNOWN') return Promise.reject(new IntakeError(
        'RECONCILE_FIRST', 'Receipt is uncertain. Check the Buyer Board before sending again.',
        { referenceId, uncertain: true }
      ));
      let body;
      try { body = buildOrderPayload(raw, { referenceId, tenantId, sourceUrl, pageVersion, now: now(), requirePhone }); }
      catch (error) { return Promise.reject(error); }
      state = 'SUBMITTING';
      inFlight = sendOnce(endpoint, body, { referenceId, fetchImpl, timeoutMs })
        .then(result => { state = 'ACKNOWLEDGED'; receipt = result; return result; })
        .catch(error => { state = 'UNKNOWN'; throw error; });
      return inFlight;
    }
  });
}

/** The same event name remains, but fires ONLY after readable acknowledgement. */
export function acknowledgementEvent(receipt, { tenantId, domain, product }) {
  if (receipt?.status !== 'ACKNOWLEDGED') throw new IntakeError('NOT_ACKNOWLEDGED', 'No confirmed acknowledgement.');
  return Object.freeze({
    event: 'ee_order_submit', event_version: VERSION,
    event_id: `${receipt.referenceId}:acknowledged`, submission_id: receipt.referenceId,
    tenant_id: tenantId, domain, product,
    order_status: 'ACKNOWLEDGED', payment_status: 'NOT_VERIFIED'
    // No buyer name/email/phone, raw brief, purchase value or claim-level data.
  });
}

/** Bind the existing MA form, without creating a second builder or invoice UI. */
export function bindExistingOrderForm({
  form, errorBox, confirmationBox, endpoint, tenantId, domain,
  sourceUrl = globalThis.location?.href, pageVersion = VERSION,
  dataLayer = globalThis.dataLayer, fetchImpl = globalThis.fetch
}) {
  if (!form || !errorBox || !confirmationBox) throw new IntakeError('INVALID_FORM', 'Required form elements are missing.');
  const button = form.querySelector('button[type="submit"]');
  if (!button) throw new IntakeError('INVALID_FORM', 'The submit button is missing.');
  const originalLabel = button.textContent;
  const client = createOrderSubmitter({ endpoint, tenantId, sourceUrl, pageVersion, fetchImpl });
  errorBox.setAttribute('role', 'status');
  errorBox.setAttribute('aria-live', 'polite');
  const onSubmit = async event => {
    event.preventDefault();
    if (client.getState().status !== 'IDLE') return;
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Sending...';
    errorBox.style.display = 'none';
    try {
      const data = readFormData(new FormData(form));
      const receipt = await client.submit(data);
      // Analytics is best effort. A blocked tag must not turn an acknowledged
      // order into an apparent failure or cause another POST.
      try {
        dataLayer?.push(acknowledgementEvent(receipt, {
          tenantId, domain,
          product: /^[a-z0-9_-]{1,80}$/i.test(data.product || '') ? data.product : 'custom_scope'
        }));
      } catch { /* Keep the operational receipt even if analytics is blocked. */ }
      const doc = form.ownerDocument;
      const heading = doc.createElement('h2');
      heading.textContent = 'Brief receipt confirmed.';
      const message = doc.createElement('p');
      message.textContent = 'The intake workflow acknowledged your brief. Payment is not verified here, and no campaign has been activated.';
      const reference = doc.createElement('p');
      reference.textContent = `Submission reference: ${receipt.referenceId}`;
      confirmationBox.replaceChildren(heading, message, reference);
      form.style.display = 'none';
      confirmationBox.style.display = 'block';
      confirmationBox.setAttribute('tabindex', '-1');
      confirmationBox.focus();
    } catch (error) {
      const state = client.getState();
      if (state.status === 'IDLE') {
        errorBox.textContent = error instanceof IntakeError ? error.message : 'Please check the form before submitting.';
        button.disabled = false;
        button.textContent = originalLabel;
      } else {
        errorBox.textContent = `Receipt could not be confirmed. The brief may already have arrived. Do not submit or pay again based on this message. Contact kyleg@marketingapes.com and quote ${state.referenceId}.`;
        button.disabled = true;
        button.textContent = 'Receipt needs checking';
      }
      errorBox.style.display = 'block';
    }
  };
  form.addEventListener('submit', onSubmit);
  button.disabled = false;
  return Object.freeze({
    getState: client.getState,
    destroy: () => form.removeEventListener('submit', onSubmit)
  });
}
