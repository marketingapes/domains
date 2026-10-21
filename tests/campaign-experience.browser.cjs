// Local synthetic browser QA; every non-loopback request is aborted and fails the suite.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {mkdir,writeFile}=require('node:fs/promises');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const load=p=>import(pathToFileURL(join(__dirname,'..',p)));
 const [{dryRun},{experienceFixture}]=await Promise.all([load('campaign-system/mass-tort-cli.mjs'),load('campaign-system/test/fixtures/campaign-experience.mjs')]);
 const base=experienceFixture(), built=dryRun(base), missing=experienceFixture('talc');
 const unsafe=experienceFixture();unsafe.experience.headline='</h1><img src=x onerror="window.pwned=true">';unsafe.experience.faqs[0].answer='</script><script>window.pwned=true</script>';
 const noConsent=experienceFixture();noConsent.consent.callsText='';
 const pages={'/paraquat/':built.assets['form.html'],'/paraquat/quiz/':built.assets['quiz.html'],'/paraquat/talk-to-sofia/':built.assets['sofia.html'],'/missing/':dryRun(missing).assets['form.html'],'/unsafe/':dryRun(unsafe).assets['form.html'],'/no-consent/':dryRun(noConsent).assets['form.html']};
 const blank=experienceFixture();blank.screening.qualifies=[];blank.screening.disqualifies=[];blank.experience.faqs=[];pages['/empty/']=dryRun(blank).assets['quiz.html'];
 const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}res.writeHead(pages[req.url]?200:404,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(pages[req.url]||'Not found');});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin=`http://127.0.0.1:${server.address().port}`,shots=process.env.SHOTS||'/tmp/btl-experience-shots',receipts=[];
 await mkdir(shots,{recursive:true});let browser;
 try {
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})});
  for(const width of [390,1440]) {
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),external=[],errors=[],requests=[];
   context.on('request',r=>requests.push({url:r.url(),method:r.method()}));
   await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();external.push(route.request().url());return route.abort();});
   page.on('pageerror',e=>errors.push(e.message));
   const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}px`);
   const payload=async()=>JSON.parse(await page.locator('#payload').textContent());
   const fillAnswers=async()=>{await page.locator('#qualifies-0').selectOption('Not sure');await page.locator('#disqualifies-0').selectOption('No');};
   const fillContact=async()=>{await page.locator('#contact-name').fill('Synthetic Demo');await page.locator('#contact-phone').fill('202-555-0100');};
   await page.goto(origin+'/paraquat/quiz/');await noOverflow();
   await page.keyboard.press('Tab');assert.equal(await page.locator('.skip').evaluate(el=>el===document.activeElement),true);
   assert.equal(await page.locator('#calls-consent').isChecked(),false);assert.equal(await page.locator('#contact').isVisible(),false);
   await page.locator('#demo-action').click();assert.equal(await page.locator('#handoff').isVisible(),false);
   await fillAnswers();await page.locator('#demo-action').click();let quiz=await payload();
   assert.equal(quiz.source_path,'quiz');assert.equal(quiz.contact,null);assert.deepEqual(quiz.consent_scope,{calls:false,sms:false});
   assert.equal(quiz.prior_answers[0].value,'Not sure');assert.equal(quiz.prior_answers[0].source,'quiz');assert.ok(quiz.prior_answers[0].confirmed_at);
   await page.screenshot({path:join(shots,`quiz-${width}.png`),fullPage:true});
   await page.locator('#demo-action').click();assert.equal((await payload()).submission_id,quiz.submission_id);assert.match(await page.locator('#demo-status').innerText(),/already prepared/);
   await page.locator('#continue-sofia').click();assert.equal(await page.locator('#qualifies-0').inputValue(),'Not sure');assert.equal(await page.locator('#contact').isVisible(),true);
   assert.equal(await page.locator('#path-heading').evaluate(el=>el===document.activeElement),true);
   await fillContact();await page.locator('#demo-action').click();assert.equal(await page.locator('#handoff').isVisible(),false);assert.equal(await page.locator('#calls-consent').isChecked(),false);
   await page.locator('#calls-consent').check();await page.locator('#demo-action').click();const sofia=await payload();
   assert.equal(sofia.source_path,'sofia');assert.deepEqual(sofia.prior_answers,quiz.prior_answers);assert.equal(sofia.consent_scope.sms,false);assert.equal(sofia.lead_id,null);assert.equal(sofia.receipt,null);assert.equal(sofia.activation,false);assert.match(await page.locator('#demo-status').innerText(),/Voice is unconnected/);
   await page.locator('#voice-next').click();assert.match(await page.locator('#voice-prompt').innerText(),/Synthetic paraquat question/);
   await page.locator('#faq-choice').selectOption('0');assert.match(await page.locator('#faq-answer').innerText(),/No callback, SMS or firm submission/);
   await page.locator('#faq-choice').selectOption('human');assert.match(await page.locator('#faq-answer').innerText(),/human intake reviewer must answer/);
   await page.screenshot({path:join(shots,`sofia-${width}.png`),fullPage:true});await noOverflow();
   await page.locator('[data-mode="open"]').click();assert.equal(await page.locator('#qualifies-0').inputValue(),'Not sure');
   await page.locator('#demo-action').click();const form=await payload();assert.equal(form.request_type,'callback_request');assert.deepEqual(form.prior_answers,quiz.prior_answers);
   await page.locator('#contact-phone').fill('bad');await page.locator('#demo-action').click();assert.equal(await page.locator('#handoff').isVisible(),false);
   await page.locator('#contact-phone').fill('202-555-0101');await page.locator('#demo-action').click();assert.notEqual((await payload()).submission_id,form.submission_id);
   await page.locator('#clear-demo').click();assert.equal(await page.locator('#contact-name').inputValue(),'');assert.equal(await page.locator('#calls-consent').isChecked(),false);assert.equal(await page.locator('#payload').textContent(),'');
   await page.screenshot({path:join(shots,`form-${width}.png`),fullPage:true});
   for(const path of ['/paraquat/','/paraquat/talk-to-sofia/']){await page.goto(origin+path);await noOverflow();assert.equal(await page.locator('#calls-consent').isChecked(),false);assert.ok(await page.locator('.hero-media img').evaluate(el=>el.complete&&el.naturalWidth>0));}
   assert.equal(await page.locator('input[type=checkbox]:checked').count(),0);
   await page.goto(origin+'/missing/');await noOverflow();assert.match(await page.locator('.requirements').first().innerText(),/Image configuration required/);assert.equal(await page.locator('.hero-media img').count(),0);
   assert.doesNotMatch(await page.locator('#screening').innerText(),/Synthetic paraquat/);assert.match(await page.locator('#screening').innerText(),/Synthetic talc/);
   await page.goto(origin+'/no-consent/');await fillAnswers();await fillContact();await page.locator('#demo-action').click();assert.match(await page.locator('#demo-status').innerText(),/Approved calls consent is missing/);assert.equal(await page.locator('#handoff').isVisible(),false);
   await page.goto(origin+'/empty/');await page.locator('#demo-action').click();assert.match(await page.locator('#demo-status').innerText(),/Screening configuration required/);await page.locator('#faq-choice').selectOption('human');assert.match(await page.locator('#faq-answer').innerText(),/human intake reviewer/);
   await page.goto(origin+'/unsafe/');assert.equal(await page.locator('h1 img').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);assert.match(await page.locator('h1').innerText(),/onerror/);await page.locator('#faq-choice').selectOption('0');assert.match(await page.locator('#faq-answer').innerText(),/<script>/);assert.equal(await page.evaluate(()=>window.pwned),undefined);
   assert.equal(await page.locator('input:not([type=checkbox]),textarea,select').evaluateAll(els=>els.every(el=>el.labels?.length||el.hasAttribute('aria-label'))),true);
   assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
   await noOverflow();assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(await page.evaluate(()=>Object.keys(sessionStorage)),[]);assert.equal((await context.cookies()).length,0);
   assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.method==='GET'));
   receipts.push({width,checks:'form, quiz, Sofia, shared provenance, validation, consent, repeated preview IDs, changed input, FAQ fallback, empty/error states, missing assets, tort isolation, escaping, keyboard skip/focus, reduced motion, overflow, loaded images, empty storage',externalRequests:external.length,mutatingRequests:requests.filter(r=>r.method!=='GET').length,pageErrors:errors});
   await context.close();console.log(`PASS ${width}px consumer experience`);
  }
  const {startSetupServer}=await load('campaign-system/setup-server.mjs');
  const setup=await startSetupServer();
  try {
   const setupOrigin=`http://127.0.0.1:${setup.address().port}`;
   for(const width of [390,1440]) {
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),external=[];
    await context.route('**/*',route=>{if(route.request().url().startsWith(setupOrigin+'/'))return route.continue();external.push(route.request().url());return route.abort();});
    await page.goto(setupOrigin);
    await page.locator('#import').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(base))});
    await page.locator('#results').waitFor({state:'visible'});
    assert.equal(await page.locator('[name="experience.headline"]').inputValue(),base.experience.headline);
    const frame=page.frameLocator('#preview');
    assert.equal(await frame.locator('h1').innerText(),base.experience.headline);
    await page.locator('#preview').scrollIntoViewIfNeeded();
    assert.ok(await frame.locator('.hero-media img').evaluate(el=>new Promise(resolve=>{let tries=0;const check=()=>{if(el.complete&&el.naturalWidth>0)return resolve(true);if(++tries>=100)return resolve(false);setTimeout(check,100);};check();}))); 
    const faq=page.locator('[name="experience.faqs"]');await faq.fill('[{');
    assert.equal(await faq.evaluate(el=>el===document.activeElement),true);
    assert.equal(await faq.evaluate(el=>el.validity.valid),false);
    assert.equal(await page.locator('#results').isVisible(),false);
    await faq.fill(JSON.stringify(base.experience.faqs));assert.equal(await faq.evaluate(el=>el.validity.valid),true);
    await page.getByRole('button',{name:'Generate review pack'}).click();await page.locator('#results').waitFor({state:'visible'});
    await page.locator('#topic').selectOption('talc');await page.waitForFunction(()=>!document.querySelector('#campaign-form').inert);
    assert.equal(await page.locator('[name="experience.imageRef"]').inputValue(),'');
    assert.equal(await page.locator('[name="experience.faqs"]').inputValue(),'[]');
    await page.locator('[name="experience.nextSteps"]').fill('Synthetic first step\nSynthetic second step');
    await page.getByRole('button',{name:'Generate review pack'}).click();await page.locator('#results').waitFor({state:'visible'});
    assert.match(await frame.locator('aside').innerText(),/Synthetic second step/);
    assert.deepEqual(external,[]);await context.close();console.log(`PASS ${width}px experience setup/import/asset sandbox/FAQ editing/isolation`);
    receipts.push({width,setupExperience:'import, shared config, opaque-frame embedded image, incomplete FAQ edit retains focus and blocks build, recovery, tort switch clears experience',externalRequests:external.length});
   }
  } finally {setup.closeAllConnections();await new Promise(ok=>setup.close(ok));}
  await writeFile(join(shots,'receipt.json'),JSON.stringify({baseline:'8751568aa63bd7add857b08e6d9003611ecac751',synthetic:true,liveBackend:false,receipts},null,2)+'\n');
 } finally {if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
