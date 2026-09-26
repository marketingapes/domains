// DIHAC quiz engine: config-driven scoring, one signal, enforced language rules.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto as crypto} from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const quizJson = tort => JSON.parse(read(`dihac/campaigns/${tort}/quiz.json`));

function boot({search = '', fetchImpl} = {}) {
  const events = [];
  const win = {
    dataLayer: events,
    location: {search, href: 'https://doihaveaclaim.ai/quiz/' + search, origin: 'https://doihaveaclaim.ai', pathname: '/quiz/', hostname: 'doihaveaclaim.ai'},
    sessionStorage: {getItem: () => null, setItem() {}},
    crypto, URL, URLSearchParams, fetch: fetchImpl,
    console: {warn() {}},
    document: {
      body: {dataset: {pageType: 'quiz'}},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {}
    }
  };
  win.window = win;
  const context = vm.createContext(win);
  vm.runInContext(read('dihac/config.js'), context);
  vm.runInContext(read('dihac/app.js'), context);
  return {win, events, quiz: win.DIHAC_QUIZ, config: win.DIHAC_CONFIG};
}

const AFFF_STRONG = {exposure: 'firefighter_civilian', exposure_years: 'over_five', diagnosis: ['kidney_cancer'], diagnosis_year: 'within_2', represented: 'no'};
const PARAQUAT_STRONG = {exposure: 'applicator', exposure_years: 'over_five', diagnosis: 'parkinsons', diagnosis_timing: 'after', represented: 'no'};

test('engine loads without a quiz mount and keeps the tracking API intact', () => {
  const {win, events} = boot();
  assert.equal(typeof win.DIHAC_QUIZ.score, 'function');
  assert.equal(typeof win.DIHAC_TRACKING.formSubmitted, 'function');
  assert.equal(events[0].event, 'ee_page_view');
  assert.equal(events[0].page_type, 'quiz');
});

test('config lists only torts that have a committed, valid, lint-clean quiz definition', () => {
  const {quiz, config} = boot();
  assert.deepEqual([...config.quiz.torts], ['afff', 'paraquat']);
  for (const tort of config.quiz.torts) {
    const definition = quizJson(tort);
    assert.equal(definition.tort, tort);
    assert.equal(quiz.validate(definition).length, 0, `${tort}: ${quiz.validate(definition).join('; ')}`);
    assert.equal(quiz.lint(definition).length, 0, `${tort}: ${quiz.lint(definition).join('; ')}`);
    for (const signal of quiz.signals) assert.ok(quiz.nextSteps.includes(definition.results[signal].nextStep), `${tort}.${signal}`);
  }
  for (const step of quiz.nextSteps) assert.ok(config.quiz.nextSteps[step].href, step);
  assert.match(config.quiz.disclaimer, /not a law firm/);
  assert.match(config.quiz.disclaimer, /does not provide legal advice/);
});

test('resolveTort only returns allow-listed slugs; anything else is null', () => {
  const {quiz, config} = boot();
  assert.equal(quiz.resolveTort('afff'), 'afff');
  assert.equal(quiz.resolveTort('PARAQUAT'), 'paraquat');
  assert.equal(quiz.resolveTort('../secrets'), null);
  assert.equal(quiz.resolveTort('talc'), null);
  assert.equal(quiz.resolveTort(''), null);
  assert.equal(quiz.resolveTort(config.quiz.defaultTort), 'afff');
});

test('AFFF scoring produces one of three signals from the quiz rules', () => {
  const {quiz} = boot();
  const afff = quizJson('afff');
  const cases = [
    [AFFF_STRONG, 'strong'],
    [{...AFFF_STRONG, exposure: 'firefighter_military', diagnosis: ['testicular_cancer', 'thyroid_disease']}, 'strong'],
    [{...AFFF_STRONG, diagnosis: ['thyroid_disease'], exposure_years: 'one_to_five'}, 'possible'],
    [{...AFFF_STRONG, exposure: 'base_resident', diagnosis: ['thyroid_cancer']}, 'possible'],
    [{...AFFF_STRONG, exposure_years: 'under_1'}, 'possible'],
    [{...AFFF_STRONG, represented: 'unsure'}, 'possible'],
    [{...AFFF_STRONG, exposure: 'water', diagnosis: ['other_cancer']}, 'unlikely'],
    [{...AFFF_STRONG, exposure: 'none'}, 'unlikely'],
    [{...AFFF_STRONG, diagnosis: ['none']}, 'unlikely'],
    [{...AFFF_STRONG, diagnosis_year: 'no_diagnosis'}, 'unlikely'],
    [{...AFFF_STRONG, represented: 'yes'}, 'unlikely'],
    [{}, 'unlikely']
  ];
  for (const [answers, expected] of cases) {
    const outcome = quiz.score(afff, answers);
    assert.equal(outcome.signal, expected, JSON.stringify(answers));
    assert.ok(quiz.signals.includes(outcome.signal));
  }
  const capped = quiz.score(afff, {...AFFF_STRONG, exposure_years: 'under_1'});
  assert.ok(capped.points >= afff.scoring.thresholds.strong, 'points alone would be strong');
  assert.equal(capped.unmetRequired.length, 1, 'the unmet required rule caps the signal');
  assert.equal(quiz.score(afff, {...AFFF_STRONG, exposure: 'none'}).disqualified.length, 1);
});

test('paraquat scoring produces one of three signals from the quiz rules', () => {
  const {quiz} = boot();
  const paraquat = quizJson('paraquat');
  const cases = [
    [PARAQUAT_STRONG, 'strong'],
    [{...PARAQUAT_STRONG, exposure: 'farm_worker'}, 'strong'],
    [{...PARAQUAT_STRONG, exposure: 'farm_worker', diagnosis_timing: 'unsure', exposure_years: 'one_to_five'}, 'possible'],
    [{...PARAQUAT_STRONG, exposure: 'lived_near'}, 'possible'],
    [{...PARAQUAT_STRONG, diagnosis: 'parkinsonism'}, 'possible'],
    [{...PARAQUAT_STRONG, diagnosis: 'symptoms_only'}, 'possible'],
    [{...PARAQUAT_STRONG, exposure_years: 'unsure'}, 'possible'],
    [{...PARAQUAT_STRONG, exposure: 'other', diagnosis: 'symptoms_only'}, 'unlikely'],
    [{...PARAQUAT_STRONG, exposure: 'none'}, 'unlikely'],
    [{...PARAQUAT_STRONG, diagnosis: 'none'}, 'unlikely'],
    [{...PARAQUAT_STRONG, diagnosis_timing: 'before'}, 'unlikely'],
    [{...PARAQUAT_STRONG, represented: 'yes'}, 'unlikely']
  ];
  for (const [answers, expected] of cases) {
    assert.equal(quiz.score(paraquat, answers).signal, expected, JSON.stringify(answers));
  }
});

test('condition operators cover single, multi, any/all/not and unanswered questions', () => {
  const {quiz} = boot();
  const answers = {a: 'x', b: ['p', 'q']};
  assert.equal(quiz.matches({question: 'a', is: 'x'}, answers), true);
  assert.equal(quiz.matches({question: 'a', is: 'y'}, answers), false);
  assert.equal(quiz.matches({question: 'b', is: 'q'}, answers), true);
  assert.equal(quiz.matches({question: 'b', in: ['z', 'p']}, answers), true);
  assert.equal(quiz.matches({question: 'b', includesAll: ['p', 'q']}, answers), true);
  assert.equal(quiz.matches({question: 'b', includesAll: ['p', 'z']}, answers), false);
  assert.equal(quiz.matches({question: 'c', answered: false}, answers), true);
  assert.equal(quiz.matches({question: 'c', is: 'x'}, answers), false);
  assert.equal(quiz.matches({all: [{question: 'a', is: 'x'}, {not: {question: 'b', is: 'z'}}]}, answers), true);
  assert.equal(quiz.matches({any: [{question: 'a', is: 'y'}, {question: 'b', is: 'p'}]}, answers), true);
  assert.equal(quiz.matches({unknownOperator: true, question: 'a'}, answers), false);
});

test('evaluate returns headline, lawyer type, next step and the disclaimer for every signal', () => {
  const {quiz, config} = boot();
  const afff = quizJson('afff');
  const strong = quiz.evaluate(afff, AFFF_STRONG);
  assert.equal(strong.signal, 'strong');
  assert.match(strong.headline, /potentially qualify/i);
  assert.equal(strong.lawyerType.id, 'mass_tort_afff');
  assert.equal(strong.nextStep, 'sofia_outreach');
  assert.equal(strong.nextStepConfig.href, config.quiz.nextSteps.sofia_outreach.href);
  assert.equal(strong.disclaimer, config.quiz.disclaimer);

  const unlikely = quiz.evaluate(afff, {...AFFF_STRONG, exposure: 'none'});
  assert.equal(unlikely.signal, 'unlikely');
  assert.equal(unlikely.nextStep, 'resources');
  assert.doesNotMatch(unlikely.headline, /potentially qualify/i);
  assert.equal(unlikely.disqualified.length, 1);
  assert.ok(Object.isFrozen(unlikely));
});

test('language lint rejects promises of acceptance, compensation, outcomes and bare "qualify"', () => {
  const {quiz} = boot();
  const base = quizJson('afff');
  const withHeadline = headline => ({...base, results: {...base.results, strong: {...base.results.strong, headline}}});
  const bad = [
    'You qualify for an AFFF lawsuit.',
    'You are eligible for a review.',
    'You will receive compensation.',
    'A firm will accept your case.',
    'Guaranteed settlement review.',
    'You have a valid claim.',
    'Our attorneys will call you.',
    'This is legal advice for you.',
    'Free consultation with a firm.',
    'Act before the deadline.'
  ];
  for (const headline of bad) assert.ok(quiz.lint(withHeadline(headline)).length > 0, headline);
  assert.equal(quiz.lint(withHeadline('You may potentially qualify for a review.')).length, 0);
  const missingPhrase = withHeadline('A firm may want to look at this.');
  missingPhrase.results.strong.body = 'Sofia can explain the next step.';
  assert.ok(quiz.lint(missingPhrase).some(p => p.includes('must say "potentially qualify"')));
  const unlikelyPromise = {...base, results: {...base.results, unlikely: {...base.results.unlikely, headline: 'You may potentially qualify.'}}};
  assert.ok(quiz.lint(unlikelyPromise).some(p => p.includes('unlikely')));
  // Option labels are linted too, not just result copy.
  const badOption = JSON.parse(JSON.stringify(base));
  badOption.questions[0].options[0].label = 'Firefighter (you qualify)';
  assert.ok(quiz.lint(badOption).some(p => p.includes('questions[0].options[0].label')));
});

test('structural validation catches broken definitions', () => {
  const {quiz} = boot();
  const base = quizJson('afff');
  const mutate = fn => { const copy = JSON.parse(JSON.stringify(base)); fn(copy); return quiz.validate(copy); };
  assert.ok(mutate(q => { q.questions = []; }).length);
  assert.ok(mutate(q => { q.questions[1].id = q.questions[0].id; }).some(p => p.includes('duplicates')));
  assert.ok(mutate(q => { q.scoring.points[0].when.question = 'missing'; }).some(p => p.includes('unknown question')));
  assert.ok(mutate(q => { q.scoring.thresholds = {strong: 2, possible: 5}; }).some(p => p.includes('greater than')));
  assert.ok(mutate(q => { q.results.strong.nextStep = 'call_firm'; }).some(p => p.includes('nextStep')));
  assert.ok(mutate(q => { delete q.results.unlikely; }).some(p => p.includes('results.unlikely')));
  assert.ok(mutate(q => { q.scoring.points[0].points = 'three'; }).some(p => p.includes('points must be a number')));
  assert.ok(mutate(q => { q.questions[0].type = 'text'; }).some(p => p.includes('single or multi')));
  assert.ok(mutate(q => { delete q.lawyerType; }).some(p => p.includes('lawyerType')));
});

test('load fetches the allow-listed definition, rejects mismatched or non-compliant content', async () => {
  const requests = [];
  const serve = body => async url => { requests.push(url); return {ok: true, status: 200, json: async () => body}; };
  let booted = boot({fetchImpl: serve(quizJson('afff'))});
  const loaded = await booted.quiz.load('afff');
  assert.equal(loaded.tort, 'afff');
  assert.equal(requests[0], 'https://doihaveaclaim.ai/campaigns/afff/quiz.json');

  booted = boot({fetchImpl: serve(quizJson('afff'))});
  await assert.rejects(booted.quiz.load('paraquat'), /does not match paraquat/);

  const tainted = quizJson('paraquat');
  tainted.results.strong.headline = 'You qualify and will receive compensation.';
  booted = boot({fetchImpl: serve(tainted)});
  await assert.rejects(booted.quiz.load('paraquat'), /Quiz definition rejected/);

  booted = boot({fetchImpl: async () => ({ok: false, status: 404})});
  await assert.rejects(booted.quiz.load('afff'), /unavailable \(404\)/);

  booted = boot({fetchImpl: serve(quizJson('afff'))});
  await assert.rejects(booted.quiz.load('talc-not-configured', '/x/'), /No quiz is configured/);
});

test('harness page loads the shared config and engine with a quiz mount', () => {
  const html = read('dihac/quiz/index.html');
  assert.match(html, /data-dihac-quiz="auto"/);
  assert.match(html, /src="\.\.\/config\.js/);
  assert.match(html, /src="\.\.\/app\.js/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
});
