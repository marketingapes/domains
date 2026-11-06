// Glassman Perspective portal + campaign request brief in a real browser (390px and 1280px).
// Uses an existing Playwright install (no install here). Everything is served from 127.0.0.1;
// every request to another host is aborted and counted, and the brief "endpoint" is a local fake.
// This proves page behaviour only. It does not prove any server, inbox or production route exists.
//
//   PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium [SHOTS=/new/dir] \
//     node tests/glassman-perspective.browser.mjs
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir, access } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = fileURLToPath(new URL('../btl/', import.meta.url));
const CHROMIUM = process.env.CHROMIUM, SHOTS = process.env.SHOTS || '';
if (!CHROMIUM || !process.env.PLAYWRIGHT) { console.error('Set PLAYWRIGHT (existing playwright package dir) and CHROMIUM (installed executable).'); process.exit(2); }
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT);
if (SHOTS) { try { await access(SHOTS); console.error('SHOTS must be a new directory.'); process.exit(2); } catch { await mkdir(SHOTS, { recursive: true }); } }

const posts = [];
const counters = {};
const hung = [];
const receiptFor = (id) => 'RCPT-' + createHash('sha256').update(id).digest('hex').slice(0, 16);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/__brief/')) {
    const variant = url.pathname.split('/')[2];
    let raw = ''; for await (const c of req) raw += c;
    let body = {}; try { body = JSON.parse(raw); } catch {}
    posts.push({ variant, body, key: req.headers['idempotency-key'], method: req.method, ct: req.headers['content-type'] });
    const n = (counters[variant] = (counters[variant] || 0) + 1);
    const good = { schema: 'glassman.campaign-brief.receipt/v1', status: 'received', durable: true, request_id: body.request_id, receipt_id: receiptFor(body.request_id || '') };
    const json = (obj, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (variant === 'hang') { hung.push(res); return; }
    if (variant === 'http500') return json({ error: 'boom' }, 500);
    if (variant === 'html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<p>Thanks!</p>'); return; }
    if (variant === 'malformed') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"status":"received",'); return; }
    if (variant === 'okonly') return json({ ok: true });
    if (variant === 'wrongid') return json({ ...good, request_id: 'GLS-BRIEF-ZZZZ-ZZZZ-ZZZZ' });
    if (variant === 'notdurable') return json({ ...good, durable: false });
    if (variant === 'noreceipt') return json({ ...good, receipt_id: undefined });
    if (variant === 'slow') { setTimeout(() => { try { json(good); } catch {} }, 1500); return; }
    if (variant === 'slowok') { setTimeout(() => json(good), 300); return; }
    if (variant === 'flaky') return n === 1 ? json({ error: 'busy' }, 503) : json(good);
    if (variant === 'ok') return json(good);
    res.writeHead(404); res.end('{}'); return;
  }
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (path.endsWith('/')) path += 'index.html';
  try {
    let data = await readFile(join(ROOT, path));
    if (path === '/glassman/request/index.html') {
      let html = data.toString('utf8');
      const ep = url.searchParams.get('ep'), rawep = url.searchParams.get('rawep');
      const target = ep ? `/__brief/${ep}` : rawep;
      if (target) html = html.replace('<meta name="glassman-request-endpoint" content="">', `<meta name="glassman-request-endpoint" content="${target.replace(/"/g, '&quot;')}">`).replace('<meta name="glassman-request-timeout-ms" content="">', '<meta name="glassman-request-timeout-ms" content="600">');
      data = Buffer.from(html);
    }
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404); res.end('missing'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
const external = [];
const results = [];
async function context(width, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true, ...extra });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(ORIGIN + '/__brief/network')) return route.abort('failed');
    if (!u.startsWith(ORIGIN) && !u.startsWith('blob:') && !u.startsWith('data:')) { external.push(u); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  return ctx;
}
async function check(name, fn) {
  try { await fn(); results.push(['PASS', name]); console.log('PASS', name); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL', name, '\n ', e.message.split('\n').slice(0, 6).join('\n  ')); }
}
const shot = async (page, name, full = true) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: full }); };
const noOverflow = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
const current = (page) => page.evaluate(() => [...document.querySelectorAll('.step')].findIndex((s) => !s.hidden));
const status = (page) => page.locator('#status').innerText();
const DRAFT = { request_type: 'ssdi', new_case_type: '', goal: 'quality', goal_detail: '', timing: 'month', states: 'MA, NH, RI', criteria: 'Ages 48-64, out of work for a year', exclusions: '', daily_capacity: '12', hours: 'Mon-Fri 8-8 ET', after_hours: 'next', requester_name: 'Pat Example', requester_email: 'pat@example.com', requester_role: '', intake_name: 'Sam Example', intake_email: 'sam@example.com', intake_phone: '', approver_name: '', angle: 'Our intake team calls back the same day and explains every step.', avoid: '', budget_mode: 'none', budget_amount: '', budget_note: '', acknowledged: false };
async function seeded(ctx, query) {
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/glassman/request/${query}`);
  await page.evaluate((d) => sessionStorage.setItem('glassman-brief-v1', JSON.stringify({ draft: d, step: 4 })), DRAFT);
  await page.goto("about:blank"); await page.goto(`${ORIGIN}/glassman/request/${query}#step-5`);
  assert.equal(await current(page), 4);
  await page.check('#acknowledged');
  return page;
}
const postsFor = (v) => posts.filter((p) => p.variant === v);
const settle = (page) => page.waitForFunction(() => !/Sending/.test(document.getElementById('status').innerText) && document.getElementById('btn-send').getAttribute('aria-busy') === 'false');

// ---------------- portal ----------------
for (const w of [1280, 390]) {
  await check(`portal renders at ${w}px with honest status and no external requests`, async () => {
    const ctx = await context(w); const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${ORIGIN}/glassman/`);
    const text = await page.locator('body').innerText();
    for (const s of ['Campaign structure', 'Current delivery unverified', 'November 5, 2026', 'Verified leads', 'Timestamp unavailable', 'Request a call', 'Check eligibility', 'Talk to Sofia', 'Held', 'Not connected']) assert.ok(text.toLowerCase().includes(s.toLowerCase()), s);
    assert.doesNotMatch(text, /\$\s?\d|\bbalance\b|\bpaid\b|payment confirmed|8684|GLASSMAN-SSD|before the first ad|not started|Day 1/i, 'no financial facts or unsupported delivery claims');
    assert.ok(await page.locator('img[src="/glassman-ssdi/img/logo.svg"]').first().evaluate((i) => i.complete && i.naturalWidth > 0), 'logo loads');
    await noOverflow(page);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(outline, 'none', 'focus is visible');
    assert.deepEqual(errors, []);
    await page.evaluate(() => document.activeElement.blur());
    await shot(page, `portal-${w}`); await shot(page, `portal-${w}-top`, false);
    await ctx.close();
  });
}

// ---------------- preview mode wizard ----------------
for (const w of [1280, 390]) {
  await check(`preview wizard at ${w}px: errors, history, review editing, copy/download, never received, zero sends`, async () => {
    const before = posts.length;
    const ctx = await context(w, { permissions: ['clipboard-read', 'clipboard-write'] }); const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${ORIGIN}/glassman/request/`);
    assert.equal(await page.locator('#btn-send').isHidden(), true, 'no send button in preview mode');
    await shot(page, `request-${w}-step1`, false);
    await page.click('#btn-next');
    await page.waitForSelector('#err-summary:not([hidden])');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'err-summary', 'error summary takes focus');
    assert.equal(await page.locator('#err-summary li').count(), 3);
    assert.equal(await page.getAttribute('#timing', 'aria-invalid'), 'true');
    await shot(page, `request-${w}-errors`, false);
    await page.locator('#err-summary a').last().click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'timing', 'error link moves focus to the field');
    await page.check('input[name=request_type][value=new]');
    assert.equal(await page.locator('#reveal-new').isVisible(), true);
    await page.click('#btn-next');
    assert.match(await page.locator('#new_case_type-e').innerText(), /case type/);
    await page.fill('#new_case_type', 'Depo-Provera');
    await page.check('input[name=goal][value=launch]');
    await page.selectOption('#timing', 'quarter');
    assert.equal(await page.locator('#err-summary').isHidden(), true, 'summary clears once fixed');
    assert.match(await page.locator('#brief-flag').innerText(), /Separate future request/);
    await page.click('#btn-next');
    assert.equal(await current(page), 1); assert.equal(new URL(page.url()).hash, '#step-2');
    await page.fill('#states', 'MA, NH, RI, CT');
    await page.fill('#criteria', 'Women who used the injection for two or more years');
    await page.fill('#daily_capacity', '8');
    await page.fill('#hours', 'Mon-Fri 8 AM-8 PM ET');
    await page.selectOption('#after_hours', 'voicemail');
    await page.goBack();
    assert.equal(await current(page), 0, 'browser back returns to step 1');
    assert.equal(await page.inputValue('#new_case_type'), 'Depo-Provera', 'answers kept');
    await page.goForward();
    assert.equal(await current(page), 1, 'browser forward returns to step 2');
    assert.equal(await page.inputValue('#states'), 'MA, NH, RI, CT');
    await page.click('#btn-next');
    await page.fill('#requester_name', 'Pat Example');
    await page.fill('#requester_email', 'pat@example');
    await page.fill('#intake_name', 'Sam Example');
    await page.click('#btn-next');
    assert.equal(await current(page), 2);
    assert.match(await page.locator('#requester_email-e').innerText(), /email address/);
    assert.match(await page.locator('#intake_email-e').innerText(), /email or a phone/);
    await page.fill('#requester_email', 'pat@example.com');
    await page.fill('#intake_phone', '(617) 555-0100');
    await page.click('#btn-next');
    assert.equal(await current(page), 3);
    await page.click('.starter >> nth=0');
    assert.match(await page.inputValue('#angle'), /^Clients tell us they chose us because $/);
    await page.type('#angle', 'we answer every call ourselves.');
    await page.check('input[name=budget_mode][value=propose]');
    await page.fill('#budget_amount', 'lots');
    await page.click('#btn-next');
    assert.match(await page.locator('#budget_amount-e').innerText(), /whole-dollar/);
    await page.fill('#budget_amount', '15000');
    await shot(page, `request-${w}-step4`, false);
    await page.click('#btn-next');
    assert.equal(await current(page), 4);
    if (w === 390) assert.equal(await page.locator('.aside').isHidden(), true, 'mobile review does not repeat the full brief');
    const review = await page.locator('#review-list').innerText();
    assert.match(review, /Separate future request\. Not part of the current SSDI campaign; scope and pricing require review\./);
    assert.match(review, /\$15,000 proposed media budget, for discussion only/);
    // edit from review and come straight back
    await page.click('button[aria-label="Edit Contacts"]');
    assert.equal(await current(page), 2);
    assert.equal(await page.locator('#btn-return').isVisible(), true);
    await page.fill('#requester_name', 'Pat Q. Example');
    await page.click('#btn-return');
    assert.equal(await current(page), 4);
    assert.match(await page.locator('#review-list').innerText(), /Pat Q\. Example/);
    // finishing requires the acknowledgement
    await page.click('#btn-copy');
    assert.match(await page.locator('#acknowledged-e').innerText(), /brief for review/);
    await page.check('#acknowledged');
    await page.click('#btn-copy');
    await page.waitForFunction(() => /Brief copied/.test(document.getElementById('status').innerText));
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /^CAMPAIGN BRIEF · Jeffrey Glassman Injury Lawyers/);
    assert.match(clip, /Brief ID: GLS-BRIEF-/);
    assert.match(clip, /not a purchase, an invoice/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download')]);
    assert.match(dl.suggestedFilename(), /^glassman-brief-GLS-BRIEF-[A-Z2-9-]+\.txt$/);
    const file = await readFile(await dl.path(), 'utf8');
    assert.equal(file, clip, 'download and copy carry the same brief');
    const st = await status(page);
    assert.match(st, /Nothing has been sent/); assert.doesNotMatch(await page.locator('main').innerText(), /Received for review|Request received/);
    await shot(page, `request-${w}-review`, true);
    await noOverflow(page);
    // refresh keeps the draft (tab-only storage) and the same brief ID
    const id1 = clip.match(/GLS-BRIEF-[A-Z2-9-]+/)[0];
    await page.reload();
    assert.equal(await current(page), 4);
    assert.match(await page.inputValue('#brief-text'), new RegExp(id1));
    assert.equal(await page.evaluate(() => localStorage.length), 0, 'nothing in localStorage');
    assert.equal(posts.length, before, 'preview mode never sends');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

await check('deep link past incomplete steps clamps to the first incomplete step', async () => {
  const ctx = await context(1280); const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/glassman/request/#step-5`);
  assert.equal(await current(page), 0); assert.equal(new URL(page.url()).hash, '#step-1');
  await ctx.close();
});

await check('a non-same-origin endpoint keeps preview mode (fail closed)', async () => {
  for (const raw of ['https://example.com/brief', '//example.com/brief', '/brief?x=1', 'javascript:alert(1)']) {
    const ctx = await context(1280); const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/glassman/request/?rawep=${encodeURIComponent(raw)}`);
    assert.equal(await page.locator('#btn-send').isHidden(), true, raw);
    await ctx.close();
  }
});

// ---------------- future endpoint mode (local fakes only) ----------------
for (const [variant, re] of [['http500', /server answered with an error/], ['html', /not a readable receipt/], ['malformed', /not a readable receipt/], ['okonly', /did not confirm/], ['wrongid', /did not confirm/], ['notdurable', /did not confirm/], ['noreceipt', /did not confirm/], ['slow', /No receipt arrived in time/], ['network', /connection failed/]]) {
  await check(`endpoint ${variant}: fails closed, keeps the brief, offers retry`, async () => {
    const ctx = await context(1280); const page = await seeded(ctx, `?ep=${variant}`);
    await page.click('#btn-send'); await settle(page);
    const st = await status(page);
    assert.match(st, /Receipt not confirmed/); assert.match(st, /may have saved/); assert.match(st, re);
    assert.doesNotMatch(await page.locator('main').innerText(), /Received for review/);
    assert.equal(await page.innerText('#btn-send'), 'Try again');
    assert.equal(await page.locator('#locked-note').isHidden(), true);
    if (variant !== 'network') assert.equal(postsFor(variant).length, 1);
    if (variant === 'http500') await shot(page, 'request-1280-send-failed', false);
    await ctx.close();
  });
}

await check('repeated clicks send exactly once and only a durable receipt shows received', async () => {
  const ctx = await context(1280); const page = await seeded(ctx, '?ep=slowok');
  await page.evaluate(() => { const b = document.getElementById('btn-send'); for (let i = 0; i < 5; i++) b.click(); });
  await page.dblclick('#btn-send', { force: true });
  assert.equal(await page.locator('#btn-send').isDisabled(), true);
  // even if the disabled state were bypassed, the in-flight guard keeps it to one send
  await page.evaluate(() => { const b = document.getElementById('btn-send'); b.disabled = false; b.click(); b.click(); });
  await page.waitForFunction(() => /Received for review/.test(document.getElementById('status').innerText));
  assert.equal(postsFor('slowok').length, 1, 'one POST');
  const p = postsFor('slowok')[0];
  assert.equal(p.method, 'POST'); assert.equal(p.key, p.body.request_id); assert.match(p.ct, /application\/json/);
  assert.deepEqual(p.body.authorizes, { purchase: false, invoice: false, spend: false, launch: false });
  assert.match(await status(page), new RegExp(receiptFor(p.body.request_id)));
  assert.equal(await page.locator('#locked-note').isVisible(), true);
  await shot(page, 'request-1280-received-mock', false);
  // back / forward after a confirmed receipt: earlier steps are read-only, review still shows it
  await page.click('#btn-back');
  assert.equal(await current(page), 3);
  assert.equal(await page.locator('#angle').isDisabled(), true);
  await page.goForward().catch(() => {});
  if (await current(page) !== 4) await page.click('#btn-next');
  assert.equal(await current(page), 4);
  assert.match(await status(page), /Received for review/);
  await ctx.close();
});

await check('retry after failure reuses the brief ID and idempotency key; edited content gets a new one', async () => {
  const ctx = await context(1280); const page = await seeded(ctx, '?ep=flaky');
  await page.click('#btn-send'); await settle(page);
  assert.match(await status(page), /Receipt not confirmed/);
  await page.click('#btn-send'); await settle(page);
  assert.match(await status(page), /Received for review/);
  const [a, b] = postsFor('flaky');
  assert.equal(a.body.request_id, b.body.request_id); assert.equal(a.key, b.key); assert.equal(a.body.brief_hash, b.body.brief_hash);
  await ctx.close();
  const ctx2 = await context(1280); const page2 = await seeded(ctx2, '?ep=http500');
  await page2.click('#btn-send'); await settle(page2);
  const first = postsFor('http500').at(-1).body.request_id;
  await page2.click('button[aria-label="Edit Angle & budget"]');
  await page2.fill('#avoid', 'Celebrity endorsements');
  await page2.click('#btn-return');
  await page2.click('#btn-send'); await settle(page2);
  const second = postsFor('http500').at(-1).body.request_id;
  assert.notEqual(first, second, 'changed content is a different brief');
  await ctx2.close();
});

await check('refresh mid-send: nothing is confirmed; resend reuses the same brief ID', async () => {
  const ctx = await context(1280); const page = await seeded(ctx, '?ep=hang');
  await page.click('#btn-send');
  await page.waitForFunction(() => /Sending/.test(document.getElementById('status').innerText));
  for (let i = 0; i < 50 && postsFor('hang').length === 0; i++) await new Promise((r) => setTimeout(r, 20));
  const hungId = postsFor('hang')[0].body.request_id;
  await page.goto(`${ORIGIN}/glassman/request/?ep=ok#step-5`);
  assert.match(await status(page), /wasn.t confirmed/);
  assert.doesNotMatch(await status(page), /Received for review/);
  assert.equal(await page.innerText('#btn-send'), 'Try again');
  await page.check('#acknowledged');
  await page.click('#btn-send'); await settle(page);
  assert.match(await status(page), /Received for review/);
  assert.equal(postsFor('ok').at(-1).body.request_id, hungId);
  // refresh after success: a stored receipt is not treated as proof
  await page.reload();
  const st = await status(page);
  assert.match(st, /Earlier in this tab/); assert.doesNotMatch(st, /Received for review/);
  assert.equal(await page.innerText('#btn-send'), 'Check again with the server');
  await page.check('#acknowledged');
  await page.click('#btn-send'); await settle(page);
  assert.match(await status(page), new RegExp(`Received for review.*${receiptFor(hungId)}`, 's'));
  assert.equal(postsFor('ok').at(-1).body.request_id, hungId);
  await ctx.close();
  for (const r of hung) try { r.destroy(); } catch {}
});

await check('reduced motion disables transitions; mobile request has no overflow', async () => {
  const ctx = await context(390, { reducedMotion: 'reduce' }); const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/glassman/request/`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.brief-sec')).transitionDuration), '0s');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  await noOverflow(page);
  await ctx.close();
});

await browser.close(); server.close();
console.log(`\nexternal requests blocked: ${external.length}`);
if (external.length) console.log(external.slice(0, 10).join('\n'));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} browser checks passed`);
process.exit(failed || external.length ? 1 : 0);
