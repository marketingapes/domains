/* BTL survivor lane runtime (candidate v2, 2026-09-29) — sex-abuse-la-county
   Mirrors the Paraquat funnel: qualifier.js (landing dropdowns), prequal.js (quiz, one question at a time)
   and intake.js (contact/callback forms) — with these lane rules:
   - Reads window.EE_LANE (set inline on every page, before GTM). Phone is driven by EE_LANE (placeholder until bound).
   - Pushes ONLY {event, tenant, lane, page} to dataLayer. Never names, phones, answers, outcomes or reasons.
   - intake_endpoint is null: forms validate, fire ee_call_request, then show a calm confirmation with the phone line.
     Nothing is posted anywhere.
   - Outcomes: NOT_A_FIT (a hard check hit), FIRM_REVIEW (uncertain / prefer not to say), QUALIFIED. QUALIFIED and
     FIRM_REVIEW read the same; the visitor is never told which answer mattered.
   - Qualification criteria below are ASSUMED (criteria_status: assumed) and pending attorney review.
   - Trauma-informed: no question asks what happened; every question has "Prefer not to say". */
(function () {
  'use strict';
  var L = window.EE_LANE || {};
  // Placeholder line until Kyle says "bind it". To bind: set phone_tel / phone_display in EE_LANE on the page.
  var TEL = L.phone_tel || '+18888888888';
  var DISPLAY = L.phone_display || '(888) 888-8888';

  window.dataLayer = window.dataLayer || [];
  var fired = {};
  function ev(name, once) {
    if (once && fired[name]) return;
    fired[name] = true;
    window.dataLayer.push({ event: name, tenant: L.tenant || 'BTL', lane: L.lane || '', page: L.page || '' });
  }
  function $(id) { return document.getElementById(id); }
  function each(sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function bindPhones(root) {
    each('a[data-ee-tel]', function (a) { a.setAttribute('href', 'tel:' + TEL); }, root);
    each('[data-ee-phone-text]', function (el) { el.textContent = DISPLAY; }, root);
  }
  bindPhones();
  ev('ee_page_view', true);

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a,button') : null;
    if (!t) return;
    if (t.hasAttribute('data-ee-tel')) ev('ee_call_request');
    else if (t.hasAttribute('data-ee-sofia')) ev('ee_sofia_start');
  });

  // ---- states ----
  var STATES = 'AL Alabama|AK Alaska|AZ Arizona|AR Arkansas|CA California|CO Colorado|CT Connecticut|DE Delaware|DC District of Columbia|FL Florida|GA Georgia|HI Hawaii|ID Idaho|IL Illinois|IN Indiana|IA Iowa|KS Kansas|KY Kentucky|LA Louisiana|ME Maine|MD Maryland|MA Massachusetts|MI Michigan|MN Minnesota|MS Mississippi|MO Missouri|MT Montana|NE Nebraska|NV Nevada|NH New Hampshire|NJ New Jersey|NM New Mexico|NY New York|NC North Carolina|ND North Dakota|OH Ohio|OK Oklahoma|OR Oregon|PA Pennsylvania|RI Rhode Island|SC South Carolina|SD South Dakota|TN Tennessee|TX Texas|UT Utah|VT Vermont|VA Virginia|WA Washington|WV West Virginia|WI Wisconsin|WY Wyoming';
  each('select[data-ee-state]', function (sel) {
    STATES.split('|').forEach(function (s) { var o = document.createElement('option'); o.value = s.slice(0, 2); o.textContent = s.slice(3); sel.appendChild(o); });
  });

  // ---- lane criteria (ASSUMED) ----
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
     "18 or older",
     "dq"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ],
   "label": "Age at the time"
  },
  {
   "id": "where",
   "q": "What kind of place was it?",
   "help": "In Los Angeles County. Pick the closest one.",
   "c": [
    [
     "juvenile",
     "Juvenile hall or probation camp"
    ],
    [
     "foster",
     "Foster placement or group home"
    ],
    [
     "school",
     "School"
    ],
    [
     "youth",
     "Church, youth program or other organization"
    ],
    [
     "other_la",
     "Somewhere else in LA County"
    ],
    [
     "outside",
     "Not in LA County",
     "dq"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ],
   "label": "Type of place"
  },
  {
   "id": "when",
   "q": "About when was it?",
   "help": "A rough idea is fine.",
   "c": [
    [
     "pre1990",
     "Before 1990"
    ],
    [
     "1990_2004",
     "1990 – 2004"
    ],
    [
     "2005_2019",
     "2005 – 2019"
    ],
    [
     "2020_on",
     "2020 or later"
    ],
    [
     "not_sure",
     "Not sure"
    ],
    [
     "prefer_not",
     "Prefer not to say"
    ]
   ],
   "label": "Timeframe"
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
   ],
   "label": "Lawyer for this"
  }
 ]
};
  var STEPS = (typeof QUIZ !== 'undefined' && QUIZ.steps) || [];
  var DQ = 'dq', RV = 'review';
  function flagOf(step, value) {
    var c = step.c.filter(function (x) { return x[0] === value; })[0];
    if (!c) return null;
    if (c[2]) return c[2];
    return (value === 'prefer_not' || value === 'not_sure') ? RV : null;
  }
  function outcomeOf(A) {
    var dq = false, rv = false;
    STEPS.forEach(function (s) { var f = A[s.id] ? flagOf(s, A[s.id]) : null; if (f === DQ) dq = true; if (f === RV) rv = true; });
    return dq ? 'NOT_A_FIT' : rv ? 'FIRM_REVIEW' : 'QUALIFIED';
  }
  function qualificationEvents(o) {
    // Once per page load. Only the event name reaches dataLayer — never the answers or the reason.
    if (fired.ee_qualification_complete) return;
    ev('ee_qualification_complete', true);
    ev(o === 'NOT_A_FIT' ? 'ee_disqualified' : 'ee_qualified', true);
  }
  var TEXT_OK = 'Thank you. Based on what you’ve shared, you may potentially qualify for a free, confidential review by an independent law firm. A person there would decide whether to review it — nothing is guaranteed. You still don’t need to describe what happened.';
  var TEXT_NO = 'Thank you for trusting us with this. Based on what you’ve shared, we may not be able to match you through this page right now. That isn’t a judgment about you or about what happened, and it isn’t a legal opinion. You can still call and talk it through, and support is always available.';

  // ---- contact / callback forms (validate, fire ee_call_request, calm confirmation; nothing is sent) ----
  function setErr(el, msg) {
    var e = $(el.id + '-e');
    if (e) e.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function validate(form) {
    var bad = [];
    each('select[data-q]', function (s) {
      if (!s.value) { setErr(s, 'Choose an answer — “Prefer not to say” is fine.'); bad.push(s); } else setErr(s, '');
    }, form);
    each('input[required]:not([type=checkbox]),select[required]', function (el) {
      if (el.type === 'tel') {
        var d = (el.value || '').replace(/\D/g, '');
        if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
        if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) { setErr(el, 'Please enter a 10-digit U.S. phone number.'); bad.push(el); } else setErr(el, '');
      } else if (!(el.value || '').trim()) {
        setErr(el, el.getAttribute('data-msg') || 'This field is needed so Sofia can reach you.'); bad.push(el);
      } else setErr(el, '');
    }, form);
    each('input[type=email]', function (el) {
      var v = (el.value || '').trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setErr(el, 'Check the email address, or leave it blank.'); bad.push(el); } else setErr(el, '');
    }, form);
    each('input[type=checkbox][required]', function (el) {
      if (!el.checked) { setErr(el, 'Please check the box so Sofia is allowed to call you back.'); bad.push(el); } else setErr(el, '');
    }, form);
    return bad;
  }
  function confirm(form, outcome) {
    var done = $(form.getAttribute('data-done'));
    form.reset();                      // no contact details linger on the page
    form.hidden = true;
    each('[data-hide-on-done]', function (x) { x.hidden = true; }, form.parentNode);
    if (!done) return;
    var msg = done.querySelector('[data-r-msg]');
    if (msg && outcome) msg.textContent = outcome === 'NOT_A_FIT' ? TEXT_NO : TEXT_OK;
    done.hidden = false;
    var h = done.querySelector('[tabindex="-1"]') || done;
    h.focus();
  }
  each('form[data-ee-form]', function (form) {
    var kind = form.getAttribute('data-ee-form');
    var status = form.querySelector('.status');
    form.addEventListener('change', function (e) {
      if (kind === 'landing' && e.target.matches('select[data-q]')) ev('ee_quiz_start', true);
      if (form.getAttribute('data-tried')) validate(form);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.setAttribute('data-tried', '1');
      var bad = validate(form);
      if (bad.length) { if (status) { status.className = 'status err'; status.textContent = 'Please check the highlighted fields.'; } bad[0].focus(); return; }
      if (status) { status.className = 'status'; status.textContent = ''; }
      var outcome = null;
      if (kind === 'landing') {
        var A = {};
        each('select[data-q]', function (s) { A[s.getAttribute('data-q')] = s.value; }, form);
        outcome = outcomeOf(A);
        qualificationEvents(outcome);
      } else if (kind === 'quiz') {
        outcome = window.__laneOutcome || null;
      }
      ev('ee_call_request');
      // intake_endpoint is null for this lane: nothing is transmitted.
      confirm(form, outcome);
    });
  });

  // ---- talk-to-sofia callback toggle ----
  var openCb = $('openCb'), cbPanel = $('cbPanel');
  if (openCb && cbPanel) {
    var open = function () {
      cbPanel.hidden = false; openCb.setAttribute('aria-expanded', 'true');
      var f = cbPanel.querySelector('input'); setTimeout(function () { if (f) f.focus(); cbPanel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }, 30);
    };
    openCb.addEventListener('click', function () {
      if (cbPanel.hidden) open(); else { cbPanel.hidden = true; openCb.setAttribute('aria-expanded', 'false'); }
    });
    if (/[?&]callback=1/.test(location.search)) open();
  }

  // ---- quiz: pre-qual one question at a time (prequal.js pattern) → result/summary → contact ----
  var root = $('quiz');
  if (!root || !$('qStep') || !STEPS.length) return;
  var A = {}, path = [];
  var ACK = ['Thank you.', 'Got it.', 'Okay.', 'Thanks for sharing that.'];
  function show(step) { ['qStep', 'resultStep', 'contactStep'].forEach(function (s) { $(s).hidden = s !== step; }); }
  function say(el, text, cb) {
    if (reduce) { el.textContent = text; if (cb) cb(); return; }
    el.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    setTimeout(function () { el.textContent = text; if (cb) cb(); }, 420);
  }
  function render(idx, ack) {
    var st = STEPS[idx]; show('qStep');
    $('qCount').textContent = 'Question ' + (path.length + 1) + ' of ' + STEPS.length;
    $('qBar').style.width = Math.min(96, path.length / STEPS.length * 100) + '%';
    $('qBack').hidden = !path.length;
    $('qPrompt').textContent = st.q;
    $('qHelp').textContent = st.help || ''; $('qHelp').hidden = !st.help;
    var box = $('qChoices'); box.innerHTML = '';
    var intro = idx === 0 && !path.length ? 'You don’t need to describe what happened, and you can stop at any time. ' : '';
    say($('qSay'), intro + (ack ? ack + ' ' : '') + st.q, function () {
      st.c.forEach(function (c, n) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'choice' + (c[0] === 'prefer_not' ? ' pn' : '');
        b.setAttribute('aria-pressed', A[st.id] === c[0] ? 'true' : 'false');
        b.innerHTML = '<span class="k" aria-hidden="true">' + (n + 1) + '</span><span></span>'; b.lastChild.textContent = c[1];
        b.onclick = function () { pick(idx, c); }; box.appendChild(b);
      });
      var f = box.querySelector('button'); if (f && path.length) f.focus({ preventScroll: true });
    });
  }
  function pick(idx, c) {
    var st = STEPS[idx];
    ev('ee_quiz_start', true);
    A[st.id] = c[0]; path.push(idx);
    if (flagOf(st, c[0]) === DQ) return finish();
    if (idx + 1 >= STEPS.length) return finish();
    render(idx + 1, ACK[path.length % ACK.length]);
  }
  function back() {
    var last = path.pop(); if (last == null) return;
    delete A[STEPS[last].id];
    render(last);
  }
  function summary() {
    var ul = $('rSum'); ul.innerHTML = '';
    STEPS.forEach(function (s) {
      if (!A[s.id]) return;
      var c = s.c.filter(function (x) { return x[0] === A[s.id]; })[0];
      var li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('strong');
      a.textContent = s.label; b.textContent = c[1]; li.appendChild(a); li.appendChild(b); ul.appendChild(li);
    });
  }
  function finish() {
    var o = outcomeOf(A); window.__laneOutcome = o;
    show('resultStep');
    qualificationEvents(o);
    var acts = $('rActions'); acts.innerHTML = '';
    function act(label, cls, fn, tel) {
      var b = document.createElement(tel ? 'a' : 'button');
      if (tel) { b.setAttribute('data-ee-tel', ''); b.href = 'tel:' + TEL; } else { b.type = 'button'; b.onclick = fn; }
      b.className = cls; b.textContent = label; acts.appendChild(b);
    }
    $('rRainn').hidden = o !== 'NOT_A_FIT';
    if (o === 'NOT_A_FIT') {
      $('rSummary').hidden = true;
      say($('rSay'), TEXT_NO);
      act('Call Sofia anyway · ' + DISPLAY, 'next', null, true);
      act('Have a person note it anyway', 'choice', toContact);
      act('Start over', 'choice', restart);
    } else {
      summary(); $('rSummary').hidden = false;
      say($('rSay'), 'Thank you. Based on what you’ve shared, you may potentially qualify for a free, confidential review by an independent law firm. Nothing is guaranteed. Call me now, or leave a safe way to reach you.');
      act('Call Sofia now · ' + DISPLAY, 'next', null, true);
      act('Leave my details for a private callback', 'choice', toContact);
    }
    $('rBack').focus({ preventScroll: true });
  }
  function toContact() { show('contactStep'); var f = $('first_name'); if (f) f.focus(); root.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }
  function restart() { A = {}; path = []; window.__laneOutcome = null; render(0); }
  $('qBack').onclick = back;
  $('rBack').onclick = back;
  var cBack = $('cBack'); if (cBack) cBack.onclick = function () { show('resultStep'); };
  document.addEventListener('keydown', function (e) {
    if ($('qStep').hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    var n = parseInt(e.key, 10); var bs = $('qChoices').querySelectorAll('button');
    if (n >= 1 && n <= bs.length) bs[n - 1].click();
  });
  render(0);
})();
