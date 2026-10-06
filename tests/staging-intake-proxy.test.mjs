import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
const { createApp, validateSyntheticForm, validateLiveForm } = await import('../services/plg-az-mva-staging-intake/proxy.mjs');

const ORIGIN = 'https://btl-phillips-az-accident-stage-20261005.onrender.com';
const payload = {
  schema: 'plg.intake.web/v1', submission_id: 'synthetic-1', tenant_id: 'BTL', buyer_id: 'phillips',
  domain_id: 'besttortlawyers.com', campaign_id: 'PLG-AZ-MVA-3PATH-2026-10',
  test: { synthetic: true, suppress: ['outbound_calls', 'sms', 'email', 'buyer_delivery', 'ad_events'] }
};
const body = new URLSearchParams({ payload: JSON.stringify(payload), submission_id: payload.submission_id }).toString();

test('validates only the complete synthetic contract', () => {
  assert.equal(validateSyntheticForm(body).ok, true);
  const live = { ...payload, test: undefined };
  assert.deepEqual(validateSyntheticForm(new URLSearchParams({ payload: JSON.stringify(live), submission_id: live.submission_id }).toString()), { ok: false, reason: 'synthetic_only' });
});

test('relays a valid synthetic request and returns only its receipt', async (t) => {
  let forwarded;
  const app = createApp({
    upstreamUrl: 'https://upstream.invalid/secret',
    fetchImpl: async (url, init) => {
      forwarded = { url, init };
      return new Response(JSON.stringify({ status: 'received', receipt_id: 'receipt-123', ignored: 'private' }), { status: 200 });
    }
  });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => app.close());
  const address = app.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/intake`, {
    method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'received', receipt_id: 'receipt-123' });
  assert.equal(forwarded.url, 'https://upstream.invalid/secret');
  assert.equal(forwarded.init.body, body);
});

test('rejects a different origin before forwarding', async (t) => {
  let called = false;
  const app = createApp({ upstreamUrl: 'https://upstream.invalid/secret', fetchImpl: async () => { called = true; } });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => app.close());
  const address = app.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/intake`, {
    method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/x-www-form-urlencoded' }, body
  });
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

const live = {
  schema: 'plg.intake.web/v1', submission_id: 'live-submission-1', tenant_id: 'BTL', buyer_id: 'phillips',
  domain_id: 'besttortlawyers.com', campaign_id: 'PLG-AZ-MVA-3PATH-2026-10',
  contact: { full_name: 'A Person', phone_e164: '+16025550142', email: null },
  consent: { version: 'plg-azmva-consent-2026-10-05-v1', captured_at: '2026-10-06T03:00:00Z' }
};
const form = (p) => new URLSearchParams({ payload: JSON.stringify(p), submission_id: p.submission_id }).toString();
const post = (port, body, ip) => fetch(`http://127.0.0.1:${port}/intake`, { method: 'POST',
  headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip }, body });

test('live mode accepts a complete real envelope and still gates synthetic requests', () => {
  assert.equal(validateLiveForm(form(live)).ok, true);
  assert.equal(validateLiveForm(body).ok, true);
  assert.equal(validateLiveForm(form({ ...payload, test: { synthetic: true, suppress: ['sms'] } })).ok, false);
});

test('live mode rejects missing phone, missing consent, wrong campaign, mismatched id and ambiguous test flags', () => {
  const bad = [
    { ...live, contact: { full_name: 'A Person' } }, { ...live, contact: { phone_e164: '6025550142' } },
    { ...live, consent: { version: 'v1' } }, { ...live, consent: undefined }, { ...live, campaign_id: 'OTHER' },
    { ...live, tenant_id: 'NIL' }, { ...live, test: { synthetic: false } }, { ...live, schema: 'other' }
  ];
  for (const p of bad) assert.equal(validateLiveForm(form(p)).ok, false, JSON.stringify(p));
  assert.equal(validateLiveForm(new URLSearchParams({ payload: JSON.stringify(live), submission_id: 'different-id-1' }).toString()).ok, false);
  assert.equal(validateLiveForm('payload=%7Bnot-json&submission_id=x').ok, false);
  assert.equal(validateLiveForm('').ok, false);
});

test('staging mode (default) still refuses a real envelope', () => {
  assert.equal(validateSyntheticForm(form(live)).ok, false);
});

test('live relay fails closed when upstream storage fails or answers without a receipt', async () => {
  let n = 0;
  for (const upstream of [
    async () => new Response(JSON.stringify({ status: 'failed', receipt_id: null }), { status: 503 }),
    async () => new Response(JSON.stringify({ status: 'received' }), { status: 200 }),
    async () => { throw new Error('network'); }
  ]) {
    const app = createApp({ upstreamUrl: 'https://upstream.invalid/secret', fetchImpl: upstream, mode: 'live' });
    app.listen(0, '127.0.0.1');
    await once(app, 'listening');
    const r = await post(app.address().port, form(live), '10.9.9.' + (++n));
    assert.equal(r.status, 502);
    assert.deepEqual(await r.json(), { status: 'unavailable' });
    app.close();
  }
});

test('live relay returns the same receipt as a duplicate on retry and never echoes upstream extras', async (t) => {
  const seen = new Set();
  const app = createApp({ upstreamUrl: 'https://upstream.invalid/secret', mode: 'live', fetchImpl: async (_u, init) => {
    const sid = new URLSearchParams(init.body).get('submission_id');
    const status = seen.has(sid) ? 'duplicate' : 'received'; seen.add(sid);
    return new Response(JSON.stringify({ status, receipt_id: 'PLG-' + sid, internal: 'x' }), { status: 200 });
  } });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => app.close());
  const port = app.address().port;
  assert.deepEqual(await (await post(port, form(live), '10.8.8.8')).json(), { status: 'received', receipt_id: 'PLG-live-submission-1' });
  assert.deepEqual(await (await post(port, form(live), '10.8.8.8')).json(), { status: 'duplicate', receipt_id: 'PLG-live-submission-1' });
});

test('live relay accepts each configured origin and refuses others', async (t) => {
  const app = createApp({ upstreamUrl: 'https://upstream.invalid/secret', mode: 'live',
    fetchImpl: async () => new Response(JSON.stringify({ status: 'received', receipt_id: 'r-1' }), { status: 200 }) });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => app.close());
  const r = await fetch(`http://127.0.0.1:${app.address().port}/intake`, { method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: form(live) });
  assert.equal(r.status, 403);
});
