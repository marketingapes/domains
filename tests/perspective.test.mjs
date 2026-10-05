import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../lfma/assets/portal/perspective.js');

test('Litify rows map to the three Phillips campaigns', () => {
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes Deadleads', 'Case Type': 'Auto (AA)' }), 'handover');
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes', 'Case Type': 'Sex Abuse - Sexual Assault LA County' }), 'la');
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes', 'Case Type': 'Auto (AA)' }), 'mva');
  assert.equal(P.campaignForLitify({ Source: 'Marketing Apes', 'Case Type': 'Immigration Law' }), 'other');
});

test('CSV parser handles quotes, commas, CRLF and BOM', () => {
  const rows = P.parseCSV('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\n1,2');
  assert.deepEqual(rows, [{ a: 'x, y', b: 'he said "hi"' }, { a: '1', b: '2' }]);
});

test('page ships no lead data and loads only the token-gated feed', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
  assert.ok(!/\d{3}[-.)\s]\d{3}[-.\s]\d{4}/.test(html), 'no phone numbers in page');
  assert.ok(html.includes('/assets/portal/perspective.js'));
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage\.setItem\([^)]*token/i.test(js), 'token never persisted');
});

test('flat Make feed: transfers merge onto the Litify lead by phone hash; unmatched transfers become leads', () => {
  const feed = {
    schema: 'perspective/v1', campaigns: [{ id: 'la', label: 'LA' }],
    leads: [
      { lead_uid: 'PLG-1', campaign: 'la', phone_hash: 'h1', litify_intake: 'INT-1', litify_status: 'Turned Down', stage: 'received' },
      { lead_uid: 'PLG-2', campaign: 'la', phone_hash: 'h1', litify_intake: 'INT-2', litify_status: 'Converted', stage: 'received' },
    ],
    transfers: [
      { lead_uid: 'MA-1', campaign: 'la', phone_hash: 'h1', transfer_outcome: 'Live transfer connected - desk', transfer_at: '2026-09-20T12:00:00Z', ai_tracked: true, ours: true },
      { lead_uid: 'MA-2', campaign: 'la', phone_hash: 'h9', transfer_outcome: 'Consented - transfer failed', transfer_at: '2026-09-21T12:00:00Z' },
    ],
  };
  const f = P.normalizeFeed(feed);
  assert.equal(f.litify.length, 2, 'every Litify row kept');
  assert.equal(f.leads.length, 2, 'one CRM row per person');
  const p = f.leads.find((l) => l.phone_hash === 'h1');
  assert.equal(p.litify.status, 'Converted', 'best Litify status wins');
  assert.equal(p.stage, 'transferred');
  assert.equal(f.litify.find((r) => r.intake === 'INT-1').match_lead_uid, p.lead_uid);
  const lone = f.leads.find((l) => l.phone_hash === 'h9');
  assert.equal(lone.stage, 'intake_completed');
});

test('portal is per-firm: the page names its client and the feed comes live from the hub', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
  assert.match(html, /<body data-client="plg">/);
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.ok(js.includes("HUB + '/portal/' + encodeURIComponent(c) + '/feed'"));
  assert.ok(!/['"]Transferred to Phillips/.test(js), 'no firm name hard-coded in stage labels');
});

test('hub feed rows (BigQuery v_portal_leads) render: Litify rows keep our attribution, our-only leads stay', () => {
  const row = (o) => Object.assign({ lead_uid: '', campaign: 'la', received_at: '2026-05-06T12:00:00Z', name: 'A', phone_last4: '0001',
    phone_hash: 'h1', case_type: 'Sex Abuse', state: '', channel: 'Meta · Website', source: 'Litify · Marketing Apes', stage: 'received',
    ai_tracked: false, ours: true, litify_intake: '', litify_created: '', litify_status: '', litify_reason: '', litify_details: '' }, o);
  const f = P.normalizeFeed({ schema: 'perspective/v1', client: { id: 'plg', name: 'Phillips Law Group', short_name: 'Phillips' }, campaigns: [],
    transfers: [], leads: [
      row({ lead_uid: 'LIT-1', litify_intake: 'INT-1', litify_status: 'Converted' }),
      row({ lead_uid: 'LIT-2', litify_intake: 'INT-2', litify_status: 'Turned Down' }),
      row({ lead_uid: 'EE-9', phone_hash: 'h9', source: 'Our intake · web_form', channel: 'Website form' })] });
  assert.deepEqual(f.leads.map((l) => l.lead_uid).sort(), ['EE-9', 'LIT-1']);
  assert.equal(f.leads.find((l) => l.lead_uid === 'LIT-1').litify.status, 'Converted');
  assert.equal(f.litify.length, 2);
  assert.equal(f.litify[0].match_lead_uid, 'LIT-1');
});
