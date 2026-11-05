// Run with PLAYWRIGHT_MODULE pointing to an installed playwright/index.mjs.
// Every browser request is fulfilled locally or aborted. No real webhook is called.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const legacyIntake = execFileSync('git', ['show', '4349045:btl/glassman/ssdi/intake.js'], {cwd:root,encoding:'utf8'});
const evidence = process.env.EVIDENCE_DIR || '/tmp/glassman-consent-evidence';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {}) });
const version = 'glassman-ssdi-002-consent-marketing-apes-2026-11-05-v1';
let passed = 0;
try {
 for (const door of ['', 'quiz/', 'talk-to-sofia/']) for (const checked of [false, true]) {
  const context = await browser.newContext({viewport:{width:390,height:844}, reducedMotion:'reduce'});
  const page = await context.newPage();
  const sent = [], errors = [];
  let accept = false, legacyMode = false, legacyEvent = null;
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
   const req=route.request(), url=new URL(req.url());
   if (req.method()==='POST') {
    assert.equal(url.hostname, 'hook.us2.make.com');
    sent.push(JSON.parse(new URLSearchParams(req.postData()).get('payload')));
    return route.fulfill({status:accept?200:503,contentType:'application/json',body:JSON.stringify(accept?{status:'received',receipt_id:'offline-receipt',mode:'test'}:{error:'offline retry'})});
   }
   if (url.origin!=='http://localhost:9876') return route.abort();
   if(legacyMode && url.pathname==='/glassman/ssdi/intake.js') return route.fulfill({contentType:'application/javascript',body:legacyIntake});
   let pathname=decodeURIComponent(url.pathname); if(pathname.endsWith('/')) pathname+='index.html';
   const file=path.resolve(root,'btl', '.'+pathname);
   assert.ok(file.startsWith(path.join(root,'btl')+path.sep));
   try {return await route.fulfill({path:file});} catch {return route.fulfill({status:404,body:''});}
  });
  async function open() {
   await page.goto('http://localhost:9876/glassman/ssdi/'+door+'?test=1&utm_source=offline');
   if(door==='quiz/') {
    await page.getByLabel('Your state',{exact:true}).selectOption('MA');
    for(const answer of ['48 to 64','Yes','Yes','No','No']) await page.locator('#qBody').getByRole('button',{name:new RegExp('^'+answer+'(?:$| )')}).click();
   }
   if(door==='talk-to-sofia/') await page.locator('#openCb').click();
   await page.locator('#first_name').fill('Offline'); await page.locator('#last_name').fill('Test');
   await page.locator('#email').fill('offline@example.invalid'); await page.locator('#phone').fill('2025550100');
  }
  if(door==='' && !checked) {
   legacyMode=true;await open();await page.locator('#submitBtn').click();
   await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));
   legacyEvent=sent.shift();assert.equal(legacyEvent.consent.sms.granted,true);legacyMode=false;
  }
  await open();
  const sms=page.getByRole('checkbox',{name:/Text messages \(optional\)/});
  assert.equal(await sms.isChecked(),false); assert.equal(await sms.getAttribute('required'),null);
  if(checked) await sms.check();
  const callText=await page.locator('#callDisclosure').innerText(), smsText=await page.locator('#smsDisclosure').innerText();
  for(const t of [callText,smsText]) {assert.match(t,/Marketing Apes/);assert.match(t,/Jeffrey Glassman Injury Lawyers/);}
  assert.doesNotMatch(callText,/text messages|may call or text/);
  assert.match(smsText,/Reply STOP.*HELP/);
  assert.match(await page.locator('footer').innerText(),/operated by Marketing Apes/);
  assert.equal(await page.locator('[data-sofia-call]').first().getAttribute('href'),'tel:+16692099040');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#consentBox').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#consentBox').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-desktop.png')});
  const historical=legacyEvent || {consent:{version:'glassman-ssdi-002-consent-clickwrap-2026-11-05',sms:{granted:true}},source:'make:btl-kit-web'};
  await page.evaluate(v=>sessionStorage.setItem('offline_historical_event',JSON.stringify(v)),historical);
  async function submitFailure() {await page.locator('#submitBtn').click();await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));}
  await submitFailure(); await submitFailure();
  assert.deepEqual(sent[1],sent[0]);
  await open(); if(checked) await page.locator('#consent_sms').check();
  await submitFailure(); assert.deepEqual(sent[2],sent[0]); // restored retry proof, including both channel times
  const first=sent[0];
  if(legacyEvent) {assert.notEqual(first.submission_id,legacyEvent.submission_id);assert.notEqual(first.consent.version,legacyEvent.consent.version);assert.equal(first.consent.sms.granted,false);}
  assert.equal(first.schema,'btl.intake.web/v1');assert.equal(first.tenant_id,'glassman');assert.equal(first.domain_id,'btl');assert.equal(first.campaign_id,'GLASSMAN-SSDI-002');
  assert.equal(first.attribution.utm_source,'offline');assert.equal(first.test.synthetic,true);
  assert.equal(first.routing.route,door==='quiz/'?'sofia_transfer':'sofia_screen');
  assert.equal(first.consent.version,version);assert.equal(first.consent.calls.granted,true);assert.equal(first.consent.sms.granted,checked);
  assert.equal(first.consent.calls.text,callText);assert.equal(first.consent.sms.text,smsText);
  for(const channel of ['calls','sms']) {assert.equal(first.consent[channel].version,version+'-'+channel);assert.equal(first.consent[channel].captured_at,first.consent.captured_at);assert.ok(Number.isFinite(Date.parse(first.consent[channel].captured_at)));}
  assert.equal(first.consent.sms.method,'checkbox');assert.equal(first.consent.calls.method,'clickwrap_submit');
  await page.locator('#consent_sms').setChecked(!checked); await submitFailure();
  assert.notEqual(sent[3].submission_id,first.submission_id);assert.equal(sent[3].consent.sms.granted,!checked);
  accept=true;await page.locator('#submitBtn').click();await page.locator('#formDone').waitFor({state:'visible'});
  assert.deepEqual(sent[4],sent[3]);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('offline_historical_event'))),historical);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('ee_retry_'+document.querySelector('#leadForm').dataset.pageId)),null);
  assert.equal((await page.evaluate(()=>window.dataLayer)).some(e=>JSON.stringify(e).includes('offline@example.invalid')),false);
  assert.deepEqual(errors,[]);
  console.log('PASS',door||'form',checked?'SMS checked':'SMS unchecked','retries/reload/edit/receipt/identity/layout');passed++;
  await context.close();
 }
 console.log(`${passed} offline browser scenarios passed; no external requests released.`);
} finally {await browser.close();}
