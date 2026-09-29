import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

// Owned-source tests only. No browser, provider scripts, network or analytics hits.
// A corrected, approved collector needs separate provider and consent evidence.
const html = readFileSync(process.env.EE_WORKFLOW_HTML || new URL('../ma/workflow-review/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const ctaTag = html.match(/<a\b[^>]*class="cta"[^>]*>/i)?.[0];
const handler = ctaTag?.match(/onclick="([^"]*)"/)?.[1];
const expectedPage = { event: 'ee_page_context', tenant_id: 'MA', domain: 'marketingapes.com', page_type: 'workflow-review', measurement_state: 'local_only' };
const expectedClick = { ...expectedPage, event: 'ee_cta_click', cta: 'workflow_review_email' };
const plain = v => JSON.parse(JSON.stringify(v));

function boot(layer) {
  const outbound = [];
  const window = { dataLayer: layer };
  Object.defineProperty(window, 'location', { get() { throw new Error('Do not inspect visitor URLs'); } });
  const document = {
    getElementsByTagName() { return [{ parentNode: { insertBefore(node) { outbound.push(node.src); } } }]; },
    createElement() { return {}; }
  };
  const context = vm.createContext({ window, document, fetch() { throw new Error('Network forbidden'); }, navigator: { sendBeacon() { throw new Error('Beacon forbidden'); } } });
  for (const script of scripts) vm.runInContext(script, context, { timeout: 100 });
  return { window, outbound, click() { assert.ok(handler, 'CTA handler required'); return vm.runInContext('(function(){' + handler + '\n}).call(null)', context, { timeout: 100 }); } };
}

test('all original page content, style, links and metadata are byte-preserved', () => {
  const stripped = html.replace(/<!-- EE-WORKFLOW-INTENT LOCAL_ONLY:[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/ onclick="[^"]*"/g, '');
  const bytes = Buffer.from(stripped);
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(hash, 'dff4b889f8d2b68d19c392b49d82fabf5583ccee');
});
test('unverified GTM loader and noscript iframe are not expanded onto this page', () => {
  assert.doesNotMatch(html, /googletagmanager|google-analytics|<iframe|<script\b[^>]*\bsrc\s*=/i);
  assert.deepEqual(boot().outbound, []);
});
test('page boot records one local context event', () => {
  const h = boot(); assert.equal(h.window.dataLayer.length, 1); assert.deepEqual(plain(h.window.dataLayer[0]), expectedPage);
});
test('page boot is not a CTA interaction', () => {
  assert.equal(boot().window.dataLayer.filter(e => e.event === 'ee_cta_click').length, 0);
});
test('one CTA activation records exactly one fixed intent event', () => {
  const h = boot(); h.click(); assert.equal(h.window.dataLayer.length, 2); assert.deepEqual(plain(h.window.dataLayer[1]), expectedClick);
});
test('two deliberate activations are two intents, not lead conversions', () => {
  const h = boot(); h.click(); h.click(); assert.equal(h.window.dataLayer.filter(e => e.event === 'ee_cta_click').length, 2);
});
test('neither initial load nor CTA emits a lead, registration or purchase', () => {
  const h = boot(); h.click();
  assert.deepEqual(plain(h.window.dataLayer.map(e => e.event)), ['ee_page_context', 'ee_cta_click']);
});
test('no visitor URL, address, subject or free-text label enters the payload', () => {
  const h = boot(); h.click();
  assert.doesNotMatch(JSON.stringify(h.window.dataLayer), /mailto:|@|subject|href|location|label|query/i);
  for (const event of h.window.dataLayer) assert.deepEqual(plain(event), event.event === 'ee_cta_click' ? expectedClick : expectedPage);
});
test('CTA remains the original native mailto link', () => {
  assert.match(ctaTag, /href="mailto:kyleg@marketingapes\.com\?subject=WORKFLOW%20REVIEW"/);
  assert.doesNotMatch(handler, /preventDefault|return\s+false|fetch|sendBeacon|location|window\.open/);
});
test('successful handler does not cancel native navigation', () => {
  assert.equal(boot().click(), undefined);
});
test('existing dataLayer events are preserved', () => {
  const sentinel = { event: 'existing' }; const queue = [sentinel]; const h = boot(queue);
  assert.equal(h.window.dataLayer, queue); assert.equal(h.window.dataLayer[0], sentinel);
});
test('frozen queue does not break the page or email link', () => {
  const h = boot(Object.freeze([])); assert.doesNotThrow(() => h.click());
});
test('a throwing push handler does not block email navigation', () => {
  const h = boot({ push() { throw new Error('tracking unavailable'); } }); assert.doesNotThrow(() => h.click());
});
test('missing dataLayer at click is initialized safely', () => {
  const h = boot(); delete h.window.dataLayer; h.click(); assert.deepEqual(plain(h.window.dataLayer), [expectedClick]);
});
test('null dataLayer initializes safely', () => {
  const h = boot(null); h.click(); assert.equal(h.window.dataLayer.length, 2);
});
test('collection remains explicitly local-only, with no network or storage code', () => {
  assert.match(html, /EE-WORKFLOW-INTENT LOCAL_ONLY:/);
  assert.doesNotMatch(scripts.join('\n') + handler, /fetch|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|cookie/);
  const h = boot(); h.click(); assert.deepEqual(h.outbound, []);
  assert.ok(h.window.dataLayer.every(e => e.measurement_state === 'local_only'));
});
