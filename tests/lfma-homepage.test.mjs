import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../lfma/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(fetch, valid = true) {
  const nodes = Object.fromEntries(['kyleForm','fBtn','formOk','formError','fName','fFirm','fEmail','fPhone','fMsg'].map(id => [id, {value:'', style:{}, hidden:true, focus(){this.focused=true;}}]));
  Object.assign(nodes.kyleForm, {reportValidity:()=>valid, addEventListener:(_,fn)=>nodes.kyleForm.submit=fn});
  for(const [id,value] of Object.entries({fName:' Jane Test ', fFirm:' Synthetic Firm ', fEmail:' jane@example.invalid ',fPhone:'',fMsg:' Synthetic workflow inquiry '})) nodes[id].value=value;
  let timer, cleared=false;
  vm.runInNewContext(script, {document:{getElementById:id=>nodes[id]}, window:{location:{origin:'https://lawfirmmarketingapes.com',pathname:'/',search:'?private=value'}},fetch,AbortController,Date,setTimeout:(fn,ms)=>{assert.equal(ms,15000);timer=fn;return 1;},clearTimeout:()=>{cleared=true;}});
  return {nodes,submit:()=>nodes.kyleForm.submit({preventDefault(){}}),expire:()=>timer(),cleared:()=>cleared};
}
test('homepage qualifies proof and links to the current scoreboard',()=>{
  assert.doesNotMatch(html,/18 signed|74\.12|19\.91|REPLACE_WITH|running the full loop/i);
  for(const text of ['18 CRM Converted','81 recorded intakes','Executed retainers are unverified','cohorts are unmatched','not calculable','/results/la-county/#scoreboard']) assert.ok(html.includes(text));
});
test('LFMA contract and destination match existing agency contact; waits for receipt and blocks duplicate sends',async()=>{
  let resolve, calls=0;
  const h=setup((url,options)=>{
    calls++;
    const contact=readFileSync(new URL('../lfma/contact.html',import.meta.url),'utf8');
    assert.ok(contact.includes("fetch('"+url+"'"));
    assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
    const body=JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(),['firm_name','contact_name','email','phone','website','budget','services','message','source','page','timestamp'].sort());
    assert.equal(body.contact_name,'Jane Test');assert.equal(body.firm_name,'Synthetic Firm');assert.equal(body.message,'Synthetic workflow inquiry');
    assert.equal(body.source,'agency_contact_form');assert.equal(body.page,'https://lawfirmmarketingapes.com/');assert.ok(!isNaN(Date.parse(body.timestamp)));
    return new Promise(r=>resolve=r);
  });
  const pending=h.submit();await h.submit();assert.equal(calls,1);assert.equal(h.nodes.fBtn.disabled,true);assert.notEqual(h.nodes.formOk.style.display,'block');
  resolve({ok:true,status:200});await pending;
  assert.equal(h.nodes.formOk.style.display,'block');assert.equal(h.nodes.formOk.focused,true);assert.equal(h.nodes.kyleForm.style.display,'none');assert.equal(h.cleared(),true);
});
for(const [label,fetch] of [['HTTP rejection',async()=>({ok:false,status:500})],['network/CORS error',async()=>{throw new TypeError('Failed to fetch');}]]) {
 test(label+' preserves message and never claims success',async()=>{
  const h=setup(fetch);await h.submit();assert.equal(h.nodes.formError.hidden,false);assert.match(h.nodes.formError.textContent,/could not confirm acceptance/);assert.notEqual(h.nodes.formOk.style.display,'block');assert.equal(h.nodes.fMsg.value,' Synthetic workflow inquiry ');assert.equal(h.nodes.fBtn.disabled,false);assert.equal(h.cleared(),true);
 });
}
test('timeout aborts without retry or false receipt',async()=>{
 let calls=0;const h=setup((_,options)=>{calls++;return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('AbortError'))));});
 const pending=h.submit();h.expire();await pending;assert.equal(calls,1);assert.equal(h.nodes.formError.hidden,false);assert.equal(h.nodes.fBtn.disabled,false);assert.notEqual(h.nodes.formOk.style.display,'block');
});
test('invalid email and whitespace required values never send',async()=>{
 for(const valid of [false,true]){let calls=0;const h=setup(()=>{calls++;},valid);if(valid)h.nodes.fMsg.value='  ';await h.submit();assert.equal(calls,0);assert.equal(h.nodes.formError.hidden,false);}
 assert.doesNotMatch(html,/<form[^>]+novalidate/);
 assert.match(html,/<button[^>]+id="fBtn" disabled/);
 assert.match(html,/<noscript>/);
});
