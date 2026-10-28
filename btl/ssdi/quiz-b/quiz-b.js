/* BTL-SSDI-001 quiz, B design (/ssdi/quiz-b/). One question per card with Back, progress bar and "Why Sofia asks".
   Question text, options and scoring are copied unchanged from /ssdi/quiz/quiz.js and /ssdi/criteria.js.
   Exposes window.BTL_SSDI_QUIZ for /ssdi/intake.js, exactly like the A quiz. dataLayer gets step counts and result only. */
(function () {
  'use strict';
  var card = document.getElementById('qCard');
  var meter = document.getElementById('meterFill');
  var count = document.getElementById('chatCount');
  var back = document.getElementById('backBtn');
  var contactWrap = document.getElementById('contactWrap');
  var form = document.getElementById('leadForm');
  var R = window.SSDI_RULES;
  if (!card || !R) return;
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
    var o = { event: evt, page_id: 'btl-ssdi-quiz-b', campaign_id: 'BTL-SSDI-001', tenant_id: 'btl' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  window.BTL_SSDI_QUIZ = {
    answers: function () { var a = {}; Object.keys(A).forEach(function (k) { a[k] = A[k]; }); a.web_outcome = R.outcome(a); a.criteria_version = R.version; return a; },
    resultText: function () { return R.resultText(R.outcome(A)); }
  };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function progress(n) {
    if (meter) meter.style.width = Math.round((n / total) * 100) + '%';
    if (count) count.textContent = n < total ? 'Question ' + (n + 1) + ' of ' + total : 'Your result';
    if (back) back.hidden = n === 0;
  }
  function focusQ() { var h = card.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  function answer(step, value) {
    A[step.q] = value;
    push('ee_quiz_step', { step: idx + 1 });
    idx++; render();
  }
  function render() {
    card.innerHTML = '';
    if (contactWrap) contactWrap.hidden = true;
    progress(idx);
    if (idx >= total) return finish();
    var step = steps[idx];
    if (idx === 0) card.appendChild(el('p', 'note', 'Hi, I’m Sofia, an AI intake assistant, not a person or a lawyer. Answer for the person who needs disability benefits.'));
    /* the A quiz's first line starts with Sofia's greeting; the card shows only the question */
    card.appendChild(el('h2', null, idx === 0 ? 'Which state do you live in?' : step.text));
    if (step.select) {
      var sel = el('select', 'chip-sel'); sel.setAttribute('aria-label', 'Your state');
      sel.innerHTML = '<option value="">Choose your state</option>' + step.select.map(function (c) { return '<option value="' + c + '"' + (A.state === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
      var next = el('button', 'btn full', 'Next →'); next.type = 'button'; next.disabled = !sel.value;
      sel.addEventListener('change', function () { next.disabled = !sel.value; });
      next.addEventListener('click', function () { if (sel.value) answer(step, sel.value); });
      card.appendChild(sel); card.appendChild(el('div', 'spacer')); card.appendChild(next);
    } else {
      step.opts.forEach(function (pair) {
        var b = el('button', 'opt' + (pair[0] === 'not_sure' ? ' ns' : '') + (A[step.q] === pair[0] ? ' sel' : ''), pair[1]); b.type = 'button';
        b.addEventListener('click', function () { answer(step, pair[0]); });
        card.appendChild(b);
      });
    }
    var why = el('div', 'why'); why.appendChild(el('b', null, 'Why Sofia asks: ')); why.appendChild(document.createTextNode(step.why)); card.appendChild(why);
    if (idx > 0) focusQ();
  }
  function finish() {
    var res = R.outcome(A);
    push('ee_quiz_complete', { result: res });
    var box = el('div', 'result');
    if (res === 'NOT_A_FIT') {
      box.style.background = '#fff'; box.style.borderColor = '#cbbfa8';
      box.appendChild(el('p', null, R.resultText(res)));
      card.appendChild(box);
      card.appendChild(el('p', 'help', 'You can always apply for free with Social Security at ssa.gov/disability.'));
      var a = el('a', 'btn full ssa', 'Go to ssa.gov/disability →'); a.href = 'https://www.ssa.gov/disability/'; a.rel = 'noopener'; card.appendChild(a);
      focusQ(); return;
    }
    box.appendChild(el('h3', null, '✓ Good news'));
    box.appendChild(el('p', null, R.resultText(res)));
    card.appendChild(box);
    if (contactWrap) { contactWrap.hidden = false; var n = document.getElementById('full_name'); if (n) n.focus({ preventScroll: true }); contactWrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }
  }
  if (back) back.addEventListener('click', function () { if (idx > 0) { idx--; render(); focusQ(); } });
  if (form) form.addEventListener('ee:lead-saved', function (ev) {
    if (contactWrap) contactWrap.hidden = true;
    if (back) back.hidden = true;
    var t = ev.detail && ev.detail.bestTime;
    var when = t && t[0] !== 'asap' ? 'I’ll call you at the time you picked: ' + t[1].charAt(0).toLowerCase() + t[1].slice(1) + '.'
      : R.inHours() ? 'I’ll call you in the next few minutes.' : 'I’ll call you during business hours (' + R.hours.label + ').';
    card.innerHTML = ''; var d = el('div', 'result'); d.appendChild(el('h3', null, 'You’re all set')); d.appendChild(el('p', null, when + ' Keep your phone nearby.')); card.appendChild(d);
  });
  push('ee_quiz_start');
  render();
})();
