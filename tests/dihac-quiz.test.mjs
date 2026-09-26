// DIHAC quiz + router guard. Runs the page's own inline engine block in node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGE = path.join(ROOT, 'dihac', 'quiz', 'index.html');
const html = fs.readFileSync(PAGE, 'utf8');

function block(id) {
  const m = html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)</script>`));
  assert.ok(m, `script#${id} present`);
  return m[1];
}
const schema = JSON.parse(block('quiz-schema'));
const sandbox = { window: {}, URL, URLSearchParams, console };
vm.runInNewContext(block('quiz-engine'), sandbox);
const engine = sandbox.window.DIHAC_QUIZ_ENGINE.createEngine(schema);

test('schema is well formed: every next/route/result resolves', () => {
  const ids = new Set(schema.steps.map(s => s.id));
  assert.ok(ids.has(schema.entry));
  for (const s of schema.steps) {
    assert.ok(s.choices.length >= 2, `${s.id} has choices`);
    for (const c of s.choices) {
      const terminal = Boolean(c.result);
      assert.notEqual(terminal, Boolean(c.next), `${s.id}/${c.id} is either next or result`);
      if (c.next) assert.ok(ids.has(c.next), `${s.id}/${c.id} next ${c.next}`);
      if (c.result) {
        assert.ok(schema.outcomes[c.result], `${s.id}/${c.id} outcome ${c.result}`);
        assert.ok(schema.routes[c.route], `${s.id}/${c.id} route ${c.route}`);
        if (c.stop_reason) assert.ok(schema.stop_reasons[c.stop_reason], `${s.id}/${c.id} stop_reason`);
      }
    }
  }
  // DAG: remaining() terminates for every step
  for (const s of schema.steps) assert.ok(Number.isInteger(engine.remaining(s.id)));
});

test('paraquat happy path routes to the live BTL Paraquat page with tort=paraquat', () => {
  const out = engine.walk(['exposure', 'paraquat', 'applied', '1990s', 'daily', 'neurologist', 'after', 'no']);
  assert.equal(out.result, 'potentially_qualify');
  assert.equal(out.route, 'paraquat');
  assert.equal(out.track, 'paraquat');
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
  assert.equal(u.searchParams.get('session_id'), 'session_x');
});

test('nearby exposure + non-neurologist diagnosis + not-sure answers still reach BTL', () => {
  const out = engine.walk(['exposure', 'paraquat', 'nearby', 'several', 'seasonal', 'doctor', 'not_sure', 'not_sure']);
  assert.equal(out.result, 'potentially_qualify');
  assert.equal(out.route, 'paraquat');
});

test('injury track routes to NIL with tort=injury', () => {
  for (const when of ['under_2y', 'over_2y', 'not_sure']) {
    const out = engine.walk(['injury', when]);
    assert.equal(out.result, 'injury');
    assert.equal(out.route, 'injury');
    assert.equal(out.track, 'injury');
    const u = new URL(engine.destination('injury', { result: out.result }));
    assert.equal(u.origin + u.pathname, 'https://nearestinjurylawyers.com/');
    assert.equal(u.searchParams.get('tort'), 'injury');
    assert.equal(u.searchParams.get('utm_source'), 'doihaveaclaim.ai');
  }
});

test('every documented stop reason stops on DIHAC (Sofia), never on a firm domain', () => {
  const stops = {
    home_weed_killer: ['exposure', 'roundup'],
    no_occupational_exposure: ['exposure', 'paraquat', 'no'],
    no_parkinsons_diagnosis: ['exposure', 'paraquat', 'applied', '2000s', 'weekly', 'symptoms'],
    diagnosis_before_exposure: ['exposure', 'paraquat', 'applied', '2000s', 'weekly', 'doctor', 'before'],
    already_settled: ['exposure', 'paraquat', 'applied', '2000s', 'weekly', 'doctor', 'after', 'yes'],
  };
  for (const [reason, answers] of Object.entries(stops)) {
    const out = engine.walk(answers);
    assert.equal(out.result, 'no_match', reason);
    assert.equal(out.stop_reason, reason);
    assert.equal(out.route, 'sofia');
    const u = new URL(engine.destination('sofia', { result: out.result, origin: 'https://doihaveaclaim.ai' }));
    assert.equal(u.hostname, 'doihaveaclaim.ai');
    assert.equal(u.pathname, '/talk-to-sofia.html');
    assert.equal(u.searchParams.get('from'), schema.quiz_id);
    assert.equal(u.searchParams.get('utm_source'), null, 'same-domain link carries no utm');
  }
  assert.deepEqual(Object.keys(stops).sort(), Object.keys(schema.stop_reasons).sort(), 'all stop reasons exercised');
});

test('"something else" and unknown product go to Sofia as unsure', () => {
  assert.equal(engine.walk(['other']).result, 'unsure');
  assert.equal(engine.walk(['exposure', 'other_product']).result, 'unsure');
});

test('?tort=paraquat deep link starts on the first paraquat step', () => {
  assert.equal(engine.start('paraquat'), 'pq_exposure');
  assert.equal(engine.start('injury'), 'injury_when');
  assert.equal(engine.start('nope'), schema.entry);
  assert.equal(engine.start(''), schema.entry);
  const out = engine.walk(['applied', '2010_later', 'rarely', 'neurologist', 'after', 'no'], 'paraquat');
  assert.equal(out.route, 'paraquat');
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
});
