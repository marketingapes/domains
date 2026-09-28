/* Paraquat prequalification — mirrors the receiving firm's criteria in Sofia "BTL Paraquat v4" (Vapi 976d64df…).
   Outcomes: NOT_A_FIT (a hard check hit; the quiz stops), FIRM_REVIEW (uncertain or a review trigger), QUALIFIED.
   The visitor never sees which answer mattered: QUALIFIED and FIRM_REVIEW read the same, and NOT_A_FIT uses Sofia's
   fixed wording with no reason given. Work description and the treating doctor are collected by Sofia on the call.
   Answers and the outcome go only to the protected intake payload, never to dataLayer. */
(function () {
  'use strict';
  var A = {};
  var you = function () { return A.who === 'self' || !A.who; };
  var yp = function (a, b) { return you() ? a : b; };
  var DQ = 'dq', RV = 'review';
  var STEPS = [
    { id: 'who', q: function () { return 'Are you asking for yourself or for someone else?'; },
      c: [['self', 'For myself'], ['family_living', 'For a family member'], ['family_deceased', 'For a family member who has passed away']] },
    { id: 'passed', when: function () { return A.who === 'family_deceased'; }, q: function () { return 'I’m sorry for your loss. About when did they pass away?'; },
      c: [['under_1y', 'Less than a year ago'], ['1_2y', '1–2 years ago'], ['2_3y', '2–3 years ago'], ['over_3y', 'More than 3 years ago'], ['not_sure', 'Not sure', RV]],
      flag: function (v) { return v !== 'under_1y' ? RV : null; } },
    { id: 'diagnosis', q: function () { return yp('Has a doctor diagnosed you with Parkinson’s disease?', 'Did a doctor diagnose them with Parkinson’s disease?'); },
      c: [['yes', 'Yes'], ['no', 'No', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'lawyer', q: function () { return 'Is a lawyer already handling this Paraquat matter, or has anyone ever signed with a lawyer about it?'; },
      c: [['no', 'No'], ['handling', 'Yes — a lawyer is handling it', DQ], ['signed', 'Signed with a lawyer before', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'job', q: function () { return yp('Were you around Paraquat as part of a job?', 'Were they around Paraquat as part of a job?'); }, help: 'Farm work, spraying and crop dusting are common examples. Work while incarcerated counts as a job.',
      c: [['job', 'Yes, at a job'], ['home', 'No — home, garden or hobby use', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'role', q: function () { return yp('What did you do with it?', 'What did they do with it?'); },
      c: [['mixed', 'Mixed or loaded it'], ['applied', 'Applied or sprayed it'], ['flagger', 'Flagged for a crop duster'], ['sprayed_on', 'Was sprayed directly', RV], ['other', 'None of these — just nearby', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'product', q: function () { return 'Was it mixed with water before spraying, and where did it come from?'; }, help: 'Paraquat is also sold as Gramoxone.',
      c: [['supplier', 'Mixed with water — from a farm or ag supplier'], ['retail', 'Bought at a store like Home Depot or Lowe’s, or ready to use', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'years', q: function () { return 'About when did the exposure start?'; },
      c: [['pre1964', 'All of it was before 1964', DQ], ['1964_2010', 'Started between 1964 and 2010'], ['2011_on', 'Started in 2011 or later', RV], ['not_sure', 'Not sure', RV]] },
    { id: 'age', q: function () { return yp('How old were you when it started?', 'How old were they when it started?'); },
      c: [['18plus', '18 or older'], ['13_17', '13 to 17'], ['12under', '12 or younger'], ['not_sure', 'Not sure', RV]] },
    { id: 'cont13', when: function () { return A.age === '12under'; }, q: function () { return yp('Did it continue when you were 13 or older?', 'Did it continue when they were 13 or older?'); },
      c: [['yes', 'Yes'], ['no', 'No', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'adult', when: function () { return A.age === '13_17' || (A.age === '12under' && A.cont13 === 'yes'); }, q: function () { return yp('Did any of it happen when you were 18 or older?', 'Did any of it happen when they were 18 or older?'); },
      c: [['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure']] },
    { id: 'season', when: function () { return A.adult === 'no' || A.adult === 'not_sure'; }, q: function () { return yp('Did you work there for at least one full season?', 'Did they work there for at least one full season?'); },
      c: [['yes', 'Yes'], ['no', 'No', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'acres', q: function () { return 'Roughly how big was the farm or area?'; },
      c: [['over3', 'More than about 3 acres'], ['under3', 'Less than about 3 acres', RV], ['not_sure', 'Not sure', RV]] },
    { id: 'meth', q: function () { return yp('The firm asks everyone this: have you ever used methamphetamine?', 'The firm asks everyone this: did they ever use methamphetamine?'); },
      c: [['no', 'No'], ['yes', 'Yes', DQ], ['prefer_not', 'Prefer not to say', RV]] }
  ];
  var ACK = ['Thanks.', 'Got it.', 'Okay, noted.', 'Thank you.', 'Understood.'];
  var path = [], flags = {}, stopped = false;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function track(ev, extra) { try { window.dataLayer = window.dataLayer || []; var o = { event: ev, page_id: 'btl-paraquat-quiz', campaign_id: 'PARAQUAT-PILOT-001', tenant_id: 'BTL' }; for (var k in extra) o[k] = extra[k]; window.dataLayer.push(o); } catch (e) {} }
  function show(step) { ['qStep', 'resultStep', 'contactStep'].forEach(function (s) { $(s).hidden = s !== step; }); }
  function nextIndex(from) { for (var j = from; j < STEPS.length; j++) if (!STEPS[j].when || STEPS[j].when()) return j; return -1; }
  function visibleCount() { return STEPS.filter(function (s) { return !s.when || s.when(); }).length; }
  function say(el, text, cb) {
    if (reduce) { el.textContent = text; if (cb) cb(); return; }
    el.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    setTimeout(function () { el.textContent = text; if (cb) cb(); }, 420);
  }
  function render(idx, ack) {
    var st = STEPS[idx]; show('qStep');
    $('qCount').textContent = 'Question ' + (path.length + 1) + ' of about ' + visibleCount();
    $('qBar').style.width = Math.min(96, path.length / visibleCount() * 100) + '%';
    $('qBack').hidden = !path.length;
    $('qPrompt').textContent = st.q();
    $('qHelp').textContent = st.help || ''; $('qHelp').hidden = !st.help;
    var box = $('qChoices'); box.innerHTML = '';
    say($('qSay'), (ack ? ack + ' ' : '') + st.q(), function () {
      st.c.forEach(function (c, n) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'choice';
        b.setAttribute('aria-pressed', A[st.id] === c[0] ? 'true' : 'false');
        b.innerHTML = '<span class="k" aria-hidden="true">' + (n + 1) + '</span><span></span>'; b.lastChild.textContent = c[1];
        b.onclick = function () { pick(idx, c); }; box.appendChild(b);
      });
      var f = box.querySelector('button'); if (f && path.length) f.focus({ preventScroll: true });
    });
  }
  function pick(idx, c) {
    var st = STEPS[idx];
    if (!path.length) track('ee_quiz_start');
    A[st.id] = c[0]; path.push(idx); track('ee_quiz_step', { step_index: path.length });
    var f = c[2] || (st.flag && st.flag(c[0]));
    if (f) flags[st.id] = f; else delete flags[st.id];
    if (f === DQ) return finish();
    var n = nextIndex(idx + 1);
    if (n < 0) return finish();
    render(n, ACK[path.length % ACK.length]);
  }
  function back() {
    var last = path.pop(); if (last == null) return;
    delete A[STEPS[last].id]; delete flags[STEPS[last].id];
    render(last);
  }
  function outcome() {
    var v = Object.keys(flags).map(function (k) { return flags[k]; });
    return v.indexOf(DQ) >= 0 ? 'NOT_A_FIT' : v.indexOf(RV) >= 0 ? 'FIRM_REVIEW' : 'QUALIFIED';
  }
  function summary() {
    var L = function (id) { var st = STEPS.filter(function (s) { return s.id === id; })[0]; if (!st || !A[id]) return null; return st.c.filter(function (c) { return c[0] === A[id]; })[0][1].toLowerCase(); };
    var p = [];
    p.push(you() ? 'You’re asking for yourself.' : 'You’re asking for a family member' + (A.who === 'family_deceased' ? ' who has passed away (' + L('passed') + ').' : '.'));
    p.push('Parkinson’s diagnosis: ' + L('diagnosis') + '. Lawyer involved: ' + L('lawyer') + '.');
    if (A.role) p.push('At a job, ' + (you() ? 'you' : 'they') + ' ' + L('role').replace('was sprayed', 'were sprayed') + (A.product ? '; product: ' + L('product') : '') + '.');
    if (A.years) p.push('Exposure ' + L('years') + (A.age ? ', starting at age ' + L('age') : '') + (A.acres ? '; area ' + L('acres') : '') + '.');
    p.push('Next, Sofia asks about the work in more detail and the doctor who made the diagnosis.');
    return p.join(' ');
  }
  function finish() {
    stopped = true; var o = outcome(); show('resultStep');
    track('ee_quiz_complete', { step_count: path.length });
    var acts = $('rActions'); acts.innerHTML = '';
    function act(label, primary, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = primary ? 'next' : 'choice'; b.textContent = label; b.onclick = fn; acts.appendChild(b); }
    if (o === 'NOT_A_FIT') {
      $('rSummary').hidden = true;
      say($('rSay'), 'Thank you for explaining. Based on what you’ve shared, this doesn’t match what this Paraquat review is looking for right now. That isn’t a legal opinion about your situation.');
      act('Have a person note it anyway', false, toContact);
      act('Start over', false, restart);
    } else {
      $('rSummaryText').textContent = summary(); $('rSummary').hidden = false;
      say($('rSay'), 'Based on what you’ve shared, you may potentially qualify for further review. A person at an independent law firm would look at the details and decide whether to review it — nothing is guaranteed.');
      var ph = window.BTL_PHONE;
      if (ph && ph.verified) act('Call Sofia now — ' + ph.display, true, function () { track('ee_call_click'); location.href = 'tel:' + ph.e164; });
      act('Leave my details for a callback', !(ph && ph.verified), toContact);
    }
    $('rBack').focus({ preventScroll: true });
  }
  function toContact() { show('contactStep'); $('first_name').focus(); $('quiz').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  function restart() { A = {}; path = []; flags = {}; stopped = false; track('ee_quiz_restart'); render(0); }
  $('qBack').onclick = back;
  $('rBack').onclick = function () { stopped = false; back(); };
  document.addEventListener('keydown', function (e) {
    if ($('qStep').hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    var n = parseInt(e.key, 10); var bs = $('qChoices').querySelectorAll('button');
    if (n >= 1 && n <= bs.length) bs[n - 1].click();
  });
  window.BTL_QUIZ = { answers: function () { var o = {}; for (var k in A) o[k] = A[k]; o.web_outcome = outcome(); o.quiz_version = 'btl-paraquat-prequal-2026-09-28-v4criteria'; return o; } };
  render(0);
})();
