import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startWorkbench} from '../abuse/local-server.mjs';

test('existing setup + campaign UI + real adapter contracts work locally, protect privacy and persist restart', {skip:!process.env.BTL_ABUSE_BACKEND_DIR},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'btl-workbench-test-'));
  let app;
  try {
    app=await startWorkbench({directory,backendDir:process.env.BTL_ABUSE_BACKEND_DIR});
    const origin=`http://127.0.0.1:${app.server.address().port}`;
    const post=(path,body,headers={})=>fetch(origin+'/abuse/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal((await fetch(origin)).status,200,'existing factory remains available');
    assert.match(await(await fetch(origin+'/abuse/')).text(),/LOCAL ONLY/);
    const initial=await(await fetch(origin+'/abuse/api/snapshot')).json();assert.equal(initial.historical.totals.records,73);assert.equal(initial.historical.as_of,'2026-10-21');assert.equal(initial.runtime.metrics.calls,null);assert.equal(initial.runtime.metrics.signed,null);
    for(const ad of initial.ads){const local=new URL(ad.local_url,origin),remote=new URL(ad.destination);for(const key of ['utm_source','utm_medium','utm_campaign','utm_content'])assert.equal(local.searchParams.get(key),remote.searchParams.get(key));}
    for(const route of ['/privacy-policy/','/sms-terms/','/terms-and-conditions/']){const response=await fetch(origin+route);assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/script-src 'none'/);const text=await response.text();assert.match(text,/Existing BTL policy page/);assert.doesNotMatch(text,/<script|href="tel:|href="mailto:/i);}
    const noOrder=await post('order',{order_id:'ord-fictional-ui-0001',contact_ref:'crm:fixture'},{Origin:'https://example.invalid'});assert.equal(noOrder.status,403);
    assert.equal((await post('order',{order_id:'ord-fictional-ui-0001',contact_ref:'crm:fixture',paid:true})).status,400);
    const order=await(await post('order',{order_id:'ord-fictional-ui-0001',contact_ref:'crm:fixture'})).json();assert.equal(order.invoice.total_cents,750000);
    const build=await(await post('build-fixture',{order_id:order.order.order_id})).json();assert.equal(build.status.jobs.built,true);assert.equal(build.status.activation,false);
    const seedResponse=await post('seed-fixture',{});assert.equal(seedResponse.status,200,await seedResponse.clone().text());const lead=await seedResponse.json();assert.equal(lead.simulated,true);assert.equal(lead.stages.find(s=>s.stage==='call').status,'pending');assert.equal(lead.recording.available,false);
    const review=await(await post('review-fixture',{lead_id:lead.lead_id})).json();assert.equal(review.stages.find(s=>s.stage==='review').events.length,1);
    const duplicateReview=await(await post('review-fixture',{lead_id:lead.lead_id})).json();assert.equal(duplicateReview.stages.find(s=>s.stage==='review').events.length,1);
    const suppress=await post('suppress-fixture',{lead_id:lead.lead_id});assert.equal(suppress.status,200);
    const message=await(await post('message-fixture',{lead_id:lead.lead_id})).json();assert.equal(message.prepared,false);assert.equal(message.send,false);
    const rejectPII=await post('intake',{contact:{first_name:'Do not retain this',phone:'+13103334444',email:'private@example.com'}});assert.equal(rejectPII.status,400);
    for(const route of ['payment-webhook','send','call','activate'])assert.equal((await post(route,{})).status,404);
    for(const path of ['/assets/sofia/sofia-portrait-440x784.jpg','/sex-abuse-la-county/','/sex-abuse-la-county/quiz/','/sex-abuse-la-county/talk-to-sofia/'])assert.equal((await fetch(origin+path)).status,200,path);
    const html=await(await fetch(origin+'/sex-abuse-la-county/')).text();assert.match(html,/LOCAL SIMULATION/);assert.match(html,/intake_endpoint:"\/abuse\/api\/intake"/);
    assert.equal((await fetch(origin+'/campaign-system/abuse/local-server.mjs')).status,404);
    await new Promise(ok=>app.server.close(ok));
    app=await startWorkbench({directory,backendDir:process.env.BTL_ABUSE_BACKEND_DIR});
    const snapshot=await(await fetch(`http://127.0.0.1:${app.server.address().port}/abuse/api/snapshot`)).json();assert.equal(snapshot.local.simulated_leads_excluded,1);assert.equal(snapshot.local.real.leads,0);assert.equal(snapshot.runtime.metrics.leads,null);
  } finally {if(app?.server.listening)await new Promise(ok=>app.server.close(ok));await rm(directory,{recursive:true,force:true})}
});

test('local outbox canonicalizes phone suppression and never restores consent from an old replay', {skip:!process.env.BTL_ABUSE_BACKEND_DIR},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'btl-workbench-consent-'));
  let app;
  try {
    app=await startWorkbench({directory,backendDir:process.env.BTL_ABUSE_BACKEND_DIR});
    const origin=`http://127.0.0.1:${app.server.address().port}`;
    const post=async(path,body)=>{
      const response=await fetch(origin+'/abuse/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
      assert.equal(response.status,200,await response.clone().text());return response.json();
    };
    const c=app.adapter.campaign;
    const submission=(id,phone,sms)=>({schema:'btl.abuse.intake/v1',campaign_id:c.campaign_id,submission_id:id,page_path:'/sex-abuse-la-county/',question_bank_version:c.question_bank.version,answers:[],
      consent:{version:c.consent.version,calls:true,sms,calls_text_sha256:c.consent.calls_sha256,sms_text_sha256:c.consent.sms_sha256},contact:{phone}});
    const old=submission('sub-consent-replay-0001','(310) 555-0144',true);
    const first=await post('intake',old);
    await post('intake',submission('sub-consent-replay-0002','310-555-0144',false));
    await post('intake',old);
    const replay=await post('message-fixture',{lead_id:first.lead_id});
    assert.equal(replay.prepared,false);assert.equal(replay.reason,'sms_consent_missing','old submission must not undo a later consent choice');
    const second=await post('intake',submission('sub-format-suppress-0001','(310) 555-0145',true));
    await post('suppress-fixture',{lead_id:second.lead_id});
    const suppressed=await post('message-fixture',{lead_id:second.lead_id});
    assert.equal(suppressed.prepared,false);assert.equal(suppressed.reason,'suppressed_or_unverified','formatting cannot bypass shared suppression');
    const metadata=await app.store.get('fixture-meta:'+second.lead_id);
    assert.equal(metadata.phone,'+13105550145');
    await app.store.set('fixture-meta:'+first.lead_id,{phone:'+13105550144',consent:{calls:true,sms:true,email:false},timezone:'America/Los_Angeles',intake_event_id:'EV-stale-fixture-event'});
    const stale=await post('message-fixture',{lead_id:first.lead_id});
    assert.equal(stale.prepared,false);assert.equal(stale.reason,'suppressed_or_unverified');
  } finally {if(app?.server.listening)await new Promise(ok=>app.server.close(ok));await rm(directory,{recursive:true,force:true})}
});
