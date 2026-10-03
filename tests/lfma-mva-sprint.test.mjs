import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createState, transition} from '../lfma/demo/mva-sprint/sprint.mjs';
const answers={jurisdiction:'Arizona',timing:'Within the last 30 days',injury:'Injury reported',representation:'No current attorney reported'};
function atConsent(route='form',identity='branded',fixture=answers){let s=createState(identity,route);s=transition(s,'page');s=transition(s,'intake');return transition(s,'capture',fixture);}
for(const route of ['form','call','ai'])for(const identity of ['branded','unbranded']){
 test(`${identity} / ${route}: consent gates transfer and acknowledgement is not a signed outcome`,()=>{
  let s=atConsent(route,identity);assert.equal(s.stage,3);assert.strictEqual(transition(s,'connect'),s);
  s=transition(s,'agree');s=transition(s,'connect');assert.equal(s.stage,4);s=transition(s,'accepted');assert.equal(s.stage,5);
  assert.equal(s.events.filter(e=>e==='transfer_attempt').length,1);assert.ok(!s.events.some(e=>e.includes('signed')));
  assert.strictEqual(transition(s,'accepted'),s);
 });
}
test('declined permission reaches reporting with no transfer',()=>{const s=transition(atConsent(),'decline');assert.equal(s.stage,5);assert.equal(s.consent,false);assert.ok(!s.events.includes('transfer_attempt'));});
test('check then decline clears permission in the rendered packet and records no transfer',()=>{
 const handlers={};const connect={disabled:true};
 const screen={innerHTML:'',addEventListener:(name,handler)=>{handlers[name]=handler;},querySelector:selector=>selector==='[data-action="connect"]'?connect:{value:answers[selector.slice(1)]}};
 const document={querySelector:selector=>selector==='#screen'?screen:selector==='#screen-title'?null:selector==='#reset'?{addEventListener(){}}:selector==='#route-label'?{}:{value:selector.includes('identity')?'branded':'form'},querySelectorAll:()=>[]};
 const script=readFileSync(new URL('../lfma/demo/mva-sprint/sprint.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
 runInNewContext(script,{document});
 const click=action=>handlers.click({target:{closest:()=>({dataset:{action},disabled:false})}});
 for(const action of ['page','intake','capture'])click(action);
 handlers.change({target:{id:'connection-consent'}});assert.equal(connect.disabled,false);
 click('decline');
 assert.match(screen.innerHTML,/<dt>Connection permission<\/dt><dd>Not granted<\/dd>/);
 assert.match(screen.innerHTML,/Connection permission declined/);
 assert.doesNotMatch(screen.innerHTML,/Granted in synthetic example|Synthetic transfer attempted|Synthetic intake acknowledgement/);
 const state=transition(transition(atConsent(),'agree'),'decline');
 assert.equal(state.consent,false);assert.ok(!state.events.includes('transfer_attempt'));
});
for(const action of ['fallback','stop'])test(`unavailable intake records ${action} without acceptance`,()=>{let s=transition(transition(atConsent(),'agree'),'connect');s=transition(s,'unavailable');s=transition(s,action);assert.equal(s.stage,5);assert.ok(s.events.includes('transfer_unavailable'));assert.ok(!s.events.includes('transfer_accepted'));});
test('current attorney or other state is captured for firm review without automated rejection',()=>{const s=atConsent('ai','unbranded',{...answers,jurisdiction:'Other state',representation:'Current attorney reported'});assert.equal(s.stage,3);assert.equal(s.answers.representation,'Current attorney reported');});
test('unknown answers are rejected rather than injected into the page',()=>{const s=transition(transition(createState(),'page'),'intake');assert.strictEqual(transition(s,'capture',{...answers,jurisdiction:'<script>alert(1)</script>'}),s);});
test('duplicate and out-of-order actions do not create events',()=>{const s=createState();for(const a of ['connect','accepted','unavailable','fallback','stop','capture','decline'])assert.strictEqual(transition(s,a,answers),s);assert.equal(s.events.length,1);});
test('reset creates a fresh example and preserves no prior answers',()=>{const s=createState('unbranded','call');assert.equal(s.answers,null);assert.deepEqual(s.events,['ad_view']);assert.equal(s.consent,false);assert.equal(s.unavailable,false);});
test('public demo prevents live connections, data submission and storage',()=>{
 const html=readFileSync(new URL('../lfma/demo/mva-sprint/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../lfma/demo/mva-sprint/sprint.mjs',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.match(html,/noindex,nofollow/);
 assert.doesNotMatch(html+js,/tel:|mailto:|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|vapi/i);
 assert.doesNotMatch(html,/<form|type="(?:text|email|tel)"/);assert.match(html,/No live Phillips data/);
});
