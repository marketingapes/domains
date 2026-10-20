/* SSDI-PILOT-001 guided quiz (/ssdi/quiz/). Chat-style, one question at a time.
   Same scoring contract as /ssdi/qualifier.js (example firm criteria):
   NOT_A_FIT = an example disqualifier, FIRM_REVIEW = uncertain/review trigger, QUALIFIED = all match.
   The visitor never sees which answer mattered. Answers go only to the intake payload (intake.js),
   never to dataLayer — dataLayer receives step counts and the result category only.

   ⚠ MARKED ASSUMPTION — SCOPE: new applications vs denied-claim appeals vs both is unconfirmed.
   Both paths are asked here; the demo walkthrough defaults to NEW APPLICATIONS. */
(function () {
  'use strict';
  var thread = document.getElementById('thread');
  var dock = document.getElementById('dock');
  var meter = document.getElementById('meterFill');
  var contactWrap = document.getElementById('contactWrap');
  if (!thread || !dock) return;

  var DQ = { condition: ['no'], duration: ['no'], work_history: ['no'], fra: ['at_or_over'], lawyer: ['handling', 'signed'], denied: ['no'], receiving: ['yes'] };
  var RV = { who: ['other'], condition: ['not_sure'], duration: ['not_sure'], work_history: ['not_sure'], fra: ['not_sure'], lawyer: ['not_sure'], denied: ['not_sure'], denied_when: ['over60', 'not_sure'], receiving: ['not_sure'] };

  var A = {};
  var steps = [
    { q: 'who', text: 'Hi, I’m Sofia, an AI intake guide. First — are you asking about Social Security Disability for yourself, or for someone else?', opts: [['self', 'Myself'], ['family', 'A family member'], ['other', 'Someone else']] },
    { q: 'path', text: 'Where are you in the process?', opts: [['new', 'I want to apply'], ['appeals', 'I applied and was denied']] },
    { q: 'condition', text: 'Do you have a medical condition that keeps you from working?', opts: [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']] },
    { q: 'duration', text: 'Is the condition expected to last at least 12 months, or is it terminal?', opts: [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']] },
    { q: 'work_history', when: function () { return A.path !== 'appeals'; }, text: 'Have you worked and paid into Social Security for roughly 5 of the last 10 years? (Example threshold — the real work-credit rules vary by age.)', opts: [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']] },
    { q: 'denied', when: function () { return A.path === 'appeals'; }, text: 'Have you applied for SSDI before and been denied?', opts: [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']] },
    { q: 'denied_when', when: function () { return A.path === 'appeals' && A.denied === 'yes'; }, text: 'When were you denied?', opts: [['within60', 'Within the last 60 days'], ['over60', 'More than 60 days ago'], ['not_sure', 'Not sure']] },
    { q: 'receiving', when: function () { return A.path === 'appeals'; }, text: 'Are you currently receiving SSDI benefits?', opts: [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']] },
    { q: 'fra', text: 'Are you under full retirement age — younger than 67?', opts: [['under', 'Yes, under 67'], ['at_or_over', 'No, 67 or older'], ['not_sure', 'Not sure']] },
    { q: 'lawyer', text: 'Last one — is a lawyer already handling this claim for you?', opts: [['no', 'No'], ['not_sure', 'Not sure'], ['handling', 'Yes — looking into it'], ['signed', 'Yes — I signed']] }
  ];
  var total = steps.length;
  var idx = 0, answered = 0;

  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: 'btl-ssdi-quiz', campaign_id: 'SSDI-PILOT-001', tenant_id: 'your-brand-here' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  function bubble(text, who) {
    var d = document.createElement('div'); d.className = 'b ' + (who || 's'); d.textContent = text; thread.appendChild(d);
    thread.scrollTop = thread.scrollHeight; return d;
  }
  function outcome(a) {
    var dq = false, rv = false;
    Object.keys(a).forEach(function (k) {
      if ((DQ[k] || []).indexOf(a[k]) >= 0) dq = true;
      if ((RV[k] || []).indexOf(a[k]) >= 0) rv = true;
    });
    return dq ? 'NOT_A_FIT' : rv ? 'FIRM_REVIEW' : 'QUALIFIED';
  }
  function resultText() {
    return outcome(A) === 'NOT_A_FIT'
      ? 'Thank you for explaining. Based on what you’ve shared, this doesn’t match what this SSDI review is looking for right now. That isn’t a legal opinion about your situation, and it doesn’t affect any right you may have to apply or appeal on your own.'
      : 'Based on what you’ve shared, you may potentially qualify for further review. A person at an independent law firm would look at the details and decide whether to review it — nothing is guaranteed.';
  }
  window.BTL_SSDI_QUIZ = {
    answers: function () { var a = {}; Object.keys(A).forEach(function (k) { a[k] = A[k]; }); a.web_outcome = outcome(a); a.quiz_version = 'ssdi-pilot-001-quiz-2026-10-19-v1-example'; return a; },
    resultText: resultText
  };

  function ask() {
    while (idx < steps.length && steps[idx].when && !steps[idx].when()) idx++;
    if (idx >= steps.length) return finish();
    var step = steps[idx];
    bubble(step.text, 's');
    dock.innerHTML = '';
    var chips = document.createElement('div'); chips.className = 'chips';
    step.opts.forEach(function (pair) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = pair[1];
      b.addEventListener('click', function () {
        A[step.q] = pair[0]; answered++;
        bubble(pair[1], 'u');
        push('ee_quiz_step', { step: answered });
        if (meter) meter.style.width = Math.round((answered / total) * 100) + '%';
        idx++; ask();
      });
      chips.appendChild(b);
    });
    dock.appendChild(chips);
  }
  function finish() {
    var res = outcome(A);
    push('ee_quiz_complete', { result: res });
    bubble(resultText(), 's');
    bubble('If you’d like the reviewing firm to see this, add your name and number below. Nothing is sent until you submit.', 'note');
    if (contactWrap) { contactWrap.hidden = false; contactWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    dock.innerHTML = '';
  }
  push('ee_quiz_start');
  ask();
})();
