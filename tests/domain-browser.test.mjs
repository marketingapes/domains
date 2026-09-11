// Real-browser reproductions of the QA/QC round-2 findings (F1, F2, F3, F6, F7, F10), driven over the Chrome
// DevTools Protocol with NETWORK CAPTURE ONLY: every request is intercepted; the fake hook host is answered
// locally; anything else off the local origin is blocked. No real hook is ever contacted.
//
// A throwaway copy of the relevant tenant folders is built with `sh build.sh` and fake EE_HOOK_* env vars,
// then served over HTTP. Fixture pages for F10 are derived from stocked pages. BTL's Render face is
// `preview` per Foundation; its fixture is flipped to `live` so the success path can be exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { findChrome, launchBrowser, serveStatic } from './browser/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FAKE = 'https://hooks.invalid.test';
const chrome = findChrome();
const skip = chrome ? false : 'no Chromium available (set EE_CHROME)';

let tmp, sites = {}, browser;
test.before(async () => {
  if (skip) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ee-browser-'));
  fs.cpSync(path.join(ROOT, 'build.sh'), path.join(tmp, 'build.sh'));
  for (const t of ['nil', 'lfma', 'dihac', 'btl']) fs.cpSync(path.join(ROOT, t), path.join(tmp, t), { recursive: true });
  execFileSync('sh', ['build.sh'], { cwd: tmp, stdio: 'pipe', env: { ...process.env, EE_HOOK_NIL_INTAKE: `${FAKE}/nil-intake`, EE_HOOK_LFMA_ORDER: `${FAKE}/lfma-order`, EE_HOOK_LFMA_TRACKING: `${FAKE}/lfma-tracking`, EE_HOOK_DIHAC_CONTACT: `${FAKE}/dihac-contact`, EE_HOOK_BTL_LEAD: `${FAKE}/btl-lead` } });
  // fixtures
  const nilHome = fs.readFileSync(path.join(tmp, 'nil/index.html'), 'utf8');
  fs.writeFileSync(path.join(tmp, 'nil/f10-no-site.html'), nilHome.replace(/<script>window\.EE_SITE=Object\.freeze\(\{[^<]*\}\);<\/script>/, ''));
  fs.writeFileSync(path.join(tmp, 'nil/f10-mismatch.html'), nilHome.replace('<script src="/ee/runtime.js" defer></script>', `<script>window.EE_RUNTIME={tenant_id:'LFMA',hooks:{intake:'${FAKE}/lfma-runtime'}};</script>`));
  fs.writeFileSync(path.join(tmp, 'nil/f10-kill.html'), nilHome.replace('"kill_switch":"OFF"', '"kill_switch":"ON"'));
  const btlRi = path.join(tmp, 'btl/rhode-island-abuse/index.html');
  fs.writeFileSync(btlRi, fs.readFileSync(btlRi, 'utf8').replace('"production_gate":"preview"', '"production_gate":"live"'));
  for (const t of ['nil', 'lfma', 'dihac', 'btl']) sites[t] = await serveStatic(path.join(tmp, t));
  browser = await launchBrowser();
});
test.after(async () => {
  if (browser) await browser.close();
  for (const s of Object.values(sites)) await s.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

const open = async (t, p) => { const page = await browser.page({ allow: [sites[t].origin], fulfill: { [FAKE]: { status: 200, body: '{}' } } }); await page.goto(sites[t].origin + p); return page; };
const ee = (page, expr) => page.evaluate(`(function(){ var EE = window.EE; return (${expr}); })()`);
const hookRequests = page => page.requests.filter(r => r.url.startsWith(FAKE));

test('F10 (browser): a page without EE_SITE fails closed', { skip }, async () => {
  const page = await open('nil', '/f10-no-site.html');
  assert.equal(await ee(page, 'EE.__stocked'), false);
  assert.match(await ee(page, 'EE.__failed'), /EE_SITE/);
  assert.equal(await ee(page, "EE.hooks.url('intake')"), null);
  assert.equal(await ee(page, "(window.dataLayer||[]).filter(function(e){return e&&/^ee_/.test(e.event)&&e.ee_bootstrap_version}).length"), 0, 'bootstrap emitted nothing');
  await page.close();
});

test('F10 (browser): a runtime built for another tenant is refused even after consent', { skip }, async () => {
  const page = await open('nil', '/f10-mismatch.html');
  assert.equal(await ee(page, 'EE.__stocked'), true);
  await ee(page, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  assert.equal(await ee(page, "EE.hooks.url('intake')"), null);
  assert.match(await ee(page, "EE.hooks.why('intake')"), /runtime tenant mismatch: LFMA/);
  assert.equal(await ee(page, "window.dataLayer.some(function(e){return e.event==='ee_runtime_mismatch'})"), true);
  assert.equal(hookRequests(page).length, 0);
  await page.close();
});

test('F10/F6 (browser): canonical kill switch ON silences the page', { skip }, async () => {
  const page = await open('nil', '/f10-kill.html');
  assert.equal(await ee(page, "EE.safety.killSwitch.state()"), 'ON');
  await ee(page, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  assert.equal(await ee(page, "EE.hooks.url('intake')"), null);
  assert.equal(await ee(page, "window.dataLayer.filter(function(e){return e&&e.ee_bootstrap_version}).length"), 0);
  await page.close();
});

test('F6 (browser): NIL intake hook resolves only after consent, is blocked again when the switch trips, and direct fetch cannot bypass', { skip }, async () => {
  const page = await open('nil', '/');
  assert.equal(await ee(page, "EE.hooks.url('intake')"), null);
  assert.equal(await ee(page, "EE.hooks.why('intake')"), 'no consent evidence recorded');
  assert.equal(await ee(page, "EE.hooks.configured('intake')"), true);
  await ee(page, "EE.safety.consent.record({surface:'nil_sofia_form',consent_text_id:'NIL_TCPA_AI_2026-08-18_V1',method:'checkbox'})");
  assert.equal(await ee(page, "EE.hooks.url('intake')"), `${FAKE}/nil-intake`);
  await ee(page, "EE.hooks.post('intake',{lead_id:'L-1'})");
  await page.wait(200);
  assert.equal(hookRequests(page).length, 1);
  assert.equal(JSON.parse(hookRequests(page)[0].body).tenant_id, 'NIL');
  await ee(page, "EE.safety.killSwitch.trip('browser-test')");
  assert.equal(await ee(page, "EE.hooks.url('intake')"), null);
  assert.equal(await ee(page, "EE.hooks.post('intake',{}).then(function(){return 'sent'},function(e){return e.name})"), 'OutboundBlocked');
  assert.equal(hookRequests(page).length, 1, 'no second request');
  await page.close();
});

test('F7 (browser): reserved context cannot be overridden or replaced', { skip }, async () => {
  const page = await open('nil', '/');
  const ev = await ee(page, "EE.track('ee_probe',{tenant_id:'EVIL',session_id:'forged',consent_state:'recorded',custom:1})");
  assert.equal(ev.tenant_id, 'NIL'); assert.equal(ev.consent_state, 'none'); assert.match(ev.session_id, /^ses_/); assert.equal(ev.custom, 1);
  assert.deepEqual(ev.ee_rejected_props.sort(), ['consent_state', 'session_id', 'tenant_id']);
  assert.equal(await ee(page, "(function(){ try { window.EE = {pwned:true}; } catch (e) {} try { EE.hooks.url = function(){ return 'x'; }; } catch (e) {} return window.EE.__stocked === true && typeof window.EE.hooks.url === 'function' && window.EE.hooks.url('intake') === null; })()"), true);
  assert.equal(await ee(page, "(function(){ var c = EE.context; try { c.tenant_id = 'X'; } catch (e) {} return EE.context.tenant_id; })()"), 'NIL');
  await page.close();
});

test('F3 (browser): DIHAC contact page — deferred legacy tracking.js registers under EE.legacy, stocked API survives', { skip }, async () => {
  const page = await open('dihac', '/contact.html');
  assert.equal(await ee(page, 'EE.__stocked'), true);
  assert.equal(await ee(page, "typeof EE.hooks.url"), 'function');
  assert.equal(await ee(page, "typeof EE.safety.consent.record"), 'function');
  assert.equal(await ee(page, "typeof EE.legacy.sendToWebhook"), 'function');
  assert.equal(await ee(page, "typeof window.EETracking.pushEvent"), 'function');
  assert.deepEqual(page.errors.filter(e => /EE|sendToWebhook|TypeError/.test(e)), []);
  await page.close();
});

test('F1 (browser): LFMA contact form submits once through the gated hook with the legacy helper loaded first', { skip }, async () => {
  const page = await open('lfma', '/contact.html');
  assert.equal(await ee(page, 'EE.__stocked'), true);
  assert.equal(await ee(page, "typeof EE.legacy.sendToWebhook"), 'function');
  await page.evaluate(`(function(){ document.getElementById('firm_name').value='Test Firm'; document.getElementById('contact_name').value='QA Bot'; document.getElementById('email').value='qa@example.test'; var f=document.getElementById('agency-contact-form'); f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); })()`);
  await page.wait(400);
  const orders = hookRequests(page).filter(r => r.url === `${FAKE}/lfma-order`);
  assert.equal(orders.length, 1, `exactly one order request, got ${JSON.stringify(hookRequests(page))}`);
  assert.match(orders[0].body, /Test Firm/);
  assert.deepEqual(page.errors.filter(e => /TypeError|sendToWebhook|not a function/.test(e)), [], 'no API collision errors');
  assert.equal(await ee(page, "window.dataLayer.some(function(e){return e.event==='ee_consent_evidence'&&e.consent_text_id==='LFMA_CONTACT_BY_SUBMIT_2026-09-11_V1'})"), true);
  await page.close();
});

test('F2 (browser): BTL Rhode Island submit shows one success, no alert, no phantom error', { skip }, async () => {
  const page = await open('btl', '/rhode-island-abuse/');
  await page.evaluate(`(function(){ window.__alerts=[]; window.alert=function(m){ window.__alerts.push(String(m)); };
    var q=function(id){return document.getElementById(id)};
    var t=q('f_type'); if(t&&t.tagName==='SELECT'){ t.selectedIndex = Math.min(1, t.options.length-1); } else if (t) { t.value='abuse'; }
    q('f_name').value='QA Bot'; q('f_phone').value='4015550100'; q('f_email').value='qa@example.test';
    var s=q('f_state'); if(s&&s.tagName==='SELECT'){ for (var i=0;i<s.options.length;i++){ if(s.options[i].value==='RI'){ s.selectedIndex=i; break; } } if(s.selectedIndex<1) s.selectedIndex=Math.min(1,s.options.length-1); } else if (s) { s.value='RI'; }
    document.getElementById('leadform').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); })()`);
  await page.wait(600);
  const leads = hookRequests(page).filter(r => r.url === `${FAKE}/btl-lead`);
  assert.equal(leads.length, 1, `one lead request, got ${JSON.stringify(hookRequests(page))}`);
  assert.deepEqual(await page.evaluate('window.__alerts'), [], 'no alert on the success path');
  assert.equal(await page.evaluate("document.getElementById('okmsg').classList.contains('hide')"), false, 'success message shown');
  assert.equal(await page.evaluate("window.dataLayer.filter(function(e){return e.event==='ee_lead_submit_success'}).length"), 1);
  assert.equal(await page.evaluate("window.dataLayer.filter(function(e){return e.event==='ee_lead_submit_error'}).length"), 0);
  assert.equal(await page.evaluate("(window.dataLayer.find(function(e){return e.event==='EEConvert'})||{}).lead_destination"), 'ee:hook:lead');
  assert.deepEqual(page.errors.filter(e => /WEBHOOK_URL|ReferenceError/.test(e)), [], 'no ReferenceError');
  await page.close();
});

test('browser harness never contacted anything but the local origin and the fake hook host', { skip }, async () => {
  const page = await open('nil', '/');
  const offOrigin = page.requests.filter(r => !r.url.startsWith(FAKE));
  for (const r of offOrigin) assert.equal(r.fulfilled, false, `${r.url} was blocked, not served`);
  await page.close();
});
