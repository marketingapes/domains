// BTL California abuse campaign machine — local, operator-only, no provider calls.
//
//   order → draft invoice → VERIFIED payment (authoritative record only) → idempotent build queue
//   → ads mapped to the exact page/path → readiness against the existing 14 launch checks.
//
// Nothing here sends an invoice, charges a card, creates an ad, spends media, places a call, sends a
// text/email or activates anything. `activation` is always false; it needs its own approval.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LAUNCH_CHECKS } from '../mass-tort.mjs';

const ROOT = new URL('../../', import.meta.url);
const sha = (v) => createHash('sha256').update(String(v)).digest('hex');
export const loadPackage = () => JSON.parse(readFileSync(new URL('./campaign.json', import.meta.url), 'utf8'));

// ---------------------------------------------------------------- ads ↔ pages
export function adUrl(pkg, ad) {
  const u = new URL(pkg.pages[ad.path]);
  for (const [k, v] of Object.entries(pkg.attribution)) u.searchParams.set(k, v);
  u.searchParams.set('utm_content', ad.angle_id);
  return u.toString();
}

/** The committed page file for a public URL, under btl/. */
const pageFile = (url) => new URL(`btl${new URL(url).pathname}${new URL(url).pathname.endsWith('/') ? 'index.html' : ''}`, ROOT);

/**
 * Every ad must point at one of the three campaign pages, each path used once; the page must be the
 * campaign's own (same campaign id, question bank and consent version in its runtime); copy must carry
 * the disclosures and none of the forbidden claims; the image must be a committed local asset.
 */
export function checkAdsAgainstPages(pkg = loadPackage()) {
  const problems = [];
  const lane = readFileSync(new URL('btl/sex-abuse-la-county/lane.js', ROOT), 'utf8');
  const laneHas = (needle, what) => { if (!lane.includes(needle)) problems.push(`lane runtime does not carry ${what}`); };
  laneHas(`campaign_id: '${pkg.campaign_id}'`, 'the campaign id');
  laneHas(`question_bank_version: '${pkg.question_bank_version}'`, 'the question bank version');
  laneHas(`version: '${pkg.consent_version}'`, 'the consent version');
  const paths = pkg.ads.map((a) => a.path).sort();
  if (JSON.stringify(paths) !== JSON.stringify(['form', 'quiz', 'voice'])) problems.push('each of form, quiz and voice needs exactly one ad');
  for (const ad of pkg.ads) {
    const url = adUrl(pkg, ad);
    const file = pageFile(url);
    if (!existsSync(file)) { problems.push(`${ad.angle_id}: page missing for ${url}`); continue; }
    const html = readFileSync(file, 'utf8');
    if (!html.includes(`campaign_id:"${pkg.campaign_id}"`)) problems.push(`${ad.angle_id}: page is not bound to this campaign`);
    if (!html.includes('noindex')) problems.push(`${ad.angle_id}: page is indexable`);
    if (!html.includes('measurement:"off"')) problems.push(`${ad.angle_id}: page measurement is not off`);
    const copy = `${ad.primary_text} ${ad.headline} ${ad.description}`.toLowerCase();
    // The required disclosures are removed first so "No outcome guaranteed" is not read as a promise.
    const claims = pkg.required_disclosures.reduce((text, d) => text.split(d.toLowerCase()).join(' '), copy);
    for (const bad of pkg.forbidden_claims) if (new RegExp(`\\b${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(claims)) problems.push(`${ad.angle_id}: forbidden claim "${bad}"`);
    for (const need of pkg.required_disclosures) if (!copy.includes(need.toLowerCase())) problems.push(`${ad.angle_id}: missing disclosure "${need}"`);
    if (!existsSync(new URL(`btl${ad.image}`, ROOT))) problems.push(`${ad.angle_id}: image not in repo`);
    if (new URL(url).searchParams.get('utm_campaign') !== pkg.campaign_id) problems.push(`${ad.angle_id}: attribution does not name the campaign`);
  }
  const on = Object.entries(pkg.offer.channels).filter(([, v]) => v !== 'off').map(([k]) => k);
  if (on.join() !== 'facebook') problems.push('only Facebook may be on');
  return { ok: problems.length === 0, problems, links: pkg.ads.map((a) => ({ angle_id: a.angle_id, path: a.path, url: adUrl(pkg, a) })) };
}

// ---------------------------------------------------------------- order, invoice, payment
const ORDER_ID = /^ord-[a-z0-9-]{6,60}$/;
export function createOrder({ orderId, firmId, pkg = loadPackage(), contactRef }) {
  if (!ORDER_ID.test(orderId || '')) throw new Error('order_id_invalid');
  if (firmId !== pkg.firm.id) throw new Error('firm_mismatch');
  if (!contactRef || /@|\d{3}\D?\d{3}\D?\d{4}/.test(contactRef)) throw new Error('contact_ref_must_be_an_opaque_reference');
  return Object.freeze({ schema: 'btl.order/v1', order_id: orderId, firm_id: firmId, campaign_id: pkg.campaign_id, contact_ref: contactRef,
    offer: { service_fee_cents: pkg.offer.service_fee_cents, media_budget_cents: pkg.offer.media_budget_cents, currency: pkg.offer.currency },
    channels: pkg.offer.channels, outcome_promise: 'none', status: 'onboarding', activation: false });
}

/** A draft only: never sent, never created at a payment provider. */
export function draftInvoice(order) {
  const lines = [
    { code: 'campaign_service_fee', description: 'Campaign build and management (no outcome promised)', amount_cents: order.offer.service_fee_cents },
    { code: 'media_budget', description: 'Facebook media budget, spent only after separate activation approval', amount_cents: order.offer.media_budget_cents },
  ];
  const total = lines.reduce((n, l) => n + l.amount_cents, 0);
  return Object.freeze({ schema: 'btl.invoice-draft/v1', invoice_id: `inv-${sha(order.order_id).slice(0, 16)}`, order_id: order.order_id, currency: order.offer.currency,
    lines, total_cents: total, status: 'draft_not_sent', sent: false, provider_invoice_id: null });
}

/**
 * Payment counts only when an authoritative record matches the invoice exactly. A client's "I paid",
 * a screenshot or a partial amount is never verification.
 */
export function verifyPayment(invoice, record) {
  const refuse = (reason) => ({ verified: false, reason });
  if (!record || typeof record !== 'object') return refuse('no_payment_record');
  if (!['processor_settlement', 'bank_statement'].includes(record.source)) return refuse('source_not_authoritative');
  if (record.invoice_id !== invoice.invoice_id) return refuse('invoice_mismatch');
  if (record.currency !== invoice.currency || record.amount_cents !== invoice.total_cents) return refuse('amount_mismatch');
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(record.reference || '')) return refuse('reference_missing');
  if (!record.verified_by || !Number.isFinite(Date.parse(record.received_at)) || !Number.isFinite(Date.parse(record.verified_at))) return refuse('verification_incomplete');
  if (record.fixture === true) return { verified: true, reason: null, fixture: true, note: 'FIXTURE — not a real payment' };
  return { verified: true, reason: null, fixture: false };
}

// ---------------------------------------------------------------- idempotent build queue
export const BUILD_STEPS = ['pages', 'ads', 'sofia_context', 'templates', 'perspective', 'readiness'];
/** store: get/setNx (memory or the service's store). One job per (order, step); a retry never duplicates. */
export function createBuildQueue(store) {
  return {
    async enqueue(order, invoice, payment) {
      if (!payment || payment.verified !== true) throw new Error('payment_not_verified');
      const created = [];
      for (const step of BUILD_STEPS) {
        const key = `build:${order.order_id}:${step}`;
        if (await store.setNx(key, { order_id: order.order_id, invoice_id: invoice.invoice_id, step, state: 'queued', fixture: payment.fixture === true })) created.push(step);
      }
      return { order_id: order.order_id, created, activation: false };
    },
    async complete(order, step, evidenceRef) {
      if (!BUILD_STEPS.includes(step)) throw new Error('step_unknown');
      const key = `build:${order.order_id}:${step}`;
      const job = await store.get(key);
      if (!job) throw new Error('job_missing');
      if (job.state === 'done') return { ...job, duplicate: true };
      if (!evidenceRef) throw new Error('evidence_required');
      const done = { ...job, state: 'done', evidence_ref: evidenceRef };
      await store.set(key, done);
      return done;
    },
    async status(order) {
      const jobs = [];
      for (const step of BUILD_STEPS) jobs.push((await store.get(`build:${order.order_id}:${step}`)) || { step, state: 'not_queued' });
      return { order_id: order.order_id, jobs, built: jobs.every((j) => j.state === 'done'), activation: false };
    },
  };
}
export const memoryStore = () => { const m = new Map(); return { async get(k) { return m.get(k) ?? null; }, async set(k, v) { m.set(k, v); }, async setNx(k, v) { if (m.has(k)) return false; m.set(k, v); return true; } }; };

// ---------------------------------------------------------------- readiness against the existing 14 launch checks
export const KNOWN_BLOCKERS = {
  firmCriteria: 'Attorney-approved rules for all three programs are pending (config holds none).',
  geography: 'LA County first; other CA juvenile detention and women’s prison geography approval pending.',
  copy: 'Page and ad copy are drafts pending firm and Muse review.',
  consent: 'Consent text btl-abuse-callback-consent-draft-2026-10-21.1 pending attorney approval.',
  bindings: 'Adapter not mounted live (default off); Make 6311519 correction is a local draft; voice number choice pending.',
  persistentReceipt: 'Save-before-ack proven only against local memory/loopback; no live receipt.',
  leadCallOutcome: 'No live call has been bound; call/context path proven only in tests.',
  scheduling: 'No calendar or callback scheduling is bound.',
  handoff: 'Complex-tort vs MVA destination and staffed hours unconfirmed; no transfer configured.',
  safeguards: 'Shared suppression proven in tests; live suppression sync not run for this lane.',
  actualReporting: 'Private Perspective adapter reads only adapter data; no live data yet.',
  publicReportPrivacy: 'No public report is enabled for this campaign.',
  budget: 'Media budget requires verified payment and separate approval.',
  activation: 'Not requested. Dispatch, measurement and provider actions are off.',
};
export function readiness({ verifiedChecks = {} } = {}) {
  const checks = Object.keys(LAUNCH_CHECKS).map((key) => ({ key, requirement: LAUNCH_CHECKS[key], status: verifiedChecks[key] === true ? 'verified' : 'blocked', blocker: verifiedChecks[key] === true ? null : KNOWN_BLOCKERS[key] }));
  return { total: checks.length, verified: checks.filter((c) => c.status === 'verified').length, launch_ready: checks.every((c) => c.status === 'verified'), checks };
}

// ---------------------------------------------------------------- message templates
export const loadTemplates = () => JSON.parse(readFileSync(new URL('./templates/messages.json', import.meta.url), 'utf8'));
export function checkTemplates(t = loadTemplates()) {
  const problems = [];
  if (t.send !== false || t.status !== 'draft_not_sendable') problems.push('templates must stay unsendable drafts');
  for (const key of ['suppression', 'dedupe', 'retry', 'quiet_hours', 'owner_on_failure']) if (!t.rules?.[key]) problems.push(`rule missing: ${key}`);
  for (const m of t.templates) {
    const text = `${m.subject || ''} ${m.body}`.toLowerCase();
    if (m.channel === 'sms' && !/reply stop/i.test(m.body) && m.template_id !== 'sms-opt-out-confirmation') problems.push(`${m.template_id}: no STOP instruction`);
    if (m.channel !== 'internal_email' && !m.contains_opt_out) problems.push(`${m.template_id}: no opt-out`);
    if (m.channel === 'sms' && !['sms', 'none_transactional_opt_out'].includes(m.requires_consent)) problems.push(`${m.template_id}: SMS without SMS consent`);
    for (const word of ['abuse', 'facility', 'juvenile', 'qualif', 'eligib', 'case', 'compensation', 'guarantee']) if (new RegExp(`\\b${word}`).test(text)) problems.push(`${m.template_id}: sensitive or outcome word "${word}"`);
  }
  return { ok: problems.length === 0, problems };
}
