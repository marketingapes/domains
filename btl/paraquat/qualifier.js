/* BTL Paraquat dropdown qualifier (/paraquat/). One form: qualifying dropdowns + contact details.
   Scored on the receiving firm's criteria (same rules as prequal.js / Sofia "BTL Paraquat v4"):
   NOT_A_FIT = a firm disqualifier, FIRM_REVIEW = uncertain or a review trigger, QUALIFIED = everything matches.
   The visitor never sees which answer mattered. Answers go only to the intake payload (intake.js), never to dataLayer. */
(function () {
  'use strict';
  var form = document.getElementById('leadForm');
  if (!form) return;
  var DQ = {
    diagnosis: ['no'], contact: ['no'], lawyer: ['handling', 'signed'], job: ['home'], role: ['other'], product: ['retail'],
    years: ['pre1964'], cont13: ['no'], season: ['no'], meth: ['yes']
  };
  var RV = {
    diagnosis: ['not_sure'], contact: ['not_sure'], lawyer: ['not_sure'], job: ['not_sure'], role: ['sprayed_on', 'not_sure'], product: ['not_sure'],
    years: ['2011_on', 'not_sure'], age: ['not_sure'], cont13: ['not_sure'], season: ['not_sure'], acres: ['under3', 'not_sure'],
    meth: ['prefer_not'], passed: ['1_2y', '2_3y', 'over3y', 'not_sure']
  };
  function val(id) { var el = form.querySelector('select[data-q="' + id + '"]'); return el && !el.closest('[hidden]') ? el.value : ''; }
  function show(id, on) {
    var wrap = document.getElementById('w-' + id); if (!wrap) return;
    wrap.hidden = !on;
    var sel = wrap.querySelector('select');
    if (sel) { if (on) sel.setAttribute('required', ''); else { sel.removeAttribute('required'); sel.value = ''; } }
  }
  function sync() {
    show('passed', val('who') === 'family_deceased');
    show('cont13', val('age') === '12under');
    show('season', val('age') === '13_17' || (val('age') === '12under' && val('cont13') === 'yes'));
  }
  form.addEventListener('change', function (e) { if (e.target.matches('select[data-q]')) sync(); });
  sync();

  function answers() {
    var o = {};
    form.querySelectorAll('select[data-q]').forEach(function (s) { if (!s.closest('[hidden]') && s.value) o[s.getAttribute('data-q')] = s.value; });
    return o;
  }
  function outcome(a) {
    var dq = false, rv = false;
    Object.keys(a).forEach(function (k) {
      if ((DQ[k] || []).indexOf(a[k]) >= 0) dq = true;
      if ((RV[k] || []).indexOf(a[k]) >= 0) rv = true;
    });
    return dq ? 'NOT_A_FIT' : rv ? 'FIRM_REVIEW' : 'QUALIFIED';
  }
  window.BTL_QUIZ = {
    answers: function () { var a = answers(); a.web_outcome = outcome(a); a.quiz_version = 'btl-paraquat-dropdown-2026-09-28-v4criteria'; return a; },
    resultText: function () {
      return outcome(answers()) === 'NOT_A_FIT'
        ? 'Thank you for explaining. Based on what you’ve shared, this doesn’t match what this Paraquat review is looking for right now. That isn’t a legal opinion about your situation.'
        : 'Based on what you’ve shared, you may potentially qualify for further review. A person at an independent law firm would look at the details and decide whether to review it — nothing is guaranteed.';
    }
  };
})();
