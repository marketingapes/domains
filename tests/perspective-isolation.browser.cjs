// Perspective portal: owner -> Lock -> restricted user, in a real browser.
// Nothing confidential from the owner's session (proposals, request drafts, typed values, share inputs, messages,
// Litify CSV rows, recordings) may survive Lock, and replies or file reads that finish after Lock must not write
// into the next person's page. The Perspective server is mocked; all data is synthetic.
// Run: node tests/perspective-isolation.browser.cjs   (Chromium via Playwright; CHROMIUM=/path to override)
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');

const ROOT = path.join(__dirname, '..', 'lfma');
const HUB = 'https://perspective-s3b8.onrender.com';
const SECRETS = ['SECRET-JV-PARAGRAPH', 'SECRET-REQUEST-CASE', 'TYPED-PR-TITLE', 'TYPED-PR-BODY', 'typed-share@example.test',
  'TYPED-RQ-CASE', 'TYPED-RQ-NOTES', 'SECRET-CSV-NAME', 'owner@example.test', 'Shared with', 'Approve as draft campaign', 'DRAFT, OWNERS ONLY'];

const lead = (uid, extra) => Object.assign({ lead_uid: uid, campaign: 'mva', received_at: '2026-09-01T12:00:00Z', stage: 'received', ours: true,
  ai_tracked: false, case_type: 'Auto (AA)', channel: 'Website form', source: 'Our intake ledger', phone_hash: 'h-' + uid, has_recording: false, recording_at: '' }, extra);
const base = { schema: 'perspective/v1', generated_at: '2026-10-05T21:00:00Z', client: { id: 'plg', name: 'Phillips Law Group', short_name: 'Phillips' },
  sources: [], notes: [], campaigns: [{ id: 'mva', label: 'Arizona MVA', name: 'Arizona MVA', state: 'AZ', summary: '' }], litify: [], tasks: [], transfers: [] };
const FEEDS = {
  OWNER: Object.assign({}, base, {
    leads: [lead('EE-1', { has_recording: true, recording_at: '2026-09-01T13:00:00Z', name: 'Synthetic Owner View' })],
    proposals: [{ id: 'jv-2026-04-29', kind: 'agreement', title: 'Signed JV', summary: '', body: ['SECRET-JV-PARAGRAPH'], effective_date: '2026-04-29',
      created_at: '2026-10-05T16:00:00Z', status: 'draft', recipients: [], acks: [], acked_by_me: false, ack_meaning: 'receipt only' }],
    requests: [{ id: '0123456789abcdef', case_type: 'SECRET-REQUEST-CASE', states: 'AZ', monthly_goal: 5, budget: null, notes: '', campaign_id: 'req-0123456789',
      status: 'requested', requested_by: 'owner@example.test', requested_at: '2026-10-05T16:00:00Z', decided_by: null, decided_at: null }],
    settings: { sections: [], levels: {}, updated: {} },
    access: { email: 'owner@example.test', role: 'owner', owner: true, contact: true, can_request: true, can_listen: true, can_complete_tasks: true,
      sections: ['overview', 'leads', 'marketing', 'litify', 'summary', 'proposals', 'requests'] } }),
  BASIC: Object.assign({}, base, {
    leads: [lead('EE-2')], proposals: [], requests: [],
    access: { email: 'basic@example.test', role: 'basic', owner: false, contact: false, can_request: false, can_listen: false, can_complete_tasks: false,
      sections: ['overview', 'leads', 'litify'] } }),
};

function serve() {
  const srv = http.createServer((q, r) => {
    let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { r.statusCode = 403; return r.end(); }
    if (p.endsWith('/')) p += 'index.html';
    fs.readFile(p, (e, d) => {
      if (e) { r.statusCode = 404; return r.end(); }
      r.setHeader('content-type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      r.end(d);
    });
  });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res(srv)));
}

async function mockHub(page, held) {
  await page.route(HUB + '/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), auth = req.headers().authorization || '';
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (url.pathname === '/portal/health') return json(200, { email_sign_in: true });
    // Email sign-in, synthetic: any 6-digit code works and the session names which mocked feed to serve.
    if (url.pathname.endsWith('/login')) return json(200, { sent: true });
    if (url.pathname.endsWith('/verify')) {
      const who = SESSIONS[JSON.parse(req.postData() || '{}').email];
      return who ? json(200, { session: who, user: {} }) : json(401, { detail: "that code didn't work" });
    }
    if (url.pathname.endsWith('/feed')) {
      const feed = FEEDS[auth.replace('Bearer ', '')];
      return feed ? json(200, feed) : json(401, { detail: 'sign in again' });
    }
    // The owner's writes and the recording are held until after Lock, then released into the next session.
    if (/\/proposals\/[^/]+\/share$/.test(url.pathname)) return held.push(() => json(200, { proposal_id: 'jv-2026-04-29', recipient: 'typed-share@example.test', shared: true }));
    if (url.pathname.endsWith('/requests')) return held.push(() => json(200, { request_id: 'fedcba9876543210', campaign_id: 'req-fedcba9876', status: 'requested' }));
    if (url.pathname.includes('/recordings/')) return held.push(() => route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from('RIFF-synthetic') }));
    return json(404, { detail: 'not mocked' });
  });
}

const SESSIONS = { 'owner@example.test': 'OWNER', 'basic@example.test': 'BASIC' };
const EMAILS = { OWNER: 'owner@example.test', BASIC: 'basic@example.test' };
async function signIn(page, who) {
  await page.waitForSelector('#step-email:not([hidden])', { timeout: 10000 });
  await page.fill('#email', EMAILS[who]);
  await page.click('#send-code');
  await page.waitForSelector('#step-code:not([hidden])', { timeout: 10000 });
  await page.fill('#code', '123456');
  await page.click('#verify');
  await page.waitForSelector('#app:not([hidden])', { timeout: 10000 });
}
// After Lock the sign-in screen must not keep the previous person's email (or code).
const gateCleared = (page) => page.evaluate(() => document.querySelector('#email').value === '' && document.querySelector('#code').value === '');

// Everything a person could see or read back: markup, typed values, file inputs, and the portal's in-memory state.
const leftovers = (page) => page.evaluate((secrets) => {
  const vals = [...document.querySelectorAll('input, textarea, select')]
    .map((e) => (e.type === 'file' ? (e.files && e.files.length ? 'FILE:' + e.files[0].name : '') : e.value)).join('|');
  const st = window.Perspective._state;
  const mem = JSON.stringify({ feed: st.feed, litify: st.litify, litifyText: st.litifyText, audio: st.audio });
  const all = document.documentElement.outerHTML + '\n' + vals + '\n' + mem;
  return secrets.filter((s) => all.includes(s));
}, SECRETS);

(async () => {
  const srv = await serve();
  const pageUrl = `http://127.0.0.1:${srv.address().port}/portal/phillips/`;
  const executablePath = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390 });
    const page = await context.newPage(), held = [], errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await mockHub(page, held);
    await page.goto(pageUrl);

    // 1. Owner session with confidential content on screen, typed drafts, and three replies still in flight.
    await signIn(page, 'OWNER');
    await page.click('[data-view="proposals"]');
    await page.waitForSelector('#pr-list article');
    await page.fill('#pr-title', 'TYPED-PR-TITLE');
    await page.fill('#pr-body', 'TYPED-PR-BODY');
    await page.fill('form[data-share="jv-2026-04-29"] input', 'typed-share@example.test');
    await page.click('form[data-share="jv-2026-04-29"] button');
    await page.click('[data-view="requests"]');
    await page.fill('#rq-case', 'TYPED-RQ-CASE');
    await page.fill('#rq-notes', 'TYPED-RQ-NOTES');
    await page.click('#rq-send');
    await page.click('[data-view="leads"]');
    await page.click('[data-lead="EE-1"]');
    await page.click('#rec-play');
    await page.waitForTimeout(300);
    assert.equal(held.length, 3, `${width}px: share, request and recording replies are in flight`);
    const before = await leftovers(page);
    assert.ok(['SECRET-JV-PARAGRAPH', 'SECRET-REQUEST-CASE', 'TYPED-RQ-NOTES'].every((s) => before.includes(s)), `${width}px: owner content was on screen`);

    // 2. Lock: the page holds nothing of the owner's session.
    await page.click('#lock-btn');
    assert.deepEqual(await leftovers(page), [], `${width}px: nothing of the owner's session after Lock`);
    assert.ok(await gateCleared(page), `${width}px: sign-in screen no longer holds the owner's email`);

    // 3. A restricted user signs in; then the owner's replies land.
    await signIn(page, 'BASIC');
    for (const release of held.splice(0)) await release();
    await page.waitForTimeout(500);
    const tabs = await page.$$eval('.section-tabs [data-view]', (bs) => bs.filter((b) => !b.hidden).map((b) => b.dataset.view));
    assert.ok(!tabs.includes('proposals') && !tabs.includes('requests') && !tabs.includes('settings'), `${width}px: restricted tabs only (${tabs})`);
    assert.deepEqual(await leftovers(page), [], `${width}px: late replies wrote nothing into the restricted user's page`);
    const status = await page.evaluate(() => [...document.querySelectorAll('[role=status]')].map((e) => e.textContent.trim()).filter(Boolean));
    assert.deepEqual(status, [], `${width}px: no stale status messages (${status})`);
    assert.equal(await page.evaluate(() => window.Perspective._state.audio), null, `${width}px: no audio carried over`);

    // 4. A Litify file read that finishes after Lock must not bring the owner's rows back.
    await page.click('#lock-btn');
    await signIn(page, 'OWNER');
    await page.click('[data-view="litify"]');
    await page.evaluate(() => {
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest = (a, b) => new Promise((res) => setTimeout(() => res(digest(a, b)), 1500));
    });
    const csv = 'Intake: Intake Name,Intake: Created Date,Source,Case Type,Status,Phone,Client\nINT-SYN,09/01/2026,Marketing Apes,Auto (AA),Chasing,6025550100,SECRET-CSV-NAME\n';
    await page.setInputFiles('#lt-file', { name: 'litify.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForTimeout(100);
    await page.click('#lock-btn');
    assert.ok(await gateCleared(page), `${width}px: sign-in screen cleared on the second Lock`);
    await signIn(page, 'BASIC');
    await page.waitForTimeout(2500);
    await page.click('[data-view="litify"]');
    assert.deepEqual(await leftovers(page), [], `${width}px: late Litify file read did not restore the owner's rows`);
    assert.equal(await page.evaluate(() => window.Perspective._state.litify), null, `${width}px: no Litify rows in memory`);

    assert.deepEqual(errors, [], `${width}px: no page errors`);
    console.log(`${width}px: owner -> Lock -> restricted user left nothing behind; late share/request/recording replies and a late Litify read were dropped`);
    await context.close();
  }
  await browser.close();
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
