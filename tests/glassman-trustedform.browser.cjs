// Offline only: mock SDK and receipt; no request is released to an external provider.
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..'), origin = 'http://localhost:9876';
const certA = 'https://cert.trustedform.com/' + 'a'.repeat(40);
const certB = 'https://cert.trustedform.com/tf-new-issuance-format_123';
(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM,args:['--no-sandbox']});
  let passed=0;
  try {
    for(const width of [390,1280]) for(const door of ['', 'quiz/', 'talk-to-sofia/']) {
      const ctx=await browser.newContext({viewport:{width,height:1000}}), page=await ctx.newPage();
      const sent=[], errors=[]; let sdk='ready',cert=certA,receipt=false;
      page.on('pageerror',e=>errors.push(String(e)));
      await ctx.route('**/*',async route=>{
        const req=route.request(),url=new URL(req.url());
        if(req.method()==='POST') {
          assert.equal(url.hostname,'hook.us2.make.com');
          sent.push(JSON.parse(new URLSearchParams(req.postData()).get('payload')));
          return route.fulfill({status:receipt?200:503,contentType:'application/json',body:JSON.stringify(receipt?{status:'received',receipt_id:'offline-tf-receipt',mode:'test'}:{error:'offline'})});
        }
        if(url.hostname==='api.trustedform.com') {
          const body=sdk==='ready'?'document.querySelector("[name=xxTrustedFormCertUrl]").value='+JSON.stringify(cert)+';':'';
          return route.fulfill({contentType:'application/javascript',body});
        }
        if(url.origin!==origin) return route.abort();
        const file=path.resolve(root,'btl','.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
        assert.ok(file.startsWith(path.join(root,'btl')+path.sep));
        try{return await route.fulfill({path:file});}catch{return route.fulfill({status:404,body:''});}
      });
      async function open(state='AK') {
        await page.goto(origin+'/glassman/ssdi/'+door+'?test=1');
        if(door==='quiz/') {
          await page.getByLabel('Your state',{exact:true}).selectOption(state);
          for(const answer of ['48 to 64','Yes','Yes','No','No']) await page.locator('#qBody').getByRole('button',{name:new RegExp('^'+answer+'(?:$| )')}).click();
        }
        if(door==='talk-to-sofia/') await page.locator('#openCb').click();
        for(const [id,value] of Object.entries({first_name:'Offline',last_name:'Proof',email:'proof@example.invalid',phone:'2025550100'})) await page.locator('#'+id).fill(value);
      }
      async function failure(){await page.locator('#submitBtn').click();await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));}
      await open(); await failure();
      assert.equal(sent.length,1);assert.equal(sent[0].trustedform_cert_url,certA);
      await page.evaluate(c=>document.querySelector('[name=xxTrustedFormCertUrl]').value=c,certB);
      await failure();assert.deepEqual(sent[1],sent[0],'same-page retry preserves original certificate');
      cert=certB;await open();await failure();
      assert.deepEqual(sent[2],sent[0],'reload retry preserves original certificate, not current page certificate');
      const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('ee_retry_'+document.querySelector('#leadForm').dataset.pageId)));
      assert.equal(stored.certificate_url,certA);assert.equal(JSON.stringify(stored).includes('proof@example.invalid'),false);
      receipt=true;await page.locator('#submitBtn').click();await page.locator('#formDone').waitFor({state:'visible'});
      assert.deepEqual(sent[3],sent[0]);
      const events=await page.evaluate(()=>window.dataLayer);
      assert.equal(events.some(e=>JSON.stringify(e).includes('trustedform.com')),false);
      assert.equal(events.some(e=>e.event==='generate_lead'),false);
      if(door==='quiz/') {
        assert.equal(sent[0].request_type,'other_firm_review_request');assert.equal(sent[0].screening.web_outcome,'NOT_A_FIT');
        assert.equal(sent[0].routing.route,'hold');assert.equal(sent[0].followup_request.referral_authorized,false);
      }
      console.log(`PASS TrustedForm original proof/retry/reload ${door||'form'} @${width}`);passed++;
      if(door==='quiz/'&&width===390) {
        // Missing SDK: no network request, success message, or conversion; recover on a later click.
        sent.length=0;sdk='missing';receipt=true;await open();await failure();
        assert.equal(sent.length,0);assert.match(await page.locator('#formStatus').innerText(),/details have not been sent/);
        assert.equal(await page.locator('#submitBtn').isEnabled(),true);
        assert.equal(await page.locator('#formDone').isVisible(),false);
        assert.equal((await page.evaluate(()=>window.dataLayer)).some(e=>e.event==='generate_lead'||e.event==='ee_other_options_request_received'),false);
        await page.evaluate(c=>document.querySelector('[name=xxTrustedFormCertUrl]').value=c,certB);
        await page.locator('#submitBtn').click();await page.locator('#formDone').waitFor({state:'visible'});
        assert.equal(sent.length,1);assert.equal(sent[0].trustedform_cert_url,certB);
        // Malformed proof is not accepted just because the hidden field is populated.
        sent.length=0;sdk='ready';cert='https://cert.trustedform.com.evil.invalid/'+ 'a'.repeat(40);await open();await failure();
        assert.equal(sent.length,0);
        // A delayed valid certificate releases one request; repeated clicks cannot release another.
        sdk='missing';await open();
        await page.locator('#submitBtn').click();
        await page.evaluate(()=>document.querySelector('#leadForm').requestSubmit());
        await page.evaluate(c=>setTimeout(()=>{document.querySelector('[name=xxTrustedFormCertUrl]').value=c;},250),certA);
        await page.locator('#formDone').waitFor({state:'visible'});
        assert.equal(sent.length,1);assert.equal(sent[0].trustedform_cert_url,certA);
        // Editing during verification cannot silently send the older details.
        sent.length=0;await open();await page.locator('#submitBtn').click();
        await page.locator('#first_name').fill('Changed');
        await page.evaluate(c=>document.querySelector('[name=xxTrustedFormCertUrl]').value=c,certA);
        await page.waitForFunction(()=>document.querySelector('#formStatus').classList.contains('err'));
        assert.match(await page.locator('#formStatus').innerText(),/form changed/);assert.equal(sent.length,0);
        // A stored legacy retry with missing proof cannot be silently given a later certificate or a new id.
        sdk='ready';cert=certA;receipt=false;await open();await failure();
        const original=sent[0].submission_id;
        await page.evaluate(()=>{const key='ee_retry_'+document.querySelector('#leadForm').dataset.pageId;const r=JSON.parse(sessionStorage.getItem(key));r.certificate_url=null;sessionStorage.setItem(key,JSON.stringify(r));});
        await open();await failure();assert.equal(sent.length,1);assert.equal(sent[0].submission_id,original);
        assert.match(await page.locator('#formStatus').innerText(),/earlier request may have been received/);
        // Going back and returning to the same qualified result also cancels the earlier attempt.
        sent.length=0;sdk='missing';await open('MA');await page.locator('#submitBtn').click();
        await page.getByRole('button',{name:'← Change an answer',exact:true}).click();
        await page.locator('#qBody').getByRole('button',{name:/^No(?:$| )/}).click();
        await page.evaluate(c=>document.querySelector('[name=xxTrustedFormCertUrl]').value=c,certA);
        await page.waitForFunction(()=>!document.querySelector('#submitBtn').disabled);
        assert.equal(sent.length,0,'returning to same result does not revive pending submission');
        console.log('PASS missing/malformed/late certificate, edit protection and legacy retry');passed++;
      }
      if(door==='talk-to-sofia/'&&width===390) {
        sent.length=0;sdk='missing';await open();await page.locator('#submitBtn').click();
        await page.locator('#openCb').click();
        await page.locator('#openCb').click(); // reopening must not revive the cancelled attempt
        await page.evaluate(c=>document.querySelector('[name=xxTrustedFormCertUrl]').value=c,certA);
        await page.waitForFunction(()=>!document.querySelector('#submitBtn').disabled);
        assert.equal(sent.length,0,'closing/reopening callback panel cancels pending verification');
        console.log('PASS callback dismissal during certificate wait');passed++;
      }
      assert.deepEqual(errors,[]);await ctx.close();
    }
    console.log(`${passed} TrustedForm suites passed; no external requests released.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
