const qaModules=process.env.MA_QA_MODULES || '/tmp/ma-review-tools/node_modules';
const {chromium}=require(qaModules+'/playwright');
const AxeBuilder=require(qaModules+'/@axe-core/playwright').default;
const fs=require('node:fs');const assert=require('node:assert/strict');
const BASE=process.env.MA_QA_URL || 'http://127.0.0.1:8765';
fs.mkdirSync('review-artifacts',{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.MA_QA_CHROMIUM ? {executablePath:process.env.MA_QA_CHROMIUM} : {})});
const report=[];
for(const width of [360,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];const external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto(BASE+'/',{waitUntil:'networkidle'});
 await page.locator('.portrait img').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>window.scrollTo(0,0));
 const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 assert.ok(overflow.scroll<=overflow.client,`overflow at ${width}`);
 assert.equal(await page.locator('nav.destinations a').count(),2);
 assert.equal(await page.locator('a[href="https://lawfirmmarketingapes.com/"]').count(),1);
 assert.equal(await page.locator('a[href="https://leadapes.com/"]').count(),1);
 assert.equal(await page.locator('form').count(),1);
 await page.getByLabel('Your name',{exact:true}).fill('Review Test');await page.getByLabel('Your email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Business or agency').fill('Synthetic Company');await page.getByLabel('What should work better?').fill('Synthetic QA only. Do not send.');await page.getByRole('button',{name:'Prepare my inquiry'}).click();await page.getByText('Your inquiry is prepared. Nothing has been sent.').waitFor();const reference=await page.locator('#inquiry-summary').textContent();assert.match(reference,/ma-inquiry-/);await page.getByRole('button',{name:'Prepare my inquiry'}).click();assert.equal(await page.locator('#inquiry-summary').textContent(),reference);assert.match(await page.locator('#inquiry-email').getAttribute('href'),/^mailto:kyleg@marketingapes\.com/);await page.reload({waitUntil:'networkidle'});await page.locator('.portrait img').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>window.scrollTo(0,0));
 assert.deepEqual(external,[],'no production requests on preview');assert.deepEqual(errors,[]);
 const links=await page.locator('a').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
 for(const href of links){if(href.startsWith('#'))assert.equal(await page.locator(href).count(),1);else if(href.startsWith('/'))assert.ok((await page.request.get(BASE+href)).ok(),href);}
 const assets=await page.locator('img').evaluateAll(els=>els.map(el=>({src:el.getAttribute('src'),loaded:el.complete&&el.naturalWidth>0})));assert.ok(assets.every(a=>a.loaded));
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations,[]);
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to content');await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#main');
 await page.evaluate(()=>document.activeElement.blur());await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:`review-artifacts/home-${width}.png`,fullPage:true});
 report.push({width,overflow,links,assets,errors,externalRequests:external,wcagViolations:axe.violations.length,manualEmailOnly:true,keyboardSkip:true});
 await context.close();
}
// JavaScript disabled: narrative, destinations and contact remain usable; block the retained GTM noscript fallback.
const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();await page.route('https://**/*',r=>r.abort());await page.goto(BASE+'/');assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('nav.destinations a').count(),2);assert.ok(await page.locator('a[href^="mailto:"]').first().isVisible());await context.close();
fs.writeFileSync('review-artifacts/browser-results.json',JSON.stringify({checkedAt:new Date().toISOString(),report,jsDisabled:true},null,2));await browser.close();console.log('PASS: 360 / 390 / 768 / 1440; no overflow, broken local links, browser errors, preview telemetry or WCAG A/AA violations. Keyboard and no-JS pass.');
})().catch(e=>{console.error(e);process.exit(1)});
