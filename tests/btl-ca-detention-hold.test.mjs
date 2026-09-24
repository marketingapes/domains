// HOLD-FOR-COUNSEL restore of /sex-abuse/ca-detention-abuse/ (2026-09-23). Pre-cutover LegalCalls JDC
// build (Jul 27 download, legalcalls-pages/jdc). Its disclaimer names Jordan M. Jones and Adam Pulaski.
// Legal text is pinned verbatim here on purpose: any rewrite must come from Kyle/counsel, not a tidy-up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const root = new URL('../btl/', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const sha = (p) => createHash('sha256').update(read(p)).digest('hex');
const d = 'sex-abuse/ca-detention-abuse/';
const homeHook = /var WEBHOOK_URL='([^']+)'/.exec(read('index.html').toString())[1];

test('qualified/disqualified pages and ad image are byte-identical to the recovered originals', () => {
  assert.equal(sha(d + 'qualified.html'), '38d4732887627fac81a29541e8f8a7bbe0f89a6a9c67832b841ce510689d64e8');
  assert.equal(sha(d + 'disqualified.html'), '445e2ab33cb2a6a2a8a0f3018770805d758c0e19f60553aa7479cd3fa1b65758');
  assert.equal(sha(d + 'jdc-ad-square.jpg'), '87bc4ab5d152886fffdea9c93f755c4a72af9ca81a44a1177175f9d2a5f7bcb3');
});

test('landing page keeps the original sponsoring-attorney disclaimer verbatim', () => {
  const html = read(d + 'index.html').toString();
  assert.ok(html.includes('Jordan M. Jones (360 E 2nd St #820, Los Angeles, CA 90012) and Adam Pulaski (2925 Richmond Ave #1725, Houston, TX 77098) are responsible for this advertisement.'));
  assert.equal((html.match(/GTM-PHC7459M/g) || []).length, 2);
});

test('form posts only to the homepage web-lead hook, never the LegalCalls Zapier hook', () => {
  const html = read(d + 'index.html').toString();
  assert.ok(html.includes(`webhookUrl: '${homeHook}'`));
  assert.doesNotMatch(html, /hooks\.zapier\.com/);
  assert.doesNotMatch(html, /mode:\s*'no-cors'/);
  const hooks = new Set(html.match(/https:\/\/hook\.[a-z0-9.]*make\.com\/[a-z0-9]+/g) || []);
  assert.deepEqual([...hooks], [homeHook]);
});
