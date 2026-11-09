import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../btl/glassman/ssdi/',import.meta.url);
const read = p => fs.readFileSync(new URL(p,root),'utf8');
function quiz() {
  class Element {
    children=[];style={};hidden=false;events={};textContent='';
    constructor(tag='div'){this.tagName=tag.toUpperCase();}
    set innerHTML(value){this.children=[];}
    appendChild(child){this.children.push(child);return child;}
    setAttribute(){}
    addEventListener(name,fn){this.events[name]=fn;}
    dispatchEvent(event){this.lastEvent=event;this.events[event.type]?.(event);}
    focus(){this.focused=true;}
    querySelector(){return null;}
  }
  const elements = new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  get('contactWrap').hidden=true;
  const context={window:{},document:{getElementById:get,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}};
  vm.runInNewContext(read('criteria.js'),context);
  vm.runInNewContext(read('quiz/quiz.js'),context);
  const walk=e=>[e,...(e.children||[]).flatMap(walk)];
  const pick=text=>{const button=walk(get('qBody')).find(e=>e.tagName==='BUTTON'&&e.textContent===text);assert.ok(button,text);button.events.click();};
  const state=value=>{const select=walk(get('qBody')).find(e=>e.tagName==='SELECT');select.value=value;select.events.change();};
  return {get,context,pick,state,all:()=>walk(get('qBody'))};
}
for(const [name,state,answers] of [
  ['state','AK',['48 to 64','Yes','Yes','No','No']],
  ['age','MA',['Under 48','Yes','Yes','No','No']],
  ['work','MA',['48 to 64','No','Yes','No','No']],
  ['doctor','MA',['48 to 64','Yes','No','No','No']],
  ['benefits','MA',['48 to 64','Yes','Yes','Yes','No']],
  ['lawyer','MA',['48 to 64','Yes','Yes','No','Yes']]
]) test(`quiz ${name} exclusion offers optional form without redirect or answer-change CTA`,()=>{
  const q=quiz();q.state(state);answers.forEach(q.pick);
  assert.equal(q.context.window.BTL_SSDI_QUIZ.answers().web_outcome,'NOT_A_FIT');
  assert.equal(q.get('contactWrap').hidden,false);
  assert.equal(q.all().filter(e=>['A','BUTTON'].includes(e.tagName)).length,0);
  assert.match(q.all().map(e=>e.textContent).join(' '),/another firm is reviewing cases like yours/);
  assert.equal(q.get('leadForm').lastEvent.detail.outcome,'NOT_A_FIT');
  assert.equal(q.get('qCount').textContent,'Done');
  assert.equal(q.get('qProg').style.width,'100%');
  assert.ok(q.all().some(e=>e.focused));
});
test('qualified result can be corrected to NOT_A_FIT without changing the screening rules',()=>{
  const q=quiz();q.state('MA');['48 to 64','Yes','Yes','No','No'].forEach(q.pick);
  assert.equal(q.context.window.BTL_SSDI_QUIZ.answers().web_outcome,'QUALIFIED');
  q.pick('← Change an answer');assert.equal(q.get('contactWrap').hidden,true);
  q.pick('Yes');assert.equal(q.context.window.BTL_SSDI_QUIZ.answers().web_outcome,'NOT_A_FIT');
  assert.equal(q.get('contactWrap').hidden,false);
});
test('alternative requests retain hold and disqualification, have separate consent and are not conversion leads',()=>{
  const js=read('intake.js');
  assert.match(js,/pageId === 'glassman-ssdi-quiz'/);
  assert.match(js,/request_type: otherOptions \? 'other_firm_review_request'/);
  assert.match(js,/payload\.routing\.route = 'hold'/);
  assert.match(js,/followup_request = \{ type: 'other_firm_review', requested: true, referral_authorized: false \}/);
  assert.match(js,/glassman-ssdi-other-options-marketing-apes-2026-11-09-v1/);
  assert.match(js,/if \(otherOptions\) push\('ee_other_options_request_received'\);\s*else if[^\n]+push\('generate_lead'/);
  assert.match(js,/Your request to check other options was received by Marketing Apes/);
  assert.match(js,/if \(!otherOptions\) push\('ee_lead_submit_success'\)/);
  assert.match(js,/if \(btn && pageId === 'glassman-ssdi-quiz'\)/);
  assert.match(js,/arrow\.setAttribute\('aria-hidden', 'true'\)/);
  const notice=read('quiz/index.html');
  assert.match(notice,/Optional requests to check other firms are handled by Marketing Apes and its service providers/);
  assert.doesNotMatch(notice,/and share it with Jeffrey Glassman/);
  assert.match(read('quiz/index.html'),/quiz\.js\?v=20261109-other-options-v1/);
  assert.match(read('quiz/index.html'),/intake\.js\?v=20261109-other-options-v1/);
  assert.doesNotMatch(read('quiz/quiz.js'),/ssa\.gov|location\.href|window\.open/);
});
