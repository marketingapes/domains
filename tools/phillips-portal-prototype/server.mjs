import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createReviewService, memoryAudit } from './service.mjs';
if (!process.argv.includes('--local-mock')) throw new Error('Disabled. Explicit --local-mock required.');
const fixture = JSON.parse(await readFile(new URL('./fixture.json', import.meta.url), 'utf8'));
const actors = Object.fromEntries(fixture.items.map(i => [i.assigned_to, {
  subject: i.assigned_to, tenantId: fixture.tenant_id, itemIds: [i.item_id], actions: [i.action], mode: 'LOCAL_MOCK_ONLY',
  expiresAt: new Date(Date.now() + 3600_000).toISOString()
}]));
const sessions = new Map();
const service = createReviewService({ enabled: true, mode: 'LOCAL_MOCK_ONLY',
  readCurrent: async () => structuredClone(fixture), audit: memoryAudit(),
  resolveActor: async req => sessions.get(req.headers.cookie?.match(/(?:^|; )mock_session=([^;]+)/)?.[1]) });
const assets = new Map(['index.html','portal.css','prototype.css','app.js','review-asset.jpg','ma-logo.png'].map(name => [
  '/' + (name === 'index.html' ? '' : name), new URL('../../lfma/portal/prototypes/phillips-current/' + name, import.meta.url)]));
const types = { html:'text/html', css:'text/css', js:'text/javascript', jpg:'image/jpeg', png:'image/png' };
const server = createServer(async (req, res) => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = new URL(req.url, base);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  const json = (status, body) => { res.writeHead(status, { 'Content-Type':'application/json' }); res.end(JSON.stringify(body)); };
  try {
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) return json(403,{error:'Local host only.'});
    if (req.method === 'POST') {
      if (req.headers.origin !== base || req.headers['content-type'] !== 'application/json') return json(403,{error:'Local same-origin JSON required.'});
      let raw = ''; for await (const part of req) { raw += part; if (raw.length > 4096) throw Object.assign(new Error('Request too large.'), {status:413}); }
      let body; try { body = JSON.parse(raw); } catch { throw Object.assign(new Error('Invalid JSON.'),{status:400}); }
      if (url.pathname === '/api/mock-session') {
        if (!actors[body.persona] || Object.keys(body).length !== 1) return json(400,{error:'Unknown synthetic persona.'});
        const token = (await import('node:crypto')).randomUUID(); sessions.set(token,actors[body.persona]);
        res.setHeader('Set-Cookie',`mock_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
        return json(200,{mode:'LOCAL_MOCK_ONLY'});
      }
      if (url.pathname === '/api/decision') return json(200,await service.decide(req,body));
      return json(404,{error:'Unavailable.'});
    }
    if (req.method !== 'GET') return json(405,{error:'Method unavailable.'});
    if (url.pathname === '/api/view') return json(200,await service.view(req));
    if (url.pathname === '/api/plan') return json(200,{mode:fixture.mode,plan:fixture.plan,source_label:fixture.source_label});
    if (!assets.has(url.pathname)) return json(404,{error:'Unavailable.'});
    const asset = assets.get(url.pathname);
    res.writeHead(200,{'Content-Type':types[fileURLToPath(asset).split('.').at(-1)]}); res.end(await readFile(asset));
  } catch (e) { json(e.status || 500,{error:e.status ? e.message : 'Prototype unavailable.'}); }
});
server.listen(0,'127.0.0.1',() => console.log(`LOCAL_MOCK_ONLY http://127.0.0.1:${server.address().port} — no Sheets connection; ephemeral audit`));
