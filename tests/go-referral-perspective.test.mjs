// Go Referral private Perspective page (lfma/portal/go-referral/). Synthetic data only.
// The fixture is the exact JSON the backend builder (evolutionengine affiliate-hub/go_referral.py) returns for synthetic rows.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const dir=new URL('../lfma/portal/go-referral/',import.meta.url);
const js=readFileSync(new URL('report.js',dir),'utf8'),html=readFileSync(new URL('index.html',dir),'utf8'),css=readFileSync(new URL('report.css',dir),'utf8');
const REPORT=JSON.parse(readFileSync(new URL('./fixtures/go-referral-report.json',import.meta.url),'utf8'));
const clone=v=>JSON.parse(JSON.stringify(v)),ok=body=>({status:200,body});

// A small fake DOM: enough to sign in, load a report and read what was rendered.
function page(responses){
 const elements=new Map(),handlers={},calls=[],windowHandlers={};
 const node=tag=>({tag,value:'',hidden:false,textContent:'',className:'',children:[],
  setAttribute(k,v){this[k]=v;},addEventListener(ev,fn){handlers[this.id+':'+ev]=fn;},append(...c){this.children.push(...c);},replaceChildren(){this.children=[];}});
 const element=id=>{if(!elements.has(id)){const n=node('x');n.id=id;elements.set(id,n);}return elements.get(id);};
 const text=n=>[n.textContent,...n.children.map(text)].filter(Boolean).join(' ');
 const fetch=async(url,opts)=>{calls.push({url,opts});const r=responses.shift()||{status:500,body:{}};return {ok:r.status===200,status:r.status,json:async()=>r.body};};
 const document={getElementById:element,createElement:node,createTextNode:value=>({textContent:value,children:[]})};
 vm.runInNewContext(js,{document,window:{addEventListener(ev,fn){windowHandlers[ev]=fn;}},fetch,Intl,Number,Error,String,JSON,Array});
 const signIn=async()=>{element('email').value='test@example.invalid';await handlers['sign-in:submit']({preventDefault(){}});
  element('code').value='123456';await handlers['verify:submit']({preventDefault(){}});};
 return {element,text:id=>text(element(id)),calls,handlers,windowHandlers,signIn,all:()=>[...elements.values()].map(text).join(' | ')};
}

test('nothing private is in the page, and nothing loads before sign-in',()=>{
 const p=page([]);
 assert.equal(p.calls.length,0);assert.equal(p.element('report').hidden,true);assert.equal(p.text('status'),'Sign-in required. No private data loaded.');
 assert.match(html,/<div id="report" hidden>/);assert.match(html,/<form id="verify" hidden>/);assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/default-src 'none'; script-src 'self'; style-src 'self'; connect-src https:\/\/perspective-s3b8\.onrender\.com;/);
 // no figure, contact detail, sheet link, phone number or email address ships in the static files
 for(const file of [html,js,css]){assert.doesNotMatch(file,/docs\.google\.com|spreadsheets|drive\.google|@[a-z0-9-]+\.(com|net|org)|\+1\d{10}|\(\d{3}\) \d{3}-\d{4}/i);assert.doesNotMatch(file,/\$\s?\d/);}
 assert.doesNotMatch(html,/<script(?![^>]*src="\.\/report\.js")/);assert.doesNotMatch(html,/style=|onclick=|https?:\/\/(?!perspective-s3b8\.onrender\.com)/);
});

test('session stays in memory; values are written as text; one fixed endpoint',()=>{
 assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|outerHTML|insertAdjacentHTML|document\.cookie|document\.write|eval\(/);
 assert.match(js,/credentials:'omit'/);assert.match(js,/cache:'no-store'/);
 assert.equal(js.match(/https?:\/\/[^'"`\s]+/g).join(),'https://perspective-s3b8.onrender.com/portal/go-referral');
 assert.match(js,/go-referral\.perspective\/v1/);assert.match(js,/BTL-SSDI-001/);
 assert.doesNotMatch(js,/glassman|GLASSMAN|web-summary|lead-list|lead-intake/);
});

test('signed-in report renders the three sections from the server figures',async()=>{
 const p=page([ok({sent:true}),ok({session:'ps1.a.b'}),ok(clone(REPORT))]);await p.signIn();
 assert.deepEqual(p.calls.map(c=>c.url.replace('https://perspective-s3b8.onrender.com/portal/go-referral','')),['/login','/verify','/report']);
 assert.equal(p.calls[2].opts.method,'GET');assert.equal(p.calls[2].opts.headers.Authorization,'Bearer ps1.a.b');
 assert.equal(p.calls[0].opts.headers.Authorization,undefined);
 assert.equal(p.element('report').hidden,false);assert.equal(p.text('status'),'Private report loaded.');
 // 01 Marketing: the invoice is a lead package, spend carries its dates, platform leads are not delivered leads
 assert.equal(p.text('invoice-total'),'$2,000.00');assert.match(p.text('invoice-detail'),/10 qualified SSDI leads at \$200 each\. A fixed-price lead package, not a media budget\./);
 assert.equal(p.text('invoice-status'),'Paid');assert.equal(p.text('spend'),'$100.50');assert.equal(p.text('submissions'),'9');
 assert.match(p.text('spend-note'),/2026-01-12 to 2026-01-13 · America\/Los_Angeles/);
 assert.match(p.text('spend-coverage'),/2 days loaded, 2026-01-12 to 2026-01-13.*Copied from Meta on 2026-01-20\. Days outside this range are not loaded\./);
 assert.equal(p.text('package-delivered'),'Not counted');assert.match(p.text('package-note'),/No confirmed delivery or acceptance record is connected/);
 assert.match(p.text('spend-day-body'),/2026-01-12 \$40\.00 800 16 4 2026-01-13 \$60\.50 1,200 24 5 Total loaded \$100\.50 2,000 40 9/);
 assert.match(p.text('channel-breakdown'),/Facebook campaign 120255153821950231 .* \$11\.17 per platform lead \(not per qualified lead\)/);
 assert.match(html,/It is not a media allocation, so no budget remainder is calculated\./);
 // 02 AI Intake: submissions, people, attempts and statuses are separate numbers
 assert.equal(p.element('intake-detail').hidden,false);
 assert.equal(p.text('optin-count'),'10');assert.match(p.text('optin-detail'),/from 9 people/);
 assert.equal(p.text('call-count'),'14');assert.match(p.text('call-detail'),/to 8 people/);
 assert.equal(p.text('text-count'),'12');assert.match(p.text('text-detail'),/to 7 people before a call\. 1 person replied STOP\./);
 assert.match(p.text('status-body'),/Sofia started a transfer 1 Sofia screened: not a fit 1 Call back time booked 0 Replied STOP 1 .* Total people 9/);
 assert.equal(p.text('status-check'),'The statuses add up to the number of people who opted in.');
 assert.match(p.text('form-body'),/Prequalify form 5 Call back form 3 Free consultation form 2/);
 assert.match(p.text('day-body'),/2026-01-12 4 2026-01-13 6/);
 assert.match(p.text('calls-hint'),/6 of Sofia's calls.*fewer than the 14 attempts/);
 assert.match(p.text('calls-body'),/Who called Sofia called the person 5 The person called back 1 Screening result Transfer started 1/);
 assert.match(p.text('texts-body'),/Delivered 9 Sent, delivery not confirmed 2 Undelivered 1/);
 assert.match(p.text('calls-other'),/^3 other calls on Sofia's line are left out\./);
 // 03 After Handoff: attempts, then only what is confirmed, then the proposal on its own
 assert.equal(p.element('handoff-detail').hidden,false);
 assert.match(p.text('attempt-body'),/Transfers Sofia started 1 People with a started transfer 1 Lead posts attempted 1/);
 const confirmed=p.text('confirmed-body');
 assert.match(confirmed,/Transfers confirmed answered Not connected/);assert.match(confirmed,/Lead posts accepted by the receiving system 0 of 1 .* 1 attempt has no response code stored\./);
 assert.match(confirmed,/Leads the firm reported as accepted Not connected/);assert.match(confirmed,/Leads the firm reported as disqualified Not connected/);assert.match(confirmed,/Signed cases Not connected/);
 assert.doesNotMatch(confirmed,/Transfers confirmed answered 0|accepted 0 Not|Signed cases 0/);
 assert.match(p.text('dq-summary'),/Proposed only\. Nothing is sent for disqualification review today/);
 assert.match(p.text('dq-list'),/Consent: .* Buyer acceptance: .* Destination: .* Duplicate protection: /);
 assert.match(html,/<aside id="dq" class="proposed"[^>]*><p class="eyebrow">Proposed · not agreed · not tested<\/p>/);
 assert.ok(html.indexOf('id="confirmed-body"')<html.indexOf('id="dq"'),'the proposal sits after, and outside, the evidence tables');
});

test('not connected, hidden and missing data are never drawn as zero',async()=>{
 const r=clone(REPORT);
 r.invoice={available:false,note:'Not included in your access.'};r.marketing={available:false,channel:'Meta instant form',note:'Not included in your access.'};
 r.intake={available:false,note:'Intake reporting is unavailable right now. No figures are shown.'};
 r.handoff={available:false,note:'Intake reporting is unavailable right now. No figures are shown.',dq_review:r.handoff.dq_review};
 const p=page([ok({}),ok({session:'ps1.a.b'}),ok(r)]);await p.signIn();
 for(const id of ['invoice-total','invoice-status','spend','submissions','package-delivered'])assert.equal(p.text(id),'Unavailable',id);
 assert.equal(p.text('spend-day-body'),'');assert.equal(p.element('intake-detail').hidden,true);assert.equal(p.element('handoff-detail').hidden,true);
 assert.equal(p.text('status-body'),'');assert.equal(p.text('attempt-body'),'');assert.equal(p.text('confirmed-body'),'');
 assert.match(p.text('intake-note'),/unavailable right now/);assert.match(p.text('dq-summary'),/Proposed only/);
 // a status table that does not add up says so
 const bad=clone(REPORT);bad.intake.checks={status_total:7,status_total_matches_people:false};
 const q=page([ok({}),ok({session:'ps1.a.b'}),ok(bad)]);await q.signIn();
 assert.match(q.text('status-check'),/^Check needed: the statuses do not add up/);
 // a post that was accepted is shown as a count, and no posts at all is not "0 accepted"
 const none=clone(REPORT);none.handoff.receipts={post_attempts:0,accepted:null,without_response_code:0,note:''};
 const n=page([ok({}),ok({session:'ps1.a.b'}),ok(none)]);await n.signIn();
 assert.match(n.text('confirmed-body'),/Lead posts accepted by the receiving system No posts attempted/);
});

test('a report for any other client, campaign or schema is refused',async()=>{
 for(const change of [{schema:'glassman.web-summary/v2'},{client:{id:'glassman'}},{campaign_id:'GLASSMAN-SSDI-002'},{client:null}]){
  const p=page([ok({}),ok({session:'ps1.a.b'}),ok({...clone(REPORT),...change})]);await p.signIn();
  assert.equal(p.element('report').hidden,true,JSON.stringify(change));assert.equal(p.text('status'),'Report unavailable. No new data loaded.');
  assert.equal(p.text('invoice-total'),'');assert.equal(p.text('status-body'),'');
 }
});

test('expired or refused sessions lock the page and clear every figure',async()=>{
 const p=page([ok({}),ok({session:'ps1.a.b'}),ok(clone(REPORT)),{status:401,body:{}}]);await p.signIn();
 assert.equal(p.text('invoice-total'),'$2,000.00');
 await p.handlers['refresh:click']();
 assert.equal(p.text('status'),'Session expired. Sign in again.');assert.equal(p.element('report').hidden,true);assert.equal(p.element('sign-in').hidden,false);
 assert.doesNotMatch(p.all(),/\$|2026-01|Paid|people/);
 const q=page([ok({}),ok({session:'ps1.a.b'}),{status:403,body:{}}]);await q.signIn();
 assert.equal(q.text('status'),'Reporting is not included in your access.');assert.equal(q.element('report').hidden,true);
 const bad=page([ok({}),{status:401,body:{}}]);await bad.signIn();
 assert.equal(bad.text('status'),'Code could not be verified. Try again.');assert.equal(bad.calls.length,2);
});

test('Lock and leaving the page clear the session, and a late reply cannot repaint it',async()=>{
 const p=page([ok({}),ok({session:'ps1.a.b'}),ok(clone(REPORT))]);await p.signIn();
 p.handlers['lock:click']();
 assert.equal(p.element('report').hidden,true);assert.doesNotMatch(p.all(),/\$|2026-01|Paid|people/);
 await p.handlers['refresh:click']();assert.equal(p.calls.length,3,'no request without a session');
 assert.equal(typeof p.windowHandlers.pagehide,'function');
 // a reply that arrives after Lock is dropped: the code is verified late, and no report is requested or painted
 const slow=page([ok({}),ok({session:'ps1.a.b'}),ok(clone(REPORT))]);slow.element('email').value='test@example.invalid';
 await slow.handlers['sign-in:submit']({preventDefault(){}});slow.element('code').value='123456';
 const pending=slow.handlers['verify:submit']({preventDefault(){}});
 slow.handlers['lock:click']();await pending;
 assert.equal(slow.calls.length,2,'the report is never requested after Lock');
 assert.equal(slow.element('report').hidden,true);assert.equal(slow.text('invoice-total'),'');
});

test('server text is treated as text, never as markup',async()=>{
 const r=clone(REPORT);r.intake.lead_status[0].label='<img src=x onerror=alert(1)>';r.marketing.note='<script>alert(1)</script>';
 const p=page([ok({}),ok({session:'ps1.a.b'}),ok(r)]);await p.signIn();
 assert.match(p.text('status-body'),/<img src=x onerror=alert\(1\)> 1/);assert.equal(p.text('marketing-note'),'<script>alert(1)</script>');
});

test('mobile layout and the Glassman page are untouched',()=>{
 assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/\.scroll\{overflow-x:auto/);assert.match(css,/\.proposed\{border:2px dashed/);
 const glassman=readFileSync(new URL('../lfma/portal/glassman/index.html',import.meta.url),'utf8');
 assert.match(glassman,/<title>Glassman · Private Perspective<\/title>/);assert.doesNotMatch(glassman,/go-referral|Go Referral/);
});
