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

  var HUB = 'https://affiliate-hub-tbks.onrender.com';
  // Phillips' pre-hub feed, used only if the live hub is unreachable.
  var FALLBACK = { plg: 'https://legal-web-lead.onrender.com/api/v1/portal/phillips/leads' };
  var REFRESH_MS = 60000;
  var NA = '—';
  var state = { feed: null, campaign: null, view: 'intake', lead: null, litify: null, litifyLabel: '', token: null, timer: null };
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

  // ---------- data selection ----------
  function campaignsAll() { return (state.feed && state.feed.campaigns) || []; }
  function current() {
    var id = state.campaign;
    if (id === 'all') {
      var cs = campaignsAll();
      return { id: 'all', label: 'All campaigns', name: 'All ' + firm() + ' campaigns', state: cs.length + ' campaigns',
        summary: 'Every lead Marketing Apes has sent ' + firm() + ' since the campaigns started, in one place.',
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

  function metrics(c) {
    var leads = leadsFor(c.id), lit = litifyFor(c.id);
    // Cumulative funnel: a transferred lead was also reached and completed intake.
    var has = function (sts) { return leads.filter(function (l) { var r = (l.stages_reached || []).concat([l.stage]); return sts.some(function (s) { return r.indexOf(s) >= 0; }); }).length; };
    var aiTracked = leads.some(function (l) { return l.ai_tracked; });
    var m = {
      leads: leads.length,
      reached: aiTracked ? has(['ai_contacted', 'intake_completed', 'disqualified', 'transferred']) : null,
      intake: aiTracked ? has(['intake_completed', 'transferred']) : null,
      transfers: aiTracked ? has(['transferred']) : null,
      inLitify: leads.filter(function (l) { return l.litify; }).length,
      working: lit.filter(function (r) { return r.status && r.status !== 'Turned Down' && r.status !== 'Converted'; }).length,
      signed: lit.filter(function (r) { return r.status === 'Converted'; }).length,
      budget: c.budget && num(c.budget.amount), spend: c.spend && num(c.spend.amount)
    };
    m.cpl = ratio(m.spend, m.leads); m.cpt = ratio(m.spend, m.transfers); m.cps = ratio(m.spend, m.signed);
    return m;
  }

  // ---------- render: shell ----------
  function renderCampaignTabs() {
    var cs = campaignsAll(), nav = $('campaign-tabs');
    var items = cs.map(function (c) { return { id: c.id, label: c.label, sub: c.state || '' }; });
    items.push({ id: 'all', label: 'All campaigns', sub: leadsFor('all').length + ' leads total' });
    nav.innerHTML = items.map(function (it) {
      var sel = it.id === state.campaign;
      return '<button role="tab" data-campaign="' + esc(it.id) + '" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '"><strong>' + esc(it.label) + '</strong><small>' + esc(it.sub) + '</small></button>';
    }).join('');
  }

  function cell(label, value, note, na) { return '<div class="score"><span class="s-label">' + esc(label) + '</span><span class="s-num' + (na ? ' na' : '') + '">' + value + '</span><span class="s-note">' + esc(note) + '</span></div>'; }

  function renderHero() {
    var c = current(), m = metrics(c);
    $('c-eyebrow').textContent = c.id === 'all' ? 'ALL CAMPAIGNS' : 'CAMPAIGN';
    $('c-title').textContent = c.name || c.label || '';
    $('c-summary').textContent = c.summary || '';
    $('c-state').textContent = c.state || '';
    var spendNote = c.spend && c.spend.as_of ? 'Platform spend as of ' + day(c.spend.as_of) : 'Ad platform spend not connected';
    $('scoreboard').innerHTML = [
      cell('Total leads', fmtInt(m.leads), m.inLitify + ' found in your Litify report'),
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
    var src = (state.feed.sources || []).map(function (s) { return esc(s.label) + ' ' + day(s.as_of); }).join(' · ');
    $('freshness').innerHTML = 'Updated ' + when(state.feed.generated_at) + (src ? ' · Sources: ' + src : '') + (state.litifyLabel ? ' · Litify: ' + esc(state.litifyLabel) : '');
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
    fillSelect($('f-litify'), sortedEntries(countBy(leads, function (l) { return (l.litify && l.litify.status) || 'Not in Litify'; })).map(function (e) { return [e[0], e[0] + ' (' + e[1] + ')']; }), 'All Litify statuses');
    var q = ($('q').value || '').toLowerCase().trim(), fs = $('f-stage').value, fl = $('f-litify').value;
    var rows = leads.filter(function (l) {
      if (fs && l.stage !== fs) return false;
      if (fl && ((l.litify && l.litify.status) || 'Not in Litify') !== fl) return false;
      if (!q) return true;
      return [l.name, l.phone_last4, l.lead_uid, l.litify && l.litify.intake].join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return String(b.received_at || '').localeCompare(String(a.received_at || '')); });
    $('lead-list').innerHTML = rows.length ? rows.map(function (l) {
      return '<button class="lead-row" role="listitem" data-lead="' + esc(l.lead_uid) + '" aria-pressed="' + (state.lead === l.lead_uid) + '"><span><b>' + esc(l.name || 'Name not captured') + '</b><small>' + esc(l.case_type || l.claim || '') + ' · ' + day(l.received_at) + (l.phone_last4 ? ' · …' + esc(l.phone_last4) : '') + '</small></span>' +
        '<span class="mid">' + stageTag(l.stage) + '<small>' + esc(l.channel || l.source || '') + '</small></span><span>' + litifyTag(l.litify && l.litify.status) + '</span></button>';
    }).join('') : '<p style="padding:16px">No leads match these filters.</p>';
    $('list-count').textContent = rows.length + ' of ' + leads.length + ' leads';
    renderDetail();
  }
  function renderDetail() {
    var l = leadsFor('all').filter(function (x) { return x.lead_uid === state.lead; })[0], box = $('lead-detail');
    if (!l) { box.innerHTML = '<div class="eyebrow">LEAD DETAIL</div><p style="margin-top:10px">Select a lead to see what the AI did, the transfer, and what ' + esc(firm()) + ' reported back.</p>'; return; }
    var ev = (l.ai_events || []).slice().sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    var lit = l.litify || {};
    box.innerHTML = '<div class="eyebrow">LEAD DETAIL</div><h2 style="margin-top:8px">' + esc(l.name || 'Name not captured') + '</h2>' + stageTag(l.stage) + ' ' + litifyTag(lit.status) +
      '<dl class="kv"><dt>Lead ID</dt><dd>' + esc(l.lead_uid) + '</dd><dt>Received</dt><dd>' + when(l.received_at) + '</dd><dt>Phone</dt><dd>' + (l.phone_last4 ? '…' + esc(l.phone_last4) : NA) + '</dd><dt>State</dt><dd>' + esc(l.state || NA) + '</dd>' +
      '<dt>Claim</dt><dd>' + esc(l.case_type || l.claim || NA) + '</dd><dt>Source</dt><dd>' + esc([l.channel, l.source].filter(Boolean).join(' · ') || NA) + '</dd>' +
      (l.ad ? '<dt>Ad</dt><dd>' + esc(l.ad) + '</dd>' : '') +
      (l.transfer ? '<dt>Transfer</dt><dd>' + esc(l.transfer.outcome || '') + ' · ' + when(l.transfer.at) + '</dd>' : '') +
      '<dt>Litify intake</dt><dd>' + esc(lit.intake || NA) + (lit.created ? ' · created ' + esc(lit.created) : '') + '</dd>' +
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
      ['Cost per lead', fmtMoney(m.cpl, true), m.leads + ' leads']
    ].map(function (x) { return '<div class="panel"><div class="eyebrow">' + esc(x[0]) + '</div><div class="s-num" style="font-size:34px">' + x[1] + '</div><p style="margin:0">' + esc(x[2]) + '</p></div>'; }).join('');
    var byChan = countBy(leads, function (l) { return l.channel || l.source || 'Unknown'; });
    var chans = (c.channels || []).slice();
    Object.keys(byChan).forEach(function (k) { if (!chans.some(function (x) { return x.name === k; })) chans.push({ name: k }); });
    $('mk-channels').innerHTML = '<tr><th>Channel</th><th class="num">Our leads</th><th class="num">Platform-reported</th><th class="num">Spend</th><th class="num">CPL</th><th class="num">Clicks</th></tr>' +
      chans.map(function (ch) { var n = byChan[ch.name] || 0; return '<tr><td>' + esc(ch.name) + (ch.status ? ' <span class="tag mute">' + esc(ch.status) + '</span>' : '') + '</td><td class="num">' + fmtInt(n) + '</td><td class="num">' + fmtInt(ch.platform_leads) + '</td><td class="num">' + fmtMoney(ch.spend) + '</td><td class="num">' + fmtMoney(ratio(ch.spend, n), true) + '</td><td class="num">' + fmtInt(ch.clicks) + '</td></tr>'; }).join('');
    var weeks = countBy(leads, function (l) { if (!l.received_at) return null; var d = new Date(l.received_at); if (isNaN(d)) return null; d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); });
    var wk = Object.keys(weeks).sort(), max = Math.max.apply(null, wk.map(function (k) { return weeks[k]; }).concat([1]));
    $('mk-weeks').innerHTML = wk.length ? wk.map(function (k) { return '<div class="bar"><span>Week of ' + day(k + 'T12:00:00Z') + '</span><span class="track"><span class="fill" style="width:' + (weeks[k] / max * 100) + '%;display:block"></span></span><b>' + weeks[k] + '</b></div>'; }).join('') : '<p>No dated leads.</p>';
    var ads = c.ads || [];
    $('mk-ads').innerHTML = ads.length ? ads.map(function (a) { return '<div class="ad">' + (a.image ? '<img alt="" loading="lazy" src="' + esc(a.image) + '">' : '') + '<div><b>' + esc(a.name) + '</b><br>' + esc([a.channel, a.status].filter(Boolean).join(' · ')) + (num(a.leads) !== null ? '<br>' + a.leads + ' leads' : '') + (num(a.spend) !== null ? ' · ' + fmtMoney(a.spend) : '') + '</div></div>'; }).join('') : '<p>No creative attached to this campaign yet.</p>';
    var log = (c.log || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    $('mk-log').innerHTML = log.length ? '<tr><th>Date</th><th>Change</th><th>Why</th></tr>' + log.map(function (x) { return '<tr><td>' + day(x.date) + '</td><td>' + esc(x.change) + '</td><td>' + esc(x.why || '') + '</td></tr>'; }).join('') : '<tr><td>No logged changes yet.</td></tr>';
  }

  // ---------- litify match ----------
  function renderLitify() {
    var rows = litifyFor(state.campaign);
    var matched = rows.filter(function (r) { return r.match_lead_uid; }).length;
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
      if (fm === 'matched' && !r.match_lead_uid) return false;
      if (fm === 'unmatched' && r.match_lead_uid) return false;
      return !q || [r.intake, r.name, r.phone_last4].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    $('lt-table').innerHTML = '<tr><th>Created</th><th>Intake</th><th>Client</th><th>Case type</th><th>Status</th><th>Reason</th><th>Our lead</th></tr>' +
      shown.slice(0, 600).map(function (r) { return '<tr><td>' + esc(r.created || '') + '</td><td>' + esc(r.intake || '') + '</td><td>' + esc(r.name || '') + (r.phone_last4 ? '<br><small>…' + esc(r.phone_last4) + '</small>' : '') + '</td><td>' + esc(r.case_type || '') + '</td><td>' + litifyTag(r.status) + '</td><td>' + esc(r.reason || '') + '</td><td>' + (r.match_lead_uid ? '<button class="btn ghost" style="padding:4px 8px" data-open-lead="' + esc(r.match_lead_uid) + '">Open</button>' : '<span class="tag mute">No match</span>') + '</td></tr>'; }).join('');
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
      var raw = parseCSV(String(reader.result || ''));
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
        $('lt-fileinfo').textContent = raw.length + ' rows read from ' + file.name + '. Nothing was uploaded.';
        renderAll();
      });
    };
    reader.readAsText(file);
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
  function checkKey(c, n) { return 'perspective:check:' + (n.campaign || c.id) + ':' + (n.id || n.label); }
  function getCheck(k, dflt) { try { var v = root.localStorage.getItem(k); return v === null ? !!dflt : v === '1'; } catch (e) { return !!dflt; } }
  function setCheck(k, v) { try { root.localStorage.setItem(k, v ? '1' : '0'); } catch (e) { /* storage blocked */ } }
  function renderSummary() {
    var c = current(), m = metrics(c);
    $('sm-head').textContent = (c.label || '') + ': ' + fmtInt(m.leads) + ' leads, ' + fmtInt(m.signed) + ' signed';
    var auto = [
      fmtInt(m.leads) + ' leads sent; ' + fmtInt(m.inLitify) + ' appear in your Litify report.',
      fmtInt(m.signed) + ' converted, ' + fmtInt(m.working) + ' still being worked.',
      m.transfers !== null ? fmtInt(m.transfers) + ' live transfers from AI intake.' : 'AI transfer tracking does not cover these leads.',
      m.spend !== null ? fmtMoney(m.spend) + ' spent' + (m.cpl !== null ? ' · ' + fmtMoney(m.cpl, true) + ' per lead' : '') + '.' : 'Spend not connected for this view.'
    ];
    $('sm-body').innerHTML = '<ul style="padding-left:18px;margin:6px 0 14px;line-height:1.7;font-size:14px">' + auto.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      (c.narrative || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    var needs = c.needs || [];
    $('sm-checklist').innerHTML = needs.length ? needs.map(function (n, i) {
      var k = checkKey(c, n), on = getCheck(k, n.done);
      return '<li><input type="checkbox" id="need-' + i + '" data-key="' + esc(k) + '"' + (on ? ' checked' : '') + '><label for="need-' + i + '"><b>' + esc(n.label) + '</b> <span class="tag ' + (n.owner && n.owner !== 'Marketing Apes' ? 'warn' : '') + '">' + esc(n.owner || 'Marketing Apes') + '</span>' + (n.campaign ? ' <span class="tag mute">' + esc(n.campaign) + '</span>' : '') + '<small>' + esc(n.detail || '') + '</small></label></li>';
    }).join('') : '<li>No open items.</li>';
  }

  // ---------- wiring ----------
  function renderAll() {
    renderCampaignTabs(); renderHero();
    ({ intake: renderIntake, marketing: renderMarketing, litify: renderLitify, summary: renderSummary })[state.view]();
  }
  function setView(v) {
    state.view = v;
    root.document.querySelectorAll('.section-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-view') === v)); });
    root.document.querySelectorAll('.view').forEach(function (s) { s.hidden = s.getAttribute('data-panel') !== v; });
    renderAll();
  }
  function lock() {
    state.feed = null; state.litify = null; state.litifyLabel = ''; state.lead = null; state.token = null;
    if (state.timer) { root.clearInterval(state.timer); state.timer = null; }
    $('app').hidden = true; $('gate').hidden = false; $('lock-btn').hidden = true;
    $('feed-pill').textContent = 'Locked'; $('feed-pill').className = 'pill'; $('token').value = '';
    ['lead-list', 'lead-detail', 'lt-table', 'scoreboard'].forEach(function (id) { var e = $(id); if (e) e.innerHTML = ''; });
  }
  // The daily Make publisher sends flat rows: one per Litify intake (leads) plus one per Sofia
  // transfer (transfers). Fold them into the structured shape the views use. Transfers merge onto
  // the Litify lead with the same phone hash; unmatched transfers become their own lead.
  var STAGE_ORDER = ['received', 'handed_over', 'queued', 'not_reached', 'ai_contacted', 'intake_completed', 'disqualified', 'transferred'];
  function later(a, b) { return STAGE_ORDER.indexOf(b) > STAGE_ORDER.indexOf(a) ? b : a; }
  function normalizeFeed(feed) {
    if (!feed || !Array.isArray(feed.leads)) return feed;
    var flat = feed.leads.some(function (l) { return l && ('litify_status' in l || 'transfer_outcome' in l); }) || Array.isArray(feed.transfers);
    if (!flat) return feed;
    var str = function (v) { return typeof v === 'string' ? v.trim() : v == null ? '' : String(v); };
    var shape = function (r) {
      var l = { lead_uid: str(r.lead_uid), campaign: str(r.campaign) || 'other', received_at: str(r.received_at) || null, name: str(r.name), phone_last4: str(r.phone_last4),
        phone_hash: str(r.phone_hash), case_type: str(r.case_type), state: str(r.state), channel: str(r.channel), source: str(r.source), stage: str(r.stage) || 'received',
        ai_tracked: r.ai_tracked === true || r.ai_tracked === 'true', ours: r.ours === true || r.ours === 'true', ai_events: [], stages_reached: [] };
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
    var litify = feed.leads.filter(function (r) { return r && (str(r.litify_intake) || str(r.litify_status)); }).map(function (r) {
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
    $('feed-pill').textContent = 'Live · ' + feed.leads.length + ' leads'; $('feed-pill').className = 'pill ok';
    if (firmName()) {
      root.document.title = 'Perspective · ' + firmName();
      root.document.querySelectorAll('[data-firm]').forEach(function (el) { el.textContent = el.getAttribute('data-firm') === 'short' ? firm() : firmName(); });
    }
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
    var c = clientId();
    return get(HUB + '/portal/' + encodeURIComponent(c) + '/feed').catch(function (e) {
      if (e.final || !FALLBACK[c]) throw e;
      return get(FALLBACK[c]);
    });
  }
  function refresh() {
    if (!state.token || root.document.hidden) return;
    fetchFeed(state.token).then(function (feed) {
      var view = state.view, lead = state.lead;
      open(feed); state.lead = lead; setView(view);
    }).catch(function () { $('feed-pill').textContent = 'Reconnecting…'; $('feed-pill').className = 'pill warn'; });
  }
  function unlock() {
    var token = ($('token').value || '').trim(), btn = $('unlock');
    if (!token) { $('gate-err').textContent = 'Enter your access token.'; return; }
    btn.disabled = true; $('gate-err').textContent = '';
    fetchFeed(token)
      .then(function (feed) {
        $('token').value = ''; state.token = token; open(feed);
        if (state.timer) root.clearInterval(state.timer);
        state.timer = root.setInterval(refresh, REFRESH_MS);
      })
      .catch(function (e) { $('gate-err').textContent = (e && e.message) || 'Could not load the portal.'; })
      .then(function () { btn.disabled = false; });
  }

  function mount() {
    var d = root.document;
    $('unlock').addEventListener('click', unlock);
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
    $('lt-table').addEventListener('click', function (e) { var b = e.target.closest('[data-open-lead]'); if (b) { state.lead = b.getAttribute('data-open-lead'); setView('intake'); } });
    $('sm-checklist').addEventListener('change', function (e) { var k = e.target.getAttribute('data-key'); if (k) setCheck(k, e.target.checked); });
  }

  var api = { open: open, normalizeFeed: normalizeFeed, parseCSV: parseCSV, campaignForLitify: campaignForLitify, metrics: metrics, _state: state };
  root.Perspective = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document && root.document.getElementById && root.document.getElementById('gate')) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mount); else mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
