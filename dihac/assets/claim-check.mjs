/**
 * DoIHaveAClaim.ai — claim intake engine. Pure, deterministic, no I/O.
 *
 * What this does: takes a person's description of what happened, asks relevant
 * follow-ups, and structures the result so a human or a configured rule can
 * decide the next step.
 *
 * What this must never do, enforced by tests in tests/dihac-claim-check.test.mjs:
 *  - tell anyone they have, or may have, a legal claim
 *  - promise representation, an outcome, or a value
 *  - give legal advice of any kind
 *  - decide a statute of limitations
 *
 * CATEGORY is a descriptive routing label for what the person described. It is
 * not a legal characterisation and carries no opinion about the merits.
 *
 * DRAFT -> ANSWERING -> REVIEW -> ACKNOWLEDGED | NEEDS_REVIEW
 */
export const CLAIM_CHECK_VERSION = 'dihac-claim-check-v1';

export class ClaimCheckError extends Error {
  constructor(code, message) { super(message); this.name = 'ClaimCheckError'; this.code = code; }
}

export const STATES = Object.freeze(['DRAFT', 'ANSWERING', 'REVIEW', 'ACKNOWLEDGED', 'NEEDS_REVIEW']);
export const TRANSITIONS = Object.freeze({
  DRAFT:        Object.freeze(['ANSWERING']),
  ANSWERING:    Object.freeze(['ANSWERING', 'REVIEW']),
  REVIEW:       Object.freeze(['ANSWERING', 'ACKNOWLEDGED', 'NEEDS_REVIEW']),
  ACKNOWLEDGED: Object.freeze([]),
  NEEDS_REVIEW: Object.freeze([])
});
export const TERMINAL = Object.freeze(['ACKNOWLEDGED', 'NEEDS_REVIEW']);

export function canTransition(from, to) {
  return STATES.includes(from) && STATES.includes(to) && TRANSITIONS[from].includes(to);
}
export function advance(from, to) {
  if (!canTransition(from, to)) throw new ClaimCheckError('ILLEGAL_TRANSITION', `${from} cannot move to ${to}.`);
  return to;
}

/* ------------------------------------------------------------- categories */
/** Descriptive buckets only. Ordered: first match wins, 'other' is the floor. */
export const CATEGORIES = Object.freeze([
  { id: 'vehicle',   label: 'Vehicle incident',        match: /\b(car|truck|motorcycle|vehicle|crash|collision|rear[- ]?end\w*|t[- ]?bone\w*|hit by|driver|uber|lyft|rideshare)\b/i },
  { id: 'medical',   label: 'Medical or prescription', match: /\b(surgery|surgeon|hospital|doctor|nurse|misdiagnos\w*|prescription|medication|drug|implant|device|dose)\b/i },
  { id: 'product',   label: 'Product or substance',    match: /\b(product|recall|defect\w*|chemical|exposure|asbestos|talc|weed ?killer|formula|contaminat\w*)\b/i },
  { id: 'workplace', label: 'Workplace',               match: /\b(work|job|employer|boss|shift|fired|terminated|wage|overtime|osha|on the job|coworker)\b/i },
  { id: 'property',  label: 'Property or premises',    match: /\b(slip\w*|trip\w*|f[ea]ll\w*|store|sidewalk|stairs|premises|ceiling|floor)\b/i },
  { id: 'consumer',  label: 'Consumer or financial',   match: /\b(charg\w*|refund\w*|billing|contract|loan|debt|subscription|scam\w*|fraud\w*|overcharg\w*)\b/i },
  { id: 'housing',   label: 'Housing',                 match: /\b(evict\w*|rent\w*|lease|tenant|landlord|deposit|mold|habitab\w*)\b/i },
  { id: 'other',     label: 'Something else',          match: /.^/ }
]);

export function categorise(text) {
  const t = typeof text === 'string' ? text : '';
  return (CATEGORIES.find(c => c.match.test(t)) ?? CATEGORIES[CATEGORIES.length - 1]).id;
}

/* -------------------------------------------------------------- questions */
const BASE = Object.freeze([
  { k: 'when',      q: 'Roughly when did this happen?',                     ph: 'e.g. last March, about two years ago' },
  { k: 'state',     q: 'Which state were you in when it happened?',         ph: 'e.g. Arizona' },
  { k: 'others',    q: 'Was anyone else involved or affected?',             ph: 'People, companies, or no one else', optional: true },
  { k: 'lawyer',    q: 'Have you already spoken with a lawyer about this?', chips: ['No', 'Spoke to one, not hired', 'Yes, I have a lawyer'] },
  { k: 'documents', q: 'Do you have anything written down — photos, bills, reports, messages?', chips: ['Yes, some', 'Not yet'] }
]);

/** Category-specific follow-ups. Factual, never a legal test. */
const EXTRA = Object.freeze({
  vehicle:   [{ k: 'care',   q: 'Did you see a doctor after it happened?', chips: ['Yes', 'No', 'Not yet'] },
              { k: 'report', q: 'Was there a police report or insurance claim?', chips: ['Yes', 'No', 'Not sure'] }],
  medical:   [{ k: 'care',   q: 'Are you still under care for this?', chips: ['Yes', 'No'] },
              { k: 'name',   q: 'Do you know the name of the medication, device or procedure?', ph: 'If you know it', optional: true }],
  product:   [{ k: 'name',   q: 'What was the product or substance, if you know?', ph: 'Name or description', optional: true },
              { k: 'care',   q: 'Did you get medical care related to it?', chips: ['Yes', 'No', 'Not yet'] }],
  workplace: [{ k: 'still',  q: 'Are you still working there?', chips: ['Yes', 'No'] },
              { k: 'raised', q: 'Did you raise it with anyone at work?', chips: ['Yes', 'No'] }],
  property:  [{ k: 'care',   q: 'Did you see a doctor afterwards?', chips: ['Yes', 'No', 'Not yet'] },
              { k: 'told',   q: 'Did you report it to whoever runs the place?', chips: ['Yes', 'No'] }],
  consumer:  [{ k: 'amount', q: 'Roughly how much money is involved?', ph: 'A rough number is fine', optional: true },
              { k: 'told',   q: 'Have you contacted the company about it?', chips: ['Yes', 'No'] }],
  housing:   [{ k: 'still',  q: 'Are you still living there?', chips: ['Yes', 'No'] },
              { k: 'told',   q: 'Did you tell the landlord in writing?', chips: ['Yes', 'No'] }],
  other:     [{ k: 'hoped',  q: 'What would a good outcome look like for you?', ph: 'In your own words', optional: true }]
});

export function questionsFor(category) {
  const extra = Object.hasOwn(EXTRA, category) ? EXTRA[category] : EXTRA.other;
  return Object.freeze([...BASE.slice(0, 2), ...extra, ...BASE.slice(2)].map(Object.freeze));
}

export function nextQuestion(category, answers) {
  const a = answers ?? {};
  return questionsFor(category).find(q => !q.optional && !String(a[q.k] ?? '').trim())
      ?? questionsFor(category).find(q => !(q.k in a))
      ?? null;
}

/* ---------------------------------------------------------------- routing */
/**
 * Routing rules are OPERATIONAL, not legal. Each says where a submission goes
 * and why, in plain words. None of them decides whether a claim exists, and
 * none of them applies a limitation period.
 */
export const ROUTING_RULES = Object.freeze([
  { id: 'already-represented',
    when: a => /^yes/i.test(String(a.lawyer ?? '')),
    state: 'NEEDS_REVIEW',
    because: 'You told us you already have a lawyer, so we are not going to route this anywhere.' },
  { id: 'no-location',
    when: a => !String(a.state ?? '').trim(),
    state: 'NEEDS_REVIEW',
    because: 'We do not have a location yet, and where something happened changes who can help.' },
  { id: 'no-timeframe',
    when: a => !String(a.when ?? '').trim(),
    state: 'NEEDS_REVIEW',
    because: 'We do not have a timeframe yet. Timing matters, and a person should check it with an attorney.' }
]);

export function route(answers) {
  const a = answers ?? {};
  const hit = ROUTING_RULES.find(r => r.when(a));
  return hit
    ? Object.freeze({ state: hit.state, ruleId: hit.id, because: hit.because })
    : Object.freeze({ state: 'ACKNOWLEDGED', ruleId: 'complete',
        because: 'We have enough to pass this to a person for review.' });
}

/* -------------------------------------------------------------- structure */
export function structure({ description, category, answers, nowIso, referenceId }) {
  if (typeof description !== 'string' || !description.trim()) {
    throw new ClaimCheckError('MISSING_DESCRIPTION', 'Tell us what happened first.');
  }
  if (typeof nowIso !== 'string' || !nowIso) throw new ClaimCheckError('INVALID_CLOCK', 'A timestamp must be supplied.');
  const cat = CATEGORIES.some(c => c.id === category) ? category : categorise(description);
  const a = answers ?? {};
  const decision = route(a);
  return Object.freeze({
    version: CLAIM_CHECK_VERSION,
    referenceId: referenceId ?? null,
    createdAt: nowIso,
    category: cat,
    categoryLabel: (CATEGORIES.find(c => c.id === cat) ?? {}).label ?? 'Something else',
    description: description.trim(),
    answers: Object.freeze({ ...a }),
    state: decision.state,
    routing: decision,
    // Said on every single output, in every state.
    disclaimer: 'DoIHaveAClaim.ai is not a law firm and does not give legal advice. '
              + 'Nothing here says whether you have a legal claim — only an attorney can tell you that.'
  });
}
