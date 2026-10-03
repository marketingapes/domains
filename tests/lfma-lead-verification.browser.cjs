const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.LFMA_QA_BASE || 'http://127.0.0.1:8765';
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:768}});
 const page=await context.newPage();const requests=[],errors=[];
 page.on('request',r=>requests.push(r.url()));
 await page.route('https://maps.google.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock Google map</title><p>Mock map: synthetic coordinates only.</p>'}));page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.geoCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail){window.geoCalls++;if(window.geoMode==='success')ok({coords:{latitude:12.34567,longitude:23.45678,accuracy:42}});else fail({code:window.geoMode||1});}}});});
 await page.goto(`${base}/lead-verification/`);
 assert.equal(await page.evaluate(()=>window.geoCalls),0);assert.equal(requests.some(url=>url.startsWith('https://')),false);assert.equal(await page.locator('#map-frame iframe').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.locator('h1').textContent(),'This is how we help avoid scammers and false leads.');
 for(const selector of ['#map-sharing','#location-button','#map-placeholder']){const box=await page.locator(selector).boundingBox();assert.ok(box.y>=0&&box.y+box.height<=page.viewportSize().height,`${width}px initial viewport: ${selector} is above fold`);}
 await page.screenshot({path:`/tmp/lfma-lead-verification-fold-${width}.png`});
 await page.locator('#location-button').click();
 assert.match(await page.locator('#location-status').textContent(),/Permission denied/);
 assert.equal(await page.locator('#location-button').isVisible(),true);
 assert.equal(requests.some(url=>url.startsWith('https://')),false);
 for(const code of [2,3]){await page.evaluate(c=>window.geoMode=c,code);await page.locator('#location-button').click();assert.match(await page.locator('#location-status').textContent(),code===2?/unavailable/:/timed out/);}
 await page.evaluate(()=>window.geoMode='success');await page.locator('#location-button').click();assert.match(await page.locator('#coordinates').textContent(),/12.34567/);await page.waitForFunction(()=>document.querySelector('#map-frame iframe'));assert.equal(await page.locator('#map-frame iframe').getAttribute('src'),'https://maps.google.com/maps?q=12.34567,23.45678&z=15&output=embed');await page.frameLocator('#map-frame iframe').getByText('Mock map: synthetic coordinates only.').waitFor();await page.evaluate(()=>window.scrollTo(0,0));const mapBox=await page.locator('#map-frame').boundingBox();assert.ok(mapBox.y>=0&&mapBox.y+mapBox.height<=page.viewportSize().height,`${width}px success map is above fold`);await page.screenshot({path:`/tmp/lfma-lead-verification-map-fold-${width}.png`});await page.screenshot({path:`/tmp/lfma-lead-verification-map-${width}.png`,fullPage:true});await page.locator('#clear-location').click();assert.equal(await page.locator('#map-frame iframe').count(),0);assert.equal(await page.locator('#coordinates').isVisible(),false);
 for(const key of ['repeat','reviewed','incomplete']){await page.locator(`[data-example="${key}"]`).click();assert.match(await page.locator('#receipt').textContent(),/Not reported/);}
 await page.locator('.closing').scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 await page.locator('h1').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/lfma-lead-verification-${width}.png`,fullPage:true});
 assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(`${base}/`)||url==='https://maps.google.com/maps?q=12.34567,23.45678&z=15&output=embed'));
 const imgs=await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0));assert.equal(imgs,true);
 console.log(`${width}px: no overflow; assets loaded; no page errors; only local GETs before consent; mocked Google iframe after consent; denial/retry/unavailable/timeout/success/clear and all receipts passed`);
 await context.close();
}
const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();await page.goto(`${base}/lead-verification/`);assert.equal(await page.locator('h1').isVisible(),true);assert.equal(await page.locator('#evidence').isVisible(),true);console.log('No-JavaScript content available');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
