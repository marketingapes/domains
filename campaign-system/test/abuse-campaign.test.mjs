import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadPackage, checkAdsAgainstPages, adUrl, createOrder, draftInvoice, verifyPayment, createBuildQueue, memoryStore, readiness, checkTemplates, loadTemplates, BUILD_STEPS } from '../abuse/machine.mjs';
import { LAUNCH_CHECKS } from '../mass-tort.mjs';

const pkg = loadPackage();
const order = () => createOrder({ orderId: 'ord-fictional-0001', firmId: 'phillips-law-group', contactRef: 'crm:fictional-contact-1' });
const record = (inv, over = {}) => ({ source: 'processor_settlement', invoice_id: inv.invoice_id, amount_cents: inv.total_cents, currency: 'USD', reference: 'FIXTURE-0001', received_at: '2026-10-21T20:00:00Z', verified_by: 'fictional-ops', verified_at: '2026-10-21T20:05:00Z', fixture: true, ...over });

test('every ad maps to exactly one of form / quiz / voice, carries campaign attribution and passes copy rules', () => {
  const r = checkAdsAgainstPages();
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.links.map((l) => [l.path, new URL(l.url).pathname, new URL(l.url).searchParams.get('utm_content')]), [
    ['form', '/sex-abuse-la-county/', 'la-review-form'], ['quiz', '/sex-abuse-la-county/quiz/', 'la-four-questions'], ['voice', '/sex-abuse-la-county/talk-to-sofia/', 'la-private-callback']]);
});

test('ad checks catch drift: forbidden claims, missing disclosure, wrong page, extra channel', () => {
  const bad = structuredClone(pkg);
  bad.ads[0].primary_text += ' You qualify for compensation.';
  bad.ads[1].description = 'Sofia is AI.';
  bad.ads[2].path = 'form';
  bad.offer.channels.tiktok = 'on';
  const r = checkAdsAgainstPages(bad);
  for (const want of ['forbidden claim "qualif"', 'forbidden claim "compensation"', 'missing disclosure', 'each of form, quiz and voice', 'only Facebook may be on']) assert.ok(r.problems.some((p) => p.includes(want)), want);
  assert.equal(adUrl(pkg, pkg.ads[2]).includes('callback=1'), true);
});

test('order → draft invoice: $2,500 fee + $5,000 media, never sent; no contact details in the order', () => {
  const inv = draftInvoice(order());
  assert.deepEqual([inv.total_cents, inv.status, inv.sent, inv.provider_invoice_id], [750000, 'draft_not_sent', false, null]);
  assert.throws(() => createOrder({ orderId: 'ord-fictional-0002', firmId: 'phillips-law-group', contactRef: 'someone@example.com' }), /opaque/);
  assert.throws(() => createOrder({ orderId: 'x', firmId: 'phillips-law-group', contactRef: 'crm:1' }), /order_id_invalid/);
  assert.throws(() => createOrder({ orderId: 'ord-fictional-0003', firmId: 'another-firm', contactRef: 'crm:1' }), /firm_mismatch/);
});

test('payment is verified only by an exact authoritative record', () => {
  const inv = draftInvoice(order());
  assert.equal(verifyPayment(inv, record(inv)).verified, true);
  for (const [over, reason] of [[{ source: 'client_said_paid' }, 'source_not_authoritative'], [{ amount_cents: 250000 }, 'amount_mismatch'], [{ currency: 'CAD' }, 'amount_mismatch'], [{ invoice_id: 'inv-other' }, 'invoice_mismatch'], [{ reference: '' }, 'reference_missing'], [{ verified_by: '' }, 'verification_incomplete'], [{ received_at: 'yesterday' }, 'verification_incomplete']]) {
    assert.deepEqual(verifyPayment(inv, record(inv, over)), { verified: false, reason }, reason);
  }
  assert.equal(verifyPayment(inv, null).reason, 'no_payment_record');
});

test('build queue: blocked without verified payment; idempotent; completion needs evidence; activation stays false', async () => {
  const o = order(); const inv = draftInvoice(o); const q = createBuildQueue(memoryStore());
  await assert.rejects(q.enqueue(o, inv, { verified: false }), /payment_not_verified/);
  const p = verifyPayment(inv, record(inv));
  assert.deepEqual((await q.enqueue(o, inv, p)).created, BUILD_STEPS);
  assert.deepEqual((await q.enqueue(o, inv, p)).created, [], 'a retry creates nothing');
  await assert.rejects(q.complete(o, 'pages', ''), /evidence_required/);
  for (const step of BUILD_STEPS) await q.complete(o, step, `local:${step}`);
  assert.equal((await q.complete(o, 'pages', 'again')).duplicate, true);
  const s = await q.status(o);
  assert.deepEqual([s.built, s.activation, s.jobs.every((j) => j.fixture === true)], [true, false, true]);
});

test('readiness uses the existing 14 launch checks; every one is blocked with an exact reason', () => {
  const r = readiness();
  assert.equal(Object.keys(LAUNCH_CHECKS).length, 14);
  assert.deepEqual([r.total, r.verified, r.launch_ready], [14, 0, false]);
  assert.ok(r.checks.every((c) => c.status === 'blocked' && c.blocker));
  assert.equal(readiness({ verifiedChecks: Object.fromEntries(Object.keys(LAUNCH_CHECKS).map((k) => [k, 'yes'])) }).verified, 0, 'only literal true counts');
});

test('message templates: unsendable drafts with consent, STOP, suppression, dedupe, retry and an owner; no sensitive words', () => {
  assert.deepEqual(checkTemplates().problems, []);
  const t = loadTemplates(); t.templates[0].body = 'About your abuse case. Reply STOP to opt out.';
  assert.ok(checkTemplates(t).problems.some((p) => p.includes('"abuse"')));
});

test('creative manifest: every angle has images and a draft video from committed lane photos; finals listed as missing', () => {
  const dir = new URL('../abuse/creative/out-2026-10-21/', import.meta.url);
  const m = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  assert.equal(m.blocked_external_requests, 0);
  for (const ad of pkg.ads) {
    const mine = m.assets.filter((a) => a.angle_id === ad.angle_id);
    assert.deepEqual(mine.map((a) => a.kind).sort(), ['image', 'image', 'image', 'video_draft']);
    for (const a of mine) { assert.ok(existsSync(new URL(a.file, dir)), a.file); assert.equal(a.source_image, ad.image); }
  }
  assert.ok(m.missing_final_deliverables.length > 0);
});

test('Make correction draft invents no form IDs and keeps every do-not', () => {
  const d = JSON.parse(readFileSync(new URL('../abuse/make/6311519-la-allowlist.draft.json', import.meta.url), 'utf8'));
  assert.match(d.status, /not applied/);
  assert.match(d.proposed_change.LA_ABUSE_FORM_IDS, /^PENDING/);
  assert.equal(/\d{15,}/.test(JSON.stringify(d.proposed_change)), false, 'no form id literal');
});
