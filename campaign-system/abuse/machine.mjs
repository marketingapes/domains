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
const freeze = (v) => { if (v && typeof v === 'object') { for (const x of Object.values(v)) freeze(x); Object.freeze(v); } return v; };
const canonical = (v) => JSON.stringify(v, (_, x) => x && !Array.isArray(x) && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
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
  // Any number of questions named in ad copy or the quiz page must equal the quiz steps in the runtime.
  const steps = (lane.slice(lane.indexOf('var STEPS = ['), lane.indexOf('];', lane.indexOf('var STEPS = ['))).match(/\{ id: '/g) || []).length;
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const counted = (text) => [...String(text).toLowerCase().matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:short,?\s+)?(?:private\s+)?questions\b/g)].map((m) => WORDS[m[1]] ?? Number(m[1]));
  const quizHtml = existsSync(new URL('btl/sex-abuse-la-county/quiz/index.html', ROOT)) ? readFileSync(new URL('btl/sex-abuse-la-county/quiz/index.html', ROOT), 'utf8') : '';
  for (const [where, text] of [['quiz page', quizHtml], ...pkg.ads.map((ad) => [ad.angle_id, `${ad.primary_text} ${ad.headline} ${ad.description}`])]) {
    for (const n of counted(text)) if (n !== steps) problems.push(`${where}: says ${n} questions but the quiz has ${steps}`);
  }
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
  return freeze({ tenant: pkg.tenant, spec_revision: sha(canonical(pkg)), schema: 'btl.order/v1', order_id: orderId, firm_id: firmId, campaign_id: pkg.campaign_id, contact_ref: contactRef,
    offer: { service_fee_cents: pkg.offer.service_fee_cents, media_budget_cents: pkg.offer.media_budget_cents, currency: pkg.offer.currency },
    channels: structuredClone(pkg.offer.channels), outcome_promise: 'none', status: 'onboarding', activation: false });
}

/** A draft only: never sent, never created at a payment provider. */
export function draftInvoice(order) {
  const lines = [
    { code: 'campaign_service_fee', description: 'Campaign build and management (no outcome promised)', amount_cents: order.offer.service_fee_cents },
    { code: 'media_budget', description: 'Facebook media budget, spent only after separate activation approval', amount_cents: order.offer.media_budget_cents },
  ];
  const total = lines.reduce((n, l) => n + l.amount_cents, 0);
  return freeze({ tenant: order.tenant, campaign_id: order.campaign_id, spec_revision: order.spec_revision, schema: 'btl.invoice-draft/v1', invoice_id: `inv-${sha(canonical(order)).slice(0, 24)}`, order_id: order.order_id, currency: order.offer.currency,
    lines, total_cents: total, status: 'draft_not_sent', sent: false, provider_invoice_id: null });
}

/** Record fields alone never establish authority. This legacy helper fails closed. */
export function verifyPayment() {
  return { verified: false, reason: 'trusted_payment_verifier_required' };
}

const scope = (order, invoice) => {
  if (!order?.tenant || !order?.campaign_id || !order?.spec_revision || !ORDER_ID.test(order.order_id || '')) throw new Error('order_scope_missing');
  if (canonical(invoice) !== canonical(draftInvoice(order))) throw new Error('invoice_order_mismatch');
  return sha(canonical({ order, invoice }));
};

/**
 * Construct ONLY in the trusted server composition root, never with request-supplied callbacks.
 * readSettlement must independently fetch authenticated settlement evidence, not echo client JSON.
 * No connector is installed here. Default is blocked. Fixture mode cannot issue real-payment proof.
 * Capabilities are process-local: persisted jobs must be reverified after restart, not deserialized.
 */
export function createPaymentAuthority({ readSettlement, mode = 'fixture', now = () => Date.now(), maxAgeMs = 300000 } = {}) {
  if (!['fixture', 'connected'].includes(mode) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new Error('authority_config_invalid');
  const issued = new WeakMap();
  return Object.freeze({
    async verify(order, invoice, reference) {
      const binding = scope(order, invoice);
      if (typeof readSettlement !== 'function') return { verified: false, reason: 'trusted_payment_verifier_required' };
      const r = await readSettlement({ tenant: order.tenant, firm_id: order.firm_id, campaign_id: order.campaign_id, order_id: order.order_id, invoice_id: invoice.invoice_id, reference });
      const t = now();
      if (!r || r.status !== 'settled' || !['processor_settlement', 'bank_statement'].includes(r.source)) return { verified: false, reason: 'settlement_unverified' };
      if (r.tenant !== order.tenant || r.firm_id !== order.firm_id || r.campaign_id !== order.campaign_id || r.order_id !== order.order_id || r.invoice_id !== invoice.invoice_id || r.reference !== reference || !/^[A-Za-z0-9_-]{6,80}$/.test(reference || '')) return { verified: false, reason: 'settlement_scope_mismatch' };
      if (r.amount_cents !== invoice.total_cents || r.currency !== invoice.currency) return { verified: false, reason: 'amount_mismatch' };
      const received = Date.parse(r.received_at), checked = Date.parse(r.verified_at);
      if (!Number.isFinite(received) || !Number.isFinite(checked) || received > checked || checked > t || t - checked > maxAgeMs || !r.verified_by) return { verified: false, reason: 'verification_stale_or_invalid' };
      if (typeof r.fixture !== 'boolean' || (mode === 'fixture') !== r.fixture) return { verified: false, reason: 'fixture_mode_mismatch' };
      const proof = freeze({ verified: true, fixture: mode === 'fixture', note: mode === 'fixture' ? 'FIXTURE — not a real payment' : 'Verified by injected trusted settlement reader; activation remains off', scope: binding });
      issued.set(proof, { binding, reference, expires: Math.min(checked + maxAgeMs, t + maxAgeMs) });
      return proof;
    },
    async assert(order, invoice, proof) {
      const p = proof && issued.get(proof);
      if (!p || p.expires <= now() || p.binding !== scope(order, invoice)) throw new Error('payment_not_verified_for_scope');
      // A newly received refund/dispute must revoke a still-unexpired capability.
      const r = await readSettlement({ tenant:order.tenant, firm_id:order.firm_id, campaign_id:order.campaign_id, order_id:order.order_id, invoice_id:invoice.invoice_id, reference:p.reference });
      const received = Date.parse(r?.received_at), checked = Date.parse(r?.verified_at);
      if (!r || r.status !== 'settled' || !['processor_settlement','bank_statement'].includes(r.source) || !r.verified_by || !Number.isFinite(received) || !Number.isFinite(checked) || received > checked || checked > now() || now() - checked > maxAgeMs || r.tenant !== order.tenant || r.firm_id !== order.firm_id || r.campaign_id !== order.campaign_id || r.order_id !== order.order_id || r.invoice_id !== invoice.invoice_id || r.reference !== p.reference || r.amount_cents !== invoice.total_cents || r.currency !== invoice.currency || r.fixture !== proof.fixture) throw new Error('payment_reverification_failed');
      return proof;
    },
  });
}

// ---------------------------------------------------------------- idempotent build queue
export const BUILD_STEPS = ['pages', 'ads', 'sofia_context', 'templates', 'perspective', 'readiness'];
/** Atomic setNx is required. Completion receipts are write-once, never read/overwrite races. */
export function createBuildQueue(store, authority = createPaymentAuthority(), { mode = 'fixture' } = {}) {
  if (!['fixture', 'connected'].includes(mode)) throw new Error('queue_mode_invalid');
  const keyFor = (order, invoice, step) => `build:v2:${mode}:${scope(order, invoice)}:${step}`;
  return {
    async enqueue(order, invoice, payment) {
      await authority.assert(order, invoice, payment);
      if (payment.fixture !== (mode === 'fixture')) throw new Error('queue_payment_mode_mismatch');
      const created = [];
      for (const step of BUILD_STEPS) {
        const key = keyFor(order, invoice, step);
        if (await store.setNx(key, { tenant: order.tenant, campaign_id: order.campaign_id, spec_revision: order.spec_revision, order_id: order.order_id, invoice_id: invoice.invoice_id, step, state: 'queued', fixture: payment.fixture === true })) created.push(step);
      }
      return { order_id: order.order_id, created, activation: false };
    },
    async complete(order, step, evidenceRef, invoice = draftInvoice(order)) {
      if (!BUILD_STEPS.includes(step)) throw new Error('step_unknown');
      if (typeof evidenceRef !== 'string' || !/^(local|receipt):[a-zA-Z0-9_./:-]{1,200}$/.test(evidenceRef)) throw new Error('evidence_required');
      const key = keyFor(order, invoice, step);
      const job = await store.get(key);
      if (!job) throw new Error('job_missing');
      const done = { ...job, state: 'done', evidence_ref: evidenceRef };
      if (await store.setNx(`${key}:completion`, done)) return done;
      const existing = await store.get(`${key}:completion`);
      if (!existing || existing.evidence_ref !== evidenceRef) throw new Error('completion_evidence_conflict');
      return { ...existing, duplicate: true };
    },
    async status(order, invoice = draftInvoice(order)) {
      const jobs = [];
      for (const step of BUILD_STEPS) {
        const key = keyFor(order, invoice, step);
        jobs.push((await store.get(`${key}:completion`)) || (await store.get(key)) || { step, state: 'not_queued' });
      }
      return { order_id: order.order_id, jobs, built: jobs.every(j => j.state === 'done'), activation: false };
    },
  };
}
export const memoryStore = () => { const m = new Map(); return { async get(k) { return structuredClone(m.get(k) ?? null); }, async set(k, v) { m.set(k, structuredClone(v)); }, async setNx(k, v) { if (m.has(k)) return false; m.set(k, structuredClone(v)); return true; } }; };

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
export function readiness() {
  // No authoritative launch evidence reader is configured in this local package.
  // Caller booleans, fixture receipts and finished build jobs cannot authorize activation.
  const checks = Object.keys(LAUNCH_CHECKS).map(key => ({ key, requirement: LAUNCH_CHECKS[key], status: 'blocked', blocker: KNOWN_BLOCKERS[key] }));
  return { total: checks.length, verified: 0, launch_ready: false, checks };
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
