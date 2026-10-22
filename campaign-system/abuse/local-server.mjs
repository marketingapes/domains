// Explicit local-only extension of the existing setup server. Imports Claude's existing adapter.
import { createSetupServer } from '../setup-server.mjs';
import { createDiskStore } from './durable-store.mjs';
import { createLocalWorkflow } from './workflow.mjs';
import { loadPackage, loadTemplates, checkAdsAgainstPages, readiness } from './machine.mjs';
import { createDraftOutbox } from './automation.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
const pkg=loadPackage();
const sha=x=>createHash('sha256').update(x).digest('hex');
const backendDefault=fileURLToPath(new URL('../../../legal-web-lead/',import.meta.url));
const root=new URL('../../',import.meta.url);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};

export async function createWorkbench({ directory, backendDir=backendDefault }={}) {
  if (!directory) throw Error('explicit_fixture_directory_required');
  const store=await createDiskStore(directory);
  const backend=pathToFileURL(resolve(backendDir)+'/');
  const {createAbuseCampaignAdapter}=await import(new URL('src/intake/btl-abuse-campaign.js',backend));
  const {createAbusePerspective,loadHistorical}=await import(new URL('src/intake/btl-abuse-perspective.js',backend));
  const suppression={
    async contactSuppression({phone}){return {suppressed:!!await store.get('fixture-suppressed:'+sha(phone))}},
    async suppressContact(kind,phone){if(kind!=='phone')throw Error('fixture_phone_only');await store.setNx('fixture-suppressed:'+sha(phone),true)}
  };
  const adapter=createAbuseCampaignAdapter({store,suppression,env:{BTL_ABUSE_ASSISTANT_IDS:'a058ae66-c7d4-458f-b978-1e139d727aee'}});
  const historical=loadHistorical();
  const perspective=createAbusePerspective({adapter,historical});
  const workflow=createLocalWorkflow({store});
  async function requireFixture(id){const view=await adapter.timeline(id);if(view.simulated!==true)throw Error('fixture_lead_required');return view}
  const outbox=createDraftOutbox({store,
    contextForLead:async id=>{const t=await requireFixture(id),meta=await store.get('fixture-meta:'+id);return {...t,tenant:'BTL',consent:meta?.consent,timezone:meta?.timezone}},
    suppressionForLead:async id=>{const meta=await store.get('fixture-meta:'+id);if(!meta)return'unverified';return(await suppression.contactSuppression({phone:meta.phone})).suppressed?'suppressed':'clear'}
  });
  async function saveFixture(payload){
    const digits=String(payload?.contact?.phone||'').replace(/\D/g,'');
    if(!/^1?[2-9]\d{2}55501\d{2}$/.test(digits))throw Error('fictional_555_0100_to_0199_phone_required');
    const clean={...payload,simulated:true,contact:{first_name:'Fictional demo claimant',phone:payload.contact.phone,email:''}};
    const receipt=await adapter.save(clean);
    await store.set('fixture-meta:'+receipt.lead_id,{phone:clean.contact.phone,consent:{calls:clean.consent.calls,sms:clean.consent.sms,email:false},timezone:'America/Los_Angeles'});
    return receipt;
  }
  async function seedFixture(){
    const previous=await store.get('fixture-seed-id');if(previous)return perspective.lead(previous);
    const c=adapter.campaign;const at=new Date().toISOString();
    const receipt=await saveFixture({schema:'btl.abuse.intake/v1',campaign_id:c.campaign_id,submission_id:'sub-local-workbench-fixture-0001',page_path:'/sex-abuse-la-county/quiz/',question_bank_version:c.question_bank.version,
      answers:[['age','under18'],['where','juvenile'],['when','2005_2019'],['lawyer','prefer_not']].map(([question_id,answer_id])=>({question_id,answer_id,source:'quiz',confirmed_at:at})),
      consent:{version:c.consent.version,calls:true,sms:true,calls_text_sha256:c.consent.calls_sha256,sms_text_sha256:c.consent.sms_sha256},
      contact:{phone:'+13105550142'},attribution:{utm_source:'facebook',utm_campaign:c.campaign_id,utm_content:'la-four-questions'}});
    await store.setNx('fixture-seed-id',receipt.lead_id);return perspective.lead(receipt.lead_id);
  }
  const staticFiles={
    '/abuse/':['operator/index.html','text/html; charset=utf-8'],
    '/abuse/operator.css':['operator/operator.css','text/css; charset=utf-8'],
    '/abuse/operator.mjs':['operator/operator.mjs','text/javascript; charset=utf-8'],
  };
  const server=createSetupServer({extension:async({req,res,path,origin,json,body,headers})=>{
    if(req.method==='GET'&&staticFiles[path]){const [name,type]=staticFiles[path];res.writeHead(200,{...headers,'Content-Type':type});res.end(await readFile(new URL(name,import.meta.url)));return true}
    const lane='/sex-abuse-la-county/';
    const page=path===lane||path===lane+'quiz/'||path===lane+'talk-to-sofia/';
    const asset=/^\/assets\/(phillips-logo\.webp|btl-seal\.svg|sofia\/sofia-portrait-440x784\.jpg|lanes\/sex-abuse-la-county\/[a-zA-Z0-9_.-]+\.(jpg|webp|png))$/.test(path);
    const laneCode=path===lane+'lane.js'||path===lane+'lane.css';
    if(req.method==='GET'&&(page||asset||laneCode)){
      const file=new URL('btl'+path+(page?'index.html':''),root);
      let content=await readFile(file);
      if(page){content=content.toString().replace('intake_endpoint:null','intake_endpoint:"/abuse/api/intake",simulated:true').replace(/<body([^>]*)>/,'<body$1><p role="note" style="background:#fff1ce;color:#573d00;padding:16px;margin:0;text-align:center">LOCAL SIMULATION · Only fictional 555-0100–0199 numbers accepted. No calls or messages. Entered names and email are discarded.</p>')}
      res.writeHead(200,{...headers,'Content-Type':types[extname(file.pathname)]||'application/octet-stream'});res.end(content);return true;
    }
    if(!path.startsWith('/abuse/api/'))return false;
    if(req.method==='GET'&&path==='/abuse/api/snapshot'){
      json(res,200,{status:'local_fixture_only',runtime:{source:'unconnected live provider/warehouse',metrics:{leads:null,calls:null,recordings:null,accepted_handoffs:null,signed:null,joined_cps:null}},historical:{...historical,as_of:'2026-10-21'},readiness:readiness(),templates:loadTemplates(),ads:pkg.ads.map(ad=>({...ad,destination:checkAdsAgainstPages().links.find(l=>l.angle_id===ad.angle_id).url,local_url:new URL(pkg.pages[ad.path]).pathname+new URL(pkg.pages[ad.path]).search})),local:await perspective.aggregate()});return true;
    }
    if(req.method!=='POST'){json(res,404,{error:'Local route not found'});return true}
    if(req.headers.origin!==origin){json(res,403,{error:'Same-origin JSON required'});return true}
    if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,415,{error:'JSON required'});return true}
    const input=await body(req);
    const route=path.slice('/abuse/api/'.length);
    let value;
    if(route==='order'){
      if(!input||Object.keys(input).some(k=>!['order_id','contact_ref'].includes(k)))throw Error('order_fields_invalid');
      value=await workflow.create(input);
    }else if(route==='build-fixture')value=await workflow.runFixture(input.order_id);
    else if(route==='seed-fixture')value=await seedFixture();
    else if(route==='intake')value=await saveFixture(input);
    else if(route==='perspective-fixture'){await requireFixture(input.lead_id);value=await perspective.lead(input.lead_id)}
    else if(route==='review-fixture'){
      await requireFixture(input.lead_id);
      await adapter.humanReview({lead_id:input.lead_id,review_request_id:'review-workbench-fixture-0001',reviewer:'Fictional local reviewer',decision:'attorney_review_requested',evidence_ref:'local:workbench-click',simulated:true});
      value=await perspective.lead(input.lead_id);
    }else if(route==='suppress-fixture'){
      await requireFixture(input.lead_id);value=await adapter.suppress({lead_id:input.lead_id,reason:'opt_out_request'});
    }else if(route==='message-fixture'){
      const t=await requireFixture(input.lead_id);const saved=t.events.find(e=>e.type==='lead.saved');
      value=await outbox.prepare({lead_id:input.lead_id,event_id:saved.event_id,template_id:'sms-request-received'});
    }else{json(res,404,{error:'Provider, payment webhook and activation routes are not installed'});return true}
    json(res,200,value);return true;
  }});
  return {server,store,adapter,perspective,workflow,outbox,seedFixture};
}
export async function startWorkbench(options={}){
  const app=await createWorkbench(options);
  await new Promise((ok,fail)=>{app.server.once('error',fail);app.server.listen(0,'127.0.0.1',ok)});
  return app;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const directory=process.argv[2]||resolve(tmpdir(),'btl-local-fixtures-'+randomUUID());
  const app=await startWorkbench({directory,backendDir:process.argv[3]||backendDefault});
  console.log(`BTL LOCAL REVIEW: http://127.0.0.1:${app.server.address().port}/abuse/\nFictional fixture data only: ${directory}\nNo live providers, sends, payments or activation. Ctrl+C stops the server.`);
}
