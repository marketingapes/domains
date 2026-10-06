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
  assert.match(html, /<div id="step-email">/, 'the email box shows immediately');
  assert.match(html, /<details class="token-alt" id="token-alt"><summary>Owner sign-in<\/summary>/, 'owner key is folded behind a small link');
  assert.ok(!/API|access token|Checking sign-in/i.test(html.slice(html.indexOf('id="gate"'), html.indexOf('id="app"'))), 'no technical language at sign-in');
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

test('email sign-in outage keeps the client sign-in plain: no owner box forced open, survives lock', () => {
  const oldDocument = globalThis.document;
  const { ids, document } = authDom();
  globalThis.document = document;
  try {
    assert.equal(P._applyAuthAvailability({ email_sign_in: false }), false);
    assert.equal(ids.get('step-email').hidden, false);
    assert.equal(ids.get('step-code').hidden, true);
    assert.equal(ids.get('send-code').disabled, true);
    assert.equal(ids.get('token-alt').open, false);
    assert.match(ids.get('gate-copy').textContent, /unavailable right now/i);
    assert.ok(!/token|API|HTTP/i.test(ids.get('gate-copy').textContent));
    P._lock();
    assert.equal(ids.get('step-email').hidden, false);
    assert.equal(ids.get('token-alt').open, false);
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
    assert.match(ids.get('gate-copy').textContent, /Phillips Law Group email/i);
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

test('one portal: client sections, Settings only at the owner-only #admin route, no per-level pages', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
  for (const v of ['overview', 'leads', 'marketing', 'litify', 'summary']) assert.match(html, new RegExp(`data-view="${v}"`));
  assert.ok(!/data-view="settings"/.test(html), 'no Settings tab in the navigation');
  assert.match(html, /data-panel="settings"/);
  assert.ok(!/id="admin-link"/.test(html), 'no Admin/Settings link in the header (owner uses the #admin URL)');
  assert.match(html, /<button class="btn" id="rq-top" type="button" hidden>\+ Request a Campaign<\/button>/);
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
  assert.match(html, /Sending it doesn't assign or schedule any setup, and nothing runs or spends until it is launched/);
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

test('Lock and every new sign-in reset the signed-in area; late replies and file reads are dropped', async () => {
  const fs = await import('node:fs');
  const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
  assert.ok(/APP_TEMPLATE = \$\('app'\)\.innerHTML;\s*bindApp\(\);/.test(js), 'pristine #app snapshot taken before any rendering');
  assert.ok(/function lock\(\) \{[\s\S]*?resetApp\(\);\s*\}/.test(js), 'Lock restores the pristine #app (lists, forms, typed values, messages)');
  assert.ok(/function startSession\(token, feed\) \{\s*state\.gen\+\+;[^\n]*resetApp\(\);/.test(js), 'a new sign-in starts from a clean page');
  assert.ok(/if \(gen !== state\.gen\) return hold\(\);/.test(js) && js.includes('function hold() { return new Promise(function () {}); }'),
    'a reply that lands after Lock never reaches any then/catch');
  const lit = js.slice(js.indexOf('function loadLitifyFile'), js.indexOf('function uploadLitify'));
  assert.equal((lit.match(/if \(gen !== state\.gen\) return;/g) || []).length, 2, 'file read and hashing both drop a stale result');
  const up = js.slice(js.indexOf('function uploadLitify'), js.indexOf('function saveLitify'));
  assert.ok(up.includes('if (gen !== state.gen) return hold();'), 'Litify upload reply dropped after Lock');
});

function renderDom(ids) {
  const els = new Map(ids.map((id) => [id, { hidden: false, disabled: false, textContent: '', innerHTML: '', value: '', querySelector: () => null }]));
  return { els, document: { body: { getAttribute: () => null }, getElementById: (id) => els.get(id) || null } };
}

test('pending items show their owner and due date, or say none is set; nothing claims follow-up that is not scheduled', async () => {
  const oldDocument = globalThis.document;
  const { els, document } = renderDom(['sm-head', 'sm-body', 'sm-checklist', 'sm-tasks', 'task-form', 'rq-form', 'rq-msg', 'rq-list', 'lead-detail']);
  globalThis.document = document;
  const feed = (sections) => P.normalizeFeed({ schema: 'perspective/v1', client: { id: 'syn', name: 'Synthetic Firm', short_name: 'Synthetic' }, transfers: [],
    access: { sections, owner: false, email: 'basic@example.test', can_request: true },
    campaigns: [{ id: 'mva', label: 'MVA', needs: [
      { id: 'n1', label: 'Send the export', owner: 'Synthetic', detail: '' },
      { id: 'n2', label: 'Pick a launch date', owner: '  ', detail: '' },
      { id: 'n3', label: 'Approve the script', owner: 'Marketing Apes', due: '2020-01-02', detail: '' },
      { id: 'n4', label: 'Confirm hours', owner: 'Synthetic', due_date: '2999-01-02T17:00:00Z', detail: '' },
      { id: 'n5', label: 'Pick a voice', owner: 'Synthetic', due: 'next week', detail: '' }] },
      { id: 'req-aaaaaaaaaa', label: 'Launched request' }],
    tasks: [{ task_id: 't1', title: 'Old open task', assignee: 'Sam', due_date: '2020-01-02', done: false },
      { task_id: 't2', title: 'Old done task', assignee: 'Sam', due_date: '2020-01-02', done: true }],
    requests: [
      { id: 'r1', case_type: 'Dog bite', status: 'requested', requested_at: '2026-10-01T12:00:00Z', requested_by: 'basic@example.test', campaign_id: 'req-1111111111' },
      { id: 'r2', case_type: 'Slip and fall', status: 'approved', requested_at: '2026-10-01T12:00:00Z', decided_at: '2026-10-02T12:00:00Z', campaign_id: 'req-2222222222' },
      { id: 'r3', case_type: 'Boat', status: 'declined', requested_at: '2026-10-01T12:00:00Z', decided_at: '2026-10-02T12:00:00Z', campaign_id: 'req-3333333333' },
      { id: 'r4', case_type: 'Launched', status: 'approved', requested_at: '2026-10-01T12:00:00Z', decided_at: '2026-10-02T12:00:00Z', campaign_id: 'req-aaaaaaaaaa' }],
    leads: [
      { lead_uid: 'EE-OPEN', campaign: 'mva', phone_hash: 'h1', stage: 'received' },
      { lead_uid: 'EE-SIGNED', campaign: 'mva', phone_hash: 'h2', stage: 'received', litify_intake: 'INT-2', litify_status: 'Converted' },
      { lead_uid: 'EE-DOWN', campaign: 'mva', phone_hash: 'h4', stage: 'received', litify_intake: 'INT-4', litify_status: 'Turned Down' },
      { lead_uid: 'EE-DQ', campaign: 'mva', phone_hash: 'h3', stage: 'disqualified' }] });
  try {
    P._state.campaign = 'mva';
    P._state.feed = feed(['leads', 'litify', 'summary', 'requests']);
    P._renderSummary();
    const items = els.get('sm-checklist').innerHTML.split('</li>');
    assert.match(items[0], /Synthetic<\/span> <span class="tag warn">No due date/, 'owner shown; missing due date flagged');
    assert.match(items[1], /Owner not set/, 'a blank owner is flagged, not shown empty or defaulted');
    assert.ok(!/>Marketing Apes</.test(items[1]), 'no invented owner');
    assert.match(items[2], /Marketing Apes<\/span> <span class="tag bad">Overdue · was due Jan 2, 2020/, 'a passed due date says Overdue in words');
    assert.match(items[3], /<span class="tag mute">Due Jan 2, 2999/, 'due_date key and timestamps are read');
    assert.match(items[4], /Due date unreadable/, 'a present but unreadable date is not shown as missing');
    const tasks = els.get('sm-tasks').innerHTML.split('</li>');
    assert.match(tasks[0], /Overdue · was due Jan 2, 2020/);
    assert.ok(!/Overdue/.test(tasks[1]) && /Due Jan 2, 2020/.test(tasks[1]), 'a done task is never overdue');

    P._renderRequests();
    const rq = els.get('rq-list').innerHTML.split('</li>');
    assert.match(rq[0], /Pending review[\s\S]*Not assigned[\s\S]*No due date[\s\S]*an owner approves or declines it/);
    assert.match(rq[1], /Approved · inactive draft[\s\S]*Not assigned[\s\S]*No due date[\s\S]*Nothing runs or spends until then/);
    assert.ok(!/Not assigned|No due date|Next:/.test(rq[2]), 'a declined request is not pending');
    assert.match(rq[3], /Approved · campaign switched on/);
    assert.ok(!/Not assigned|No due date|Next:|inactive|Nothing runs/.test(rq[3]), 'a switched-on campaign is not described as pending or inactive');

    for (const [uid, open] of [['EE-OPEN', true], ['EE-SIGNED', false], ['EE-DOWN', false], ['EE-DQ', false]]) {
      P._state.lead = uid;
      P._renderDetail();
      assert.equal(/Follow-up<\/dt><dd><span class="tag warn">Not recorded/.test(els.get('lead-detail').innerHTML), open, uid);
    }
    P._state.feed = feed(['leads', 'summary']);   // cannot see Litify outcomes: no lead is presented as open
    for (const uid of ['EE-OPEN', 'EE-SIGNED', 'EE-DOWN']) {
      P._state.lead = uid;
      P._renderDetail();
      assert.ok(!/Follow-up/.test(els.get('lead-detail').innerHTML), uid + ' without Litify access');
    }

    // "Overdue" turns at the viewer's midnight: 6:30 PM on Oct 5 in Phoenix is already Oct 6 in UTC.
    const RealDate = Date, oldTZ = process.env.TZ;
    process.env.TZ = 'America/Phoenix';
    globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super('2026-10-06T01:30:00Z'); } };
    try {
      P._state.feed = feed(['leads', 'litify', 'summary', 'requests']);
      P._state.feed.campaigns[0].needs = [{ id: 'n6', label: 'Due today', owner: 'Synthetic', due: '2026-10-05' }];
      P._renderSummary();
      assert.match(els.get('sm-checklist').innerHTML, /<span class="tag mute">Due Oct 5, 2026/, 'due today is not overdue in the evening');
    } finally {
      globalThis.Date = RealDate;
      if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ;
    }

    const fs = await import('node:fs');
    const js = fs.readFileSync(new URL('../lfma/assets/portal/perspective.js', import.meta.url), 'utf8');
    const html = fs.readFileSync(new URL('../lfma/portal/phillips/index.html', import.meta.url), 'utf8');
    for (const claim of ['being set up', 'will set it up', 'sets it up', 'still being worked', 'Not reached yet', "n.owner || 'Marketing Apes'", 'Reaching out', 'recorded yet'])
      assert.ok(!js.includes(claim) && !html.includes(claim), claim);
  } finally {
    P._state.feed = null; P._state.campaign = null; P._state.lead = null;
    globalThis.document = oldDocument;
  }
});

test('campaign pages and ad previews render as https links only, opened without a referrer', async () => {
  const oldDocument = globalThis.document;
  const { els, document } = renderDom(['sm-head', 'sm-body', 'sm-checklist', 'sm-tasks', 'task-form', 'rq-form', 'rq-msg', 'rq-list', 'lead-detail']);
  globalThis.document = document;
  try {
    P._state.campaign = 'mva';
    P._state.feed = P.normalizeFeed({ schema: 'perspective/v1', client: { id: 'syn', name: 'Synthetic Firm', short_name: 'Synthetic' }, transfers: [],
      access: { sections: ['summary'], owner: false, email: 'basic@example.test' },
      campaigns: [{ id: 'mva', label: 'MVA', needs: [], links: [
        { kind: 'page', label: 'A · Form + call', url: 'https://example.onrender.com/a/' },
        { kind: 'ad', label: 'Meta <N1>', url: 'https://fb.me/abc', note: 'paused' },
        { kind: 'page', label: 'evil', url: 'javascript:alert(1)' },
        { kind: 'ad', label: 'plain', url: 'http://example.com/' }] }],
      tasks: [], requests: [], leads: [] });
    P._renderSummary();
    const html = els.get('sm-body').innerHTML;
    assert.match(html, /<h4[^>]*>Pages<\/h4>/);
    assert.match(html, /<h4[^>]*>Ad previews<\/h4>/);
    assert.match(html, /href="https:\/\/example\.onrender\.com\/a\/" target="_blank" rel="noopener noreferrer">A · Form \+ call<\/a>/);
    assert.match(html, /Meta &lt;N1&gt;<\/a> <small>paused<\/small>/);
    assert.doesNotMatch(html, /javascript:|http:\/\/example\.com|>evil<|>plain</);
  } finally { globalThis.document = oldDocument; }
});
