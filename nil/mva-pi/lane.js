/* Nearest Injury Lawyers — lane behaviour (landing / quiz / talk-to-sofia).
 * Reads window.EE_LANE (set inline in <head>).
 * - dataLayer receives ONLY {event, tenant, lane, page}. Never names, phones, answers or states.
 * - EE_LANE.intake_endpoint is null: callback forms validate and fire ee_call_request, then offer the
 *   phone line. Nothing is POSTed anywhere. (Blocker: wire a NIL intake endpoint before go-live.)
 */
(function () {
  'use strict';
  var L = window.EE_LANE || {};

  var fired = {};
  function track(ev, once) {
    if (once && fired[ev]) return;
    fired[ev] = 1;
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: ev, tenant: L.tenant, lane: L.lane, page: L.page });
    } catch (e) {}
    // Direct Meta pixel only exists when EE_LANE.meta_pixel_direct === true (see <head>).
    try {
      if (ev === 'ee_call_request' && typeof window.fbq === 'function' && L.meta_pixel_direct === true) window.fbq('track', 'Contact');
    } catch (e) {}
  }
  window.eeTrack = track;

  // ---- Phone line (placeholder until Kyle binds it) -------------------------------------------
  if (L.phone_tel) {
    document.querySelectorAll('a[data-phone]').forEach(function (a) { a.setAttribute('href', 'tel:' + L.phone_tel); });
  }
  if (L.phone_display) {
    document.querySelectorAll('[data-phone-display]').forEach(function (el) { el.textContent = L.phone_display; });
  }

  // ---- Clicks: Sofia CTA + our phone line (not support hotlines) --------------------------------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-sofia-cta]')) track('ee_sofia_start');
    if (t.closest('a[data-phone]')) track('ee_call_request');
    var ex = t.closest('[data-exit]');
    if (ex) { e.preventDefault(); try { window.location.replace('https://www.google.com/'); } catch (x) {} }
  });

  // ---- Quiz -------------------------------------------------------------------------------------
  var quiz = document.querySelector('[data-quiz]');
  if (quiz) {
    var steps = Array.prototype.slice.call(quiz.querySelectorAll('.q'));
    var answers = {};
    var idx = 0;
    var started = false;
    var stepCount = document.getElementById('stepCount');
    var bar = document.getElementById('progressBar');
    var shell = document.getElementById('quizShell');

    var show = function (n, focus) {
      idx = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach(function (s, i) { s.hidden = i !== idx; });
      if (stepCount) stepCount.textContent = 'Question ' + (idx + 1) + ' of ' + steps.length;
      if (bar) bar.style.width = ((idx) / steps.length * 100) + '%';
      var err = steps[idx].querySelector('.error');
      if (err) err.hidden = true;
      if (focus) { var lg = steps[idx].querySelector('.question'); if (lg) lg.focus(); }
    };

    var finish = function () {
      var fn = typeof window.EE_QUALIFY === 'function' ? window.EE_QUALIFY : function () { return { ok: true }; };
      var r = fn(answers) || { ok: true };
      if (bar) bar.style.width = '100%';
      track('ee_qualification_complete');
      track(r.ok ? 'ee_qualified' : 'ee_disqualified');
      shell.hidden = true;
      var panel = document.querySelector('[data-result="' + (r.ok ? 'ok' : 'no') + '"]');
      if (panel) {
        panel.querySelectorAll('[data-reason]').forEach(function (el) { el.hidden = el.getAttribute('data-reason') !== r.reason; });
        panel.hidden = false;
        var h = panel.querySelector('h2');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      }
    };

    var answer = function (step, value) {
      answers[step.getAttribute('data-key')] = value;
      if (!started) { started = true; track('ee_quiz_start'); }
      step.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-value') === value)); });
      if (idx < steps.length - 1) show(idx + 1, true); else finish();
    };

    quiz.addEventListener('click', function (e) {
      var step = e.target.closest('.q');
      if (!step) return;
      var o = e.target.closest('.opt');
      if (o) { answer(step, o.getAttribute('data-value')); return; }
      if (e.target.closest('[data-back]')) { show(idx - 1, true); return; }
      if (e.target.closest('[data-continue]')) {
        var sel = step.querySelector('select');
        var err = step.querySelector('.error');
        if (!sel.value) {
          sel.setAttribute('aria-invalid', 'true');
          if (err) err.hidden = false;
          sel.focus();
          return;
        }
        sel.removeAttribute('aria-invalid');
        answer(step, sel.value);
      }
    });

    document.querySelectorAll('[data-restart]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('[data-result]').forEach(function (p) { p.hidden = true; });
        answers = {};
        steps.forEach(function (s) { s.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); });
        shell.hidden = false;
        show(0, true);
      });
    });

    steps.forEach(function (s) { s.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); }); });
    show(0, false);
  }

  // ---- Callback forms (no endpoint: validate, fire event, offer phone) -------------------------
  document.querySelectorAll('form[data-callback]').forEach(function (form) {
    var err = form.querySelector('.error');
    var fail = function (field, msg) {
      field.setAttribute('aria-invalid', 'true');
      err.textContent = msg;
      err.hidden = false;
      field.focus();
      return false;
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('[name="first_name"]');
      var phone = form.querySelector('[name="phone"]');
      var consent = form.querySelector('[name="consent"]');
      var hp = form.querySelector('[name="company_website"]');
      [name, phone, consent].forEach(function (f) { f.removeAttribute('aria-invalid'); });
      err.hidden = true;
      if (hp && hp.value) return;
      if (!name.value.trim()) return fail(name, 'Please enter a first name (or what you would like to be called).');
      var digits = phone.value.replace(/\D/g, '');
      if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
      if (digits.length !== 10) return fail(phone, 'Please enter a 10-digit U.S. phone number.');
      if (!consent.checked) return fail(consent, 'Please review and check the contact permission box to continue.');
      // intake_endpoint is null — nothing leaves the browser. Only the non-identifying event fires.
      track('ee_call_request');
      var done = document.getElementById(form.getAttribute('data-done'));
      form.hidden = true;
      if (done) {
        done.hidden = false;
        var h = done.querySelector('h3');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      }
    });
  });

  track('ee_page_view', true);
})();
