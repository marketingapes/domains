import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root = new URL('../btl/glassman/ssdi/', import.meta.url);
const window = {};
vm.runInNewContext(readFileSync(new URL('criteria.js', root), 'utf8'), {window, Intl, Date});
const R = window.SSDI_RULES;
const FIT = {state:'MA', age:'48_64', stopped_work_5yr:'yes', doctor:'yes', benefits:'no', lawyer:'no'};
const fields = Object.keys(FIT);
const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');

test('empty, partial, invalid-shaped and inherited answers never qualify', () => {
  for (const value of [undefined, null, false, 1, 'answers', [], {}, {state:'MA'}, Object.create(FIT)]) {
    assert.equal(R.outcome(value), null);
    assert.ok(R.invalidAnswers(value).length);
    assert.equal(R.route(R.outcome(value)), 'hold');
    assert.doesNotMatch(R.resultText(R.outcome(value)), /may qualify/);
  }
  for (const field of fields) {
    const partial = {...FIT}; delete partial[field];
    assert.deepEqual(Array.from(R.invalidAnswers(partial)), [field]);
    assert.equal(R.outcome(partial), null, field);
  }
});

test('each required answer rejects values outside its exact enum', () => {
  for (const field of fields) {
    for (const value of ['', 'unexpected', undefined, null, false, 0, [], {}]) {
      const invalid = {...FIT, [field]:value};
      assert.deepEqual(Array.from(R.invalidAnswers(invalid)), [field], field);
      assert.equal(R.outcome(invalid), null, field);
    }
  }
  assert.equal(R.outcome({...FIT, state:'ma'}), null);
  assert.equal(R.outcome({...FIT, state:'ZZ'}), null);
  assert.equal(R.outcome({...FIT, age:'53_64'}), null, 'another buyer age enum is not Glassman criteria');
});

test('all 12,393 valid answer combinations retain the existing buyer decisions', () => {
  const rank = {QUALIFIED:0, FIRM_REVIEW:1, NOT_A_FIT:2};
  const names = ['QUALIFIED', 'FIRM_REVIEW', 'NOT_A_FIT'];
  const options = [
    ['age', [['under_48','NOT_A_FIT'], ['48_64','QUALIFIED'], ['65_plus','NOT_A_FIT']]],
    ['stopped_work_5yr', [['yes','QUALIFIED'], ['no','NOT_A_FIT'], ['not_sure','FIRM_REVIEW']]],
    ['doctor', [['yes','QUALIFIED'], ['no','NOT_A_FIT'], ['not_sure','FIRM_REVIEW']]],
    ['benefits', [['yes','NOT_A_FIT'], ['no','QUALIFIED'], ['not_sure','FIRM_REVIEW']]],
    ['lawyer', [['yes','NOT_A_FIT'], ['no','QUALIFIED'], ['not_sure','FIRM_REVIEW']]]
  ];
  let checked = 0;
  function visit(i, answers, severity) {
    if (i === options.length) {
      assert.deepEqual(Array.from(R.invalidAnswers(answers)), []);
      assert.equal(R.outcome(answers), names[severity]); checked++; return;
    }
    const [field, values] = options[i];
    for (const [value, outcome] of values) visit(i + 1, {...answers, [field]:value}, Math.max(severity, rank[outcome]));
  }
  for (const state of states) visit(0, {state}, ['ND','SD','AK','HI'].includes(state) ? 2 : 0);
  assert.equal(checked, 12393);
  assert.equal(R.version, 'glassman-ssdi-002-criteria-2026-11-10-v2');
  assert.equal(R.hours.label, 'Monday–Friday, 8:00 AM–7:30 PM Eastern');
});

test('existing answer metadata is allowed without becoming a screening answer', () => {
  const answers = {...FIT, web_outcome:'NOT_A_FIT', criteria_version:R.version,
    constructor:'unexpected metadata', ...JSON.parse('{"__proto__":"unexpected metadata"}')};
  assert.deepEqual(Array.from(R.invalidAnswers(answers)), []);
  assert.equal(R.outcome(answers), 'QUALIFIED', 'the decision is derived from the six answers');
});
