import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lfma/portal/glassman/lead-activity.js',import.meta.url),'utf8');
const receipt='BTLK-0123456789',other='BTLK-ABCDEF0123',at='2026-11-11T12:00:00Z';
const lead=(id=receipt)=>({receipt_id:id,first_name:id===receipt?'Pat':'Sam',last_name:'Example',phone:'(202) 555-0100',email:'test@example.invalid'});
const event=(extra={})=>({id:'source1',kind:'sms',status:'sent',direction:'outbound',title:'Text submission recorded',source:'SMS provider',source_event_id:'synthetic1',recorded_at:at,occurred_at:null,evidence:'Provider accepted the submission; delivery is not confirmed.',body:null,transcript:null,summary:null,recording_id:null,...extra});
const payload=(id=receipt,events=[event()])=>({schema:'glassman.lead-activity/v1',campaign_id:'GLASSMAN-SSDI-002',receipt_id:id,generated_at:at,events,coverage:[{label:'Email',status:'not_captured',note:'No linked messages captured.'}],truncated:false});
function harness(request=async()=>payload()){
 const elements=new Map(),urls=[],revoked=[];let session='synthetic',generation=0;
 const node=tag=>({tag,hidden:false,value:'',textContent:'',children:[],listeners:{},attributes:{},paused:false,
  append(...c){this.children.push(...c);},replaceChildren(...c){this.children=c;},addEventListener(k,v){this.listeners[k]=v;},focus(){this.focused=true;},
  setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},pause(){this.paused=true;},load(){},remove(){this.removed=true;}});
 const el=id=>{if(!elements.has(id)){const e=node('div');e.id=id;elements.set(id,e);}return elements.get(id);};
 const text=n=>n.textContent+n.children.map(text).join(' ');
 const window={};vm.runInNewContext(source,{window,document:{getElementById:el,createElement:node},URL:{createObjectURL(){const u='blob:synthetic'+urls.length;urls.push(u);return u;},revokeObjectURL(u){revoked.push(u);}},Date,Number,Set,Error,String,encodeURIComponent});
 const instance=window.GlassmanLeadActivity({request,getSession:()=>session,getGeneration:()=>generation,lock(){session='';generation++;instance.clear();}});
 return {instance,el,text:id=>text(el(id)),urls,revoked,lock(){session='';generation++;instance.clear();}};
}
const rejected=status=>async()=>{const e=new Error('unavailable');e.status=status;throw e;};
test('no provider links, persistent storage, markup injection, or outbound actions',()=>{
 assert.doesNotMatch(source,/innerHTML|localStorage|sessionStorage|document\.cookie|https?:\/\/|sendBeacon|console\./);
 assert.match(source,/recording_id/);assert.match(source,/URL\.revokeObjectURL/);
});
test('renders source evidence and captured time without claiming delivery',async()=>{
 const p=harness();await p.instance.open(lead());assert.match(p.text('activity-events'),/Text submission recorded/);assert.match(p.text('activity-events'),/time recorded; event time unavailable/);assert.match(p.text('activity-events'),/delivery is not confirmed/);assert.match(p.text('activity-events'),/synthetic1/);assert.match(p.text('activity-coverage'),/not captured/);
});
test('filters and empty coverage do not invent events',async()=>{
 const p=harness();await p.instance.open(lead());p.el('activity-filter').value='email';p.el('activity-filter').listeners.change();assert.match(p.text('activity-events'),/No activity of this type/);assert.doesNotMatch(p.text('activity-events'),/Text submission/);
});
test('content is plain text; false or malformed payloads fail closed',async()=>{
 const p=harness(async()=>payload(receipt,[event({body:'<img src=x onerror=alert(1)>',transcript:'Fictional transcript'})]));await p.instance.open(lead());assert.match(p.text('activity-events'),/<img/);assert.match(p.text('activity-events'),/Fictional transcript/);
 for(const bad of [{...payload(),receipt_id:other},{...payload(),campaign_id:'OTHER'},{...payload(),events:[event(),event()]},{...payload(),events:[event({status:'successful'})]},{...payload(),events:[event({recording_id:'https://bad.invalid'})]},{...payload(),events:[event({recorded_at:'yesterday'})]}]){const h=harness(async()=>bad);await h.instance.open(lead());assert.match(h.text('activity-status'),/could not be loaded/);assert.equal(h.text('activity-events'),'');}
});
test('missing endpoint and restricted access are not empty success',async()=>{
 for(const [code,message] of [[404,/not available/],[503,/could not be loaded/]]){const p=harness(rejected(code));await p.instance.open(lead());assert.match(p.text('activity-status'),message);assert.equal(p.text('activity-events'),'');}
 for(const code of [401,403]){const p=harness(rejected(code));await p.instance.open(lead());assert.equal(p.el('lead-activity').hidden,true);assert.equal(p.text('activity-title'),'');assert.equal(p.text('activity-contact'),'');}
});
test('selecting a new lead cannot receive an older response',async()=>{
 let resolve;const p=harness(path=>path.endsWith(receipt)?new Promise(r=>{resolve=r;}):Promise.resolve(payload(other)));
 const a=p.instance.open(lead());await p.instance.open(lead(other));resolve(payload());await a;assert.match(p.text('activity-title'),/Sam/);assert.doesNotMatch(p.text('activity-title'),/Pat/);
});
test('close and lock clear content and ignore a late response',async()=>{
 for(const action of ['clear','lock']){let resolve;const p=harness(()=>new Promise(r=>{resolve=r;}));const pending=p.instance.open(lead());action==='clear'?p.instance.clear():p.lock();resolve(payload());await pending;assert.equal(p.el('lead-activity').hidden,true);assert.equal(p.text('activity-title'),'');assert.equal(p.text('activity-events'),'');}
});
test('removed authorization clears the selected lead on list reconciliation',async()=>{const p=harness();await p.instance.open(lead());p.instance.reconcile([]);assert.equal(p.el('lead-activity').hidden,true);assert.equal(p.text('activity-events'),'');});
test('recording is authorized on demand, invalid audio rejected, URLs revoked on close',async()=>{
 const paths=[];const p=harness(async(path,body,token,raw)=>{paths.push({path,token,raw});return raw?{headers:{get:()=> 'audio/mpeg'},blob:async()=>({size:20})}:payload(receipt,[event({kind:'call',status:'ended',recording_id:'recording1'})]);});
 await p.instance.open(lead());assert.equal(paths.length,1);const li=p.el('activity-events').children[0],button=li.children.find(n=>n.tag==='button');await button.listeners.click();assert.equal(paths.length,2);assert.equal(paths[1].token,'synthetic');assert.equal(paths[1].raw,true);assert.match(paths[1].path,/\/recordings\/recording1$/);assert.equal(p.urls.length,1);const player=li.children.find(n=>n.tag==='audio');p.instance.clear();assert(player.paused);assert.deepEqual(p.revoked,p.urls);
});
test('late recording cannot cross lead changes or filters',async()=>{
 let resolve;const p=harness(async(path,body,token,raw)=>raw?new Promise(r=>{resolve=r;}):payload(receipt,[event({kind:'call',status:'ended',recording_id:'recording1'})]));await p.instance.open(lead());const li=p.el('activity-events').children[0],button=li.children.find(n=>n.tag==='button');const pending=button.listeners.click();p.el('activity-filter').value='sms';p.el('activity-filter').listeners.change();resolve({headers:{get:()=> 'audio/mpeg'},blob:async()=>({size:20})});await pending;assert.equal(p.urls.length,0);
});

test('recording contact denial locks and clears identity and existing event evidence',async()=>{const p=harness(async(path,body,token,raw)=>{if(raw){throw Object.assign(new Error(),{status:403});}return payload(receipt,[event({kind:'call',status:'ended',recording_id:'recording1'})]);});await p.instance.open(lead());const button=p.el('activity-events').children[0].children.find(n=>n.tag==='button');await button.listeners.click();assert.equal(p.el('lead-activity').hidden,true);assert.equal(p.text('activity-contact'),'');assert.equal(p.text('activity-title'),'');assert.equal(p.text('activity-events'),'');});
test('backend-generated synthetic activity contract renders with captured metadata',async()=>{const fixture=JSON.parse(readFileSync(new URL('./fixtures/glassman-crm-contract.json',import.meta.url),'utf8'));const p=harness(async()=>fixture.activity);await p.instance.open(fixture.lead_list.leads[0]);assert.doesNotMatch(p.text('activity-status'),/could not be loaded/);assert.match(p.text('activity-status'),/Updated/);});
