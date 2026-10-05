// Client Perspective views inside the protected Phillips tab. The shipped loader runs in a vm against a
// projection built from SYNTHETIC workbooks by the real projector. No network, no real data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const SRC = read('../lfma/assets/portal/phillips-report.js');
const PAGE = read('../lfma/portal/phillips/index.html');
const window = {};
vm.runInContext(SRC, vm.createContext({ window, Promise, Date, isFinite, isNaN, String, Array, Error, JSON, Math, Number, Object }));
const R = window.PhillipsReport;
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const projection = (() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-perspective-ui-'));
  try {
    const tools = (p) => fileURLToPath(new URL(p, import.meta.url));
    assert.equal(spawnSync('python3', [tools('./fixtures/phillips-client-perspective-workbooks.py'), dir]).status, 0);
    const out = path.join(dir, 'p.json');
    const r = spawnSync('python3', [tools('../tools/phillips-portal-prototype/project-client-perspective.py'), '--mva', path.join(dir, 'mva.xlsx'), '--mva-daily', path.join(dir, 'az-mva.xlsx'),
      '--la-county', path.join(dir, 'la-county.xlsx'), '--modified', '{"mva":"2026-10-01T00:00:00Z"}', '--output', out, '--now', '2026-10-04T20:00:00Z'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
})();
const P = () => ({ ...structuredClone(projection), stored_at: '2026-10-04T20:05:00Z', sha256: 'f'.repeat(64) });
const view = (st) => R.renderPerspective(P(), { campaign: '', section: 'overview', ...st });

test('MVA opens first with planned budget, actual spend and its period; Signed stays Unknown', () => {
  const html = view({});
  assert.match(html, /data-cp-campaign="mva" aria-selected="true"/);
  const t = text(html);
  assert.match(t, /\$5,000\.00 Planned budget/);
  assert.match(t, /\$42\.50 Actual spend Period 2026-07-01 → 2026-07-04 · 3 days reported/);
  assert.match(t, /Unknown Signed/);
  assert.match(t, /spend days missing .*2026-07-03/i);
  assert.match(t, /Source periods/);
});

test('every campaign and section renders without leaking another campaign', () => {
  for (const c of ['mva', 'la_county', 'deadleads']) for (const s of ['overview', 'leads', 'marketing', 'next']) {
    const html = view({ campaign: c, section: s });
    assert.match(html, new RegExp(`data-cp-campaign="${c}" aria-selected="true"`));
    assert.match(html, new RegExp(`data-cp-section="${s}" class="active"`));
    if (s === 'leads' && c !== 'la_county') assert.ok(!html.includes('PLGLASYN01'), `${c} shows an LA lead`);
  }
  assert.match(text(view({ campaign: 'la_county' })), /Unknown Planned budget/);
  assert.match(text(view({ campaign: 'deadleads', section: 'marketing' })), /No spend source exists/);
});

test('leads view: source, dates, contact, handoff evidence, firm disposition and next action per lead', () => {
  const html = view({ section: 'leads' });
  for (const h of ['Lead', 'Source', 'Dates', 'Contact activity', 'Handoff evidence', 'Firm disposition', 'Next action']) assert.ok(html.includes(`<th>${h}</th>`), h);
  const row = html.split('<tr>').find((r) => r.includes('INT-000000000001'));
  const t = text(row);
  assert.match(t, /Meta lead-ad record/);
  assert.match(t, /ad 9001/);
  assert.match(t, /Sent by API \(success logged\)/);
  assert.match(t, /Sources disagree/);
  assert.match(t, /Platform marked “signed” — unverified/);
  assert.match(t, /Signed: not verified/);
  assert.match(t, /Report the contact outcome Phillips/);
  assert.match(t, /4 source records merged by shared ID/);
});

test('lead filters: status, ID search, excluded toggle and paging', () => {
  const base = text(view({ section: 'leads' })).match(/(\d+) shown/)[1];
  assert.equal(text(view({ section: 'leads', excluded: true })).match(/(\d+) shown/)[1], String(Number(base) + 1));
  assert.match(text(view({ section: 'leads', q: 'no-such-id' })), /0 shown .*No leads match these filters/);
  assert.match(text(view({ section: 'leads', status: 'Chasing' })), /2 shown/);
  assert.match(view({ section: 'leads', page: 99 }), /page 1 of 1/);
});

test('marketing: channel spend, sheet-total check, second source compared not added, calls unlinked, creative', () => {
  const t = text(view({ section: 'marketing' }));
  assert.match(t, /Sheet TOTAL row: \$42\.50 — matches the daily rows/);
  assert.match(t, /never added to the primary total.*\$35\.00/);
  assert.match(t, /1 calls logged · 1 marked transferred/);
  assert.match(t, /no call is attached to a lead/);
  assert.match(view({ section: 'marketing' }), /<img src="\/assets\/portal\/phillips\/creative\/phillips-mva-august-2026-historical-creative\.jpeg"/);
  assert.match(text(view({ campaign: 'la_county', section: 'marketing' })), /differs from the daily rows/);
});

test('next steps: missing feedback grouped by owner and action; unresolved data issues listed', () => {
  const t = text(view({ section: 'next' }));
  assert.match(t, /Phillips · Report the contact outcome — 2 lead\(s\)/);
  assert.match(t, /Marketing Apes · Deliver to Phillips or close as unsent — 1 lead\(s\)/);
  assert.match(t, /ambiguous match/);
  assert.match(text(view({ campaign: 'la_county', section: 'next' })), /Confirm signed retainer with an executed-retainer reference/);
});

test('values are escaped and creative paths are allowlisted', () => {
  const p = P();
  p.leads[0].firm.current_status = '<img src=x onerror=alert(1)>';
  p.campaigns[0].creative = [{ label: '"><script>x</script>', asset: '../../secret.png', limits: 'x' }, { label: 'ok', asset: 'javascript:alert(1)', limits: 'x' }];
  const html = R.renderPerspective(p, { section: 'leads' }) + R.renderPerspective(p, { section: 'marketing' });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>x'));
  assert.ok(!html.includes('secret.png') && !html.includes('javascript:'));
});

test('an unrecognised payload renders nothing rather than partial figures', () => {
  assert.equal(R.renderPerspective(null, {}), '');
  assert.equal(R.renderPerspective({ schema: 'other', campaigns: [], leads: [] }, {}), '');
});

test('the public page holds no perspective data; it only arrives with an accepted token', () => {
  for (const s of ['INT-', 'MAT-', 'FBL', 'client_perspective', '$5,000', 'Arizona MVA']) assert.ok(!PAGE.includes(s), s);
  assert.ok(!SRC.includes('INT-0'), 'loader carries no records');
  assert.match(SRC, /Authorization: 'Bearer ' \+ token/);
});
