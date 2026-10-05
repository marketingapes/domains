// Browser QA for the running protected preview (protected-preview.mjs).
//   node tools/phillips-portal-prototype/verify-protected-preview.mjs --url http://127.0.0.1:PORT/portal/phillips/ \
//     --token-file /tmp/.../token --out /tmp/.../qa
// Screenshots contain source IDs; --out must be system temporary storage, never the repository.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const out = resolve(args.out);
if (![resolve(tmpdir()), '/private/tmp', '/tmp'].some((t) => out.startsWith(t + sep))) throw Error('--out must be in system temporary storage');
await mkdir(out, { recursive: true, mode: 0o700 });
const token = (await readFile(args['token-file'], 'utf8')).trim();
const origin = new URL(args.url).origin;
const { chromium } = await import(process.env.PERSPECTIVE_PLAYWRIGHT_MODULE || '/private/tmp/phillips-mva-browser-qa/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.PERSPECTIVE_CHROMIUM || '/Users/kylegosselin/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', headless: true });

const CAMPAIGNS = { mva: 'Arizona MVA', la_county: 'LA County', deadleads: 'Deadleads (firm intakes)' };
const SECTIONS = ['overview', 'leads', 'marketing', 'next'];
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/, PHONE = /\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/;
const fail = (m, extra) => { throw Error(m + (extra ? ' ' + JSON.stringify(extra) : '')); };
const checks = [];

async function open(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const log = { api: [], foreign: [], errors: [] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  // Resource failures are judged by URL below (401 for the rejected-token check is expected).
  page.on('console', (m) => { if (m.type() === 'error' && !/turnstile|challenges|cloudflare|Failed to load resource/i.test(m.text())) log.errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !(r.status() === 401 && r.url().includes('/api/')) && !/favicon\.ico$/.test(r.url())) log.errors.push(`${r.status()} ${r.url()}`); });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.origin === origin && u.pathname.startsWith('/api/')) log.api.push({ path: u.pathname, auth: Boolean(r.headers().authorization) });
    else if (u.origin !== origin && u.hostname !== 'challenges.cloudflare.com' && !r.url().startsWith('blob:https://challenges.cloudflare.com/')) log.foreign.push(u.href);
  });
  await page.goto(args.url);
  await page.waitForSelector('#portal-root.unlocked', { timeout: 20000 });
  return { page, log };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const bodyText = (page) => page.evaluate(() => document.body.innerText);
async function unlock(page, value) {
  await page.click('#outcome-tab-button');
  await page.fill('#outcome-token', value);
  await page.click('#outcome-unlock');
  await page.waitForFunction(() => !document.querySelector('#outcome-root').textContent.includes('Loading report'));
}

try {
  // Access control: nothing private is requested or rendered before an accepted token.
  {
    const { page, log } = await open(1440);
    if (log.api.length) fail('report requested before a token was entered', log.api);
    if (await page.locator('#cp').count()) fail('perspective rendered without token');
    await unlock(page, 'not-the-token');
    if (await page.locator('#cp').count()) fail('perspective rendered for rejected token');
    if (!(await page.locator('#outcome-root').textContent()).includes('not recognized')) fail('rejected token message missing');
    if (/INT-\d|PLG[A-Z0-9]{6}|\$3,894/.test(await bodyText(page))) fail('private data visible after rejected token');
    if (!log.api.every((r) => r.auth)) fail('unauthenticated API request');
    checks.push({ check: 'access: no fetch before token, rejected token shows nothing', passed: true });

    await unlock(page, token);
    await page.waitForSelector('#cp');
    if ((await page.locator('#outcome-token').inputValue()) !== '') fail('token left in field');
    const storage = await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + document.cookie + location.href);
    if (storage.includes(token)) fail('token persisted in storage/URL');
    const selected = await page.locator('[data-cp-campaign][aria-selected="true"]').textContent();
    if (selected !== 'Arizona MVA') fail('MVA is not the default campaign', { selected });
    const t = await bodyText(page);
    if (!t.includes('$3,894.15') || !t.includes('$5,000.00')) fail('MVA overview spend/budget missing');
    await page.click('#outcome-clear');
    if (await page.locator('#cp').count() || /INT-\d|\$3,894/.test(await bodyText(page))) fail('clear did not remove loaded data');
    checks.push({ check: 'access: accepted token loads MVA default; token not stored; clear removes data', passed: true });
    if (log.foreign.length || log.errors.length) fail('foreign requests or errors', log);
    await page.close();
  }

  // Every campaign × section at desktop, tablet and phone widths.
  for (const width of [1440, 768, 375]) {
    const { page, log } = await open(width);
    await unlock(page, token);
    await page.waitForSelector('#cp');
    await page.screenshot({ path: `${out}/overview-mva-${width}.png`, fullPage: false });
    for (const [key, label] of Object.entries(CAMPAIGNS)) {
      await page.click(`[data-cp-campaign="${key}"]`);
      for (const section of SECTIONS) {
        await page.click(`[data-cp-section="${section}"]`);
        const sel = await page.locator('[data-cp-campaign][aria-selected="true"]').textContent();
        if (sel !== label) fail('campaign selection lost', { key, section, sel });
        if (await page.locator(`[data-cp-section="${section}"].active`).count() !== 1) fail('section not active', { section });
        const text = await page.locator('.cp-body').innerText();
        if (text.trim().length < 40) fail('empty section', { key, section, width });
        if (EMAIL.test(text) || PHONE.test(text)) fail('contact identifier in rendered view', { key, section });
        if (await overflow(page)) fail('horizontal overflow', { width, key, section });
        if (section === 'leads') {
          const rows = await page.locator('.cp-leads tbody tr').count();
          if (rows < 1) fail('no lead rows', { key });
          if (width === 375 && (await page.locator('.cp-leads thead').isVisible())) fail('phone layout shows table header');
        }
        if (section === 'marketing' && key !== 'deadleads') {
          // Images are lazy: bring the first into view, then wait (bounded) for it to decode.
          const img = page.locator('.cp-creative img').first();
          await img.scrollIntoViewIfNeeded();
          const ok = await img.evaluate((el) => new Promise((r) => { if (el.complete) return r(el.naturalWidth > 0); el.onload = () => r(true); el.onerror = () => r(false); setTimeout(() => r(false), 10000); }));
          await page.evaluate(() => scrollTo(0, 0));
          if (!ok) fail('creative image did not load', { key });
        }
        if (section === 'overview' && !/Coverage gaps/i.test(text)) fail('coverage gaps missing', { key });
        if (section === 'next' && !/Unresolved data issues/i.test(text)) fail('data issues missing', { key });
        if (key === 'mva' || width === 375) await page.screenshot({ path: `${out}/${key}-${section}-${width}.png`, fullPage: false });
        checks.push({ width, campaign: key, section, passed: true });
      }
    }
    // Lead filters: status, ID search, test/spam toggle, paging.
    await page.click('[data-cp-campaign="mva"]');
    await page.click('[data-cp-section="leads"]');
    const count = async () => Number((await page.locator('.cp .oc-period').last().textContent()).match(/^(\d+) shown/)[1]);
    const base = await count();
    await page.selectOption('[data-cp="status"]', 'Turned Down');
    const td = await count();
    if (!(td > 0 && td < base)) fail('status filter', { base, td });
    await page.selectOption('[data-cp="status"]', '');
    await page.check('[data-cp="excluded"]');
    if (!((await count()) > base)) fail('excluded toggle');
    await page.uncheck('[data-cp="excluded"]');
    await page.fill('[data-cp="q"]', 'zzzz-no-such-id');
    if ((await count()) !== 0 || !(await page.locator('.leadsempty').isVisible())) fail('search empty state');
    await page.fill('[data-cp="q"]', '');
    await page.click('[data-cp-campaign="deadleads"]');
    await page.click('[data-cp-section="leads"]');
    await page.click('.cp-pager button:has-text("Next")');
    if (!(await page.locator('.cp .oc-period').last().textContent()).includes('page 2 of')) fail('paging');
    checks.push({ width, check: 'lead filters, search empty state, test/spam toggle, paging', passed: true });
    if (log.foreign.length || log.errors.length) fail('foreign requests or errors', { width, ...log });
    await page.close();
  }
} finally {
  await browser.close();
}
const summary = { campaign_section_views: checks.filter((c) => c.section).length, total_checks: checks.length, widths: [1440, 768, 375], screenshots: out };
await writeFile(`${out}/qa.json`, JSON.stringify({ ...summary, checks }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(summary));
