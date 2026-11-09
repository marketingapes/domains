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
const version = 'glassman-ssdi-002-consent-marketing-apes-2026-11-06-v1';
let passed = 0;
try {
 for (const door of ['', 'quiz/', 'talk-to-sofia/']) for (const checked of [false, true]) {
  const context = await browser.newContext({viewport:{width:390,height:844}, reducedMotion:'reduce'});
  const page = await context.newPage();
  const sent = [], errors = [];
  let accept = false, receiptMissing = false, legacyMode = false, legacyEvent = null;
  const duplicate = checked && door==='talk-to-sofia/';
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
   const req=route.request(), url=new URL(req.url());
   if (req.method()==='POST') {
    assert.equal(url.hostname, 'hook.us2.make.com');
    sent.push(JSON.parse(new URLSearchParams(req.postData()).get('payload')));
    return route.fulfill({status:accept?200:503,contentType:'application/json',body:JSON.stringify(accept?{status:duplicate?'duplicate':'received',...(receiptMissing?{}:{receipt_id:'offline-receipt'}),mode:checked?'live':'test'}:{error:'offline retry'})});
   }
   if (url.hostname === "api.trustedform.com") return route.fulfill({contentType:"application/javascript",body:'document.querySelector("[name=xxTrustedFormCertUrl]").value="https://cert.trustedform.com/"+"a".repeat(40);'});
        if (url.origin!=='http://localhost:9876') return route.abort();
   if(legacyMode && url.pathname==='/glassman/ssdi/intake.js') return route.fulfill({contentType:'application/javascript',body:legacyIntake});
   let pathname=decodeURIComponent(url.pathname); if(pathname.endsWith('/')) pathname+='index.html';
   const file=path.resolve(root,'btl', '.'+pathname);
   assert.ok(file.startsWith(path.join(root,'btl')+path.sep));
   try {return await route.fulfill({path:file});} catch {return route.fulfill({status:404,body:''});}
  });
  async function open() {
   await page.goto('http://localhost:9876/glassman/ssdi/'+door+'?'+(checked?'':'test=1&')+'utm_source=offline');
   if(door==='quiz/') {
    await page.getByLabel('Your state',{exact:true}).selectOption('MA');
    for(const answer of ['48 to 64','Yes','Yes','No','No']) await page.locator('#qBody').getByRole('button',{name:new RegExp('^'+answer+'(?:$| )')}).click();
   }
   if(door==='talk-to-sofia/') await page.locator('#openCb').click();
   await page.locator('#first_name').fill('Offline'); await page.locator('#last_name').fill('Test');
   await page.locator('#email').fill('offline@example.invalid'); await page.locator('#phone').fill('2025550100');
   await page.locator('#best_time').selectOption(checked?'morning':'asap');
  }
  if(door==='' && !checked) {
   legacyMode=true;await open();await page.locator('#submitBtn').click();
   await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));
   legacyEvent=sent.shift();assert.equal(legacyEvent.consent.sms.granted,true);legacyMode=false;
  }
  await open();
  assert.equal(await page.locator('#leadForm input[type=checkbox]').count(),0); // one tap-to-agree line, no checkboxes
  const callText=await page.locator('#callDisclosure').innerText();
  assert.match(callText,/^By tapping “Request my free call,” you agree that Marketing Apes and Jeffrey Glassman Injury Lawyers/);
  for(const re of [/may call and text you/,/AI or prerecorded voice/,/Calls are recorded/,/not a condition of any purchase or service/,/Msg frequency varies/,/Msg & data rates may apply/,/Reply STOP to opt out, HELP for help/]) assert.match(callText,re);
  assert.equal(await page.getByRole('link',{name:'SMS Terms',exact:true}).getAttribute('href'),'https://besttortlawyers.com/sms-terms/');
  const notice=await page.locator('#campaignPrivacy').innerText();
  assert.match(notice,/Marketing Apes operates this page for inquiries to Jeffrey Glassman Injury Lawyers/);
  assert.match(notice,/For this campaign, we use the information you provide to handle your inquiry and contact choices/);
  assert.match(notice,door==='quiz/'?/Requests for a Glassman review are shared with Jeffrey Glassman Injury Lawyers and the service providers running this campaign/:/share it with Jeffrey Glassman Injury Lawyers and the service providers running this campaign/);
  assert.match(notice,/Marketing Apes will ask your permission before referring your inquiry to another law firm/);
  assert.doesNotMatch(await page.locator('body').innerText(),/Never sold|It is not sold/i);
  const steps=await page.locator('.steps').innerText();
  assert.match(steps,/Call Sofia.*Call for an automated intake conversation/s);
  assert.match(steps,/Or request a callback.*Submit your contact details for team review/s);
  assert.match(steps,/A live transfer may be offered when available/);
  assert.match(steps,/Your chosen time is a preference, not a confirmed appointment/);
  assert.doesNotMatch(await page.locator('body').innerText(),/24\/7|same call|Call any time|24 to 48 hours|next few minutes/);
  const resultCopies=await page.evaluate(()=>['2026-11-05T16:00:00Z','2026-11-08T03:00:00Z'].map(t=>SSDI_RULES.resultText('QUALIFIED',new Date(t))));
  for(const copy of resultCopies) {assert.match(copy,/team will review your callback request/);assert.doesNotMatch(copy,/next few minutes|will call you|same call/);}
  await page.locator('.steps').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-paths-mobile.png')});
  assert.equal(await page.locator('img[src*="glassman-ssdi-form-1080x1080"]').count(),0);
  if(door) {
   const approvedImage=page.locator('img[src*="glassman-ssdi-form-1254x1254"]');
   await approvedImage.scrollIntoViewIfNeeded();
   await approvedImage.evaluate(img=>img.decode());
   assert.deepEqual(await approvedImage.evaluate(img=>[img.naturalWidth,img.naturalHeight]),[1254,1254]);
   const box=await approvedImage.boundingBox();assert.ok(Math.abs(box.width-box.height)<1);
   await approvedImage.locator('..').screenshot({path:path.join(evidence,door.replaceAll('/','')+'-'+checked+'-approved-card.png')});
  }


  assert.equal(await page.getByRole('link',{name:'How this campaign uses your information'}).getAttribute('href'),'#campaignPrivacy');
  for(const [label,url] of [['BTL Privacy Policy','https://besttortlawyers.com/privacy-policy/'],['BTL SMS Terms','https://besttortlawyers.com/sms-terms/'],['BTL Terms','https://besttortlawyers.com/terms-and-conditions/'],['Marketing Apes website privacy','https://marketingapes.com/privacy/'],['Firm Privacy Policy','https://www.jeffreysglassman.com/privacy-policy.html'],['Firm Disclaimer','https://www.jeffreysglassman.com/disclaimer.html']]) assert.equal(await page.getByRole('link',{name:label,exact:true}).getAttribute('href'),url);
  await page.locator('footer').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-privacy-mobile.png')});
  assert.equal(await page.locator('[data-sofia-call]').first().getAttribute('href'),'tel:+13393296165');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#consentBox').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#consentBox').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-desktop.png')});
  const historical=legacyEvent || {consent:{version:'glassman-ssdi-002-consent-clickwrap-2026-11-05',sms:{granted:true}},source:'make:btl-kit-web'};
  await page.evaluate(v=>sessionStorage.setItem('offline_historical_event',JSON.stringify(v)),historical);
  async function submitFailure() {await page.locator('#submitBtn').click();await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));assert.equal(await page.locator('#formDone').isVisible(),false);assert.equal((await page.evaluate(()=>window.dataLayer)).some(e=>e.event==='generate_lead'),false);}
  await submitFailure(); await submitFailure();
  assert.deepEqual(sent[1],sent[0]);
  await open();
  await submitFailure(); assert.deepEqual(sent[2],sent[0]); // restored retry proof, including both channel times
  const first=sent[0];
  if(legacyEvent) {assert.notEqual(first.submission_id,legacyEvent.submission_id);assert.notEqual(first.consent.version,legacyEvent.consent.version);assert.equal(first.consent.sms.granted,true);}
  assert.equal(first.schema,'btl.intake.web/v1');assert.equal(first.tenant_id,'glassman');assert.equal(first.domain_id,'btl');assert.equal(first.campaign_id,'GLASSMAN-SSDI-002');
  assert.equal(first.attribution.utm_source,'offline');assert.equal(first.test.synthetic,!checked);
  assert.equal(first.routing.route,door==='quiz/'?'sofia_transfer':'sofia_screen');
  assert.equal(first.consent.version,version);assert.equal(first.consent.calls.granted,true);assert.equal(first.consent.sms.granted,true);
  assert.equal(first.consent.calls.text,callText);assert.equal(first.consent.sms.text,callText);assert.equal(first.consent.text,callText);
  for(const channel of ['calls','sms']) {assert.equal(first.consent[channel].version,version+'-'+channel);assert.equal(first.consent[channel].captured_at,first.consent.captured_at);assert.ok(Number.isFinite(Date.parse(first.consent[channel].captured_at)));}
  assert.equal(first.consent.sms.method,'clickwrap_submit');assert.equal(first.consent.calls.method,'clickwrap_submit');
  await page.locator('#best_time').selectOption(checked?'afternoon':'midday'); await submitFailure(); // an edit gets a new id
  assert.notEqual(sent[3].submission_id,first.submission_id);assert.equal(sent[3].callback.window,checked?'afternoon':'midday');
  accept=true;receiptMissing=true;await submitFailure(); // HTTP 200 without a receipt is not success
  assert.deepEqual(sent[4],sent[3]);
  receiptMissing=false;await page.locator('#submitBtn').click();await page.locator('#formDone').waitFor({state:'visible'});
  assert.deepEqual(sent[5],sent[3]);
  assert.equal(await page.locator('#doneText').innerText(),'Your callback request was received. The team will review it. Your requested time: '+sent[5].callback.label+'.');
  assert.match(await page.locator('#formDone').innerText(),/preference, not a confirmed appointment/);
  assert.doesNotMatch(await page.locator('#formDone').innerText(),/will call|next few minutes|Keep your phone nearby/);
  const conversions=(await page.evaluate(()=>window.dataLayer)).filter(e=>e.event==='generate_lead');
  assert.equal(conversions.length,checked&&!duplicate?1:0);
  if(conversions.length) assert.equal(conversions[0].lead_id,'offline-receipt');
  await page.evaluate(()=>document.querySelector('#leadForm').requestSubmit());assert.equal(sent.length,6);
  await page.locator('#formDone').screenshot({path:path.join(evidence,(door.replaceAll('/','')||'form')+'-'+checked+'-received.png')});
  assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('offline_historical_event'))),historical);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('ee_retry_'+document.querySelector('#leadForm').dataset.pageId)),null);
  assert.equal((await page.evaluate(()=>window.dataLayer)).some(e=>JSON.stringify(e).includes('offline@example.invalid')),false);
  assert.deepEqual(errors,[]);
  console.log('PASS',door||'form',checked?'live mode':'test mode','retries/reload/edit/receipt/identity/layout');passed++;
  await context.close();
 }
 console.log(`${passed} offline browser scenarios passed; no external requests released.`);
} finally {await browser.close();}
