/* BTL survivor lane runtime v3 (2026-10-21, local draft) — sex-abuse-la-county
   Three paths share this file: callback form (landing), quiz (one question at a time) and talk-to-Sofia.
   - Reads window.EE_LANE (inline on every page, before GTM).
   - Pushes ONLY {event, tenant, lane, page} to dataLayer. Never names, phones, answers or outcomes.
   - No automated verdict. Screening rules for every program are PENDING attorney approval, so the page never
     says or implies that anyone qualifies or does not. A person reviews every request.
   - Transport: EE_LANE.intake_endpoint. null = nothing is sent, and the page says so. Success is shown only
     for a receipt that says saved:true with a lead id. Retries reuse the same submission id.
   - Consent: explicit, unchecked checkboxes whose text and version come from CAMPAIGN below; the server
     checks the text hash, so edited text can never be recorded as consent.
   - Call links are bound only when EE_LANE.phone_status is "verified_for_program". Otherwise they stay hidden. */
(function () {
  'use strict';
  var L = window.EE_LANE || {};
  var CAMPAIGN = {
    schema: 'btl.abuse.intake/v1',
    campaign_id: 'btl-ca-abuse-la-county-v1',
    question_bank_version: '2026-09-29.live-ids.1',
    consent: {
      version: 'btl-abuse-callback-consent-draft-2026-10-21.1',
      calls_text: 'I agree that Phillips Law Group and its intake team, including Sofia, an AI assistant, may call me at the number I entered about this request. Calls may be recorded. Consent is not a condition of any service. I can say stop or opt out at any time.',
      sms_text: 'I agree that Phillips Law Group may text me at this number about this request. Message frequency varies; message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of any service.'
    }
  };
  var PAGE_PATH = { landing: '/sex-abuse-la-county/', quiz: '/sex-abuse-la-county/quiz/', sofia: '/sex-abuse-la-county/talk-to-sofia/' }[L.page] || '';
  var SOURCE = { landing: 'form', quiz: 'quiz', sofia: 'sofia' }[L.page] || 'form';
  var PHONE_OK = L.phone_status === 'verified_for_program' && /^\+1[2-9]\d{9}$/.test(L.phone_tel || '');

  window.dataLayer = window.dataLayer || [];
  var fired = {};
  function ev(name, once) {
    if (once && fired[name]) return;
    fired[name] = true;
    window.dataLayer.push({ event: name, tenant: L.tenant || 'BTL', lane: L.lane || '', page: L.page || '' });
  }
  function $(id) { return document.getElementById(id); }
  function each(sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- phone line: shown only when verified for this program ----
  function bindPhones(root) {
    each('[data-ee-call]', function (el) { el.hidden = !PHONE_OK; }, root);
    each('[data-ee-call-pending]', function (el) { el.hidden = PHONE_OK; }, root);
    if (!PHONE_OK) return;
    each('a[data-ee-tel]', function (a) { a.setAttribute('href', 'tel:' + L.phone_tel); }, root);
    each('[data-ee-phone-text]', function (el) { el.textContent = L.phone_display || ''; }, root);
  }
  bindPhones();
  ev('ee_page_view', true);

  // ---- connection notice: shown before anyone types, not only after submitting ----
  each('[data-ee-offline]', function (el) { el.hidden = !!L.intake_endpoint; });

  // ---- consent text: one source, rendered into every form ----
  each('[data-consent-text]', function (el) {
    el.textContent = CAMPAIGN.consent[el.getAttribute('data-consent-text') + '_text'] || '';
  });

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a,button') : null;
    if (!t) return;
    if (t.hasAttribute('data-ee-tel')) ev('ee_call_request');
    else if (t.hasAttribute('data-ee-sofia')) ev('ee_sofia_start');
  });

  // ---- approved question IDs (reused from the live page); rules are not here and are pending ----
  var STEPS = [
    { id: 'age', label: 'Age at the time', q: 'How old were you at the time?', help: 'Just the age range. You won’t be asked what happened.',
      c: [['under18', 'Under 18'], ['18plus', '18 or older'], ['prefer_not', 'Prefer not to say']] },
    { id: 'where', label: 'Type of place', q: 'What kind of place was it?', help: 'Pick the closest one. If it wasn’t in LA County, that’s okay to say.',
      c: [['juvenile', 'Juvenile hall or probation camp'], ['foster', 'Foster placement or group home'], ['school', 'School'], ['youth', 'Church, youth program or other organization'], ['other_la', 'Somewhere else in LA County'], ['outside', 'Not in LA County'], ['prefer_not', 'Prefer not to say']] },
    { id: 'when', label: 'Timeframe', q: 'About when was it?', help: 'A rough idea is fine.',
      c: [['pre1990', 'Before 1990'], ['1990_2004', '1990 – 2004'], ['2005_2019', '2005 – 2019'], ['2020_on', '2020 or later'], ['not_sure', 'Not sure'], ['prefer_not', 'Prefer not to say']] },
    { id: 'lawyer', label: 'Lawyer for this', q: 'Do you already have a lawyer for this?', help: 'If you’ve talked to a lawyer but didn’t sign anything, choose “No.”',
      c: [['no', 'No'], ['yes', 'Yes, a lawyer is handling it'], ['not_sure', 'Not sure'], ['prefer_not', 'Prefer not to say']] }
  ];
  var ANSWERS = {}; // question_id -> { answer_id, confirmed_at }

  // ---- hashing for the consent text (SubtleCrypto; secure contexts only) ----
  function sha256(text) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.reject(new Error('no_crypto'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function newId() {
    if (window.crypto && crypto.randomUUID) return 'sub-' + crypto.randomUUID();
    return 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }
  function attribution() {
    var out = {}, q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { var v = q.get(k); if (v) out[k] = v.slice(0, 120); });
    if (q.get('fbclid')) out.fbclid_present = 'yes';
    return out;
  }

  // ---- form validation ----
  function setErr(el, msg) {
    var e = $(el.id + '-e');
    if (e) e.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function digits(v) { var d = (v || '').replace(/\D/g, ''); return d.length === 11 && d.charAt(0) === '1' ? d.slice(1) : d; }
  function validate(form) {
    var bad = [];
    each('input[required]:not([type=checkbox])', function (el) {
      if (el.type === 'tel') {
        if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits(el.value))) { setErr(el, 'Please enter a 10-digit U.S. phone number.'); bad.push(el); } else setErr(el, '');
      } else if (!(el.value || '').trim()) { setErr(el, el.getAttribute('data-msg') || 'This field is needed so we can reach you.'); bad.push(el); } else setErr(el, '');
    }, form);
    each('input[type=email]', function (el) {
      var v = (el.value || '').trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setErr(el, 'Check the email address, or leave it blank.'); bad.push(el); } else setErr(el, '');
    }, form);
    each('input[type=checkbox][required]', function (el) {
      if (!el.checked) { setErr(el, 'Please check this box so the firm is allowed to call you about this request.'); bad.push(el); } else setErr(el, '');
    }, form);
    return bad;
  }

  // ---- transport: honest result only ----
  function post(body) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(L.intake_endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j }; }); })
      .finally(function () { clearTimeout(timer); });
  }
  // A receipt counts as saved only when it is exactly the server's receipt for THIS submission:
  // expected schema and campaign, the same submission id, a well-formed lead and consent record id,
  // and dispatch disabled. Anything else stays "not confirmed".
  var LEAD_RE = /^MA-BTL-ABUSE-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  function isSaved(r, submissionId) {
    var j = r && r.json;
    return !!(r && r.status === 200 && j && j.ok === true && j.saved === true &&
      j.schema === CAMPAIGN.schema && j.campaign_id === CAMPAIGN.campaign_id &&
      typeof submissionId === 'string' && j.submission_id === submissionId &&
      typeof j.lead_id === 'string' && LEAD_RE.test(j.lead_id) &&
      typeof j.consent_record_id === 'string' && /^CR-[0-9a-f]{24}$/.test(j.consent_record_id) &&
      j.status === 'saved_pending_human_review' && j.dispatch === 'disabled' && j.eligibility === 'not_assessed');
  }
  function done(form, state) {
    var box = $(form.getAttribute('data-done'));
    if (state === 'saved') {
      form.reset(); form.hidden = true;
      each('[data-hide-on-done]', function (x) { x.hidden = true; }, form.parentNode);
    }
    if (!box) return;
    each('[data-state]', function (el) { el.hidden = el.getAttribute('data-state') !== state; }, box);
    box.hidden = false;
    var h = box.querySelector('[data-state="' + state + '"] [tabindex="-1"]') || box;
    h.focus();
  }
  each('form[data-ee-form]', function (form) {
    var status = form.querySelector('.status');
    var submissionId = null, lastPayload = null;
    form.addEventListener('change', function () { if (form.getAttribute('data-tried')) validate(form); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.setAttribute('data-tried', '1');
      var bad = validate(form);
      if (bad.length) { if (status) { status.className = 'status err'; status.textContent = 'Please check the highlighted fields.'; } bad[0].focus(); return; }
      var kind = form.getAttribute('data-ee-form');
      var answers = kind === 'quiz' ? STEPS.map(function (s) { var a = ANSWERS[s.id]; return a ? { question_id: s.id, answer_id: a.answer_id, source: 'quiz', confirmed_at: a.confirmed_at } : null; }).filter(Boolean) : [];
      if (kind === 'quiz' && answers.length !== STEPS.length) { if (status) { status.className = 'status err'; status.textContent = 'Please answer each question first — “Prefer not to say” is fine.'; } return; }
      var calls = form.querySelector('input[name=consent_calls]'), sms = form.querySelector('input[name=consent_sms]');
      var contact = { first_name: (form.first_name.value || '').trim(), phone: digits(form.phone.value), email: form.email ? (form.email.value || '').trim() : '' };
      var payloadKey = JSON.stringify([answers, contact, !!(calls && calls.checked), !!(sms && sms.checked)]);
      if (payloadKey !== lastPayload) { submissionId = newId(); lastPayload = payloadKey; } // same content retries keep the same id
      if (!L.intake_endpoint) { ev('ee_lead_not_sent'); done(form, 'not_sent'); return; }
      var button = form.querySelector('button[type=submit]');
      if (button) button.disabled = true;
      if (status) { status.className = 'status'; status.textContent = 'Saving your request…'; }
      Promise.all([sha256(CAMPAIGN.consent.calls_text), sha256(CAMPAIGN.consent.sms_text)]).then(function (h) {
        return post({
          schema: CAMPAIGN.schema, campaign_id: CAMPAIGN.campaign_id, tenant: 'BTL', submission_id: submissionId, page_path: PAGE_PATH,
          question_bank_version: CAMPAIGN.question_bank_version, answers: answers,
          consent: { version: CAMPAIGN.consent.version, calls: !!(calls && calls.checked), sms: !!(sms && sms.checked), calls_text_sha256: h[0], sms_text_sha256: sms && sms.checked ? h[1] : undefined },
          contact: contact, attribution: attribution(), simulated: L.simulated === true
        });
      }).then(function (r) {
        if (button) button.disabled = false;
        if (isSaved(r, submissionId)) { if (status) status.textContent = ''; ev('ee_lead_saved'); done(form, 'saved'); return; }
        if (status) { status.className = 'status err'; status.textContent = 'We couldn’t confirm your request was saved. Nothing has been decided. Please try again.'; }
      }, function () {
        if (button) button.disabled = false;
        if (status) { status.className = 'status err'; status.textContent = 'We couldn’t confirm your request was saved. Please check your connection and try again.'; }
      });
    });
  });

  // ---- talk-to-sofia callback toggle ----
  var openCb = $('openCb'), cbPanel = $('cbPanel');
  if (openCb && cbPanel) {
    var open = function () {
      cbPanel.hidden = false; openCb.setAttribute('aria-expanded', 'true');
      var f = cbPanel.querySelector('input'); setTimeout(function () { if (f) f.focus(); cbPanel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }, 30);
    };
    openCb.addEventListener('click', function () { if (cbPanel.hidden) open(); else { cbPanel.hidden = true; openCb.setAttribute('aria-expanded', 'false'); } });
    if (/[?&]callback=1/.test(location.search)) open();
  }

  // ---- quiz: one question at a time → summary (no verdict) → contact ----
  var root = $('quiz');
  if (!root || !$('qStep')) return;
  var path = [];
  var ACK = ['Thank you.', 'Got it.', 'Okay.', 'Thanks for sharing that.'];
  function show(step) { ['qStep', 'resultStep', 'contactStep'].forEach(function (s) { $(s).hidden = s !== step; }); }
  function say(el, text, cb) {
    if (reduce) { el.textContent = text; if (cb) cb(); return; }
    el.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    setTimeout(function () { el.textContent = text; if (cb) cb(); }, 300);
  }
  function render(idx, ack) {
    var st = STEPS[idx]; show('qStep');
    $('qCount').textContent = 'Question ' + (idx + 1) + ' of ' + STEPS.length;
    $('qBar').style.width = Math.round(idx / STEPS.length * 100) + '%';
    $('qBack').hidden = !path.length;
    $('qPrompt').textContent = st.q;
    $('qHelp').textContent = st.help || '';
    var box = $('qChoices'); box.innerHTML = '';
    var intro = idx === 0 && !path.length ? 'You don’t need to describe what happened, and you can stop at any time. ' : '';
    say($('qSay'), intro + (ack ? ack : ''), function () {
      st.c.forEach(function (c, n) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'choice' + (c[0] === 'prefer_not' ? ' pn' : '');
        b.setAttribute('aria-pressed', ANSWERS[st.id] && ANSWERS[st.id].answer_id === c[0] ? 'true' : 'false');
        b.innerHTML = '<span class="k" aria-hidden="true">' + (n + 1) + '</span><span></span>'; b.lastChild.textContent = c[1];
        b.onclick = function () { pick(idx, c); }; box.appendChild(b);
      });
      var f = box.querySelector('button'); if (f && path.length) f.focus({ preventScroll: true });
    });
  }
  function pick(idx, c) {
    ev('ee_quiz_start', true);
    ANSWERS[STEPS[idx].id] = { answer_id: c[0], confirmed_at: new Date().toISOString().replace(/\.\d+Z$/, '.000Z') };
    path.push(idx);
    if (idx + 1 >= STEPS.length) return finish();
    render(idx + 1, ACK[path.length % ACK.length]);
  }
  function back() { var last = path.pop(); if (last == null) return; render(last); }
  function finish() {
    show('resultStep');
    ev('ee_quiz_complete', true);
    var ul = $('rSum'); ul.innerHTML = '';
    STEPS.forEach(function (s) {
      var a = ANSWERS[s.id]; if (!a) return;
      var c = s.c.filter(function (x) { return x[0] === a.answer_id; })[0];
      var li = document.createElement('li'), k = document.createElement('span'), v = document.createElement('strong');
      k.textContent = s.label; v.textContent = c[1]; li.appendChild(k); li.appendChild(v); ul.appendChild(li);
    });
    $('rOutside').hidden = !(ANSWERS.where && ANSWERS.where.answer_id === 'outside');
    say($('rSay'), 'Thank you. Nothing on this page decides whether you qualify. A person at Phillips Law Group reviews every request, and you can correct any answer.');
    $('rBack').focus({ preventScroll: true });
  }
  $('qBack').onclick = back;
  $('rBack').onclick = back;
  $('rContinue').onclick = function () { show('contactStep'); var f = $('first_name'); if (f) f.focus(); root.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); };
  $('rRestart').onclick = function () { ANSWERS = {}; path = []; render(0); };
  var cBack = $('cBack'); if (cBack) cBack.onclick = function () { show('resultStep'); };
  document.addEventListener('keydown', function (e) {
    if ($('qStep').hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    var n = parseInt(e.key, 10); var bs = $('qChoices').querySelectorAll('button');
    if (n >= 1 && n <= bs.length) bs[n - 1].click();
  });
  render(0);
})();
