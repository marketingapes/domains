// Projector over SYNTHETIC workbooks shaped like the three original Phillips sources. No real data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../tools/phillips-portal-prototype/project-client-perspective.py', import.meta.url));
const makeBooks = fileURLToPath(new URL('./fixtures/phillips-client-perspective-workbooks.py', import.meta.url));
const MODIFIED = JSON.stringify({ mva: '2026-10-01T00:00:00Z', mva_daily: '2026-07-25T00:00:00Z', la_county: '2026-08-03T00:00:00Z' });

function project(t, output, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-perspective-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const made = spawnSync('python3', [makeBooks, dir], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const out = output ? output(dir) : path.join(dir, 'out', 'perspective.json');
  const r = spawnSync('python3', [script, '--mva', path.join(dir, 'mva.xlsx'), '--mva-daily', path.join(dir, 'az-mva.xlsx'), '--la-county', path.join(dir, 'la-county.xlsx'),
    '--modified', MODIFIED, '--output', out, '--now', '2026-10-04T20:00:00Z', ...extra.flatMap((x) => (typeof x === 'function' ? x(dir) : [x]))], { encoding: 'utf8' });
  return { r, out, dir, data: r.status === 0 ? JSON.parse(fs.readFileSync(out, 'utf8')) : null, raw: r.status === 0 ? fs.readFileSync(out, 'utf8') : '' };
}
const lead = (d, id) => d.leads.find((l) => Object.values(l.ids).flat().includes(id));
const camp = (d, k) => d.campaigns.find((c) => c.key === k);

test('no names, contact details, narratives, notes, IPs or click IDs leave the projector', (t) => {
  const { r, raw } = project(t);
  assert.equal(r.status, 0, r.stderr);
  for (const s of ['SYNTHETIC PERSON', 'SYNTHETIC NARRATIVE', 'synthetic@example.com', '555-0101', '5550101', '555-0100', 'Synthetic City', '203.0.113.9', 'fbclid', 'example.invalid'])
    assert.ok(!raw.includes(s), s);
});

test('output is owner-only and refused inside Git or outside temporary storage', (t) => {
  const ok = project(t);
  assert.equal(fs.statSync(ok.out).mode & 0o777, 0o600);
  const inGit = project(t, (dir) => { fs.mkdirSync(path.join(dir, 'repo', '.git'), { recursive: true }); return path.join(dir, 'repo', 'p.json'); });
  assert.notEqual(inGit.r.status, 0);
  const inRepo = project(t, () => fileURLToPath(new URL('../perspective-should-not-exist.json', import.meta.url)));
  assert.notEqual(inRepo.r.status, 0);
  assert.equal(fs.existsSync(fileURLToPath(new URL('../perspective-should-not-exist.json', import.meta.url))), false);
});

test('MVA is the default; LA County and other Phillips intakes stay available', (t) => {
  const { data } = project(t);
  assert.deepEqual(data.campaigns.filter((c) => c.default).map((c) => c.key), ['mva']);
  assert.deepEqual(data.campaigns.map((c) => c.key), ['mva', 'la_county', 'deadleads', 'all']);
});

test('records merge only on shared explicit IDs, keep every source row, and disagreements stay visible', (t) => {
  const { data } = project(t);
  const l = lead(data, 'INT-000000000001');
  assert.equal(l.dedupe.state, 'merged');
  assert.equal(l.source_records.length, 4, 'ledger + older ledger + firm export + delivery log');
  assert.equal(l.firm.conflict, false, 'older values are history, not a conflict');
  assert.equal(l.firm.updated, true);
  assert.equal(l.firm.current_status, 'Chasing', 'latest workbook wins the display, others kept');
  assert.ok(l.firm.history.some((h) => h.status === 'Turned Down'));
  // A delivery row whose ID has no ledger row stays its own record.
  assert.deepEqual(lead(data, 'PLGLASYN99').record_basis, ['delivery_log']);
});

test('two ledger rows sharing an ID are held as ambiguous, not merged', (t) => {
  const { data } = project(t);
  const both = data.leads.filter((l) => (l.ids.lead || []).includes('PLGSYNTH06'));
  assert.equal(both.length, 2);
  assert.ok(both.every((l) => l.dedupe.state === 'ambiguous'));
  assert.ok(camp(data, 'mva').next_steps.data_issues.some((i) => i.kind === 'ambiguous_match'));
});

test('signed is never inferred from Converted, retainer columns or a platform "signed" marker', (t) => {
  const { data } = project(t);
  const la = lead(data, 'INT-000000000100');
  assert.equal(la.firm.current_status, 'Converted');
  assert.equal(la.firm.retainer.signed, 'unverified');
  assert.equal(la.next_action.kind, 'signed_proof');
  const fb = lead(data, 'FBL1000000000000001');
  assert.equal(fb.firm.retainer.platform_signed_marker, true);
  assert.equal(fb.firm.retainer.signed, 'unverified');
  assert.equal(fb.attribution.state, 'platform_record');
  assert.equal(fb.attribution.ad_id, '9001');
  for (const c of data.campaigns) assert.equal(c.leads_summary.signed_verified, null);
});

test('spend: missing days stay missing, sheet totals are cross-checked, a second source is never added', (t) => {
  const { data } = project(t);
  const mva = camp(data, 'mva');
  assert.equal(mva.spend.total_usd, 42.5);
  assert.deepEqual(mva.spend.days_missing, ['2026-07-03']);
  assert.equal(mva.spend.state, 'known_partial');
  assert.equal(mva.spend.sheet_total_matches, true);
  assert.equal(mva.spend_corroboration.total_usd, 35);
  assert.ok(mva.coverage_gaps.some((g) => g.kind === 'spend_days_missing'));
  const la = camp(data, 'la_county');
  assert.equal(la.spend.total_usd, 50);
  assert.equal(la.spend.sheet_total_matches, false);
  assert.ok(la.coverage_gaps.some((g) => g.kind === 'sheet_total_mismatch'));
  assert.equal(camp(data, 'deadleads').spend.state, 'unknown');
  assert.equal(mva.planned_budget.total_usd, 5000);
  assert.equal(la.planned_budget.state, 'unknown');
});

test('test/spam rows are excluded from counts; calls are not attached to leads by phone', (t) => {
  const { data } = project(t);
  const mva = camp(data, 'mva');
  assert.equal(lead(data, 'PLGSYNTH05').excluded, 'test');
  assert.equal(mva.leads_summary.excluded, 1);
  assert.equal(mva.calls.records, 1);
  assert.equal(mva.calls.linked_to_leads, 0);
  assert.equal(lead(data, 'FBL1000000000000009').next_action.kind, 'delivery');
});

const LITIFY = [(dir) => ['--litify', path.join(dir, 'litify.csv'), '--litify-as-of', '2026-10-04T14:00:19Z', '--provider-spend', path.join(dir, 'spend.json')]];

test('Litify update: the newest firm export wins and earlier statuses stay as history', (t) => {
  const { r, data, raw } = project(t, null, LITIFY);
  assert.equal(r.status, 0, r.stderr);
  const l = lead(data, 'INT-000000000001');
  assert.equal(l.firm.current_status, 'Turned Down');
  assert.equal(l.firm.turn_down_reason, 'Client unresponsive');
  assert.ok(l.firm.history.some((h) => h.status === 'Chasing'));
  assert.equal(l.source_records.length, 5);
  assert.ok(data.sources.some((s) => s.source_id === 'litify:export 2026-10-04'));
  assert.ok(!raw.includes('SYNTHETIC') && !raw.includes('555-01'));
});

test('since April: platform spend by lane, month timeline, the bulk batch and tests are listed', (t) => {
  const { data } = project(t, null, LITIFY);
  const all = camp(data, 'all');
  assert.equal(all.default, false);
  assert.equal(all.scope, 'all');
  assert.equal(all.platform_spend.total_usd, 355.5, 'March row outside the window is dropped');
  const lanes = Object.fromEntries(all.platform_spend.campaigns.map((r) => [r.campaign, r.lane]));
  assert.deepEqual(lanes, { 'GLP1-Vision': 'tort_tests', 'LA County Sex Abuse': 'la_county', 'PLG | AZ MVA-PI | Retargeting': 'mva', 'VS — Viatical': 'not_phillips' });
  assert.deepEqual(all.timeline.map((m) => [m.month, m.spend_total_usd]).slice(0, 2), [['2026-04', 200], ['2026-05', 105]]);
  assert.equal(all.timeline.find((m) => m.month === '2026-04').leads, 0);
  const batch = all.batches.find((b) => b.date === '2026-05-21');
  assert.equal(batch.intakes, 3);
  assert.deepEqual(batch.firm_reasons, { 'Bad Lead Gen': 3 });
  assert.match(batch.origin_note, /no lead is tied to a specific campaign/);
  assert.ok(all.tests.some((x) => x.kind === 'test'));
  assert.ok(all.tests.some((x) => x.kind === 'spam' && (x.ids.intake || []).includes('INT-000000000400')), 'Litify Spam case type is excluded');
  assert.equal(camp(data, 'mva').platform_spend.total_usd, 50.5);
  assert.equal(camp(data, 'la_county').platform_spend.total_usd, 100);
  assert.ok(all.coverage_gaps.some((g) => /not proof of zero/.test(g.detail)));
});
