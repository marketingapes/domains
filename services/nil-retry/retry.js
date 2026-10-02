#!/usr/bin/env node
/**
 * NIL/BTL — Sofia retry cadence (Render cron, every 15 min)
 *
 * The leak this closes: one dial per lead, then nothing. 9/4–9/5: 4 of 4 outbound = voicemail /
 * no-answer / failed, zero second attempts, zero transfers, zero Litify rows.
 *
 * Stateless by design: every run re-reads Vapi call history and derives attempts per number.
 * No database, no ledger dependency, idempotent (a run that finds nothing due does nothing).
 *
 * MATCHING (fixed 2026-10-02): calls are matched by OUTBOUND PHONE NUMBER, not assistantId.
 * Render places first dials with the assistant inline / via the Router assistant, so the old
 * assistantId-only check ignored every real call. We now treat any outboundPhoneCall placed
 * from one of OUR outbound numbers (NIL 602, BTL 202) as ours.
 *
 * Cadence (after the first dial):  attempt 2 = +15 min · attempt 3 = +2 h · attempt 4 = next day 10:00 local.
 * Window: 08:00–17:00 America/Phoenix (Kyle's calling window).  Max attempts default 4 (incl. the first dial).
 * Never retries: reached leads (transfer, real conversation, any inbound from the number), non-+1 numbers,
 * numbers in DO_NOT_CALL, test-tagged calls/numbers/assistants, or leads whose last outcome was a clean decline.
 * Never dials from the 213 demo lines.
 *
 * ENV (Render → nil-retry → Environment):
 *   VAPI_API_KEY            required (server key). Missing → FAILS RED (exit 1). Never green on missing key.
 *   VAPI_PHONE_NUMBER_ID    default 4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd  ((602) 693-1461)
 *   OUTBOUND_PHONE_NUMBER_IDS  comma list of OUR outbound Vapi phone-number IDs.
 *                             default: NIL (602) 4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd,
 *                                      BTL (202) 9118e295-67e9-49c3-99b2-f84730eba422
 *   ASSISTANT_EN            default 41ee29eb-1ea0-45b6-bd54-585e2fb91efa  (NIL — OUTBOUND — Sofia)
 *   ASSISTANT_ES            default ef5c499b-fca0-474e-8d68-e7e2f558ee85  (NIL Outbound ES)
 *   DRY_RUN                 default "true"  → logs would-call, dials nothing. Set "false" to arm.
 *   MAX_ATTEMPTS            default 4
 *   LOOKBACK_HOURS          default 72
 *   WINDOW_START / WINDOW_END   default 8 / 17 (local hours, America/Phoenix — Kyle's 8am–5pm window)
 *   DO_NOT_CALL             comma list of E.164 numbers to never dial (Kyle's cells, test numbers)
 *   MAX_CALLS_PER_RUN       default 5 (safety cap)
 */

const VAPI = 'https://api.vapi.ai';
const SERVICE = 'nil-retry';
const env = (k, d) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);

// Our outbound numbers — the ONLY numbers a retry may be placed from. Never the 213 demo lines,
// never test rig numbers.
const DEFAULT_OUTBOUND_NUMBERS = [
  '4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd', // +1 (602) 693-1461 — Sofia NIL
  '9118e295-67e9-49c3-99b2-f84730eba422', // +1 (202) 932-9700 — BTL Sofia / Phillips
];

// The 6 current Sofia outbound assistants (+ the Render Router, for placement continuity).
const SOFIA_ASSISTANTS = new Set([
  '41ee29eb-1ea0-45b6-bd54-585e2fb91efa', // NIL — OUTBOUND — Sofia
  'ef5c499b-fca0-474e-8d68-e7e2f558ee85', // Sofia – NIL Outbound ES (602)
  '82d628a7-a751-4bae-b93d-fb645cafb1bc', // NIL Sofia — Phillips 5L
  'c45499e0-c61e-47ac-ab4f-6f3e4c52e7a3', // BTL Sofia — Phillips 5L
  'fce08c17-ca04-419e-bc5b-cf93daa1178e', // Sofia – BTL Outbound Callback v1
  '5ee926d7-2a58-454c-8150-641b20218fbc', // Sofia – BTL Pre-Qual → Phillips v2
  '2ebf612c-cbb1-404b-adcf-240b1faa7cf8', // NIL — Phillips Router — Render v1 (first-dial assistant)
]);

// Test rig artifacts — never count, never retry.
const TEST_ASSISTANTS = new Set([
  '78b029f0-2576-42ab-9783-28ead0a957b6', // TEST RIG Sofia AZ MVA 5-factor
  'f98ae41a-4e53-48d0-9a4d-e595b04dee4e', // TEST ACTOR - intake operator
  'a54e3d6b-db1f-4891-9669-3540cfc3068b', // TEST ACTOR - claimant (lane proof)
]);
const TEST_PHONE_NUMBERS = new Set([
  '51304c3d-8887-4d0c-8c45-a42ec261d8b3', // TEST RIG Sofia MVA
  'fffe9e63-7691-4263-89f6-0bd697af9bd4', // TEST intake operator actor
  '6fdeb5a3-d36d-4b6f-bbb7-4f9e20a1bebc', // TEST claimant actor
]);

// Retry placement assistant per outbound number (used when the original call's assistant is unknown).
const RETRY_ASSISTANT_BY_NUMBER = {
  '4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd': '41ee29eb-1ea0-45b6-bd54-585e2fb91efa', // NIL → NIL OUTBOUND Sofia
  '9118e295-67e9-49c3-99b2-f84730eba422': '5ee926d7-2a58-454c-8150-641b20218fbc', // BTL → BTL Pre-Qual Phillips v2
};

const CFG = {
  key: env('VAPI_API_KEY', ''),
  phoneNumberId: env('VAPI_PHONE_NUMBER_ID', '4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd'),
  outboundNumberIds: new Set(
    env('OUTBOUND_PHONE_NUMBER_IDS', DEFAULT_OUTBOUND_NUMBERS.join(',')).split(',').map((s) => s.trim()).filter(Boolean)
  ),
  assistants: {
    en: env('ASSISTANT_EN', '41ee29eb-1ea0-45b6-bd54-585e2fb91efa'),
    es: env('ASSISTANT_ES', 'ef5c499b-fca0-474e-8d68-e7e2f558ee85'),
  },
  dryRun: env('DRY_RUN', 'true') !== 'false',
  maxAttempts: parseInt(env('MAX_ATTEMPTS', '4'), 10),
  lookbackHours: parseInt(env('LOOKBACK_HOURS', '72'), 10),
  windowStart: parseInt(env('WINDOW_START', '8'), 10),
  windowEnd: parseInt(env('WINDOW_END', '17'), 10),
  tz: env('LOCAL_TZ', 'America/Phoenix'),
  doNotCall: new Set(env('DO_NOT_CALL', '').split(',').map((s) => s.trim()).filter(Boolean)),
  maxCallsPerRun: parseInt(env('MAX_CALLS_PER_RUN', '5'), 10),
};

// Delay before attempt N (N = 2,3,4...) measured from the previous attempt's createdAt.
// 'next-day' = 10:00 local the following day.
const CADENCE = [15 * 60e3, 2 * 3600e3, 'next-day'];

const RETRY_REASON = /voicemail|silence-timed-out|did-not-answer|no-answer|busy|failed-to-connect|customer-did-not-give-microphone|unknown-error|error-get-transport/i;
const REACHED_REASON = /assistant-forwarded-call|assistant-ended-call/i;
const REACHED_DISPOSITION = /qualified|transferred|captured|not_qualified|declined|wrong_number|do_not_call|opt_out/i;
const DECLINE_DISPOSITION = /declined|do_not_call|opt_out|wrong_number|not_interested/i;

const log = (o) => console.log(JSON.stringify({ ts: new Date().toISOString(), svc: SERVICE, ...o }));
const heartbeat = (o) => log({ type: 'heartbeat', ...o });

function localParts(d, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24 };
}
function inWindow(now) {
  const { h } = localParts(now, CFG.tz);
  return h >= CFG.windowStart && h < CFG.windowEnd;
}
// 10:00 local on the day after `d`. America/Phoenix is UTC-7 with no DST; generic tz handled via offset probe.
function nextDayTen(d) {
  const lp = localParts(d, CFG.tz);
  const probe = new Date(Date.UTC(lp.y, lp.m - 1, lp.d, 12));
  const offsetMin = (new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' })) - new Date(probe.toLocaleString('en-US', { timeZone: CFG.tz }))) / 60e3;
  return new Date(Date.UTC(lp.y, lp.m - 1, lp.d + 1, 10) + offsetMin * 60e3);
}

async function vapi(path, opts = {}) {
  const r = await fetch(VAPI + path, {
    ...opts,
    headers: { Authorization: `Bearer ${CFG.key}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function listCalls(sinceIso) {
  const out = [];
  let createdAtLt;
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ limit: '100', createdAtGt: sinceIso });
    if (createdAtLt) q.set('createdAtLt', createdAtLt);
    const batch = await vapi(`/call?${q}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    createdAtLt = batch[batch.length - 1].createdAt;
    if (batch.length < 100) break;
  }
  return out;
}

function seconds(c) {
  if (!c.startedAt || !c.endedAt) return 0;
  return (new Date(c.endedAt) - new Date(c.startedAt)) / 1e3;
}
function disposition(c) {
  const sd = c.analysis && c.analysis.structuredData;
  return sd && typeof sd === 'object' ? String(sd.disposition || '') : '';
}
function isTestCall(c) {
  const md = c.metadata;
  if (md && typeof md === 'object' && md.test === true) return true;
  if (TEST_ASSISTANTS.has(c.assistantId)) return true;
  if (TEST_PHONE_NUMBERS.has(c.phoneNumberId)) return true;
  return false;
}
/** A call is OURS if it's an outbound call placed from one of our outbound numbers
 *  (primary match), or carries one of the known Sofia assistant IDs (fallback).
 *  Test-tagged calls are never ours. */
function isOurs(c) {
  if (c.type !== 'outboundPhoneCall') return false;
  if (isTestCall(c)) return false;
  if (CFG.outboundNumberIds.has(c.phoneNumberId)) return true;
  if (SOFIA_ASSISTANTS.has(c.assistantId)) return true;
  return false;
}
function isReached(c) {
  if (c.type === 'inboundPhoneCall') return true; // they called us back — never chase a callback
  if (REACHED_REASON.test(c.endedReason || '')) return true;
  if (REACHED_DISPOSITION.test(disposition(c))) return true;
  if ((c.endedReason || '') === 'customer-ended-call' && seconds(c) >= 45) return true; // a real conversation
  return false;
}
function isRetryable(c) {
  const d = disposition(c);
  if (DECLINE_DISPOSITION.test(d)) return false;
  if (/no_contact|voicemail/i.test(d)) return true;
  if (RETRY_REASON.test(c.endedReason || '')) return true;
  if ((c.endedReason || '') === 'customer-ended-call' && seconds(c) < 20) return true; // picked up and dropped
  return false;
}
/** Assistant to place the retry with: the original call's assistant when known,
 *  else the lane default for the outbound number it went out on. */
function retryAssistantId(first) {
  if (first.assistantId && SOFIA_ASSISTANTS.has(first.assistantId)) return first.assistantId;
  const byNumber = RETRY_ASSISTANT_BY_NUMBER[first.phoneNumberId];
  if (byNumber) return byNumber;
  return CFG.assistants.en;
}

/** Pure planner — exported for tests. Returns [{number, attempt, dueAt, reason, assistantId, phoneNumberId, variableValues}] */
function plan(calls, now = new Date()) {
  const byNumber = new Map();
  for (const c of calls) {
    const num = c.customer && c.customer.number;
    if (!num) continue;
    if (!isOurs(c) && c.type !== 'inboundPhoneCall') continue;
    if (isTestCall(c)) continue;
    if (!byNumber.has(num)) byNumber.set(num, []);
    byNumber.get(num).push(c);
  }
  const due = [];
  for (const [number, list] of byNumber) {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const outbound = list.filter((c) => c.type === 'outboundPhoneCall');
    if (outbound.length === 0) continue;
    const skip = (why) => log({ number, skip: why, attempts: outbound.length });
    if (!/^\+1\d{10}$/.test(number)) { skip('non-us-number'); continue; }
    if (CFG.doNotCall.has(number)) { skip('do-not-call'); continue; }
    if (list.some(isReached)) { skip('reached'); continue; }
    const last = outbound[outbound.length - 1];
    if (!isRetryable(last)) { skip(`last-not-retryable:${last.endedReason}/${disposition(last)}`); continue; }
    if (outbound.length >= CFG.maxAttempts) { skip('max-attempts'); continue; }
    if (last.status && last.status !== 'ended') { skip('call-in-progress'); continue; }
    const step = CADENCE[Math.min(outbound.length - 1, CADENCE.length - 1)];
    const lastAt = new Date(last.createdAt);
    const dueAt = step === 'next-day' ? nextDayTen(lastAt) : new Date(lastAt.getTime() + step);
    if (now < dueAt) { log({ number, wait: dueAt.toISOString(), attempts: outbound.length }); continue; }
    // carry the original lead context forward (first call carries the Zap's variableValues)
    const first = outbound.find((c) => c.assistantOverrides && c.assistantOverrides.variableValues) || outbound[0];
    const vv = { ...((first.assistantOverrides && first.assistantOverrides.variableValues) || {}) };
    vv.submitted_ago = 'earlier';
    vv.retry_attempt = String(outbound.length + 1);
    due.push({
      number,
      attempt: outbound.length + 1,
      dueAt: dueAt.toISOString(),
      reason: last.endedReason,
      assistantId: retryAssistantId(first),
      phoneNumberId: first.phoneNumberId || CFG.phoneNumberId,
      variableValues: vv,
      lead_id: vv.lead_id || vv.lead_uid || null,
    });
  }
  return due;
}

async function main() {
  // FAIL RED on missing key — never report green when we cannot see call history.
  if (!CFG.key) {
    log({ level: 'error', msg: 'VAPI_API_KEY not set — failing red', type: 'heartbeat', healthy: false });
    process.exit(1);
  }
  const now = new Date();
  heartbeat({ msg: 'run-start', healthy: true, dryRun: CFG.dryRun, window: `${CFG.windowStart}-${CFG.windowEnd}`, tz: CFG.tz });
  if (!inWindow(now)) { heartbeat({ msg: 'outside calling window', hour: localParts(now, CFG.tz).h, healthy: true }); return; }
  const since = new Date(now.getTime() - CFG.lookbackHours * 3600e3).toISOString();
  let calls;
  try {
    calls = await listCalls(since);
  } catch (e) {
    heartbeat({ level: 'error', msg: 'call-history fetch failed', err: String(e.message || e), healthy: false });
    process.exit(1);
  }
  heartbeat({ msg: 'calls loaded', count: calls.length, since, healthy: true });
  const due = plan(calls, now);
  heartbeat({ msg: 'due', count: due.length, dryRun: CFG.dryRun, healthy: true });
  let placed = 0;
  for (const d of due) {
    if (placed >= CFG.maxCallsPerRun) { log({ msg: 'per-run cap reached', cap: CFG.maxCallsPerRun }); break; }
    const body = {
      assistantId: d.assistantId,
      phoneNumberId: d.phoneNumberId,
      customer: { number: d.number },
      assistantOverrides: { variableValues: d.variableValues },
      metadata: { source: 'nil-retry', attempt: d.attempt, lead_id: d.lead_id },
    };
    if (CFG.dryRun) { log({ wouldCall: d.number, attempt: d.attempt, reason: d.reason, lead_id: d.lead_id }); continue; }
    try {
      const res = await vapi('/call', { method: 'POST', body: JSON.stringify(body) });
      placed++;
      log({ called: d.number, attempt: d.attempt, callId: res.id, lead_id: d.lead_id });
    } catch (e) {
      log({ level: 'error', number: d.number, err: String(e.message || e) });
    }
  }
  heartbeat({ msg: 'done', placed, healthy: true });
}

module.exports = { plan, isReached, isRetryable, isOurs, isTestCall, CFG, SOFIA_ASSISTANTS };
if (require.main === module) main().catch((e) => { log({ level: 'error', fatal: String(e.message || e) }); process.exit(1); });
