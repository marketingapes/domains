import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, exportPlan } from '../ma/assets/network/planner.mjs';
for (const [goal,expected] of [['response','Sofia'],['campaigns','Website'],['operations','AI integration']]) {
 test(`${goal} creates a distinct, complete 30-day starter plan`,()=>{
  const p=buildPlan({goal,industry:'services',stage:'manual'});
  assert.ok(p.title.includes(expected)); assert.equal(p.weeks.length,4);
  assert.equal(p.metrics.length,3); assert.ok(p.firstStep.length>20);
  assert.ok(exportPlan(p).includes('Marketing Apes')); assert.ok(exportPlan(p).includes('619-736-0356'));
 });
}
test('existing systems produce an audit-first recommendation',()=>{
 const p=buildPlan({goal:'response',industry:'legal',stage:'connected'});
 assert.match(p.firstStep,/existing/); assert.match(exportPlan(p),/legal|Legal/);
});
test('unknown inputs cannot silently produce an unrelated plan',()=>{
 assert.throws(()=>buildPlan({goal:'bad',industry:'services',stage:'manual'}),/Choose/);
 assert.throws(()=>buildPlan({goal:'response',industry:'bad',stage:'manual'}),/Choose/);
});
