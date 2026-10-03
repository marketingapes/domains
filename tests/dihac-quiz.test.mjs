// DIHAC quiz + router guard. Runs the page's injected engine against the shared schema.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'dihac', 'quiz');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const schemaSrc = fs.readFileSync(path.join(DIR, 'schema.json'), 'utf8');
const engineSrc = fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8');
const schema = JSON.parse(schemaSrc);

function block(id) {
  const m = html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>\\n([\\s\\S]*?)\\n  </script>`));
  assert.ok(m, `script#${id} present`);
  return m[1];
}
const sandbox = { window: {}, URL, URLSearchParams, console };
vm.runInNewContext(block('quiz-engine'), sandbox);
const engine = sandbox.window.DIHAC_QUIZ_ENGINE.createEngine(schema);

test('index.html carries exactly schema.json and engine.js (build.mjs is current)', () => {
  assert.deepEqual(JSON.parse(block('quiz-schema')), schema, 'schema block == schema.json');
  assert.equal(block('quiz-engine'), engineSrc.replace(/\n$/, ''), 'engine block == engine.js');
});

test('engine.validate() is clean and every step is reachable from entry or a deep link', () => {
  assert.equal(engine.validate().length, 0, engine.validate().join("; "));
  const reach = new Set();
  const visit = id => { if (reach.has(id)) return; reach.add(id); for (const c of engine.step(id).choices) if (c.next) visit(c.next); };
  visit(schema.entry);
  const unreachable = schema.steps.map(s => s.id).filter(id => !reach.has(id));
  assert.deepEqual(unreachable, [], 'unreachable steps');
  assert.equal(engine.tracks().slice().sort().join(','), 'afff,camp-lejeune,hernia-mesh,injury,paraquat,roundup,talc');
});

test('paraquat happy path routes to the live BTL Paraquat page with tort=paraquat', () => {
  const out = engine.walk(['exposure', 'paraquat', 'applied', '1990s', 'daily', 'neurologist', 'after', 'no']);
  assert.equal(out.result, 'potentially_qualify');
  assert.equal(out.route, 'paraquat');
  assert.equal(out.status, 'live');
  assert.equal(out.tort, 'paraquat');
  const href = engine.destination('paraquat', { result: out.result, incoming: { lead_id: 'lead_test_1', gclid: 'g123', utm_source: 'meta' }, session_id: 'session_x' });
  const u = new URL(href);
  assert.equal(u.origin + u.pathname, 'https://besttortlawyers.com/paraquat/');
  assert.equal(u.searchParams.get('tort'), 'paraquat');
  assert.equal(u.searchParams.get('utm_source'), 'doihaveaclaim.ai', 'outbound utm_source is the sending domain, never the inbound one');
  assert.equal(u.searchParams.get('utm_medium'), 'quiz');
  assert.equal(u.searchParams.get('utm_campaign'), 'dihac-quiz');
  assert.equal(u.searchParams.get('utm_content'), 'potentially_qualify');
  assert.equal(u.searchParams.get('lead_id'), 'lead_test_1');
  assert.equal(u.searchParams.get('gclid'), 'g123');
  assert.equal(u.searchParams.get('quiz_id'), schema.quiz_id);
  assert.equal(u.searchParams.get('quiz_version'), schema.version);
  assert.equal(u.searchParams.get('session_id'), 'session_x');
  assert.equal(engine.describe(out.path).length, 8);
  assert.equal(engine.describe(out.path)[2].label, 'Yes — I sprayed, mixed, or loaded it');
});

test('paraquat "it was really Roundup" jumps tracks instead of stopping', () => {
  const out = engine.walk(['exposure', 'paraquat', 'was_roundup', 'repeated', 'home', '2000s', 'weekly', 'nhl', 'after', 'no']);
  assert.equal(out.track, 'roundup');
  assert.equal(out.route, 'roundup_review');
});

test('injury track routes to NIL with tort=injury', () => {
  for (const when of ['under_2y', 'over_2y', 'not_sure']) {
    const out = engine.walk(['injury', when]);
    assert.equal(out.result, 'injury');
    assert.equal(out.route, 'injury');
    const u = new URL(engine.destination('injury', { result: out.result }));
    assert.equal(u.origin + u.pathname, 'https://nearestinjurylawyers.com/');
    assert.equal(u.searchParams.get('tort'), 'injury');
    assert.equal(u.searchParams.get('utm_source'), 'doihaveaclaim.ai');
  }
});

const HAPPY = {
  roundup:        { answers: ['exposure', 'roundup', 'job', 'farm', 'several', 'weekly', 'nhl', 'after', 'not_sure'], route: 'roundup_review' },
  afff:           { answers: ['exposure', 'afff', 'firefighter', '1980s_1990s', 'listed', 'after', 'no'], route: 'afff_review' },
  'afff (water, other cancer still reviewed)': { answers: ['exposure', 'afff', 'water', 'several', 'other_cancer', 'not_sure', 'no'], route: 'afff_review' },
  'camp-lejeune': { answers: ['exposure', 'camp_lejeune', 'yes', 'listed', 'yes', 'open'], route: 'camp_lejeune_review' },
  'hernia-mesh':  { answers: ['exposure', 'hernia_mesh', 'yes', 'records', 'revision', '2010s', 'no'], route: 'hernia_mesh_review' },
  'talc (ovarian)': { answers: ['exposure', 'talc', 'years', 'genital', 'talc', 'over_15', 'ovarian', 'after', 'no'], route: 'talc_review' },
  'talc (meso, no asbestos job)': { answers: ['exposure', 'talc', 'years', 'breathed', 'not_sure', '5_15', 'meso', 'no', 'after', 'not_sure'], route: 'talc_review' },
};
test('every needs_buyer tort reaches Sofia on DIHAC with tort + intent=claim, never a firm domain', () => {
  for (const [name, { answers, route }] of Object.entries(HAPPY)) {
    const out = engine.walk(answers);
    assert.equal(out.result, 'potentially_qualify_sofia', name);
    assert.equal(out.route, route, name);
    assert.equal(out.status, 'needs_buyer', name);
    const u = new URL(engine.destination(out.route, { result: out.result, origin: 'https://doihaveaclaim.ai' }));
    assert.equal(u.hostname, 'doihaveaclaim.ai', name);
    assert.equal(u.pathname, '/talk-to-sofia.html', name);
    assert.equal(u.searchParams.get('from'), schema.quiz_id, name);
    assert.equal(u.searchParams.get('tort'), schema.routes[route].tort, name);
    assert.equal(u.searchParams.get('intent'), 'claim', 'Sofia only knows car_accident|claim|slip|truck; unknown intents fall back to car-accident copy');
    assert.equal(u.searchParams.get('utm_source'), null, 'same-domain link carries no utm_source');
    assert.equal(u.searchParams.get('utm_campaign'), 'dihac-quiz', name);
  }
});

test('Camp Lejeune: nothing filed by 2024-08-10 is CLOSED, never "may still file"', () => {
  const out = engine.walk(['exposure', 'camp_lejeune', 'yes', 'listed', 'no']);
  assert.equal(out.result, 'closed');
  assert.equal(out.stop_reason, 'clja_not_filed');
  assert.equal(out.route, 'sofia');
  assert.doesNotMatch(schema.outcomes.closed.body, /may still file|potentially qualify/i);
});

test('every documented stop reason is reachable and stops on DIHAC (Sofia)', () => {
  const stops = {
    no_occupational_exposure: ['exposure', 'paraquat', 'no'],
    no_parkinsons_diagnosis: ['exposure', 'paraquat', 'applied', '2000s', 'weekly', 'symptoms'],
    diagnosis_before_exposure: ['exposure', 'paraquat', 'applied', '2000s', 'weekly', 'doctor', 'before'],
    already_settled: ['exposure', 'paraquat', 'applied', '2000s', 'weekly', 'doctor', 'after', 'yes'],
    afff_no_exposure: ['exposure', 'afff', 'brief'],
    afff_property_only: ['exposure', 'afff', 'property'],
    afff_no_listed_diagnosis: ['exposure', 'afff', 'firefighter', 'before_1980', 'no'],
    clja_under_30_days: ['exposure', 'camp_lejeune', 'under_30'],
    clja_outside_window: ['exposure', 'camp_lejeune', 'outside'],
    clja_no_listed_diagnosis: ['exposure', 'camp_lejeune', 'yes', 'no'],
    clja_not_filed: ['exposure', 'camp_lejeune', 'yes', 'other', 'no'],
    clja_released: ['exposure', 'camp_lejeune', 'yes', 'listed', 'not_sure', 'settled'],
    rd_single_use: ['exposure', 'roundup', 'once'],
    rd_no_nhl: ['exposure', 'roundup', 'repeated', 'home', '1990s', 'monthly', 'hodgkin'],
    rd_prior_settlement: ['exposure', 'roundup', 'repeated', 'home', '1990s', 'monthly', 'nhl', 'after', 'yes'],
    hm_no_mesh: ['exposure', 'hernia_mesh', 'stitches'],
    hm_no_complication: ['exposure', 'hernia_mesh', 'yes', 'neither', 'pain_only'],
    hm_released: ['exposure', 'hernia_mesh', 'not_sure', 'brand', 'finding', 'not_sure', 'yes'],
    talc_brief_use: ['exposure', 'talc', 'brief'],
    talc_cornstarch_only: ['exposure', 'talc', 'years', 'body', 'cornstarch'],
    talc_no_diagnosis: ['exposure', 'talc', 'years', 'genital', 'talc', 'under_5', 'no'],
    talc_asbestos_job: ['exposure', 'talc', 'years', 'breathed', 'talc', 'over_15', 'meso', 'yes'],
    talc_released: ['exposure', 'talc', 'years', 'genital', 'talc', 'over_15', 'ovarian', 'not_sure', 'yes'],
  };
  for (const [reason, answers] of Object.entries(stops)) {
    const out = engine.walk(answers);
    assert.ok(['no_match', 'closed'].includes(out.result), `${reason}: ${out.result}`);
    assert.equal(out.stop_reason, reason);
    assert.equal(out.route, 'sofia');
  }
  assert.deepEqual(Object.keys(stops).sort(), Object.keys(schema.stop_reasons).sort(), 'all stop reasons exercised');
});

test('"something else", unknown product and unknown base go to Sofia as unsure', () => {
  assert.equal(engine.walk(['other']).result, 'unsure');
  assert.equal(engine.walk(['exposure', 'other_product']).result, 'unsure');
  assert.equal(engine.walk(['exposure', 'camp_lejeune', 'not_sure']).result, 'unsure');
});

test('?tort=<track> deep links start on the first step of that track', () => {
  for (const t of engine.tracks()) assert.equal(engine.step(engine.start(t)).track, t, t);
  assert.equal(engine.start('nope'), schema.entry);
  assert.equal(engine.start(''), schema.entry);
  assert.equal(engine.walk(['applied', '2010_later', 'rarely', 'neurologist', 'after', 'no'], 'paraquat').route, 'paraquat');
});

test('the page keeps the DIHAC head/footer contract and no secrets', () => {
  assert.match(html, /GTM-WJCZF46W/, 'DIHAC GTM web container');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/, 'noindex while preview');
  assert.match(html, /PREVIEW · NOT LIVE/);
  assert.match(html, /BUILT—NOT LIVE/);
  assert.match(html, /class="cta" id="result-cta" data-cta-id=/);
  assert.doesNotMatch(html, /hook\.[a-z0-9.]*make\.com|hooks\.zapier\.com|api_key|Bearer /i, 'no hook URLs or secrets');
  const externalScripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(externalScripts, [], 'single file: no external scripts (GTM loads itself)');
  assert.doesNotMatch(html, /<(input|form|textarea)\b/, 'no lead capture on DIHAC quiz');
  assert.match(html, /potentially qualify/, 'library language: potentially qualify');
  assert.doesNotMatch(html, /you (do )?qualify for|you have a (valid )?case|guaranteed (payment|compensation|result)|we will win/i, 'no affirmative claim language');
  assert.doesNotMatch(JSON.stringify(schema), /\$[0-9]/, 'no dollar figures in quiz copy');
  for (const s of schema.steps) for (const c of s.choices) assert.ok(c.label.length <= 140, `${s.id}/${c.id} label ≤ 140 chars`);
});

test('shared markdown mirror matches schema.json (skipped when the workspace file is absent)', t => {
  const md = process.env.QUIZ_SCHEMA_MD || path.join(os.homedir(), 'workspace/legal-lane/dihac-network/quiz-schema.md');
  if (!fs.existsSync(md)) return t.skip('mirror not on this machine');
  const m = fs.readFileSync(md, 'utf8').match(/```json\n([\s\S]*?)\n```/);
  assert.ok(m, 'mirror has a json block');
  assert.deepEqual(JSON.parse(m[1]), schema, 'run: node dihac/quiz/build.mjs --mirror');
});
