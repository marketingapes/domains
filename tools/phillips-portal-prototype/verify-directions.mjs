import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = await import(process.env.PERSPECTIVE_PLAYWRIGHT_MODULE || '/tmp/phillips-mva-browser-qa/node_modules/playwright-core/index.mjs');
import { readFile, writeFile } from 'node:fs/promises';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const base=resolve(repo,'..');
const browser=await chromium.launch({executablePath:process.env.PERSPECTIVE_CHROMIUM || '/Users/kylegosselin/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',headless:true});
const directions=['01-signal','02-flow','03-workspace'];const receipts=[];
try{for(const direction of directions){
 const file=repo+'/lfma/portal/prototypes/client-perspective-directions/'+direction+'.html';const html=await readFile(file,'utf8');if(/https?:\/\/|evidence_url|1FET1|01a105c5|lead_id|fetch\(|XMLHttpRequest|demo-reviewer|526034/.test(html))throw Error('Private/network material '+direction);
 for(const width of [1440,768,375]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];let outbound=0;page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(/^https?:/.test(r.request().url())){outbound++;return r.abort();}return r.continue();});await page.goto('file://'+file);
  await page.screenshot({path:base+`/recovery/client-perspective-${direction}-${width}.png`,fullPage:true});
  const viewTabs=page.locator('[role=tab][data-tab]');
  for(const campaign of ['all','meta','search']){
   if(direction==='03-workspace')await page.locator(`[data-campaign="${campaign}"]`).click();else await page.selectOption('#campaign',campaign);
   const expected={all:'All MVA campaigns',meta:'Meta · Website',search:'Google · Search'}[campaign];
   const budgetTexts=await page.locator('[data-budget]').allTextContents();if(budgetTexts.some(t=>t!=={all:'$5,000',meta:'$3,000',search:'$2,000'}[campaign]))throw Error('Budget scope drift '+direction);
   const scopeTexts=await page.locator('[data-stage-scope]').allTextContents();if(scopeTexts.some(t=>t!=='Campaign scope: '+expected))throw Error('Scope drift '+direction);
   for(let i=0;i<await viewTabs.count();i++){
    await viewTabs.nth(i).click();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+direction+' '+width);
    const selected=await viewTabs.nth(i).getAttribute('aria-controls');if(!(await page.locator('#'+selected).isVisible()))throw Error('Bad tab panel');
    receipts.push({direction,width,campaign,view:await viewTabs.nth(i).textContent(),overflow:false});
   }
   if(direction==='02-flow'){await viewTabs.first().click();const stages=page.locator('[data-stage]');await stages.first().focus();await page.keyboard.press('End');if(await page.locator('[data-stage-title]').textContent()!=='Optimization')throw Error('Stage keyboard failed');await page.keyboard.press('Home');if(await page.locator('[data-stage-title]').textContent()!=='Campaign')throw Error('Stage home failed');await page.locator('[data-stage="3"]').click();if(await page.locator('[data-stage-title]').textContent()!=='Firm · Litify')throw Error('Litify stage failed');}
  }
  await viewTabs.first().focus();await page.keyboard.press('ArrowRight');if(await viewTabs.nth(1).getAttribute('aria-selected')!=='true')throw Error('View keyboard failed');
  const reviewTab=viewTabs.last();await reviewTab.click();const evidence=page.locator('[data-evidence]');await evidence.click();if(await evidence.getAttribute('aria-expanded')!=='true')throw Error('Disclosure failed');
  if(errors.length||outbound)throw Error(JSON.stringify({direction,width,errors,outbound}));await page.close();
 }
 console.log(direction+' reviewable: 27 campaign/view/viewport checks passed');
}}
finally{await browser.close();}
await writeFile(base+'/recovery/client-perspective-three-directions-qa.json',JSON.stringify({checks:receipts,total:receipts.length,outbound_requests:0,render_errors:0,keyboard_tabs:'passed',journey_steps:'passed',evidence_disclosure:'passed',mode:'UNPUBLISHED_READ_ONLY_VISUAL_PROTOTYPES'},null,2)+'\n');
