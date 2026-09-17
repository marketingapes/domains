/** Adapter for /play/ — the self-serve first play. Reuses the EXISTING order lane.
 *  No new webhook, no payment here, no campaign activation. Selfie never leaves the browser. */
import { IntakeError, createOrderSubmitter, acknowledgementEvent } from './order-intake-client.mjs';
export const PLAY_VERSION = 'lfma-play-v1';

export const PLAYS = Object.freeze({
  mva: {
    name: 'Car accident', pill: ['Free case review', 'No fee unless we win', 'Talk to a real person today'],
    headline: 'Hurt in a crash?', sub: 'Tell us what happened. We handle the rest.',
    prequal: ['When did the accident happen?', 'Were you injured or treated by a doctor?', 'Was it your fault?', 'Have you already hired a lawyer?']
  },
  tort: {
    name: 'Mass tort', pill: ['Free eligibility check', 'No cost to ask', 'Confidential'],
    headline: 'Were you exposed?', sub: 'Find out in two minutes if you qualify.',
    prequal: ['Which product or exposure?', 'When were you exposed or diagnosed?', 'Have you been diagnosed by a doctor?', 'Have you already hired a lawyer?']
  },
  pi: {
    name: 'Personal injury', pill: ['Free consultation', 'No fee unless we win', 'We call you back in minutes'],
    headline: 'Injured? You have options.', sub: 'One conversation. Real answers.',
    prequal: ['What happened?', 'When did it happen?', 'Were you treated by a doctor?', 'Have you already hired a lawyer?']
  }
});

function one(fd, key) {
  const v = fd.getAll(key);
  if (v.length > 1 || v.some(x => typeof x !== 'string')) throw new IntakeError('INVALID_FIELD', `Invalid ${key}.`);
  return (v[0] || '').trim();
}

/** Deterministic plan text. No model call — the plan is the product spec, stated plainly. */
export function buildPlan({ firm, state, play, phone }) {
  const p = PLAYS[play];
  return [
    `1. THE AD — Your face, your firm, "${p.headline}" Three promises: ${p.pill.join(' · ')}. Runs on Meta and Google in ${state}.`,
    `2. THE PAGE — One screen, your photo, one button. Built on our system, under your firm's name. Live within 48 hours of payment.`,
    `3. THE PREQUALIFIER — Four questions before anyone on your side is interrupted: ${p.prequal.map((q, i) => `(${i + 1}) ${q}`).join(' ')}`,
    `4. SOFIA — When a qualified person calls or writes, our AI intake answers in seconds, confirms the four answers, and ${phone ? `warm-transfers to ${phone}` : 'books a callback with your team'}. Your firm makes every legal decision.`,
    `5. THE FOLLOW-UP — Missed, hung up, or not ready: Sofia follows up by text and call on a schedule you approve. Nobody is forgotten.`,
    `6. THE LEDGER — Every click, call, conversation and outcome in one report, per ad. You will know which dollar produced which conversation.`,
    `7. THE NEXT PLAY — Day 30: what worked, what failed, what it cost, and the next iteration — built from your numbers, not ours.`
  ];
}

export function mapPlay(fd) {
  const v = Object.fromEntries(['firm', 'name', 'email', 'phone', 'state', 'play', 'website'].map(k => [k, one(fd, k)]));
  for (const k of ['firm', 'name', 'email', 'state', 'play']) if (!v[k]) throw new IntakeError('MISSING_FIELD', `Please complete ${k}.`);
  if (!Object.hasOwn(PLAYS, v.play)) throw new IntakeError('INVALID_FIELD', 'Choose a play.');
  const plan = buildPlan({ firm: v.firm, state: v.state, play: v.play, phone: v.phone });
  return {
    type: 'Law firm', product: 'The Play - Founding 10 (30 days)',
    buyer_name: v.firm, contact_name: v.name, email: v.email, phone: v.phone,
    case_types: PLAYS[v.play].name, states: v.state, turn_downs: '', transfer_number: v.phone,
    intake_hours: '', delivery: 'AI prequalify then warm transfer',
    price_usd: '7500', media_budget_usd: '5000', media_daily_budget_usd: '166.67', daily_cap: '',
    notes: [
      'FOUNDING 10 reservation from /play/. Not an accepted order until QBO payment is received.',
      '$7,500 = $5,000 media at cost (30 days, ~$166.67/day) + $2,500 Marketing Apes. Media billed separately, no markup.',
      `Website: ${v.website || 'none supplied'}`,
      'Selfie: shown to the client in-browser only; NOT uploaded. Request the photo at build.',
      'Texas: no ads until bar filing is complete.',
      'PLAN SHOWN TO CLIENT:', ...plan
    ].join('\n')
  };
}

export function bindPlay({ form, sent, endpoint, sourceUrl, payLink = '', dataLayer = globalThis.dataLayer, fetchImpl = globalThis.fetch }) {
  const button = form.querySelector('button[type="submit"]');
  const doc = form.ownerDocument, original = button.textContent;
  const errorBox = doc.createElement('p'); errorBox.className = 'err'; errorBox.setAttribute('role', 'status'); errorBox.setAttribute('aria-live', 'polite'); errorBox.hidden = true;
  form.append(errorBox);
  const client = createOrderSubmitter({ endpoint, tenantId: 'LFMA', sourceUrl, pageVersion: PLAY_VERSION, requirePhone: false, fetchImpl });
  const handler = async event => {
    event.preventDefault();
    if (client.getState().status !== 'IDLE' || !form.reportValidity()) return;
    button.disabled = true; button.textContent = 'Reserving…'; errorBox.hidden = true;
    try {
      const raw = mapPlay(new FormData(form)), receipt = await client.submit(raw);
      try { dataLayer?.push(acknowledgementEvent(receipt, { tenantId: 'LFMA', domain: 'lawfirmmarketingapes.com', product: 'the_play_founding_10' })); } catch { /* analytics is best effort */ }
      const h = doc.createElement('h2'); h.textContent = 'Your play is reserved.';
      const m = doc.createElement('p'); m.textContent = payLink
        ? 'Pay the $7,500 activation to start the 48-hour build. Nothing runs until payment clears.'
        : 'Kyle sends your pay link within the hour. Nothing runs until payment clears.';
      const r = doc.createElement('p'); r.className = 'ref'; r.textContent = `Reference: ${receipt.referenceId}`;
      sent.replaceChildren(h, m, r);
      if (payLink) { const a = doc.createElement('a'); a.className = 'cta'; a.href = payLink; a.textContent = 'Pay $7,500 — start the build'; a.rel = 'noopener'; sent.append(a); }
      form.hidden = true; sent.hidden = false; sent.setAttribute('tabindex', '-1'); sent.focus();
    } catch (error) {
      const s = client.getState();
      if (s.status === 'IDLE') { errorBox.textContent = error instanceof IntakeError ? error.message : 'Please check the form.'; button.disabled = false; button.textContent = original; }
      else { errorBox.textContent = `Receipt could not be confirmed. Do not submit again. Email kyleg@marketingapes.com and quote ${s.referenceId}.`; button.textContent = 'Receipt needs checking'; }
      errorBox.hidden = false;
    }
  };
  form.addEventListener('submit', handler); button.disabled = false;
  return Object.freeze({ getState: client.getState });
}
