import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadPackage, checkAdsAgainstPages, adUrl, createOrder, draftInvoice, verifyPayment, createPaymentAuthority, createBuildQueue, memoryStore, readiness, checkTemplates, loadTemplates, BUILD_STEPS } from '../abuse/machine.mjs';
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

const fixedNow = Date.parse('2026-10-21T20:06:00Z');
const settlement = (o, inv, over = {}) => ({ ...record(inv), status: 'settled', tenant: o.tenant, firm_id: o.firm_id, campaign_id: o.campaign_id, order_id: o.order_id, ...over });
const authorityFor = (o, inv, over = {}, options = {}) => createPaymentAuthority({ now: () => fixedNow, readSettlement: async () => settlement(o, inv, over), ...options });

test('client payment fields and fixture receipts alone never establish authority', async () => {
  const o = order(), inv = draftInvoice(o);
  assert.equal(verifyPayment(inv, record(inv)).verified, false);
  assert.equal((await createPaymentAuthority().verify(o, inv, 'FIXTURE-0001')).verified, false);
  await assert.rejects(createBuildQueue(memoryStore()).enqueue(o, inv, { verified: true }), /payment_not_verified/);
});

test('trusted reader must return settled, current, exact scoped evidence', async () => {
  const o = order(), inv = draftInvoice(o);
  for (const over of [{ status: 'refunded' }, { source: 'client_said_paid' }, { amount_cents: 250000 }, { currency: 'CAD' }, { invoice_id: 'inv-other' }, { tenant: 'other' }, { firm_id: 'other' }, { campaign_id: 'other' }, { order_id: 'other' }, { reference: 'OTHER-0001' }, { verified_by: '' }, { verified_at: '2026-10-21T20:07:00Z' }, { verified_at: '2026-10-21T19:00:00Z' }, { received_at: '2026-10-21T20:06:00Z' }, { fixture: false }]) {
    const a = authorityFor(o, inv, over);
    assert.equal((await a.verify(o, inv, 'FIXTURE-0001')).verified, false, JSON.stringify(over));
  }
  const a = authorityFor(o, inv);
  const proof = await a.verify(o, inv, 'FIXTURE-0001');
  assert.equal(proof.fixture, true);
  assert.match(proof.note, /not a real payment/);
  await assert.rejects(createBuildQueue(memoryStore(), a).enqueue(o, inv, { ...proof }), /payment_not_verified/);
  await assert.rejects(createBuildQueue(memoryStore(), authorityFor(o, inv)).enqueue(o, inv, proof), /payment_not_verified/);
});

test('queue binds tenant, campaign, specification, invoice and immutable order', async () => {
  const o = order(), inv = draftInvoice(o), a = authorityFor(o, inv), store = memoryStore(), q = createBuildQueue(store, a);
  const proof = await a.verify(o, inv, 'FIXTURE-0001');
  for (const change of [{ tenant: 'another' }, { campaign_id: 'another' }, { spec_revision: 'another' }, { order_id: 'ord-fictional-0002' }]) {
    const other = { ...o, ...change };
    await assert.rejects(q.enqueue(other, draftInvoice(other), proof), /scope/);
    assert.equal((await q.status(other)).jobs.every(j => j.state === 'not_queued'), true);
  }
  await assert.rejects(q.enqueue(o, { ...inv, total_cents: 1 }, proof), /invoice_order_mismatch/);
  assert.throws(() => { o.offer.media_budget_cents = 1; }, TypeError);
  assert.throws(() => { inv.lines[0].amount_cents = 1; }, TypeError);
  const retries = await Promise.all(Array.from({ length: 12 }, () => q.enqueue(o, inv, proof)));
  assert.equal(retries.reduce((n, r) => n + r.created.length, 0), BUILD_STEPS.length);
  await assert.rejects(q.complete(o, 'pages', ''), /evidence_required/);
  const race = await Promise.allSettled([q.complete(o, 'pages', 'local:one'), q.complete(o, 'pages', 'local:two')]);
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(race.find(r => r.status === 'rejected').reason.message, /conflict/);
  const winner = race.find(r => r.status === 'fulfilled').value;
  assert.equal((await q.complete(o, 'pages', winner.evidence_ref)).duplicate, true);
  for (const step of BUILD_STEPS.filter(s => s !== 'pages')) await q.complete(o, step, `local:${step}`);
  const s = await q.status(o);
  assert.deepEqual([s.built, s.activation, s.jobs.every(j => j.fixture === true)], [true, false, true]);
  s.jobs[0].evidence_ref = 'local:tamper';
  assert.equal((await q.status(o)).jobs[0].evidence_ref, winner.evidence_ref);
});

test('fixture jobs and connected jobs never share a queue namespace or payment capability', async () => {
  const o = order(), inv = draftInvoice(o), store = memoryStore();
  const fixtureAuthority = authorityFor(o, inv);
  const fixtureQueue = createBuildQueue(store, fixtureAuthority);
  const fixtureProof = await fixtureAuthority.verify(o, inv, 'FIXTURE-0001');
  await fixtureQueue.enqueue(o, inv, fixtureProof);
  // Injected mock only: this does not verify a real settlement or call a connector.
  const mockConnectedAuthority = authorityFor(o, inv, { fixture: false }, { mode: 'connected' });
  const connectedQueue = createBuildQueue(store, mockConnectedAuthority, { mode: 'connected' });
  const connectedProof = await mockConnectedAuthority.verify(o, inv, 'FIXTURE-0001');
  assert.equal((await connectedQueue.status(o)).jobs.every(j => j.state === 'not_queued'), true);
  await assert.rejects(createBuildQueue(store, fixtureAuthority, { mode: 'connected' }).enqueue(o, inv, fixtureProof), /queue_payment_mode_mismatch/);
  await assert.rejects(createBuildQueue(store, mockConnectedAuthority).enqueue(o, inv, connectedProof), /queue_payment_mode_mismatch/);
  assert.equal((await connectedQueue.enqueue(o, inv, connectedProof)).created.length, BUILD_STEPS.length);
  assert.equal((await fixtureQueue.status(o)).jobs.every(j => j.fixture === true), true);
});

test('expired payment capabilities cannot enqueue and partial queue retry resumes safely', async () => {
  let t = fixedNow;
  const o = order(), inv = draftInvoice(o), a = authorityFor(o, inv, {}, { now: () => t });
  const proof = await a.verify(o, inv, 'FIXTURE-0001');
  const backing = memoryStore(); let count = 0;
  const failing = { ...backing, async setNx(k, v) { if (++count === 3) throw new Error('fixture_store_unavailable'); return backing.setNx(k, v); } };
  const q = createBuildQueue(failing, a);
  await assert.rejects(q.enqueue(o, inv, proof), /fixture_store_unavailable/);
  assert.equal((await q.enqueue(o, inv, proof)).created.length, BUILD_STEPS.length - 2);
  t += 300000;
  await assert.rejects(q.enqueue(o, inv, proof), /payment_not_verified/);
});

test('readiness uses the existing 14 launch checks; every one is blocked with an exact reason', () => {
  const r = readiness();
  assert.equal(Object.keys(LAUNCH_CHECKS).length, 14);
  assert.deepEqual([r.total, r.verified, r.launch_ready], [14, 0, false]);
  assert.ok(r.checks.every((c) => c.status === 'blocked' && c.blocker));
  assert.equal(readiness({ verifiedChecks: Object.fromEntries(Object.keys(LAUNCH_CHECKS).map((k) => [k, 'yes'])) }).verified, 0, 'caller values do not count');
});

test('caller booleans cannot authorize launch', () => {
  assert.equal(readiness({ verifiedChecks: Object.fromEntries(Object.keys(LAUNCH_CHECKS).map(k => [k, true])) }).launch_ready, false);
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
