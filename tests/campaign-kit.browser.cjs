// Campaign kit pages in a real browser (synthetic data only).
// PREVIEW: every shipped config — no request leaves 127.0.0.1, fetch is blocked by CSP, no dialable phone link, the
// quiz and form reach a PREVIEW receipt that survives a reload, mobile has no sideways scroll.
// LIVE receipt rule: a synthetic live build against a local mock intake — a receipt shows "Received", a retry dedupes
// to the same receipt, and a receipt-less {"ok":true} or a 500 shows the phone fallback instead.
// Run: node tests/campaign-kit.browser.cjs   (SHOTS=/dir saves screenshots; CHROMIUM=/path overrides the browser)
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');

const ROOT = path.join(__dirname, '..');
const BTL = path.join(ROOT, 'btl'), KIT = path.join(ROOT, 'campaign-kit');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function serve(livePages) {
  const intake = { mode: 'receipt', received: [] };
  const srv = http.createServer((q, r) => {
    const url = decodeURIComponent(q.url.split('?')[0]);
    if (url === '/intake' && q.method === 'POST') {
      let b = ''; q.on('data', (c) => { b += c; });
      return q.on('end', () => {
        const p = JSON.parse(new URLSearchParams(b).get('payload'));
        const dup = intake.received.some((x) => x.submission_id === p.submission_id);
        intake.received.push(p);
        if (intake.mode === '500') { r.statusCode = 500; return r.end('{}'); }
        r.setHeader('content-type', 'application/json');
        if (intake.mode === 'ok-only') return r.end('{"ok":true}');
        r.end(JSON.stringify({ status: dup ? 'duplicate' : 'received', receipt_id: 'TEST-' + p.submission_id.replace(/-/g, '').slice(0, 10).toUpperCase() }));
      });
    }
    let file;
    const kit = url.match(/^\/_kit\/([a-z0-9-]+)\/(.*)$/), live = url.match(/^\/_live\/(.*)$/);
    if (live) { const name = live[1] || 'index.html'; if (livePages[name]) { r.setHeader('content-type', TYPES[path.extname(name)]); return r.end(livePages[name]); } }
    if (kit) file = path.join(KIT, 'out', kit[1], 'preview', kit[2] || 'index.html');
    else file = path.join(BTL, url.endsWith('/') ? url + 'index.html' : url);
    if (!file.startsWith(ROOT)) { r.statusCode = 403; return r.end(); }
    let data = null;
    if (fs.existsSync(file)) data = fs.readFileSync(file);
    else if (fs.existsSync(file + '.b64')) data = Buffer.from(fs.readFileSync(file + '.b64', 'utf8'), 'base64');
    if (!data) { r.statusCode = 404; return r.end(); }
    r.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream'); r.end(data);
  });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, intake })));
}

(async () => {
  const { normalize, renderPages, renderCss, GATES } = await import(path.join(KIT, 'build.mjs'));
  const configs = fs.readdirSync(path.join(KIT, 'campaigns')).filter((f) => f.endsWith('.json')).map((f) => normalize(JSON.parse(fs.readFileSync(path.join(KIT, 'campaigns', f), 'utf8'))));
  // Synthetic live build of the first config, pointed at the local mock intake. Never written to disk.
  const liveRaw = JSON.parse(fs.readFileSync(path.join(KIT, 'campaigns', 'btl-paraquat.json'), 'utf8'));
  Object.assign(liveRaw, { status: 'live', gates: Object.fromEntries(GATES.map(([k]) => [k, { by: 'browser test', at: '2026-10-26', evidence: 'synthetic' }])) });
  liveRaw.intake.webhook = 'https://placeholder.invalid/intake';
  liveRaw.delivery.transfer = { number: '+15555550100', kind: 'firm', label: 'Test firm', source: 'browser test' };
  const livePages = {};
  const s2 = await serve(livePages);
  const base = `http://127.0.0.1:${s2.srv.address().port}`;
  const liveCfg = normalize(liveRaw);
  liveCfg.intake.webhook = base + '/intake'; // http mock: set after validation, which requires https
  Object.assign(livePages, renderPages(liveCfg), { 'site.css': renderCss(liveCfg) });

  const executablePath = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const shot = async (page, name) => { if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.SHOTS, name + '.jpg'), type: 'jpeg', quality: 70, fullPage: false }); } };
  let checks = 0;
  try {
    // ---------------- PREVIEW: every shipped config ----------------
    for (const c of configs) {
      for (const [w, h] of [[390, 844], [1280, 800]]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
        const page = await ctx.newPage(), outside = [], errors = [];
        // The only hosts a preview may request besides itself: Google Fonts (allowed by the preview CSP for brand type).
        page.on('request', (q) => { const u = new URL(q.url()); if (!['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) outside.push(q.url()); });
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error' && !/Content Security Policy|fonts\.g|net::/.test(m.text())) errors.push(m.text()); });
        await page.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
        const root = c.publish === false ? `${base}/_kit/${c.slug}/` : `${base}/c/${c.slug}/`;
        if (c.layout === 'provider-review') {
          await page.goto(root);
          assert.ok(await page.locator('.kit-preview').isVisible());
          assert.equal(await page.locator('a[href^="tel:"]').count(),0);
          assert.equal(await page.locator('input').count(),0);
          assert.equal(await page.locator('h1').count(),1);
          assert.doesNotMatch(await page.locator('body').innerText(),/case[\s-]*manager/i);
          assert.match(await page.locator('.process-section').innerText(),/if you pre-qualify, schedule directly or choose an AI scheduling call/);

          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
          assert.ok(await page.evaluate(()=>fetch('https://example.invalid/blocked').then(()=>false,()=>true)));
          assert.ok(await page.locator('.hero-art img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)));
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://besttortlawyers.com/c/multiplan/');
          await shot(page,`${c.slug}-hero-${w}`);
          await page.locator('#attorney').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => { const img = document.querySelector('.attorney-photo img'); return img.complete && img.naturalWidth > 0; });
          await page.locator('.attorney-photo img').evaluate(img => img.decode());
          await shot(page,`${c.slug}-attorney-${w}`);
          if (process.env.SHOTS) await page.screenshot({path:path.join(process.env.SHOTS,`${c.slug}-full-${w}.jpg`),type:'jpeg',quality:85,fullPage:true});
          for (const alias of c.legacy_slugs ?? []) {
            await page.goto(`${base}/c/${alias}/`);
            assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://besttortlawyers.com/c/multiplan/');
            assert.ok(await page.locator('#provider-screen').isVisible());
          }
          await page.goto(root);
          await page.click('#provider-screen button');
          assert.ok(await page.locator('#screen-error').isVisible());
          assert.ok(await page.locator('#screen-result').isHidden());
          for (const [role,oon,volume,route] of [['owner','yes','million','conversation'],['finance','yes','near','conversation'],['admin','unsure','unsure','clarify'],['other','yes','below','clarify'],['owner','no','million','scope']]) {
            await page.selectOption('#role',role);await page.selectOption('#oon',oon);await page.selectOption('#volume',volume);
            await page.click('#provider-screen button');
            assert.equal(await page.locator('#screen-result').getAttribute('data-route'),route);
            await page.click('#request-consultation');
            assert.ok(await page.locator('#consultation-dialog').isVisible());
            assert.match(await page.locator('#consultation-dialog').innerText(),/No request has been sent/);
            assert.match(await page.locator('#consultation-dialog').innerText(),/Intake, direct self-scheduling and the AI scheduling call are not connected/);
            assert.doesNotMatch(await page.locator('#screen-result').innerText(),/case[\s-]*manager/i);
            await page.click('#done-dialog');
            assert.ok(await page.locator('#consultation-dialog').isHidden());
            await page.click('#request-consultation');
            assert.ok(await page.locator('#consultation-dialog').isVisible());

            await page.keyboard.press('Escape');
            assert.ok(await page.locator('#consultation-dialog').isHidden());
            await page.click('#reset-screen');
          }
          await page.locator('#review').scrollIntoViewIfNeeded();await shot(page,`${c.slug}-screen-${w}`);
          await page.reload();assert.equal(await page.inputValue('#role'),'');
          assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
          assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
          checks+=35;await ctx.close();continue;
        }
        for (const n of ['index.html', 'quiz.html', 'sofia.html', 'form.html', 'ads.html']) {
          await page.goto(root + n);
          assert.equal(await page.locator('a[href^="tel:"]').count(), 0, `${c.slug} ${n}: no dialable link`);
          assert.ok(await page.locator('.kit-preview').isVisible(), `${c.slug} ${n}: preview banner`);
          const blocked = await page.evaluate(() => fetch('https://hook.us2.make.com/blocked-by-csp', { method: 'POST' }).then(() => false, () => true));
          assert.ok(blocked, `${c.slug} ${n}: CSP blocks fetch`);
          const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(over <= 0, `${c.slug} ${n} @${w}: no sideways scroll (${over}px)`);
          checks += 4;
        }
        if (w === 390) await page.goto(root + 'index.html'), await shot(page, `${c.slug}-index-390`);
        // Quiz: answer the first option of every question, send, see a PREVIEW receipt that survives a reload.
        await page.goto(root + 'quiz.html');
        for (let i = 0; i < c.quiz.length; i++) await page.locator('.q.on .opts button').first().click();
        await page.fill('#first', 'Test'); await page.fill('#last', 'Preview'); await page.fill('#phone', '6195550100');
        await page.selectOption('#state', { index: 1 }); await page.check('#c_call');
        await page.click('#send');
        await page.locator('#done').waitFor({ state: 'visible' });
        const ref = await page.textContent('#ref');
        assert.match(ref, /^PREVIEW-[0-9A-F]{10}$/, `${c.slug}: preview receipt`);
        const box = await page.evaluate(() => window.__kitOutbox);
        assert.equal(box.length, 1); assert.equal(box[0].schema, 'btl.intake.web/v1'); assert.equal(box[0].test.synthetic, true); assert.equal(box[0].request_type, 'quiz_inquiry');
        assert.equal(box[0].contact.phone_e164, '+16195550100'); assert.ok(box[0].consent.calls.granted && box[0].consent.calls.text.length > 40);
        if (w === 1280) await shot(page, `${c.slug}-quiz-receipt-1280`);
        await page.reload();
        assert.ok(await page.locator('#done').isVisible(), `${c.slug}: receipt survives reload`);
        assert.equal(await page.textContent('#ref'), ref, `${c.slug}: same reference after reload`);
        await page.click('#again'); await page.waitForLoadState('load');
        assert.ok(await page.locator('#done').isHidden(), `${c.slug}: start over clears the receipt`);
        // Form: empty submit shows every error and sends nothing.
        await page.goto(root + 'form.html');
        await page.click('#send');
        assert.ok((await page.locator('.err:not(:empty)').count()) >= 5, `${c.slug}: form validation`);
        assert.equal(await page.evaluate(() => (window.__kitOutbox || []).length), 0);
        assert.deepEqual(outside, [], `${c.slug} @${w}: requests left 127.0.0.1: ${outside.join(', ')}`);
        assert.deepEqual(errors, [], `${c.slug} @${w}: page errors`);
        checks += 12;
        await ctx.close();
      }
    }

    // ---------------- LIVE receipt rule against the mock intake ----------------
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.route(/googletagmanager|trustedform|fonts\.g|callrail|facebook|tiktok|openai/, (r) => r.abort());
    const fill = async () => { await page.fill('#first', 'Test'); await page.fill('#last', 'Live'); await page.fill('#phone', '6195550100'); await page.fill('#email', ''); await page.selectOption('#state', { index: 1 }); for (const s of await page.$$('select[required]:not(#state)')) await s.selectOption({ index: 1 }); await page.check('#c_call'); };
    s2.intake.mode = 'ok-only';
    await page.goto(base + '/_live/form.html'); await fill(); await page.click('#send');
    await page.locator('#senderr').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#done').isHidden(), 'no receipt → no "Received"');
    s2.intake.mode = '500';
    await page.click('#send'); await page.locator('#senderr').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#done').isHidden(), '500 → no "Received"');
    s2.intake.mode = 'receipt';
    await page.click('#send'); await page.locator('#done').waitFor({ state: 'visible' });
    const sent = s2.intake.received.map((p) => p.submission_id);
    assert.equal(new Set(sent).size, 1, 'all retries reuse one submission_id');
    const liveRef = await page.textContent('#ref');
    assert.match(liveRef, /^TEST-/);
    assert.equal(s2.intake.received.length, 3);
    await page.reload();
    assert.equal(await page.textContent('#ref'), liveRef, 'live receipt survives reload');
    checks += 6;
    await ctx.close();
    console.log(`campaign-kit browser: ${checks} checks passed (${configs.length} preview configs, 2 widths, live receipt rule)`);
  } finally {
    await browser.close(); s2.srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
