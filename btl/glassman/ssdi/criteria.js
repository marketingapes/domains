/* Glassman copy: same rules as /ssdi/criteria.js until the firm gives its own criteria. */
/* GLASSMAN-SSDI-002 rules: the buyer's criteria, transfer hours and excluded states, in one place.
   Read by the form (/glassman/ssdi/qualifier.js), the quiz (/glassman/ssdi/quiz/quiz.js) and intake (/glassman/ssdi/intake.js).
   Criteria are the buyer's own (2026-10-27): age 54–63, out of work at least a year, not represented,
   currently under a doctor's care, not receiving government disability payments.
   Hours: Mon–Fri 9:30 AM–6:00 PM Eastern. Geo: all US except California and Colorado.
   Outcomes: QUALIFIED = every answer matches; FIRM_REVIEW = a "Not sure" that Sofia confirms on the call;
   NOT_A_FIT = an answer outside the criteria. The visitor never sees which answer mattered. */
(function () {
  'use strict';
  var EXCLUDED_STATES = ['CA', 'CO'];
  var DQ = { age: ['under_54', '64_plus'], out_of_work: ['no'], doctor: ['no'], benefits: ['yes'], lawyer: ['yes'] };
  var RV = { out_of_work: ['not_sure'], doctor: ['not_sure'], benefits: ['not_sure'], lawyer: ['not_sure'] };
  var HOURS = { tz: 'America/New_York', open: 9 * 60 + 30, close: 18 * 60, label: 'Monday–Friday, 9:30 AM–6:00 PM Eastern' };

  function outcome(a) {
    var dq = EXCLUDED_STATES.indexOf(a.state) >= 0, rv = false;
    Object.keys(a).forEach(function (k) {
      if ((DQ[k] || []).indexOf(a[k]) >= 0) dq = true;
      if ((RV[k] || []).indexOf(a[k]) >= 0) rv = true;
    });
    return dq ? 'NOT_A_FIT' : rv ? 'FIRM_REVIEW' : 'QUALIFIED';
  }

  /* True during the buyer's transfer hours. Holidays are not known yet, so they are not excluded. */
  function inHours(date) {
    var parts = {};
    new Intl.DateTimeFormat('en-US', { timeZone: HOURS.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(date || new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var mins = Number(parts.hour) * 60 + Number(parts.minute);
    return ['Sat', 'Sun'].indexOf(parts.weekday) < 0 && mins >= HOURS.open && mins < HOURS.close;
  }

  function resultText(result, date) {
    if (result === 'NOT_A_FIT') return 'Thank you for explaining. Based on what you’ve shared, this doesn’t match what this SSDI review is looking for right now. That isn’t a legal opinion about your situation, and it doesn’t affect any right you may have to apply or appeal on your own.';
    return 'Based on what you’ve shared, you may qualify for a free review by our disability team. ' +
      (inHours(date)
        ? 'If you send your name and number, Sofia, our AI intake assistant, can call you in the next few minutes and connect you with our disability team.'
        : 'If you send your name and number, Sofia, our AI intake assistant, will call you during business hours (' + HOURS.label + ').') +
      ' Nothing is guaranteed.';
  }

  /* What happens to the lead next. Only QUALIFIED leads are offered to the buyer; Sofia confirms FIRM_REVIEW first. */
  function route(result) { return result === 'QUALIFIED' ? 'sofia_transfer' : result === 'FIRM_REVIEW' ? 'sofia_confirm' : 'hold'; }

  window.SSDI_RULES = {
    version: 'glassman-ssdi-002-criteria-2026-10-28',
    excludedStates: EXCLUDED_STATES.slice(),
    hours: HOURS,
    outcome: outcome,
    inHours: inHours,
    resultText: resultText,
    route: route
  };
})();
