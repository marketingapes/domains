// Glassman Perspective portal + campaign request brief: content safety and request logic.
// No network: every submission path here uses an injected fake fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as B from '../btl/glassman/request/brief.js';

const dir = new URL('../btl/glassman/', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');
const portal = read('index.html'), request = read('request/index.html');
const served = { 'index.html': portal, 'request/index.html': request, 'glassman.css': read('glassman.css'), 'request/brief.js': read('request/brief.js'), 'request/request.js': read('request/request.js'), 'README.md': read('README.md') };
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('served Glassman assets carry no trackers, webhooks, external requests or legacy terms', () => {
  for (const [name, src] of Object.entries(served)) {
    assert.doesNotMatch(src, /googletagmanager|GTM-|dataLayer|gtag\(|fbq\(|hook\.[a-z0-9]+\.make\.com|zapier|fonts\.googleapis|fonts\.gstatic/i, name);
    assert.doesNotMatch(src, /(?:src|href)\s*=\s*["']https?:\/\//i, `${name} loads nothing from another origin`);
    assert.doesNotMatch(src, /stop-loss|refund|\$5,000 ad spend|invoice is on its way|Request received/i, name);
  }
  assert.deepEqual(readdirSync(dir).sort(), ['README.md', 'glassman.css', 'index.html', 'reporting', 'request', 'ssdi'].sort());
});

test('client copy explains campaign structure without financial facts, identifiers or unsupported delivery claims', () => {
  const v = visible(portal);
  for (const s of ['Campaign structure', 'Setup', 'Campaign media', 'Intake & reporting', 'November 5, 2026', 'Planning snapshot', 'Current delivery unverified', 'never backdated', 'not live-verified', 'approved launch or resume', 'Not connected', 'Verified leads', 'Intake outcomes', 'Media spend', 'Timestamp unavailable until a source is connected'])
    assert.ok(v.toLowerCase().includes(s.toLowerCase()), `portal mentions ${s}`);
  assert.match(v, /Motor vehicle accidents not included/);
  assert.match(v, /ChatGPT Held/); assert.match(v, /TikTok Held/);
  assert.match(v, /Google Search Not ready/);
  assert.match(v, /Facebook Delivery unverified/);
  for (const [name, src] of Object.entries(served)) {
    const text = name.endsWith('.html') ? visible(src) : src;
    // No client commercial facts: package amounts, balances, invoice/payment dates or payment status.
    assert.doesNotMatch(text, /\$\s?\d[\d,]*(?:\.\d+)?(?!\d)/, `${name}: no dollar amounts`);
    assert.doesNotMatch(text, /\bbalance\b|\bpaid\b|payment confirmed|invoice (?:dated|number|no\.)|October 29|November 4|Oct 29|Nov 4\b/i, `${name}: no payment facts`);
    // No account, source or lead identifiers.
    assert.doesNotMatch(src, /8684|GLASSMAN-SSD|docs\.google\.com|spreadsheets|1KWy3H5x|hook\.[a-z0-9]+\.make\.com|BigQuery|raw_lead_events/, `${name}: no identifiers or source links`);
    // Launch history is unverified: no claim that an ad has or has not run.
    assert.doesNotMatch(text, /before the first ad|no ad (?:is|has) (?:running|run)|never (?:been )?delivered|has not (?:yet )?(?:launched|delivered|run)|not started|Day 1/i, `${name}: no unsupported first-delivery claim`);
  }
  for (const bad of ['checkpoint', 'review point', 'per day', '/day', 'Make 6777650', 'Vapi', 'CallRail', '339', 'credits', 'failed runs', 'guarantee', 'refund', 'stop-loss'])
    assert.ok(!v.includes(bad), `portal must not show internal or promissory term: ${bad}`);
  assert.doesNotMatch(v, /\bis live\b|\bnow live\b|\blive now\b|running now|connected to (?:the )?sheet/i);
  assert.doesNotMatch(v + visible(request), /\d+\s*(?:leads|cases) (?:per|a) (?:day|week|month)/i);
});

test('both pages are noindex with a restrictive CSP; the portal makes no connections and the request page only same-origin', () => {
  for (const html of [portal, request]) {
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(html, /form-action 'none'/); assert.match(html, /base-uri 'none'/);
  }
  assert.match(portal, /connect-src 'none'/); assert.match(portal, /script-src 'none'/);
  assert.match(request, /connect-src 'self'/);
  assert.match(request, /<meta name="glassman-request-endpoint" content="">/, 'ships with no destination');
  assert.match(request, /src="\/glassman-ssdi\/img\/logo\.svg"/);
});

test('every request input has a label and an error slot where it can fail', () => {
  const ids = [...request.matchAll(/<(?:input|select|textarea)[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) if (!['acknowledged'].includes(id)) assert.ok(request.includes(`for="${id}"`), `label for ${id}`);
  for (const field of ['new_case_type', 'states', 'criteria', 'daily_capacity', 'hours', 'after_hours', 'requester_name', 'requester_email', 'intake_name', 'intake_email', 'intake_phone', 'angle', 'budget_amount', 'acknowledged', 'request_type', 'goal', 'timing'])
    assert.ok(request.includes(`id="${field}-e"`), `error slot for ${field}`);
  assert.equal((request.match(/class="step"/g) || []).length, 5);
});

const complete = () => ({ ...B.emptyDraft(), request_type: 'ssdi', goal: 'quality', timing: 'month', states: 'MA, NH, RI', criteria: 'Ages 48-64, out of work for a year', daily_capacity: '12', hours: 'Mon-Fri 8-8 ET', after_hours: 'next', requester_name: 'Pat Example', requester_email: 'pat@example.com', intake_name: 'Sam Example', intake_email: 'sam@example.com', angle: 'Our intake team calls back the same day and explains every step.', acknowledged: true });

test('validation gives friendly, step-scoped messages and accepts a complete brief', () => {
  const e = B.validateStep(0, B.emptyDraft());
  assert.deepEqual(Object.keys(e).sort(), ['goal', 'request_type', 'timing']);
  assert.match(B.validateStep(0, { ...complete(), request_type: 'new' }).new_case_type, /case type/);
  assert.match(B.validateStep(1, { ...complete(), daily_capacity: 'lots' }).daily_capacity, /whole number/);
  assert.match(B.validateStep(2, { ...complete(), intake_email: '', intake_phone: '' }).intake_email, /email or a phone/);
  assert.match(B.validateStep(2, { ...complete(), intake_email: '', intake_phone: '555-12' }).intake_phone, /10-digit/);
  assert.equal(Object.keys(B.validateStep(2, { ...complete(), intake_email: '', intake_phone: '(617) 555-0100' })).length, 0);
  assert.match(B.validateStep(3, { ...complete(), budget_mode: 'propose', budget_amount: 'five' }).budget_amount, /whole-dollar/);
  assert.match(B.validateStep(4, { ...complete(), acknowledged: false }).acknowledged, /brief for review/);
  for (let i = 0; i < 5; i++) assert.deepEqual(B.validateStep(i, complete()), {}, `step ${i}`);
  assert.equal(B.firstIncompleteStep({ ...complete(), states: '' }), 1);
  assert.equal(B.firstIncompleteStep(complete()), 4);
});

test('normalizeDraft drops unknown keys and out-of-range values from stored drafts', () => {
  const d = B.normalizeDraft({ request_type: 'mva', goal: '<script>', evil: 1, budget_mode: 'buy', acknowledged: 'yes', angle: 'x'.repeat(5000) });
  assert.equal(d.request_type, ''); assert.equal(d.goal, ''); assert.equal(d.budget_mode, 'none'); assert.equal(d.acknowledged, false);
  assert.equal(d.angle.length, 1200); assert.ok(!('evil' in d));
});

test('brief text frames the budget as a proposal and a new campaign as separate and not included', () => {
  const none = B.briefText(complete(), { requestId: 'GLS-BRIEF-AAAA-BBBB-CCCC', date: new Date('2026-11-05T12:00:00Z') });
  assert.match(none, /Brief ID: GLS-BRIEF-AAAA-BBBB-CCCC/);
  assert.match(none, /November 5, 2026/);
  assert.match(none, /No budget proposed\. Kyle will discuss options; nothing is ordered\./);
  assert.match(none, /not a purchase, an invoice, a contract change or authorization to spend or launch/);
  assert.match(none, /no lead volume, cost per lead or cost per case is promised/);
  assert.doesNotMatch(none, /SEPARATE FUTURE REQUEST/);
  const proposed = B.briefText({ ...complete(), request_type: 'new', new_case_type: 'Depo-Provera', budget_mode: 'propose', budget_amount: '$12,500' });
  assert.match(proposed, /\$12,500 proposed media budget, for discussion only/);
  assert.match(proposed, /SEPARATE FUTURE REQUEST: Depo-Provera\. Not part of the current SSDI campaign; scope and pricing require review\./);
  assert.doesNotMatch(proposed, /total|amount due|order confirmed|approved/i);
});

test('brief hash is stable for identical content, ignores the acknowledgement and changes with content', () => {
  const a = complete();
  assert.equal(B.briefHash(a), B.briefHash({ ...a }));
  assert.equal(B.briefHash(a), B.briefHash({ ...a, acknowledged: false }));
  assert.notEqual(B.briefHash(a), B.briefHash({ ...a, states: 'MA' }));
  const id = B.newRequestId((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
  assert.match(id, B.REQUEST_ID);
});

test('only an explicit same-origin path can become a destination', () => {
  const o = 'https://besttortlawyers.com';
  assert.equal(B.parseEndpoint('', o), null);
  assert.equal(B.parseEndpoint('/api/glassman/brief', o), '/api/glassman/brief');
  for (const bad of ['https://hook.us2.make.com/x', '//evil.example/x', '/x?y=1', 'javascript:alert(1)', '/a/../../b', ' /x#h', 'api/x'])
    assert.equal(B.parseEndpoint(bad, o), null, bad);
  assert.equal(B.parseTimeout(''), B.DEFAULT_TIMEOUT_MS); assert.equal(B.parseTimeout('400'), 400); assert.equal(B.parseTimeout('5'), B.DEFAULT_TIMEOUT_MS);
});

const RID = 'GLS-BRIEF-AAAA-BBBB-CCCC';
const good = { schema: B.RECEIPT_SCHEMA, status: 'received', durable: true, request_id: RID, receipt_id: 'RCPT-123456' };
const res = (body, over = {}) => ({ ok: true, status: 200, type: 'basic', redirected: false, contentType: 'application/json; charset=utf-8', bodyText: typeof body === 'string' ? body : JSON.stringify(body), ...over });

test('a receipt counts only when durable, positive, matching and well-formed', () => {
  assert.deepEqual(B.interpretResponse(res(good), RID), { ok: true, receipt_id: 'RCPT-123456', request_id: RID });
  const cases = {
    http: res(good, { ok: false, status: 500 }), opaque: res('', { type: 'opaque', ok: false, status: 0 }), redirected: res(good, { redirected: true }),
    html: res(good, { contentType: 'text/html' }), malformed: res('{"status":"received"'), array: res('[]'), empty: res(''),
    queued: res({ ...good, status: 'queued' }), okTrueOnly: res({ ok: true }), notDurable: res({ ...good, durable: 'true' }),
    mismatch: res({ ...good, request_id: 'GLS-BRIEF-ZZZZ-ZZZZ-ZZZZ' }), noReceipt: res({ ...good, receipt_id: undefined }),
    badReceipt: res({ ...good, receipt_id: '<b>' }), wrongSchema: res({ ...good, schema: 'other/v1' }),
  };
  for (const [name, r] of Object.entries(cases)) assert.equal(B.interpretResponse(r, RID).ok, false, name);
  assert.equal(B.interpretResponse(cases.http, RID).reason, 'http');
  assert.equal(B.interpretResponse(cases.malformed, RID).reason, 'format');
  assert.equal(B.interpretResponse(cases.mismatch, RID).reason, 'unconfirmed');
});

const fakeResponse = (body, { status = 200, ct = 'application/json' } = {}) => ({ ok: status >= 200 && status < 300, status, type: 'basic', redirected: false, headers: { get: () => ct }, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

test('submitter: no endpoint means no fetch; failures, timeouts and network errors fail closed', async () => {
  let calls = 0;
  const none = B.createSubmitter({ fetchImpl: () => { calls++; }, endpoint: null });
  assert.equal((await none.submit({ request_id: RID })).reason, 'unavailable'); assert.equal(calls, 0);
  const net = B.createSubmitter({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); }, endpoint: '/x' });
  assert.equal((await net.submit({ request_id: RID })).reason, 'network');
  const http = B.createSubmitter({ fetchImpl: async () => fakeResponse({ error: 1 }, { status: 503 }), endpoint: '/x' });
  assert.equal((await http.submit({ request_id: RID })).reason, 'http');
  const slow = B.createSubmitter({ fetchImpl: (_u, o) => new Promise((resolve, reject) => { const t = setTimeout(() => resolve(fakeResponse(good)), 500); o.signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }); }), endpoint: '/x', timeoutMs: 50 });
  assert.equal((await slow.submit({ request_id: RID })).reason, 'timeout');
  const hang = B.createSubmitter({ fetchImpl: () => new Promise(() => {}), endpoint: '/x', timeoutMs: 50 });
  assert.equal((await hang.submit({ request_id: RID })).reason, 'timeout', 'a fetch that ignores abort still times out');
  const html = B.createSubmitter({ fetchImpl: async () => fakeResponse(good, { ct: 'text/html' }), endpoint: '/x' });
  assert.equal((await html.submit({ request_id: RID })).ok, false);
});

test('submitter: repeated clicks share one request and retries keep the idempotency key', async () => {
  const seen = [];
  let release;
  const s = B.createSubmitter({ endpoint: '/x', fetchImpl: (url, opts) => { seen.push({ url, opts }); return new Promise((r) => { release = () => r(fakeResponse(good)); }); } });
  const payload = B.buildPayload(complete(), RID, new Date('2026-11-05T00:00:00Z'));
  const p1 = s.submit(payload), p2 = s.submit(payload), p3 = s.submit(payload);
  assert.equal(p1, p2); assert.equal(p2, p3); assert.equal(s.busy, true);
  await new Promise((r) => setTimeout(r, 0)); release();
  assert.equal((await p1).ok, true); assert.equal(seen.length, 1); assert.equal(s.busy, false);
  const o = seen[0].opts;
  assert.equal(o.method, 'POST'); assert.equal(o.headers['Idempotency-Key'], RID); assert.equal(o.credentials, 'same-origin'); assert.equal(o.redirect, 'error'); assert.equal(o.mode, 'same-origin');
  const body = JSON.parse(o.body);
  assert.equal(body.request_id, RID); assert.deepEqual(body.authorizes, { purchase: false, invoice: false, spend: false, launch: false });
  assert.equal(body.kind, 'brief_for_review'); assert.equal(body.separate_future_campaign, false);
  const again = s.submit(payload); await new Promise((r) => setTimeout(r, 0)); release(); await again;
  assert.equal(seen.length, 2); assert.equal(seen[1].opts.headers['Idempotency-Key'], RID);
});
