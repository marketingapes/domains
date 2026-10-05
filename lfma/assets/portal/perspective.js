/* Perspective — client portal for any firm (feed schema perspective/v1).
 *
 * The page ships with zero lead data. Everything renders from the token-gated live feed
 * (GET <hub>/portal/{client}/feed, Authorization: Bearer <token>), which the Render hub
 * builds from BigQuery on every request. The page refreshes it every minute while open.
 * The firm is the page's <body data-client="...">, so a new firm is a copied folder.
 * The token and feed live in memory only; Lock or closing the tab clears both.
 *
 * Rules:
 * - A number with no connected source renders "—" with a note, never 0.
 * - "Signed" = Litify status Converted only.
 * - Uploaded Litify CSVs are parsed in the browser and matched on SHA-256 phone hashes;
 *   nothing is sent anywhere.
 */
(function (root) {
  'use strict';

  // Perspective server. A page may point elsewhere with <body data-hub="https://host">, so moving the server is a
  // one-attribute change; only a bare https origin is accepted.
  var DEFAULT_HUB = 'https://affiliate-hub-tbks.onrender.com';
  function hub() {
    var b = root.document && root.document.body, h = b && b.getAttribute('data-hub');
    return h && /^https:\/\/[a-z0-9.-]+$/i.test(h) ? h : DEFAULT_HUB;
  }
  var REFRESH_MS = 60000;
  var AUTH_CHECK_MS = 4000;
  var EMAIL_SIGN_IN_COPY = "Enter your work email and we'll send you a 6-digit code. Lead data loads only after you sign in, and clears when you lock or close the tab.";
  var TOKEN_SIGN_IN_COPY = 'Email sign-in is temporarily unavailable. Use the owner access token below. Lead data loads only after access is verified, and clears when you lock or close the tab.';
  var NA = '—';
  var state = { feed: null, campaign: null, view: 'overview', lead: null, litify: null, litifyLabel: '', litifyText: '', token: null, timer: null, failedAt: null, gen: 0, emailSignIn: null };
  var SECTION_LABELS = [['overview', 'Overview'], ['leads', 'Leads & AI Intake'], ['marketing', 'Marketing'], ['litify', 'Litify Outcomes'], ['summary', 'Summary & Daily Handoffs'], ['contact', 'Names & phone digits']];
  var LEVEL_LABELS = [['csuite', 'C-suite'], ['management', 'Management'], ['basic', 'Basic']];
  function access() { return (state.feed && state.feed.access) || { sections: [], owner: false }; }
  function can(section) { return access().sections.indexOf(section) >= 0; }
  function clientId() {
    var b = root.document && root.document.body, c = b && b.getAttribute('data-client');
    if (c) return c;
    var m = /\/portal\/([a-z0-9-]+)\//.exec((root.location && root.location.pathname) || '');
    return m ? m[1] : '';
  }
  function firm() { var c = state.feed && state.feed.client; return (c && (c.short_name || c.name)) || 'your firm'; }
  function firmName() { var c = state.feed && state.feed.client; return (c && c.name) || ''; }

  // ---------- helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function fmtInt(v) { v = num(v); return v === null ? NA : v.toLocaleString('en-US'); }
  function fmtMoney(v, cents) { v = num(v); return v === null ? NA : '$' + v.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); }
  function pct(a, b) { a = num(a); b = num(b); return a === null || !b ? '' : Math.round(a / b * 100) + '%'; }
  function ratio(spend, n) { spend = num(spend); n = num(n); return spend === null || !n ? null : spend / n; }
  function day(iso) { if (!iso) return NA; var d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function when(iso) { if (!iso) return NA; var d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function $(id) { return root.document.getElementById(id); }
  function countBy(rows, fn) { var o = Object.create(null); rows.forEach(function (r) { var k = fn(r); if (k != null && k !== '') o[k] = (o[k] || 0) + 1; }); return o; }
  function sortedEntries(o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }

  var STAGES = {
    received: ['Received', 'mute'], queued: ['Queued for AI call', 'mute'], ai_contacted: ['AI reached', ''],
    not_reached: ['Not reached yet', 'warn'], intake_completed: ['Intake completed', ''],
    transferred: ['Transferred to firm', 'ok'], disqualified: ['Did not qualify', 'bad'], handed_over: ['Handed over (list)', 'mute']
  };
  function stageTag(s) { var d = STAGES[s] || [s || 'Unknown', 'mute']; return '<span class="tag ' + d[1] + '">' + esc(d[0]) + '</span>'; }
  function litifyTag(status) {
    if (!status) return '<span class="tag mute">Not in Litify</span>';
    var cls = status === 'Converted' ? 'ok' : status === 'Turned Down' ? 'bad' : 'warn';
    return '<span class="tag ' + cls + '">' + esc(status) + '</span>';
  }

  // ---------- source freshness ----------
  var SRC_TAG = { ok: ['Current', 'ok'], stale: ['Stale', 'warn'], unavailable: ['No data', 'bad'], not_connected: ['Not connected', 'mute'] };
  function sourcesHTML(feed) {
    var rows = (feed.sources || []).map(function (s) {
      var t = SRC_TAG[s.status] || [s.status || 'Unknown', 'mute'];
      return '<li><span class="tag ' + t[1] + '">' + esc(t[0]) + '</span> <b>' + esc(s.label) + '</b>' +
        (s.as_of ? ' · as of ' + asOf(s.as_of) : '') + (s.note ? ' · ' + esc(s.note) : '') + (s.detail ? ' <small>(' + esc(s.detail) + ')</small>' : '') + '</li>';
    }).join('');
    var notes = (feed.notes || []).map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('');
    return '<div class="sources"><div><b>Last updated ' + when(feed.generated_at) + '</b>' +
      (state.failedAt ? ' · <span class="tag bad">Refresh failed at ' + when(state.failedAt) + '; showing the last good data</span>' : '') +
      '</div><ul>' + rows + '</ul>' + notes + '</div>';
  }
  function noName() { var a = state.feed && state.feed.access; return a && a.contact === false ? 'Contact details hidden' : 'Name not captured'; }
  function asOf(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? day(v + 'T12:00:00') : when(v); }
  function feedHealth(feed) {
    var bad = (feed.sources || []).filter(function (s) { return s.status !== 'ok'; }).length;
    return bad ? ['Updated ' + when(feed.generated_at) + ' · ' + bad + ' source' + (bad > 1 ? 's' : '') + ' not current', 'warn'] : ['Updated ' + when(feed.generated_at), 'ok'];
  }

  // ---------- data selection ----------
  function campaignsAll() { return (state.feed && state.feed.campaigns) || []; }
  function current() {
    var id = state.campaign;
    if (id === 'all') {
      var cs = campaignsAll();
      return { id: 'all', label: 'All campaigns', name: 'All ' + firm() + ' campaigns', state: cs.length + ' campaigns',
        summary: 'Every lead in the connected sources for ' + firm() + '\u2019s campaigns. Check the source dates below for what is current.',
        budget: { amount: sum(cs.map(function (c) { return c.budget && c.budget.amount; })) },
        spend: { amount: sum(cs.map(function (c) { return c.spend && c.spend.amount; })) },
        channels: [].concat.apply([], cs.map(function (c) { return c.channels || []; })),
        ads: [].concat.apply([], cs.map(function (c) { return c.ads || []; })),
        log: [].concat.apply([], cs.map(function (c) { return c.log || []; })),
        needs: [].concat.apply([], cs.map(function (c) { return (c.needs || []).map(function (n) { return Object.assign({ campaign: c.label }, n); }); })),
        narrative: [].concat.apply([], cs.map(function (c) { return (c.narrative || []).slice(0, 1).map(function (t) { return c.label + ': ' + t; }); })) };
    }
    return campaignsAll().filter(function (c) { return c.id === id; })[0] || campaignsAll()[0] || {};
  }
  function sum(arr) { var ok = arr.filter(function (v) { return num(v) !== null; }); return ok.length ? ok.reduce(function (a, b) { return a + b; }, 0) : null; }
  function leadsFor(id) { var l = (state.feed && state.feed.leads) || []; return id === 'all' ? l : l.filter(function (x) { return x.campaign === id; }); }
  function litifyRows() { return state.litify || (state.feed && state.feed.litify) || []; }
  function litifyFor(id) { var l = litifyRows(); return id === 'all' ? l : l.filter(function (x) { return x.campaign === id; }); }

  // Campaign numbers come from the server (feed.campaigns[].overview), so they never depend on which rows this person may see.
  function metrics(c) {
    var cs = c.id === 'all' ? campaignsAll() : [c];
    var ov = cs.map(function (x) { return x.overview; }).filter(Boolean);
    var add = function (k) { var v = ov.map(function (o) { return o[k]; }).filter(function (v) { return typeof v === 'number'; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) : null; };
    var m = ov.length ? { leads: add('leads'), reached: add('reached'), intake: add('intake'), transfers: add('transfers'), inLitify: add('in_litify'),
      working: add('working'), signed: add('signed'), budget: add('budget'), spend: add('spend') }
      : { leads: null, reached: null, intake: null, transfers: null, inLitify: null, working: null, signed: null, budget: null, spend: null };
    m.cpl = ratio(m.spend, m.leads); m.cpt = ratio(m.spend, m.transfers); m.cps = ratio(m.spend, m.signed);
    return m;
  }

  // ---------- render: shell ----------
  function renderCampaignTabs() {
    var cs = campaignsAll(), nav = $('campaign-tabs');
    var items = cs.map(function (c) { return { id: c.id, label: c.label, sub: c.state || '' }; });
    var tot = metrics({ id: 'all' }).leads;
    items.push({ id: 'all', label: 'All campaigns', sub: tot === null ? cs.length + ' campaigns' : fmtInt(tot) + ' leads total' });
    nav.innerHTML = items.map(function (it) {
      var sel = it.id === state.campaign;
      return '<button role="tab" data-campaign="' + esc(it.id) + '" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '"><strong>' + esc(it.label) + '</strong><small>' + esc(it.sub) + '</small></button>';
    }).join('');
  }

  function cell(label, value, note, na) { return '<div class="score"><span class="s-label">' + esc(label) + '</span><span class="s-num' + (na ? ' na' : '') + '">' + value + '</span><span class="s-note">' + esc(note) + '</span></div>'; }

  function renderHead() {
    var c = current();
    $('c-eyebrow').textContent = c.id === 'all' ? 'ALL CAMPAIGNS' : 'CAMPAIGN';
    $('c-title').textContent = c.name || c.label || '';
    $('c-summary').textContent = c.summary || '';
    $('c-state').textContent = c.state || '';
    $('freshness').innerHTML = sourcesHTML(state.feed) + (state.litifyLabel ? '<div>Comparing against: ' + esc(state.litifyLabel) + '</div>' : '');
  }
  function renderOverview() {
    var c = current(), m = metrics(c);
    var spendNote = c.spend && c.spend.as_of ? 'Platform spend as of ' + day(c.spend.as_of) : 'Ad platform spend not connected';
    $('scoreboard').innerHTML = [
      cell('Total leads', fmtInt(m.leads), fmtInt(m.inLitify) + ' found in your Litify report'),
      cell('Budget', fmtMoney(m.budget), (c.budget && c.budget.note) || (m.budget === null ? 'No paid budget on this campaign' : ''), m.budget === null),
      cell('Spent', fmtMoney(m.spend), spendNote, m.spend === null),
      cell('Reaching out', fmtInt(m.reached), m.reached === null ? 'AI outreach not tracked for these leads' : 'Leads the AI reached', m.reached === null),
      cell('Signed', fmtInt(m.signed), 'Litify status Converted'),
      cell('Intake completed', fmtInt(m.intake), m.intake === null ? 'Not tracked for these leads' : pct(m.intake, m.leads) + ' of leads', m.intake === null),
      cell('Transfers', fmtInt(m.transfers), m.transfers === null ? 'Not tracked for these leads' : 'Live transfers to your intake line', m.transfers === null),
      cell('Cost per lead', fmtMoney(m.cpl, true), m.cpl === null ? 'Needs spend' : 'Spend ÷ leads', m.cpl === null),
      cell('Cost per transfer', fmtMoney(m.cpt, true), m.cpt === null ? 'Needs spend and transfers' : 'Spend ÷ transfers', m.cpt === null),
      cell('Cost per signed', fmtMoney(m.cps, true), m.cps === null ? 'Needs spend and a signed case' : 'Spend ÷ signed', m.cps === null)
    ].join('');
    var steps = [['Leads', m.leads, ''], ['AI reached', m.reached, pct(m.reached, m.leads)], ['Intake done', m.intake, pct(m.intake, m.reached)],
      ['Transferred', m.transfers, pct(m.transfers, m.intake)], ['In Litify', m.inLitify, pct(m.inLitify, m.leads)], ['Signed', m.signed, pct(m.signed, m.inLitify)]];
    $('funnel').innerHTML = steps.map(function (s) { return '<div class="f-step"><b>' + fmtInt(s[1]) + '</b><span>' + esc(s[0]) + '</span>' + (s[2] ? '<i>' + s[2] + ' →</i>' : '') + '</div>'; }).join('');
  }

  // ---------- AI intake (CRM) ----------
  function fillSelect(sel, values, first) {
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + esc(first) + '</option>' + values.map(function (v) { return '<option value="' + esc(v[0]) + '">' + esc(v[1]) + '</option>'; }).join('');
    if (values.some(function (v) { return v[0] === cur; })) sel.value = cur;
  }
  function renderIntake() {
    var leads = leadsFor(state.campaign);
    fillSelect($('f-stage'), sortedEntries(countBy(leads, function (l) { return l.stage; })).map(function (e) { return [e[0], ((STAGES[e[0]] || [e[0]])[0]) + ' (' + e[1] + ')']; }), 'All stages');
    $('f-litify').hidden = !can('litify');
    fillSelect($('f-litify'), sortedEntries(countBy(leads, function (l) { return (l.litify && l.litify.status) || 'Not in Litify'; })).map(function (e) { return [e[0], e[0] + ' (' + e[1] + ')']; }), 'All Litify statuses');
    var q = ($('q').value || '').toLowerCase().trim(), fs = $('f-stage').value, fl = $('f-litify').value;
    var rows = leads.filter(function (l) {
      if (fs && l.stage !== fs) return false;
      if (fl && ((l.litify && l.litify.status) || 'Not in Litify') !== fl) return false;
      if (!q) return true;
      return [l.name, l.phone_last4, l.lead_uid, l.litify && l.litify.intake].join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return String(b.received_at || '').localeCompare(String(a.received_at || '')); });
    $('lead-list').innerHTML = rows.length ? rows.map(function (l) {
      return '<button class="lead-row" role="listitem" data-lead="' + esc(l.lead_uid) + '" aria-pressed="' + (state.lead === l.lead_uid) + '"><span><b>' + esc(l.name || noName()) + '</b><small>' + esc(l.case_type || l.claim || '') + ' · ' + day(l.received_at) + (l.phone_last4 ? ' · …' + esc(l.phone_last4) : '') + '</small></span>' +
        '<span class="mid">' + stageTag(l.stage) + '<small>' + esc(l.channel || l.source || '') + '</small></span><span>' + (can('litify') ? litifyTag(l.litify && l.litify.status) : '') + (l.recording_url ? ' <span class="tag">Recording</span>' : '') + '</span></button>';
    }).join('') : '<p style="padding:16px">No leads match these filters.</p>';
    $('list-count').textContent = rows.length + ' of ' + leads.length + ' leads';
    renderDetail();
  }
  function renderDetail() {
    var l = leadsFor('all').filter(function (x) { return x.lead_uid === state.lead; })[0], box = $('lead-detail');
    if (!l) { box.innerHTML = '<div class="eyebrow">LEAD DETAIL</div><p style="margin-top:10px">Select a lead to see what the AI did, the transfer, and what ' + esc(firm()) + ' reported back.</p>'; return; }
    var ev = (l.ai_events || []).slice().sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    var lit = l.litify || {};
    var rec = /^https:\/\/storage\.vapi\.ai\//.test(l.recording_url || '') ? l.recording_url : '';
    box.innerHTML = '<div class="eyebrow">LEAD DETAIL</div><h2 style="margin-top:8px">' + esc(l.name || noName()) + '</h2>' + stageTag(l.stage) + ' ' + (can('litify') ? litifyTag(lit.status) : '') +
      '<dl class="kv"><dt>Lead ID</dt><dd>' + esc(l.lead_uid) + '</dd><dt>Received</dt><dd>' + when(l.received_at) + '</dd><dt>Phone</dt><dd>' + (l.phone_last4 ? '…' + esc(l.phone_last4) : NA) + '</dd><dt>State</dt><dd>' + esc(l.state || NA) + '</dd>' +
      '<dt>Claim</dt><dd>' + esc(l.case_type || l.claim || NA) + '</dd><dt>Source</dt><dd>' + esc([l.channel, l.source].filter(Boolean).join(' · ') || NA) + '</dd>' +
      (l.ad ? '<dt>Ad</dt><dd>' + esc(l.ad) + '</dd>' : '') +
      (l.transfer ? '<dt>Transfer</dt><dd>' + esc(l.transfer.outcome || '') + ' · ' + when(l.transfer.at) + '</dd>' : '') +
      (rec ? '<dt>Call recording</dt><dd><a href="' + esc(rec) + '" target="_blank" rel="noopener noreferrer">Listen</a> · ' + when(l.recording_at) + ' <small>(Sofia call, stored by Vapi)</small></dd>' : '<dt>Call recording</dt><dd>None on file</dd>') +
      (can('litify') ? '<dt>Litify intake</dt><dd>' + esc(lit.intake || NA) + (lit.created ? ' · created ' + esc(lit.created) : '') + '</dd>' : '') +
      (lit.reason ? '<dt>Turn-down reason</dt><dd>' + esc(lit.reason) + (lit.details ? ' — ' + esc(lit.details) : '') + '</dd>' : '') + '</dl>' +
      '<div class="eyebrow" style="margin-top:6px">WHAT THE AI DID</div>' +
      (ev.length ? '<ul class="timeline">' + ev.map(function (e) { return '<li class="' + esc(e.kind || '') + '"><time>' + when(e.at) + '</time>' + esc(e.text) + '</li>'; }).join('') + '</ul>'
        : '<p class="note">' + (l.ai_tracked ? 'No AI activity recorded yet for this lead.' : 'This lead came before AI intake was tracked (handed over as a list or routed directly).') + '</p>');
  }

  // ---------- marketing ----------
  function renderMarketing() {
    var c = current(), m = metrics(c), leads = leadsFor(c.id);
    var impressions = sum((c.channels || []).map(function (x) { return x.impressions; })), clicks = sum((c.channels || []).map(function (x) { return x.clicks; }));
    $('mk-top').innerHTML = [
      ['Spend', fmtMoney(m.spend), c.spend && c.spend.as_of ? 'as of ' + day(c.spend.as_of) : 'not connected'],
      ['Impressions · Clicks', fmtInt(impressions) + ' · ' + fmtInt(clicks), clicks && impressions ? 'CTR ' + (clicks / impressions * 100).toFixed(2) + '%' : 'from ad platforms'],
      ['Cost per lead', fmtMoney(m.cpl, true), m.leads === null ? 'needs Overview access' : fmtInt(m.leads) + ' leads']
    ].map(function (x) { return '<div class="panel"><div class="eyebrow">' + esc(x[0]) + '</div><div class="s-num" style="font-size:34px">' + x[1] + '</div><p style="margin:0">' + esc(x[2]) + '</p></div>'; }).join('');
    var byChan = countBy(leads, function (l) { return l.channel || l.source || 'Unknown'; });
    var chans = (c.channels || []).slice();
    Object.keys(byChan).forEach(function (k) { if (!chans.some(function (x) { return x.name === k; })) chans.push({ name: k }); });
    $('mk-channels').innerHTML = '<tr><th>Channel</th><th class="num">Our leads</th><th class="num">Platform-reported</th><th class="num">Spend</th><th class="num">CPL</th><th class="num">Clicks</th></tr>' +
      chans.map(function (ch) { var n = can('leads') ? byChan[ch.name] || 0 : null; return '<tr><td>' + esc(ch.name) + (ch.status ? ' <span class="tag mute">' + esc(ch.status) + '</span>' : '') + '</td><td class="num">' + fmtInt(n) + '</td><td class="num">' + fmtInt(ch.platform_leads) + '</td><td class="num">' + fmtMoney(ch.spend) + '</td><td class="num">' + fmtMoney(ratio(ch.spend, n), true) + '</td><td class="num">' + fmtInt(ch.clicks) + '</td></tr>'; }).join('');
    var weeks = countBy(leads, function (l) { if (!l.received_at) return null; var d = new Date(l.received_at); if (isNaN(d)) return null; d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); });
    var wk = Object.keys(weeks).sort(), max = Math.max.apply(null, wk.map(function (k) { return weeks[k]; }).concat([1]));
    $('mk-weeks').innerHTML = !can('leads') ? '<p class="note">Lead volume by week needs Leads &amp; AI Intake access.</p>' : wk.length ? wk.map(function (k) { return '<div class="bar"><span>Week of ' + day(k + 'T12:00:00Z') + '</span><span class="track"><span class="fill" style="width:' + (weeks[k] / max * 100) + '%;display:block"></span></span><b>' + weeks[k] + '</b></div>'; }).join('') : '<p>No dated leads.</p>';
    var ads = c.ads || [];
    $('mk-ads').innerHTML = ads.length ? ads.map(function (a) { return '<div class="ad">' + (a.image ? '<img alt="" loading="lazy" src="' + esc(a.image) + '">' : '') + '<div><b>' + esc(a.name) + '</b><br>' + esc([a.channel, a.status].filter(Boolean).join(' · ')) + (num(a.leads) !== null ? '<br>' + a.leads + ' leads' : '') + (num(a.spend) !== null ? ' · ' + fmtMoney(a.spend) : '') + '</div></div>'; }).join('') : '<p>No creative attached to this campaign yet.</p>';
    var log = (c.log || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    $('mk-log').innerHTML = log.length ? '<tr><th>Date</th><th>Change</th><th>Why</th></tr>' + log.map(function (x) { return '<tr><td>' + day(x.date) + '</td><td>' + esc(x.change) + '</td><td>' + esc(x.why || '') + '</td></tr>'; }).join('') : '<tr><td>No logged changes yet.</td></tr>';
  }

  // ---------- litify match ----------
  function renderLitify() {
    var rows = litifyFor(state.campaign);
    var matched = rows.filter(function (r) { return r.match_lead_uid || r.matched; }).length;
    var st = countBy(rows, function (r) { return r.status || 'Blank'; });
    $('lt-top').innerHTML = [
      ['In your Litify report', fmtInt(rows.length), state.litifyLabel || 'Daily “All Marketing Apes Leads” report'],
      ['Matched to our leads', fmtInt(matched), pct(matched, rows.length) + ' matched on phone'],
      ['Converted (signed)', fmtInt(st.Converted || 0), (st['Turned Down'] || 0) + ' turned down · ' + rows.filter(function (r) { return r.status && r.status !== 'Turned Down' && r.status !== 'Converted'; }).length + ' still working']
    ].map(function (x) { return '<div class="panel"><div class="eyebrow">' + esc(x[0]) + '</div><div class="s-num" style="font-size:34px">' + x[1] + '</div><p style="margin:0">' + esc(x[2]) + '</p></div>'; }).join('');
    var reasons = sortedEntries(countBy(rows.filter(function (r) { return r.status === 'Turned Down'; }), function (r) { return r.reason || 'No reason given'; }));
    var max = reasons.length ? reasons[0][1] : 1;
    $('lt-reasons').innerHTML = reasons.length ? reasons.slice(0, 12).map(function (e) { return '<div class="bar"><span>' + esc(e[0]) + '</span><span class="track"><span class="fill" style="width:' + (e[1] / max * 100) + '%;display:block"></span></span><b>' + e[1] + '</b></div>'; }).join('') : '<p>No turn-downs in this view.</p>';
    fillSelect($('l-status'), sortedEntries(st).map(function (e) { return [e[0], e[0] + ' (' + e[1] + ')']; }), 'All statuses');
    var q = ($('lq').value || '').toLowerCase().trim(), fs = $('l-status').value, fm = $('l-match').value;
    var shown = rows.filter(function (r) {
      if (fs && (r.status || 'Blank') !== fs) return false;
      if (fm === 'matched' && !(r.match_lead_uid || r.matched)) return false;
      if (fm === 'unmatched' && (r.match_lead_uid || r.matched)) return false;
      return !q || [r.intake, r.name, r.phone_last4].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    $('lt-table').innerHTML = '<tr><th>Created</th><th>Intake</th><th>Client</th><th>Case type</th><th>Status</th><th>Reason</th><th>Our lead</th></tr>' +
      shown.slice(0, 600).map(function (r) { return '<tr><td>' + esc(r.created || '') + '</td><td>' + esc(r.intake || '') + '</td><td>' + esc(r.name || '') + (r.phone_last4 ? '<br><small>…' + esc(r.phone_last4) + '</small>' : '') + '</td><td>' + esc(r.case_type || '') + '</td><td>' + litifyTag(r.status) + '</td><td>' + esc(r.reason || '') + '</td><td>' + (r.match_lead_uid && can('leads') ? '<button class="btn ghost" style="padding:4px 8px" data-open-lead="' + esc(r.match_lead_uid) + '">Open</button>' : r.match_lead_uid || r.matched ? '<span class="tag ok">Our lead</span>' : '<span class="tag mute">No match</span>') + '</td></tr>'; }).join('');
  }

  // CSV parsing (RFC 4180-ish) for a user-chosen Litify export
  function parseCSV(text) {
    var rows = [], row = [], f = '', i = 0, q = false;
    text = text.replace(/^﻿/, '');
    for (; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += ch;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    var head = rows.shift() || [];
    return rows.filter(function (r) { return r.some(function (x) { return x !== ''; }); }).map(function (r) { var o = {}; head.forEach(function (h, j) { o[h.trim()] = (r[j] || '').trim(); }); return o; });
  }
  function digits(p) { var d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? d : ''; }
  function sha256(s) {
    var c = root.crypto && root.crypto.subtle;
    if (!c) return Promise.resolve('');
    return c.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  }
  function campaignForLitify(r) {
    var src = (r['Source'] || '').toLowerCase(), ct = (r['Case Type'] || '').toLowerCase();
    if (src.indexOf('deadlead') >= 0) return 'handover';
    if (ct.indexOf('sex abuse') === 0 || ct.indexOf('assault') >= 0) return 'la';
    if (/auto|premise|general pi|wrongful|rideshare|workers/.test(ct)) return 'mva';
    return 'other';
  }
  function loadLitifyFile(file) {
    var reader = new root.FileReader();
    reader.onload = function () {
      state.litifyText = String(reader.result || '');
      var raw = parseCSV(state.litifyText);
      if (!raw.length || !('Intake: Intake Name' in raw[0])) { $('lt-fileinfo').textContent = 'That file does not look like the “All Marketing Apes Leads” export.'; return; }
      var byHash = Object.create(null);
      leadsFor('all').forEach(function (l) { if (l.phone_hash) byHash[l.phone_hash] = l.lead_uid; });
      Promise.all(raw.map(function (r) { var d = digits(r['Phone']); return d ? sha256(d) : Promise.resolve(''); })).then(function (hashes) {
        state.litify = raw.map(function (r, i) {
          var d = digits(r['Phone']);
          return { created: r['Intake: Created Date'], intake: r['Intake: Intake Name'], name: r['Client'], phone_last4: d.slice(-4), case_type: r['Case Type'], source: r['Source'],
            status: r['Status'], reason: r['Turn Down Reason'], details: r['Turn Down Details'], campaign: campaignForLitify(r), match_lead_uid: (hashes[i] && byHash[hashes[i]]) || null };
        });
        state.litifyLabel = file.name + ' (loaded in this browser)';
        $('lt-fileinfo').textContent = raw.length + ' rows read from ' + file.name + '. Nothing was uploaded' +
          (access().owner ? ' (use “Load into Perspective” to make it everyone\u2019s data).' : '.');
        renderAll();
      });
    };
    reader.readAsText(file);
  }
  function uploadLitify() {
    var d = ($('lt-date').value || '').trim();
    if (!state.litifyText) { $('lt-fileinfo').textContent = 'Choose the Litify CSV first.'; return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { $('lt-fileinfo').textContent = 'Enter the report date (the date in the Litify email subject).'; return; }
    busy('lt-upload-btn', true);
    root.fetch(hub() + '/portal/' + encodeURIComponent(clientId()) + '/litify-report', { method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token }, body: JSON.stringify({ csv: state.litifyText, report_date: d }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.detail || 'Upload failed (HTTP ' + r.status + ').'); return j; }); })
      .then(function (j) { $('lt-fileinfo').textContent = j.loaded + ' Litify rows for ' + j.report_date + ' loaded into Perspective. Refreshing…'; state.litify = null; state.litifyLabel = ''; refresh(); })
      .catch(function (e) { $('lt-fileinfo').textContent = e.message; })
      .then(function () { busy('lt-upload-btn', false); });
  }
  function saveLitify() {
    var rows = litifyFor(state.campaign), cols = ['created', 'intake', 'name', 'phone_last4', 'case_type', 'source', 'status', 'reason', 'details', 'campaign', 'match_lead_uid'];
    var csv = cols.join(',') + '\n' + rows.map(function (r) { return cols.map(function (k) { var v = String(r[k] == null ? '' : r[k]); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = root.document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'perspective-litify-match-' + state.campaign + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    root.document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ---------- summary ----------
  function renderSummary() {
    var c = current(), m = metrics(c);
    $('sm-head').textContent = (c.label || '') + (m.leads === null ? '' : ': ' + fmtInt(m.leads) + ' leads, ' + fmtInt(m.signed) + ' signed');
    var auto = m.leads === null ? [] : [
      fmtInt(m.leads) + ' leads in the connected sources; ' + fmtInt(m.inLitify) + ' appear in your Litify data.',
      fmtInt(m.signed) + ' converted, ' + fmtInt(m.working) + ' still being worked.',
      m.transfers !== null ? fmtInt(m.transfers) + ' live transfers from AI intake.' : 'AI transfer tracking does not cover these leads.',
      m.spend !== null ? fmtMoney(m.spend) + ' spent' + (m.cpl !== null ? ' · ' + fmtMoney(m.cpl, true) + ' per lead' : '') + '.' : 'Spend not connected for this view.'
    ];
    $('sm-body').innerHTML = (auto.length ? '<ul style="padding-left:18px;margin:6px 0 14px;line-height:1.7;font-size:14px">' + auto.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      ((c.id === 'all' ? [] : c.narrative) || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    var needs = c.needs || [];
    $('sm-checklist').innerHTML = needs.length ? needs.map(function (n) {
      return '<li><span><b>' + esc(n.label) + '</b> <span class="tag ' + (n.owner && n.owner !== 'Marketing Apes' ? 'warn' : '') + '">' + esc(n.owner || 'Marketing Apes') + '</span>' + (n.campaign ? ' <span class="tag mute">' + esc(n.campaign) + '</span>' : '') + '<small>' + esc(n.detail || '') + '</small></span></li>';
    }).join('') : '<li>No open items.</li>';
    var tasks = ((state.feed && state.feed.tasks) || []).filter(function (t) { return c.id === 'all' || !t.campaign_id || t.campaign_id === c.id; });
    var mayCheck = !!access().can_complete_tasks;
    $('sm-tasks').innerHTML = tasks.length ? tasks.map(function (t, i) {
      var late = !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
      return '<li><input type="checkbox" id="task-' + i + '" data-task="' + esc(t.task_id) + '"' + (t.done ? ' checked' : '') + (mayCheck ? '' : ' disabled') + '><label for="task-' + i + '"><b>' + esc(t.title) + '</b> ' +
        '<span class="tag">' + esc(t.assignee || 'Unassigned') + '</span> <span class="tag ' + (late ? 'bad' : 'mute') + '">Due ' + day((t.due_date || '') + 'T12:00:00') + '</span>' +
        '<small>' + (t.done ? 'Done by ' + esc(t.done_by || '?') + ' · ' + when(t.done_at) : 'Open · added by ' + esc(t.created_by || '?')) + '</small></label></li>';
    }).join('') : '<li>No handoffs yet.</li>';
    var form = $('task-form');
    form.hidden = !access().owner;
    if (!form.hidden) fillSelect($('t-campaign'), campaignsAll().map(function (x) { return [x.id, x.label]; }), 'All campaigns');
  }
  function api(method, path, body) {
    var gen = state.gen;
    return root.fetch(hub() + '/portal/' + encodeURIComponent(clientId()) + path, { method: method, cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        if (gen !== state.gen) throw new Error('locked');
        if (r.status === 401) { lock(); $('gate-err').textContent = 'Your session ended. Sign in again.'; throw new Error('Your session ended.'); }
        if (!r.ok) throw new Error(j.detail || 'Could not save (HTTP ' + r.status + ').');
        return j; }); });
  }
  function setTask(id, done, box) {
    box.disabled = true; $('task-msg').textContent = 'Saving…';
    api('POST', '/tasks/' + encodeURIComponent(id), { done: done })
      .then(function (j) { $('task-msg').textContent = (done ? 'Marked done' : 'Reopened') + ' by ' + j.by + '.'; refresh(); })
      .catch(function (e) { box.checked = !done; $('task-msg').textContent = e.message; })
      .then(function () { box.disabled = !access().can_complete_tasks; });
  }
  function addTask(e) {
    e.preventDefault();
    api('POST', '/tasks', { title: $('t-title').value, assignee: $('t-assignee').value, due_date: $('t-due').value, campaign_id: $('t-campaign').value })
      .then(function () { $('task-msg').textContent = 'Task added.'; $('task-form').reset(); refresh(); })
      .catch(function (err) { $('task-msg').textContent = err.message; });
  }

  // ---------- owner settings ----------
  function renderSettings() {
    var st = (state.feed && state.feed.settings) || { levels: {}, updated: {} };
    $('set-table').innerHTML = '<tr><th>Level</th>' + SECTION_LABELS.map(function (x) { return '<th>' + esc(x[1]) + '</th>'; }).join('') + '<th>Last changed</th></tr>' +
      LEVEL_LABELS.map(function (lv) {
        var on = st.levels[lv[0]] || [], up = (st.updated || {})[lv[0]];
        return '<tr><td><b>' + esc(lv[1]) + '</b></td>' + SECTION_LABELS.map(function (x) {
          return '<td><input type="checkbox" aria-label="' + esc(lv[1] + ': ' + x[1]) + '" data-level="' + lv[0] + '" data-section="' + x[0] + '"' + (on.indexOf(x[0]) >= 0 ? ' checked' : '') + '></td>';
        }).join('') + '<td><small>' + (up ? esc(up.by || '') + ' · ' + when(up.at) : 'Never set (sees nothing)') + '</small></td></tr>';
      }).join('');
  }
  function saveSettings() {
    var levels = {};
    LEVEL_LABELS.forEach(function (lv) { levels[lv[0]] = []; });
    root.document.querySelectorAll('#set-table input[data-level]').forEach(function (b) { if (b.checked) levels[b.getAttribute('data-level')].push(b.getAttribute('data-section')); });
    busy('set-save', true); $('set-msg').textContent = 'Saving…';
    api('PUT', '/settings', { levels: levels })
      .then(function () { $('set-msg').textContent = 'Saved. Each level sees its new sections on its next refresh (within a minute).'; refresh(); })
      .catch(function (e) { $('set-msg').textContent = e.message; })
      .then(function () { busy('set-save', false); });
  }

  // ---------- wiring ----------
  function renderAll() {
    renderCampaignTabs(); renderHead();
    var fn = { overview: renderOverview, leads: renderIntake, marketing: renderMarketing, litify: renderLitify, summary: renderSummary, settings: renderSettings }[state.view];
    if (fn) fn();
  }
  function allowedViews() { var a = access(); return SECTION_LABELS.map(function (x) { return x[0]; }).filter(function (k) { return k !== 'contact' && can(k); }).concat(a.owner ? ['settings'] : []); }
  function setView(v) {
    var ok = allowedViews();
    if (ok.indexOf(v) < 0) v = ok[0] || '';
    state.view = v;
    $('no-sections').hidden = !!v;
    root.document.querySelectorAll('.section-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-view') === v)); });
    root.document.querySelectorAll('.view').forEach(function (s) { s.hidden = s.getAttribute('data-panel') !== v; });
    renderAll();
  }
  function lock() {
    state.gen++;   // anything in flight from before the lock is ignored when it lands
    state.feed = null; state.litify = null; state.litifyLabel = ''; state.litifyText = ''; state.lead = null; state.token = null; state.failedAt = null;
    if (state.timer) { root.clearInterval(state.timer); state.timer = null; }
    $('app').hidden = true; $('gate').hidden = false; $('lock-btn').hidden = true;
    $('feed-pill').textContent = 'Locked'; $('feed-pill').className = 'pill'; $('token').value = ''; $('code').value = '';
    $('step-code').hidden = true; $('step-email').hidden = state.emailSignIn === false;
    if (state.emailSignIn === false && $('token-alt')) $('token-alt').open = true;
    ['lead-list', 'lead-detail', 'lt-table', 'scoreboard'].forEach(function (id) { var e = $(id); if (e) e.innerHTML = ''; });
  }
  // The daily Make publisher sends flat rows: one per Litify intake (leads) plus one per Sofia
  // transfer (transfers). Fold them into the structured shape the views use. Transfers merge onto
  // the Litify lead with the same phone hash; unmatched transfers become their own lead.
  var STAGE_ORDER = ['received', 'handed_over', 'queued', 'not_reached', 'ai_contacted', 'intake_completed', 'disqualified', 'transferred'];
  function later(a, b) { return STAGE_ORDER.indexOf(b) > STAGE_ORDER.indexOf(a) ? b : a; }
  function normalizeFeed(feed) {
    if (!feed || !Array.isArray(feed.leads)) return feed;
    var flat = feed.leads.some(function (l) { return l && !Array.isArray(l.stages_reached); }) || Array.isArray(feed.transfers) || Array.isArray(feed.litify);
    if (!flat) return feed;
    var str = function (v) { return typeof v === 'string' ? v.trim() : v == null ? '' : String(v); };
    var shape = function (r) {
      var l = { lead_uid: str(r.lead_uid), campaign: str(r.campaign) || 'other', received_at: str(r.received_at) || null, name: str(r.name), phone_last4: str(r.phone_last4),
        phone_hash: str(r.phone_hash), case_type: str(r.case_type), state: str(r.state), channel: str(r.channel), source: str(r.source), stage: str(r.stage) || 'received',
        ai_tracked: r.ai_tracked === true || r.ai_tracked === 'true', ours: r.ours === true || r.ours === 'true', ai_events: [], stages_reached: [],
        recording_url: str(r.recording_url), recording_at: str(r.recording_at) };
      l.stages_reached.push(l.stage);
      if (str(r.litify_intake) || str(r.litify_status)) l.litify = { intake: str(r.litify_intake), created: str(r.litify_created), status: str(r.litify_status), reason: str(r.litify_reason), details: str(r.litify_details) };
      return l;
    };
    // A phone can appear on several Litify intakes; keep one CRM row per person, best status first.
    var rank = function (l) { var s = l.litify && l.litify.status; return s === 'Converted' ? 0 : s && s !== 'Turned Down' ? 1 : s ? 2 : 3; };
    var seen = Object.create(null), byHash = Object.create(null);
    var leads = feed.leads.filter(Boolean).map(shape).sort(function (a, b) { return rank(a) - rank(b); })
      .filter(function (l) { var k = l.phone_hash || l.lead_uid; if (seen[k]) return false; seen[k] = true; return true; });
    leads.forEach(function (l) { if (l.phone_hash) byHash[l.phone_hash] = l; });
    (feed.transfers || []).filter(Boolean).forEach(function (r) {
      var t = shape(r), at = str(r.transfer_at) || t.received_at, outcome = str(r.transfer_outcome);
      var target = (t.phone_hash && byHash[t.phone_hash]) || null;
      if (!target) { target = t; leads.push(t); if (t.phone_hash) byHash[t.phone_hash] = t; }
      else { target.ours = true; if (!target.state) target.state = t.state; if (target.channel === '' || /Unattributed|Legacy/.test(target.channel)) target.channel = t.channel; }
      target.ai_tracked = true;
      var connected = /^Live transfer connected/i.test(outcome);
      target.ai_events.push({ at: at, text: 'Sofia completed intake: ' + (t.case_type || 'claim') + (t.state ? ', ' + t.state : ''), kind: '' });
      target.ai_events.push({ at: at, text: connected ? 'Live transfer connected to ' + firm() : (outcome || 'Transfer attempted'), kind: connected ? 'firm' : 'warn' });
      if (str(r.ai_summary)) target.ai_events.push({ at: at, text: 'Summary: ' + str(r.ai_summary).slice(0, 280), kind: '' });
      ['intake_completed'].concat(connected ? ['transferred'] : []).forEach(function (s) { target.stage = later(target.stage, s); if (target.stages_reached.indexOf(s) < 0) target.stages_reached.push(s); });
      if (connected) target.transfer = { at: at, outcome: 'Live transfer connected' };
    });
    var litify = Array.isArray(feed.litify) ? feed.litify : feed.leads.filter(function (r) { return r && (str(r.litify_intake) || str(r.litify_status)); }).map(function (r) {
      var l = byHash[str(r.phone_hash)];
      return { created: str(r.litify_created), intake: str(r.litify_intake), name: str(r.name), phone_last4: str(r.phone_last4), case_type: str(r.case_type), source: str(r.source).replace(/^Litify · /, ''),
        status: str(r.litify_status), reason: str(r.litify_reason), details: str(r.litify_details), campaign: str(r.campaign) || 'other', match_lead_uid: l && l.ours ? l.lead_uid : null };
    });
    return Object.assign({}, feed, { leads: leads, litify: litify, transfers: undefined });
  }

  function open(feed) {
    feed = normalizeFeed(feed);
    if (!feed || !Array.isArray(feed.leads) || !Array.isArray(feed.campaigns)) throw new Error('This feed is not a Perspective feed yet.');
    state.feed = feed;
    state.campaign = state.campaign || (feed.campaigns[0] && feed.campaigns[0].id) || 'all';
    $('gate').hidden = true; $('app').hidden = false; $('lock-btn').hidden = false;
    var h = feedHealth(feed); $('feed-pill').textContent = h[0]; $('feed-pill').className = 'pill ' + h[1];
    var up = $('lt-upload'); if (up) up.hidden = !(feed.access && feed.access.owner && feed.access.role === 'owner');
    if (firmName()) {
      root.document.title = 'Perspective · ' + firmName();
      root.document.querySelectorAll('[data-firm]').forEach(function (el) { el.textContent = el.getAttribute('data-firm') === 'short' ? firm() : firmName(); });
    }
    // Only the sections this person may open (the server already removed data they can't see).
    var ok = allowedViews();
    root.document.querySelectorAll('.section-tabs [data-view]').forEach(function (b) { b.hidden = ok.indexOf(b.getAttribute('data-view')) < 0; });
    setView(state.view);
  }
  function fetchFeed(token) {
    var opts = { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', credentials: 'omit', redirect: 'error' };
    var get = function (url) {
      return root.fetch(url, opts).then(function (r) {
        if (r.status === 401) throw Object.assign(new Error('That token was not accepted.'), { final: true });
        if (r.status === 404) throw new Error('No data has been published yet.');
        if (!r.ok) throw new Error('Portal data unavailable (HTTP ' + r.status + ').');
        return r.json();
      });
    };
    return get(hub() + '/portal/' + encodeURIComponent(clientId()) + '/feed');
  }
  function post(path, body) {
    return root.fetch(hub() + '/portal/' + encodeURIComponent(clientId()) + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store', credentials: 'omit', redirect: 'error' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && typeof d.detail === 'string' && d.detail) || 'Sign-in unavailable (HTTP ' + r.status + ').');
        return d; }); });
  }
  function applyAuthAvailability(health) {
    if (!health || typeof health.email_sign_in !== 'boolean') return false;
    state.emailSignIn = health.email_sign_in;
    $('step-email').hidden = !state.emailSignIn;
    $('step-code').hidden = true;
    $('send-code').disabled = !state.emailSignIn;
    $('gate-copy').textContent = state.emailSignIn ? EMAIL_SIGN_IN_COPY : TOKEN_SIGN_IN_COPY;
    $('gate-err').textContent = '';
    var alt = $('token-alt');
    if (alt) alt.open = !state.emailSignIn;
    return state.emailSignIn;
  }
  function checkAuthAvailability() {
    var probe = root.fetch(hub() + '/portal/health', { cache: 'no-store', credentials: 'omit', redirect: 'error' })
      .then(function (r) { if (!r.ok) throw new Error('health unavailable'); return r.json(); })
      .then(function (health) { if (!health || typeof health.email_sign_in !== 'boolean') throw new Error('invalid health'); return health; });
    var timer;
    var timeout = new Promise(function (resolve) { timer = root.setTimeout(function () { resolve({ email_sign_in: true }); }, AUTH_CHECK_MS); });
    return Promise.race([probe, timeout]).catch(function () { return { email_sign_in: true }; }).then(function (health) {
      if (timer) root.clearTimeout(timer);
      return applyAuthAvailability(health);
    });
  }
  function busy(id, on) { var b = $(id); if (b) b.disabled = on; }
  function sendCode() {
    var email = ($('email').value || '').trim();
    if (!email) { $('gate-err').textContent = 'Enter your work email.'; return; }
    busy('send-code', true); $('gate-err').textContent = '';
    post('/login', { email: email }).then(function () {
      $('step-email').hidden = true; $('step-code').hidden = false; $('code').value = ''; $('code').focus();
      $('gate-err').textContent = 'If ' + email + ' has access, a code is on its way. Check your inbox.';
    }).catch(function (e) { $('gate-err').textContent = e.message; }).then(function () { busy('send-code', false); });
  }
  function startSession(token, feed) {
    state.gen++; state.token = token; open(feed);
    if (state.timer) root.clearInterval(state.timer);
    state.timer = root.setInterval(refresh, REFRESH_MS);
  }
  function verifyCode() {
    var email = ($('email').value || '').trim(), code = ($('code').value || '').replace(/\D/g, '');
    if (code.length !== 6) { $('gate-err').textContent = 'Enter the 6-digit code from the email.'; return; }
    busy('verify', true); $('gate-err').textContent = '';
    post('/verify', { email: email, code: code })
      .then(function (d) { var gen = state.gen; return fetchFeed(d.session).then(function (feed) { if (gen !== state.gen) return; $('code').value = ''; startSession(d.session, feed); }); })
      .catch(function (e) { $('gate-err').textContent = e.message; }).then(function () { busy('verify', false); });
  }
  function refresh() {
    if (!state.token || root.document.hidden) return;
    var gen = state.gen;
    fetchFeed(state.token).then(function (feed) {
      if (gen !== state.gen || !state.token) return;   // locked (or signed in again) while this was loading
      var view = state.view, lead = state.lead;
      state.failedAt = null; open(feed); state.lead = lead; setView(view);
    }).catch(function (e) {
      if (gen !== state.gen || !state.token) return;
      if (e && e.final) { lock(); $('gate-err').textContent = 'Your session ended. Sign in again.'; return; }
      state.failedAt = new Date().toISOString();
      $('feed-pill').textContent = 'Not refreshed since ' + when(state.feed && state.feed.generated_at); $('feed-pill').className = 'pill bad';
      $('freshness').innerHTML = sourcesHTML(state.feed);
    });
  }
  function unlock() {
    var token = ($('token').value || '').trim(), btn = $('unlock');
    if (!token) { $('gate-err').textContent = 'Enter your access token.'; return; }
    btn.disabled = true; $('gate-err').textContent = '';
    var gen = state.gen;
    fetchFeed(token)
      .then(function (feed) { if (gen !== state.gen) return; $('token').value = ''; startSession(token, feed); })
      .catch(function (e) { $('gate-err').textContent = (e && e.message) || 'Could not load the portal.'; })
      .then(function () { btn.disabled = false; });
  }

  function mount() {
    var d = root.document;
    $('unlock').addEventListener('click', unlock);
    $('send-code').addEventListener('click', sendCode);
    $('email').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendCode(); });
    $('verify').addEventListener('click', verifyCode);
    $('code').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyCode(); });
    $('change-email').addEventListener('click', function () { $('step-code').hidden = true; $('step-email').hidden = false; $('gate-err').textContent = ''; $('email').focus(); });
    $('token').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    $('lock-btn').addEventListener('click', lock);
    root.addEventListener('pagehide', lock);
    $('campaign-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-campaign]'); if (b) { state.campaign = b.getAttribute('data-campaign'); state.lead = null; renderAll(); } });
    d.querySelector('.section-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (b) setView(b.getAttribute('data-view')); });
    $('lead-list').addEventListener('click', function (e) { var b = e.target.closest('[data-lead]'); if (b) { state.lead = b.getAttribute('data-lead'); renderIntake(); } });
    ['q', 'f-stage', 'f-litify'].forEach(function (id) { $(id).addEventListener('input', renderIntake); });
    ['lq', 'l-status', 'l-match'].forEach(function (id) { $(id).addEventListener('input', renderLitify); });
    $('lt-file').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; if (f) loadLitifyFile(f); });
    $('lt-save').addEventListener('click', saveLitify);
    if ($('lt-upload-btn')) $('lt-upload-btn').addEventListener('click', uploadLitify);
    $('lt-table').addEventListener('click', function (e) { var b = e.target.closest('[data-open-lead]'); if (b) { state.lead = b.getAttribute('data-open-lead'); setView('leads'); } });
    $('sm-tasks').addEventListener('change', function (e) { var id = e.target.getAttribute('data-task'); if (id) setTask(id, e.target.checked, e.target); });
    $('task-form').addEventListener('submit', addTask);
    $('set-save').addEventListener('click', saveSettings);
    checkAuthAvailability();
  }

  var exported = { open: open, normalizeFeed: normalizeFeed, parseCSV: parseCSV, campaignForLitify: campaignForLitify, metrics: metrics, _state: state, _refresh: refresh, _lock: lock, _applyAuthAvailability: applyAuthAvailability, _checkAuthAvailability: checkAuthAvailability };
  root.Perspective = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (root.document && root.document.getElementById && root.document.getElementById('gate')) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mount); else mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
