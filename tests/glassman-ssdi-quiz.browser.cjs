// Offline regression: every request is intercepted. Never posts a real lead or contacts a provider.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:9876';
const quizPath = '/glassman/ssdi/quiz/';
const standard = ['48 to 64', 'Yes', 'Yes', 'No', 'No'];
const cases = [
  ['state', 'AK', standard],
  ['age', 'MA', ['Under 48', ...standard.slice(1)]],
  ['work', 'MA', ['48 to 64', 'No', 'Yes', 'No', 'No']],
  ['doctor', 'MA', ['48 to 64', 'Yes', 'No', 'No', 'No']],
  ['benefits', 'MA', ['48 to 64', 'Yes', 'Yes', 'Yes', 'No']],
  ['lawyer', 'MA', ['48 to 64', 'Yes', 'Yes', 'No', 'Yes']]
];
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM, args:['--no-sandbox']});
  let passed = 0;
  try {
    for (const width of [390,1280]) {
      const ctx = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
      const page = await ctx.newPage(), sent = [], errors = [];
      let response = {status:'received',receipt_id:'offline-quiz-receipt',mode:'live'}, http = 200;
      page.on('pageerror', e => errors.push(String(e)));
      await ctx.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (req.method() === 'POST') {
          assert.equal(url.hostname,'hook.us2.make.com');
          sent.push(JSON.parse(new URLSearchParams(req.postData()).get('payload')));
          return route.fulfill({status:http,contentType:'application/json',body:JSON.stringify(response)});
        }
        if (url.origin !== origin) return route.abort();
        const local = path.resolve(root,'btl','.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
        assert.ok(local.startsWith(path.join(root,'btl')+path.sep));
        try {return await route.fulfill({path:local});} catch {return route.fulfill({status:404,body:''});}
      });
      async function open(state='MA',answers=standard) {
        await page.goto(origin+quizPath);
        assert.equal(await page.locator('#contactWrap').isVisible(),false);
        await page.getByLabel('Your state',{exact:true}).selectOption(state);
        for (const answer of answers) await page.locator('#qBody').getByRole('button',{name:new RegExp('^'+answer+'(?:$| )')}).click();
      }
      async function fill() {
        for (const [id,value] of Object.entries({first_name:'Offline',last_name:'Test',email:'offline@example.invalid',phone:'2025550100'})) await page.locator('#'+id).fill(value);
      }
      async function validateOtherOptions() {
        assert.equal(page.url(),origin+quizPath);
        assert.equal(await page.locator('#contactWrap').isVisible(),true);
        assert.equal(await page.locator('#qBody a, #qBody button').count(),0);
        assert.match(await page.locator('#qBody').innerText(),/another firm is reviewing cases like yours/);
        assert.doesNotMatch(await page.locator('#qBody').innerText(),/ssa.gov|Change an answer|qualify for a free review/);
        assert.match(await page.locator('#callDisclosure').innerText(),/^By tapping “Check other options,” you agree that Marketing Apes,/);
        assert.doesNotMatch(await page.locator('#callDisclosure').innerText(),/Jeffrey Glassman/);
        assert.equal(await page.locator('#submitBtn').textContent(),'Check other options →');
        assert.equal(await page.getByRole('button',{name:'Check other options',exact:true}).count(),1);
        assert.equal(await page.locator('#submitBtn span').getAttribute('aria-hidden'),'true');
        const notice = await page.locator('#campaignPrivacy').innerText();
        assert.match(notice,/Requests for a Glassman review are shared with Jeffrey Glassman/);
        assert.match(notice,/Optional requests to check other firms are handled by Marketing Apes and its service providers/);
        assert.doesNotMatch(notice,/and share it with Jeffrey Glassman/);
        assert.equal(await page.evaluate(()=>BTL_SSDI_QUIZ.answers().web_outcome),'NOT_A_FIT');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
      for (const [name,state,answers] of cases) {
        await open(state,answers); await validateOtherOptions();
        assert.equal(sent.length,0,'completion never submits without the optional form');
        console.log(`PASS ${name} disqualification @${width}`); passed++;
      }
      if (process.env.SHOTS) {
        fs.mkdirSync(process.env.SHOTS,{recursive:true});
        await page.locator('#quizCard').screenshot({path:path.join(process.env.SHOTS,`other-options-${width}.png`)});
      }
      // Returning from a qualified result must replace, not retain, its consent and route.
      await open();
      assert.match(await page.locator('#callDisclosure').innerText(),/Marketing Apes and Jeffrey Glassman Injury Lawyers/);
      await page.getByRole('button',{name:'← Change an answer',exact:true}).click();
      assert.equal(await page.locator('#contactWrap').isVisible(),false);
      await page.locator('#qBody').getByRole('button',{name:/^Yes(?:$| )/}).click();
      await validateOtherOptions(); await fill();
      // Missing receipt and HTTP failures must not display success or count a conversion.
      response={status:'received'};
      await page.locator('#submitBtn').click();
      await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));
      assert.equal(await page.locator('#formDone').isVisible(),false);
      http=503;
      await page.locator('#submitBtn').click();
      await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));
      assert.deepEqual(sent[1],sent[0]);
      http=200;response={status:'received',receipt_id:'offline-quiz-receipt',mode:'live'};
      await page.locator('#submitBtn').click();
      await page.locator('#formDone').waitFor({state:'visible'});
      assert.deepEqual(sent[2],sent[0]);
      const payload=sent[2];
      assert.equal(payload.request_type,'other_firm_review_request');
      assert.equal(payload.screening.web_outcome,'NOT_A_FIT');
      assert.equal(payload.routing.route,'hold');
      assert.deepEqual(payload.followup_request,{type:'other_firm_review',requested:true,referral_authorized:false});
      assert.equal(payload.consent.version,'glassman-ssdi-other-options-marketing-apes-2026-11-09-v1');
      for (const channel of ['calls','sms']) {
        assert.equal(payload.consent[channel].granted,true);
        assert.equal(payload.consent[channel].text,payload.consent.text);
        assert.match(payload.consent[channel].version,/other-options-marketing-apes/);
        assert.doesNotMatch(payload.consent[channel].text,/Jeffrey Glassman/);
      }
      assert.match(await page.locator('#doneText').innerText(),/received by Marketing Apes/);
      assert.match(await page.locator('#doneText').innerText(),/ask your permission before sharing/);
      assert.doesNotMatch(await page.locator('#doneText').innerText(),/will call|delivered|sent to.*firm|appointment confirmed/);
      let events=await page.evaluate(()=>window.dataLayer);
      assert.equal(events.filter(e=>e.event==='generate_lead').length,0);
      assert.equal(events.filter(e=>/^ee_lead_submit_/.test(e.event)).length,0);
      assert.equal(events.filter(e=>e.event==='ee_other_options_request_received').length,1);
      assert.equal(events.some(e=>JSON.stringify(e).includes('offline@example.invalid')),false);
      await page.evaluate(()=>document.querySelector('#leadForm').requestSubmit());
      assert.equal(sent.length,3,'a saved request cannot be duplicated');
      if (process.env.SHOTS) await page.locator('#formDone').screenshot({path:path.join(process.env.SHOTS,`other-options-receipt-${width}.png`)});
      // Reload clears the result and exposes no previous personal data.
      await page.reload();
      assert.equal(await page.locator('#contactWrap').isVisible(),false);
      assert.equal(await page.locator('#first_name').inputValue(),'');
      // Qualified and uncertain paths retain their existing form, consent, scoring and conversion.
      for (const [label,answers,outcome,route] of [['qualified',standard,'QUALIFIED','sofia_transfer'],['uncertain',['48 to 64','Not sure','Yes','No','No'],'FIRM_REVIEW','sofia_confirm']]) {
        await open('MA',answers);await fill();
        assert.equal(await page.locator('#submitBtn').textContent(),'Request my free call →');
        assert.match(await page.locator('#callDisclosure').innerText(),/Marketing Apes and Jeffrey Glassman Injury Lawyers/);
        await page.locator('#submitBtn').click();await page.locator('#formDone').waitFor({state:'visible'});
        const latest=sent.at(-1);assert.equal(latest.screening.web_outcome,outcome);assert.equal(latest.routing.route,route);
        assert.equal(latest.request_type,'screened_inquiry');assert.equal(latest.followup_request,undefined);
        assert.equal(latest.consent.version,'glassman-ssdi-002-consent-marketing-apes-2026-11-06-v1');
        assert.equal((await page.evaluate(()=>window.dataLayer)).filter(e=>e.event==='generate_lead').length,1);
        console.log(`PASS ${label} unaffected @${width}`);passed++;
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS other-options consent, payload, failure, retry, receipt, reload and conversion @${width}`);passed++;
      await ctx.close();
    }
    console.log(`${passed} Glassman quiz checks passed; no external requests released.`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
