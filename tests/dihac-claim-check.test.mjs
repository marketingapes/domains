import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES, TRANSITIONS, TERMINAL, canTransition, advance, ClaimCheckError,
  CATEGORIES, categorise, questionsFor, nextQuestion, ROUTING_RULES, DESTINATIONS, CATEGORY_PATHS, destinationFor, route, structure
} from '../dihac/assets/claim-check.mjs';

const NOW = '2026-09-21T19:00:00.000Z';

/* ---------------------------------------------------------------- states */

test('the intake walks DRAFT -> ANSWERING -> REVIEW -> a terminal state', () => {
  let s = advance('DRAFT', 'ANSWERING');
  s = advance(s, 'ANSWERING');
  s = advance(s, 'REVIEW');
  assert.equal(advance(s, 'ACKNOWLEDGED'), 'ACKNOWLEDGED');
  assert.equal(advance(s, 'NEEDS_REVIEW'), 'NEEDS_REVIEW');
});

test('a terminal state is terminal', () => {
  for (const t of TERMINAL) {
    assert.deepEqual(TRANSITIONS[t], [], `${t} must have no outgoing transitions`);
    for (const to of STATES) assert.equal(canTransition(t, to), false, `${t} -> ${to} must be refused`);
  }
});

test('REVIEW is the only route to a terminal state', () => {
  for (const t of TERMINAL) {
    assert.deepEqual(STATES.filter(s => TRANSITIONS[s].includes(t)), ['REVIEW'], `only REVIEW may reach ${t}`);
  }
});

test('a draft cannot skip straight to acknowledged', () => {
  assert.throws(() => advance('DRAFT', 'ACKNOWLEDGED'),
    e => e instanceof ClaimCheckError && e.code === 'ILLEGAL_TRANSITION');
});

/* ------------------------------------------------------------ categories */

test('everyday descriptions land in the right bucket', () => {
  const cases = [
    ['I got rear-ended at a light', 'vehicle'],
    ['a truck t-boned me', 'vehicle'],
    ['complications after my surgery', 'medical'],
    ['I took a prescription and had a reaction', 'medical'],
    ['exposure to a chemical at a plant', 'product'],
    ['I was fired after raising a safety issue', 'workplace'],
    ['I slipped on a wet floor in a store', 'property'],
    ['they overcharged me and refused a refund', 'consumer'],
    ['my landlord is trying to evict me', 'housing'],
    ['there is mold in my rental', 'housing'],
    ['my neighbour keeps playing loud music', 'other']
  ];
  for (const [text, want] of cases) assert.equal(categorise(text), want, JSON.stringify(text));
});

test('categorise never throws on junk and always returns a known id', () => {
  for (const junk of ['', '   ', null, undefined, 12345, {}, []]) {
    const id = categorise(junk);
    assert.ok(CATEGORIES.some(c => c.id === id), `${JSON.stringify(junk)} -> ${id}`);
  }
});

/* ------------------------------------------------------------- questions */

test('every category asks for a timeframe and a location', () => {
  for (const c of CATEGORIES) {
    const keys = questionsFor(c.id).map(q => q.k);
    assert.ok(keys.includes('when'), `${c.id} must ask when`);
    assert.ok(keys.includes('state'), `${c.id} must ask where`);
    assert.ok(keys.includes('lawyer'), `${c.id} must ask about existing counsel`);
  }
});

test('questions are adaptive: answering one advances to the next required question', () => {
  const answers = {};
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    const q = nextQuestion('vehicle', answers);
    if (!q) break;
    assert.ok(!seen.has(q.k), `${q.k} must not be asked twice`);
    seen.add(q.k);
    answers[q.k] = 'something';
  }
  assert.equal(nextQuestion('vehicle', answers), null, 'the run must terminate');
  assert.ok(seen.has('report'), 'vehicle should ask a vehicle-specific follow-up');
});

/* --------------------------------------------------------------- routing */

test('someone who already has a lawyer is never routed onward', () => {
  const r = route({ when: 'March', state: 'AZ', lawyer: 'Yes, I have a lawyer' });
  assert.equal(r.state, 'NEEDS_REVIEW');
  assert.equal(r.ruleId, 'already-represented');
});

test('a missing location or timeframe holds for review rather than guessing', () => {
  assert.equal(route({ when: 'March', lawyer: 'No' }).ruleId, 'no-location');
  assert.equal(route({ state: 'AZ', lawyer: 'No' }).ruleId, 'no-timeframe');
});

test('a complete answer set is acknowledged', () => {
  const r = route({ when: 'March 2026', state: 'Arizona', lawyer: 'No' }, 'vehicle');
  assert.equal(r.state, 'ACKNOWLEDGED');
  assert.equal(r.ruleId, 'complete');
  assert.equal(r.destination.id, 'NIL');
});

test('vehicle matters choose NIL and other classified matters choose BTL', () => {
  assert.equal(destinationFor('vehicle'), DESTINATIONS.NIL);
  for (const c of CATEGORIES.filter(c => c.id !== 'vehicle' && c.id !== 'other')) {
    assert.equal(destinationFor(c.id), DESTINATIONS.BTL, c.id);
  }
});

test('every category declares a path, and only the unclassified one declares none', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.id in CATEGORY_PATHS, `${c.id} has no declared path`);
    const id = CATEGORY_PATHS[c.id];
    if (id !== null) assert.ok(DESTINATIONS[id], `${c.id} points at an undeclared destination`);
  }
  assert.equal(CATEGORY_PATHS.other, null);
});

test('a matter the categoriser could not classify is never guessed into a firm', () => {
  const answered = { when: 'March 2026', state: 'Arizona', lawyer: 'No' };
  const r = route(answered, 'other');
  assert.equal(r.state, 'NEEDS_REVIEW');
  assert.equal(r.ruleId, 'no-declared-path');
  assert.equal(r.destination, null);

  // and end to end, through the categoriser's own fallback
  const s = structure({
    description: 'my neighbour keeps parking across my driveway and the HOA will not act',
    answers: answered, nowIso: NOW
  });
  assert.equal(s.category, 'other');
  assert.equal(s.state, 'NEEDS_REVIEW');
  assert.equal(s.destination, null);
});

test('an unknown category id holds rather than defaulting to a firm', () => {
  assert.equal(destinationFor('completely-unknown-id'), null);
  const r = route({ when: 'March 2026', state: 'Arizona', lawyer: 'No' }, 'completely-unknown-id');
  assert.equal(r.state, 'NEEDS_REVIEW');
  assert.equal(r.destination, null);
});

test('held matters never get a destination', () => {
  const r = route({ when: 'March', state: 'AZ', lawyer: 'Yes, I have a lawyer' }, 'vehicle');
  assert.equal(r.state, 'NEEDS_REVIEW');
  assert.equal(r.destination, null);
});

test('every routing rule resolves to a declared state', () => {
  for (const rule of ROUTING_RULES) assert.ok(STATES.includes(rule.state), `${rule.id} -> ${rule.state}`);
});

/* ------------------------------------------------------------- structure */

test('structure refuses an empty description or a missing clock', () => {
  assert.throws(() => structure({ description: '   ', nowIso: NOW }),
    e => e.code === 'MISSING_DESCRIPTION');
  assert.throws(() => structure({ description: 'something happened' }),
    e => e.code === 'INVALID_CLOCK');
});

test('structure is deterministic and always carries the disclaimer', () => {
  const args = { description: 'I got rear-ended', answers: { when: 'March', state: 'AZ', lawyer: 'No' }, nowIso: NOW };
  const a = structure(args), b = structure(args);
  assert.deepEqual(a, b);
  assert.equal(a.category, 'vehicle');
  assert.match(a.disclaimer, /not a law firm/i);
  assert.match(a.disclaimer, /only an attorney/i);
});

/* ============ the guarantee: nothing here ever asserts a claim ========== */

const FORBIDDEN = [
  [/\byou (do |probably |likely )?have a (claim|case|lawsuit)\b/i, 'asserts a claim exists'],
  [/\byou (may|might|could) have a (claim|case|lawsuit)\b/i,       'hints a claim exists'],
  [/\bentitled to\b/i,                                             'asserts entitlement'],
  [/\bguarantee[sd]?\b/i,                                          'promises a guarantee'],
  [/\bwe will (represent|win|get you)\b/i,                         'promises representation or outcome'],
  [/\byou should sue\b/i,                                          'gives legal advice'],
  [/\bstatute of limitations (is|has|expired)\b/i,                 'decides a limitation period'],
  [/\byour (claim|case) is (valid|strong|worth)\b/i,               'evaluates merits'],
  [/\btel:|\+1\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,             'exposes a phone number']
];

function everyStringFrom(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => everyStringFrom(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => everyStringFrom(v, out));
  return out;
}

test('NO OUTPUT ANYWHERE asserts a claim, promises representation, or gives advice', () => {
  const strings = [];
  // every question of every category
  for (const c of CATEGORIES) {
    strings.push(c.label);
    everyStringFrom(questionsFor(c.id), strings);
  }
  // every routing explanation
  everyStringFrom(ROUTING_RULES.map(r => ({ id: r.id, because: r.because })), strings);
  // a structured result from every category, in both terminal states
  for (const c of CATEGORIES) {
    for (const answers of [
      { when: 'March', state: 'AZ', lawyer: 'No' },
      { when: 'March', state: 'AZ', lawyer: 'Yes, I have a lawyer' },
      {}
    ]) {
      everyStringFrom(structure({ description: 'a description of ' + c.label, category: c.id, answers, nowIso: NOW }), strings);
    }
  }
  assert.ok(strings.length > 80, `expected broad coverage, scanned ${strings.length} strings`);
  for (const s of strings) {
    for (const [re, why] of FORBIDDEN) {
      assert.doesNotMatch(s, re, `${why} -> ${JSON.stringify(s)}`);
    }
  }
});

test('the engine source contains no Vapi reference and no phone number', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../dihac/assets/claim-check.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /vapi/i, 'the claim engine must not know about Vapi');
  assert.doesNotMatch(src, /tel:|\+1\d{10}/, 'the claim engine must not carry a phone number');
});
