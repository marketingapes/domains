import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
const { createApp, validateSyntheticForm } = await import('../services/plg-az-mva-staging-intake/proxy.mjs');

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
