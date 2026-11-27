/* BTL survivor lane runtime v3 (2026-10-21, local draft) — sex-abuse-la-county
   Three paths share this file: callback form (landing), quiz (one question at a time) and talk-to-Sofia.
   - Reads window.EE_LANE (inline on every page, before GTM).
   - Pushes ONLY {event, tenant, lane, page} to dataLayer. Never names, phones, answers or outcomes.
   - No automated verdict. Screening rules for every program are PENDING attorney approval, so the page never
     says or implies that anyone qualifies or does not. A person reviews every request.
   - Transport: EE_LANE.intake_endpoint. null = nothing is sent, and the page says so. Success is shown only
     for a receipt that says saved:true with a lead id. Retries reuse the same submission id.
   - Consent: given by submitting. Each form shows CAMPAIGN.consent.submit_text next to its button (no checkbox);
     the version and the text hash go with the request, so edited text can never be recorded as consent.
   - Call links are bound only when EE_LANE.phone_status is "verified_for_program". Otherwise they stay hidden. */
(function () {
  'use strict';
  var L = window.EE_LANE || {};
  var CAMPAIGN = {
    schema: 'btl.abuse.intake/v1',
    campaign_id: 'btl-ca-abuse-la-county-v1',
    question_bank_version: '2026-10-22.template.2',
    consent: {
      version: 'btl-abuse-submit-consent-draft-2026-10-23.1',
      method: 'submit',
      submit_text: 'By submitting this form, you agree that Phillips Law Group and its intake team, including Sofia, an AI assistant, may call and text you at the number you entered about your request, including with automated technology and an AI voice. Calls may be recorded. Consent is not a condition of any service. Message frequency varies; message and data rates may apply. Reply STOP to opt out or HELP for help.'
    }
  };
  // Which backend contract EE_LANE.intake_endpoint speaks. 'btl.web-lead/v1' is legal-web-lead's live
  // POST /api/v1/btl/web-lead: it stores the request and queues Sofia's callback, which transfers to the firm.
  var WEB_LEAD = L.intake_contract === 'btl.web-lead/v1';
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
    each('[data-ee-voice-gate]', function (el) { el.hidden = PHONE_OK; }, root);
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

  // ---- minimal template questions: where it happened and which facility. No age, no story. ----
  var STEPS = [
    { id: 'claim_type', label: 'Where it happened', q: 'Which best describes where it happened?', help: 'Pick the closest one. “Not sure” and “Prefer not to say” are fine.',
      c: [['la_juvenile_detention', 'LA County juvenile hall or probation camp'], ['ca_juvenile_detention_other', 'Another California juvenile facility'], ['ca_womens_prison', 'A California women’s prison'], ['other_institution', 'Another institution or program'], ['not_sure', 'Not sure'], ['prefer_not', 'Prefer not to say']] },
    { id: 'facility', type: 'text', label: 'Facility', q: 'Do you remember the name of the facility or place?', help: 'Just the name, if you know it. You don’t need to say anything else.',
      c: [['not_sure', 'Not sure'], ['prefer_not', 'Prefer not to say']] }
  ];
  // A facility name only: short, no contact details, links or story.
  function facilityProblem(t) {
    t = (t || '').trim();
    if (t.length < 2) return 'Type the name, or choose “Not sure”.';
    if (t.length > 80) return 'Just the name is enough (80 characters or fewer).';
    if (/@|https?:|www\.|\d[\d\s().-]{6,}\d/i.test(t)) return 'Please leave out phone numbers, emails and links.';
    if (/[.!?].*[.!?]/.test(t)) return 'Just the name is enough — you don’t need to describe anything.';
    return '';
  }
  var ANSWERS = {}; // question_id -> { answer_id, answer_text?, confirmed_at }

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
  // web-lead receipt: stored and a callback queued (or started) for THIS submission, or a duplicate of a
  // request already queued for this phone. A honeypot filter, a test or dry-run record, or any other
  // status is not a saved request.
  var WEB_LEAD_UID = /^MA-BTL-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var WEB_LEAD_OK = ['awaiting_executor', 'call_created', 'call_ended'];
  function isQueued(r, submissionId) {
    var j = r && r.json;
    return !!(r && r.status === 200 && j && j.ok === true && !j.filtered && j.test !== true && j.dry_run !== true &&
      typeof j.lead_uid === 'string' && WEB_LEAD_UID.test(j.lead_uid) && (j.event_id === submissionId || j.duplicate === true) &&
      WEB_LEAD_OK.indexOf(j.status) >= 0);
  }
  function webLeadBody(contact, answers, submissionId, stamp, h, action) {
    var q = new URLSearchParams(location.search), b = {
      name: contact.first_name, phone: contact.phone, consent: true, consent_method: 'submit_button', consent_action: action,
      consent_text: CAMPAIGN.consent.submit_text, consent_version: CAMPAIGN.consent.version, consent_sha256: h,
      tort: 'la_county_abuse', state: 'CA', form_variant: (L.lane || 'btl-sex-abuse-la-county') + ':' + (L.page || ''),
      page_url: location.origin + PAGE_PATH, page_path: PAGE_PATH, event_id: submissionId, submitted_at: stamp, company: ''
    };
    if (contact.email) b.email = contact.email;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'].forEach(function (k) { var v = q.get(k); if (v) b[k] = v.slice(0, 250); });
    return b;
  }
  function done(form, state) {
    var box = $(form.getAttribute('data-done'));
    if (state === 'saved' || state === 'queued') {
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
      var stamp = new Date().toISOString().replace(/\.\d+Z$/, '.000Z');
      var optional = []; each('select[data-q]', function (sel) { if (sel.value) optional.push({ question_id: sel.getAttribute('data-q'), answer_id: sel.value, source: SOURCE, confirmed_at: stamp }); }, form);
      var fac = form.querySelector('input[data-q-text="facility"]');
      if (fac && (fac.value || '').trim()) {
        var fp = facilityProblem(fac.value); if (fp) { setErr(fac, fp); fac.focus(); return; }
        setErr(fac, ''); optional.push({ question_id: 'facility', answer_id: 'named', answer_text: fac.value.trim(), source: SOURCE, confirmed_at: stamp });
      }
      var answers = kind === 'quiz' ? STEPS.map(function (s) { var a = ANSWERS[s.id]; if (!a) return null; var x = { question_id: s.id, answer_id: a.answer_id, source: 'quiz', confirmed_at: a.confirmed_at }; if (a.answer_text) x.answer_text = a.answer_text; return x; }).filter(Boolean) : optional;
      if (kind === 'quiz' && answers.length !== STEPS.length) { if (status) { status.className = 'status err'; status.textContent = 'Please answer each question first — “Prefer not to say” is fine.'; } return; }
      // consent is given by submitting a form that shows the consent text next to its button
      var agreed = !!form.querySelector('[data-consent-text="submit"]');
      var contact = { first_name: (form.first_name.value || '').trim(), phone: digits(form.phone.value), email: form.email ? (form.email.value || '').trim() : '' };
      var payloadKey = JSON.stringify([answers, contact, agreed]);
      if (!agreed) { if (status) { status.className = 'status err'; status.textContent = 'This form is missing its consent notice, so nothing was sent.'; } return; }
      if (payloadKey !== lastPayload) { submissionId = newId(); lastPayload = payloadKey; } // same content retries keep the same id
      if (!L.intake_endpoint) { ev('ee_lead_not_sent'); done(form, 'not_sent'); return; }
      var button = form.querySelector('button[type=submit]');
      if (button) button.disabled = true;
      if (status) { status.className = 'status'; status.textContent = 'Saving your request…'; }
      sha256(CAMPAIGN.consent.submit_text).then(function (h) {
        if (WEB_LEAD) return post(webLeadBody(contact, answers, submissionId, stamp, h, button ? button.textContent.trim().slice(0, 80) : 'submit'));
        return post({
          schema: CAMPAIGN.schema, campaign_id: CAMPAIGN.campaign_id, tenant: 'BTL', submission_id: submissionId, page_path: PAGE_PATH,
          question_bank_version: CAMPAIGN.question_bank_version, answers: answers,
          consent: { version: CAMPAIGN.consent.version, method: CAMPAIGN.consent.method, calls: agreed, sms: agreed, text_sha256: h },
          contact: contact, attribution: attribution(), simulated: L.simulated === true
        });
      }).then(function (r) {
        if (button) button.disabled = false;
        if (WEB_LEAD ? isQueued(r, submissionId) : isSaved(r, submissionId)) { if (status) status.textContent = ''; ev('ee_lead_saved'); done(form, WEB_LEAD ? 'queued' : 'saved'); return; }
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
      if (st.type === 'text') {
        var wrap = document.createElement('div'); wrap.className = 'field full';
        wrap.innerHTML = '<label for="qText">Facility or place name <span class="opt">(if you know it)</span></label><input id="qText" maxlength="80" autocomplete="off" aria-describedby="qText-e"><span class="ferr" id="qText-e"></span>';
        var go = document.createElement('button'); go.type = 'button'; go.className = 'next'; go.id = 'qTextGo'; go.textContent = 'Continue';
        box.appendChild(wrap); box.appendChild(go);
        var input = wrap.querySelector('input');
        if (ANSWERS[st.id] && ANSWERS[st.id].answer_text) input.value = ANSWERS[st.id].answer_text;
        go.onclick = function () { var p = facilityProblem(input.value); setErr(input, p); if (p) { input.focus(); return; } pick(idx, ['named', input.value.trim()], input.value.trim()); };
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });
      }
      st.c.forEach(function (c, n) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'choice' + (c[0] === 'prefer_not' ? ' pn' : '');
        b.setAttribute('aria-pressed', ANSWERS[st.id] && ANSWERS[st.id].answer_id === c[0] ? 'true' : 'false');
        b.innerHTML = '<span class="k" aria-hidden="true">' + (n + 1) + '</span><span></span>'; b.lastChild.textContent = c[1];
        b.onclick = function () { pick(idx, c); }; box.appendChild(b);
      });
      var f = box.querySelector('input,button'); if (f && path.length) f.focus({ preventScroll: true });
    });
  }
  function pick(idx, c, text) {
    ev('ee_quiz_start', true);
    ANSWERS[STEPS[idx].id] = { answer_id: c[0], confirmed_at: new Date().toISOString().replace(/\.\d+Z$/, '.000Z') };
    if (text) ANSWERS[STEPS[idx].id].answer_text = text;
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
      k.textContent = s.label; v.textContent = a.answer_text || (c ? c[1] : ''); li.appendChild(k); li.appendChild(v); ul.appendChild(li);
    });
    $('rOutside').hidden = true;
    say($('rSay'), 'Thank you. Nothing on this page decides eligibility. A person at Phillips Law Group reviews every request, and you can correct any answer.');
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
