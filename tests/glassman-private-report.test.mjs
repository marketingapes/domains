import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const js=readFileSync(new URL('../lfma/portal/glassman/reporting.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../lfma/portal/glassman/index.html',import.meta.url),'utf8');
test('report syntax and locked startup never load data',()=>{
 let requests=0;const elements=new Map();const handlers={};
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:true,textContent:'',addEventListener:(event,fn)=>{handlers[id+':'+event]=fn;}});return elements.get(id);};
 vm.runInNewContext(js,{document:{getElementById:element},window:{addEventListener(){}},fetch(){requests++;throw Error('unexpected');},setTimeout(){},clearTimeout(){},Date,Number,Error,String,JSON});
 assert.equal(requests,0);assert.equal(typeof handlers['sign-in:submit'],'function');
 assert.match(html,/id="metrics" hidden/);assert.match(html,/id="verify" hidden/);
});
test('sessions stay in memory; data uses textContent',()=>{
 assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|document\.cookie/);
 assert.match(js,/credentials:"omit"/);assert.match(js,/cache:"no-store"/);
 assert.match(js,/generation/);assert.match(js,/e\.status===401\|\|e\.status===403/);
});
test('fixed HTTPS endpoint and strict campaign schema',()=>{
 assert.match(js,/https:\/\/perspective-s3b8\.onrender\.com\/portal\/glassman/);
 assert.match(js,/glassman\.web-summary\/v1/);assert.match(js,/glassman\.web-summary\/v2/);assert.match(js,/GLASSMAN-SSDI-002/);
 assert.match(js,/\/web-summary\?v=2/);
 assert.doesNotMatch(html,/docs\.google\.com|spreadsheets|\+1339|@marketingapes\.com/);
 assert.match(html,/not fully qualified leads or signed clients/);
});

// A small fake DOM: enough to sign in, load a report and read what was rendered.
function page(responses){
 const elements=new Map(),handlers={},calls=[];
 const node=(tag)=>({tag,value:'',hidden:true,textContent:'',className:'',children:[],
  addEventListener(ev,fn){handlers[this.id+':'+ev]=fn;},append(...c){this.children.push(...c);},replaceChildren(){this.children=[];}});
 const element=id=>{if(!elements.has(id)){const n=node('x');n.id=id;elements.set(id,n);}return elements.get(id);};
 const text=n=>n.textContent+n.children.map(text).join(' ');
 const fetch=async(url,opts)=>{calls.push({url,opts});const r=responses.shift();return {ok:r.status===200,status:r.status,json:async()=>r.body};};
 vm.runInNewContext(js,{document:{getElementById:element,createElement:node},window:{addEventListener(){}},fetch,setTimeout(){},clearTimeout(){},Date,Number,Error,String,JSON});
 const run=async()=>{
  element('email').value='test@example.invalid';
  await handlers['sign-in:submit']({preventDefault(){},submitter:{disabled:false}});
  element('code').value='123456';
  await handlers['verify:submit']({preventDefault(){},submitter:{disabled:false}});
 };
 return {element,text:id=>text(element(id)),calls,run,handlers};
}
const V2={schema:'glassman.web-summary/v2',campaign_id:'GLASSMAN-SSDI-002',generated_at:'2026-11-09T23:00:00Z',timezone:'America/New_York',
 totals:{real_leads:7,test_records:12,first_day:'2026-11-06',last_day:'2026-11-09',first_lead_at:'2026-11-06T20:28:38Z',last_lead_at:'2026-11-09T22:27:46Z',
  spend_loaded:69.12,leads_on_spend_days:4,cpl_on_spend_days:17.28},
 by_day:[{date:'2026-11-06',channel:'meta',leads:4,spend:69.12,spend_loaded:true,cpl:17.28},
  {date:'2026-11-09',channel:'direct_or_unknown',leads:3,spend:null,spend_loaded:false,cpl:null}],
 by_channel:[{channel:'direct_or_unknown',leads:3,spend:null,days_with_spend:0,lead_days_missing_spend:1,cpl:null},
  {channel:'meta',leads:4,spend:69.12,days_with_spend:1,lead_days_missing_spend:0,cpl:17.28}],
 by_door:[{door:'callback_form',label:'Callback form',leads:6},{door:'quiz',label:'Eligibility quiz',leads:1},{door:'talk_to_sofia',label:'Talk to Sofia',leads:0},
  {door:'meta_form',label:'Meta lead form',leads:0},{door:'other',label:'Other',leads:0}],
 quiz_outcomes:{QUALIFIED:1,FIRM_REVIEW:0,NOT_A_FIT:0,other:0,not_screened:6},
 handoff:{leads:7,contacted:4,texted:4,called:4,transfer_attempted:2,transfer_connected:0,callback_booked:4,callback_sent_to_firm:0,
  sent_to_firm_crm:0,held_not_a_fit:0,not_yet_contacted:3,status_counts:{}},
 spend:{visible:true,loaded:[{date:'2026-11-06',channel:'meta',spend:69.12,source:'Meta Insights API',loaded_at:'2026-11-09T06:10:01Z'}],
  lead_days_missing_spend:[{date:'2026-11-09',channel:'direct_or_unknown',leads:3}],note:'Spend is loaded only for the days and channels listed.'},
 signed_cases:null};
const ok=body=>({status:200,body});
test('v2 report renders every section with honest spend states',async()=>{
 const p=page([ok({}),ok({session:'ps1.a.b'}),ok(V2)]);await p.run();
 assert.equal(p.calls[2].url,'https://perspective-s3b8.onrender.com/portal/glassman/web-summary?v=2');
 assert.equal(p.calls[2].opts.headers.Authorization,'Bearer ps1.a.b');
 assert.equal(p.element('metrics').hidden,false);assert.equal(p.element('detail').hidden,false);assert.equal(p.element('v1-note').hidden,true);
 assert.equal(p.text('web-count'),'7');assert.equal(p.text('test-count'),'12');assert.equal(p.text('contacted-count'),'4');
 assert.equal(p.text('cpl-value'),'$17.28');assert.match(p.text('cpl-note'),/\$69\.12 loaded spend over 4 leads/);
 assert.match(p.text('day-body'),/Meta \(Facebook, Instagram\) 4 \$69\.12 \$17\.28/);
 assert.match(p.text('day-body'),/Direct or unknown 3 Not loaded Not loaded/);
 assert.match(p.text('channel-body'),/Direct or unknown 3 Not loaded Not loaded/);
 assert.match(p.text('door-body'),/Callback form 6.*Eligibility quiz 1.*Talk to Sofia 0.*Meta lead form 0/);
 assert.match(p.text('outcome-body'),/Qualified 1.*Firm review 0.*Not a fit 0/);
 for(const s of ['Reached by text or call 4','Called by the assistant 4','Live transfer attempted 2','Live transfer connected 0','Callback time booked 4','LawRuler) 0','Not yet contacted 3'])
  assert.ok(p.text('funnel-body').includes(s),s);
 assert.match(p.text('spend-list'),/Meta Insights API/);assert.match(p.text('spend-list'),/spend not loaded \(3 leads\)/);
 assert.match(p.text('status'),/Connected/);
 // locking clears every figure and table
 p.handlers['lock:click']();
 assert.equal(p.element('metrics').hidden,true);assert.equal(p.text('day-body'),'');assert.equal(p.text('web-count'),'');assert.equal(p.text('spend-list'),'');
});
test('no spend loaded and no spend access are shown as such, never as $0',async()=>{
 const none={...V2,totals:{...V2.totals,spend_loaded:null,leads_on_spend_days:null,cpl_on_spend_days:null},
  by_day:V2.by_day.map(r=>({...r,spend:null,spend_loaded:false,cpl:null})),by_channel:V2.by_channel.map(r=>({...r,spend:null,cpl:null})),
  spend:{visible:true,loaded:[],lead_days_missing_spend:[],note:'No ad spend is loaded yet; cost per lead is not shown.'}};
 let p=page([ok({}),ok({session:'s'}),ok(none)]);await p.run();
 assert.equal(p.text('cpl-value'),'Not loaded');assert.doesNotMatch(p.text('day-body'),/\$0/);assert.match(p.text('spend-note'),/No ad spend is loaded yet/);
 const hidden={...none,spend:{...none.spend,visible:false,note:'Spend is not included in your access.'}};
 p=page([ok({}),ok({session:'s'}),ok(hidden)]);await p.run();
 assert.equal(p.text('cpl-value'),'—');assert.match(p.text('cpl-note'),/not included in your access/);assert.doesNotMatch(p.text('day-body'),/Not loaded|\$/);
});
test('a v1 server still works; malformed reports and signed-out sessions show nothing',async()=>{
 let p=page([ok({}),ok({session:'s'}),ok({schema:'glassman.web-summary/v1',campaign_id:'GLASSMAN-SSDI-002',web_requests:7,test_requests:12,source_updated_at:null,generated_at:'2026-11-09'})]);
 await p.run();
 assert.equal(p.element('metrics').hidden,false);assert.equal(p.text('web-count'),'7');assert.equal(p.element('detail').hidden,true);assert.equal(p.element('v1-note').hidden,false);
 p=page([ok({}),ok({session:'s'}),ok({...V2,handoff:{...V2.handoff,contacted:-1}})]);await p.run();
 assert.equal(p.element('metrics').hidden,true);assert.match(p.text('status'),/Refresh failed/);
 p=page([ok({}),ok({session:'s'}),ok({...V2,campaign_id:'OTHER'})]);await p.run();
 assert.equal(p.element('metrics').hidden,true);
 p=page([ok({}),ok({session:'s'}),{status:403,body:{}}]);await p.run();
 assert.equal(p.element('metrics').hidden,true);assert.match(p.text('status'),/Sign-in required/);
});
test('page has the v2 report regions and keeps them hidden until data loads',()=>{
 for(const id of ['detail','contacted-card','cpl-card','range','v1-note'])assert.match(html,new RegExp('id="'+id+'" hidden'));
 for(const id of ['funnel-body','day-body','channel-body','door-body','outcome-body','spend-list'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/reporting\.js\?v=2/);assert.match(html,/<th scope="col"/);
 assert.doesNotMatch(js,/\.name\b|phone|state_code|receipt/i);
});
