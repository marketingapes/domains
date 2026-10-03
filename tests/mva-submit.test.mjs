import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const root = 'nil/mva-pi/';
const source = fs.readFileSync(root + 'lane.js', 'utf8');
const pages = ['index.html', 'talk-to-sofia/index.html', 'quiz/index.html'];
const uuid = '12345678-1234-1234-1234-123456789abc';
const decode = s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
function element(attrs = {}, text = '') {
  return { attrs, textContent: text, value: '', hidden: false, disabled: false, style: {}, listeners: {},
    getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k,v) { this.attrs[k]=v; },
    removeAttribute(k) { delete this.attrs[k]; }, addEventListener(k,f) { this.listeners[k]=f; },
    closest() { return null; }, matches() { return false; }, focus() {}, scrollIntoView() {},
    querySelectorAll() { return []; }, querySelector() { return null; }, appendChild() {} };
}
function attributes(tag) {
  const a = {}; for (const m of tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) a[m[1]] = m[2] ?? '';
  return a;
}
function boot(page, transport, { storage = new Map(), search = '', timeout = false } = {}) {
  const html = fs.readFileSync(root + page, 'utf8');
  const config = html.match(/window.EE_LANE=([\s\S]*?);<\/script>/)[1];
  const formMarkup = html.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/);
  const form = element(attributes(formMarkup[1]));
  const fields = [...formMarkup[2].matchAll(/<(input|select)\b([^>]*)>/g)].map(m => {
    const f = element(attributes(m[2])); Object.assign(f, { name: f.attrs.name, id: f.attrs.id, type: f.attrs.type, required: 'required' in f.attrs });
    f.value = f.name === 'phone' ? '2025550100' : /name/.test(f.name) ? 'Synthetic Person' : f.name === 'email' ? 'synthetic@example.test' : '';
    if (m[1] === 'select') { f.value = 'no'; f.options = [element()]; f.selectedIndex = 0; }
    return f;
  });
  const noticeMatch = formMarkup[2].match(/<p\b([^>]*class="consent-notice[^>]*?)>([\s\S]*?)<\/p>/);
  const notice = element(attributes(noticeMatch[1]), decode(noticeMatch[2]));
  const btn = element({}, decode(formMarkup[2].match(/<button[^>]*type="submit"[^>]*>(.*?)<\/button>/)[1]));
  const status = element();
  form.querySelectorAll = q => q.startsWith('input:not') ? fields.filter(f => !('class' in f.attrs && f.attrs.class === 'hp')) : q === 'select[data-q]' ? fields.filter(f => 'data-q' in f.attrs) : fields;
  form.querySelector = q => q === '.consent-notice' ? notice : q === '.status' ? status : q.startsWith('button') ? btn : q.startsWith('.hp') ? fields.find(f => f.name === 'company') : null;
  const elements = {};
  for (const m of html.matchAll(/id="([^"]+)"/g)) elements[m[1]] = element();
  elements[form.attrs.id] = form;
  const done = elements[form.attrs['data-done']]; done.hidden = true;
  const message = element(); done.querySelector = q => q === '[data-receipt-message]' ? message : element();
  const hide = elements[form.attrs['data-hide']];
  const requests = [], pixels = [], timers = [];
  const document = { getElementById: id => elements[id] || null, addEventListener() {},
    querySelectorAll: q => q === 'form[data-qualifier]' ? ('data-qualifier' in form.attrs ? [form] : []) : q === 'form[data-lead]' ? ('data-lead' in form.attrs ? [form] : []) : [],
    createElement: () => element(), activeElement: { tagName: 'BODY' } };
  const context = { window: { crypto: webcrypto, sessionStorage: { getItem:k=>storage.get(k), setItem:(k,v)=>storage.set(k,v) }, fbq:(...a)=>pixels.push(a), ttq:{track:(...a)=>pixels.push(a)} }, document,
    location:{href:'https://example.test/mva-pi/' + search, pathname:'/mva-pi/' + (page === 'index.html' ? '' : page.replace('index.html','')), search},
    URLSearchParams, AbortController, WeakMap, Promise,
    matchMedia:()=>({matches:true}), setTimeout:(fn,ms)=>{timers.push(fn); return timers.length;}, clearTimeout(){},
    fetch: async (url, opts) => { const payload=JSON.parse(opts.body); requests.push(payload); return transport(payload); } };
  context.window.matchMedia=context.matchMedia;
  vm.runInNewContext('window.EE_LANE=' + config,context);
  if (page === 'quiz/index.html') {
    const prequal = html.match(/window.EE_PREQUAL=([\s\S]*?);\s*<\/script>/)[1];
    vm.runInNewContext('window.EE_PREQUAL=' + prequal,context);

  }
  vm.runInNewContext(source, context);
  const submit = () => form.listeners.submit({preventDefault(){}});
  const flush = async () => { for(let n=0;n<12;n++) await Promise.resolve(); if(timeout) { timers.at(-1)(); for(let n=0;n<12;n++) await Promise.resolve(); } };
  return {submit,flush,requests,pixels,form,fields,notice,btn,status,done,hide,message,context,elements,timers};
}
function receipt(payload, extra={}) { return {ok:true,lead_uid:'MA-NIL-'+uuid,lead_id:'MA-NIL-'+uuid,dispatch_id:'phl-'+uuid,event_id:payload.event_id,status:'awaiting_executor',test:false,dry_run:false,litify:{dry_run:true,sent:false},...extra}; }
const response = (payload, extra={}) => ({ok:true,status:200,json:async()=>receipt(payload,extra)});
const conversions = h => h.context.window.dataLayer.filter(e=>['ee_lead_submitted','ee_call_request','ee_qualified','ee_disqualified','ee_qualification_complete'].includes(e.event));
for (const page of pages) {
  for (const [name, transport, options] of [
    ['network',()=>{throw Error('offline');}], ['timeout',()=>new Promise(()=>{}),{timeout:true}],
    ['400',p=>({...response(p),ok:false,status:400})], ['500',p=>({...response(p),ok:false,status:500})],
    ['malformed',()=>({ok:true,json:async()=>{throw Error('JSON');}})], ['empty',()=>({ok:true,json:async()=>({})})],
    ['ok false',p=>response(p,{ok:false})], ['filtered',p=>response(p,{filtered:true})], ['dry run',p=>response(p,{dry_run:true})],
    ['test',p=>response(p,{test:true})], ['invalid status',p=>response(p,{status:'received'})],
    ['array',()=>({ok:true,json:async()=>[]})], ['missing lead ID',p=>response(p,{lead_id:undefined})],
    ['dry status',p=>response(p,{status:'dry_run'})], ['duplicate type',p=>response(p,{duplicate:'true'})],
    ['missing dispatch',p=>response(p,{dispatch_id:null})], ['wrong tenant',p=>response(p,{lead_uid:'MA-BTL-'+uuid})],
    ['wrong event',p=>response(p,{event_id:'web-wrong-event'})], ['missing mode',p=>response(p,{test:undefined})]
  ]) test(`${page}: ${name} retains data and has no success/conversion`, async()=>{
    const h=boot(page,transport,options); const before=h.fields.map(f=>f.value);
    h.submit(); await h.flush(); assert.equal(h.done.hidden,true); assert.equal(h.hide.hidden,false);
    assert.deepEqual(h.fields.map(f=>f.value),before); assert.equal(h.btn.disabled,false); assert.ok(h.status.textContent);
    assert.equal(conversions(h).length,0); assert.equal(h.pixels.length,0);
  });
  for (const duplicate of [false, true]) {
    for (const field of ['lead_uid', 'lead_id', 'dispatch_id', 'event_id']) {
      for (const kind of ['array', 'object', 'null', 'numeric']) {
        // The backend can return a null original event ID for a phone/matter duplicate.
        if (duplicate && field === 'event_id' && kind === 'null') continue;
        test(`${page}: ${duplicate ? 'duplicate' : 'accepted'} ${field} ${kind} fails closed`, async()=>{
          const h=boot(page,p=>{
            const valid=receipt(p)[field];
            const value=kind==='array' ? [valid] : kind==='object' ? {toString:()=>valid} : kind==='null' ? null : 12345678;
            const extra={duplicate,[field]:value};
            // Exercise the lead aliases sharing the same coercible value as well.
            if(field==='lead_uid') extra.lead_id=value;
            return response(p,extra);
          });
          const before=h.fields.map(f=>f.value); h.submit(); await h.flush();
          assert.equal(h.done.hidden,true); assert.equal(h.hide.hidden,false); assert.equal(h.btn.disabled,false);
          assert.deepEqual(h.fields.map(f=>f.value),before); assert.ok(h.status.textContent);
          assert.equal(conversions(h).length,0); assert.equal(h.pixels.length,0);
        });
      }
    }
  }
  for (const originalEvent of [null, 'web-original-event']) {
    test(`${page}: duplicate preserves supported original event ID ${originalEvent}`,async()=>{
      const h=boot(page,p=>response(p,{duplicate:true,event_id:originalEvent})); h.submit(); await h.flush();
      assert.equal(h.done.hidden,false); assert.match(h.message.textContent,/Already received.*No second/);
      assert.equal(conversions(h).length,0); assert.equal(h.pixels.length,0);
    });
  }
  test(`${page}: accepted receipt, consent evidence, double click and repeated submission`,async()=>{
    const h=boot(page,p=>response(p)); const label=h.btn.textContent;
    h.submit(); h.submit(); assert.equal(h.btn.disabled,true); await h.flush();
    assert.equal(h.requests.length,1); assert.equal(h.done.hidden,false); assert.match(h.message.textContent,/queued.*No call/);
    const p=h.requests[0]; assert.equal(p.consent_action,label); assert.equal(p.consent_text,h.notice.textContent);
    assert.equal(p.consent_method,'submit_button'); assert.equal(p.consent_version,'nil-mva-submit-v1'); assert.match(p.event_id,/^web-/);
    assert.equal(conversions(h).filter(e=>e.event==='ee_qualification_complete').length,0);
    assert.equal(p.state,undefined); assert.equal(conversions(h).filter(e=>e.event==='ee_lead_submitted').length,1);
    h.submit(); await h.flush(); assert.equal(h.requests.length,1);
    for(const e of h.context.window.dataLayer) assert.deepEqual(Object.keys(e).sort(),['event','lane','page','tenant']);
  });
  test(`${page}: exact retry uses same payload; duplicate never converts`,async()=>{
    let attempt=0; const h=boot(page,p=>++attempt===1?Promise.reject(Error('lost response')):response(p,{duplicate:true}));
    h.submit(); await h.flush(); h.submit(); await h.flush();
    assert.deepEqual(h.requests[0],h.requests[1]); assert.equal(h.done.hidden,false); assert.match(h.message.textContent,/Already received.*No second/);
    assert.equal(conversions(h).length,0); assert.equal(h.pixels.length,0);
  });
  test(`${page}: late success after timeout cannot convert; retry keeps identity`,async()=>{
    let finish; let attempt=0;
    const h=boot(page,p=>++attempt===1?new Promise(resolve=>{finish=()=>resolve(response(p));}):response(p,{duplicate:true}));
    h.submit(); await h.flush(); h.timers.at(-1)(); await h.flush();
    assert.equal(h.done.hidden,true); finish(); await h.flush(); assert.equal(h.done.hidden,true);
    assert.equal(conversions(h).length,0); h.submit(); await h.flush();
    assert.deepEqual(h.requests[0],h.requests[1]); assert.equal(h.done.hidden,false); assert.equal(conversions(h).length,0);
  });
  test(`${page}: local validation and honeypot do not POST`,async()=>{
    const h=boot(page,p=>response(p)); h.fields.find(f=>f.name==='phone').value='bad'; h.submit(); await h.flush();
    assert.equal(h.requests.length,0); assert.equal(h.done.hidden,true);
    h.fields.find(f=>f.name==='phone').value='2025550100'; h.fields.find(f=>f.name==='company').value='bot'; h.submit(); await h.flush();
    assert.equal(h.requests.length,0); assert.equal(conversions(h).length,0);
  });
  test(`${page}: changed phone gets a new event; call-created receipt is accurate`,async()=>{
    let attempt=0; const h=boot(page,p=>++attempt===1?Promise.reject(Error('offline')):response(p,{status:'call_created'}));
    h.submit(); await h.flush(); h.fields.find(f=>f.name==='phone').value='2025550101'; h.submit(); await h.flush();
    assert.notEqual(h.requests[0].event_id,h.requests[1].event_id); assert.match(h.message.textContent,/call was started/);
  });
}
test('attribution persists through all three pages; unknown and PII query fields are excluded',async()=>{
 const storage=new Map(); const params='?utm_source=meta&utm_content=creative&fbclid=click&campaign_id=campaign&state=AZ&phone=2025550100&email=secret';
 for(const [i,page] of pages.entries()) { const h=boot(page,p=>response(p),{storage,search:i===0?params:''}); h.submit(); await h.flush();
  const p=h.requests[0]; assert.equal(p.utm_source,'meta'); assert.equal(p.utm_content,'creative'); assert.equal(p.fbclid,'click'); assert.equal(p.campaign_id,'campaign'); assert.equal(p.state,undefined);
  assert.ok(!p.page_url.includes('?')); assert.ok(!storage.get('nil-mva-attribution').includes('2025550100'));
 }
});
test('HTML keeps exact baseline disclosures and phone fallbacks; success has no timing promise',async()=>{
 const {execFileSync}=await import('node:child_process');
 for(const page of pages) { const path=root+page; const before=execFileSync('git',['show','HEAD:'+path],{encoding:'utf8'}); const after=fs.readFileSync(path,'utf8');
  assert.equal(after.match(/By selecting[\s\S]*?<\/p>/)[0],before.match(/By selecting[\s\S]*?<\/p>/)[0]);
  assert.deepEqual([...after.matchAll(/href="tel:[^"]+"/g)].map(m=>m[0]),[...before.matchAll(/href="tel:[^"]+"/g)].map(m=>m[0]));
  assert.ok(!after.includes('Sofia will call you shortly'));
 }
});
