/* BTL-SSDI-001 form (/ssdi/): three steps (about you → work and health → contact) plus a not-a-fit ending.
   Scoring lives in /ssdi/criteria.js (the buyer's criteria), shared with the quiz.
   A visitor who is not a fit stops after step 2 and is never asked for contact details.
   The visitor never sees which answer mattered. Answers go only to the intake payload (intake.js), never to dataLayer. */
(function () {
  'use strict';
  var form = document.getElementById('leadForm');
  var R = window.SSDI_RULES;
  if (!form || !R) return;

  var steps = [].slice.call(form.querySelectorAll('.step'));
  var label = document.getElementById('stepLabel');
  var meter = document.getElementById('stepMeter');
  var current = 0;

  function value(el) { return el.tagName === 'FIELDSET' ? ((el.querySelector('input:checked') || {}).value || '') : el.value; }
  function answers() {
    var o = {};
    form.querySelectorAll('[data-q]').forEach(function (el) { var v = value(el); if (v) o[el.getAttribute('data-q')] = v; });
    return o;
  }
  function push(evt, extra) {
    var o = { event: evt, page_id: form.getAttribute('data-page-id'), campaign_id: 'BTL-SSDI-001', tenant_id: 'btl' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    (window.dataLayer = window.dataLayer || []).push(o);
  }

  function show(i) {
    steps.forEach(function (s, n) { s.hidden = n !== i; });
    current = i;
    var numbered = i < 3; /* the endings (not a fit, done) have no step number */
    if (label) label.parentNode.hidden = !numbered;
    if (meter) { meter.parentNode.hidden = !numbered; meter.style.width = Math.round(((i + 1) / 3) * 100) + '%'; }
    if (label) label.textContent = 'Step ' + (i + 1) + ' of 3';
    var h = steps[i].querySelector('h2'); if (h) h.focus({ preventScroll: true });
    var card = form.closest('.card'); if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function valid(step) {
    var ok = true;
    step.querySelectorAll('[data-q][data-required]').forEach(function (el) {
      var e = document.getElementById(el.id + '-e');
      var missing = !value(el);
      if (e) e.textContent = missing ? 'Please choose an answer.' : '';
      if (missing) ok = false;
    });
    return ok;
  }

  /* Clear an error as soon as the question is answered. */
  form.addEventListener('change', function (ev) {
    var q = ev.target.closest('[data-q]'); if (!q) return;
    var e = document.getElementById(q.id + '-e'); if (e && value(q)) e.textContent = '';
  });

  form.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-next],[data-back],[data-restart]'); if (!t) return;
    if (t.hasAttribute('data-back')) return show(Math.max(0, current - 1));
    if (t.hasAttribute('data-restart')) { form.reset(); return show(0); }
    if (!valid(steps[current])) { var bad = steps[current].querySelector('.ferr:not(:empty)'); if (bad) bad.parentNode.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    push('ee_form_step_complete', { step: current + 1 });
    if (current === 1) {
      var result = R.outcome(answers());
      if (result === 'NOT_A_FIT') {
        document.getElementById('noFitText').textContent = R.resultText(result);
        push('ee_form_not_a_fit');
        return show(steps.indexOf(form.querySelector('[data-step="nofit"]')));
      }
    }
    show(current + 1);
  });

  /* After intake saves the lead, swap the contact step for the confirmation. */
  form.addEventListener('ee:lead-saved', function (ev) {
    var done = form.querySelector('[data-step="done"]'); if (!done) return;
    document.getElementById('doneText').textContent = ev.detail.message;
    show(steps.indexOf(done));
  });

  window.BTL_SSDI = {
    answers: function () { var a = answers(); a.web_outcome = R.outcome(a); a.criteria_version = R.version; return a; },
    resultText: function () { return R.resultText(R.outcome(answers())); }
  };
})();
