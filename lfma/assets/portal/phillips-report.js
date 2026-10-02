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
    var count = num(c.count);
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
      ' · reports to: ' + convText + '<br>Budget on record: $' + esc(cfg.daily_budget_usd) + '/day (as of ' + esc(cfg.as_of) + ') · Attribution window: ' + windowText(r.attribution_window) + '</p>' +
      '<div style="overflow-x:auto"><table class="oc-table"><tr><th>Spend</th><th>Platform-reported</th>' + STAGES.map(function (s) { return '<th>' + s[1] + '</th>'; }).join('') + '</tr>' +
      '<tr><td><b>' + esc(money(r.spend)) + '</b></td><td><b>' + esc(prText) + '</b><span class="sub">platform count, this row’s window</span></td>' + cells + '</tr></table></div></div>';
  }

  function renderUnmatched(unmatched) {
    var u = unmatched || { count: 0, rows: [] };
    if (!u.count) return '<div class="sec"><h3>Unmatched firm records</h3><p class="intro">No firm records are waiting for reconciliation.</p></div>';
    var rows = (u.rows || []).map(function (x) {
      return '<tr><td>' + esc(x.report_date || '—') + '</td><td>' + esc(x.raw || '—') + '<span class="sub">reads as: ' + esc(String(x.status || '').replace(/_/g, ' ')) + ' — not counted</span></td>' +
        '<td>' + esc(String(x.reason || '').replace(/_/g, ' ')) + '</td><td>' + (x.phone_last4 ? '···' + esc(x.phone_last4) : '—') + '</td><td>' + esc(x.source === 'form_status' ? 'Form status' : 'Daily report') + '</td></tr>';
    }).join('');
    return '<div class="sec"><h3>Unmatched firm records</h3><p class="intro">' + esc(u.count) + ' firm record(s) could not be tied to one lead. They are not counted anywhere above until reconciled.</p>' +
      '<div style="overflow-x:auto"><table><tr><th>Report date</th><th>Firm status</th><th>Why unmatched</th><th>Phone</th><th>Source</th></tr>' + rows + '</table></div></div>';
  }

  function renderOperations(ops) {
    var ex = ops && ops.executor;
    var body;
    if (!ex || ex.status === 'unverified') {
      body = '<span class="pill warn">Unknown</span> Website callback worker: no worker has identified itself. A queued callback is not evidence that a call will be placed.';
    } else if (ex.status === 'last_seen_stale') {
      body = '<span class="pill warn">Stale</span> Website callback worker (' + esc(ex.owner) + ') last seen ' + esc(when(ex.last_seen_at)) + '.';
    } else {
      body = '<span class="pill">Seen</span> Website callback worker (' + esc(ex.owner) + ') last seen ' + esc(when(ex.last_seen_at)) + '.';
    }
    return '<div class="sec"><h3>Operational unknowns</h3><div class="gapnote">' + body + '</div></div>';
  }

  function render(report) {
    if (!report || report.schema !== 'ee.phillips_portal_report/v1' || !Array.isArray(report.rows)) {
      return '<div class="gapnote">The report could not be read. Nothing is shown rather than showing numbers that may be wrong.</div>';
    }
    var ex = report.excluded || {};
    var firm = (report.firm_status && report.firm_status.counts) || {};
    var un = report.unattributed || {};
    var comp = report.comparability || {};
    return '<p class="intro">Generated ' + esc(when(report.generated_at)) + ' · campaign configuration as of ' + esc(report.registry_as_of) + '. “Unknown” means no source has reported — it is not zero.</p>' +
      renderSources(report.sources) +
      '<div class="sec"><h3>Campaign to outcome</h3>' +
      '<div class="gapnote">' + esc(comp.note || '') + '</div>' +
      report.rows.map(renderRow).join('') + '</div>' +
      '<div class="sec"><h3>Kept out of the numbers above</h3><p class="body">Test records: ' + esc(num(ex.test) === null ? 'Unknown' : ex.test) +
      ' · dry runs: ' + esc(num(ex.dry_run) === null ? 'Unknown' : ex.dry_run) +
      ' · leads from superseded campaigns: ' + esc(num(ex.superseded_campaign) === null ? 'Unknown' : ex.superseded_campaign) +
      ' · leads with no campaign identity: ' + esc(num(un.leads) === null ? 'Unknown' : un.leads) +
      '<br>Converted without a Matter ID and retainer date (not counted as signed): ' + esc(firm.converted_unverified || 0) + '</p></div>' +
      renderUnmatched(report.unmatched) +
      renderOperations(report.operations);
  }

  function load(token, opts) {
    var o = opts || {};
    var doc = o.document || root.document;
    var target = doc.getElementById('outcome-root');
    var note = doc.getElementById('outcome-gate');
    if (!target) return Promise.resolve(null);
    var fetchImpl = o.fetch || root.fetch;
    target.innerHTML = '<div class="gapnote">Loading report…</div>';
    return fetchImpl(o.api || REPORT_API, { headers: { Authorization: 'Bearer ' + token } }).then(function (r) {
      if (r.status === 401) throw new Error('That token was not recognized for the report.');
      if (r.status === 404) throw new Error('The report service is not available yet.');
      if (!r.ok) throw new Error('Report unavailable (HTTP ' + r.status + ').');
      return r.json();
    }).then(function (report) {
      target.innerHTML = render(report);
      if (note) note.style.display = 'none';
      return report;
    }).catch(function (e) {
      target.innerHTML = '<div class="gapnote">' + esc(e && e.message ? e.message : 'Report unavailable.') + ' No figures are shown.</div>';
      return null;
    });
  }

  var api = { render: render, cellView: cellView, load: load, STAGES: STAGES };
  root.PhillipsReport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
