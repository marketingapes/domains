// Phillips AZ accident pages (A, B, C) in a real browser against a local mock intake endpoint (synthetic data only).
// C: compact Claim Check chat — stable card height, one question at a time, contact + consent in the conversation,
// receipt in the chat, no page jump. A and B: unchanged form flows still reach a receipt. Production config fails closed.
// Run: node tests/plg-az-accident.browser.cjs   (SHOTS=/dir saves screenshots; CHROMIUM=/path overrides the browser)
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');

const ROOT = path.join(__dirname, '..', 'btl');
const DIS = 'DISCLAIMER: This advertisement is not for legal services related to an incident that occurred in California or that a California court would have jurisdiction over.';

function serve() {
  const received = [];
  const srv = http.createServer((q, r) => {
    if (q.url.startsWith('/intake')) {
      if (q.method === 'OPTIONS') { r.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST' }); return r.end(); }
      let b = ''; q.on('data', (c) => { b += c; });
      return q.on('end', () => {
        const f = new URLSearchParams(b), p = JSON.parse(f.get('payload'));
        const dup = received.some((x) => x.submission_id === p.submission_id);
        received.push(p);
        r.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
        r.end(JSON.stringify({ status: dup ? 'duplicate' : 'received', receipt_id: 'PLG-' + p.submission_id }));
      });
    }
    let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { r.statusCode = 403; return r.end(); }
    if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => {
      if (e) { r.statusCode = 404; return r.end(); }
      const t = p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.css') ? 'text/css' : p.endsWith('.webp') ? 'image/webp' : p.endsWith('.png') ? 'image/png' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
      r.setHeader('content-type', t); r.end(d);
    });
  });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, received })));
}

(async () => {
  const { srv, received } = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/phillips-law/az-accident/`;
  const q = `?ee_test=synthetic&ee_endpoint=${encodeURIComponent(`http://127.0.0.1:${srv.address().port}/intake`)}&utm_source=test&utm_campaign=canary&gclid=G-TEST`;
  const executablePath = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const shot = async (page, name) => { if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, name + '.png') }); };
  try {
    for (const [w, h] of [[390, 844], [375, 667], [320, 568], [1280, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error' && !/googletagmanager|fonts\.g|net::/.test(m.text())) errors.push(m.text()); });
      await page.route(/googletagmanager|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());

      // ---- C: Claim Check chat ----
      await page.goto(base + 'claim-check/' + q);
      assert.equal((await page.textContent('.ca-disclaimer')).trim(), DIS);
      await page.locator('#chat').scrollIntoViewIfNeeded();
      const card0 = await page.locator('#chat').boundingBox();
      const doc0 = await page.evaluate(() => document.documentElement.scrollHeight);
      const tap = async (label) => { const b = page.locator('#dock').getByRole('button', { name: label, exact: true }); await b.first().waitFor({ timeout: 8000 }); await b.first().click(); };
      for (const l of ['Me', 'Yes, in Arizona', 'Car', 'In the last 30 days', 'Yes', 'ER or hospital', 'Someone else', 'No']) await tap(l);
      assert.match(await page.textContent('#ccSummaryText'), /8 answers: Me · Yes, in Arizona · Car/, `${w}: collapsed answer summary`);
      assert.equal(await page.locator('#contactStep').isVisible(), false, `${w}: no traditional form`);
      await tap('Have a person call me back');
      const y0 = await page.evaluate(() => scrollY);
      const type = async (sel, v) => { await page.waitForSelector(sel); await page.fill(sel, v); await page.press(sel, 'Enter'); };
      await type('#cc-full_name', 'Synthetic Tester');
      await page.waitForSelector('#cc-phone');
      await page.fill('#cc-phone', '12'); await page.press('#cc-phone', 'Enter');
      assert.match(await page.textContent('.cc-err'), /10-digit/, `${w}: bad phone refused in chat`);
      await page.fill('#cc-phone', '(602) 555-0199'); await page.press('#cc-phone', 'Enter');
      await page.locator('#dock').getByRole('button', { name: 'Skip email' }).click();
      await page.waitForSelector('.cc-agree');
      const legal = await page.textContent('.b.legal');
      assert.match(legal, /By tapping “Yes, call me back,” I agree/, `${w}: consent names the exact button`);
      assert.ok(!/Sofia|AI\)|AI intake/.test(legal), `${w}: no AI promise in consent`);
      await page.waitForTimeout(2600); // past the shared 2.5 s bot trap
      await page.click('.cc-agree');
      await page.waitForFunction(() => /your request is in/.test(document.querySelector('#thread').innerText), null, { timeout: 8000 });
      assert.match(await page.textContent('#thread'), /starting at 8 AM Arizona time[\s\S]*Reference: PLG·/);
      const card1 = await page.locator('#chat').boundingBox();
      const doc1 = await page.evaluate(() => document.documentElement.scrollHeight);
      const y1 = await page.evaluate(() => scrollY);
      assert.ok(Math.abs(card1.height - card0.height) <= 2, `${w}: stable card height (${card0.height} -> ${card1.height})`);
      assert.ok(Math.abs(doc1 - doc0) <= 2, `${w}: no document growth (${doc0} -> ${doc1})`);
      assert.ok(Math.abs(y1 - y0) <= 2, `${w}: no page jump during contact steps (${y0} -> ${y1})`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${w}: no sideways scroll`);
      const pc = received[received.length - 1];
      assert.equal(pc.schema, 'plg.intake.web/v1'); assert.equal(pc.page_id, 'plg-azmva-c-claim-check'); assert.equal(pc.entry_path, 'C_claim_check_chat');
      assert.equal(pc.request_type, 'claim_check'); assert.equal(pc.contact.phone_e164, '+16025550199'); assert.equal(pc.contact.email, null);
      assert.equal(pc.consent.mode, 'standard'); assert.equal(pc.screening.web_outcome, 'QUALIFIED'); assert.equal(pc.screening.where, 'az');
      assert.deepEqual([pc.attribution.utm_source, pc.attribution.gclid, pc.attribution.landing_path], ['test', 'G-TEST', '/phillips-law/az-accident/claim-check/']);
      assert.equal(pc.test.synthetic, true);
      await shot(page, `C-${w}x${h}`);

      // ---- A and B: forms still work and reach a receipt ----
      for (const [p, kind] of [['', 'A'], ['talk-to-sofia/', 'B']]) {
        await page.goto(base + p + q);
        assert.equal((await page.textContent('.ca-disclaimer')).trim(), DIS);
        if (kind === 'B') await page.click('#callSofia');
        await page.fill('#full_name', 'Synthetic Tester'); await page.fill('#phone', '6025550199');
        for (const g of ['accident_type', 'injured']) { const r = page.locator(`#leadForm input[name=${g}]`); if (await r.count()) await r.first().check(); }
        await page.waitForTimeout(2600);
        await page.click('#submitBtn');
        await page.waitForSelector('.receipt', { timeout: 8000 });
        assert.match(await page.textContent('.receipt'), /A person from Phillips Law Group’s Arizona intake team will call you back[\s\S]*8 AM Arizona time/);
        assert.ok(!/Sofia will|Sofia calls/i.test(await page.textContent('body')), `${kind}: no Sofia call promise`);
        const pa = received[received.length - 1];
        assert.equal(pa.entry_path, kind === 'A' ? 'A_form_call' : 'B_sofia_ai'); assert.equal(pa.consent.mode, 'standard');
      }
      assert.deepEqual(errors, [], `${w}: zero JS errors`);
      console.log(`${w}x${h}: C chat stable (card ${Math.round(card0.height)}px, doc Δ${doc1 - doc0}, scroll Δ${y1 - y0}), receipts on A/B/C, 0 JS errors`);
      await ctx.close();
    }
    // Retry of the same submission id reuses its receipt.
    const ids = received.map((p) => p.submission_id);
    assert.equal(new Set(ids).size, ids.length, 'each fill gets its own submission id');
    // Production configuration (no synthetic flag, no endpoint) fails closed: nothing is posted.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage(); let posted = false;
    page.on('request', (r) => { if (r.method() === 'POST') posted = true; });
    await page.route(/googletagmanager|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
    await page.goto(base);
    await page.fill('#full_name', 'X Y'); await page.fill('#phone', '6025550199');
    for (const g of ['accident_type', 'injured']) await page.locator(`#leadForm input[name=${g}]`).first().check();
    await page.waitForTimeout(2600); await page.click('#submitBtn');
    await page.waitForFunction(() => /aren’t connected yet|request is in|couldn’t confirm/.test(document.querySelector('#formStatus').textContent + (document.querySelector('.receipt') || {}).textContent));
    const prodEndpoint = await page.evaluate(() => document.querySelector('#formStatus').textContent);
    console.log('production config (local host, no synthetic flag):', posted ? 'POSTED' : 'not posted', '|', prodEndpoint.slice(0, 60));
    await ctx.close();
  } finally {
    await browser.close(); srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
