/* Phillips Law Group — Arizona Accident Claim Check (path C, chat format).
   One question at a time in a chat thread. Outcomes:
     NOT_A_FIT  — a hard check hit; the chat stops, explains why in plain words and what to do next. No contact form
                  (handoff rule: only pass leads with an actual potential claim).
     FIRM_REVIEW — an uncertain answer; reads the same as QUALIFIED to the visitor.
     QUALIFIED  — call Phillips now, or leave name + number for a call back.
   Answers + outcome go only into the intake payload (window.PLG_CHECK.answers()), never to dataLayer. */
(function () {
  'use strict';
  var A = {}, flags = {}, path = [], why = null;
  var DQ = 'dq', RV = 'review';
  var you = function () { return A.who !== 'family' && A.who !== 'family_deceased'; };
  var yp = function (a, b) { return you() ? a : b; };
  var STEPS = [
    { id: 'who', q: function () { return 'Hi — I’m sorry you’re dealing with this. This is Phillips Law Group’s Claim Check: a few quick taps to see whether your accident looks like a claim our Arizona team reviews. First — who was hurt?'; },
      c: [['self', 'Me'], ['family', 'A family member'], ['family_deceased', 'A family member who passed away', RV]] },
    { id: 'where', q: function () { return 'Did the accident happen in Arizona?'; },
      c: [['az', 'Yes, in Arizona'], ['other_state', 'No, another state', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'type', q: function () { return 'What kind of accident was it?'; },
      c: [['car', 'Car'], ['truck', 'Truck or semi'], ['motorcycle', 'Motorcycle'], ['rideshare', 'Uber / Lyft'], ['pedestrian_bike', 'Walking or on a bike'], ['other', 'Something else', RV]] },
    { id: 'when', q: function () { return 'When did it happen?'; },
      c: [['under_30d', 'In the last 30 days'], ['1_6m', '1–6 months ago'], ['6_24m', '6 months to 2 years ago'], ['over_2y', 'More than 2 years ago', DQ], ['not_sure', 'Not sure', RV]] },
    { id: 'hurt', q: function () { return yp('Were you hurt?', 'Were they hurt?'); },
      c: [['yes', 'Yes'], ['not_sure', 'Not sure yet — still sore', RV], ['no', 'No, just vehicle damage', DQ]] },
    { id: 'treated', when: function () { return A.hurt !== 'no'; }, q: function () { return yp('Have you seen a doctor for it?', 'Did they see a doctor for it?'); }, help: 'ER, urgent care, your doctor, a chiropractor or physical therapy all count.',
      c: [['er', 'ER or hospital'], ['doctor', 'Doctor, urgent care or chiro'], ['plan', 'Not yet, but I plan to', RV], ['no', 'No', RV]] },
    { id: 'fault', q: function () { return 'Who do you think caused it?'; },
      c: [['other', 'Someone else'], ['shared', 'Partly me, partly them', RV], ['not_sure', 'Not sure', RV], ['me_alone', 'Me — no one else was involved', DQ]] },
    { id: 'lawyer', q: function () { return yp('Do you already have a lawyer for this accident?', 'Do they already have a lawyer for this accident?'); },
      c: [['no', 'No'], ['yes', 'Yes', DQ]] }
  ];
  var WHY = {
    where: 'Phillips Law Group handles Arizona accident claims, so this one isn’t a match for us. An injury lawyer licensed in the state where it happened is the right next call — most offer a free consultation.',
    when: 'Arizona generally gives injured people two years to file an injury claim, so this may be past the deadline. Some exceptions exist, so if you’re unsure about the date, an attorney can check.',
    hurt: 'Injury claims cover injuries, so with vehicle damage only there isn’t an injury claim for us to review. Your insurance company or the other driver’s insurer handles property damage. If pain shows up later, see a doctor and come back.',
    fault: 'When no one else was involved, there usually isn’t anyone to make a claim against. If a road defect or a faulty vehicle part played a role, that can change things.',
    lawyer: 'Since you already have a lawyer for this accident, they’re the right person to talk to — we can’t step in on a case someone else is handling.'
  };
  var ACK = ['Got it.', 'Okay.', 'Thanks.', 'Understood.', 'Okay, noted.'];
  var $ = function (id) { return document.getElementById(id); };
  var thread = $('thread'), dock = $('dock'), meter = $('meterBar');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function track(ev, extra) { if (window.PLG && window.PLG.track) window.PLG.track(ev, false, extra); }
  function scrollDown() { thread.scrollTop = thread.scrollHeight; }
  function bubble(cls, text) { var b = document.createElement('div'); b.className = 'b ' + cls; b.textContent = text; thread.appendChild(b); scrollDown(); return b; }
  function botSay(text, cb) {
    if (reduce) { bubble('s', text); if (cb) cb(); return; }
    var t = document.createElement('div'); t.className = 'typing'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = '<i></i><i></i><i></i>'; thread.appendChild(t); scrollDown();
    setTimeout(function () { t.remove(); bubble('s', text); if (cb) cb(); }, Math.min(1100, 380 + text.length * 6));
  }
  function nextIndex(from) { for (var j = from; j < STEPS.length; j++) if (!STEPS[j].when || STEPS[j].when()) return j; return -1; }
  function total() { return STEPS.filter(function (s) { return !s.when || s.when(); }).length; }
  function chips(list) {
    dock.innerHTML = ''; var wrap = document.createElement('div'); wrap.className = 'chips'; wrap.setAttribute('role', 'group');
    list.forEach(function (c, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (c.primary ? ' primary' : '') + (c.ghost ? ' ghost' : ''); b.textContent = c.label; b.onclick = c.fn; wrap.appendChild(b); if (i === 0) setTimeout(function () { b.focus({ preventScroll: true }); }, 20); });
    dock.appendChild(wrap);
  }
  function ask(idx, ack) {
    var st = STEPS[idx];
    meter.style.width = Math.min(96, path.length / total() * 100) + '%';
    dock.innerHTML = '';
    botSay((ack ? ack + ' ' : '') + st.q() + (st.help ? '\n' + st.help : ''), function () {
      var list = st.c.map(function (c) { return { label: c[1], fn: function () { pick(idx, c); } }; });
      if (path.length) list.push({ label: 'Back', ghost: true, fn: back });
      chips(list);
    });
  }
  function pick(idx, c) {
    var st = STEPS[idx];
    if (!path.length) track('ee_quiz_start');
    bubble('u', c[1]);
    A[st.id] = c[0]; path.push(idx); track('ee_quiz_step', { step_index: path.length });
    if (c[2]) flags[st.id] = c[2]; else delete flags[st.id];
    if (c[2] === DQ) { why = st.id; return finish(); }
    var n = nextIndex(idx + 1);
    if (n < 0) return finish();
    ask(n, ACK[path.length % ACK.length]);
  }
  function back() {
    var last = path.pop(); if (last == null) return;
    delete A[STEPS[last].id]; delete flags[STEPS[last].id]; why = null;
    // replay the transcript up to the step being changed (no typing animation), then re-ask it
    thread.innerHTML = ''; dock.innerHTML = ''; $('contactStep').hidden = true;
    path.forEach(function (i) { var st = STEPS[i]; bubble('s', st.q()); var c = st.c.filter(function (x) { return x[0] === A[st.id]; })[0]; if (c) bubble('u', c[1]); });
    ask(last);
  }
  function outcome() {
    var v = Object.keys(flags).map(function (k) { return flags[k]; });
    return v.indexOf(DQ) >= 0 ? 'NOT_A_FIT' : v.indexOf(RV) >= 0 ? 'FIRM_REVIEW' : 'QUALIFIED';
  }
  function finish() {
    var o = outcome(); meter.style.width = '100%';
    track('ee_quiz_complete', { step_count: path.length, fit: o === 'NOT_A_FIT' ? 'no' : 'yes' });
    $('pill').textContent = o === 'NOT_A_FIT' ? 'Not a match' : 'Looks like a claim';
    $('pill').className = 'pill ' + (o === 'NOT_A_FIT' ? 'no' : 'yes');
    if (o === 'NOT_A_FIT') {
      botSay('Thank you for walking through that. Based on what you shared, this isn’t a claim Phillips Law Group can take on.', function () {
        botSay(WHY[why] + '\n\nThis is a quick screening, not legal advice.', function () {
          chips([{ label: 'Change my last answer', fn: function () { $('pill').textContent = 'Checking'; $('pill').className = 'pill'; back(); } }, { label: 'Start over', ghost: true, fn: restart }]);
        });
      });
      return;
    }
    botSay('Based on what you shared, this looks like the kind of accident claim Phillips Law Group’s Arizona team reviews.', function () {
      botSay('Fastest next step: call now — it’s free, 24/7. Or leave your name and number and they’ll call you.', function () {
        dock.innerHTML = '';
        var a = document.createElement('a'); a.className = 'btn-call'; a.href = 'tel:' + (window.PLG ? window.PLG.firm.e164 : '+16022003976');
        a.innerHTML = '<span>Call now · ' + (window.PLG ? window.PLG.firm.display : '(602) 200-3976') + '</span>';
        a.onclick = function () { track('ee_call_click', { call_target: 'firm', placement: 'check_result' }); };
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip wide'; b.textContent = 'Have them call me';
        b.onclick = function () { bubble('u', 'Have them call me'); dock.innerHTML = ''; botSay('Sure — where can they reach you?', function () { $('contactStep').hidden = false; $('full_name').focus(); scrollDown(); }); };
        var w = document.createElement('div'); w.className = 'result-actions'; w.appendChild(a); w.appendChild(b); dock.appendChild(w);
      });
    });
  }
  function restart() { A = {}; flags = {}; path = []; why = null; thread.innerHTML = ''; $('contactStep').hidden = true; $('pill').textContent = 'Checking'; $('pill').className = 'pill'; track('ee_quiz_restart'); ask(0); }
  window.PLG_CHECK = { answers: function () { var o = {}; for (var k in A) o[k] = A[k]; o.web_outcome = outcome(); o.check_version = 'plg-azmva-claimcheck-2026-10-05-v1'; return o; } };
  ask(0);
})();