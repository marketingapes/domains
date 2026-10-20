/* Perspective · SSDI demo (SSDI-PILOT-001).
   Contract mirrors /paraquat/perspective/: the client renders only allowlisted AGGREGATE fields
   from the connected feed; unavailable values show "—" and never mean zero. No claimant names,
   phone numbers, answers, recordings or transcripts are ever rendered here.

   Reference-build state: NO feed is connected (config.json's feed_url is a placeholder route that
   does not exist yet). The page therefore reports "not connected" honestly and offers clearly
   labeled SYNTHETIC examples, plus the local test lead this browser submitted in synthetic mode
   (sessionStorage), labeled local-only. Human dates: epoch SECONDS are converted to ms before
   formatting (domains #318 behavior) — raw epoch floats are never printed. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function fmtDate(epochSeconds) {
    if (epochSeconds == null || isNaN(epochSeconds)) return '—';
    var d = new Date(Number(epochSeconds) * 1000); /* seconds -> ms (#318) */
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function setNum(id, v) { var el = $(id); if (el) el.textContent = (v == null || isNaN(v)) ? '—' : String(v); }
  function setList(id, rows, emptyText) {
    var el = $(id); if (!el) return;
    el.innerHTML = '';
    if (!rows || !rows.length) { var li = document.createElement('li'); li.textContent = emptyText; el.appendChild(li); return; }
    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = r.label + ': ' + (r.value == null ? '—' : r.value);
      el.appendChild(li);
    });
  }

  function renderOverview(d) {
    setNum('leadCount', d && d.counts ? d.counts.leads : null);
    setNum('callCount', d && d.counts ? d.counts.calls : null);
    setNum('followupCount', d && d.counts ? d.counts.followups : null);
    setNum('spendCount', null); /* no ad-spend source in the reference build */
    setList('sources', d ? d.sources : null, 'Source totals are not connected yet.');
    setList('statuses', d ? d.statuses : null, 'Lead status totals are not connected yet.');
    var c = (d && d.connections) || {};
    setList('connections', [
      { label: 'Intake feed', value: c.intake ? 'connected' : 'not connected' },
      { label: 'Sofia activity', value: c.sofia ? 'connected' : 'not connected' },
      { label: 'Ad spend', value: c.ad_spend ? 'connected' : 'not connected' }
    ], '');
    $('freshness').textContent = d && d.as_of ? 'Data as of ' + fmtDate(Date.parse(d.as_of) / 1000) + '.' : 'No connected data timestamp.';
    $('dataNote').textContent = d ? 'Connected overview.' : 'No connected feed — totals unavailable. Explore the synthetic examples below to see how a test lead would appear.';
  }

  function loadFeed() {
    fetch('/ssdi/perspective/config.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg.feed_url || cfg.feed_url.indexOf('PLACEHOLDER') >= 0) { renderOverview(null); return; }
        return fetch(cfg.feed_url, { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw new Error('feed'); return r.json(); })
          .then(function (d) { renderOverview(d && d.schema === 'ssdi-perspective/v1' ? d : null); })
          .catch(function () { renderOverview(null); });
      })
      .catch(function () { renderOverview(null); });
  }

  /* ---- Synthetic examples (fictional, labeled; epoch-second timestamps on purpose) ---- */
  var T = 1760630400; /* 2025-10-16T12:00:00Z in epoch SECONDS — exercises the #318 conversion */
  var EXAMPLES = {
    form: {
      label: 'Example 1 · Form door (new application)',
      events: [
        { at: T, what: 'Lead received', detail: 'Door: form · page btl-ssdi-main-form', tag: 'received' },
        { at: T + 240, what: 'Screening result', detail: 'Example outcome: QUALIFIED against example criteria (visitor never sees which answer mattered)', tag: 'screening' },
        { at: T + 900, what: 'Firm review', detail: 'Status shown to the firm only; demo view shows the plain label', tag: 'Verified · firm review' },
        { at: T + 1500, what: 'Handed off', detail: 'In production: transferred to the firm’s PLACEHOLDER transfer destination', tag: 'handed_off' }
      ]
    },
    sofia: {
      label: 'Example 2 · Sofia call (new application)',
      events: [
        { at: T + 3600, what: 'Call started', detail: 'Inbound demo line (202) 932-9700 · Sofia disclosed she is AI; call recorded with notice', tag: 'received' },
        { at: T + 3720, what: 'Matter confirmed', detail: '“You’re calling about Social Security Disability — is that right?” — yes', tag: 'screening' },
        { at: T + 3900, what: 'Verify-only checks passed', detail: 'Self · condition 12+ months · worked/paid into Social Security · no lawyer handling', tag: 'screening' },
        { at: T + 3960, what: 'Qualification line said once', detail: '“It looks like you may qualify.” — exactly once, then name / callback / state / permission collected', tag: 'Verified · firm review · transferred' },
        { at: T + 4020, what: 'Transferred', detail: 'Reference build: same demo chain as Paraquat (CallRail-recorded line to Kyle). Production: firm’s PLACEHOLDER destination', tag: 'handed_off' }
      ]
    },
    quiz: {
      label: 'Example 3 · Guided quiz (appeals path)',
      events: [
        { at: T + 7200, what: 'Quiz completed', detail: 'Door: quiz · page btl-ssdi-quiz · path: appeals (denied within 60 days)', tag: 'received' },
        { at: T + 7260, what: 'Screening result', detail: 'Example outcome: FIRM_REVIEW — an uncertain answer routes to a person, never auto-rejected silently', tag: 'review' },
        { at: T + 7800, what: 'Follow-up scheduled', detail: 'Callback requested on the channel the visitor consented to (consent checkboxes are never prechecked)', tag: 'followup' }
      ]
    }
  };

  function renderExample(key) {
    var tl = $('timeline'); if (!tl) return;
    tl.innerHTML = '';
    EXAMPLES[key].events.forEach(function (e) {
      var li = document.createElement('li');
      var time = document.createElement('time'); time.textContent = fmtDate(e.at);
      var what = document.createElement('div'); what.className = 'what';
      var b = document.createElement('b'); b.textContent = e.what;
      var tag = document.createElement('span'); tag.className = 'status-tag'; tag.textContent = e.tag;
      b.appendChild(tag);
      var span = document.createElement('span'); span.textContent = e.detail;
      what.appendChild(b); what.appendChild(span);
      li.appendChild(time); li.appendChild(what); tl.appendChild(li);
    });
  }
  function buildExampleButtons() {
    var host = $('examples'); if (!host) return;
    Object.keys(EXAMPLES).forEach(function (key, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = EXAMPLES[key].label;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        host.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true'); renderExample(key);
      });
      host.appendChild(b);
    });
    renderExample('form');
  }

  function localTestLeadNote() {
    try {
      var raw = sessionStorage.getItem('ee_ssdi_last_lead');
      if (!raw) return;
      var lead = JSON.parse(raw);
      var note = $('dataNote');
      if (note) note.textContent += ' A local synthetic test lead exists in this browser (' + (lead.door || 'form') + ' door, submitted ' + fmtDate(Date.parse(lead.submitted_at) / 1000) + ') — it was never delivered anywhere.';
    } catch (e) {}
  }

  var liveBtn = $('liveMode'), demoBtn = $('demoMode'), panel = $('syntheticPanel');
  function setMode(synthetic) {
    if (liveBtn) liveBtn.setAttribute('aria-pressed', String(!synthetic));
    if (demoBtn) demoBtn.setAttribute('aria-pressed', String(synthetic));
    if (panel) panel.hidden = !synthetic;
    if (!synthetic) loadFeed();
  }
  if (liveBtn) liveBtn.addEventListener('click', function () { setMode(false); });
  if (demoBtn) demoBtn.addEventListener('click', function () { setMode(true); });
  var refresh = $('refresh'); if (refresh) refresh.addEventListener('click', loadFeed);

  buildExampleButtons();
  loadFeed();
  localTestLeadNote();
})();
