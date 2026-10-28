/* BTL-SSDI-001 page script for the callback form (/ssdi/) and Talk to Sofia (/ssdi/talk-to-sofia/):
   picks the call time, opens the callback card in place, shows the thank-you after intake.js saves the lead,
   and tags call clicks. The Sofia call links work only when <body data-sofia-tel> holds the SSDI line
   (otherwise they are hidden: never a line that answers as another Sofia). Nothing identifying goes to dataLayer. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('leadForm');
  var pageId = form ? form.getAttribute('data-page-id') : 'btl-ssdi';
  function push(evt, extra) {
    var o = { event: evt, page_id: pageId, campaign_id: 'BTL-SSDI-001', tenant_id: 'btl' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    (window.dataLayer = window.dataLayer || []).push(o);
  }

  /* Sofia's line */
  var tel = (document.body.getAttribute('data-sofia-tel') || '').trim();
  var ok = /^\+1\d{10}$/.test(tel), d = tel.slice(2);
  document.querySelectorAll('[data-sofia-call]').forEach(function (a) {
    if (!ok) { a.hidden = true; return; }
    a.href = 'tel:' + tel;
    var n = a.querySelector('[data-num]'); if (n) n.textContent = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    a.addEventListener('click', function () { push('ee_call_click', { placement: a.getAttribute('data-sofia-call') }); });
  });

  /* when should Sofia call: tap a time */
  var bt = $('best_time');
  document.querySelectorAll('.when-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.when-opt').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (bt) bt.value = b.getAttribute('data-v');
    });
  });

  /* callback card that opens in place (Talk to Sofia) */
  var open = $('openCb'), panel = $('cbPanel');
  function show() {
    if (!panel || !panel.classList.contains('closed')) return;
    panel.classList.remove('closed');
    if (open) open.setAttribute('aria-expanded', 'true');
    push('ee_form_view');
    setTimeout(function () {
      panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      var n = $('full_name'); if (n) n.focus({ preventScroll: true });
    }, reduced ? 0 : 320);
  }
  if (open && panel) {
    open.addEventListener('click', function () {
      if (panel.classList.contains('closed')) show();
      else { panel.classList.add('closed'); open.setAttribute('aria-expanded', 'false'); }
    });
    if (location.hash === '#cbPanel' || location.hash === '#callback') show();
  }

  /* links to the form scroll to it and put the cursor in the name field */
  document.querySelectorAll('a[href="#request"],a[href="#cbPanel"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (panel && a.getAttribute('href') === '#cbPanel') { e.preventDefault(); show(); return; }
      var n = $('full_name'); if (n) setTimeout(function () { n.focus({ preventScroll: true }); }, reduced ? 0 : 450);
    });
  });

  /* after intake.js saves the lead, the form becomes the thank-you */
  if (form) form.addEventListener('ee:lead-saved', function (ev) {
    var body = $('formBody'), done = $('formDone');
    if (!body || !done) return;
    body.hidden = true;
    $('doneText').textContent = ev.detail.message;
    done.hidden = false;
    var h = done.querySelector('h2'); if (h) h.focus();
  });
})();
