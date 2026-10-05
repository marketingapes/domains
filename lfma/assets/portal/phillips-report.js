/* Phillips portal — campaign-to-outcome report.
 * Renders ee.phillips_portal_report/v1 from the token-gated report API. This file holds no data:
 * nothing is shown until a valid portal token returns a report, and the token is kept in memory
 * only (never in storage, the URL or the DOM).
 *
 * Display rules (mirrors of the API's own rules, so a bad payload still cannot overclaim):
 * - A cell whose state is "unknown", or whose count is null, is shown as "Unknown" — never 0.
 * - Pending work is shown as pending, never added to a count.
 * - "Signed retainer" shows only signed_retainer_confirmed. Converted-without-proof is listed
 *   separately as unverified.
 * - Platform-reported conversions are shown per row with that row's attribution window and are
 *   never totalled.
 */
(function (root) {
  'use strict';

  var REPORT_API = 'https://legal-web-lead.onrender.com/api/v1/portal/phillips/report';
  var STAGES = [
    ['submission', 'Submissions'],
    ['queued_callback', 'Callbacks queued'],
    ['call_placed', 'Calls placed'],
    ['intake_completed', 'Intakes completed'],
    ['transfer_attempted', 'Transfers attempted'],
    ['firm_receipt_verified', 'Firm receipt verified'],
    ['firm_accepted', 'Firm accepted'],
    ['signed_retainer_confirmed', 'Signed retainer confirmed']
  ];
  var SOURCE_STATUS = {
    fresh: ['Fresh', ''],
    stale: ['Stale', 'warn'],
    not_connected: ['Not connected', 'warn'],
    unknown: ['Unknown', 'warn']
  };
  var WINDOW_TEXT = {
    '1_day': '1-day', '90_day': '90-day', none: 'none', not_applicable_native_form: 'n/a (native form)'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(value) { return typeof value === 'number' && isFinite(value) ? value : null; }
  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }

  /** Text for one stage cell. Returns { text, cls, sub }. Unknown is never rendered as a number. */
  function cellView(cell) {
    var c = cell || {};
    var count = Number.isSafeInteger(c.count) && c.count >= 0 ? c.count : null;
    var state = c.state;
    var sub = [];
    if (state === 'unknown' || count === null && state !== 'pending') return { text: 'Unknown', cls: 'unk', sub: 'no source has reported' };
    if (state !== 'known' && state !== 'partial' && state !== 'pending') return { text: 'Unknown', cls: 'unk', sub: 'unrecognised state' };
    if (num(c.pending) > 0) sub.push(c.pending + ' pending');
    if (num(c.unknown) > 0) sub.push(c.unknown + ' unknown');
    if (c.caveat === 'source_not_fresh') sub.push('source not fresh');
    if (state === 'pending' && count === null) return { text: 'Pending', cls: 'pend', sub: sub.join(' · ') };
    return { text: String(count), cls: state === 'known' ? 'ok' : 'pend', sub: sub.join(' · ') };
  }

  function money(spend) {
    var v = spend && spend.state === 'known' ? num(spend.value) : null;
    return v === null ? 'Unknown' : '$' + v.toFixed(2);
  }

  function windowText(w) {
    if (!w) return 'Unknown';
    var t = (WINDOW_TEXT[w.click] || esc(w.click)) + ' click / ' + (WINDOW_TEXT[w.view] || esc(w.view)) + ' view';
    return t + (w.verified ? '' : ' (unverified)');
  }

  function renderSources(sources) {
    var rows = (sources || []).map(function (s) {
      var st = SOURCE_STATUS[s.status] || SOURCE_STATUS.unknown;
      var auth = s.auth === 'failed' ? ' · sign-in failed' : '';
      return '<tr><td><b>' + esc(s.label) + '</b><span class="sub">feeds: ' + esc((s.feeds || []).join(', ').replace(/_/g, ' ')) + '</span></td>' +
        '<td><span class="pill ' + st[1] + '">' + st[0] + '</span></td>' +
        '<td>' + esc(when(s.last_success_at)) + '<span class="sub">' + (num(s.age_hours) === null ? 'never' : esc(s.age_hours) + 'h ago · allowed ' + esc(s.max_age_hours) + 'h') + esc(auth) + '</span></td>' +
        '<td>' + esc(s.owner || 'Unknown') + '</td></tr>';
    }).join('');
    return '<div class="sec"><h3>Source freshness</h3><p class="intro">Where each number comes from and when that source last delivered. A stage is only as current as its source.</p>' +
      '<div style="overflow-x:auto"><table><tr><th>Source</th><th>Status</th><th>Last delivery</th><th>Owner</th></tr>' + rows + '</table></div></div>';
  }

  function identityLine(id) {
    var parts = [id.platform === 'meta' ? 'Meta' : id.platform === 'google' ? 'Google' : esc(id.platform), 'account ' + esc(id.account_id), 'campaign ' + esc(id.campaign_id)];
    if (id.form_id) parts.push('form ' + esc(id.form_id));
    return parts.join(' · ');
  }

  function renderRow(r) {
    var id = r.identity || {};
    var landing = r.landing || {};
    var conv = r.conversion || {};
    var convText = conv.conversion_action_id ? 'conversion action ' + esc(conv.conversion_action_id) + ' (goal ' + esc(conv.goal_id) + ')'
      : conv.pixel_id ? 'pixel ' + esc(conv.pixel_id) : 'native lead form';
    var pr = r.platform_reported || {};
    var prText = pr.state === 'known' && num(pr.conversions) !== null ? String(pr.conversions) : 'Unknown';
    var cells = STAGES.map(function (s) {
      var v = cellView((r.stages || {})[s[0]]);
      return '<td class="oc-' + v.cls + '"><b>' + esc(v.text) + '</b>' + (v.sub ? '<span class="sub">' + esc(v.sub) + '</span>' : '') + '</td>';
    }).join('');
    var cfg = r.configured || {};
    return '<div class="oc-row"><div class="oc-head"><b>' + esc(id.brand_account) + ' · ' + esc(String(id.campaign_type || '').replace(/_/g, ' ')) + '</b>' +
      '<span class="pill warn">Configured: ' + esc(cfg.state || 'unknown') + '</span></div>' +
      '<p class="oc-meta">' + identityLine(id) + '<br>Lands on: ' + esc(landing.domain || 'in-platform form') + ' · intake: ' + esc(landing.intake_tenant || 'Unknown') +
      ' · reports to: ' + convText + '<br>Budget on record: ' + (num(cfg.daily_budget_usd) === null ? 'Unknown' : '$' + esc(cfg.daily_budget_usd) + '/day') + ' (as of ' + esc(cfg.as_of) + ') · Attribution window: ' + windowText(r.attribution_window) + '</p>' +
      '<div style="overflow-x:auto"><table class="oc-table"><tr><th>Spend</th><th>Platform-reported</th>' + STAGES.map(function (s) { return '<th>' + s[1] + '</th>'; }).join('') + '</tr>' +
      '<tr><td><b>' + esc(money(r.spend)) + '</b><span class="sub">Period: ' + esc(r.spend && r.spend.period || 'not supplied') + '<br>As of: ' + esc(when(r.spend && r.spend.as_of)) + '</span></td><td><b>' + esc(prText) + '</b><span class="sub">platform count, this row’s window<br>As of: ' + esc(when(pr.as_of)) + '</span></td>' + cells + '</tr></table></div></div>';
  }

  function renderUnmatched(unmatched) {
    var u = unmatched || { count: 0, rows: [] };
    if (!u.count) return '<div class="sec"><h3>Unmatched firm records</h3><p class="intro">No unmatched records are stored. This does not prove the firm feed is connected or complete.</p></div>';
    var rows = (u.rows || []).map(function (x) {
      return '<tr><td>' + esc(x.report_date || '—') + '</td><td>' + esc(String(x.status || 'unknown').replace(/_/g,' ')) + '<span class="sub">reads as: ' + esc(String(x.status || '').replace(/_/g, ' ')) + ' — not counted</span></td>' +
        '<td>' + esc(String(x.reason || '').replace(/_/g, ' ')) + '</td><td>' + esc(x.source === 'form_status' ? 'Form status' : 'Daily report') + '</td></tr>';
    }).join('');
    return '<div class="sec"><h3>Unmatched firm records</h3><p class="intro">' + esc(u.count) + ' firm record(s) could not be tied to one lead. They are not counted anywhere above until reconciled.</p>' +
      '<div style="overflow-x:auto"><table><tr><th>Report date</th><th>Firm status</th><th>Why unmatched</th><th>Source</th></tr>' + rows + '</table></div></div>';
  }

  function renderOperations(ops) {
    var ex = ops && ops.executor;
    var body;
    if (!ex || ex.status === 'unverified') {
      body = '<span class="pill warn">Unknown</span> Website callback worker: no worker has identified itself. A queued callback is not evidence that a call will be placed.';
    } else if (ex.status === 'last_seen_stale') {
      body = '<span class="pill warn">Stale</span> Website callback worker (' + esc(ex.owner) + ') last seen ' + esc(when(ex.last_seen_at)) + '.';
    } else if (ex.status === 'verified_recent') {
      body = '<span class="pill">Seen</span> Website callback worker (' + esc(ex.owner) + ') last seen ' + esc(when(ex.last_seen_at)) + '.';
    }
    else body = '<span class="pill warn">Unknown</span> Worker evidence is not recognized.';
    if (ops && num(ops.unreadable_lead_records) > 0) body += ' Some indexed lead records could not be read; totals are incomplete.';
    return '<div class="sec"><h3>Operational unknowns</h3><div class="gapnote">' + body + '</div></div>';
  }

  function render(report) {
    if (!report || report.schema !== 'ee.phillips_portal_report/v1' || !Array.isArray(report.rows) || report.rows.some(function(r){return !r || !r.identity || !r.stages;})) {
      return '<div class="gapnote">The report could not be read. Nothing is shown rather than showing numbers that may be wrong.</div>';
    }
    var ex = report.excluded || {};
    var firm = (report.firm_status && report.firm_status.counts) || {};
    var un = report.unattributed || {};
    var comp = report.comparability || {};
    return '<p class="intro">Generated ' + esc(when(report.generated_at)) + ' · campaign configuration as of ' + esc(report.registry_as_of) + '. “Unknown” means no source has reported — it is not zero.</p>' +
      '<p class="oc-cohort">' + esc(report.cohort && report.cohort.note || 'Stage counts cover retained indexed leads only. Delivery completeness has not been reconciled.') + '</p>' +
      renderSources(report.sources) +
      '<div class="sec"><h3>Campaign to outcome</h3>' +
      '<div class="gapnote">' + esc(comp.note || '') + '</div>' +
      report.rows.map(renderRow).join('') + '</div>' +
      '<div class="sec"><h3>Kept out of the numbers above</h3><p class="body">Test records: ' + esc(num(ex.test) === null ? 'Unknown' : ex.test) +
      ' · dry runs: ' + esc(num(ex.dry_run) === null ? 'Unknown' : ex.dry_run) +
      ' · leads from superseded campaigns: ' + esc(num(ex.superseded_campaign) === null ? 'Unknown' : ex.superseded_campaign) +
      ' · leads with no campaign identity: ' + esc(num(un.leads) === null ? 'Unknown' : un.leads) +
      '<br>Reported conversion without signed confirmation (not counted as signed): ' + esc(typeof firm.converted_unverified === 'number' ? firm.converted_unverified : 'Unknown') + '</p></div>' +
      renderUnmatched(report.unmatched) +
      renderOperations(report.operations);
  }

  // ---- Client perspective (ee.phillips_client_perspective/v1) ------------------------------------
  // Deidentified projection of the original Sheets, stored by the operator behind the same token.
  // Campaign switcher (MVA first) × Overview / Leads / Marketing / Next steps. Unknown stays Unknown.

  var CP_SECTIONS = [['overview', 'Campaign overview'], ['leads', 'Leads'], ['marketing', 'Marketing'], ['next', 'Next steps']];
  var CP_PAGE = 40;
  var HANDOFF_TEXT = {
    api_success: 'Sent by API (success logged)', delivered_per_ledger: 'Sent per ledger (no API log row)', inbound_call: 'Inbound call to firm line',
    not_sent: 'Not sent', firm_record_only: 'Firm record only', unknown: 'No delivery evidence'
  };
  var ATTR_TEXT = { platform_record: 'Meta lead-ad record', utm_reported: 'UTM on submission', call_tracking_label: 'Call-tracking label', unavailable: 'Unavailable' };
  var CREATIVE_RE = /^[a-z0-9-]+\.(?:png|jpe?g)$/;

  function usd(v) { return num(v) === null ? 'Unknown' : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function span(p) { return p && p.start ? esc(p.start) + (p.end && p.end !== p.start ? ' → ' + esc(p.end) : '') : 'No dated rows'; }
  function label(s) { return esc(String(s == null ? '' : s).replace(/_/g, ' ')); }
  function idList(ids) {
    var out = [];
    Object.keys(ids || {}).forEach(function (k) { (ids[k] || []).forEach(function (v) { out.push(esc(v)); }); });
    return out.length ? out.join('<br>') : 'No explicit ID';
  }
  function kpi(v, l, n, gap) { return '<div class="kpi' + (gap ? ' gap' : '') + '"><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div>' + (n ? '<div class="n">' + n + '</div>' : '') + '</div>'; }

  function cpPlatformTable(ps, withLane) {
    if (!ps || ps.state !== 'known') return '';
    return '<div class="oc-scroll"><table><tr><th>Month</th><th>Campaign</th>' + (withLane ? '<th>Lane (by name)</th>' : '') + '<th>Account</th><th>Spend</th></tr>' +
      (ps.campaigns || []).map(function (r) { return '<tr><td>' + esc(r.month) + '</td><td><b>' + esc(r.campaign) + '</b><span class="sub">' + esc(r.platform) + ' · ' + esc(r.campaign_id) + '</span></td>' + (withLane ? '<td>' + esc(r.lane_label) + '</td>' : '') + '<td>' + esc(r.account) + '</td><td>' + esc(usd(r.spend_usd)) + '</td></tr>'; }).join('') + '</table></div>';
  }

  function cpAllOverview(c) {
    var ps = c.platform_spend || {}, ls = c.leads_summary || {};
    var html = '<div class="kpis">' +
      kpi(esc(usd(ps.total_usd)), 'Platform spend since Apr 1', esc('All checked Meta and Google accounts · pulled ' + when(ps.pulled_at)), ps.state !== 'known') +
      kpi(esc(ls.counted), 'Leads in sources', esc((ls.excluded || 0) + ' tests/spam listed below, not counted')) +
      kpi(esc((c.batches || []).reduce(function (n, b) { return n + b.intakes; }, 0)), 'Sent in bulk batch', esc((c.batches || []).map(function (b) { return b.date; }).join(', '))) +
      kpi('Unknown', 'Signed', esc(ls.signed_note || ''), true) + '</div>';
    var lanes = {};
    (c.timeline || []).forEach(function (t) { Object.keys(t.spend_by_lane || {}).forEach(function (k) { lanes[k] = 1; }); });
    var lk = Object.keys(lanes);
    html += '<div class="sec" style="margin-top:20px"><h3>Month by month · spend and leads</h3><div class="oc-scroll"><table class="cp-timeline"><tr><th>Month</th><th>Spend</th>' + lk.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '<th>Leads</th><th>By campaign</th><th>API sends</th></tr>' +
      (c.timeline || []).map(function (t) {
        return '<tr><td><b>' + esc(t.month) + '</b></td><td><b>' + esc(usd(t.spend_total_usd)) + '</b></td>' + lk.map(function (k) { return '<td>' + (t.spend_by_lane[k] ? esc(usd(t.spend_by_lane[k])) : '<span class="cp-dim">—</span>') + '</td>'; }).join('') +
          '<td><b>' + esc(t.leads) + '</b></td><td>' + Object.keys(t.leads_by_campaign || {}).map(function (k) { return esc(k) + ' ' + esc(t.leads_by_campaign[k]); }).join('<br>') + '</td><td>' + esc(t.sent_api_success) + '</td></tr>';
      }).join('') + '</table></div><p class="oc-period">Leads are counted in the month Phillips created the intake, or else the submission or send date. Spend is platform-reported and placed in lanes by campaign name.</p></div>';
    (c.batches || []).forEach(function (b) {
      var obj = function (o) { return Object.keys(o || {}).map(function (k) { return esc(k) + ' ' + esc(o[k]); }).join(' · '); };
      html += '<div class="sec"><h3>Bulk batch · ' + esc(b.date) + '</h3><div class="note"><div class="nt">' + esc(b.intakes) + ' intakes created by Phillips on ' + esc(b.date) + ' — ' + esc(b.source) + '</div><div class="nb">Case types: ' + obj(b.case_types) +
        '<br>Firm status: ' + obj(b.firm_status) + '<br>Firm reasons: ' + obj(b.firm_reasons) + '<br><span class="cp-dim">' + esc(b.origin_note) + '</span></div></div></div>';
    });
    html += '<div class="sec"><h3>Tests and spam · ' + esc((c.tests || []).length) + ' records, excluded from counts</h3>' + ((c.tests || []).length ? '<div class="oc-scroll"><table><tr><th>Date</th><th>Kind</th><th>IDs</th><th>Campaign</th><th>Ledger channel</th><th>Firm status</th></tr>' +
      c.tests.map(function (t) { return '<tr><td>' + esc(String(t.date || '—').replace('T', ' ')) + '</td><td><span class="pill warn">' + esc(t.kind) + '</span></td><td>' + idList(t.ids) + '</td><td>' + esc(t.campaign) + '</td><td>' + esc(t.channel || '—') + '</td><td>' + esc(t.status || '—') + '</td></tr>'; }).join('') + '</table></div>' : '<p class="intro">None.</p>') + '</div>';
    html += '<div class="sec"><h3>Coverage gaps</h3><div class="notes">' + (c.coverage_gaps || []).map(function (g) { return '<div class="note"><div class="nd">' + label(g.kind) + '</div><div class="nb">' + esc(g.detail) + '</div></div>'; }).join('') + '</div></div>';
    return html;
  }

  function cpOverview(c, p) {
    if (c.scope === 'all') return cpAllOverview(c);
    var s = c.spend || {}, b = c.planned_budget || {}, ls = c.leads_summary || {};
    var planned = b.state === 'known' ? usd(b.total_usd) : 'Unknown';
    var plannedNote = b.state === 'known' ? esc(b.duration_days + ' days · ' + (b.source || '')) + (b.allocation ? '<br>' + Object.keys(b.allocation).map(function (k) { return label(k.replace(/_usd$/, '')) + ' ' + usd(b.allocation[k]); }).join(' · ') : '') : esc(b.note || 'Not in any source');
    var spent = s.state && s.state !== 'unknown' ? usd(s.total_usd) : 'Unknown';
    var hand = ls.handoff || {};
    var html = '<div class="kpis">' +
      kpi(esc(planned), 'Planned budget', plannedNote, b.state !== 'known') +
      kpi(esc(spent), 'Actual spend', s.period ? 'Period ' + span(s.period) + ' · ' + esc(s.days_reported) + ' days reported' : 'No spend source', spent === 'Unknown') +
      kpi(esc(num(ls.counted) === null ? 'Unknown' : ls.counted), 'Leads in sources', esc((ls.excluded || 0) + ' test/spam excluded · not unique people')) +
      kpi(esc(hand.api_success || 0), 'Sent with API success', 'Sending is not firm acceptance') +
      kpi(esc(ls.retainer_sent_or_flagged || 0), 'Retainer sent or flagged', 'Firm-reported; not signed') +
      kpi('Unknown', 'Signed', esc(ls.signed_note || 'No executed-retainer evidence'), true) +
      (c.platform_spend && c.platform_spend.state === 'known' ? kpi(esc(usd(c.platform_spend.total_usd)), 'Platform spend since Apr 1', esc('By campaign name · separate from the daily sheet')) : '') + '</div>';
    if (b.state === 'known' && b.note) html += '<p class="gapnote">' + esc(b.note) + '</p>';
    var statuses = ls.statuses || {};
    html += '<div class="sec" style="margin-top:20px"><h3>Firm status today</h3><div class="cp-chips">' + Object.keys(statuses).map(function (k) { return '<span class="pill' + (/turned down/i.test(k) ? '' : ' warn') + '">' + esc(k) + ' · ' + esc(statuses[k]) + '</span>'; }).join(' ') + '</div></div>';
    var srcs = (p.sources || []).filter(function (x) { return cpSourceCampaign(x, c.key); });
    html += '<div class="sec"><h3>Source periods</h3><div class="oc-scroll"><table><tr><th>Source</th><th>Rows</th><th>Period</th><th>Workbook updated</th></tr>' +
      srcs.map(function (x) { return '<tr><td><b>' + esc(x.label) + '</b><span class="sub">' + esc(x.source_id) + '</span></td><td>' + esc(x.rows) + '</td><td>' + span(x.period) + '</td><td>' + esc(when(x.workbook_modified_at)) + '</td></tr>'; }).join('') + '</table></div></div>';
    html += '<div class="sec"><h3>Coverage gaps</h3>' + ((c.coverage_gaps || []).length ? '<div class="notes">' + c.coverage_gaps.map(function (g) {
      return '<div class="note"><div class="nd">' + label(g.kind) + '</div><div class="nb">' + esc(g.detail) + (g.dates && g.dates.length ? '<br><span class="cp-dim">' + g.dates.map(esc).join(', ') + '</span>' : '') + '</div></div>';
    }).join('') + '</div>' : '<p class="intro">No gaps recorded.</p>') + '</div>';
    return html;
  }

  // Which source tabs feed a campaign view. RAW firm exports feed every campaign.
  function cpSourceCampaign(src, key) {
    var wb = src && src.workbook;
    if (key === 'mva') return wb === 'mva' || wb === 'mva_daily';
    if (key === 'la_county') return wb === 'la_county' || src.source_id === 'mva_daily:RAW';
    return src.source_id === 'mva_daily:RAW';
  }

  function cpLeadRow(l) {
    var f = l.firm || {}, h = l.handoff || {}, a = l.attribution || {}, r = f.retainer || {};
    var src = esc(ATTR_TEXT[a.state] || 'Unavailable');
    if (a.state === 'platform_record') src += '<span class="sub">' + esc(a.campaign_name || '') + '<br>ad ' + esc(a.ad_id || '—') + ' · form ' + esc(a.form_id || '—') + '</span>';
    else if (a.state === 'utm_reported') src += '<span class="sub">' + esc([a.source, a.campaign, a.content].filter(Boolean).join(' · ')) + '</span>';
    else if (a.state === 'call_tracking_label') src += '<span class="sub">' + esc(a.label || '') + '</span>';
    src += '<span class="sub">records: ' + esc((l.record_basis || []).join(', ').replace(/_/g, ' ')) + '</span>';
    var dates = (l.submitted_at ? 'Submitted ' + esc(l.submitted_at.replace('T', ' ')) + '<br>' : '') + (l.firm_created_date ? 'Firm created ' + esc(l.firm_created_date) + '<br>' : '') +
      (h.ledger_sent ? 'Sent ' + esc(String(h.ledger_sent).replace('T', ' ')) : '');
    var contact = (l.contact || []).map(function (x) { return label(x.kind) + ': ' + esc(x.value); }).join('<br>') || '<span class="cp-dim">None recorded</span>';
    var hand = esc(HANDOFF_TEXT[h.state] || 'No delivery evidence') + (h.ledger_channel ? '<span class="sub">' + esc(h.ledger_channel) + '</span>' : '') +
      (h.deliveries || []).map(function (d) { return '<span class="sub">' + (d.api_success ? 'API success' : 'API not successful') + (d.sent_at ? ' · ' + esc(d.sent_at.replace('T', ' ')) : '') + ' · ' + esc(d.source) + ' row ' + esc(d.row) + '</span>'; }).join('');
    var disp = '<b>' + esc(f.current_status || 'No status') + '</b>' + (f.turn_down_reason ? '<span class="sub">' + esc(f.turn_down_reason) + '</span>' : '') +
      (f.updated && !f.conflict ? '<span class="sub">Earlier: ' + (f.history || []).slice(1).map(function (x) { return esc(x.status) + ' (' + esc(x.source) + ')'; }).join(' · ') + '</span>' : '') +
      (f.conflict ? '<span class="sub cp-warn">Sources disagree: ' + (f.history || []).map(function (x) { return esc(x.status) + ' (' + esc(x.source) + ')'; }).join(' · ') + '</span>' : '') +
      (r.sent_date ? '<span class="sub">Retainer sent ' + esc(r.sent_date) + '</span>' : '') + (r.agreement_flag ? '<span class="sub">Retainer column: ' + esc(r.agreement_flag) + '</span>' : '') +
      (r.platform_signed_marker ? '<span class="sub">Platform marked “signed” — unverified</span>' : '') + '<span class="sub">Signed: not verified</span>';
    var dd = l.dedupe || {};
    var key = '<b>' + esc(l.key) + '</b><span class="sub">' + idList(l.ids) + '</span>' + (dd.state === 'merged' ? '<span class="sub">' + esc((l.source_records || []).length) + ' source records merged by shared ID</span>' : dd.state === 'ambiguous' ? '<span class="sub cp-warn">Ambiguous match — unresolved</span>' : '') +
      (l.excluded ? '<span class="pill warn">Excluded: ' + esc(l.excluded) + '</span>' : '');
    var na = l.next_action || {};
    return '<tr><td data-l="Lead">' + key + '</td><td data-l="Source">' + src + '</td><td data-l="Dates">' + (dates || '<span class="cp-dim">No dates</span>') + '</td><td data-l="Contact">' + contact + '</td><td data-l="Handoff">' + hand + '</td><td data-l="Firm">' + disp + '</td><td data-l="Next">' + esc(na.action || '—') + (na.owner ? '<span class="sub">' + esc(na.owner) + '</span>' : '') + '</td></tr>';
  }

  function cpLeadFilter(l, st) {
    if (!st.excluded && l.excluded) return false;
    if (st.status && (l.firm && l.firm.current_status || 'No status') !== st.status) return false;
    if (st.q) {
      var hay = JSON.stringify(l.ids || {}).toLowerCase() + ' ' + String(l.key).toLowerCase();
      if (hay.indexOf(st.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function cpLeads(c, p, st) {
    var all = (p.leads || []).filter(function (l) { return c.scope === 'all' || l.campaign === c.key; });
    var statuses = {};
    all.forEach(function (l) { var s = l.firm && l.firm.current_status || 'No status'; statuses[s] = (statuses[s] || 0) + 1; });
    var shown = all.filter(function (l) { return cpLeadFilter(l, st); });
    var pages = Math.max(1, Math.ceil(shown.length / CP_PAGE));
    var page = Math.min(st.page || 0, pages - 1);
    var rows = shown.slice(page * CP_PAGE, page * CP_PAGE + CP_PAGE).map(cpLeadRow).join('');
    return '<p class="intro">Every original record is kept. Records merge only on a shared explicit ID; ambiguous matches stay separate. No names or contact details are stored here.</p>' +
      '<div class="cp-tools"><label>Status <select data-cp="status"><option value="">All (' + all.length + ')</option>' + Object.keys(statuses).sort().map(function (s) { return '<option value="' + esc(s) + '"' + (st.status === s ? ' selected' : '') + '>' + esc(s) + ' (' + statuses[s] + ')</option>'; }).join('') + '</select></label>' +
      '<label>Find ID <input data-cp="q" type="search" value="' + esc(st.q || '') + '" placeholder="INT-, PLG, FBL…" autocomplete="off"></label>' +
      '<label class="cp-check"><input data-cp="excluded" type="checkbox"' + (st.excluded ? ' checked' : '') + '> Show test/spam</label></div>' +
      '<p class="oc-period">' + shown.length + ' shown · page ' + (page + 1) + ' of ' + pages + '</p>' +
      '<div class="oc-scroll"><table class="cp-leads"><thead><tr><th>Lead</th><th>Source</th><th>Dates</th><th>Contact activity</th><th>Handoff evidence</th><th>Firm disposition</th><th>Next action</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7"><div class="leadsempty">No leads match these filters.</div></td></tr>') + '</tbody></table></div>' +
      '<div class="cp-pager"><button type="button" data-cp-page="' + (page - 1) + '"' + (page <= 0 ? ' disabled' : '') + '>Previous</button><button type="button" data-cp-page="' + (page + 1) + '"' + (page >= pages - 1 ? ' disabled' : '') + '>Next</button></div>';
  }

  function cpMarketing(c) {
    var s = c.spend || {}, html = '';
    if (c.scope === 'all') { /* platform table below carries every dollar */ }
    else if (s.state && s.state !== 'unknown') {
      html += '<div class="sec"><h3>Spend by channel · ' + span(s.period) + '</h3><div class="kpis">' + Object.keys(s.by_channel || {}).map(function (k) { return kpi(esc(usd(s.by_channel[k])), label(k), ''); }).join('') + '</div>' +
        (s.sheet_total ? '<p class="oc-period">Sheet TOTAL row: ' + esc(usd(s.sheet_total.spend_usd)) + (s.sheet_total_matches ? ' — matches the daily rows.' : ' — differs from the daily rows; daily rows are shown.') + '</p>' : '') + '</div>';
    } else html += '<p class="gapnote">No spend source exists for this campaign. Nothing is estimated.</p>';
    if (c.platform_spend && c.platform_spend.state === 'known') html += '<div class="sec"><h3>Platform spend since Apr 1 · ' + esc(usd(c.platform_spend.total_usd)) + '</h3><p class="intro">' + esc(c.platform_spend.note) + '</p>' + cpPlatformTable(c.platform_spend, c.scope === 'all') + '</div>';
    var cor = c.spend_corroboration;
    if (cor) html += '<p class="gapnote">' + esc(cor.note) + ' ' + esc(cor.source) + ': ' + esc(usd(cor.total_usd)) + ' over ' + span(cor.period) + '; differs on ' + esc((cor.days_differing || []).length) + ' of ' + esc(cor.overlap_days) + ' shared days.</p>';
    if ((c.performance || []).length) {
      html += '<div class="sec"><h3>Platform performance by campaign</h3><div class="oc-scroll"><table><tr><th>Campaign</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>Platform leads</th><th>Days</th></tr>' +
        c.performance.map(function (x) { return '<tr><td><b>' + esc(x.campaign) + '</b><span class="sub">' + esc(x.platform) + '</span></td><td>' + esc(usd(x.spend_usd)) + '</td><td>' + esc(x.impressions) + '</td><td>' + esc(x.clicks) + '</td><td>' + esc(x.leads) + '<span class="sub">platform-reported</span></td><td>' + esc(x.days) + '</td></tr>'; }).join('') + '</table></div></div>';
    }
    var daily = c.daily || [];
    if (daily.length) {
      var keys = Object.keys(daily[0].spend || {}).filter(function (k) { return k !== 'total'; });
      var dkeys = Object.keys(daily[0].delivery || {});
      html += '<div class="sec"><details><summary><b>Daily rows (' + daily.length + ')</b></summary><div class="oc-scroll"><table><tr><th>Date</th><th>Status</th><th>Total</th>' + keys.map(function (k) { return '<th>' + label(k) + '</th>'; }).join('') + dkeys.map(function (k) { return '<th>' + label(k) + '</th>'; }).join('') + '</tr>' +
        daily.map(function (d) { return '<tr><td>' + esc(d.date) + '</td><td>' + esc(d.status || '') + '</td><td><b>' + esc(usd(d.spend.total)) + '</b></td>' + keys.map(function (k) { return '<td>' + esc(usd(d.spend[k])) + '</td>'; }).join('') + dkeys.map(function (k) { return '<td>' + esc(d.delivery[k] == null ? '—' : d.delivery[k]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div></details></div>';
    }
    var calls = c.calls;
    if (calls) html += '<div class="sec"><h3>AI intake calls · ' + span(calls.period || null) + '</h3><p class="body">' + esc(calls.records) + ' calls logged · ' + esc(calls.transferred) + ' marked transferred. Directions: ' +
      Object.keys(calls.by_direction || {}).map(function (k) { return esc(k) + ' ' + esc(calls.by_direction[k]); }).join(', ') + '. Outcomes: ' + Object.keys(calls.by_outcome || {}).map(function (k) { return esc(k) + ' ' + esc(calls.by_outcome[k]); }).join(', ') + '.</p><p class="gapnote">' + esc(calls.note) + '</p></div>';
    (c.raw_intake_logs || []).forEach(function (r) {
      html += '<p class="oc-period">Raw intake log ' + esc(r.source) + ': ' + esc(r.events) + ' events, ' + span(r.period) + (r.by_source ? ' (' + Object.keys(r.by_source).map(function (k) { return esc(k) + ' ' + esc(r.by_source[k]); }).join(', ') + ')' : '') + '. ' + esc(r.note) + '</p>';
    });
    var cr = (c.creative || []).filter(function (x) { return CREATIVE_RE.test(x.asset || ''); });
    html += '<div class="sec"><h3>Historical creative</h3>' + (cr.length ? '<div class="cp-creative">' + cr.map(function (x) {
      return '<figure><img src="/assets/portal/phillips/creative/' + x.asset + '" alt="' + esc(x.label) + '" loading="lazy"><figcaption><b>' + esc(x.label) + '</b><br>' + esc(x.limits) + '</figcaption></figure>';
    }).join('') + '</div>' : '<p class="intro">No historical creative on record for this campaign.</p>') + '</div>';
    return html;
  }

  function cpNext(c) {
    var ns = c.next_steps || {}, groups = {};
    (ns.missing_feedback || []).forEach(function (m) { var k = (m.owner || '—') + ' · ' + m.action; (groups[k] = groups[k] || []).push(m); });
    var html = '<div class="sec"><h3>Missing feedback</h3>' + (Object.keys(groups).length ? Object.keys(groups).map(function (k) {
      var list = groups[k];
      return '<details class="oc-cohort"><summary><b>' + esc(k) + '</b> — ' + list.length + ' lead(s)</summary><p class="oc-meta">' + list.map(function (m) { return esc(m.lead) + ' (' + esc(m.status || 'no status') + '): ' + idList(m.ids).replace(/<br>/g, ', '); }).join('<br>') + '</p></details>';
    }).join('') : '<p class="intro">Nothing outstanding.</p>') + '</div>';
    html += '<div class="sec"><h3>Unresolved data issues</h3>' + ((ns.data_issues || []).length ? '<div class="notes">' + ns.data_issues.map(function (d) {
      return '<div class="note"><div class="nd">' + label(d.kind) + '</div><div class="nb">' + esc(d.detail) + '</div></div>';
    }).join('') + '</div>' : '<p class="intro">None recorded.</p>') + '</div>';
    return html;
  }

  /** Full perspective markup for one state { campaign, section, status, q, excluded, page }. */
  function renderPerspective(p, st) {
    if (!p || p.schema !== 'ee.phillips_client_perspective/v1' || !Array.isArray(p.campaigns) || !Array.isArray(p.leads)) return '';
    var c = p.campaigns.filter(function (x) { return x.key === st.campaign; })[0] || p.campaigns.filter(function (x) { return x.default; })[0] || p.campaigns[0];
    var section = CP_SECTIONS.some(function (s) { return s[0] === st.section; }) ? st.section : 'overview';
    var body = section === 'leads' ? cpLeads(c, p, st) : section === 'marketing' ? cpMarketing(c) : section === 'next' ? cpNext(c) : cpOverview(c, p);
    return '<div class="cp" id="cp"><div class="cp-head"><h2>Client Perspective</h2><p class="oc-period">Projected ' + esc(when(p.generated_at)) + ' from ' + esc((p.sources || []).length) + ' original source tabs · stored ' + esc(when(p.stored_at)) + '</p></div>' +
      '<div class="cp-camps" role="tablist" aria-label="Campaign">' + p.campaigns.map(function (x) {
        return '<button type="button" role="tab" data-cp-campaign="' + esc(x.key) + '" aria-selected="' + (x.key === c.key) + '"' + (x.key === c.key ? ' class="active"' : '') + '>' + esc(x.label) + '</button>';
      }).join('') + '</div>' +
      '<nav class="tabs cp-sections" aria-label="Campaign sections">' + CP_SECTIONS.map(function (s) {
        return '<button type="button" data-cp-section="' + s[0] + '"' + (s[0] === section ? ' class="active" aria-current="page"' : '') + '>' + s[1] + '</button>';
      }).join('') + '</nav><div class="cp-body">' + body + '</div></div>';
  }

  /** Re-renders the perspective in place on campaign, section, filter or page changes. */
  function bindPerspective(container, p) {
    var defaultCampaign = (p.campaigns.filter(function (x) { return x.default; })[0] || p.campaigns[0]).key;
    var st = { campaign: defaultCampaign, section: 'overview', status: '', q: '', excluded: false, page: 0 };
    function draw(focus) {
      container.innerHTML = renderPerspective(p, st);
      if (focus) { var el = container.querySelector(focus); if (el) { el.focus(); if (el.type === 'search' && el.value) el.setSelectionRange(el.value.length, el.value.length); } }
    }
    container.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!t) return;
      if (t.hasAttribute('data-cp-campaign')) { st.campaign = t.getAttribute('data-cp-campaign'); st.status = ''; st.q = ''; st.page = 0; draw('[data-cp-campaign="' + st.campaign + '"]'); }
      else if (t.hasAttribute('data-cp-section')) { st.section = t.getAttribute('data-cp-section'); st.page = 0; draw('[data-cp-section="' + st.section + '"]'); }
      else if (t.hasAttribute('data-cp-page')) { st.page = Math.max(0, +t.getAttribute('data-cp-page') || 0); draw('.cp-leads'); }
    });
    container.addEventListener('change', function (e) {
      var k = e.target && e.target.getAttribute && e.target.getAttribute('data-cp');
      if (k === 'status') { st.status = e.target.value; st.page = 0; draw('[data-cp="status"]'); }
      if (k === 'excluded') { st.excluded = e.target.checked; st.page = 0; draw('[data-cp="excluded"]'); }
    });
    container.addEventListener('input', function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-cp') === 'q') { st.q = e.target.value; st.page = 0; draw('[data-cp="q"]'); }
    });
    draw();
    return st;
  }

  var CP_CSS = '.cp{margin-bottom:28px}.cp-head h2{margin:0}.cp-camps{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px}' +
    '.cp-camps button{font:inherit;font-weight:700;min-height:44px;padding:10px 16px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#1a2433;cursor:pointer}' +
    '.cp-camps button.active{background:var(--accent);border-color:var(--accent);color:#fff}.cp-sections{margin-top:12px}.cp-sections button{min-height:44px}' +
    '.cp-body{border:1px solid #e3e9f2;border-radius:0 14px 14px 14px;padding:20px}.cp-chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '.cp-tools{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:0 0 8px}.cp-tools label{font-size:13px;color:#475569;display:flex;flex-direction:column;gap:4px}' +
    '.cp-tools select,.cp-tools input[type=search]{font:inherit;min-height:44px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;min-width:180px}' +
    '.cp-tools .cp-check{flex-direction:row;align-items:center;min-height:44px}.cp-leads{min-width:1080px}.cp-leads td{font-size:13px;overflow-wrap:anywhere}' +
    '.cp-pager{display:flex;gap:8px;margin-top:12px}.cp-pager button{font:inherit;min-height:44px;padding:8px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.cp-pager button:disabled{opacity:.5;cursor:default}' +
    '.cp-timeline{min-width:900px}.cp-dim{color:#94a3b8}.cp-warn{color:#b45309!important}.cp-creative{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}' +
    '.cp-creative figure{margin:0;border:1px solid #e3e9f2;border-radius:14px;overflow:hidden}.cp-creative img{width:100%;height:auto;display:block}.cp-creative figcaption{font-size:13px;color:#475569;padding:12px;line-height:1.5}' +
    '@media(max-width:640px){.cp-body{padding:14px;border-radius:0 0 14px 14px}.cp-tools label,.cp-tools select,.cp-tools input[type=search]{width:100%}' +
    '.cp-leads{min-width:0}.cp-leads thead{display:none}.cp-leads tr{display:block;border:1px solid #e3e9f2;border-radius:12px;margin:0 0 12px;padding:6px 10px}' +
    '.cp-leads td{display:grid;grid-template-columns:96px 1fr;gap:8px;border-bottom:1px solid #eef2f7;padding:8px 0}.cp-leads td:before{content:attr(data-l);font-weight:700;color:#64748b;font-size:12px}.cp-leads tr td:last-child{border-bottom:0}}';

  var loadVersion = 0;
  function load(token, opts) {
    var version = ++loadVersion;
    var o = opts || {};
    var doc = o.document || root.document;
    var target = doc.getElementById('outcome-root');
    var note = doc.getElementById('outcome-gate');
    if (!target) return Promise.resolve(null);
    var fetchImpl = o.fetch || root.fetch;
    target.innerHTML = '<div class="gapnote">Loading report…</div>';
    return fetchImpl(o.api || REPORT_API, { headers: { Authorization: 'Bearer ' + token }, cache:'no-store', credentials:'omit', redirect:'error' }).then(function (r) {
      if (r.status === 401) throw new Error('That token was not recognized for the report.');
      if (r.status === 404) throw new Error('The report service is not available yet.');
      if (!r.ok) throw new Error('Report unavailable (HTTP ' + r.status + ').');
      return r.json();
    }).then(function (report) {
      if(version !== loadVersion) return null;
      var perspective = report && report.client_perspective;
      var hasPerspective = Boolean(renderPerspective(perspective, {}));
      target.innerHTML = (hasPerspective ? '<div id="cp-root"></div>' : '') + render(report);
      if (hasPerspective) bindPerspective(target.querySelector('#cp-root'), perspective);
      if (note) note.style.display = 'none';
      return report;
    }).catch(function (e) {
      if(version !== loadVersion) return null;
      if(note) note.style.display='';
      target.innerHTML = '<div class="gapnote">' + esc(e && e.message ? e.message : 'Report unavailable.') + ' No figures are shown.</div>';
      return null;
    });
  }

  /**
   * Adds the "Campaign to outcome" tab to the page. The page body is regenerated by an automated
   * daily refresh, so the tab is mounted from here instead of being written into that markup: a
   * refresh cannot remove it and this file never edits what the refresh owns. Safe to call twice.
   * The tab carries its own token field; nothing is fetched until a token is entered.
   */
  function mount(doc) {
    var d = doc || root.document;
    if (!d || d.getElementById('tab-outcomes')) return false;
    var nav = d.querySelector('nav.tabs');
    var summary = d.getElementById('tab-summary');
    if (!nav || !summary || !summary.parentNode) return false;

    var styleHost = d.head || d.body;
    if (styleHost && !d.getElementById('cp-style')) { var style = d.createElement('style'); style.id = 'cp-style'; style.textContent = CP_CSS; styleHost.appendChild(style); }
    var tab = d.createElement('div');
    tab.className = 'tab';
    tab.id = 'tab-outcomes';
    tab.innerHTML = '<h2>Campaign to outcome</h2><div style="height:12px"></div>' +
      '<div class="oc-gate" id="outcome-gate"><p><b>Protected report.</b> Enter your portal access token to load it. Nothing on this tab is stored in the page.</p>' +
      '<label for="outcome-token" style="position:absolute;left:-9999px">Portal access token</label>' +
      '<input type="password" id="outcome-token" placeholder="Portal access token" autocomplete="off"> ' +
      '<button type="button" id="outcome-unlock">Load report</button>' +
      '<p id="outcome-err" role="status" aria-live="polite" style="margin:8px 0 0"></p></div><button type="button" id="outcome-clear" class="oc-clear">Clear report</button><div id="outcome-root"></div>';
    summary.parentNode.insertBefore(tab, summary);

    var btn = d.createElement('button');
    btn.type = 'button';
    btn.id = 'outcome-tab-button';
    btn.textContent = 'Campaign to outcome';
    btn.addEventListener('click', function () {
      d.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      d.querySelectorAll('nav.tabs button').forEach(function (b) { b.classList.remove('active'); });
      tab.classList.add('active');
      btn.classList.add('active');
    });
    var buttons = nav.querySelectorAll('button');
    var last = buttons.length ? buttons[buttons.length - 1] : null;
    if (last) nav.insertBefore(btn, last); else nav.appendChild(btn);

    var input = d.getElementById('outcome-token');
    var go = d.getElementById('outcome-unlock');
    var err = d.getElementById('outcome-err');
    var clear = d.getElementById('outcome-clear');
    function clearReport(){loadVersion++;input.value='';d.getElementById('outcome-root').innerHTML='';d.getElementById('outcome-gate').style.display='';go.disabled=false;go.textContent='Load report';err.textContent='';}
    clear.addEventListener('click', clearReport);
    if(typeof root.addEventListener==='function') root.addEventListener('pagehide',clearReport);
    function unlock() {
      if(go.disabled) return Promise.resolve(null);
      var token = (input.value || '').trim();
      if (!token) { err.textContent = 'Enter your portal access token.'; return Promise.resolve(null); }
      err.textContent = '';
      go.disabled = true; go.textContent = 'Loading…';
      return load(token, { document: d }).then(function (report) {
        go.disabled = false; go.textContent = 'Load report';
        if (report) input.value = ''; // the token is not kept in the field once it has worked
        return report;
      });
    }
    go.addEventListener('click', unlock);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    return true;
  }

  var api = { render: render, renderPerspective: renderPerspective, bindPerspective: bindPerspective, cellView: cellView, load: load, mount: mount, STAGES: STAGES };
  root.PhillipsReport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document && typeof root.document.addEventListener === 'function') {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { mount(); });
    else mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);

