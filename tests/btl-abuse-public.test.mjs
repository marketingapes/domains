import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../btl/sex-abuse-la-county/',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('published LA paths retain noindex, disabled transport/measurement and explicit unsent state',()=>{
  for(const path of ['index.html','quiz/index.html','talk-to-sofia/index.html']){
    const s=read(path);
    assert.match(s,/<meta name="robots" content="noindex,\s*nofollow">/);
    assert.match(s,/intake_endpoint:null/);assert.match(s,/measurement:"off"/);
    assert.match(s,/phone_tel:null,phone_display:null,phone_status:"unverified_for_program"/);
    assert.match(s,/Nothing was sent/);assert.match(s,/not sent or saved/);
    assert.doesNotMatch(s,/ns\.html\?id=|historical-private|fixture-settlement|local-order:|operator-key|phillips-logo\.webp/);
    assert.doesNotMatch(s,/<input[^>]+type="checkbox"[^>]+checked/);
  }
});
test('voice-first action is visibly disabled and callback remains secondary',()=>{
  const s=read('talk-to-sofia/index.html');
  assert.match(s,/<button[^>]+id="voiceUnavailable"[^>]+disabled/);
  assert.match(s,/Live voice is unavailable in this preview/);
  assert.match(s,/Prefer a callback instead\?/);
  assert.match(s,/<div class="cb-panel" id="cbPanel" hidden>/);
  assert.match(s,/Recording is off in this preview/);
});
test('LA runtime cannot assess eligibility and requires the matching saved receipt',()=>{
  const s=read('lane.js');
  for(const event of ['ee_qualified','ee_disqualified','ee_qualification_complete'])assert.ok(!s.includes("'"+event+"'"));
  assert.match(s,/saved_pending_human_review/);assert.match(s,/not_assessed/);assert.match(s,/submission_id/);assert.match(s,/consent_record_id/);
  assert.match(s,/if \(!L\.intake_endpoint\)/);
});

test('requested image-led design is restored without changing Sofia or transport',()=>{
  for(const p of ['index.html','quiz/index.html']){const s=read(p);assert.match(s,/<body class="lp">/);assert.doesNotMatch(s,/form-experience|quiz-experience/);assert.match(s,/hero-900\.jpg/)}
  assert.match(read('lane.css'),/hero/);
});
