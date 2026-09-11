// Minimal Chrome DevTools Protocol driver for real-browser tests. No npm dependencies.
//
//   const b = await launchBrowser();           // headless Chromium, remote debugging on a free port
//   const page = await b.page({ allow: [origin], fulfill: { 'https://hooks.invalid.test': { status: 200, body: '{}' } } });
//   await page.goto(url); await page.evaluate('1+1'); page.requests; page.errors; await b.close();
//
// NETWORK CAPTURE ONLY: every request is intercepted with the Fetch domain. Requests to `allow` origins are
// served; requests whose URL starts with a `fulfill` key are answered locally and recorded; everything else is
// failed with BlockedByClient and recorded. Nothing ever reaches a real hook or a third party.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';

export function findChrome() {
  if (process.env.EE_CHROME && fs.existsSync(process.env.EE_CHROME)) return process.env.EE_CHROME;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(os.homedir(), '.cache/ms-playwright')].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = path.join(root, d, rel); if (fs.existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(p)) return p;
  return null;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
export function serveStatic(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const abs = path.join(root, p);
    if (!abs.startsWith(root) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
    res.end(fs.readFileSync(abs));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) })));
}

const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launchBrowser() {
  const chrome = findChrome();
  if (!chrome) throw new Error('no Chromium found (set EE_CHROME)');
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ee-chrome-'));
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let version = null;
  for (let i = 0; i < 100 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(100); }
  }
  if (!version) { proc.kill('SIGKILL'); throw new Error('Chromium did not expose DevTools'); }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map(); const listeners = new Map();
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else if (msg.method) for (const fn of listeners.get(msg.sessionId + ':' + msg.method) || []) fn(msg.params);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const on = (sessionId, method, fn) => { const k = sessionId + ':' + method; if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); };

  async function page({ allow = [], fulfill = {} } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    const requests = [], errors = [], consoleErrors = [];
    on(sessionId, 'Runtime.exceptionThrown', p => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception'));
    on(sessionId, 'Runtime.consoleAPICalled', p => { if (p.type === 'error') consoleErrors.push(p.args.map(a => a.value ?? a.description).join(' ')); });
    on(sessionId, 'Fetch.requestPaused', async p => {
      const { requestId, request } = p;
      const url = request.url;
      try {
        if (allow.some(o => url.startsWith(o))) return await s('Fetch.continueRequest', { requestId });
        const key = Object.keys(fulfill).find(k => url.startsWith(k));
        const cors = [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'POST, GET, OPTIONS' }];
        if (request.method === 'OPTIONS' && key) return await s('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: cors, body: '' });
        requests.push({ url, method: request.method, body: request.postData || null, fulfilled: !!key });
        if (key) return await s('Fetch.fulfillRequest', { requestId, responseCode: fulfill[key].status || 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, ...cors], body: Buffer.from(fulfill[key].body || '{}').toString('base64') });
        await s('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
      } catch { /* target gone */ }
    });
    await s('Page.enable'); await s('Runtime.enable'); await s('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    const loaded = () => new Promise(res => on(sessionId, 'Page.loadEventFired', res));
    return {
      requests, errors, consoleErrors,
      async goto(url) { const p = loaded(); await s('Page.navigate', { url }); await p; await sleep(250); },
      async evaluate(expression) {
        const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
      },
      async wait(ms) { await sleep(ms); },
      async close() { try { await send('Target.closeTarget', { targetId }); } catch { /* already gone */ } }
    };
  }
  return { page, version: version.Browser, async close() { try { ws.close(); } catch { /* */ } proc.kill('SIGKILL'); fs.rmSync(profile, { recursive: true, force: true }); } };
}
