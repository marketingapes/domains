import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';
const origin='https://smartlifeinsurancequote.com', endpoint=origin+'/api/consultation';
const requestId='f22189c2-188c-4cb1-aed7-42faf87cb961';
const env={TURNSTILE_SITE_KEY:'public-example',TURNSTILE_SECRET_KEY:'test-only',MAKE_INTAKE_URL:'https://hook.us2.make.com/example',MAKE_INTAKE_KEY:'test-only'};
const submit=(data={}, originHeader=origin)=>new Request(endpoint,{method:'POST',headers:{origin:originHeader,'content-type':'application/json'},body:JSON.stringify({name:'Jamie Example',phone:'202-555-0143',token:'fixture',requestId,source:'instagram',...data})});
const ver={success:true,hostname:'smartlifeinsurancequote.com',action:'sliq_consult'};
const result=(value,status=200)=>new Response(JSON.stringify(value),{status});
test('returns success only on explicit matching storage receipt; no automated contact',async()=>{
  const got=[];
  const response=await worker.fetch(submit(),env,null,async(url,init)=>{
    got.push(String(url)); if(got.length===1)return result(ver);
    const body=JSON.parse(init.body);
    assert.equal(body.phone,'+12025550143');assert.equal(body.source,'instagram');
    assert.equal(body.requestId,requestId);assert.equal(body.routing,'human_callback_only');
    assert.equal(body.smsAllowed,false);assert.equal(body.aiCallAllowed,false);
    assert(!('token' in body));assert.equal(init.headers['x-make-apikey'],'test-only');
    return result({stored:true,requestId});
  });
  assert.deepEqual(await response.json(),{received:true});assert.equal(got.length,2);
});
test('fails closed without config, invalid origin or malformed contact',async()=>{
  const unused=()=>assert.fail('provider should not receive anything');
  assert.equal((await worker.fetch(submit(),{},null,unused)).status,503);
  assert.equal((await worker.fetch(submit({},'https://example.com'),env,null,unused)).status,403);
  assert.equal((await worker.fetch(submit({phone:'555-999'}),env,null,unused)).status,400);
  assert.equal((await worker.fetch(submit({name:'A'.repeat(9000)}),env,null,unused)).status,413);
  assert.equal((await worker.fetch(submit({requestId:'not-an-id'}),env,null,unused)).status,400);
});
test('rejects wrong or expired bot check, and redirects or mismatched receipts never report success',async()=>{
  let n=0;
  assert.equal((await worker.fetch(submit(),env,null,()=>{n++;return result({...ver,action:'other'});})).status,400);assert.equal(n,1);
  n=0;
  assert.equal((await worker.fetch(submit(),env,null,()=>{return ++n===1?result(ver):result({stored:true,requestId:'different'});})).status,503);
  n=0;
  assert.equal((await worker.fetch(submit(),{...env,MAKE_INTAKE_URL:'https://example.com'},null,()=>{n++;return result(ver);})).status,503);assert.equal(n,1);
});
test('public config never returns secrets',async()=>{
 const r=await worker.fetch(new Request(endpoint+'/config'),env,null,()=>assert.fail());
 assert.deepEqual(await r.json(),{siteKey:env.TURNSTILE_SITE_KEY});
});
test('preserves approved channel source labels without sending contact data to ad platforms',async()=>{
 for(const source of ['google','facebook','instagram','tiktok','openai','youtube']){
  let i=0;
  const r=await worker.fetch(submit({source}),env,null,(_url,init)=>{
   if(++i===1)return result(ver);
   assert.equal(JSON.parse(init.body).source,source);
   return result({stored:true,requestId});
  });
  assert.deepEqual(await r.json(),{received:true});assert.equal(i,2);
 }
});
