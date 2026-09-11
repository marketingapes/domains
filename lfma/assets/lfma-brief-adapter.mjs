/** Adapter for the EXISTING LFMA briefForm. No new builder, route or payment. */
import { IntakeError, createOrderSubmitter, acknowledgementEvent } from './order-intake-client.mjs';
export const LFMA_VERSION = 'lfma-brief-receipt-v1';
const DELIVERY = Object.freeze({
  self: 'Firm runs intake in our system',
  deliver: 'Deliver to firm intake line',
  ai: 'AI prequalify then warm transfer (add-on, quoted separately)'
});
const BUDGETS = new Map([
  ['$2,500 — two weeks', 2500],
  ['$5,000 — two weeks', 5000],
  ['$10,000 — two weeks', 10000],
  ['Not sure — recommend one', null]
]);
function one(fd, key) {
  const values = fd.getAll(key);
  if (values.length > 1 || values.some(v => typeof v !== 'string')) {
    throw new IntakeError('INVALID_FIELD', `Invalid ${key}.`);
  }
  return (values[0] || '').trim();
}
/** Planning math only. Does not set or authorize an ad budget. */
export function mediaPacing(totalDollars, days = 14) {
  if (!Number.isSafeInteger(totalDollars) || totalDollars < 0 || totalDollars > 100000000 ||
      !Number.isSafeInteger(days) || days < 1 || days > 366) {
    throw new IntakeError('INVALID_MEDIA', 'Invalid media plan.');
  }
  const cents = totalDollars * 100, floor = Math.floor(cents / days), remainder = cents % days;
  return Object.freeze({
    totalCents: cents, days,
    approximateDailyDollars: (Math.round(cents / days) / 100).toFixed(2),
    dailyCents: Object.freeze(Array.from({ length: days }, (_, i) => floor + (i < remainder ? 1 : 0)))
  });
}
export function mapLfmaBrief(fd) {
  if (!fd || typeof fd.getAll !== 'function') throw new IntakeError('INVALID_FORM', 'Expected FormData.');
  const values = Object.fromEntries(['firm', 'name', 'email', 'tort', 'geo', 'no', 'budget', 'intake', 'line', 'hours']
    .map(key => [key, one(fd, key)]));
  for (const key of ['firm', 'name', 'email', 'tort', 'geo', 'no', 'budget']) {
    if (!values[key]) throw new IntakeError('MISSING_FIELD', `Please complete ${key}.`);
  }
  const intake = values.intake || 'deliver';
  if (!Object.hasOwn(DELIVERY, intake)) throw new IntakeError('INVALID_INTAKE', 'Choose an available intake option.');
  if (!BUDGETS.has(values.budget)) throw new IntakeError('INVALID_MEDIA', 'Choose an available media budget.');
  const media = BUDGETS.get(values.budget), pacing = media === null ? null : mediaPacing(media);
  return {
    type: 'Law firm', product: 'Campaign Sprint - build & management (14 days)',
    buyer_name: values.firm, contact_name: values.name, email: values.email,
    phone: '', // This form does not request a contact phone. Do not invent one or misuse the transfer line.
    case_types: values.tort, states: values.geo, turn_downs: values.no,
    transfer_number: values.line, intake_hours: values.hours, delivery: DELIVERY[intake],
    price_usd: '2500', // Preserves inspected page config. Not verified invoice price and never charges.
    media_budget_usd: media === null ? '' : String(media),
    media_daily_budget_usd: pacing ? pacing.approximateDailyDollars : '',
    daily_cap: '', // Buyer Board daily_cap is not a media-dollar field.
    notes: [
      'Campaign Sprint brief; requested scope only, not an accepted order or approved spend.',
      media === null ? 'Media budget: TBD; no budget authorized.' :
        `Requested media: $${media} over 14 days; approximately $${pacing.approximateDailyDollars}/day.`,
      'Media funded by the firm in its own ad account, separately from the service fee.',
      'Configured requested service fee: $2,500; confirm scope and actual invoice before charging.',
      `AI prequalification: ${intake === 'ai' ? 'REQUESTED - quote separately; not included or activated' : 'not requested'}.`,
      'Lead delivery daily cap: not supplied. Do not infer it from media dollars.',
      'No contact phone was requested by this form; use the supplied email for scope follow-up.'
    ].join('\n')
  };
}
export function bindLfmaBrief({
  form, sent, endpoint, sourceUrl, dataLayer = globalThis.dataLayer, fetchImpl = globalThis.fetch
}) {
  if (!form || !sent) throw new IntakeError('INVALID_FORM', 'LFMA form and confirmation elements are required.');
  const button = form.querySelector('button[type="submit"]');
  if (!button) throw new IntakeError('INVALID_FORM', 'Submit button is required.');
  const doc = form.ownerDocument, original = button.textContent;
  const errorBox = doc.createElement('p');
  errorBox.id = 'lfmaReceiptError'; errorBox.setAttribute('role', 'status');
  errorBox.setAttribute('aria-live', 'polite'); errorBox.hidden = true;
  form.append(errorBox);
  // `endpoint` may be a function: the gated hook URL is only resolvable at submit time (after consent evidence
  // is recorded), so the submitter is created lazily on first submit. A null endpoint fails closed as INVALID_ENDPOINT.
  let client = null;
  const getClient = () => {
    if (client) return client;
    const resolved = typeof endpoint === 'function' ? endpoint() : endpoint;
    client = createOrderSubmitter({
      endpoint: resolved, tenantId: 'LFMA', sourceUrl, pageVersion: LFMA_VERSION, requirePhone: false, fetchImpl
    });
    return client;
  };
  const handler = async event => {
    event.preventDefault();
    if ((client && client.getState().status !== 'IDLE') || !form.reportValidity()) return;
    button.disabled = true; button.textContent = 'Sending...'; errorBox.hidden = true;
    try {
      const raw = mapLfmaBrief(new FormData(form)), receipt = await getClient().submit(raw);
      try { dataLayer?.push(acknowledgementEvent(receipt, {
        tenantId: 'LFMA', domain: 'lawfirmmarketingapes.com', product: 'campaign_sprint_scope'
      })); } catch { /* A blocked analytics tag must not erase an acknowledged submission. */ }
      const heading = doc.createElement('h2'); heading.textContent = 'Brief receipt confirmed.';
      const message = doc.createElement('p');
      message.textContent = 'The intake workflow acknowledged your brief. Payment is not verified here, and no campaign has been activated.';
      const reference = doc.createElement('p'); reference.textContent = `Submission reference: ${receipt.referenceId}`;
      sent.replaceChildren(heading, message, reference);
      form.hidden = true; sent.hidden = false;
      sent.setAttribute('tabindex', '-1'); sent.focus();
    } catch (error) {
      const state = client ? client.getState() : { status: 'IDLE' };
      if (state.status === 'IDLE') {
        errorBox.textContent = error instanceof IntakeError ? error.message : 'Please check the form.';
        button.disabled = false; button.textContent = original;
      } else {
        errorBox.textContent = `Receipt could not be confirmed. The brief may already have arrived. Do not submit or pay again based on this message. Contact kyleg@marketingapes.com and quote ${state.referenceId}.`;
        button.disabled = true; button.textContent = 'Receipt needs checking';
      }
      errorBox.hidden = false;
    }
  };
  form.addEventListener('submit', handler); button.disabled = false;
  return Object.freeze({ getState: client.getState, destroy: () => form.removeEventListener('submit', handler) });
}
