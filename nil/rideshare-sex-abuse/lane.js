/* Nearest Injury Lawyers — lane behaviour v2 (landing qualifier / step-by-step quiz / talk to Sofia).
 * Reads window.EE_LANE (inline in <head>) and, on the quiz page, window.EE_PREQUAL (lane questions).
 * - dataLayer receives ONLY {event, tenant, lane, page}. Never names, phones, emails, answers or states.
 * - EE_LANE.intake_endpoint is null: forms validate, fire ee_call_request, then offer the phone line.
 *   Nothing is POSTed anywhere. (Blocker: wire a NIL intake endpoint before go-live.)
 * Outcomes (criteria ASSUMED): NOT_A_FIT = a hard check hit, FIRM_REVIEW = unsure/prefer-not, QUALIFIED.
 * The visitor never sees which answer mattered; FIRM_REVIEW and QUALIFIED read the same.
 */
(function () {
  'use strict';
  var L = window.EE_LANE || {};
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fired = {};
  function track(ev, once) {
    if (once && fired[ev]) return;
    fired[ev] = 1;
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: ev, tenant: L.tenant, lane: L.lane, page: L.page });
    } catch (e) {}
    try {
      if (ev === 'ee_call_request' && typeof window.fbq === 'function' && L.meta_pixel_direct === true) window.fbq('track', 'Contact');
    } catch (e) {}
  }
  window.eeTrack = track;

  // ---- Phone line (placeholder until Kyle binds it) ----------------------------------------------
  function bindPhones(root) {
    if (L.phone_tel) (root || document).querySelectorAll('a[data-phone]').forEach(function (a) { a.setAttribute('href', 'tel:' + L.phone_tel); });
    if (L.phone_display) (root || document).querySelectorAll('[data-phone-display]').forEach(function (el) { el.textContent = L.phone_display; });
  }
  bindPhones();

  // ---- Clicks: Sofia CTA, our phone line (not support hotlines), quick exit -----------------------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-sofia-cta]')) track('ee_sofia_start');
    if (t.closest('a[data-phone]')) track('ee_call_request');
    if (t.closest('[data-exit]')) { e.preventDefault(); try { window.location.replace('https://www.google.com/'); } catch (x) {} }
  });

  // ---- Shared form validation (no endpoint) --------------------------------------------------------
  function setErr(field, msg) {
    var e = field.id && $(field.id + '-e');
    if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    if (e) e.textContent = msg || '';
  }
  function validate(form) {
    var first = null;
    var bad = function (f, m) { setErr(f, m); if (!first) first = f; };
    form.querySelectorAll('input:not([type=checkbox]):not(.hp),select').forEach(function (f) {
      if (f.closest('[hidden]')) return;
      setErr(f, '');
      var v = (f.value || '').trim();
      if (f.required && !v) return bad(f, f.getAttribute('data-msg') || 'Please complete this field.');
      if (f.type === 'tel' && v) {
        var d = v.replace(/\D/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
        if (d.length !== 10) return bad(f, 'Please enter a 10-digit U.S. phone number.');
      }
      if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return bad(f, 'Please check the email address, or leave it blank.');
    });
    var c = form.querySelector('[name="consent"]');
    var box = c && c.closest('.consent');
    if (box) box.removeAttribute('aria-invalid');
    if (c && !c.checked) { if (box) box.setAttribute('aria-invalid', 'true'); if (!first) first = c; }
    var st = form.querySelector('.status');
    if (st) st.textContent = first ? (first === c ? 'Please review and check the contact permission box to continue.' : 'Please check the highlighted fields.') : '';
    if (first) { first.focus(); return false; }
    return true;
  }
  function flagOf(sel) { var o = sel.options[sel.selectedIndex]; return o ? o.getAttribute('data-flag') : null; }
  function outcomeOf(flags) { return flags.indexOf('dq') >= 0 ? 'NOT_A_FIT' : flags.indexOf('review') >= 0 ? 'FIRM_REVIEW' : 'QUALIFIED'; }
  function showDone(form, outcome) {
    var done = $(form.getAttribute('data-done'));
    var hide = form.getAttribute('data-hide') ? $(form.getAttribute('data-hide')) : form;
    hide.hidden = true;
    if (!done) return;
    done.querySelectorAll('[data-out]').forEach(function (el) { el.hidden = el.getAttribute('data-out') !== (outcome === 'NOT_A_FIT' ? 'nofit' : 'fit'); });
    done.hidden = false;
    var h = done.querySelector('h2,h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  // ---- Landing: dropdown qualifier + contact in one card ------------------------------------------
  document.querySelectorAll('form[data-qualifier]').forEach(function (form) {
    form.addEventListener('change', function (e) { if (e.target.matches('select[data-q]')) track('ee_quiz_start', true); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = form.querySelector('.hp[name]'); if (hp && hp.value) return;
      if (!validate(form)) return;
      var flags = [];
      form.querySelectorAll('select[data-q]').forEach(function (s) { var f = flagOf(s); if (f) flags.push(f); });
      var o = outcomeOf(flags);
      track('ee_qualification_complete');
      track(o === 'NOT_A_FIT' ? 'ee_disqualified' : 'ee_qualified');
      track('ee_call_request');
      showDone(form, o);
    });
  });

  // ---- Callback / contact forms --------------------------------------------------------------------
  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = form.querySelector('.hp[name]'); if (hp && hp.value) return;
      if (!validate(form)) return;
      track('ee_call_request');
      showDone(form, form.getAttribute('data-outcome') || 'QUALIFIED');
    });
  });

  // ---- Talk to Sofia: callback panel toggle --------------------------------------------------------
  var openCb = $('openCb'), cbPanel = $('cbPanel');
  if (openCb && cbPanel) {
    var open = function (focus) {
      cbPanel.hidden = false; openCb.setAttribute('aria-expanded', 'true');
      if (focus) { var f = cbPanel.querySelector('input'); if (f) f.focus({ preventScroll: true }); cbPanel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }
    };
    openCb.addEventListener('click', function () {
      if (cbPanel.hidden) { track('ee_sofia_start'); open(true); } else { cbPanel.hidden = true; openCb.setAttribute('aria-expanded', 'false'); }
    });
    if (/[?&]callback=1/.test(location.search)) open(false);
  }

  // ---- Step-by-step quiz (pre-qual → Sofia's read → contact) --------------------------------------
  var P = window.EE_PREQUAL;
  if (P && $('quiz')) {
    var STEPS = P.steps, A = {}, flags = {}, path = [];
    var ACK = P.acks || ['Thanks.', 'Got it.', 'Okay.', 'Thank you.', 'Understood.'];
    var show = function (step) { ['qStep', 'resultStep', 'contactStep'].forEach(function (s) { $(s).hidden = s !== step; }); };
    var say = function (el, text, cb) {
      if (reduce) { el.textContent = text; if (cb) cb(); return; }
      el.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      setTimeout(function () { el.textContent = text; if (cb) cb(); }, 420);
    };
    var labelOf = function (st, v) {
      if (st.type === 'state') { if (v === 'prefer_not') return 'Prefer not to say'; return P.states[v] || v; }
      var c = st.c.filter(function (x) { return x[0] === v; })[0]; return c ? c[1] : v;
    };
    var button = function (label, cls, fn, n) {
      var b = document.createElement('button'); b.type = 'button'; b.className = cls;
      if (n) { b.innerHTML = '<span class="k" aria-hidden="true">' + n + '</span><span></span>'; b.lastChild.textContent = label; } else b.textContent = label;
      b.onclick = fn; return b;
    };
    var render = function (idx, ack) {
      var st = STEPS[idx]; show('qStep');
      $('qCount').textContent = 'Question ' + (path.length + 1) + ' of ' + STEPS.length;
      $('qBar').style.width = Math.min(96, path.length / STEPS.length * 100) + '%';
      $('qBack').hidden = !path.length;
      $('qPrompt').textContent = st.q;
      $('qHelp').textContent = st.help || ''; $('qHelp').hidden = !st.help;
      var box = $('qChoices'); box.innerHTML = '';
      say($('qSay'), (ack ? ack + ' ' : '') + st.q, function () {
        if (st.type === 'state') {
          var wrap = document.createElement('div'); wrap.className = 'q-state';
          wrap.innerHTML = '<div class="field"><label for="qStateSel">State</label><select id="qStateSel" data-msg="Please choose a state' + (st.prefer ? ', or choose “Prefer not to say.”' : '.') + '"><option value="">Select a state…</option></select><span class="ferr" id="qStateSel-e"></span></div>';
          var sel = wrap.querySelector('select');
          Object.keys(P.states).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = P.states[k]; sel.appendChild(o); });
          if (A[st.id] && A[st.id] !== 'prefer_not') sel.value = A[st.id];
          wrap.appendChild(button('Continue', 'next', function () {
            if (!sel.value) { setErr(sel, sel.getAttribute('data-msg')); sel.focus(); return; }
            setErr(sel, ''); pick(idx, [sel.value, P.states[sel.value]]);
          }));
          if (st.prefer) wrap.appendChild(button('Prefer not to say', 'choice quiet', function () { pick(idx, ['prefer_not', 'Prefer not to say', 'review']); }));
          box.appendChild(wrap);
        } else {
          st.c.forEach(function (c, n) {
            var b = button(c[1], 'choice' + (c[0] === 'prefer_not' ? ' quiet' : ''), function () { pick(idx, c); }, n + 1);
            b.setAttribute('aria-pressed', A[st.id] === c[0] ? 'true' : 'false');
            box.appendChild(b);
          });
        }
        var f = box.querySelector('button,select'); if (f && path.length) f.focus({ preventScroll: true });
      });
    };
    var pick = function (idx, c) {
      var st = STEPS[idx];
      if (!path.length) track('ee_quiz_start', true);
      A[st.id] = c[0]; path.push(idx);
      if (c[2]) flags[st.id] = c[2]; else delete flags[st.id];
      if (c[2] === 'dq' || idx + 1 >= STEPS.length) return finish();
      render(idx + 1, ACK[path.length % ACK.length]);
    };
    var back = function () {
      var last = path.pop(); if (last == null) return;
      delete A[STEPS[last].id]; delete flags[STEPS[last].id];
      render(last);
    };
    var outcome = function () { return outcomeOf(Object.keys(flags).map(function (k) { return flags[k]; })); };
    var summary = function () {
      var parts = [];
      STEPS.forEach(function (st) { if (A[st.id]) var lb = labelOf(st, A[st.id]); parts.push(st.sum + ': ' + (st.type === 'state' && A[st.id] !== 'prefer_not' ? lb : lb.toLowerCase()) + '.'); });
      parts.push(P.nextLine);
      return parts.join(' ');
    };
    var finish = function () {
      var o = outcome(); show('resultStep');
      track('ee_qualification_complete');
      track(o === 'NOT_A_FIT' ? 'ee_disqualified' : 'ee_qualified');
      var acts = $('rActions'); acts.innerHTML = '';
      var fitOnly = document.querySelectorAll('[data-fit-only]');
      if (o === 'NOT_A_FIT') {
        $('rSummary').hidden = true;
        fitOnly.forEach(function (el) { el.hidden = true; });
        say($('rSay'), P.notFit);
        acts.appendChild(button(P.noteAnyway, 'choice', toContact));
        acts.appendChild(button('Start over', 'choice', restart));
      } else {
        $('rSummaryText').textContent = summary(); $('rSummary').hidden = false;
        fitOnly.forEach(function (el) { el.hidden = false; });
        say($('rSay'), P.fit);
        var call = document.createElement('a'); call.className = 'next'; call.setAttribute('data-phone', ''); call.href = 'tel:+18888888888';
        call.innerHTML = 'Call Sofia now · <span data-phone-display>(888) 888-8888</span>';
        acts.appendChild(call); bindPhones(acts);
        acts.appendChild(button('Leave my details for a callback', 'choice', toContact));
      }
      var cf = $('contactForm'); if (cf) cf.setAttribute('data-outcome', o);
      $('rBack').focus({ preventScroll: true });
    };
    var toContact = function () {
      show('contactStep');
      var s = $('state'); var sv = A[P.stateKey];
      if (s && sv && sv !== 'prefer_not' && !s.value) s.value = sv;
      $('first_name').focus({ preventScroll: true });
      $('quiz').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    };
    var restart = function () { A = {}; path = []; flags = {}; render(0); };
    $('qBack').onclick = back;
    $('rBack').onclick = back;
    var cBack = $('cBack'); if (cBack) cBack.onclick = function () { show('resultStep'); };
    document.addEventListener('keydown', function (e) {
      if ($('qStep').hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      var n = parseInt(e.key, 10); var bs = $('qChoices').querySelectorAll('button.choice');
      if (n >= 1 && n <= bs.length) bs[n - 1].click();
    });
    render(0);
  }

  track('ee_page_view', true);
})();
