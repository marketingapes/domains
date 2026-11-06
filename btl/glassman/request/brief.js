// Glassman campaign brief: pure logic shared by the request page and its tests.
// No DOM, no network by itself, no analytics. A brief is a request for review; it never
// purchases, invoices, authorizes spend or launches anything.

export const FIRM = 'Jeffrey Glassman Injury Lawyers';
export const SCHEMA = 'glassman.campaign-brief/v1';
export const RECEIPT_SCHEMA = 'glassman.campaign-brief.receipt/v1';
export const DEFAULT_TIMEOUT_MS = 15000;

export const STEPS = [
  { id: 'focus', title: 'Focus', heading: 'What is this brief about?' },
  { id: 'reach', title: 'Who & where', heading: 'Who should the campaign reach?' },
  { id: 'contacts', title: 'Contacts', heading: 'Who should Kyle work with?' },
  { id: 'angle', title: 'Angle & budget', heading: 'What makes your firm the right call?' },
  { id: 'review', title: 'Review', heading: 'Review your brief' },
];

export const REQUEST_TYPES = {
  ssdi: 'A change to the current SSDI campaign',
  new: 'A separate, future campaign outside SSDI',
};

export const GOALS = {
  quality: 'Better-fit inquiries for intake',
  reach: 'Reach different states or people',
  capacity: 'Match intake capacity or hours',
  message: 'Test a new message or angle',
  launch: 'Scope a new case type',
  other: 'Something else',
};

export const TIMING = {
  soon: 'As soon as it is ready',
  month: 'Within about a month',
  quarter: 'Within about three months',
  flexible: 'Flexible / just exploring',
};

export const AFTER_HOURS = {
  next: 'Contact them the next business day',
  voicemail: 'Voicemail, returned by intake',
  service: 'An answering service takes it',
  unsure: 'Not sure yet',
};

export const BUDGET_MODES = {
  none: 'No budget proposal; discuss with Kyle',
  propose: 'Propose a media budget for discussion',
};

export function emptyDraft() {
  return {
    request_type: '', new_case_type: '', goal: '', goal_detail: '', timing: '',
    states: '', criteria: '', exclusions: '', daily_capacity: '', hours: '', after_hours: '',
    requester_name: '', requester_email: '', requester_role: '',
    intake_name: '', intake_email: '', intake_phone: '', approver_name: '',
    angle: '', avoid: '', budget_mode: 'none', budget_amount: '', budget_note: '',
    acknowledged: false,
  };
}

const TEXT_LIMIT = 1200;
const EMAIL = /^[^@\s<>]+@[^@\s<>]+\.[A-Za-z]{2,}$/;

// Keeps only known keys and bounded strings, so a stored draft can never inject structure.
export function normalizeDraft(input) {
  const base = emptyDraft();
  if (!input || typeof input !== 'object') return base;
  for (const key of Object.keys(base)) {
    if (key === 'acknowledged') base.acknowledged = input.acknowledged === true;
    else if (typeof input[key] === 'string') base[key] = input[key].slice(0, TEXT_LIMIT);
  }
  if (!(base.request_type in REQUEST_TYPES)) base.request_type = '';
  if (!(base.goal in GOALS)) base.goal = '';
  if (!(base.timing in TIMING)) base.timing = '';
  if (!(base.after_hours in AFTER_HOURS)) base.after_hours = '';
  if (!(base.budget_mode in BUDGET_MODES)) base.budget_mode = 'none';
  return base;
}

const t = (v) => String(v ?? '').trim();
const digits = (v) => t(v).replace(/\D/g, '');

export function parseBudget(value) {
  const raw = t(value).replace(/[$,\s]/g, '');
  if (!/^\d{1,8}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= 10000000 ? n : null;
}

export const usd = (n) => '$' + Number(n).toLocaleString('en-US');

// Returns { fieldName: friendly message } for one step. An empty object means the step is complete.
export function validateStep(index, draft) {
  const d = normalizeDraft(draft);
  const e = {};
  if (index === 0) {
    if (!d.request_type) e.request_type = 'Choose whether this is about the SSDI campaign or a separate future campaign.';
    if (d.request_type === 'new' && t(d.new_case_type).length < 3) e.new_case_type = 'Name the case type you have in mind, for example “Depo-Provera”.';
    if (!d.goal) e.goal = 'Pick the goal that fits best. You can add detail below it.';
    if (!d.timing) e.timing = 'Choose a timeframe, even if it is flexible.';
  } else if (index === 1) {
    if (t(d.states).length < 2) e.states = 'List the states you take these cases in, or write “all except …”.';
    if (t(d.criteria).length < 10) e.criteria = 'Describe who qualifies in a sentence or two, such as age range and situation.';
    const cap = t(d.daily_capacity);
    if (!/^\d{1,3}$/.test(cap) || Number(cap) < 1) e.daily_capacity = 'Enter a whole number from 1 to 999. A rough estimate is fine.';
    if (t(d.hours).length < 3) e.hours = 'Tell us when intake answers, for example “Mon–Fri 8 AM–8 PM ET”.';
    if (!d.after_hours) e.after_hours = 'Choose what should happen after hours, or “Not sure yet”.';
  } else if (index === 2) {
    if (t(d.requester_name).length < 2) e.requester_name = 'Enter your name.';
    if (!EMAIL.test(t(d.requester_email))) e.requester_email = 'Enter an email address like name@firm.com.';
    if (t(d.intake_name).length < 2) e.intake_name = 'Enter the intake contact’s name.';
    const hasEmail = t(d.intake_email) !== '', hasPhone = t(d.intake_phone) !== '';
    const p = digits(d.intake_phone);
    if (hasEmail && !EMAIL.test(t(d.intake_email))) e.intake_email = 'Enter an email address like intake@firm.com.';
    if (hasPhone && !(p.length === 10 || (p.length === 11 && p[0] === '1'))) e.intake_phone = 'Enter a 10-digit phone number.';
    if (!hasEmail && !hasPhone) e.intake_email = 'Add an email or a phone number for the intake contact.';
  } else if (index === 3) {
    if (t(d.angle).length < 20) e.angle = 'Share at least a sentence about what sets your firm apart. The prompts above can help.';
    if (d.budget_mode === 'propose' && parseBudget(d.budget_amount) === null) e.budget_amount = 'Enter a whole-dollar amount, for example 5000.';
  } else if (index === 4) {
    if (!d.acknowledged) e.acknowledged = 'Please confirm you understand this is a brief for review.';
  }
  return e;
}

export function firstIncompleteStep(draft, upTo = STEPS.length - 1) {
  for (let i = 0; i < upTo; i++) if (Object.keys(validateStep(i, draft)).length) return i;
  return upTo;
}

const or = (v, fallback = 'Not provided') => (t(v) ? t(v) : fallback);

export function budgetLine(draft) {
  const d = normalizeDraft(draft);
  const n = d.budget_mode === 'propose' ? parseBudget(d.budget_amount) : null;
  return n !== null
    ? `${usd(n)} proposed media budget, for discussion only`
    : 'No budget proposed. Kyle will discuss options; nothing is ordered.';
}

// Structured review sections. Each row is [label, value]; `step` lets the review link back to edit.
export function briefSections(draft) {
  const d = normalizeDraft(draft);
  const isNew = d.request_type === 'new';
  return [
    { step: 0, title: 'Focus', rows: [
      ['Request', d.request_type ? REQUEST_TYPES[d.request_type] : 'Not chosen'],
      ...(isNew ? [['Case type', or(d.new_case_type)], ['Scope', 'Separate future request. Not part of the current SSDI campaign; scope and pricing require review.']] : []),
      ['Goal', d.goal ? GOALS[d.goal] : 'Not chosen'],
      ['Success looks like', or(d.goal_detail)],
      ['Timing', d.timing ? TIMING[d.timing] : 'Not chosen'],
    ] },
    { step: 1, title: 'Who & where', rows: [
      ['States', or(d.states)],
      ['Who qualifies', or(d.criteria)],
      ['Exclusions', or(d.exclusions, 'None noted')],
      ['Daily intake capacity', /^\d{1,3}$/.test(t(d.daily_capacity)) ? `About ${t(d.daily_capacity)} new inquiries a day` : 'Not provided'],
      ['Intake hours', or(d.hours)],
      ['After hours', d.after_hours ? AFTER_HOURS[d.after_hours] : 'Not chosen'],
    ] },
    { step: 2, title: 'Contacts', rows: [
      ['Requested by', [t(d.requester_name), t(d.requester_role)].filter(Boolean).join(', ') || 'Not provided'],
      ['Requester email', or(d.requester_email)],
      ['Intake contact', or(d.intake_name)],
      ['Intake reach', [t(d.intake_email), t(d.intake_phone)].filter(Boolean).join(' · ') || 'Not provided'],
      ['Copy approver', or(d.approver_name, 'Same as requester')],
    ] },
    { step: 3, title: 'Angle & budget', rows: [
      ['What sets the firm apart', or(d.angle)],
      ['Avoid', or(d.avoid, 'Nothing noted')],
      ['Budget', budgetLine(d)],
      ...(t(d.budget_note) ? [['Budget note', t(d.budget_note)]] : []),
    ] },
  ];
}

export const BRIEF_TERMS = [
  'This is a brief for review. It is not a purchase, an invoice, a contract change or authorization to spend or launch.',
  'Any budget shown is a proposal for discussion. Nothing is billed from this brief.',
  'Results are not guaranteed: no lead volume, cost per lead or cost per case is promised.',
  'Your firm makes every legal and case-acceptance decision.',
];

export function briefText(draft, { requestId = '', date = new Date() } = {}) {
  const d = normalizeDraft(draft);
  const day = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const lines = [
    `CAMPAIGN BRIEF · ${FIRM}`,
    `Prepared on the Glassman Perspective request page · ${day}`,
  ];
  if (requestId) lines.push(`Brief ID: ${requestId}`);
  if (d.request_type === 'new') lines.push(`SEPARATE FUTURE REQUEST: ${or(d.new_case_type)}. Not part of the current SSDI campaign; scope and pricing require review.`);
  for (const s of briefSections(d)) {
    lines.push('', s.title.toUpperCase());
    for (const [k, v] of s.rows) lines.push(`${k}: ${v}`);
  }
  lines.push('', 'TERMS');
  for (const term of BRIEF_TERMS) lines.push(`- ${term}`);
  return lines.join('\n') + '\n';
}

// Canonical content fingerprint (FNV-1a 32-bit, hex). Identical content keeps the same brief ID
// across retries; changed content gets a new one. The acknowledgement is not content.
export function briefHash(draft) {
  const d = normalizeDraft(draft);
  delete d.acknowledged;
  const canon = JSON.stringify(Object.keys(d).sort().map((k) => [k, d[k].trim()]));
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) { h ^= canon.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
export function newRequestId(randomBytes) {
  const bytes = randomBytes(12);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `GLS-BRIEF-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
export const REQUEST_ID = /^GLS-BRIEF-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
export const RECEIPT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{5,63}$/;

// The page ships with no destination. A future destination must be an explicit same-origin path;
// anything else (absolute URL, protocol-relative, query string, other origin) keeps preview mode.
export function parseEndpoint(value, origin) {
  const v = t(value);
  if (!v || !/^\/(?!\/)[A-Za-z0-9/_-]{1,120}$/.test(v)) return null;
  try {
    const url = new URL(v, origin);
    return url.origin === origin ? url.pathname : null;
  } catch { return null; }
}

export function parseTimeout(value) {
  const n = Number(t(value));
  return Number.isInteger(n) && n >= 50 && n <= 60000 ? n : DEFAULT_TIMEOUT_MS;
}

export function buildPayload(draft, requestId, now = new Date()) {
  const d = normalizeDraft(draft);
  return {
    schema: SCHEMA,
    request_id: requestId,
    brief_hash: briefHash(d),
    prepared_at: now.toISOString(),
    kind: 'brief_for_review',
    authorizes: { purchase: false, invoice: false, spend: false, launch: false },
    separate_future_campaign: d.request_type === 'new',
    brief: d,
    brief_text: briefText(d, { requestId, date: now }),
  };
}

export const FAIL = {
  http: 'The server answered with an error, so nothing is confirmed.',
  network: 'The connection failed before a receipt came back.',
  timeout: 'No receipt arrived in time.',
  format: 'The server reply was not a readable receipt.',
  unconfirmed: 'The server reply did not confirm a saved receipt for this brief.',
  unavailable: 'Online sending is not connected for this page.',
};

// Accept only an explicit, durable receipt for this exact brief ID. Everything else fails closed.
export function interpretResponse(res, requestId) {
  if (!res || res.type === 'opaque' || res.type === 'opaqueredirect' || res.redirected) return { ok: false, reason: 'format', message: FAIL.format };
  if (!res.ok) return { ok: false, reason: 'http', message: FAIL.http, status: res.status };
  if (!/^application\/json\b/i.test(res.contentType || '')) return { ok: false, reason: 'format', message: FAIL.format };
  let body;
  try { body = JSON.parse(res.bodyText); } catch { return { ok: false, reason: 'format', message: FAIL.format }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'format', message: FAIL.format };
  if (body.schema !== RECEIPT_SCHEMA || body.status !== 'received' || body.durable !== true
    || body.request_id !== requestId || typeof body.receipt_id !== 'string' || !RECEIPT_ID.test(body.receipt_id)) {
    return { ok: false, reason: 'unconfirmed', message: FAIL.unconfirmed };
  }
  return { ok: true, receipt_id: body.receipt_id, request_id: body.request_id };
}

// One in-flight send at a time: repeated clicks share the same promise and the same brief ID.
export function createSubmitter({ fetchImpl, endpoint, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  let inflight = null;
  async function send(payload) {
    if (!endpoint || typeof fetchImpl !== 'function') return { ok: false, reason: 'unavailable', message: FAIL.unavailable };
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    let timedOut = false, timer;
    const deadline = new Promise((resolve) => { timer = setTimeout(() => { timedOut = true; ctrl?.abort(); resolve({ ok: false, reason: 'timeout', message: FAIL.timeout }); }, timeoutMs); });
    const attempt = (async () => {
      try {
        const r = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': payload.request_id },
          body: JSON.stringify(payload),
          credentials: 'same-origin', cache: 'no-store', redirect: 'error', mode: 'same-origin',
          signal: ctrl?.signal,
        });
        const bodyText = await r.text();
        if (timedOut) return { ok: false, reason: 'timeout', message: FAIL.timeout };
        return interpretResponse({ ok: r.ok, status: r.status, type: r.type, redirected: r.redirected, contentType: r.headers.get('content-type'), bodyText }, payload.request_id);
      } catch {
        return timedOut ? { ok: false, reason: 'timeout', message: FAIL.timeout } : { ok: false, reason: 'network', message: FAIL.network };
      }
    })();
    try { return await Promise.race([attempt, deadline]); } finally { clearTimeout(timer); }
  }
  return {
    submit(payload) {
      if (inflight) return inflight;
      inflight = send(payload).finally(() => { inflight = null; });
      return inflight;
    },
    get busy() { return inflight !== null; },
  };
}
