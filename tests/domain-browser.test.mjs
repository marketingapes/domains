// Real-browser reproductions of the QA/QC round-2 findings (F1, F2, F3, F6, F7, F10), driven over the Chrome
// DevTools Protocol with NETWORK CAPTURE ONLY: every request is intercepted; the fake hook host is answered
// locally; anything else off the local origin is blocked. No real hook is ever contacted.
//
// A throwaway copy of the relevant tenant folders is built with `sh build.sh` and fake EE_HOOK_* env vars,
// then served over HTTP. Fixture pages for F10 are derived from stocked pages. Every tenant's REAL config has
// consent_store / suppression_source MISSING, so on real pages the gate must fail closed (G4). To exercise the
// success paths (G1/G2/F1/F2/F6) the fixtures under /spine/ simulate a CONNECTED safety spine: EE_SITE carries
// consent_store + suppression_source VERIFIED, and the built runtime carries an AUTHORITATIVE suppression endpoint that the
// interceptor answers locally ({checked:true, suppressed:false}) — a simulated engine adapter, never page-side clearance.
// BTL's Render face is `preview` per Foundation; its spine fixture is also flipped to `live`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { findChrome, launchBrowser, serveStatic } from './browser/cdp.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FAKE = 'https://hooks.invalid.test';
// lfma/assets/order-intake-client.mjs pins the Make hook host, so the LFMA order lane fixture must use that host.
// The token is synthetic (assembled at runtime), and the interceptor answers the request at the Fetch stage —
// before DNS or any connection — so nothing is ever dispatched to the real host.
const MAKE_HOST = 'https://hook.us2.make.com/';
const LFMA_ORDER = MAKE_HOST + 'qatest'.repeat(5) + '00';
const HOOK_HOSTS = [FAKE, MAKE_HOST];
const chrome = findChrome();
// EE_REQUIRE_CHROME=1 turns a missing browser into a hard failure instead of a skip (used for the clean-tree proof).
if (!chrome && process.env.EE_REQUIRE_CHROME) throw new Error('Chromium is required (EE_REQUIRE_CHROME=1) but none was found; set EE_CHROME');
const skip = chrome ? false : 'no Chromium available (set EE_CHROME)';

let tmp, sites = {}, browser;
test.before(async () => {
  if (skip) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ee-browser-'));
  fs.cpSync(path.join(ROOT, 'build.sh'), path.join(tmp, 'build.sh'));
  for (const t of ['nil', 'lfma', 'dihac', 'btl']) fs.cpSync(path.join(ROOT, t), path.join(tmp, t), { recursive: true });
  execFileSync('sh', ['build.sh'], { cwd: tmp, stdio: 'pipe', env: { ...process.env, EE_HOOK_NIL_INTAKE: `${FAKE}/nil-intake`, EE_HOOK_LFMA_ORDER: LFMA_ORDER, EE_HOOK_LFMA_TRACKING: `${FAKE}/lfma-tracking`, EE_HOOK_DIHAC_CONTACT: `${FAKE}/dihac-contact`, EE_HOOK_BTL_LEAD: `${FAKE}/btl-lead`, EE_SUPPRESSION_NIL_ENDPOINT: `${FAKE}/suppression/nil`, EE_SUPPRESSION_LFMA_ENDPOINT: `${FAKE}/suppression/lfma`, EE_SUPPRESSION_BTL_ENDPOINT: `${FAKE}/suppression/btl`, EE_SUPPRESSION_DIHAC_ENDPOINT: `${FAKE}/suppression/dihac` } });
  // fixtures
  const nilHome = fs.readFileSync(path.join(tmp, 'nil/index.html'), 'utf8');
  fs.writeFileSync(path.join(tmp, 'nil/f10-no-site.html'), nilHome.replace(/<script>window\.EE_SITE=Object\.freeze\(\{[^<]*\}\);<\/script>/, ''));
  fs.writeFileSync(path.join(tmp, 'nil/f10-mismatch.html'), nilHome.replace('<script src="/ee/runtime.js" defer></script>', `<script>window.EE_RUNTIME={tenant_id:'LFMA',hooks:{intake:'${FAKE}/lfma-runtime'}};</script>`));
  fs.writeFileSync(path.join(tmp, 'nil/f10-kill.html'), nilHome.replace('"kill_switch":"OFF"', '"kill_switch":"ON"'));
  // connected-spine fixtures (simulated): same page bytes with the two safety leaves flipped to VERIFIED
  const spine = html => html.replace('"consent_store":"MISSING"', '"consent_store":"VERIFIED"').replace('"suppression_source":"MISSING"', '"suppression_source":"VERIFIED"');
  for (const [t, rel] of [['nil', 'index.html'], ['lfma', 'contact.html'], ['lfma', 'campaign/index.html'], ['btl', 'rhode-island-abuse/index.html'], ['dihac', 'contact.html']]) {
    const src = fs.readFileSync(path.join(tmp, t, rel), 'utf8');
    const out = path.join(tmp, t, 'spine', rel); fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, spine(t === 'btl' ? src.replace('"production_gate":"preview"', '"production_gate":"live"') : src).replace(/(href|src)="\.\.\/assets\//g, '$1="/assets/').replace(/import\('\.\.\/assets\//g, "import('/assets/"));
  }
  for (const t of ['nil', 'lfma', 'dihac', 'btl']) sites[t] = await serveStatic(path.join(tmp, t));
  browser = await launchBrowser();
});
test.after(async () => {
  if (browser) await browser.close();
  for (const s of Object.values(sites)) await s.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

const CLEAR = { status: 200, body: JSON.stringify({ checked: true, suppressed: false, source: 'test-authority' }) };
const SUPPRESSED = { status: 200, body: JSON.stringify({ checked: true, suppressed: true, source: 'test-authority' }) };
const open = async (t, p, suppression = CLEAR) => { const page = await browser.page({ allow: [sites[t].origin], fulfill: { [`${FAKE}/suppression/`]: suppression, [FAKE]: { status: 200, body: '{}' }, [MAKE_HOST]: { status: 200, body: '{"ok":true}' } } }); await page.goto(sites[t].origin + p); return page; };
const suppressionLookups = page => page.requests.filter(r => r.url.startsWith(`${FAKE}/suppression/`));
const ee = (page, expr) => page.evaluate(`(function(){ var EE = window.EE; return (${expr}); })()`);
const hookRequests = page => page.requests.filter(r => HOOK_HOSTS.some(h => r.url.startsWith(h)) && !r.url.startsWith(`${FAKE}/suppression/`));
const QA_ID = "{email:'qa@example.test', phone:'4015550100'}";
const connectSpine = page => ee(page, "EE.safety.suppression.source + '/' + EE.safety.consent.store + '/' + EE.safety.suppression.endpoint_configured");

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

test('G4 (browser): on the REAL NIL page consent.record() by page JS cannot open the gate — consent store and suppression source are MISSING', { skip }, async () => {
  const page = await open('nil', '/');
  assert.equal(await ee(page, "EE.hooks.configured('intake')"), true, 'hook is configured; the gate is what blocks');
  for (let i = 0; i < 3; i++) await ee(page, "EE.safety.consent.record({surface:'nil_sofia_form',consent_text_id:'NIL_TCPA_AI_2026-08-18_V1',method:'checkbox'})");
  assert.equal(await ee(page, "(function(){ try { EE.safety.suppression.use(function(){ return { suppressed: false }; }); return 'accepted'; } catch (e) { return e.message; } })()"), 'page code is not an authoritative suppression source');
  assert.equal(await ee(page, `EE.hooks.resolve('intake', ${QA_ID}).then(function(u){ return u; })`), null);
  assert.equal(await ee(page, "EE.hooks.why('intake')"), 'consent store not connected: MISSING');
  assert.equal(await ee(page, `EE.hooks.post('intake',{}, {identity: ${QA_ID}}).then(function(){return 'sent'},function(e){return e.name})`), 'OutboundBlocked');
  assert.equal(hookRequests(page).length, 0, 'nothing left the page');
  await page.close();
});

test('F6 (browser, connected spine): NIL intake hook resolves only after consent + clear suppression check, is blocked again when the switch trips, and direct fetch cannot bypass', { skip }, async () => {
  const page = await open('nil', '/spine/index.html');
  assert.equal(await ee(page, `EE.hooks.url('intake', ${QA_ID})`), null);
  assert.equal(await ee(page, "EE.hooks.why('intake')"), 'no consent evidence recorded');
  assert.equal(await ee(page, "EE.hooks.configured('intake')"), true);
  assert.equal(await connectSpine(page), 'VERIFIED/VERIFIED/true');
  await ee(page, "EE.safety.consent.record({surface:'nil_sofia_form',consent_text_id:'NIL_TCPA_AI_2026-08-18_V1',method:'checkbox'})");
  assert.equal(await ee(page, `EE.hooks.url('intake', ${QA_ID})`), null, 'consent alone is not enough: the authoritative check has not been performed');
  assert.equal(await ee(page, `EE.hooks.resolve('intake', ${QA_ID})`), `${FAKE}/nil-intake`, 'authoritative clear => URL');
  assert.equal(suppressionLookups(page).length, 1, 'exactly one authoritative lookup');
  assert.equal(JSON.parse(suppressionLookups(page)[0].body).identity.email, 'qa@example.test');
  await ee(page, `EE.hooks.post('intake',{lead_id:'L-1'}, {identity: ${QA_ID}})`);
  await page.wait(200);
  assert.equal(hookRequests(page).length, 1);
  assert.equal(JSON.parse(hookRequests(page)[0].body).tenant_id, 'NIL');
  await ee(page, "EE.safety.killSwitch.trip('browser-test')");
  assert.equal(await ee(page, `EE.hooks.url('intake', ${QA_ID})`), null);
  assert.equal(await ee(page, `EE.hooks.post('intake',{}, {identity: ${QA_ID}}).then(function(){return 'sent'},function(e){return e.name})`), 'OutboundBlocked');
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

test('F1/G2 (browser, connected spine): LFMA contact form submits once through the gated hook with the legacy helper loaded first; a double-click is one POST', { skip }, async () => {
  const page = await open('lfma', '/spine/contact.html');
  assert.equal(await ee(page, 'EE.__stocked'), true);
  assert.equal(await ee(page, "typeof EE.legacy.sendToWebhook"), 'function');
  await connectSpine(page);
  await page.evaluate(`(function(){ document.getElementById('firm_name').value='Test Firm'; document.getElementById('contact_name').value='QA Bot'; document.getElementById('email').value='qa@example.test'; var f=document.getElementById('agency-contact-form'); var ev=function(){ return new Event('submit',{cancelable:true,bubbles:true}); }; f.dispatchEvent(ev()); f.dispatchEvent(ev()); f.querySelector('button[type=submit]').click(); })()`);
  await page.wait(700);
  const orders = hookRequests(page).filter(r => r.url === LFMA_ORDER);
  assert.equal(orders.length, 1, `exactly one order request, got ${JSON.stringify(hookRequests(page))}`);
  assert.match(orders[0].body, /Test Firm/);
  assert.deepEqual(page.errors.filter(e => /TypeError|sendToWebhook|not a function/.test(e)), [], 'no API collision errors');
  assert.ok(page.navigations.some(u => /thank-you\.html$/.test(u)), 'redirect happened only after the confirmed send');
  await page.close();
});

test('F2 (browser, connected spine): BTL Rhode Island submit shows one success, no alert, no phantom error', { skip }, async () => {
  const page = await open('btl', '/spine/rhode-island-abuse/index.html');
  await connectSpine(page);
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

// ================================================================= round 3 — G1 / G2
const openWith = async (t, p, fulfil) => { const page = await browser.page({ allow: [sites[t].origin], fulfill: { [`${FAKE}/suppression/`]: CLEAR, [FAKE]: fulfil, [MAKE_HOST]: fulfil } }); await page.goto(sites[t].origin + p); return page; };
const fillBrief = `(function(){ var q=function(id){return document.getElementById(id)}; var setSel=function(el){ if(!el) return; if(el.tagName==='SELECT'){ for(var i=0;i<el.options.length;i++){ if(el.options[i].value){ el.selectedIndex=i; break; } } } else { el.value = el.value || 'test'; } };
  q('firm').value='Test Firm'; q('name').value='QA Bot'; q('email').value='qa@example.test'; setSel(q('tort')); setSel(q('geo')); setSel(q('no')); setSel(q('budget'));
  ['tort','geo','no','budget'].forEach(function(id){ var el=q(id); if(el && el.tagName!=='SELECT' && !el.value) el.value='test'; }); })()`;
const clickSubmit = sel => `(function(){ var b=document.querySelector(${JSON.stringify(sel)}); if (b.disabled) return 'disabled'; b.click(); return 'clicked'; })()`;

test('G1 (browser, real config): /campaign/ loads, "Send the brief" is usable, and a blocked hook follows the explicit failure path with no send and no exception', { skip }, async () => {
  const page = await openWith('lfma', '/campaign/', { status: 200, body: '{"ok":true}' });
  await page.wait(600); // dynamic import of the adapter
  assert.equal(await page.evaluate("document.querySelector('#briefForm button[type=submit]').disabled"), false, 'button usable after bind');
  assert.equal(await page.evaluate("document.querySelector('#briefForm button[type=submit]').textContent.trim()"), 'Send the brief');
  await page.evaluate(fillBrief);
  assert.equal(await page.evaluate(clickSubmit('#briefForm button[type=submit]')), 'clicked');
  await page.wait(500);
  assert.equal(hookRequests(page).length, 0, 'nothing sent');
  assert.equal(await page.evaluate("document.getElementById('lfmaReceiptError').hidden"), false, 'visible failure state');
  assert.match(await page.evaluate("document.getElementById('lfmaReceiptError').textContent"), /not configured/i);
  assert.equal(await page.evaluate("document.getElementById('sent').hidden"), true, 'no fake success');
  assert.equal(await page.evaluate("document.getElementById('briefForm').hidden"), false);
  assert.equal(await page.evaluate("document.querySelector('#briefForm button[type=submit]').disabled"), false, 'retry allowed');
  assert.deepEqual(page.errors, [], 'no exception');
  await page.close();
});

test('G1 (browser, connected spine): configured brief submission follows exactly one send/success path; repeated clicks never send twice', { skip }, async () => {
  const page = await openWith('lfma', '/spine/campaign/index.html', { status: 200, body: '{"ok":true}' });
  await page.wait(600);
  await connectSpine(page);
  await page.evaluate(fillBrief);
  await page.evaluate(`(function(){ var b=document.querySelector('#briefForm button[type=submit]'); b.click(); b.click(); document.getElementById('briefForm').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); })()`);
  await page.wait(800);
  const orders = hookRequests(page).filter(r => r.url === LFMA_ORDER);
  assert.equal(orders.length, 1, `exactly one send, got ${JSON.stringify(hookRequests(page))}; errorBox=${await page.evaluate("(document.getElementById('lfmaReceiptError')||{textContent:'(none)'}).textContent")}; errors=${JSON.stringify(page.errors)}; why=${await ee(page, "EE.hooks.why('order')")}`);
  assert.equal(await page.evaluate("document.getElementById('sent').hidden"), false, 'success shown');
  assert.match(await page.evaluate("document.getElementById('sent').textContent"), /Brief receipt confirmed/);
  assert.equal(await page.evaluate("document.getElementById('briefForm').hidden"), true);
  await page.evaluate(`document.getElementById('briefForm').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))`);
  await page.wait(200);
  assert.equal(hookRequests(page).filter(r => r.url === LFMA_ORDER).length, 1, 'no send after success');
  assert.deepEqual(page.errors, [], 'no exception');
  await page.close();
});

const fillContact = `(function(){ document.getElementById('firm_name').value='Test Firm'; document.getElementById('contact_name').value='QA Bot'; document.getElementById('email').value='qa@example.test'; })()`;

test('G2 (browser, real config): contact submit with a blocked gate shows a visible failure, sends nothing, and never redirects', { skip }, async () => {
  const page = await openWith('lfma', '/contact.html', { status: 200, body: '{}' });
  await page.evaluate(fillContact);
  await page.evaluate(clickSubmit('#agency-contact-form button[type=submit]'));
  await page.wait(700);
  assert.equal(hookRequests(page).length, 0);
  assert.equal(await page.evaluate("document.getElementById('contactStatus').hidden"), false);
  assert.match(await page.evaluate("document.getElementById('contactStatus').textContent"), /not connected yet \(consent store not connected: MISSING\)/);
  assert.equal(await page.evaluate('location.pathname'), '/contact.html', 'no redirect');
  assert.equal(await page.evaluate("document.querySelector('#agency-contact-form button[type=submit]').disabled"), false, 'retry allowed');
  assert.deepEqual(page.errors, []);
  await page.close();
});

test('G2 (browser, connected spine): a failed request shows failure and allows a safe retry; success redirects only after a confirmed 200', { skip }, async () => {
  let n = 0;
  const page = await openWith('lfma', '/spine/contact.html', () => ({ status: ++n === 1 ? 500 : 200, body: '{}' }));
  await connectSpine(page);
  await page.evaluate(fillContact);
  await page.evaluate(clickSubmit('#agency-contact-form button[type=submit]'));
  await page.wait(700);
  assert.equal(hookRequests(page).length, 1, 'first attempt sent once');
  assert.equal(await page.evaluate('location.pathname'), '/spine/contact.html', 'no redirect on HTTP 500');
  assert.match(await page.evaluate("document.getElementById('contactStatus').textContent"), /could not send/);
  assert.equal(await page.evaluate("document.querySelector('#agency-contact-form button[type=submit]').disabled"), false, 'retry allowed after genuine failure');
  await page.evaluate(clickSubmit('#agency-contact-form button[type=submit]'));
  await page.wait(900);
  assert.equal(hookRequests(page).length, 2, 'retry sent exactly once more');
  assert.ok(page.navigations.some(u => u.endsWith('/spine/thank-you.html')) || (await page.evaluate('location.pathname')).endsWith('thank-you.html'), 'redirect only after confirmed success');
  await page.close();
});

test('G2 (browser, connected spine): kill switch tripped mid-session => zero redirect, visible failure, nothing sent', { skip }, async () => {
  const page = await openWith('lfma', '/spine/contact.html', { status: 200, body: '{}' });
  await connectSpine(page);
  await ee(page, "EE.safety.killSwitch.trip('adversarial')");
  await page.evaluate(fillContact);
  await page.evaluate(clickSubmit('#agency-contact-form button[type=submit]'));
  await page.wait(500);
  assert.equal(hookRequests(page).length, 0);
  assert.equal(await page.evaluate('location.pathname'), '/spine/contact.html');
  assert.match(await page.evaluate("document.getElementById('contactStatus').textContent"), /kill_switch ON/);
  await page.close();
});

// ================================================================= round 4 — H1 authoritative suppression (real browser)
test('H1 (browser): a fake page checker cannot clear suppression — use() throws and nothing changes', { skip }, async () => {
  const page = await open('nil', '/spine/index.html');
  await ee(page, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  for (const fake of ['function(){ return { suppressed: false }; }', 'function(){ return { checked: true, suppressed: false }; }', 'function(){ return {}; }', 'function(){ return null; }', 'function(){ return Promise.resolve({ suppressed: false }); }']) {
    assert.equal(await ee(page, `(function(){ try { EE.safety.suppression.use(${fake}); return 'accepted'; } catch (e) { return e.message; } })()`), 'page code is not an authoritative suppression source');
  }
  assert.equal(await ee(page, `EE.hooks.url('intake', ${QA_ID})`), null, 'sync url() never clears by itself');
  assert.equal(await ee(page, "EE.hooks.why('intake')"), 'authoritative suppression check not performed');
  assert.equal(hookRequests(page).length, 0);
  await page.close();
});

test('H1 (browser): an authoritative suppressed:true answer blocks; a blocked/unavailable lookup blocks; missing identity blocks', { skip }, async () => {
  const hit = await open('nil', '/spine/index.html', SUPPRESSED);
  await ee(hit, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  assert.equal(await ee(hit, `EE.hooks.resolve('intake', ${QA_ID})`), null);
  assert.equal(await ee(hit, "EE.hooks.why('intake')"), 'suppressed');
  assert.equal(await ee(hit, `EE.hooks.resolve('intake', ${QA_ID})`), null, 'cached suppressed result stays blocked');
  assert.equal(hookRequests(hit).length, 0);
  await hit.close();
  // lookup endpoint unreachable: the interceptor fails it like a dead network
  const down = await browser.page({ allow: [sites.nil.origin], fulfill: { [MAKE_HOST]: { status: 200, body: '{}' } } }); // FAKE host is NOT answered: every lookup and hook fails BlockedByClient
  await down.goto(sites.nil.origin + '/spine/index.html');
  await ee(down, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  assert.equal(await ee(down, `EE.hooks.resolve('intake', ${QA_ID})`), null);
  assert.match(await ee(down, "EE.hooks.why('intake')"), /authoritative suppression check unavailable|Failed to fetch|timed out/);
  assert.equal(hookRequests(down).filter(r => r.fulfilled).length, 0);
  await down.close();
  const noid = await open('nil', '/spine/index.html');
  await ee(noid, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  assert.equal(await ee(noid, "EE.hooks.resolve('intake')"), null);
  assert.equal(await ee(noid, "EE.hooks.why('intake')"), 'no identity for suppression check');
  assert.equal(await ee(noid, "EE.hooks.resolve('intake', {email:'not-an-email', phone:'12'})"), null);
  assert.equal(suppressionLookups(noid).length, 0, 'no lookup without a usable identity');
  await noid.close();
});

test('H1 (browser): replacing window.EE_RUNTIME after load cannot inject a clearing endpoint; outbound.allowed() validates the runtime tenant', { skip }, async () => {
  const page = await open('nil', '/spine/index.html');
  await ee(page, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  await ee(page, `(function(){ try { window.EE_RUNTIME = { tenant_id: 'NIL', hooks: { intake: '${FAKE}/evil' }, suppression_endpoint: '${FAKE}/suppression/evil' }; } catch (e) {} })()`);
  assert.equal(await ee(page, `EE.hooks.resolve('intake', ${QA_ID})`), `${FAKE}/nil-intake`, 'the runtime captured at init is the only one used');
  assert.equal(suppressionLookups(page)[0].url, `${FAKE}/suppression/nil`);
  await page.close();
  const mismatch = await open('nil', '/f10-mismatch.html');
  await ee(mismatch, "EE.safety.consent.record({surface:'t',consent_text_id:'T'})");
  assert.match(await ee(mismatch, `EE.outbound.allowed(${QA_ID}).reason`), /runtime tenant mismatch: LFMA/);
  assert.equal(await ee(mismatch, `EE.outbound.check(${QA_ID}).then(function(g){ return g.allowed; })`), false);
  assert.equal(suppressionLookups(mismatch).length, 0, 'a mismatched runtime\'s endpoint is never called');
  await mismatch.close();
});

test('browser harness never contacted anything but the local origin and the intercepted hook hosts', { skip }, async () => {
  const page = await open('nil', '/');
  const offOrigin = page.requests.filter(r => !HOOK_HOSTS.some(h => r.url.startsWith(h)));
  for (const r of offOrigin) assert.equal(r.fulfilled, false, `${r.url} was blocked, not served`);
  await page.close();
});
