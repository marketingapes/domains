/* BTL-SSDI-001 form qualifier (/ssdi/). One form: qualifying dropdowns + contact details.
   Scoring lives in /ssdi/criteria.js (the buyer's criteria), shared with the quiz.
   The visitor never sees which answer mattered. Answers go only to the intake payload (intake.js), never to dataLayer. */
(function () {
  'use strict';
  var form = document.getElementById('leadForm');
  var R = window.SSDI_RULES;
  if (!form || !R) return;

  function answers() {
    var o = {};
    form.querySelectorAll('select[data-q]').forEach(function (s) { if (s.value) o[s.getAttribute('data-q')] = s.value; });
    return o;
  }
  window.BTL_SSDI = {
    answers: function () { var a = answers(); a.web_outcome = R.outcome(a); a.criteria_version = R.version; return a; },
    resultText: function () { return R.resultText(R.outcome(answers())); }
  };
})();
