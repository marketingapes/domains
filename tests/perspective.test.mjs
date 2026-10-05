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
  assert.match(html, /id="step-email" hidden/);
  assert.match(html, /id="token-alt" open/);
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
  assert.match(html, /<body data-client="plg" data-hub="https:\/\/[a-z0-9.-]+">/);
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.ok(js.includes("hub() + '/portal/' + encodeURIComponent(clientId()) + '/feed'"));
  assert.ok(!/HUB \+/.test(js), 'every request goes through hub()');
  assert.ok(js.includes("getAttribute('data-hub')") && js.includes('/^https:\\/\\/[a-z0-9.-]+$/i'), 'data-hub accepts only a bare https origin');
  assert.ok(!/['"]Transferred to Phillips/.test(js), 'no firm name hard-coded in stage labels');
  assert.ok(!/legal-web-lead|FALLBACK/.test(js), 'no silent fallback to another feed');
  assert.ok(!/(localStorage|sessionStorage)\.setItem\([^)]*(token|session)/i.test(js), 'session never persisted');
});

function authDom() {
  const ids = new Map(['app', 'gate', 'lock-btn', 'feed-pill', 'token', 'code', 'step-email', 'step-code', 'send-code', 'gate-copy', 'gate-err', 'token-alt', 'lead-list', 'lead-detail', 'lt-table', 'scoreboard']
    .map((id) => [id, { hidden: false, disabled: false, textContent: '', className: '', value: '', innerHTML: '', open: false }]));
  return { ids, document: { body: { getAttribute: () => 'https://perspective-s3b8.onrender.com' }, getElementById: (id) => ids.get(id) || null } };
}

test('email sign-in health fallback opens the working owner-token path and survives lock', () => {
  const oldDocument = globalThis.document;
  const { ids, document } = authDom();
  globalThis.document = document;
  try {
    assert.equal(P._applyAuthAvailability({ email_sign_in: false }), false);
    assert.equal(ids.get('step-email').hidden, true);
    assert.equal(ids.get('step-code').hidden, true);
    assert.equal(ids.get('send-code').disabled, true);
    assert.equal(ids.get('token-alt').open, true);
    assert.match(ids.get('gate-copy').textContent, /owner access token/i);
    P._lock();
    assert.equal(ids.get('step-email').hidden, true);
    assert.equal(ids.get('token-alt').open, true);
  } finally {
    P._state.emailSignIn = null;
    globalThis.document = oldDocument;
  }
});

test('healthy email sign-in replaces the neutral gate; invalid health changes nothing', () => {
  const oldDocument = globalThis.document;
  const { ids, document } = authDom();
  globalThis.document = document;
  try {
    assert.equal(P._applyAuthAvailability({}), false);
    assert.equal(ids.get('step-email').hidden, false, 'invalid health does not rewrite the DOM helper state');
    assert.equal(P._applyAuthAvailability({ email_sign_in: true }), true);
    assert.equal(ids.get('step-email').hidden, false);
    assert.equal(ids.get('send-code').disabled, false);
    assert.equal(ids.get('token-alt').open, false);
    assert.match(ids.get('gate-copy').textContent, /work email/i);
  } finally {
    P._state.emailSignIn = null;
    globalThis.document = oldDocument;
  }
});

test('failed, non-OK, and malformed health checks retain the email flow', async () => {
  const oldDocument = globalThis.document, oldFetch = globalThis.fetch;
  for (const fetchResult of [
    () => Promise.reject(new Error('offline')),
    () => Promise.resolve({ ok: false }),
    () => Promise.resolve({ ok: true, json: () => Promise.resolve({ nope: true }) }),
  ]) {
    const { ids, document } = authDom();
    globalThis.document = document;
    globalThis.fetch = fetchResult;
    assert.equal(await P._checkAuthAvailability(), true);
    assert.equal(ids.get('step-email').hidden, false);
    assert.equal(ids.get('send-code').disabled, false);
  }
  P._state.emailSignIn = null;
  globalThis.fetch = oldFetch;
  globalThis.document = oldDocument;
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

test('one portal: five sections plus an owner-only settings tab, no per-level pages', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
  for (const v of ['overview', 'leads', 'marketing', 'litify', 'summary']) assert.match(html, new RegExp(`data-view="${v}"`));
  assert.match(html, /data-view="settings" aria-selected="false" hidden/);
  assert.match(html, /id="sm-tasks"/);
  const dirs = fs.readdirSync(new URL('../lfma/portal/', import.meta.url));
  assert.ok(!dirs.some((d) => /csuite|management|basic/i.test(d)), 'no separate portals per level');
});

test('overview numbers come from the server, summed across campaigns, and are blank without overview access', () => {
  P._state.feed = { campaigns: [{ id: 'mva', overview: { leads: 2, reached: 1, intake: 1, transfers: 1, in_litify: 1, working: 0, signed: 0, budget: 100, spend: 50 } },
    { id: 'la', overview: { leads: 3, reached: null, intake: null, transfers: null, in_litify: 2, working: 1, signed: 1, budget: null, spend: 25 } }], leads: [] };
  const all = P.metrics({ id: 'all' });
  assert.equal(all.leads, 5); assert.equal(all.signed, 1); assert.equal(all.transfers, 1); assert.equal(all.spend, 75); assert.equal(all.cpl, 15);
  P._state.feed = { campaigns: [{ id: 'mva' }], leads: [{ lead_uid: 'x', campaign: 'mva' }] };
  const none = P.metrics({ id: 'mva' });
  assert.equal(none.leads, null); assert.equal(none.signed, null);
  P._state.feed = null;
});

test('proposals and campaign requests are section-gated tabs', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.match(html, /data-view="proposals"/);
  assert.match(html, /data-view="requests"/);
  assert.match(html, /data-panel="proposals"/);
  assert.match(html, /data-panel="requests"/);
  assert.match(html, /Nothing runs or spends until it is approved and launched/);
  assert.ok(!js.includes(".concat(['proposals', 'requests'])"), 'tabs are not forced open for every level');
  assert.ok(js.includes("['proposals', 'Proposals'], ['requests', 'Request a Campaign']"), 'owner ticks both per level in Settings');
  assert.ok(js.includes("'/proposals/' + encodeURIComponent(id) + '/share'"), 'owner names recipients');
  assert.match(html, /not acceptance, a signature, an amendment or a budget change/);
  assert.ok(js.includes("api('POST', '/requests'") && js.includes("'/proposals/' + encodeURIComponent(id) + '/ack'"));
  assert.ok(js.includes('a.owner ? (p.acks'), 'only the owner sees who acknowledged');
});

test('recordings play only through the server with the session header; no provider link in the page', async () => {
  const fs = await import('node:fs');
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.ok(!/storage\.vapi\.ai|recording_url|recording_call_id/.test(js), 'no provider address or call id handled by the page');
  assert.ok(js.includes("'/recordings/' + encodeURIComponent(uid)") && js.includes("Authorization: 'Bearer ' + state.token"));
  assert.ok(js.includes('createObjectURL(b)') && js.includes('revokeObjectURL'), 'audio plays from memory and is released');
  assert.ok(js.includes('access().can_listen'), 'Listen only when the server says this person may play');
  assert.ok(/function lock\(\) \{[\s\S]{0,200}clearAudio\(\)/.test(js), 'locking drops any loaded audio');
});
