import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createDiskStore} from '../abuse/durable-store.mjs';
import {createPaymentEventAdapter} from '../abuse/payment-events.mjs';
import {createOrder,draftInvoice,createPaymentAuthority,createBuildQueue,memoryStore,BUILD_STEPS} from '../abuse/machine.mjs';
import {createLocalWorkflow} from '../abuse/workflow.mjs';
import {createDraftWorker} from '../abuse/worker.mjs';
import {createDraftOutbox,sofiaInstructions,loadSofiaInstructions,classifyReply} from '../abuse/automation.mjs';
import {planMakeEvent} from '../abuse/make-routing.mjs';

const temporary=async(fn)=>{const dir=await mkdtemp(join(tmpdir(),'btl-integration-'));try{return await fn(dir)}finally{await rm(dir,{recursive:true,force:true})}};
const order=()=>createOrder({orderId:'ord-fictional-integrated-0001',firmId:'phillips-law-group',contactRef:'crm:fictional-account'});
test('disk NX is atomic across processes, survives reopening, and refuses mutable aliases',()=>temporary(async dir=>{
  const moduleUrl=new URL('../abuse/durable-store.mjs',import.meta.url).href;
  const run=i=>new Promise((resolve,reject)=>{const code=`import {createDiskStore} from ${JSON.stringify(moduleUrl)}; const s=await createDiskStore(${JSON.stringify(dir)}); console.log(await s.setNx('claim',{winner:${i}}));`;const child=spawn(process.execPath,['--input-type=module','-e',code],{stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('exit',c=>c?reject(Error(err)):resolve(out.trim()));child.on('error',reject)});
  const results=await Promise.all(Array.from({length:6},(_,i)=>run(i)));
  assert.equal(results.filter(x=>x==='true').length,1);
  const a=await createDiskStore(dir),first=await a.get('claim');first.winner=99;assert.notEqual((await a.get('claim')).winner,99);
  const b=await createDiskStore(dir);assert.deepEqual(await b.get('claim'),await a.get('claim'));
  const lock=await a.withLock('task',async()=>{assert.equal((await b.withLock('task',()=>assert.fail())).busy,true);return'finished'});assert.equal(lock.value,'finished');
}));

test('signed payment relay: exact raw signature, scope, timestamp, replay conflict and refund hold',async()=>{
  // Ephemeral mock keypair: never persisted or configured on a provider.
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');const key=publicKey.export({type:'spki',format:'pem'});
  const store=memoryStore(),o=order(),inv=draftInvoice(o),now=Date.parse('2026-10-22T15:00:00Z');
  const adapter=createPaymentEventAdapter({store,resolveInvoice:async id=>id===inv.invoice_id?{order:o,invoice:inv}:null,publicKeys:{fixture:key},now:()=>now});
  const event={schema:'btl.payment-relay/v1',event_id:'pay-fixture-00000001',tenant:o.tenant,firm_id:o.firm_id,campaign_id:o.campaign_id,order_id:o.order_id,invoice_id:inv.invoice_id,reference:'FIXTURE-SETTLEMENT-001',amount_cents:inv.total_cents,currency:inv.currency,status:'settled',source:'processor_settlement',occurred_at:'2026-10-22T14:59:00Z',fixture:true};
  const pack=e=>{const raw=JSON.stringify(e);return{raw,signature:sign(null,Buffer.from(raw),privateKey).toString('hex'),keyId:'fixture'}};
  await assert.rejects(adapter.receive({...pack(event),raw:JSON.stringify({...event,amount_cents:1})}),/signature/);
  await assert.rejects(adapter.receive({...pack(event),keyId:'missing'}),/unconfigured/);
  await assert.rejects(adapter.receive(pack({...event,tenant:'NIL'})),/scope/);
  await assert.rejects(adapter.receive(pack({...event,occurred_at:'2026-10-22T14:00:00Z'})),/stale/);
  await assert.rejects(adapter.receive(pack({...event,unexpected:'untrusted'})),/invalid/);
  await adapter.receive(pack(event));await adapter.receive(pack(event));
  await assert.rejects(adapter.receive(pack({...event,occurred_at:'2026-10-22T14:59:01Z'})),/replay_conflict/);
  const query={tenant:o.tenant,campaign_id:o.campaign_id,invoice_id:inv.invoice_id,reference:event.reference};
  assert.equal(await adapter.readSettlement(query),null,'fixture settlement excluded from connected reads');
  const authority=createPaymentAuthority({mode:'fixture',now:()=>now,readSettlement:q=>adapter.readSettlement(q,{fixture:true})});
  const proof=await authority.verify(o,inv,event.reference);assert.equal(proof.fixture,true);
  await adapter.receive(pack({...event,event_id:'pay-fixture-refund-0001',status:'refunded',amount_cents:100000}));
  assert.equal(await adapter.readSettlement(query,{fixture:true}),null);
  await assert.rejects(createBuildQueue(store,authority).enqueue(o,inv,proof),/reverification_failed/);
  await adapter.receive(pack({...event,event_id:'pay-fixture-late-settlement'}));
  assert.equal(await adapter.readSettlement(query,{fixture:true}),null,'later settlement cannot clear dispute/refund hold');
});

test('whole order/invoice/fixture-payment/build persists, resumes and never becomes launch ready',()=>temporary(async dir=>{
  const store=await createDiskStore(dir);const workflow=createLocalWorkflow({store});
  const draft=await workflow.create({order_id:'ord-fictional-integrated-0001',contact_ref:'crm:fictional-account'});
  assert.equal(draft.invoice.sent,false);assert.equal(draft.payment.real_payment,null);
  const first=await workflow.runFixture(draft.order.order_id);assert.equal(first.status.jobs.built,true);assert.equal(first.status.readiness.launch_ready,false);
  const resumed=createLocalWorkflow({store:await createDiskStore(dir)});
  const again=await resumed.runFixture(draft.order.order_id);assert.equal(again.results.every(r=>r.duplicate),true);
  assert.equal(again.status.activation,false);assert.equal(again.status.payment.real_payment,null);
  await assert.rejects(resumed.create({order_id:draft.order.order_id,contact_ref:'crm:different'}),/content_conflict/);
}));

test('draft worker serializes concurrent handles, persists bounded failures and resumes after a normal failure',()=>temporary(async dir=>{
  const store=await createDiskStore(dir),o=order(),inv=draftInvoice(o);const now=Date.now();
  const authority=createPaymentAuthority({readSettlement:async()=>({tenant:o.tenant,firm_id:o.firm_id,campaign_id:o.campaign_id,order_id:o.order_id,invoice_id:inv.invoice_id,reference:'FIXTURE-0001',status:'settled',source:'processor_settlement',currency:'USD',amount_cents:750000,fixture:true,received_at:new Date(now).toISOString(),verified_at:new Date(now).toISOString(),verified_by:'fixture'})});
  const queue=createBuildQueue(store,authority);await queue.enqueue(o,inv,await authority.verify(o,inv,'FIXTURE-0001'));
  const counts={};let fail=true;const handlers=Object.fromEntries(BUILD_STEPS.map(step=>[step,async()=>{counts[step]=(counts[step]||0)+1;if(step==='ads'&&fail)throw Error('fixture-transient');return{step,fixture:true}}]));
  const a=createDraftWorker({store,queue,handlers}),b=createDraftWorker({store:await createDiskStore(dir),queue,handlers});
  await Promise.all([a.run(o),b.run(o)]);assert.equal(counts.pages,1);assert.equal((await queue.status(o)).built,false);
  fail=false;await b.run(o);assert.equal((await queue.status(o)).built,true);assert.equal(counts.pages,1);
  const failing=createDraftWorker({store,queue:{status:async()=>({jobs:BUILD_STEPS.map(step=>({step,state:'queued',fixture:true}))})},handlers:Object.fromEntries(BUILD_STEPS.map(s=>[s,async()=>{throw Error('permanent')}]))});
  const other={...o,order_id:'ord-fictional-failing-0001'};for(let i=0;i<4;i++)await failing.run(other);
  const last=await failing.run(other);assert.equal(last.results.every(r=>r.reason==='retry_limit'&&r.owner==='intake-operations'),true);
}));

test('outbox respects exact trigger, affirmative consent, fresh suppression, quiet hours and stable dedupe',async()=>{
  let suppression='clear',sms=true,tz='America/Los_Angeles';const store=memoryStore();
  const lead='MA-BTL-ABUSE-fixture',event='EV-fixture-event-0001';
  const outbox=createDraftOutbox({store,now:()=>new Date('2026-10-22T18:00:00Z'),suppressionForLead:async()=>suppression,contextForLead:async()=>({tenant:'BTL',campaign_id:'btl-ca-abuse-la-county-v1',lead_id:lead,simulated:true,timezone:tz,consent:{sms,email:false},events:[{event_id:event,type:'lead.saved'}]})});
  const input={lead_id:lead,event_id:event,template_id:'sms-request-received'};
  assert.equal((await outbox.prepare(input)).draft.send,false);assert.equal((await outbox.prepare(input)).duplicate,true);
  suppression='suppressed';assert.equal((await outbox.prepare(input)).prepared,false);
  suppression='unverified';assert.equal((await outbox.prepare(input)).prepared,false);
  suppression='clear';sms=false;assert.equal((await outbox.prepare(input)).reason,'sms_consent_missing');
  sms=true;tz=null;assert.equal((await outbox.prepare(input)).reason,'timezone_unverified');
  tz='Asia/Tokyo';assert.equal((await outbox.prepare(input)).reason,'quiet_hours_defer');
  await assert.rejects(outbox.prepare({...input,event_id:'EV-another-fixture'}),/trigger_unverified/);
  assert.equal((await outbox.prepare({...input,template_id:'email-request-received'})).reason,'email_consent_missing');
  assert.match(classifyReply(' stop ').action,/suppress_shared/);assert.match(classifyReply('START').action,/do_not_clear/);
});

test('Sofia context never invents consent, recording, question eligibility or re-asks prior answers',async()=>{
  const context={schema:'btl.abuse.sofia-context/v1',dispatch:'disabled',eligibility:'not_assessed',human_review:'required',suppression:'clear',lead_id:'fixture-lead',call_id:'fixture-call',consent:{calls:true,consent_record_id:'fixture-consent'},criteria_status:'pending_attorney_approval',question_bank:{id:'bank',version:'1',questions:[{question_id:'age'},{question_id:'where'}]},prior_answers:[{question_id:'age',answer_id:'prefer_not',source:'quiz',confirmed_at:'2026-10-22T18:00:00Z'}]};
  const instructions=sofiaInstructions(context);assert.equal(instructions.allowed,true);assert.deepEqual(instructions.ask.map(q=>q.question_id),['where']);assert.match(instructions.recording,/off_until/);
  assert.equal(sofiaInstructions({...context,suppression:'unverified'}).allowed,false);
  assert.equal(sofiaInstructions({...context,consent:{calls:false}}).allowed,false);
  const adapter={campaign:{question_bank:context.question_bank},context:async()=>({...context,call_id:undefined})};
  assert.equal((await loadSofiaInstructions({adapter,binding:{call_id:'fixture-bound-call'}})).call_id,'fixture-bound-call');
});

test('Make routing is positive LA allowlist only and blueprint has a literal hard stop, no live URL or connection',async()=>{
  const event={tenant:'BTL',campaign_id:'btl-ca-abuse-la-county-v1',program_id:'la-county-juvenile-detention',form_id:'fixture-la-form',lead_id:'fixture-lead',submission_id:'fixture-submission',event_id:'fixture-event',consent_record_id:'fixture-consent',calls_consent:true};
  assert.equal(planMakeEvent(event).accepted,false);
  const config={laFormIds:['fixture-la-form'],suppression:'clear'};
  assert.equal(planMakeEvent(event,config).provider_calls,0);assert.equal(planMakeEvent({...event,program_id:'ca-womens-prison'},config).accepted,false);
  assert.equal(planMakeEvent({...event,form_id:'mva'},config).accepted,false);assert.equal(planMakeEvent({...event,calls_consent:false},config).accepted,false);
  const blueprint=JSON.parse(await readFile(new URL('../abuse/make/disabled-blueprint.json',import.meta.url),'utf8'));
  const http=blueprint.flow.find(m=>m.module==='http:MakeRequest');assert.equal(new URL(http.mapper.url).hostname,'example.invalid');assert.deepEqual(http.filter.conditions,[[{a:'0',o:'text:equal',b:'1'}]]);assert.equal(http.mapper.allowRedirects,false);
});
