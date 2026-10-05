const {chromium}=require('playwright');
const {readFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const out='/tmp/lfma-ad-demo-review';mkdirSync(out,{recursive:true});
 try{
  for(const width of [375,1440]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[];let forbidden=0;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()!=='GET'||url.origin!=='https://lfma.demo'){forbidden++;return route.abort();}
    let local=path.resolve('lfma','.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
    if(!local.startsWith(path.resolve('lfma')+path.sep)){forbidden++;return route.abort();}
    const type={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[path.extname(local)];
    try{return route.fulfill({contentType:type,body:readFileSync(local)});}catch{return route.fulfill({status:404,body:'Not found'});}
   });
   await page.goto('https://lfma.demo/demo/ad-to-intake/');
   await page.screenshot({path:`${out}/${width}-01-ad.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.getByRole('button',{name:'Learn more'}).click();
   await page.screenshot({path:`${out}/${width}-02-page.png`,fullPage:true});
   await page.getByRole('button',{name:'Try the sample intake'}).click();
   assert.equal(await page.locator('#simulate').isDisabled(),true);
   await page.locator('#permission').check();await page.locator('#simulate').click();
   assert.match(await page.locator('#receipt').textContent(),/No firm received anything/);
   await page.locator('#state').selectOption('Other state');
   assert.equal(await page.locator('#receipt').isVisible(),false);assert.equal(await page.locator('#simulate').isDisabled(),true);
   await page.locator('#permission').check();await page.locator('#simulate').click();
   await page.screenshot({path:`${out}/${width}-03-intake.png`,fullPage:true});
   await page.locator('#to-inquiry').click();
   assert.equal(await page.locator('#media').textContent(),'$10,000');
   for(const [category,minimum,total] of [['standard','$5,000','$7,500'],['major_mass_tort','$10,000','$12,500'],['personal_injury','$10,000','$12,500'],['mva','$10,000','$12,500']]){await page.locator('#category').selectOption(category);assert.equal(await page.locator('#media').textContent(),minimum);assert.equal(await page.locator('#total').textContent(),total);}
   const downloaded=page.waitForEvent('download');await page.locator('#download').click();const download=await downloaded;await download.saveAs(`${out}/${width}-brief.json`);const brief=JSON.parse(readFileSync(`${out}/${width}-brief.json`));assert.equal(brief.status,'synthetic_demo_not_submitted');
   assert.equal(await page.getByRole('button',{name:'Send campaign inquiry'}).isDisabled(),true);
   await page.screenshot({path:`${out}/${width}-04-inquiry.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('#reset').click();assert.equal(await page.locator('[data-step="0"]').isVisible(),true);
   await page.getByRole('button',{name:'Learn more'}).click();await page.getByRole('button',{name:'Try the sample intake'}).click();await page.locator('#decline').click();assert.match(await page.locator('#receipt').textContent(),/No handoff occurred/);await page.locator('#to-inquiry').click();
   assert.deepEqual(errors,[]);assert.equal(forbidden,0);await page.close();
  }
  console.log('PASS: 375/1440px complete journey, permission/decline/reset, stale receipt invalidation, four pricing tiers, local brief download, disabled live submission, no overflow/errors/external requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
