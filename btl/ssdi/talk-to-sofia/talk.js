/* BTL-SSDI-001 Talk to Sofia page: opens the callback card in place, types Sofia's questions in the hero,
   picks the call time, plays the example call when it scrolls in, and swaps the form for the confirmation
   after intake.js saves the lead. The call button shows only when <body data-sofia-tel> holds the SSDI line. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  function push(evt, extra) {
    var o = { event: evt, page_id: 'btl-ssdi-call-first', campaign_id: 'BTL-SSDI-001', tenant_id: 'btl' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    (window.dataLayer = window.dataLayer || []).push(o);
  }

  /* callback card opens in place */
  var open = $('openCb'), panel = $('cbPanel');
  function show() {
    if (!panel.classList.contains('closed')) return;
    panel.classList.remove('closed');
    open.setAttribute('aria-expanded', 'true');
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
    document.querySelectorAll('a[href="#cbPanel"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); show(); }); });
  }

  /* Sofia's own line: shown only when set */
  var tel = (document.body.getAttribute('data-sofia-tel') || '').trim(), call = $('callSofia');
  if (call && /^\+1\d{10}$/.test(tel)) {
    var d = tel.slice(2);
    call.href = 'tel:' + tel;
    $('callNum').textContent = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    call.hidden = false;
    call.addEventListener('click', function () { push('ee_call_click', { placement: 'hero_call' }); });
  }

  /* "Sofia asks:" types each question in turn */
  var tick = $('tick');
  var QS = ['Which state do you live in?', 'How old are you?', 'Out of work a year or more?', 'Seeing a doctor now?', 'Getting disability payments now?', 'Already have a lawyer?'];
  if (tick && !reduced) {
    var qi = 0;
    (function next() {
      var q = QS[qi % QS.length], i = 0; qi++;
      tick.textContent = '';
      (function type() {
        tick.textContent = q.slice(0, ++i);
        if (i < q.length) setTimeout(type, 38); else setTimeout(next, 1800);
      })();
    })();
  }

  /* when should she call: tap a time */
  var bt = $('best_time');
  document.querySelectorAll('.when-opt').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.when-opt').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (bt) bt.value = b.getAttribute('data-v');
    });
  });

  /* example call plays line by line, with a running clock */
  var lines = [].slice.call(document.querySelectorAll('#callLines li'));
  var demo = $('callDemo'), clock = $('callClock');
  if (demo && lines.length && !reduced && 'IntersectionObserver' in window) {
    lines.forEach(function (li) { li.classList.add('wait'); });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t = 0, timer = setInterval(function () { t++; if (clock) clock.textContent = Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); if (t >= 187) clearInterval(timer); }, 1000);
      lines.forEach(function (li, n) { setTimeout(function () { li.classList.remove('wait'); }, 500 + n * 900); });
    }, { threshold: 0.35 });
    io.observe(demo);
  }

  /* after intake.js saves the lead, show the confirmation */
  var form = $('leadForm');
  if (form) form.addEventListener('ee:lead-saved', function (ev) {
    $('cbBody').hidden = true;
    var done = $('cbDone');
    $('cbDoneText').textContent = ev.detail.message;
    done.hidden = false;
    var h = done.querySelector('h2'); if (h) h.focus();
  });
})();
