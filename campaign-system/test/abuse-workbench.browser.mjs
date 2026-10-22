// Existing Playwright only; all external requests blocked. No live provider verification.
import {createRequire} from 'node:module';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {startWorkbench} from '../abuse/local-server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT);
const directory=await mkdtemp(join(tmpdir(),'btl-browser-workbench-'));
const shots=process.env.SHOTS;
if(!shots)throw Error('SHOTS required');await mkdir(shots,{recursive:true});
const app=await startWorkbench({directory,backendDir:process.env.BTL_ABUSE_BACKEND_DIR});
const origin=`http://127.0.0.1:${app.server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM,headless:true});
const errors=[],external=[],badImages=[],checks=[];
const context=await browser.newContext();
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.hostname);return r.abort()}return r.continue()});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.request().resourceType()==='image'&&!r.ok())badImages.push(r.url())});
const check=(name,value)=>{assert.ok(value,name);checks.push(name)};
try{
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/abuse/');await page.waitForSelector('#adCards img');
 const initial=await(await page.request.get(origin+'/abuse/api/snapshot')).json();
 for(const ad of initial.ads){const local=new URL(ad.local_url,origin),remote=new URL(ad.destination);check(`attribution parity ${ad.path}`,['utm_source','utm_medium','utm_campaign','utm_content'].every(k=>local.searchParams.get(k)===remote.searchParams.get(k)));}
 await page.locator('#orderForm button').click();await page.waitForFunction(()=>document.querySelector('#orderStatus').textContent.includes('DRAFT NOT SENT'));
 check('invoice draft only',await page.locator('#orderStatus').innerText());
 await page.locator('#fixtureBuild').click();await page.waitForFunction(()=>document.querySelector('#jobs').textContent.includes('readiness: done'));
 check('six fixture build steps',await page.locator('#jobs p').count()===6);
 await page.locator('#seedLead').click();await page.waitForSelector('#timeline .stage');
 check('call pending, no fabricated call',/call: pending/.test(await page.locator('#timeline').innerText()));
 await page.locator('#fixtureReview').click();await page.waitForFunction(()=>document.querySelector('#timeline').textContent.includes('human_review.recorded'));
 check('review written only after click',/SIMULATED/.test(await page.locator('#timeline').innerText()));
 await page.locator('#prepareMessage').click();await page.waitForFunction(()=>document.querySelector('#messageStatus').textContent.length>0);
 check('no send claim',!/sent successfully/i.test(await page.locator('#messageStatus').innerText()));
 for(const [width,height]of [[1440,1000],[375,812]]){
  await page.setViewportSize({width,height});await page.evaluate(async()=>{for(const img of document.images){img.loading='eager';await img.decode().catch(()=>{})}});
  check(`operator no overflow ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:join(shots,`workbench-${width}x${height}.png`),fullPage:true});
  await page.locator('#perspective').screenshot({path:join(shots,`perspective-${width}x${height}.png`)});
 }
 for(const [path,form,box]of [['form','laneForm','landDone'],['voice','talkCb','talkDone']]){
  const route=initial.ads.find(a=>a.path===path).local_url;
  await page.goto(origin+route);
  if(path==='voice'){check('voice-first disabled primary',await page.locator('#voiceUnavailable').isDisabled());check('callback initially secondary and closed',await page.locator('#cbPanel').isHidden());await page.click('#openCb');}
  await page.fill(`#${form} #first_name`,'Fictional Avery');await page.fill(`#${form} #phone`,'3105550143');
  if(await page.locator(`#${form} #email`).count())await page.fill(`#${form} #email`,'fixture@example.test');await page.check(`#${form} #consent_calls`);await page.click(`#${form} button[type=submit]`);
  await page.waitForFunction(box=>[...document.querySelectorAll(`#${box} [data-state]`)].some(e=>e.dataset.state==='saved'&&!e.hidden),box,{timeout:7000});
  check(`actual local adapter receipt ${form}`,true);
 }
 await page.goto(origin+initial.ads.find(a=>a.path==='quiz').local_url);
 for(const index of [0,1,0,0,2,0]){const prompt=await page.locator('#qPrompt').innerText();await page.locator('#qChoices button').nth(index).click();await page.waitForFunction(previous=>document.querySelector('#qStep').hidden||document.querySelector('#qPrompt').textContent!==previous,prompt);}
 check('six real quiz answers summarized',await page.locator('#rSum li').count()===6);
 await page.click('#rContinue');await page.fill('#quizForm #first_name','Fictional Quiz');await page.fill('#quizForm #phone','3105550146');await page.check('#quizForm #consent_calls');
 const pending=page.waitForResponse(r=>r.url().endsWith('/abuse/api/intake')&&r.request().method()==='POST');await page.click('#quizForm button[type=submit]');const response=await pending,body=response.request().postDataJSON(),receipt=await response.json();
 check('actual quiz adapter receipt',response.ok()&&receipt.saved===true&&receipt.simulated===true&&receipt.dispatch==='disabled');
 check('approved quiz answer IDs preserved',JSON.stringify(body.answers.map(a=>[a.question_id,a.answer_id]))===JSON.stringify([['age','under18'],['current_age','30_40'],['claim_type','la_juvenile_detention'],['where','juvenile'],['when','2005_2019'],['lawyer','no']]));
 check('quiz attribution reaches intake',body.attribution.utm_content==='la-four-questions'&&body.attribution.utm_campaign==='btl-ca-abuse-la-county-v1');
 for(const route of ['/privacy-policy/','/sms-terms/','/terms-and-conditions/']){const response=await page.goto(origin+route);check(`existing policy reachable ${route}`,response.ok());}
 const aggregate=await(await page.request.get(origin+'/abuse/api/snapshot')).json();
 check('simulation excluded from runtime',aggregate.runtime.metrics.leads===null&&aggregate.local.real.leads===0&&aggregate.local.simulated_leads_excluded===3);
 check('no external requests',external.length===0);check('no page errors',errors.length===0);check('images loaded',badImages.length===0);
 await writeFile(join(shots,'receipt.json'),JSON.stringify({status:'local-only',checks,external,errors,badImages,live_provider_proof:false},null,2));
 console.log(JSON.stringify({pass:checks.length,errors,external,badImages,shots}));
}finally{await browser.close();await new Promise(ok=>app.server.close(ok));await rm(directory,{recursive:true,force:true})}
