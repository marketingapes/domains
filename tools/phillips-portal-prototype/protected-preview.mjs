// Local protected preview of the existing /portal/phillips/ page with the Client Perspective.
//
//   node tools/phillips-portal-prototype/protected-preview.mjs \
//     --backend ../legal-web-lead/src/intake/portal-report.js \
//     --perspective /tmp/.../perspective.json [--port 0] [--token-file /tmp/.../token]
//
// Serves the unmodified portal page and loader from this checkout on 127.0.0.1 only and mounts the
// backend's own report handler (legal-web-lead portal-report.js) on an in-memory store. The
// deidentified projection goes in through the real operator ingest path, so the backend's validation
// and claimant-data refusal run on it. Nothing is persisted; stopping the process discards it.
//
// Preview-only rewrites, applied in memory to the served copies:
// - the loader's API origin becomes this server (same origin, so no CORS);
// - the Turnstile site key becomes Cloudflare's documented always-pass test key, because the
//   production key does not issue on localhost. The access token gate is unchanged.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const lfma = resolve(repo, 'lfma');
const PROD_API = 'https://legal-web-lead.onrender.com/api/v1/portal/phillips/report';
const PROD_SITEKEY = '0x4AAAAAAFLVjZtHLNhxmbTc';
const TEST_SITEKEY = '1x00000000000000000000AA';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.css': 'text/css' };

if (!args.backend || !args.perspective) { console.error('--backend and --perspective are required'); process.exit(2); }
const perspectivePath = resolve(args.perspective);
for (const p of [perspectivePath, args['token-file'] && resolve(args['token-file'])].filter(Boolean)) {
  const tmp = [resolve(tmpdir()), '/private/tmp', '/tmp'];
  if (!tmp.some((t) => p.startsWith(t + sep))) { console.error(`${p} must be in system temporary storage`); process.exit(2); }
}

const { createPortalReportHandler } = await import(pathToFileURL(resolve(args.backend)).href);
const values = new Map();
const store = { async get(k) { return values.has(k) ? structuredClone(values.get(k)) : null; }, async set(k, v) { values.set(k, structuredClone(v)); }, async range() { return []; } };
const PORTAL_TOKEN = randomBytes(24).toString('base64url');
const OPERATOR_KEY = randomBytes(24).toString('base64url');
const handle = createPortalReportHandler({
  store, env: { PORTAL_TOKEN, PHILLIPS_LANE_OPERATOR_KEY: OPERATOR_KEY },
  getLane: () => { throw new Error('no lane in preview'); },
  commitInputs: async (previous, next) => { if (JSON.stringify(await store.get('portal:phillips:report-inputs')) !== JSON.stringify(previous)) return false; await store.set('portal:phillips:report-inputs', next); return true; },
});

// Load through the operator ingest path exactly as production would receive it.
async function call(method, url, headers, body) {
  const request = new EventEmitter(); Object.assign(request, { method, url, headers });
  const out = {};
  const response = { writeHead(s, h) { out.status = s; out.headers = h; }, end(t) { out.body = t ? JSON.parse(t) : null; } };
  process.nextTick(() => { if (body) request.emit('data', Buffer.from(body)); request.emit('end'); });
  await handle(request, response);
  return out;
}
const ingest = await call('POST', '/api/v1/portal/phillips/report-inputs', { 'x-phillips-lane-operator-key': OPERATOR_KEY },
  JSON.stringify({ client_perspective: JSON.parse(await readFile(perspectivePath, 'utf8')) }));
if (ingest.status !== 200) { console.error('Backend refused the projection:', ingest.status, ingest.body); process.exit(1); }

async function asset(pathname) {
  const file = resolve(lfma, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!file.startsWith(lfma + sep)) return null;
  const allowed = file === resolve(lfma, 'portal/phillips/index.html') || file.startsWith(resolve(lfma, 'assets/portal') + sep);
  if (!allowed) return null;
  try {
    let body = await readFile(file);
    if (file.endsWith('phillips-report.js')) body = Buffer.from(body.toString('utf8').replace(PROD_API, '/api/v1/portal/phillips/report'));
    if (file.endsWith('index.html')) body = Buffer.from(body.toString('utf8').replace(PROD_SITEKEY, TEST_SITEKEY));
    return { body, type: TYPES[extname(file)] || 'application/octet-stream' };
  } catch { return null; }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://127.0.0.1');
  if (pathname.startsWith('/api/')) {
    // Only the read endpoint is reachable over HTTP; ingest stays in-process.
    if (pathname !== '/api/v1/portal/phillips/report') { res.writeHead(404).end(); return; }
    if (await handle(req, res)) return;
  }
  if (pathname === '/') { res.writeHead(302, { location: '/portal/phillips/' }).end(); return; }
  const a = await asset(pathname);
  if (!a) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
  res.writeHead(200, { 'content-type': a.type, 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer' });
  res.end(a.body);
});
server.listen(Number(args.port || 0), '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${server.address().port}/portal/phillips/`;
  if (args['token-file']) await writeFile(resolve(args['token-file']), PORTAL_TOKEN + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ url, ingest: ingest.body, token: args['token-file'] ? `written to ${args['token-file']}` : PORTAL_TOKEN }));
});
