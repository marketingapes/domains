// Local HTML only. Every request is fulfilled or blocked; no live submissions.
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
  try {
    for (const width of [375, 1440]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      let posts=0, reject=false;
      await page.route('**/*', async route => {
        const request=route.request();
        if(request.method()==='POST') {
          posts++;
          assert.equal(new URL(request.url()).hostname,'hook.us2.make.com');
          assert.equal(request.postDataJSON().page,'https://lawfirmmarketingapes.com/');
          return route.fulfill({status:reject?500:200,contentType:'text/plain',body:reject?'Error':'Accepted'});
        }
        if(request.url()==='https://lawfirmmarketingapes.com/') return route.fulfill({contentType:'text/html',body:readFileSync('lfma/index.html','utf8')});
        return route.abort();
      });
      await page.goto('https://lawfirmmarketingapes.com/');
      await page.locator('#fName').fill('Synthetic Test');
      await page.locator('#fEmail').fill('invalid');
      await page.locator('#fMsg').fill('Synthetic inquiry only');
      await page.locator('#fBtn').click();
      assert.equal(posts,0);
      await page.locator('#fEmail').fill('test@example.invalid');
      reject=true;
      await page.locator('#fBtn').click();
      await page.locator('#formError').waitFor({state:'visible'});
      assert.equal(await page.locator('#fMsg').inputValue(),'Synthetic inquiry only');
      assert.equal(await page.locator('#formOk').isVisible(),false);
      reject=false;
      await page.locator('#fBtn').click();
      await page.locator('#formOk').waitFor({state:'visible'});
      assert.equal(posts,2);
      assert.equal(await page.locator('#kyleForm').isVisible(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:`/tmp/lfma-homepage-${width}.png`,fullPage:true});
      await page.close();
    }
    console.log('PASS: mobile/desktop, native email validation, mocked rejection and acknowledgement, preserved input, no horizontal overflow; all network intercepted.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
