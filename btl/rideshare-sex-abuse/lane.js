/* BTL survivor lane runtime (candidate, 2026-09-29) — rideshare-sex-abuse
   - Reads window.EE_LANE (set inline on every page, before GTM).
   - Pushes ONLY {event, tenant, lane, page} to dataLayer. Never names, phones, answers or outcomes' reasons.
   - Intake endpoint is null: forms validate, fire ee_call_request, then show a calm confirmation. Nothing is posted anywhere.
   - Qualification criteria below are ASSUMED (criteria_status: assumed) and pending attorney review.
   - Trauma-informed: no question asks what happened; every step has "Prefer not to say". */
(function () {
  'use strict';
  var L = window.EE_LANE || {};
  // Placeholder line until Kyle says "bind it". To bind: set phone_tel / phone_display in EE_LANE on the page.
  var PLACEHOLDER_TEL = '+18888888888', PLACEHOLDER_DISPLAY = '(888) 888-8888';
  var TEL = L.phone_tel || PLACEHOLDER_TEL;
  var DISPLAY = L.phone_display || PLACEHOLDER_DISPLAY;

  window.dataLayer = window.dataLayer || [];
  var fired = {};
  function ev(name, once) {
    if (once && fired[name]) return;
    fired[name] = true;
    window.dataLayer.push({ event: name, tenant: L.tenant || 'BTL', lane: L.lane || '', page: L.page || '' });
  }
  function $(id) { return document.getElementById(id); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  // ---- phone binding (driven from EE_LANE) ----
  each('a[data-ee-tel]', function (a) { a.setAttribute('href', 'tel:' + TEL); });
  each('[data-ee-phone-text]', function (el) { el.textContent = DISPLAY; });

  // ---- page view ----
  ev('ee_page_view', true);

  // ---- delegated CTA tracking ----
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a,button') : null;
    if (!t) return;
    if (t.hasAttribute('data-ee-tel')) ev('ee_call_request');
    else if (t.hasAttribute('data-ee-sofia')) ev('ee_sofia_start');
  });

  // ---- callback form (talk-to-sofia + quiz contact step) ----
  function initCallback(form) {
    if (!form) return;
    var done = $(form.getAttribute('data-done'));
    var status = form.querySelector('.status');
    function setErr(input, msg) {
      var e = $(input.id + '-e');
      if (e) e.textContent = msg || '';
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('[name="cb_name"]');
      var phone = form.querySelector('[name="cb_phone"]');
      var consent = form.querySelector('[name="cb_consent"]');
      var bad = [];
      var n = (name.value || '').trim();
      if (n.length < 1) { setErr(name, 'Please enter a name we can use. A first name is fine.'); bad.push(name); } else setErr(name, '');
      var d = (phone.value || '').replace(/\D/g, '');
      if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
      if (d.length !== 10 || /^[01]/.test(d)) { setErr(phone, 'Please enter a 10-digit U.S. phone number.'); bad.push(phone); } else setErr(phone, '');
      if (!consent.checked) { setErr(consent, 'Please check the box so Sofia is allowed to call you back.'); bad.push(consent); } else setErr(consent, '');
      if (bad.length) { if (status) status.textContent = 'Please check the highlighted fields.'; bad[0].focus(); return; }
      if (status) status.textContent = '';
      ev('ee_call_request');
      // intake_endpoint is null for this lane: nothing is transmitted. Clear the fields so no contact details linger on the page.
      form.reset();
      form.hidden = true;
      if (done) { done.hidden = false; var h = done.querySelector('[tabindex="-1"]') || done; h.focus(); }
    });
  }
  each('form[data-ee-callback]', initCallback);

  // ---- talk-to-sofia callback toggle ----
  var openCb = $('openCb'), cbPanel = $('cbPanel');
  if (openCb && cbPanel) {
    var open = function () {
      cbPanel.hidden = false; openCb.setAttribute('aria-expanded', 'true');
      var c = $('cbCard'); if (c) c.focus({ preventScroll: false });
    };
    openCb.addEventListener('click', function () {
      if (cbPanel.hidden) open(); else { cbPanel.hidden = true; openCb.setAttribute('aria-expanded', 'false'); }
    });
    if (/[?&]callback=1/.test(location.search)) open();
  }

  // ---- quiz ----
  var QUIZ = {
 "steps": [
  {
   "id": "age",
   "q": "How old were you at the time?",
   "help": "Just the age range. You won’t be asked what happened.",
   "c": [
    [
     "under18",
     "Under 18"
    ],
    [
     "18plus",
     "18 or older"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ]
  },
  {
   "id": "where",
   "q": "Which rideshare app was the ride booked through?",
   "help": "In the United States.",
   "c": [
    [
     "uber",
     "Uber"
    ],
    [
     "lyft",
     "Lyft"
    ],
    [
     "other_app",
     "Another app or a regular taxi",
     "dq"
    ],
    [
     "not_sure",
     "Not sure"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ]
  },
  {
   "id": "when",
   "q": "About when was the ride?",
   "help": "A rough idea is fine.",
   "c": [
    [
     "2024_on",
     "2024 or later"
    ],
    [
     "2022_2023",
     "2022 – 2023"
    ],
    [
     "2018_2021",
     "2018 – 2021"
    ],
    [
     "pre2018",
     "Before 2018"
    ],
    [
     "not_sure",
     "Not sure"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ]
  },
  {
   "id": "lawyer",
   "q": "Do you already have a lawyer for this?",
   "help": "If you’ve talked to a lawyer but didn’t sign anything, choose “No.”",
   "c": [
    [
     "no",
     "No"
    ],
    [
     "yes",
     "Yes, a lawyer is handling it",
     "dq"
    ],
    [
     "not_sure",
     "Not sure"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ]
  }
 ]
};
  var root = $('quiz');
  if (!root || !QUIZ) return;
  var A = {}, i = 0;
  var steps = QUIZ.steps;
  function render() {
    var s = steps[i];
    $('qStep').hidden = false; $('resultStep').hidden = true;
    $('qCount').textContent = 'Question ' + (i + 1) + ' of ' + steps.length;
    $('qBar').style.width = Math.round(i / steps.length * 100) + '%';
    $('qBack').hidden = i === 0;
    $('qSay').textContent = s.q;
    $('qPrompt').textContent = s.q;
    $('qHelp').textContent = s.help || ''; $('qHelp').hidden = !s.help;
    var box = $('qChoices'); box.innerHTML = '';
    s.c.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice' + (c[0] === 'prefer_not' ? ' pn' : '');
      b.textContent = c[1];
      b.setAttribute('aria-pressed', A[s.id] === c[0] ? 'true' : 'false');
      b.addEventListener('click', function () { pick(s, c); });
      box.appendChild(b);
    });
  }
  function pick(s, c) {
    ev('ee_quiz_start', true);
    A[s.id] = c[0];
    if (i < steps.length - 1) { i++; render(); root.focus({ preventScroll: true }); }
    else finish();
  }
  function outcome() {
    var dq = false;
    steps.forEach(function (s) { s.c.forEach(function (c) { if (c[0] === A[s.id] && c[2] === 'dq') dq = true; }); });
    return dq ? 'disqualified' : 'qualified';
  }
  function finish() {
    var o = outcome();
    // Fire once per page load; the outcome itself (and why) never goes to dataLayer beyond the event name.
    if (!fired.ee_qualification_complete) {
      ev('ee_qualification_complete', true);
      ev(o === 'qualified' ? 'ee_qualified' : 'ee_disqualified', true);
    }
    $('qStep').hidden = true; $('resultStep').hidden = false;
    $('rOk').hidden = o !== 'qualified';
    $('rNo').hidden = o === 'qualified';
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    root.focus({ preventScroll: true });
  }
  $('qBack').addEventListener('click', function () { if (i > 0) { i--; render(); } });
  each('[data-q-change]', function (b) { b.addEventListener('click', function () { i = steps.length - 1; render(); root.focus({ preventScroll: true }); }); });
  render();
})();
