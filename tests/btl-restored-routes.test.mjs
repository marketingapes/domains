// Restored BTL legacy routes (2026-09-23). The LA County pages are the pre-cutover originals
// (Drive: Evolution Engine/Clients/Legal/Phillips/Old Phillips/Campaigns/LA County Sex Abuse/
// la-county-sex-abuse, byte-identical to BTL/Campaigns/Clients/LegalCalls/Campaings/JDC/_source).
// The only permitted change is the form transport: same Make hook and JSON transport as the live
// homepage form. Legal text must stay verbatim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../btl/', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const sha = (p) => createHash('sha256').update(read(p)).digest('hex');
const la = 'sex-abuse/la-county-sex-abuse/';

const home = read('index.html').toString();
const homeHook = /var WEBHOOK_URL='([^']+)'/.exec(home)[1];

test('LA County qualified/disqualified pages and images are byte-identical to the recovered originals', () => {
  assert.equal(sha(la + 'qualified.html'), '772c268a0dd0097eddd3023d673654dd27739651610b9a1381af13d0c2d31252');
  assert.equal(sha(la + 'disqualified.html'), '179a7201aefb722a50156831d9db53452f5fde083de6c75764eece660056bd44');
  assert.equal(sha(la + 'images/hero-bg.jpg'), 'd7f8a2eeeda6700e370203a655e2d676a3b03cf30e0c145d762381f08c89fdba');
  assert.equal(sha(la + 'images/ad-creative.png'), 'e1f6df96f12c1d6da1eb0b9327b78ee678f10148a685c59abfa401abf9c1a266');
});

test('LA County landing page keeps the original title, SB 37 disclaimer and GTM container', () => {
  const html = read(la + 'index.html').toString();
  assert.match(html, /<title>LA County Probation Facility Sexual Abuse Claims — Free Case Review \| Phillips Law Group<\/title>/);
  assert.ok(html.includes('Phillips Law Group (700 Flower St, Suite 1000 Los Angeles, CA 90017) is responsible for this ad.'));
  assert.ok(html.includes('A California-licensed attorney is associated for California cases.'));
  assert.equal((html.match(/GTM-PHC7459M/g) || []).length, 2);
});

test('LA County form posts to the homepage web-lead hook with the homepage JSON transport and no other hook', () => {
  const html = read(la + 'index.html').toString();
  assert.ok(html.includes(`webhookUrl: '${homeHook}'`));
  assert.doesNotMatch(html, /hooks\.zapier\.com/);
  assert.doesNotMatch(html, /mode:\s*'no-cors'/);
  assert.match(html, /headers: \{ 'Content-Type': 'application\/json' \}/);
  const hooks = new Set(html.match(/https:\/\/hook\.[a-z0-9.]*make\.com\/[a-z0-9]+/g) || []);
  assert.deepEqual([...hooks], [homeHook]);
  for (const key of ['full_name', 'phone', 'claim_type', 'campaign_id', 'best_time', 'consent_text', 'consent_method', 'ts']) {
    assert.match(html, new RegExp(`payload\\.${key}\\s+=`));
  }
});

test('retired Arizona injury path is a holding page that collects nothing', () => {
  const p = 'phillips-law/arizona-injury-lawyers/index.html';
  assert.ok(existsSync(new URL(p, root)));
  const html = read(p).toString();
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.match(html, /href="https:\/\/besttortlawyers\.com\/"/);
  assert.doesNotMatch(html, /<form|fetch\(|hook\.|zapier|tel:/i);
  assert.equal((html.match(/GTM-PHC7459M/g) || []).length, 2);
});
