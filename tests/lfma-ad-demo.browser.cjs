const {chromium}=require('playwright');
const {readFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
// Test-only connected binding, injected by request interception. Not shipped in lfma/.
const FAKE_BINDING=`
const S=window.__fake={calls:[],statuses:['in_call'],verify:'verified',transfer:'requested',receipt:null,holdConfirm:false,held:[],transferTo:null};
export const integrationConfig=Object.freeze({status:'verified',contractVersion:'browser-fixture',voicePath:'phone',origin:'https://contract.test',
 disclosures:{callPurpose:'Fixture purpose',callerIdentity:'Fixture caller',recordingUse:'Fixture recording use'},recordingOptional:false,pollMs:40});
const wait=()=>new Promise(r=>setTimeout(r,30));
export const transport={
 async createSession(a){S.calls.push('createSession');await wait();return{sessionId:'fx-'+S.calls.length};},
 async launchVoice(){S.calls.push('launchVoice');return{state:'starting'};},
 async getStatus(){S.calls.push('getStatus');return{state:S.statuses.length>1?S.statuses.shift():S.statuses[0]};},
 async startVerification(){S.calls.push('startVerification');return{verification:'challenge_issued'};},
 async confirmVerification(){S.calls.push('confirmVerification');if(S.holdConfirm)return new Promise(r=>S.held.push(r));return{verification:S.verify};},
 async requestTransfer(id,phone){S.calls.push('requestTransfer');S.transferTo=phone;return{transfer:S.transfer};},
 async getReceipt(){S.calls.push('getReceipt');return S.receipt;}};`;
const NAME='Pat Example',EMAIL='pat@example.com';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const out='/tmp/lfma-ad-demo-review';mkdirSync(out,{recursive:true});
 async function open(width,{fake=false}={}){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[],urls=[];let forbidden=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('framenavigated',f=>urls.push(f.url()));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()!=='GET'||url.origin!=='https://lfma.demo'){forbidden++;return route.abort();}
   if(fake&&url.pathname==='/demo/ad-to-intake/integration-config.mjs')return route.fulfill({contentType:'text/javascript',body:FAKE_BINDING});
   const local=path.resolve('lfma','.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
   if(!local.startsWith(path.resolve('lfma')+path.sep)){forbidden++;return route.abort();}
   const type={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[path.extname(local)];
   try{return route.fulfill({contentType:type,body:readFileSync(local)});}catch{return route.fulfill({status:404,body:'Not found'});}
  });
  await page.goto('https://lfma.demo/demo/ad-to-intake/');
  return {page,errors,urls,forbidden:()=>forbidden};
 }
 const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 const visibleStep=page=>page.evaluate(()=>Number(document.querySelector('[data-step]:not([hidden])').dataset.step));
 async function noPII(page,urls){
  const leaked=await page.evaluate(([n,e])=>{const t=document.body.innerText;const v=[...document.querySelectorAll('input')].map(i=>i.value).join('|');
   return {text:t.includes(n)||t.includes(e)||t.includes('602'),values:v.includes(n)||v.includes(e)||/\d{3}/.test(v),storage:localStorage.length+sessionStorage.length,cookie:document.cookie,url:location.href};},[NAME,EMAIL]);
  assert.deepEqual(leaked,{text:false,values:false,storage:0,cookie:'',url:'https://lfma.demo/demo/ad-to-intake/'});
  for(const u of urls)assert.ok(!u.includes('pat')&&!u.includes('602')&&!u.includes('%40'),u);
 }
 async function startDemo(page){
  await page.locator('#p-name').fill(NAME);await page.locator('#p-email').fill(EMAIL);await page.locator('#start-demo').click();
  await page.getByRole('button',{name:'Learn more'}).click();await page.getByRole('button',{name:'Talk to Sofia'}).click();
 }
 try{
  for(const width of [375,1440]){
   // ---- Unconnected (shipped) ----
   const {page,errors,urls,forbidden}=await open(width);
   await page.screenshot({path:`${out}/${width}-01-start.png`,fullPage:true});
   assert.equal(await noOverflow(page),true);
   // Keyboard: skip link → journey; fields reachable and Start validates.
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
   await page.locator('#p-name').focus();await page.keyboard.type(NAME);await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'p-email');await page.keyboard.type('not-an-email');
   await page.locator('#start-demo').focus();await page.keyboard.press('Enter');
   assert.match(await page.locator('#start-error').textContent(),/valid work email/);assert.equal(await visibleStep(page),0);
   await page.locator('#p-email').fill(EMAIL);await page.locator('#start-demo').focus();await page.keyboard.press('Enter');
   assert.equal(await visibleStep(page),1);
   assert.match(await page.locator('[data-step="1"]').innerText(),/Pretend you are your ideal potential client\. Use the fictional case answers for this demo\./);
   await page.screenshot({path:`${out}/${width}-02-ad.png`,fullPage:true});
   await page.getByRole('button',{name:'Learn more'}).click();
   await page.screenshot({path:`${out}/${width}-03-page.png`,fullPage:true});
   await page.getByRole('button',{name:'Talk to Sofia'}).click();
   for(const id of ['#c-phone','#c-recording','#c-sms'])assert.equal(await page.locator(id).isChecked(),false);
   assert.match(await page.locator('[data-step="3"]').innerText(),/Sofia is an AI agent, not a person/);
   assert.equal(await page.locator('#live-pill').textContent(),'Not connected');
   assert.equal(await page.locator('#start-call').isDisabled(),true);
   await page.locator('#c-phone').check();await page.locator('#c-recording').check();await page.locator('#lead-phone').fill('602-555-0100');
   assert.equal(await page.locator('#start-call').isDisabled(),true,'live call must stay unavailable when unconnected');
   assert.equal(await page.locator('#transfer').isDisabled(),true);assert.equal(await page.locator('#recv-phone').isDisabled(),true);
   assert.match(await page.locator('#live-problems').innerText(),/No verified integration contract/);
   await page.screenshot({path:`${out}/${width}-04-sofia-unconnected.png`,fullPage:true});
   // Simulation: labelled, never live.
   await page.locator('#simulate').click();await page.locator('#simulate').click({trial:true}).catch(()=>{});
   assert.equal(await visibleStep(page),4);
   const receipt=await page.locator('#receipt').innerText();
   assert.match(receipt,/SIMULATION · NOT A REAL CALL/);assert.match(receipt,/no recording exists/);assert.match(receipt,/no transfer was attempted/);assert.match(receipt,/no text was sent/i);
   assert.doesNotMatch(receipt,/Completed|Delivered\.|LIVE SESSION/);
   assert.equal(await page.locator('audio').count(),0);
   await page.screenshot({path:`${out}/${width}-05-receipt-simulation.png`,fullPage:true});
   // Back, change a fictional answer → stale receipt gone, step 5 not reachable.
   await page.getByRole('button',{name:'← Back to Sofia'}).click();await page.getByRole('button',{name:'← Back to the page'}).click();
   await page.locator('#injury').selectOption('Injury unclear');
   assert.equal(await page.locator('#r-transfer').textContent(),'');
   // Changing identity after start invalidates progress.
   await page.locator('#reset').click();assert.equal(await visibleStep(page),0);
   await noPII(page,urls);
   for(const id of ['#c-phone','#c-recording','#c-sms'])assert.equal(await page.locator(id).isChecked(),false);
   assert.equal(await page.locator('#r-recording').textContent(),'');
   // Reduced motion and logo.
   await page.emulateMedia({reducedMotion:'no-preference'});
   await startDemo(page);assert.equal(await page.locator('[data-step="3"]').evaluate(el=>getComputedStyle(el).animationName),'step-in');
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('[data-step="3"]').evaluate(el=>getComputedStyle(el).animationName),'none');
   assert.equal(await page.locator('.logo-core img').evaluate(el=>el.complete&&el.naturalWidth===360),true);
   assert.equal(await noOverflow(page),true);
   await page.locator('#reset').click();await noPII(page,urls);
   assert.deepEqual(errors,[]);assert.equal(forbidden(),0);await page.close();

   // ---- Test-only fake-connected binding: state handling, never a real call ----
   const f=await open(width,{fake:true});const p=f.page;
   assert.match(await p.locator('#mode-tag').textContent(),/LIVE$/);
   await p.locator('#p-name').fill(NAME);await p.locator('#p-email').fill(EMAIL);await p.locator('#start-demo').click();
   await p.getByRole('button',{name:'Learn more'}).click();await p.getByRole('button',{name:'Talk to Sofia'}).click();
   assert.equal(await p.locator('.sim-box').isVisible(),false);
   assert.equal(await p.locator('#start-call').isDisabled(),true);
   await p.locator('#c-phone').check();await p.locator('#c-recording').check();
   await p.locator('#lead-phone').fill('12');await p.locator('#lead-phone').blur();
   assert.match(await p.locator('#lead-error').textContent(),/valid US phone/);assert.equal(await p.locator('#start-call').isDisabled(),true);
   await p.locator('#lead-phone').fill('602-555-0100');
   await p.evaluate(()=>{window.__fake.statuses=['starting','in_call'];});
   await p.locator('#start-call').evaluate(b=>{b.click();b.click();b.click();});
   await p.waitForFunction(()=>document.getElementById('live-pill').textContent==='In call');
   assert.equal(await p.evaluate(()=>window.__fake.calls.filter(c=>c==='createSession').length),1);
   assert.equal(await p.locator('#transfer').isDisabled(),true,'transfer needs a verified phone');
   await p.locator('#recv-phone').fill('602-555-0100');await p.locator('#verify-send').click();
   assert.match(await p.locator('#verify-state').textContent(),/different phone/);
   await p.locator('#recv-phone').fill('555');await p.locator('#verify-send').click();
   assert.match(await p.locator('#verify-state').textContent(),/not valid/);
   await p.evaluate(()=>{window.__fake.verify='failed';});
   await p.locator('#recv-phone').fill('480-555-0101');await p.locator('#verify-send').click();
   await p.locator('#verify-code').fill('000000');await p.locator('#verify-confirm').click();
   await p.waitForFunction(()=>document.getElementById('verify-state').textContent==='Verification failed');
   assert.equal(await p.locator('#transfer').isDisabled(),true);
   await p.evaluate(()=>{window.__fake.verify='verified';window.__fake.transfer='failed';});
   // Regression: editing the receiving number after a challenge abandons that challenge.
   await p.locator('#verify-send').click();
   await p.waitForFunction(()=>/ending 0101/.test(document.getElementById('verify-state').textContent));
   await p.locator('#verify-code').fill('123');
   await p.locator('#recv-phone').fill('480-555-0102');
   assert.equal(await p.locator('#verify-state').textContent(),'Not started');
   assert.equal(await p.locator('#verify-code').inputValue(),'');assert.equal(await p.locator('#verify-confirm').isDisabled(),true);
   assert.equal(await p.locator('#transfer').isDisabled(),true);
   await p.locator('#verify-send').click();await p.locator('#verify-code').fill('123456');await p.locator('#verify-confirm').click();
   await p.waitForFunction(()=>document.getElementById('verify-state').textContent==='Verified (number ending 0102)');
   assert.equal(await p.locator('#recv-phone').isDisabled(),true,'verified number is locked');
   // Change number is the only way to edit a verified number, and it drops the verification.
   await p.locator('#change-number').click();
   assert.equal(await p.locator('#verify-state').textContent(),'Not started');assert.equal(await p.locator('#transfer').isDisabled(),true);
   await p.locator('#recv-phone').fill('480-555-0101');
   await p.locator('#verify-send').click();await p.locator('#verify-code').fill('123456');await p.locator('#verify-confirm').click();
   await p.waitForFunction(()=>document.getElementById('verify-state').textContent==='Verified (number ending 0101)');
   assert.equal(await p.locator('#recv-phone').inputValue(),'480-555-0101');
   await p.locator('#transfer').click();
   assert.equal(await p.evaluate(()=>window.__fake.transferTo),'+14805550101','transfer targets the displayed, verified number');
   await p.waitForFunction(()=>/Failed/.test(document.getElementById('transfer-state').textContent));
   await p.screenshot({path:`${out}/${width}-06-fixture-transfer-failed.png`,fullPage:true});
   await p.evaluate(()=>{window.__fake.receipt={recording:{state:'processing'},transfer:{state:'failed'},sms:{state:'not_consented'}};window.__fake.statuses=['processing','ready'];});
   await p.waitForFunction(()=>!document.getElementById('view-receipt').hidden);
   await p.locator('#view-receipt').click();
   const live=await p.locator('#receipt').innerText();
   assert.match(live,/LIVE SESSION/);assert.match(live,/Processing\. Not available yet\./);assert.match(live,/Failed\. The call was not transferred\./);
   assert.match(live,/Not available for this session\./);assert.doesNotMatch(live,/Completed|Delivered\./);
   assert.equal(await p.locator('audio').count(),0);
   await p.evaluate(()=>{window.__fake.receipt={recording:{state:'failed'},transfer:{state:'failed'}};});
   await p.waitForFunction(()=>/Recording failed/.test(document.getElementById('r-recording').textContent));
   await p.screenshot({path:`${out}/${width}-07-fixture-receipt-failed.png`,fullPage:true});
   // Stale-session cleanup: a new participant never sees the previous receipt.
   await p.locator('#reset').click();await noPII(p,f.urls);
   assert.equal(await p.locator('#live-pill').textContent(),'Not connected');assert.equal(await p.locator('#r-recording').textContent(),'');
   await p.locator('#p-name').fill('Second Person');await p.locator('#p-email').fill('second@example.com');await p.locator('#start-demo').click();
   await p.evaluate(()=>document.querySelector('[data-go="4"]').click());
   assert.equal(await visibleStep(p),3,'receipt is unreachable without a receipt; falls back to Sofia');
   for(const id of ['#c-phone','#c-recording','#c-sms'])assert.equal(await p.locator(id).isChecked(),false);
   await p.locator('#c-phone').check();await p.locator('#c-recording').check();await p.locator('#c-sms').check();await p.locator('#lead-phone').fill('602-555-0100');
   await p.evaluate(()=>{const S=window.__fake;S.statuses=['in_call'];S.verify='verified';S.holdConfirm=true;});
   await p.locator('#start-call').click();await p.waitForFunction(()=>document.getElementById('live-pill').textContent==='In call');
   await p.locator('#recv-phone').fill('480-555-0101');await p.locator('#verify-send').click();
   await p.locator('#verify-code').fill('123456');await p.locator('#verify-confirm').click();
   await p.waitForFunction(()=>document.getElementById('verify-state').textContent==='Checking…');
   // Identity edited mid-verification: the late "verified" must not surface for anyone.
   for(const back of ['← Back to the page','← Back to the ad','← Back'])await p.getByRole('button',{name:back,exact:true}).click();
   await p.locator('#p-email').fill('third@example.com');
   await p.evaluate(()=>{const S=window.__fake;S.held.shift()({verification:'verified'});});
   await p.locator('#start-demo').click();await p.getByRole('button',{name:'Learn more'}).click();await p.getByRole('button',{name:'Talk to Sofia'}).click();
   for(const id of ['#c-phone','#c-recording','#c-sms'])assert.equal(await p.locator(id).isChecked(),false,id+' carried to new identity');
   for(const id of ['#lead-phone','#recv-phone','#verify-code'])assert.equal(await p.locator(id).inputValue(),'',id+' carried to new identity');
   assert.equal(await p.locator('#live-pill').textContent(),'Not connected');
   assert.equal(await p.locator('#verify-state').textContent(),'Not started');
   assert.equal(await p.locator('#change-number').isHidden(),true);assert.equal(await p.locator('#transfer').isDisabled(),true);
   assert.equal(await p.locator('#start-call').isDisabled(),true);
   assert.deepEqual(f.errors,[]);assert.equal(f.forbidden(),0);await p.close();
  }
  console.log('PASS: 375/1440px start validation + keyboard, AI disclosure, unchecked separate consents, unconnected live controls disabled, labelled simulation receipt, back/answer/identity invalidation, reset clears PII (DOM, inputs, URL, storage), reduced motion, logo, no overflow/errors/external requests; fixture binding: single session on repeated clicks, wrong/same/unverified phone, edit-after-challenge, change number, stale verification across identity change, no consent/phone carry-over, failed verification, failed transfer, processing/failed recording, stale-session cleanup.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
