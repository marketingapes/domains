/* GLASSMAN-SSDI-002 eligibility check (/glassman/ssdi/quiz/). One question at a time in the hero card, with a progress bar,
   a "why we ask" line and a back link, like the Glassman SSDI quiz.
   Scoring lives in /glassman/ssdi/criteria.js (the buyer's criteria), shared with the form.
   The visitor never sees which answer mattered; a visitor who is not a fit is never asked for contact details.
   Answers go only to the intake payload (intake.js), never to dataLayer — dataLayer receives step counts and the result category only. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var body = $('qBody'), count = $('qCount'), bar = $('qProg'), contact = $('contactWrap');
  var R = window.SSDI_RULES;
  if (!body || !R) return;

  var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  var YN = [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']];
  var steps = [
    { q: 'state', text: 'Which state do you live in?', why: 'This review isn’t available in North Dakota, South Dakota, Alaska or Hawaii.', select: STATES },
    { q: 'age', text: 'How old are you?', why: 'This review is for people 48 to 64. Social Security’s own rules give age more weight after 50.', opts: [['under_48', 'Under 48'], ['48_64', '48 to 64'], ['65_plus', '65 or older']] },
    { q: 'out_of_work', text: 'Have you been out of work for at least a year?', why: 'SSDI is for people whose health keeps them from working, so time out of work matters.', opts: YN },
    { q: 'doctor', text: 'Are you currently under a doctor’s care?', why: 'Records from regular medical care are the main evidence Social Security looks at.', opts: YN },
    { q: 'benefits', text: 'Are you getting disability payments from the government right now?', why: 'If you already get disability payments, this review isn’t the right fit for you.', opts: YN },
    { q: 'lawyer', text: 'Last one. Do you already have a lawyer for your disability claim?', why: 'If you already have a lawyer, they should be the one handling your claim.', opts: YN }
  ];
  var total = steps.length, idx = 0, A = {};

  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: 'glassman-ssdi-quiz', campaign_id: 'GLASSMAN-SSDI-002', tenant_id: 'glassman' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function progress() {
    if (bar) bar.style.width = Math.round((idx / total) * 100) + '%';
    if (count) count.textContent = idx < total ? (idx + 1) + ' of ' + total : 'Done';
  }
  function backLink(label, to) {
    var row = el('p', 'backrow'), b = el('button', 'back', label);
    b.type = 'button';
    b.addEventListener('click', function () { if (contact) contact.hidden = true; idx = to; render(true); });
    row.appendChild(b);
    return row;
  }

  function render(moved) {
    if (idx >= total) return finish();
    var s = steps[idx];
    body.innerHTML = '';
    var wrap = el('div', 'q'), h = el('h2', 'qh', s.text), why = el('p', 'qs');
    h.tabIndex = -1;
    why.appendChild(el('b', '', 'Why we ask: '));
    why.appendChild(document.createTextNode(s.why));
    var opts = el('div', 'opts');
    if (s.select) {
      var sel = el('select');
      sel.setAttribute('aria-label', 'Your state');
      sel.innerHTML = '<option value="">Choose your state</option>' + s.select.map(function (c) { return '<option value="' + c + '"' + (A.state === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
      sel.addEventListener('change', function () { if (sel.value) choose(sel.value); });
      opts.appendChild(sel);
    } else {
      s.opts.forEach(function (pair) {
        var b = el('button', '', pair[1]); b.type = 'button';
        b.addEventListener('click', function () { choose(pair[0]); });
        opts.appendChild(b);
      });
    }
    wrap.appendChild(h); wrap.appendChild(why); wrap.appendChild(opts);
    if (idx > 0) wrap.appendChild(backLink('← Back', idx - 1));
    body.appendChild(wrap);
    progress();
    if (moved) h.focus({ preventScroll: true });
  }
  function choose(v) {
    A[steps[idx].q] = v;
    push('ee_quiz_step', { step: idx + 1 });
    idx++;
    render(true);
  }
  function finish() {
    var res = R.outcome(A);
    push('ee_quiz_complete', { result: res });
    progress();
    body.innerHTML = '';
    var p = el('p', res === 'NOT_A_FIT' ? 'result' : 'result good', R.resultText(res));
    p.tabIndex = -1;
    body.appendChild(p);
    if (res === 'NOT_A_FIT') {
      body.appendChild(el('p', 'qs', 'You can always apply for free with Social Security.'));
      var a = el('a', 'cta alt wide', 'Go to ssa.gov/disability →'); a.href = 'https://www.ssa.gov/disability/'; a.rel = 'noopener';
      body.appendChild(a);
    } else if (contact) {
      contact.hidden = false;
    }
    body.appendChild(backLink('← Change an answer', total - 1));
    p.focus({ preventScroll: true });
  }

  window.BTL_SSDI_QUIZ = {
    answers: function () { var a = {}; Object.keys(A).forEach(function (k) { a[k] = A[k]; }); a.web_outcome = R.outcome(a); a.criteria_version = R.version; return a; },
    resultText: function () { return R.resultText(R.outcome(A)); }
  };

  /* once the lead is saved there is nothing left to change */
  var form = $('leadForm');
  if (form) form.addEventListener('ee:lead-saved', function () { var b = body.querySelector('.backrow'); if (b) b.remove(); });

  push('ee_quiz_start');
  render(false);
})();
