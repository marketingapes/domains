/* GLASSMAN-SSDI-002 rules: Glassman's criteria, intake hours and excluded states, in one place.
   Read by the quiz (/glassman/ssdi/quiz/quiz.js) and intake (/glassman/ssdi/intake.js).
   Firm review criteria (Nov 10): age 48–64, stopped working within the past five years, treated or diagnosed by a doctor,
   no lawyer yet, not already getting disability payments, all states except ND, SD, AK and HI. Intake is staffed
   Mon–Fri 8 AM–7:30 PM Eastern. These are the firm's review criteria, not a Social Security eligibility decision.
   Answer key stopped_work_5yr replaced out_of_work (which meant "out of work for at least a year") on Nov 10; the old
   key is no longer sent. doctor now means "treated or diagnosed by a doctor" (it meant "currently under a doctor's care").
   Outcomes: QUALIFIED = every answer matches; FIRM_REVIEW = a "Not sure" that Sofia confirms on the call;
   NOT_A_FIT = an answer outside the criteria. The visitor never sees which answer mattered. */
(function () {
  'use strict';
  var EXCLUDED_STATES = ['ND', 'SD', 'AK', 'HI'];
  var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  var VALID_ANSWERS = {
    state: STATES,
    age: ['under_48', '48_64', '65_plus'],
    stopped_work_5yr: ['yes', 'no', 'not_sure'],
    doctor: ['yes', 'no', 'not_sure'],
    benefits: ['yes', 'no', 'not_sure'],
    lawyer: ['yes', 'no', 'not_sure']
  };
  var DQ = { age: ['under_48', '65_plus'], stopped_work_5yr: ['no'], doctor: ['no'], benefits: ['yes'], lawyer: ['yes'] };
  var RV = { stopped_work_5yr: ['not_sure'], doctor: ['not_sure'], benefits: ['not_sure'], lawyer: ['not_sure'] };
  var HOURS = { tz: 'America/New_York', open: 8 * 60, close: 19 * 60 + 30, label: 'Monday–Friday, 8:00 AM–7:30 PM Eastern' };

  /* Missing/invalid answers are unfinished screening, never a qualification decision.
     Return field names only; contact and answer values never become analytics errors. */
  function invalidAnswers(a) {
    var fields = Object.keys(VALID_ANSWERS);
    if (!a || typeof a !== 'object' || Array.isArray(a)) return fields;
    return fields.filter(function (k) {
      return !Object.prototype.hasOwnProperty.call(a, k) || VALID_ANSWERS[k].indexOf(a[k]) < 0;
    });
  }

  function outcome(a) {
    if (invalidAnswers(a).length) return null;
    var dq = EXCLUDED_STATES.indexOf(a.state) >= 0, rv = false;
    Object.keys(VALID_ANSWERS).forEach(function (k) {
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
    if (['QUALIFIED', 'FIRM_REVIEW', 'NOT_A_FIT'].indexOf(result) < 0) return 'Please finish all six questions to request a review.';
    if (result === 'NOT_A_FIT') return 'Thank you for explaining. Based on what you’ve shared, this doesn’t match what this SSDI review is looking for right now. That isn’t a legal opinion about your situation, and it doesn’t affect any right you may have to apply or appeal on your own.';
    return 'Based on what you’ve shared, you may qualify for a free review by our disability team. ' +
      'If you submit your contact details, the team will review your callback request. ' +
      'Your chosen time is a preference, not a confirmed appointment. Nothing is guaranteed.';
  }

  /* What happens to the lead next. Only QUALIFIED leads are offered to the buyer; Sofia confirms FIRM_REVIEW first. */
  function route(result) { return result === 'QUALIFIED' ? 'sofia_transfer' : result === 'FIRM_REVIEW' ? 'sofia_confirm' : 'hold'; }

  window.SSDI_RULES = {
    version: 'glassman-ssdi-002-criteria-2026-11-10-v2',
    excludedStates: EXCLUDED_STATES.slice(),
    hours: HOURS,
    invalidAnswers: invalidAnswers,
    outcome: outcome,
    inHours: inHours,
    resultText: resultText,
    route: route
  };
})();
