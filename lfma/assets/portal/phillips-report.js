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
 * - Program view: MVA is the default when the registry labels any campaign MVA. LA, every other
 *   program, campaigns with no program on record, and "All campaigns" stay one click away. A
 *   missing label is shown as "Program not on record" — never guessed.
 * - Leads in this view: per campaign, the lead count, its source, reporting period and last
 *   refresh. A missing field reads "Not available". "All leads loaded" is claimed only when the
 *   report marks its cohort complete, no lead record was unreadable and every lead source is fresh.
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
  var NA = 'Not available';
  function when(iso) {
    if (!iso) return NA;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? NA : d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }
  function orNA(value) { return value == null || value === '' ? NA : value; }

  var PROGRAM_ALL = '__all__';
  var PROGRAM_NONE = '__none__';
  var DEFAULT_PROGRAM = 'MVA';

  // Same rule as the API's registry check. Anything else (sentinels, prototype keys, markup) is
  // treated as "not on record" so a bad payload cannot collide with a view or invent a program.
  var PROGRAM_LABEL = /^[A-Z][A-Z0-9_]{1,15}$/;
  function programOf(row) {
    var p = row && row.identity && row.identity.program;
    return typeof p === 'string' && PROGRAM_LABEL.test(p) ? p : null;
  }
  function isViewKey(k) { return k === PROGRAM_ALL || k === PROGRAM_NONE || (typeof k === 'string' && PROGRAM_LABEL.test(k)); }
  function campaigns(n) { return n + (n === 1 ? ' campaign' : ' campaigns'); }
  /** Programs present in the report: [{ key, label, count }], MVA first, then A–Z, then unlabeled, then all. */
  function programViews(rows) {
    var counts = Object.create(null); var none = 0;
    rows.forEach(function (r) { var p = programOf(r); if (p === null) none++; else counts[p] = (counts[p] || 0) + 1; });
    var keys = Object.keys(counts).sort(function (a, b) {
      if (a === DEFAULT_PROGRAM) return -1; if (b === DEFAULT_PROGRAM) return 1; return a < b ? -1 : a > b ? 1 : 0;
    });
    var views = keys.map(function (k) { return { key: k, label: k, count: counts[k] }; });
    if (none) views.push({ key: PROGRAM_NONE, label: 'Program not on record', count: none });
    views.push({ key: PROGRAM_ALL, label: 'All campaigns', count: rows.length });
    return views;
  }
  function resolveProgram(rows, wanted) {
    var views = programViews(rows);
    var has = function (k) { return views.some(function (v) { return v.key === k; }); };
    if (wanted && has(wanted)) return wanted;
    return has(DEFAULT_PROGRAM) ? DEFAULT_PROGRAM : PROGRAM_ALL;
  }
  function rowsFor(rows, program) {
    if (program === PROGRAM_ALL) return rows;
    return rows.filter(function (r) { var p = programOf(r); return program === PROGRAM_NONE ? p === null : p === program; });
  }
  function renderProgramBar(rows, program) {
    var views = programViews(rows);
    var current = views.filter(function (v) { return v.key === program; })[0];
    var buttons = views.map(function (v) {
      return '<button type="button" class="oc-prog' + (v.key === program ? ' active' : '') + '" data-program="' + esc(v.key) + '" aria-pressed="' + (v.key === program ? 'true' : 'false') + '">' +
        esc(v.label) + ' (' + campaigns(v.count) + ')</button>';
    }).join(' ');
    var note = '';
    if (!views.some(function (v) { return v.key === DEFAULT_PROGRAM; })) {
      note = '<div class="gapnote">No campaign in this report is labeled MVA yet' + (program === PROGRAM_ALL ? ', so all campaigns are shown' : '') +
        '. Program labels come only from the campaign registry; a campaign without one is listed under “Program not on record”.</div>';
    }
    return '<div class="oc-programs" role="group" aria-label="Campaign program"><p class="intro">Viewing: ' + esc(current ? current.label : 'All campaigns') + '</p>' + buttons + '</div>' + note;
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
    var rows = (Array.isArray(sources) ? sources : []).filter(function (s) { return s && typeof s === 'object'; }).map(function (s) {
      var st = SOURCE_STATUS[s.status] || SOURCE_STATUS.unknown;
      var auth = s.auth === 'failed' ? ' · sign-in failed' : '';
      return '<tr><td><b>' + esc(s.label) + '</b><span class="sub">feeds: ' + esc((s.feeds || []).join(', ').replace(/_/g, ' ')) + '</span></td>' +
        '<td><span class="pill ' + st[1] + '">' + st[0] + '</span></td>' +
        '<td>' + esc(when(s.last_success_at)) + '<span class="sub">' + (num(s.age_hours) === null ? 'never' : esc(s.age_hours) + 'h ago · allowed ' + esc(s.max_age_hours) + 'h') + esc(auth) + '</span></td>' +
        '<td>' + esc(orNA(s.owner)) + '</td></tr>';
    }).join('');
    return '<div class="sec"><h3>Source freshness (all campaigns)</h3><p class="intro">Where each number comes from and when that source last delivered. A stage is only as current as its source.</p>' +
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
      '<p class="oc-meta">' + identityLine(id) + '<br>Lands on: ' + esc(landing.domain || 'in-platform form') + ' · intake: ' + esc(orNA(landing.intake_tenant)) +
      ' · reports to: ' + convText + '<br>Budget on record: ' + (num(cfg.daily_budget_usd) === null ? NA : '$' + esc(cfg.daily_budget_usd) + '/day') + ' (as of ' + esc(orNA(cfg.as_of)) + ') · Attribution window: ' + windowText(r.attribution_window) + '</p>' +
      '<div style="overflow-x:auto"><table class="oc-table"><tr><th>Spend</th><th>Platform-reported</th>' + STAGES.map(function (s) { return '<th>' + s[1] + '</th>'; }).join('') + '</tr>' +
      '<tr><td><b>' + esc(money(r.spend)) + '</b><span class="sub">Period: ' + esc(orNA(r.spend && r.spend.period)) + '<br>As of: ' + esc(when(r.spend && r.spend.as_of)) + '</span></td><td><b>' + esc(prText) + '</b><span class="sub">platform count, this row’s window<br>As of: ' + esc(when(pr.as_of)) + '</span></td>' + cells + '</tr></table></div></div>';
  }

  function renderUnmatched(unmatched) {
    var u = unmatched || { count: 0, rows: [] };
    if (!u.count) return '<div class="sec"><h3>Unmatched firm records</h3><p class="intro">No unmatched records are stored. This does not prove the firm feed is connected or complete.</p></div>';
    var rows = (u.rows || []).map(function (x) {
      return '<tr><td>' + esc(orNA(x.report_date)) + '</td><td>' + esc(String(x.status || 'unknown').replace(/_/g,' ')) + '<span class="sub">reads as: ' + esc(String(x.status || '').replace(/_/g, ' ')) + ' — not counted</span></td>' +
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

  function rowName(r) {
    var id = r.identity || {};
    return orNA(id.brand_account) + ' · ' + orNA(String(id.campaign_type || '').replace(/_/g, ' ') || null);
  }
  /** Sources feeding a row's submission count, resolved to the report's source list. */
  function leadSources(r, report) {
    var byId = Object.create(null);
    (report.sources || []).forEach(function (s) { if (s && typeof s.id === 'string') byId[s.id] = s; });
    var cell = (r.stages || {}).submission || {};
    return (Array.isArray(cell.sources) ? cell.sources : []).map(function (x) {
      return x && typeof x.id === 'string' && byId[x.id] ? byId[x.id] : { id: x && x.id, label: x && x.id, status: 'unknown' };
    });
  }
  function leadCount(r) {
    var v = cellView((r.stages || {}).submission);
    return v.cls === 'ok' || v.cls === 'pend' && /^\d+$/.test(v.text) ? Number(v.text) : null;
  }
  /** Why "all leads loaded" cannot be claimed for these rows. Empty array = coverage verified. */
  function coverageGaps(report, shown) {
    var gaps = [];
    if (!report.cohort || report.cohort.complete !== true) gaps.push('the report has not reconciled its lead cohort as complete');
    var unreadable = report.operations ? report.operations.unreadable_lead_records : null;
    if (num(unreadable) === null) gaps.push('unreadable lead records: ' + NA);
    else if (unreadable > 0) gaps.push(unreadable + ' lead record(s) could not be read');
    var stale = 0; var none = 0;
    shown.forEach(function (r) {
      var src = leadSources(r, report);
      if (!src.length) none++;
      else if (src.some(function (s) { return s.status !== 'fresh'; })) stale++;
    });
    if (none) gaps.push(campaigns(none) + ' with no lead source on record');
    if (stale) gaps.push(campaigns(stale) + ' with a lead source that is not fresh');
    if (!shown.length) gaps.push('no campaigns in this view');
    return gaps;
  }
  function renderLeadSummary(report, shown) {
    var cohort = report.cohort || {};
    var period = cohort.kind === 'all_retained_indexed_leads' ? 'All retained leads to date (not a daily total)' : orNA(cohort.kind && String(cohort.kind).replace(/_/g, ' '));
    var reported = 0; var withCount = 0;
    var rows = shown.map(function (r) {
      var n = leadCount(r);
      if (n !== null) { reported += n; withCount++; }
      var src = leadSources(r, report);
      var latest = null;
      src.forEach(function (s) { var t = s.last_success_at ? new Date(s.last_success_at).getTime() : NaN; if (!isNaN(t) && (latest === null || t > latest)) latest = t; });
      var srcText = src.length ? src.map(function (s) { return esc(orNA(s.label)) + ' — ' + (SOURCE_STATUS[s.status] || SOURCE_STATUS.unknown)[0]; }).join('; ') : NA;
      return '<tr><td data-label="Campaign"><b>' + esc(rowName(r)) + '</b></td><td data-label="Leads"><b>' + (n === null ? NA : esc(n)) + '</b></td><td data-label="Lead source">' + srcText + '</td><td data-label="Reporting period">' + esc(period) + '</td><td data-label="Last refreshed">' +
        esc(latest === null ? NA : when(new Date(latest).toISOString())) + '</td></tr>';
    }).join('');
    var total = withCount === 0 ? NA + ' — no campaign in this view has a reported lead count'
      : reported + ' from ' + withCount + ' of ' + campaigns(shown.length) + (withCount < shown.length ? '; ' + NA + ' for the other ' + campaigns(shown.length - withCount) : '');
    var gaps = coverageGaps(report, shown);
    var coverage = gaps.length
      ? '<span class="pill warn">Coverage not verified</span> These are the leads available in the report, not confirmed to be all leads: ' + esc(gaps.join('; ')) + '.'
      : '<span class="pill">All leads loaded</span> The report marks its lead cohort complete, no record was unreadable and every lead source is fresh.';
    return '<div class="oc-leads"><h4>Leads in this view</h4><p class="intro">Leads reported: <b>' + esc(total) + '</b>. Report refreshed ' + esc(when(report.generated_at)) + '.</p>' +
      '<div class="gapnote" role="note">' + coverage + '</div>' +
      (shown.length ? '<div style="overflow-x:auto"><table class="oc-leadtable"><tr><th>Campaign</th><th>Leads</th><th>Lead source</th><th>Reporting period</th><th>Last refreshed</th></tr>' + rows + '</table></div>' : '') + '</div>';
  }

  function isValidReport(report) {
    return !!report && report.schema === 'ee.phillips_portal_report/v1' && Array.isArray(report.rows) && !report.rows.some(function(r){return !r || !r.identity || !r.stages;});
  }
  function render(report, opts) {
    if (!isValidReport(report)) {
      return '<div class="gapnote">The report could not be read. Nothing is shown rather than showing numbers that may be wrong.</div>';
    }
    var ex = report.excluded || {};
    var firm = (report.firm_status && report.firm_status.counts) || {};
    var un = report.unattributed || {};
    var comp = report.comparability || {};
    var program = resolveProgram(report.rows, opts && opts.program);
    var shown = rowsFor(report.rows, program);
    return '<p class="intro">Generated ' + esc(when(report.generated_at)) + ' · campaign configuration as of ' + esc(orNA(report.registry_as_of)) + '. “Unknown” means no source has reported — it is not zero.</p>' +
      '<p class="oc-cohort">' + esc(report.cohort && report.cohort.note || 'Stage counts cover retained indexed leads only. Delivery completeness has not been reconciled.') + '</p>' +
      renderSources(report.sources) +
      '<div class="sec"><h3>Campaign to outcome</h3>' +
      renderProgramBar(report.rows, program) +
      renderLeadSummary(report, shown) +
      '<div class="gapnote">' + esc(comp.note || '') + '</div>' +
      (shown.length ? shown.map(renderRow).join('') : '<div class="gapnote">No campaigns in this view.</div>') + '</div>' +
      '<div class="sec"><h3>Kept out of the numbers above (all campaigns)</h3><p class="body">Test records: ' + esc(num(ex.test) === null ? 'Unknown' : ex.test) +
      ' · dry runs: ' + esc(num(ex.dry_run) === null ? 'Unknown' : ex.dry_run) +
      ' · leads from superseded campaigns: ' + esc(num(ex.superseded_campaign) === null ? 'Unknown' : ex.superseded_campaign) +
      ' · leads with no campaign identity: ' + esc(num(un.leads) === null ? 'Unknown' : un.leads) +
      '<br>Reported conversion without signed confirmation (not counted as signed): ' + esc(typeof firm.converted_unverified === 'number' ? firm.converted_unverified : 'Unknown') + '</p></div>' +
      renderUnmatched(report.unmatched) +
      renderOperations(report.operations);
  }

  var loadVersion = 0;
  var loaded = null; // { report, version } — the last report this page successfully rendered
  /** Updates the persistent screen-reader announcement (outside the re-rendered region). */
  function announce(doc, report, program) {
    var el = doc && typeof doc.getElementById === 'function' ? doc.getElementById('outcome-view') : null;
    if (!el) return;
    if (!isValidReport(report)) { el.textContent = ''; return; }
    var key = resolveProgram(report.rows, program);
    var v = programViews(report.rows).filter(function (x) { return x.key === key; })[0];
    el.textContent = 'Viewing: ' + (v ? v.label : 'All campaigns');
  }
  /** Re-renders the loaded report for a program view. Returns false when no report is loaded. */
  function setProgram(program, opts) {
    var doc = (opts && opts.document) || root.document;
    var target = doc && doc.getElementById('outcome-root');
    if (!target || !loaded || loaded.version !== loadVersion || !isViewKey(program) || !isValidReport(loaded.report)) return false;
    var key = resolveProgram(loaded.report.rows, program); // the view actually shown
    target.innerHTML = render(loaded.report, { program: key });
    // Keep keyboard focus on the shown view's button (the bar was just re-rendered).
    var chosen = typeof target.querySelector === 'function' ? target.querySelector('[data-program="' + key + '"]') : null;
    if (chosen && typeof chosen.focus === 'function') chosen.focus();
    announce(doc, loaded.report, key);
    return true;
  }
  function docOf(opts) { return (opts && opts.document) || root.document; }
  function load(token, opts) {
    var version = ++loadVersion;
    loaded = null;
    announce(docOf(opts), null);
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
      target.innerHTML = render(report);
      if (isValidReport(report)) loaded = { report: report, version: version };
      announce(doc, report);
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

    var tab = d.createElement('div');
    tab.className = 'tab';
    tab.id = 'tab-outcomes';
    tab.innerHTML = '<h2>Campaign to outcome</h2><div style="height:12px"></div>' +
      '<div class="oc-gate" id="outcome-gate"><p><b>Protected report.</b> Enter your portal access token to load it. Nothing on this tab is stored in the page.</p>' +
      '<label for="outcome-token" style="position:absolute;left:-9999px">Portal access token</label>' +
      '<input type="password" id="outcome-token" placeholder="Portal access token" autocomplete="off"> ' +
      '<button type="button" id="outcome-unlock">Load report</button>' +
      '<p id="outcome-err" role="status" aria-live="polite" style="margin:8px 0 0"></p></div><button type="button" id="outcome-clear" class="oc-clear">Clear report</button><p id="outcome-view" class="oc-sr" role="status" aria-live="polite"></p><div id="outcome-root"></div>';
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
    function clearReport(){loadVersion++;loaded=null;announce(d,null);input.value='';d.getElementById('outcome-root').innerHTML='';d.getElementById('outcome-gate').style.display='';go.disabled=false;go.textContent='Load report';err.textContent='';}
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
    d.getElementById('outcome-root').addEventListener('click', function (e) {
      var t = e && e.target;
      var b = t && typeof t.closest === 'function' ? t.closest('[data-program]') : t;
      var key = b && typeof b.getAttribute === 'function' ? b.getAttribute('data-program') : null;
      if (key) setProgram(key, { document: d });
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    return true;
  }

  var api = { render: render, cellView: cellView, coverageGaps: coverageGaps, load: load, mount: mount, setProgram: setProgram, STAGES: STAGES };
  root.PhillipsReport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document && typeof root.document.addEventListener === 'function') {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { mount(); });
    else mount();
  }
})(typeof window !== 'undefined' ? window : globalThis);

