import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),MA=join(ROOT,'ma'),OFFER=join(MA,'campaign-sprint');
const read=p=>readFileSync(join(OFFER,p),'utf8');
const pages=['index.html',...['index','quiz','form','sofia','ads'].map(p=>'demo/'+p+'.html')];
test('demo-first page frames lower signed-case acquisition cost as a goal without public pricing',()=>{
 const p=read('index.html');for(const text of ['What if your next <em>signed case</em> cost less to acquire?','That is the optimization goal. Results are not guaranteed.','Explore the demo','Discuss your campaign','not a complete live signed-outcome feedback loop'])assert.ok(p.includes(text),text);
 assert.doesNotMatch(p,/\$7,500|\$2,500|\$5,000|ONE INVOICE|price-card|free campaign/i);
 assert.doesNotMatch(p,/\$74\b|2.hour guarantee|launchMonday|Oct(?:ober)?\s*19|fake testimonial/i);
 assert.ok(p.indexOf('href="#demo">Explore the demo')<p.indexOf('href="#pilot">Discuss your campaign ↗'));
});
test('primary contact matches existing verified MA work email, no payment or phone CTA',()=>{
 const p=read('index.html'),home=readFileSync(join(MA,'index.html'),'utf8');assert.match(home,/mailto:kyleg@marketingapes.com/);
 assert.match(p,/mailto:kyleg@marketingapes.com\?subject=/);assert.match(p,/You choose when to send/);assert.match(p,/Preferred%20meeting%20time%20and%20time%20zone/);assert.doesNotMatch(p,/calendly|cal\.com/i);assert.doesNotMatch(p,/href="(?:tel:|https:[^"]*(?:stripe|paypal))/);assert.doesNotMatch(p,/<form/);
});
test('all page links, assets and fragments resolve locally or are the approved mailto',()=>{
 for(const path of pages){const html=read(path);for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
 const v=m[1];if(v.startsWith('mailto:')){assert.match(v,/^mailto:kyleg@marketingapes.com/);continue;}
 if(v==='https://marketingapes.com/campaign-sprint/')continue;
 assert.doesNotMatch(v,/^https?:/,'unexpected external link '+v);
 const u=new URL(v,'http://fixture/campaign-sprint/'+path),f=join(MA,decodeURIComponent(u.pathname));const file=u.pathname.endsWith('/')?join(f,'index.html'):f;
 assert.ok(existsSync(file),path+' → '+v);if(u.hash){const target=readFileSync(file,'utf8');assert.ok(target.includes('id="'+u.hash.slice(1)+'"'),v);}
 }}
});
test('all demo pages prevent provider, tracking, dialing and external-font transport',()=>{
 for(const path of pages){const h=read(path);assert.match(h,/connect-src 'none'/);assert.match(h,/form-action 'none'/);assert.doesNotMatch(h,/href="tel:|<iframe|googletagmanager|fonts\.googleapis|trustedform\.com|hook\.[^\s"<]+make\.com/);}
 const js=read('demo/fixture.js');assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|getUserMedia|clipboard/);
});
test('fictional form fields cannot receive claimant details; no agreement is collected',()=>{
 for(const p of ['demo/form.html','demo/quiz.html']){const h=read(p);for(const [tag] of h.matchAll(/<input\b[^>]*>/g))assert.match(tag,/readonly|disabled/);assert.doesNotMatch(h,/<textarea/);assert.match(h,/CONSENT PLACEHOLDER/);assert.match(h,/does not collect consent/);assert.doesNotMatch(h,/We will call you at the time/);}
});
test('Perspective and voice have truthful synthetic, unavailable and unknown states',()=>{
 const h=read('index.html');for(const s of ['SYNTHETIC','FICTIONAL EXAMPLE','Not connected','Unknown','Unavailable · no demo call exists','Unavailable · provider linkage not verified'])assert.ok(h.includes(s));
 assert.match(read('demo/sofia.html'),/Show next simulated turn/);assert.match(read('demo/fixture.js'),/No inquiry was sent/);
});
test('fixture export deterministically reuses the existing generator without modifying it',()=>{
 const before=Object.fromEntries(pages.slice(1).map(p=>[p,read(p)]));execFileSync(process.execPath,['docs/campaign-sprint/build-fixtures.mjs'],{cwd:ROOT});for(const [p,h] of Object.entries(before))assert.equal(read(p),h);
});
test('fixture titles and search/social descriptions explicitly describe fictional non-calling previews',()=>{
 for(const p of pages.slice(1)){
  const html=read(p),title=html.match(/<title>(.*?)<\/title>/)[1];assert.match(title,/Fictional/i);
  for(const marker of ['name="description"','property="og:description"']){
   const description=html.match(new RegExp('<meta '+marker+' content="([^"]*)"'))[1];assert.match(description,/fictional|demonstration/i);assert.match(description,/No /);
   assert.doesNotMatch(description,/we call you|connects you|Call and tell us/i);
  }
  assert.match(html,/<meta property="og:title" content="Fictional/);
 }
});
test('scripted voice has one atomic polite live region and final button remains focusable',()=>{
 const html=read('demo/sofia.html');assert.match(html,/id="sofia-announcement"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
 const js=read('demo/fixture.js');assert.match(js,/heading\.focus\(\)/);assert.match(js,/heading\.tabIndex=-1/);assert.match(js,/setAttribute\('aria-disabled','true'\)/);assert.doesNotMatch(js,/event\.target\.disabled=true/);
});
