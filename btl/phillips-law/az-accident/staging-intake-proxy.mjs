import http from 'node:http';

const PORT = Number(process.env.PORT || 10000);
const UPSTREAM_WEBHOOK_URL = process.env.UPSTREAM_WEBHOOK_URL || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://btl-phillips-az-accident-stage-20261005.onrender.com';
const REQUIRED_SUPPRESSIONS = ['outbound_calls', 'sms', 'email', 'buyer_delivery', 'ad_events'];
const MAX_BODY_BYTES = 64 * 1024;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestWindows = new Map();

function cors(origin) {
  return origin === ALLOWED_ORIGIN
    ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' }
    : {};
}

function json(res, status, body, origin = '') {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(origin) });
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function rateLimited(req) {
  const now = Date.now();
  const key = clientIp(req);
  const previous = requestWindows.get(key);
  const current = !previous || now - previous.startedAt >= WINDOW_MS ? { startedAt: now, count: 0 } : previous;
  current.count += 1;
  requestWindows.set(key, current);
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function validateSyntheticForm(body) {
  const form = new URLSearchParams(body);
  const rawPayload = form.get('payload');
  const submissionId = form.get('submission_id');
  if (!rawPayload || !submissionId) return { ok: false, reason: 'missing_payload' };

  let payload;
  try { payload = JSON.parse(rawPayload); } catch { return { ok: false, reason: 'invalid_payload' }; }

  const suppress = payload?.test?.suppress;
  const valid = payload?.schema === 'plg.intake.web/v1'
    && payload?.submission_id === submissionId
    && payload?.tenant_id === 'BTL'
    && payload?.buyer_id === 'phillips'
    && payload?.domain_id === 'besttortlawyers.com'
    && payload?.campaign_id === 'PLG-AZ-MVA-3PATH-2026-10'
    && payload?.test?.synthetic === true
    && Array.isArray(suppress)
    && REQUIRED_SUPPRESSIONS.every((item) => suppress.includes(item));

  return valid ? { ok: true, body: form.toString() } : { ok: false, reason: 'synthetic_only' };
}

export function createApp({ upstreamUrl = UPSTREAM_WEBHOOK_URL, fetchImpl = fetch } = {}) {
  return http.createServer(async (req, res) => {
    const origin = String(req.headers.origin || '');

    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { status: 'ok', configured: Boolean(upstreamUrl) });
    }

    if (req.method === 'OPTIONS' && req.url === '/intake') {
      if (origin !== ALLOWED_ORIGIN) return json(res, 403, { status: 'rejected' });
      res.writeHead(204, { ...cors(origin), 'cache-control': 'no-store' });
      return res.end();
    }

    if (req.method !== 'POST' || req.url !== '/intake') return json(res, 404, { status: 'not_found' }, origin);
    if (origin !== ALLOWED_ORIGIN) return json(res, 403, { status: 'rejected' });
    if (!upstreamUrl) return json(res, 503, { status: 'unavailable' }, origin);
    if (rateLimited(req)) return json(res, 429, { status: 'rate_limited' }, origin);
    if (!String(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) {
      return json(res, 415, { status: 'rejected' }, origin);
    }

    try {
      const checked = validateSyntheticForm(await readBody(req));
      if (!checked.ok) return json(res, 422, { status: 'rejected' }, origin);

      const upstream = await fetchImpl(upstreamUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: checked.body,
        redirect: 'error',
        signal: AbortSignal.timeout(15000)
      });
      const result = await upstream.json().catch(() => null);
      const status = result?.status;
      const receiptId = result?.receipt_id;
      if (!upstream.ok || !receiptId || !['received', 'duplicate'].includes(status)) {
        return json(res, 502, { status: 'unavailable' }, origin);
      }
      return json(res, 200, { status, receipt_id: String(receiptId) }, origin);
    } catch {
      return json(res, 502, { status: 'unavailable' }, origin);
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  createApp().listen(PORT, '0.0.0.0', () => {
    console.log(JSON.stringify({ event: 'staging_intake_proxy_started', configured: Boolean(UPSTREAM_WEBHOOK_URL) }));
  });
}
