/* BTL-SSDI-001 guided quiz (/ssdi/quiz/). Chat-style, one question at a time: Sofia "types", asks, and says why she asks.
   Scoring lives in /ssdi/criteria.js (the buyer's criteria), shared with the form.
   The visitor never sees which answer mattered; a visitor who is not a fit is never asked for contact details.
   Answers go only to the intake payload (intake.js), never to dataLayer — dataLayer receives step counts and the result category only. */
(function () {
  'use strict';
  var thread = document.getElementById('thread');
  var dock = document.getElementById('dock');
  var meter = document.getElementById('meterFill');
  var count = document.getElementById('chatCount');
  var contactWrap = document.getElementById('contactWrap');
  var form = document.getElementById('leadForm');
  var R = window.SSDI_RULES;
  if (!thread || !dock || !R) return;

  var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  var YN = [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']];
  var A = {};
  var steps = [
    { q: 'state', text: 'Hi, I’m Sofia. Six quick questions about the person who needs disability benefits. First, which state do you live in?', why: 'This review isn’t available in California or Colorado.', select: STATES },
    { q: 'age', text: 'How old are you?', why: 'This review is for people 54 to 63. Social Security’s own rules give age more weight after 50.', opts: [['under_54', 'Under 54'], ['54_63', '54 to 63'], ['64_plus', '64 or older']] },
    { q: 'out_of_work', text: 'Have you been out of work for at least a year?', why: 'SSDI is for people whose health keeps them from working, so time out of work matters.', opts: YN },
    { q: 'doctor', text: 'Are you currently under a doctor’s care?', why: 'Records from regular medical care are the main evidence Social Security looks at.', opts: YN },
    { q: 'benefits', text: 'Are you getting disability payments from the government right now?', why: 'If you already get disability payments, this review isn’t the right fit for you.', opts: YN },
    { q: 'lawyer', text: 'Last one. Do you already have a lawyer for your disability claim?', why: 'If you already have a lawyer, they should be the one handling your claim.', opts: YN }
  ];
  var total = steps.length, idx = 0;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: 'btl-ssdi-quiz', campaign_id: 'BTL-SSDI-001', tenant_id: 'btl' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  /* The thread has a fixed height; keep the newest message in view. */
  function toBottom() { thread.scrollTop = thread.scrollHeight; }
  function bubble(text, who) {
    var d = document.createElement('div'); d.className = 'b ' + (who || 's'); d.textContent = text; thread.appendChild(d);
    toBottom();
    return d;
  }
  /* Sofia "types" for a moment, then the message appears. */
  function say(lines, then) {
    var typing = document.createElement('div'); typing.className = 'b s typing'; typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<i></i><i></i><i></i>';
    thread.appendChild(typing); toBottom();
    setTimeout(function () {
      typing.remove();
      lines.forEach(function (l) { bubble(l[0], l[1]); });
      if (then) then();
    }, reduced ? 0 : 650);
  }
  window.BTL_SSDI_QUIZ = {
    answers: function () { var a = {}; Object.keys(A).forEach(function (k) { a[k] = A[k]; }); a.web_outcome = R.outcome(a); a.criteria_version = R.version; return a; },
    resultText: function () { return R.resultText(R.outcome(A)); }
  };

  function progress(n) {
    if (meter) meter.style.width = Math.round((n / total) * 100) + '%';
    if (count) count.textContent = n < total ? 'Question ' + (n + 1) + ' of ' + total : 'Done';
  }
  function answer(step, value, label) {
    A[step.q] = value;
    dock.innerHTML = '';
    bubble(label, 'u');
    push('ee_quiz_step', { step: idx + 1 });
    idx++; progress(idx); ask();
  }
  function ask() {
    if (idx >= steps.length) return finish();
    var step = steps[idx];
    say([[step.text, 's'], [step.why, 'why']], function () {
      var chips = document.createElement('div'); chips.className = 'chips';
      if (step.select) {
        var sel = document.createElement('select'); sel.className = 'chip-select'; sel.setAttribute('aria-label', 'Your state');
        sel.innerHTML = '<option value="">Choose your state</option>' + step.select.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
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
      /* Keep the answer buttons on screen as the conversation grows. */
      if (idx > 0) dock.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    });
  }
  function finish() {
    var res = R.outcome(A);
    push('ee_quiz_complete', { result: res });
    if (res === 'NOT_A_FIT') {
      say([[R.resultText(res), 's'], ['You can always apply for free with Social Security at ssa.gov/disability.', 's']], function () {
        var a = document.createElement('a'); a.className = 'ssa-link'; a.href = 'https://www.ssa.gov/disability/'; a.rel = 'noopener'; a.textContent = 'Go to ssa.gov/disability →';
        dock.appendChild(a);
      });
      return;
    }
    say([['Good news: based on what you shared, you may qualify for a free review.', 'note'], ['Where should I call you? I’ll confirm a few details and connect you with the firm. Nothing is sent until you tap the button.', 's']], function () {
      if (contactWrap) { contactWrap.hidden = false; var chat = document.getElementById('chat'); if (chat) chat.classList.add('has-contact'); toBottom(); var n = document.getElementById('full_name'); if (n) n.focus({ preventScroll: true }); contactWrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }
    });
  }
  /* After intake saves the lead, Sofia confirms in the chat and the form goes away. */
  if (form) form.addEventListener('ee:lead-saved', function (ev) {
    if (contactWrap) contactWrap.hidden = true;
    var chatEl = document.getElementById('chat'); if (chatEl) chatEl.classList.remove('has-contact');
    var t = ev.detail && ev.detail.bestTime;
    var when = t && t[0] !== 'asap' ? 'I’ll call you at the time you picked: ' + t[1].charAt(0).toLowerCase() + t[1].slice(1) + '.'
      : R.inHours() ? 'I’ll call you in the next few minutes.' : 'I’ll call you during business hours (' + R.hours.label + ').';
    say([['You’re all set. ' + when + ' Keep your phone nearby.', 'note']]);
  });

  /* when should Sofia call: tap a time */
  var bt = document.getElementById('best_time');
  [].forEach.call(document.querySelectorAll('.when-opt'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.when-opt'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (bt) bt.value = b.getAttribute('data-v');
    });
  });

  push('ee_quiz_start');
  progress(0);
  ask();
})();
