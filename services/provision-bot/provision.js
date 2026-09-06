#!/usr/bin/env node
/**
 * provision-bot — stand up a Sofia bot for a new firm in one command.
 *
 * What it does (Vapi side, the part that is automatable):
 *   1. Reads the template assistant (Sofia – NIL Inbound, 908118d7…).
 *   2. Creates a transferCall tool for the firm: transfer_to_<buyer_id> → their intake number,
 *      callerId = {{customer.number}} (the proven passthrough), with the handoff line.
 *   3. Clones the assistant with the firm's coverage states, accepted / turned-down list and name,
 *      keeping the template's voice, transcriber, server hook, analysis plan and send_to_page tool.
 *   4. Prints a receipt + the short human checklist (number, board row, lane branch).
 *
 * Safe by default: DRY_RUN=true prints everything it would create and creates nothing.
 *
 * Usage
 *   VAPI_API_KEY=… DRY_RUN=false node services/provision-bot/provision.js firm.json
 *   node services/provision-bot/provision.js firm.json            # dry run
 *
 * firm.json
 *   {
 *     "firm_name": "Gordon & Partners",
 *     "buyer_id": "gordon",                       // short, [a-z0-9_]
 *     "transfer_number": "+15615551234",          // E.164, the firm's INTAKE line (tracked if they have one)
 *     "states": ["Florida"],                      // live-connection coverage
 *     "accepted": ["car accident", "truck accident", "slip and fall"],
 *     "turned_down": ["medical malpractice", "workers compensation"],
 *     "hours": "24/7",                            // or "Mon–Fri 8am–6pm Eastern"
 *     "language": "en"                            // "en" | "es" | "both"
 *   }
 */

const fs = require('fs');
const VAPI = 'https://api.vapi.ai';
const TEMPLATE = process.env.TEMPLATE_ASSISTANT_ID || '908118d7-f221-429f-8855-55dd1d72c193';
const SEND_TO_PAGE = process.env.SEND_TO_PAGE_TOOL_ID || '1e605c3b-1c3a-4622-a9a5-53216d00d041';
const KEY = process.env.VAPI_API_KEY || '';
const DRY = (process.env.DRY_RUN || 'true') !== 'false';

const log = (...a) => console.log(...a);
const die = (m) => { console.error('✖ ' + m); process.exit(1); };

// ---------- input ----------
const file = process.argv[2];
if (!file) die('usage: provision.js firm.json');
const firm = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const k of ['firm_name', 'buyer_id', 'transfer_number', 'states']) if (!firm[k]) die(`firm.json missing "${k}"`);
if (!/^[a-z0-9_]{2,24}$/.test(firm.buyer_id)) die('buyer_id must be [a-z0-9_]{2,24}');
if (!/^\+1\d{10}$/.test(firm.transfer_number)) die('transfer_number must be E.164 US, e.g. +16025551234');
firm.accepted = firm.accepted || ['car accident', 'truck accident', 'motorcycle accident', 'pedestrian accident', 'slip and fall'];
firm.turned_down = firm.turned_down || [];
firm.hours = firm.hours || '24/7';
firm.language = firm.language || 'en';

// ---------- vapi ----------
async function vapi(path, method = 'GET', body) {
  if (!KEY) die('VAPI_API_KEY not set (dry run still needs it to read the template)');
  const r = await fetch(VAPI + path, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) die(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ---------- prompt surgery ----------
// The template prompt has exactly one place states are listed and one place the firm is implied.
// We replace the coverage line and prepend a tenant block; everything else stays byte-identical.
function tenantPrompt(basePrompt) {
  const states = firm.states.join(', ');
  const cov = /(===== LIVE CONNECTION COVERAGE[^\n]*\n)([^\n]*)/;
  if (!cov.test(basePrompt)) die('template prompt has no LIVE CONNECTION COVERAGE section — refuse to guess');
  let p = basePrompt.replace(cov, `$1${states}.`);
  const block =
`===== THIS LINE BELONGS TO ONE FIRM =====
You are answering on behalf of one participating injury law firm (internal id: ${firm.buyer_id}). You still never say the firm's name before a live connection; the firm introduces itself.
Live-connection coverage for this line: ${states}.
Claim types this firm ACCEPTS for a live connection: ${firm.accepted.join(', ')}.
Claim types this firm TURNS DOWN (treat as KIND 1 - capture, twenty-four hour promise, never transfer): ${firm.turned_down.length ? firm.turned_down.join(', ') : 'none beyond the standard list'}.
Intake hours for a live connection: ${firm.hours}. Outside those hours, capture and book a callback instead of transferring.
${firm.language === 'es' ? 'Default language for this line is Spanish; open in Spanish.' : firm.language === 'both' ? 'Bilingual line: follow the caller\'s language from their first words.' : ''}

`;
  return block + p;
}

(async () => {
  log(`\nprovision-bot · ${firm.firm_name} (${firm.buyer_id}) · ${DRY ? 'DRY RUN — nothing will be created' : 'LIVE — creating'}\n`);

  // 1. template
  const t = await vapi(`/assistant/${TEMPLATE}`);
  const sysMsg = (t.model.messages || []).find((m) => m.role === 'system');
  if (!sysMsg) die('template has no system message');
  const baseTools = (t.model.toolIds || []).filter((id) => id !== '417084ad-5e43-4573-968d-e2dc1314cb30'); // drop transfer_to_phillips
  if (!baseTools.includes(SEND_TO_PAGE)) baseTools.push(SEND_TO_PAGE);

  // 2. transfer tool
  const toolBody = {
    type: 'transferCall',
    destinations: [{
      type: 'number',
      number: firm.transfer_number,
      callerId: '{{customer.number}}',
      message: `Connecting you now. One moment.`,
      description: `${firm.firm_name} intake line`,
      transferPlan: { mode: 'warm-transfer-say-summary', summaryPlan: { enabled: true, messages: [{ role: 'system', content: `Say in one sentence: "Marketing Apes lead. <what happened, when, where>. <first name>." Then stop.` }] } },
    }],
    function: {
      name: `transfer_to_${firm.buyer_id}`,
      description: `Live warm transfer to ${firm.firm_name}'s intake line. Only after the consent gate and the three facts. Never outside ${firm.hours}.`,
      parameters: { type: 'object', properties: {}, required: [] },
    },
  };

  // 3. assistant clone
  const clone = { ...t };
  for (const k of ['id', 'orgId', 'createdAt', 'updatedAt', 'isServerUrlSecretSet']) delete clone[k];
  clone.name = `Sofia – ${firm.firm_name} Inbound (${firm.buyer_id})`;
  clone.metadata = { ...(t.metadata || {}), tenant_id: firm.buyer_id, provisioned_by: 'provision-bot', provisioned_at: new Date().toISOString() };
  clone.model = { ...t.model, messages: [{ ...sysMsg, content: tenantPrompt(sysMsg.content) }], toolIds: baseTools /* + transfer tool id after creation */ };

  if (DRY) {
    log('would create transferCall tool:', JSON.stringify(toolBody, null, 1).slice(0, 600) + '…');
    log(`\nwould create assistant "${clone.name}" — prompt ${clone.model.messages[0].content.length} chars (template ${sysMsg.content.length}), tools ${baseTools.length}+1`);
    log('\ncoverage line now reads:', clone.model.messages[0].content.match(/===== LIVE CONNECTION COVERAGE[^\n]*\n([^\n]*)/)[1]);
  } else {
    const tool = await vapi('/tool', 'POST', toolBody);
    clone.model.toolIds = [...baseTools, tool.id];
    const a = await vapi('/assistant', 'POST', clone);
    // verify
    const back = await vapi(`/assistant/${a.id}`);
    const ok = back.model.toolIds.includes(tool.id) && back.model.toolIds.includes(SEND_TO_PAGE) && back.model.messages[0].content.includes(firm.states[0]);
    if (!ok) die(`created ${a.id} but verification failed — inspect it before use`);
    log('✔ transfer tool', tool.id);
    log('✔ assistant   ', a.id, '·', back.name);
    fs.writeFileSync(`receipt-${firm.buyer_id}.json`, JSON.stringify({ firm, assistantId: a.id, transferToolId: tool.id, template: TEMPLATE, at: new Date().toISOString() }, null, 2));
    log('receipt written: receipt-' + firm.buyer_id + '.json');
  }

  log(`
HUMAN CHECKLIST (the 30% that needs a login)
  1. Vapi → Phone Numbers → buy/attach a number for ${firm.firm_name} → set inbound assistant = the id above.
     (Twilio A2P 10DLC if this number will text: start it now, it is the longest pole.)
  2. BUYER BOARD — Q4 2026: add row ${firm.buyer_id} (case types, states, transfer number, hours, price, cap, outcome-return method).
  3. Lead lane: add a branch on buyer_id="${firm.buyer_id}" so this firm's leads dial THIS assistant, not NIL's.
  4. Test lead (Meta Lead Ads Testing tool — delete the old test lead first) → expect SMS + call + transfer to ${firm.transfer_number}.
  5. Invoice: send the pay link before anything turns on.
`);
})().catch((e) => die(e.message || String(e)));
