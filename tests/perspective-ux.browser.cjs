// Perspective portal UX, in a real browser against a mocked Perspective server (synthetic data only):
// plain email sign-in, the top area (heading, + Request a Campaign, Arizona MVA preview, pages and ad previews,
// freshness and state), requests from the top, no Settings/Admin link (owner-only #admin route by URL), no secrets in the page.
// Run: node tests/perspective-ux.browser.cjs   (SHOTS=/dir saves screenshots; CHROMIUM=/path overrides the browser)
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');

const ROOT = path.join(__dirname, '..', 'lfma');
const HUB = 'https://perspective-s3b8.onrender.com';
const SESSION = { FIRM: 'ps1.FIRMSESSIONSECRET.sig', OWNER: 'ps1.OWNERSESSIONSECRET.sig' };
const ALL = ['overview', 'leads', 'marketing', 'litify', 'summary', 'proposals', 'requests'];

const mva = { id: 'mva', label: 'Arizona MVA', name: 'Arizona MVA · Personal Injury', state: 'PREVIEW · new 3-page test built, not live',
  summary: 'Paid Meta and Google campaigns for Arizona accident cases.', narrative: ['Preview (not live).'], log: [], needs: [],
  links: [{ kind: 'page', label: 'A · Form + call', url: 'https://btl-phillips-az-accident-stage-20261005.onrender.com/phillips-law/az-accident/', note: 'Preview' },
    { kind: 'ad', label: 'Meta N1 · Request a callback', url: 'https://fb.me/28IP0qlKcQzi8aw', note: 'Paused' }] };
const feed = (who, requests) => ({
  schema: 'perspective/v1', generated_at: new Date().toISOString(), client: { id: 'plg', name: 'Phillips Law Group', short_name: 'Phillips' },
  sources: [{ id: 'ledger', label: 'Our intake ledger', as_of: new Date().toISOString(), status: 'ok', note: '', detail: '' }], notes: [],
  campaigns: [{ id: 'handover', label: 'Handover', name: 'Handover list', state: 'Delivered', summary: '' },
    { id: 'la', label: 'LA County', name: 'LA County', state: 'Live', summary: '' }, mva],
  leads: [], litify: [], tasks: [], transfers: [], proposals: [], requests,
  ...(who === 'OWNER' ? { settings: { sections: ALL.concat('contact'), levels: {}, updated: {} } } : {}),
  access: who === 'OWNER'
    ? { email: 'kyle@marketingapes.com', role: 'owner', owner: true, contact: true, can_request: true, can_listen: true, can_complete_tasks: true, sections: ALL }
    : { email: 'jane.doe@phillipslaw.com', role: 'firm', owner: false, contact: true, can_request: true, can_listen: true, can_complete_tasks: true, sections: ALL },
});

function serve() {
  const srv = http.createServer((q, r) => {
    let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { r.statusCode = 403; return r.end(); }
    if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => {
      if (e) { r.statusCode = 404; return r.end(); }
      r.setHeader('content-type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      r.end(d);
    });
  });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res(srv)));
}

async function mockHub(page, log) {
  const requests = [];
  await page.route(HUB + '/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), auth = (req.headers().authorization || '').replace('Bearer ', '');
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    const who = Object.keys(SESSION).find((k) => SESSION[k] === auth);
    log.push(req.method() + ' ' + url.pathname);
    if (url.pathname === '/portal/health') return json(200, { email_sign_in: true });
    if (url.pathname.endsWith('/login')) return json(200, { sent: true });
    if (url.pathname.endsWith('/verify')) {
      const email = JSON.parse(req.postData() || '{}').email.trim().toLowerCase();
      if (email === 'kyle@marketingapes.com') return json(200, { session: SESSION.OWNER, user: {} });
      if (email.endsWith('@phillipslaw.com')) return json(200, { session: SESSION.FIRM, user: {} });
      return json(401, { detail: "that code didn't work; request a new one" });
    }
    if (url.pathname.endsWith('/feed')) return who ? json(200, feed(who, requests)) : json(401, { detail: 'sign in again' });
    if (url.pathname.endsWith('/requests') && req.method() === 'POST') {
      if (!who) return json(401, { detail: 'sign in again' });
      const b = JSON.parse(req.postData() || '{}');
      requests.push({ id: 'fedcba9876543210', case_type: b.case_type, states: b.states, monthly_goal: b.monthly_goal, budget: null, notes: b.notes,
        campaign_id: 'req-fedcba9876', status: 'requested', requested_by: 'you', requested_at: new Date().toISOString(), decided_by: null, decided_at: null });
      return json(200, { request_id: 'fedcba9876543210', campaign_id: 'req-fedcba9876', status: 'requested' });
    }
    return json(404, { detail: 'not mocked' });
  });
}

async function signIn(page, email) {
  await page.fill('#email', email);
  await page.click('#send-code');
  await page.waitForSelector('#step-code:not([hidden])', { timeout: 10000 });
  await page.fill('#code', '123456');
  await page.click('#verify');
  await page.waitForSelector('#app:not([hidden])', { timeout: 10000 });
}
const leak = (page) => page.evaluate((secrets) => {
  const all = document.documentElement.outerHTML + location.href;
  return secrets.filter((s) => all.includes(s));
}, [SESSION.FIRM, SESSION.OWNER, 'SECRET']);

(async () => {
  const srv = await serve();
  const pageUrl = `http://127.0.0.1:${srv.address().port}/portal/phillips/`;
  const executablePath = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const shot = async (page, name) => { if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: false }); };
  try {
    for (const width of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage(), errors = [], log = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await mockHub(page, log);
      await page.goto(pageUrl);

      // 1. Sign-in: email box and button immediately; owner key folded away; no technical words.
      assert.ok(await page.isVisible('#email') && await page.isVisible('#send-code'), `${width}: email first`);
      assert.equal(await page.isVisible('#token'), false, `${width}: owner key hidden`);
      const gate = await page.innerText('#gate');
      assert.ok(!/API|token|HTTP|onrender/i.test(gate), `${width}: plain sign-in copy (${gate})`);
      assert.ok(!/Owner sign-in|access level|Admin|Settings/i.test(gate), `${width}: no owner/admin/access controls on the client sign-in`);
      assert.equal(await page.isVisible('#token-alt'), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}: no sideways scroll`);
      await shot(page, `${width}-1-signin`);
      await page.fill('#email', 'Jane.Doe@PhillipsLaw.com'); await page.click('#send-code');
      await page.waitForSelector('#step-code:not([hidden])');
      assert.ok(await page.isVisible('#code') && !(await page.isVisible('#step-email')), `${width}: code step in the same panel`);
      await shot(page, `${width}-2-code`);
      await page.fill('#code', '123456'); await page.click('#verify');
      await page.waitForSelector('#app:not([hidden])');

      // 2. Top area for a Phillips session.
      assert.match(await page.innerText('.ph-title'), /Phillips Perspective/);
      assert.ok(await page.isVisible('#rq-top'), `${width}: + Request a Campaign at the top`);
      assert.equal(await page.innerText('#rq-top'), '+ Request a Campaign');
      assert.match(await page.innerText('#c-title'), /Arizona MVA/, `${width}: opens on the Arizona MVA preview`);
      assert.match(await page.innerText('#c-state'), /PREVIEW/);
      const links = await page.$$eval('#c-links a', (as) => as.map((a) => [a.textContent, a.href, a.target, a.rel]));
      assert.deepEqual(links.map((l) => l[0]), ['A · Form + call', 'Meta N1 · Request a callback']);
      assert.ok(links.every((l) => l[1].startsWith('https://') && l[2] === '_blank' && /noopener/.test(l[3])));
      assert.match(await page.innerText('#freshness'), /Last updated/);
      assert.equal(await page.$('#admin-link'), null, `${width}: no Admin/Settings link in the header`);
      const tabs = await page.$$eval('.section-tabs [data-view]', (bs) => bs.map((b) => b.getAttribute('data-view')));
      assert.ok(!tabs.includes('settings'), `${width}: no Settings tab (${tabs})`);
      await shot(page, `${width}-3-top`);

      // 3. Request a Campaign from the top, without a page reload.
      await page.evaluate(() => { window.__noReload = true; });
      await page.click('#rq-top');
      assert.ok(await page.isVisible('#rq-form'), `${width}: request form open`);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'rq-case');
      await page.fill('#rq-case', 'Dog bite'); await page.fill('#rq-states', 'AZ'); await page.fill('#rq-goal', '5');
      await page.click('#rq-send');
      await page.waitForFunction(() => /Pending review/.test(document.querySelector('#rq-msg').textContent));
      await page.waitForFunction(() => /Pending review/.test(document.querySelector('#rq-list').innerText));
      assert.equal(await page.evaluate(() => window.__noReload), true, `${width}: no full page reload`);
      assert.equal(await page.$$eval('#rq-list [data-rq]', (b) => b.length), 0, `${width}: Phillips cannot approve`);
      await shot(page, `${width}-4-request`);

      // 4. #admin is refused for a Phillips session.
      await page.evaluate(() => { location.hash = '#admin'; });
      await page.waitForTimeout(150);
      assert.equal(await page.isVisible('[data-panel="settings"]'), false, `${width}: Phillips cannot open admin`);
      assert.notEqual(await page.evaluate(() => location.hash), '#admin');
      assert.deepEqual(await leak(page), [], `${width}: no session token in page or URL`);

      // 5. Owner: Admin link, #admin opens administration; Settings still not a tab.
      await page.click('#lock-btn');
      await page.waitForSelector('#gate:not([hidden])');
      await page.evaluate(() => { location.hash = '#owner'; });
      await page.waitForSelector('#token-alt:not([hidden])');
      await page.click('#token-alt summary');
      assert.ok(await page.isVisible('#token'), `${width}: owner sign-in reachable at #owner only`);
      await page.click('#token-alt summary');
      await signIn(page, 'kyle@marketingapes.com');
      assert.equal(await page.$('#admin-link'), null, `${width}: no Admin/Settings link even for the owner`);
      await page.evaluate(() => { location.hash = '#admin'; });   // owner reaches administration by URL only
      await page.waitForSelector('[data-panel="settings"]:not([hidden])');
      assert.match(await page.innerText('[data-panel="settings"]'), /OWNER ADMIN/);
      const otabs = await page.$$eval('.section-tabs [data-view]', (bs) => bs.map((b) => b.getAttribute('data-view')));
      assert.ok(!otabs.includes('settings'));
      await shot(page, `${width}-5-admin`);
      assert.deepEqual(await leak(page), [], `${width}: no session token in page or URL (owner)`);

      assert.deepEqual(errors, [], `${width}: zero JavaScript errors`);
      assert.ok(!log.some((l) => /settings/.test(l) && /^PUT/.test(l)), 'no settings writes from this test');
      console.log(`${width}px: email-first sign-in, top area (heading, + Request a Campaign, Arizona MVA preview, links, freshness), request pending review, Phillips refused at #admin, owner admin reachable, 0 JS errors`);
      await ctx.close();
    }
  } finally {
    await browser.close(); srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
