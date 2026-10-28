/* BTL-SSDI-001 guided quiz (/ssdi/quiz/). Chat-style, one question at a time.
   Scoring lives in /ssdi/criteria.js (the buyer's criteria), shared with the form.
   The visitor never sees which answer mattered. Answers go only to the intake payload (intake.js),
   never to dataLayer — dataLayer receives step counts and the result category only. */
(function () {
  'use strict';
  var thread = document.getElementById('thread');
  var dock = document.getElementById('dock');
  var meter = document.getElementById('meterFill');
  var contactWrap = document.getElementById('contactWrap');
  var R = window.SSDI_RULES;
  if (!thread || !dock || !R) return;

  var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  var YN = [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']];
  var A = {};
  var steps = [
    { q: 'state', text: 'Hi, I’m Sofia, an AI intake assistant. Six quick questions about the person who needs disability benefits. First, which state do you live in?', select: STATES },
    { q: 'age', text: 'How old are you?', opts: [['under_54', 'Under 54'], ['54_63', '54 to 63'], ['64_plus', '64 or older']] },
    { q: 'out_of_work', text: 'Have you been out of work for at least a year?', opts: YN },
    { q: 'doctor', text: 'Are you currently under a doctor’s care?', opts: YN },
    { q: 'benefits', text: 'Are you currently receiving disability payments from the government?', opts: [['no', 'No'], ['yes', 'Yes'], ['not_sure', 'Not sure']] },
    { q: 'lawyer', text: 'Last one. Do you already have a lawyer for your disability claim?', opts: [['no', 'No'], ['yes', 'Yes'], ['not_sure', 'Not sure']] }
  ];
  var total = steps.length, idx = 0;

  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: 'btl-ssdi-quiz', campaign_id: 'BTL-SSDI-001', tenant_id: 'btl' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  function bubble(text, who) {
    var d = document.createElement('div'); d.className = 'b ' + (who || 's'); d.textContent = text; thread.appendChild(d);
    thread.scrollTop = thread.scrollHeight; return d;
  }
  window.BTL_SSDI_QUIZ = {
    answers: function () { var a = {}; Object.keys(A).forEach(function (k) { a[k] = A[k]; }); a.web_outcome = R.outcome(a); a.criteria_version = R.version; return a; },
    resultText: function () { return R.resultText(R.outcome(A)); }
  };

  function answer(step, value, label) {
    A[step.q] = value;
    bubble(label, 'u');
    push('ee_quiz_step', { step: idx + 1 });
    if (meter) meter.style.width = Math.round(((idx + 1) / total) * 100) + '%';
    idx++; ask();
  }
  function ask() {
    if (idx >= steps.length) return finish();
    var step = steps[idx];
    bubble(step.text, 's');
    dock.innerHTML = '';
    var chips = document.createElement('div'); chips.className = 'chips';
    if (step.select) {
      var sel = document.createElement('select'); sel.className = 'chip-select'; sel.setAttribute('aria-label', 'State');
      sel.innerHTML = '<option value="">Choose your state…</option>' + step.select.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
      sel.addEventListener('change', function () { if (sel.value) answer(step, sel.value, sel.value); });
      chips.appendChild(sel);
    } else {
      step.opts.forEach(function (pair) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = pair[1];
        b.addEventListener('click', function () { answer(step, pair[0], pair[1]); });
        chips.appendChild(b);
      });
    }
    dock.appendChild(chips);
  }
  function finish() {
    var res = R.outcome(A);
    push('ee_quiz_complete', { result: res });
    bubble(R.resultText(res), 's');
    dock.innerHTML = '';
    if (res === 'NOT_A_FIT') return;
    bubble('Add your name and mobile number below and Sofia will call you. Nothing is sent until you tap the button.', 'note');
    if (contactWrap) { contactWrap.hidden = false; contactWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  push('ee_quiz_start');
  ask();
})();
