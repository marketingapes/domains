// Real Chromium, synthetic responses only. All provider traffic is intercepted; no emails or live calls.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const root = new URL('../btl/', import.meta.url).pathname;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server = http.createServer(async (req,res) => {
  try {
    let path = new URL(req.url,'http://local').pathname;
    if (path.endsWith('/')) path += 'index.html';
    const data = await readFile(join(root,path));
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'}); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath:process.env.CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let checks=0;
try {
  for (const width of [390,1280]) {
    const ctx = await browser.newContext({viewport:{width,height:900}});
    const page = await ctx.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let mode='ok', requests=[], held, release;
    const good = () => ({schema:'glassman-reporting-summary/v1',status:'ok',client:'glassman',campaign_id:'GLASSMAN-SSDI-002',refresh_mode:'on_demand',
      source_as_of:new Date(Date.now()-(mode==='stale'?2*86400000:3600000)).toISOString().replace(/\.\d{3}Z$/,'Z'),
      counts:{production_web_intake_events:0,synthetic_test_events:3,recorded_web_intake_events:3},
      freshness:{status:mode==='stale'?'stale':'fresh'},limit:{event_bound:900,reached:false}});
    await ctx.route('**/*', async route=> {
      const req=route.request(), u=new URL(req.url());
      if (u.origin===origin) return route.continue();
      assert.equal(u.origin,'https://perspective-s3b8.onrender.com');
      assert.equal(u.search,'');
      requests.push({path:u.pathname,method:req.method(),headers:req.headers()});
      if (req.method()==='OPTIONS') return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST','access-control-allow-headers':'authorization,content-type'}});
      let status=200,body;
      if(u.pathname.endsWith('/login')) body={sent:true};
      else if(u.pathname.endsWith('/verify')) body={session:'ps1.synthetic.session'};
      else {
        assert.equal(req.headers().authorization,'Bearer ps1.synthetic.session');
        if(mode==='held') { held=true; await new Promise(resolve=>release=resolve); }
        if(mode==='unauthorized') {status=401;body={detail:'private error'};}
        else if(mode==='unconfigured') {status=503;body={status:'unconfigured'};}
        else if(mode==='error') {status=502;body={status:'error',message:'PRIVATE_PROVIDER_TEXT'};}
        else if(mode==='invalid') body={...good(),counts:{production_web_intake_events:99}};
        else body=good();
      }
      await route.fulfill({status,headers:{'content-type':'application/json','access-control-allow-origin':origin},body:JSON.stringify(body)});
    });
    await page.goto(origin+'/glassman/reporting/');
    assert.equal(requests.length,0,'no external traffic before sign-in');
    assert.equal(await page.locator('#summary').isHidden(),true);checks++;
    await page.fill('#email','synthetic@example.test');await page.locator('#signin button').click();
    await page.locator('#verify:not([hidden])').waitFor();await page.fill('#code','123456');await page.locator('#verify button[type=submit]').click();
    await page.locator('#summary:not([hidden])').waitFor();
    assert.equal(await page.locator('#production').innerText(),'0');assert.equal(await page.locator('#synthetic').innerText(),'3');
    assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
    for (const variant of ['stale','unconfigured','error','invalid']) {
      mode=variant;await page.click('#refresh');
      await page.waitForFunction(()=>document.querySelector('#status').dataset.state!=='loading');
      assert.equal(await page.locator('#status').getAttribute('data-state'),variant==='invalid'?'error':variant);
      assert.equal(await page.locator('#summary').isHidden(),variant!=='stale');
      assert.doesNotMatch(await page.locator('body').innerText(),/PRIVATE_PROVIDER_TEXT/);checks++;
    }
    mode='ok';await page.click('#refresh');await page.locator('#summary:not([hidden])').waitFor();
    mode='held';await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#status').dataset.state==='loading');
    while (!held) await new Promise(r=>setTimeout(r,5));
    await page.click('#signout');release();await page.waitForTimeout(100);
    assert.equal(await page.locator('#summary').isHidden(),true);assert.equal(await page.locator('#production').innerText(),'');
    assert.equal(await page.locator('#session').isHidden(),true);checks++;
    mode='ok';await page.fill('#email','synthetic@example.test');await page.locator('#signin button').click();
    await page.locator('#verify:not([hidden])').waitFor();await page.fill('#code','123456');await page.locator('#verify button[type=submit]').click();await page.locator('#summary:not([hidden])').waitFor();
    mode='unauthorized';await page.click('#refresh');await page.locator('#signin:not([hidden])').waitFor();
    assert.equal(await page.locator('#summary').isHidden(),true);assert.equal(await page.locator('#production').innerText(),'');checks++;
    // Ignore AbortSignal deliberately: old transport replies can finish after reset/new requests.
    await page.evaluate(() => {
      window.__pending = [];
      window.fetch = (url) => new Promise(resolve => {
        window.__pending.push({path: new URL(url).pathname, finish: body => resolve({status:200, ok:true, json:async()=>body})});
      });
    });
    const pendingCount = n => page.waitForFunction(n => window.__pending.length === n, n);
    const finish = (index, body) => page.evaluate(({index,body}) => window.__pending[index].finish(body), {index,body});
    await page.fill('#email','synthetic@example.test');await page.locator('#signin button').click();await pendingCount(1);
    await finish(0,{sent:true});await page.locator('#verify:not([hidden])').waitFor();
    await page.fill('#code','123456');await page.locator('#verify button[type=submit]').click();await pendingCount(2);
    await page.click('#restart');
    assert.equal(await page.locator('#signin button').isEnabled(),true,'reset restores controls before old request finishes');
    await page.fill('#email','new@example.test');await page.locator('#signin button').click();await pendingCount(3);
    await finish(1,{session:'ps1.old.session'});await page.waitForTimeout(50);
    assert.equal(await page.locator('#signin button').isDisabled(),true,'old verify cannot finish new login');
    assert.equal(await page.locator('#status').getAttribute('data-state'),'loading');
    assert.equal(await page.locator('#session').isHidden(),true);checks++;
    await finish(2,{sent:true});await page.locator('#verify:not([hidden])').waitFor();
    await page.fill('#code','123456');await page.locator('#verify button[type=submit]').click();await pendingCount(4);
    await finish(3,{session:'ps1.new.session'});await pendingCount(5);
    assert.ok((await page.evaluate(()=>window.__pending[4].path)).endsWith('/reporting-summary'));
    await page.click('#signout');
    assert.equal(await page.locator('#signin button').isEnabled(),true);
    await page.fill('#email','third@example.test');await page.locator('#signin button').click();await pendingCount(6);
    await finish(4,good());await page.waitForTimeout(50);
    assert.equal(await page.locator('#signin button').isDisabled(),true,'old summary cannot finish new login');
    assert.equal(await page.locator('#summary').isHidden(),true);assert.equal(await page.locator('#production').innerText(),'');
    assert.equal(await page.locator('#status').getAttribute('data-state'),'loading');
    await finish(5,{sent:true});await page.locator('#verify:not([hidden])').waitFor();
    assert.equal(await page.locator('#verify button[type=submit]').isEnabled(),true,'current request restores controls');checks++;
    assert.deepEqual(errors,[]);await ctx.close();
  }
  console.log(`${checks} Glassman reporting browser checks passed (390px and 1280px; all provider responses mocked).`);
} finally {await browser.close();server.close();}
