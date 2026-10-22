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
