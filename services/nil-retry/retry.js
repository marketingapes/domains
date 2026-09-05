#!/usr/bin/env node
/**
 * NIL — Sofia retry cadence (Render cron, every 15 min)
 *
 * The leak this closes: one dial per lead, then nothing. 9/4–9/5: 4 of 4 outbound = voicemail /
 * no-answer / failed, zero second attempts, zero transfers, zero Litify rows.
 *
 * Stateless by design: every run re-reads Vapi call history and derives attempts per number.
 * No database, no ledger dependency, idempotent (a run that finds nothing due does nothing).
 *
 * Cadence (after the Zap's first dial):  attempt 2 = +15 min · attempt 3 = +2 h · attempt 4 = next day 10:00 local.
 * Window: 08:00–20:00 America/Phoenix (Arizona, no DST).  Max attempts default 4 (incl. the Zap's).
 * Never retries: reached leads (transfer, real conversation, any inbound from the number), non-+1 numbers,
 * numbers in DO_NOT_CALL, or leads whose last outcome was a clean decline.
 *
 * ENV (Render → nil-retry → Environment):
 *   VAPI_API_KEY            required (server key). Missing → exits 0 with a warning (safe).
 *   VAPI_PHONE_NUMBER_ID    default 4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd  ((602) 693-1461)
 *   ASSISTANT_EN            default 41ee29eb-1ea0-45b6-bd54-585e2fb91efa
 *   ASSISTANT_ES            default ef5c499b-fca0-474e-8d68-e7e2f558ee85
 *   DRY_RUN                 default "true"  → logs would-call, dials nothing. Set "false" to arm.
 *   MAX_ATTEMPTS            default 4
 *   LOOKBACK_HOURS          default 72
 *   WINDOW_START / WINDOW_END   default 8 / 20 (local hours, America/Phoenix)
 *   DO_NOT_CALL             comma list of E.164 numbers to never dial (Kyle's cells, test numbers)
 *   MAX_CALLS_PER_RUN       default 5 (safety cap)
 */

const VAPI = 'https://api.vapi.ai';
const env = (k, d) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);

const CFG = {
  key: env('VAPI_API_KEY', ''),
  phoneNumberId: env('VAPI_PHONE_NUMBER_ID', '4d07e1e8-cfe4-4ed8-b18b-f71dc01f19fd'),
  assistants: {
    en: env('ASSISTANT_EN', '41ee29eb-1ea0-45b6-bd54-585e2fb91efa'),
    es: env('ASSISTANT_ES', 'ef5c499b-fca0-474e-8d68-e7e2f558ee85'),
  },
  dryRun: env('DRY_RUN', 'true') !== 'false',
  maxAttempts: parseInt(env('MAX_ATTEMPTS', '4'), 10),
  lookbackHours: parseInt(env('LOOKBACK_HOURS', '72'), 10),
  windowStart: parseInt(env('WINDOW_START', '8'), 10),
  windowEnd: parseInt(env('WINDOW_END', '20'), 10),
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

const log = (o) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...o }));

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
  // probe the tz offset at that date
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

/** Pure planner — exported for tests. Returns [{number, attempt, dueAt, reason, assistantId, variableValues}] */
function plan(calls, now = new Date()) {
  const assistantIds = new Set(Object.values(CFG.assistants));
  const byNumber = new Map();
  for (const c of calls) {
    const num = c.customer && c.customer.number;
    if (!num) continue;
    const isOurs = c.type === 'outboundPhoneCall' && assistantIds.has(c.assistantId);
    if (!isOurs && c.type !== 'inboundPhoneCall') continue;
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
    const assistantId = first.assistantId;
    due.push({ number, attempt: outbound.length + 1, dueAt: dueAt.toISOString(), reason: last.endedReason, assistantId, variableValues: vv, lead_id: vv.lead_id || null });
  }
  return due;
}

async function main() {
  if (!CFG.key) { log({ level: 'warn', msg: 'VAPI_API_KEY not set — nothing to do' }); return; }
  const now = new Date();
  if (!inWindow(now)) { log({ msg: 'outside calling window', tz: CFG.tz, hour: localParts(now, CFG.tz).h }); return; }
  const since = new Date(now.getTime() - CFG.lookbackHours * 3600e3).toISOString();
  const calls = await listCalls(since);
  log({ msg: 'calls loaded', count: calls.length, since });
  const due = plan(calls, now);
  log({ msg: 'due', count: due.length, dryRun: CFG.dryRun });
  let placed = 0;
  for (const d of due) {
    if (placed >= CFG.maxCallsPerRun) { log({ msg: 'per-run cap reached', cap: CFG.maxCallsPerRun }); break; }
    const body = {
      assistantId: d.assistantId,
      phoneNumberId: CFG.phoneNumberId,
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
  log({ msg: 'done', placed });
}

module.exports = { plan, isReached, isRetryable, CFG };
if (require.main === module) main().catch((e) => { log({ level: 'error', fatal: String(e.message || e) }); process.exit(1); });
