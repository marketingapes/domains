/* SSDI-PILOT-001 dropdown qualifier (/ssdi/). One form: qualifying dropdowns + contact details.
   Mirrors the BTL Paraquat pattern (qualifier.js): scored on the receiving firm's EXAMPLE criteria.
   NOT_A_FIT = an example disqualifier, FIRM_REVIEW = uncertain or a review trigger, QUALIFIED = everything matches.
   The visitor never sees which answer mattered. Answers go only to the intake payload (intake.js), never to dataLayer.

   ⚠ MARKED ASSUMPTION — SCOPE: it is not yet known whether the adopting firm wants new applications,
   denied-claim appeals, or both. Both paths exist here; the demo defaults to NEW APPLICATIONS.
   Appeals swaps the work-history check for applied-before + denied, and adds denial timing + current benefits.
   All criteria below are published-example grade — firm + counsel confirm before any live run. */
(function () {
  'use strict';
  var form = document.getElementById('leadForm');
  if (!form) return;

  var DQ = {
    condition: ['no'], duration: ['no'], work_history: ['no'], fra: ['at_or_over'],
    lawyer: ['handling', 'signed'], denied: ['no'], receiving: ['yes']
  };
  var RV = {
    who: ['other'], condition: ['not_sure'], duration: ['not_sure'], work_history: ['not_sure'],
    fra: ['not_sure'], lawyer: ['not_sure'], denied: ['not_sure'], denied_when: ['over60', 'not_sure'],
    receiving: ['not_sure']
  };
  function val(id) { var el = form.querySelector('select[data-q="' + id + '"]'); return el && !el.closest('[hidden]') ? el.value : ''; }
  function show(id, on) {
    var wrap = document.getElementById('w-' + id); if (!wrap) return;
    wrap.hidden = !on;
    var sel = wrap.querySelector('select');
    if (sel) { if (on) sel.setAttribute('required', ''); else { sel.removeAttribute('required'); sel.value = ''; } }
  }
  function sync() {
    var appeals = val('path') === 'appeals';
    show('work_history', !appeals);
    show('denied', appeals);
    show('denied_when', appeals && val('denied') === 'yes');
    show('receiving', appeals);
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
  window.BTL_SSDI = {
    answers: function () { var a = answers(); a.web_outcome = outcome(a); a.quiz_version = 'ssdi-pilot-001-form-2026-10-19-v1-example'; return a; },
    resultText: function () {
      return outcome(answers()) === 'NOT_A_FIT'
        ? 'Thank you for explaining. Based on what you’ve shared, this doesn’t match what this SSDI review is looking for right now. That isn’t a legal opinion about your situation, and it doesn’t affect any right you may have to apply or appeal on your own.'
        : 'Based on what you’ve shared, you may potentially qualify for further review. A person at an independent law firm would look at the details and decide whether to review it — nothing is guaranteed.';
    }
  };
})();
