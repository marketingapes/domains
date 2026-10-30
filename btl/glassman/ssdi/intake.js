/* GLASSMAN-SSDI-002 intake (shared by the form, the quiz and the Sofia callback panel).
   Mirrors the role of /paraquat/intake.js:
   - renders per-channel consent checkboxes (NEVER prechecked) into #consentBox, or a click-to-agree
     disclosure under the button when #consentBox has data-consent="clickwrap"
   - pushes only non-identifying events to dataLayer (page_id, campaign_id, tenant_id) —
     names, phone numbers, emails, states and answers are NEVER pushed
   - builds the lead payload and "delivers" it

   Delivery: each page sets window.EE_INTAKE_ENDPOINT (the campaign-kit intake, Make 6777650) before this
   script. The wire contract is btl.intake.web/v1, form-encoded (payload=<json>&submission_id=<uuid>) so Make
   receives it without a CORS preflight. Success shows only when the webhook answers 2xx with
   {status: received|duplicate, receipt_id}; the intake stores the lead before it answers.
   A compact session retry record freezes id/timestamps/proof and a SHA-256 fingerprint, without
   storing raw names, email, phone or screening answers. Unchanged retries retain the exact payload.
   ?test=1 on the URL marks the lead synthetic: stored as lead.test, never emailed or dialed.
   With no endpoint set, nothing leaves the browser (payload kept in sessionStorage 'ee_ssdi_last_lead').

   TrustedForm: window.EE_TRUSTEDFORM = true loads the script; its cert URL joins the payload. */
(function () {
  'use strict';
  var CAMPAIGN = 'GLASSMAN-SSDI-002';
  var TENANT = 'glassman';
  var form = document.getElementById('leadForm');
  if (!form) return;
  var pageId = form.getAttribute('data-page-id') || 'glassman-ssdi-unknown';
  var synthetic = !window.EE_INTAKE_ENDPOINT;
  var isTest = /(?:^|[?&])test=1(?:&|$)/.test(location.search);
  var SK = 'ee_sub_' + pageId;
  var RK = 'ee_retry_' + pageId;
  var pending = false, completed = false, retryPayload = null, retrySignature = null;
  function sid() {
    try { var v = sessionStorage.getItem(SK); if (v) return v; } catch (e) {}
    var u = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    try { sessionStorage.setItem(SK, u); } catch (e) {}
    return u;
  }
  function e164(raw) { var d = raw.replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? '+1' + d : ''; }
  async function fingerprint(value) {
    try {
      if (!window.crypto || !crypto.subtle || typeof TextEncoder === 'undefined') return null;
      var bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
      return Array.from(new Uint8Array(bytes)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { return null; }
  }
  function storedRetry(hash) {
    try {
      var r = JSON.parse(sessionStorage.getItem(RK) || 'null');
      if (!r || r.schema !== 'glassman.retry/v2' || r.signature_sha256 !== hash
        || !/^[0-9a-f-]{36}$/.test(r.submission_id) || !/^[0-9a-f]{64}$/.test(r.signature_sha256)
        || !Number.isFinite(Date.parse(r.submitted_at)) || new Date(r.submitted_at).toISOString() !== r.submitted_at
        || !Number.isFinite(Date.parse(r.consent_captured_at)) || new Date(r.consent_captured_at).toISOString() !== r.consent_captured_at
        || ['open', 'closed'].indexOf(r.transfer_window) < 0
        || !(r.certificate_url === null || typeof r.certificate_url === 'string' && r.certificate_url.length <= 2000)) return null;
      return r;
    } catch (e) { return null; }
  }

  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: pageId, campaign_id: CAMPAIGN, tenant_id: TENANT };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  push('ee_page_view');

  /* ---- consent (per-channel, never prechecked) ---- */
  var box = document.getElementById('consentBox');
  /* data-consent="clickwrap": consent is given by tapping the submit button, with the disclosure printed right under it.
     The disclosure names the button, so the button text and this text must match. */
  var clickwrap = !!(box && box.getAttribute('data-consent') === 'clickwrap');
  if (box && clickwrap) {
    var btnLabel = (box.getAttribute('data-button') || 'Submit');
    box.innerHTML = '<p>By tapping \u201c' + btnLabel + ',\u201d you agree that Jeffrey Glassman Injury Lawyers, including Sofia, its AI voice assistant, may call you at the number above about your disability inquiry, including with automated technology and artificial or prerecorded voice. Calls are recorded. Consent is not a condition of any purchase or service. See our <a href="https://www.jeffreysglassman.com/privacy-policy.html">Privacy Policy</a> and <a href="https://www.jeffreysglassman.com/disclaimer.html">Disclaimer</a>.</p>';
  } else if (box) {
    box.innerHTML =
      '<span class="c-title">How may we contact you? Boxes start unchecked.</span>' +
      '<label><input type="checkbox" id="consent_calls" name="consent_calls" value="yes"><span><b>Calls (required).</b> I agree that Jeffrey Glassman Injury Lawyers, including Sofia, its AI voice assistant, may call me at the number I provided about my disability inquiry, including with automated technology and artificial or prerecorded voice. Calls are recorded. Consent is not a condition of any purchase or service.</span></label>' +
      '<label><input type="checkbox" id="consent_sms" name="consent_sms" value="yes"><span><b>Text messages.</b> I agree to receive text messages about my inquiry at the number I provided. Message and data rates may apply. Reply STOP to end.</span></label>';
  }

  /* ---- best time to call (inside Glassman's intake hours: weekdays 8 AM–8 PM Eastern) ---- */
  var TIMES = [['asap', 'As soon as possible'], ['morning', 'Weekday morning (8 to noon Eastern)'], ['midday', 'Weekday midday (noon to 3 Eastern)'], ['afternoon', 'Weekday afternoon (3 to 8 Eastern)']];
  if (box && !document.getElementById('best_time')) {
    var bt = document.createElement('div'); bt.className = 'field';
    bt.innerHTML = '<label for="best_time">Best time for a call</label><select id="best_time" name="best_time">' +
      TIMES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') +
      '</select><span class="why">The team takes calls Monday to Friday, 8 AM to 8 PM Eastern. We never call before 9 AM your time.</span>';
    box.parentNode.insertBefore(bt, box);
  }
  function bestTime() { var v = val('best_time') || 'asap'; for (var i = 0; i < TIMES.length; i++) if (TIMES[i][0] === v) return TIMES[i]; return TIMES[0]; }

  /* ---- TrustedForm ---- */
  if (window.EE_TRUSTEDFORM) {
    (function () {
      var tf = document.createElement('script'); tf.type = 'text/javascript'; tf.async = true;
      tf.src = 'https://api.trustedform.com/trustedform.js?field=xxTrustedFormCertUrl&ping_field=xxTrustedFormPingUrl&l=' + Date.now() + Math.random();
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(tf, s);
    })();
  }

  var started = false;
  form.addEventListener('input', function () { if (!started) { started = true; push('ee_form_start'); } }, true);

  /* Ad click IDs and UTMs from the landing URL, kept for attribution and the buyer's posting. */
  function tracking() {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'].forEach(function (k) { var v = q.get(k); if (v) o[k] = v.slice(0, 250); });
    return o;
  }
  function fieldErr(id, msg) {
    var e = document.getElementById(id + '-e'), input = document.getElementById(id);
    if (e) e.textContent = msg || '';
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    if (pending || completed) return;
    var status = document.getElementById('formStatus');
    var btn = document.getElementById('submitBtn');
    var ok = true;
    ['first_name', 'last_name', 'email', 'phone'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.hasAttribute('required') && !val(id)) { fieldErr(id, 'Required.'); ok = false; } else fieldErr(id, '');
    });
    var emailInput = document.getElementById('email');
    if (val('email') && (!emailInput || !emailInput.checkValidity() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(val('email')))) {
      fieldErr('email', 'Please enter a valid email address.'); ok = false;
    }
    if ((val('first_name') + ' ' + val('last_name')).length > 120) {
      fieldErr('last_name', 'Please keep your first and last names to 120 characters in total.'); ok = false;
    }
    var phone = val('phone').replace(/\D/g, '');
    if (phone && phone.length < 10) { fieldErr('phone', 'Please enter a valid phone number.'); ok = false; }
    var callsBox = document.getElementById('consent_calls');
    if (phone && callsBox && !callsBox.checked) {
      if (status) { status.className = 'status err'; status.textContent = 'Please check the “Calls” box so Sofia can call the number you provided.'; }
      ok = false;
    }
    if (!ok) {
      push('ee_lead_submit_error', { reason: 'validation' });
      var invalid = form.querySelector('[aria-invalid="true"]'); if (invalid) invalid.focus();
      return;
    }

    var scorer = window.BTL_SSDI || window.BTL_SSDI_QUIZ;
    var answers = scorer ? scorer.answers() : {};
    var R = window.SSDI_RULES, now = new Date();
    var first = val('first_name'), last = val('last_name'), full = first + ' ' + last;
    var consentText = clickwrap ? box.textContent.trim() : ((document.querySelector('#consentBox label') || {}).textContent || '');
    var tfEl = form.querySelector('[name="xxTrustedFormCertUrl"]');
    var payload = {
      schema: 'btl.intake.web/v1', submission_id: sid(),
      tenant_id: TENANT, domain_id: 'btl', campaign_id: CAMPAIGN, page_id: pageId,
      door: form.getAttribute('data-kind') || 'form',
      request_type: answers.web_outcome ? 'screened_inquiry' : 'callback_request',
      submitted_at: now.toISOString(),
      contact: { full_name: full, first_name: first, last_name: last, email: val('email'), phone_e164: e164(val('phone')), state: val('state') || answers.state || null },
      screening: { web_outcome: answers.web_outcome || null, criteria_version: answers.criteria_version || (R && R.version) || null, answers: answers },
      /* callback = Sofia screens on the call; the web outcome only exists for the form and quiz */
      routing: { route: answers.web_outcome && R ? R.route(answers.web_outcome) : 'sofia_screen', transfer_window: R && R.inHours(now) ? 'open' : 'closed' },
      consent: {
        version: clickwrap ? 'glassman-ssdi-002-consent-clickwrap-2026-10-28' : 'glassman-ssdi-002-consent-2026-10-28', captured_at: now.toISOString(), text: consentText,
        method: clickwrap ? 'clickwrap_submit' : 'checkbox',
        calls: { granted: clickwrap || !!(callsBox && callsBox.checked) },
        sms: { granted: !!(document.getElementById('consent_sms') || {}).checked }
      },
      trustedform_cert_url: tfEl && tfEl.value ? tfEl.value : null,
      page_url: location.origin + location.pathname,
      callback: { window: bestTime()[0], label: bestTime()[1] },
      attribution: tracking(),
      test: { synthetic: isTest }
    };

    /* Keep the exact original payload for an unchanged retry, including consent/submission time.
       An edited inquiry gets a new id; it must not overwrite an earlier stored submission. */
    var signature = JSON.stringify([payload.schema, payload.tenant_id, payload.domain_id, payload.campaign_id,
      payload.page_id, payload.door, payload.request_type, payload.page_url, payload.contact, payload.screening, { route: payload.routing.route },
      payload.consent.version, payload.consent.text, payload.consent.method, payload.consent.calls, payload.consent.sms,
      payload.callback, payload.attribution, payload.test]);
    // A late SDK certificate or hours boundary is passive context, not a user edit.
    pending = true;
    if (btn) btn.disabled = true;
    if (status) { status.className = 'status'; status.textContent = 'Checking…'; }
    var hash = await fingerprint(signature);
    if (retryPayload && signature === retrySignature) payload = retryPayload;
    else {
      var restored = !retryPayload && hash ? storedRetry(hash) : null;
      if (restored) {
        payload.submission_id = restored.submission_id; payload.submitted_at = restored.submitted_at;
        payload.consent.captured_at = restored.consent_captured_at; payload.trustedform_cert_url = restored.certificate_url;
        payload.routing.transfer_window = restored.transfer_window;
      } else {
        // Never pair a legacy/stale id with a newly generated payload after a refresh or edit.
        try { sessionStorage.removeItem(SK); } catch (e) {}
        payload.submission_id = sid();
      }
      retryPayload = payload; retrySignature = signature;
    }
    try {
      if (hash) sessionStorage.setItem(RK, JSON.stringify({schema:'glassman.retry/v2', submission_id:payload.submission_id,
        signature_sha256:hash, submitted_at:payload.submitted_at, consent_captured_at:payload.consent.captured_at,
        certificate_url:payload.trustedform_cert_url, transfer_window:payload.routing.transfer_window}));
      else sessionStorage.removeItem(RK);
    } catch (e) { /* same-page memory retries still work when session storage is unavailable */ }

    push('ee_lead_submit_attempt');
    if (btn) { btn.disabled = true; }
    if (status) { status.className = 'status'; status.textContent = 'Checking…'; }

    /* After a submit every door gets the same thank-you: when Sofia will call. */
    function thanks() {
      var t = bestTime();
      if (t[0] !== 'asap') return 'Thank you. Sofia will call you at the time you picked: ' + t[1].charAt(0).toLowerCase() + t[1].slice(1) + '.';
      return window.SSDI_RULES && window.SSDI_RULES.inHours()
        ? 'Thank you. Sofia will call you in the next few minutes.'
        : 'Thank you. Sofia will call you during business hours (' + (window.SSDI_RULES ? window.SSDI_RULES.hours.label : 'Monday–Friday') + ').';
    }
    function succeed() {
      pending = false; completed = true;
      if (btn) { btn.disabled = false; }
      push('ee_lead_submit_success');
      form.dispatchEvent(new CustomEvent('ee:lead-saved', { detail: { message: thanks(), bestTime: bestTime() } }));
      if (synthetic) {
        try { sessionStorage.setItem('ee_ssdi_last_lead', JSON.stringify(payload)); } catch (e) {}
        var flag = document.getElementById('previewFlag'); if (flag) flag.hidden = false;
        if (status) {
          status.className = 'status ok';
          status.textContent = thanks() + ' ' +
            'Preview: this was a test, nothing was sent.';
        }
      } else if (status) {
        status.className = 'status ok';
        status.textContent = thanks();
      }
    }
    function fail() {
      pending = false;
      if (btn) { btn.disabled = false; }
      push('ee_lead_submit_error', { reason: 'delivery' });
      if (status) { status.className = 'status err'; status.textContent = 'Something went wrong sending your inquiry. Please try again in a moment.'; }
    }

    if (synthetic) { setTimeout(succeed, 500); return; }
    fetch(window.EE_INTAKE_ENDPOINT, {
      method: 'POST', body: new URLSearchParams({ payload: JSON.stringify(payload), submission_id: payload.submission_id })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok || !j || !j.receipt_id || ['received', 'accepted', 'duplicate'].indexOf(j.status) < 0) throw Error('no receipt');
        try { sessionStorage.removeItem(SK); sessionStorage.removeItem(RK); sessionStorage.setItem('ee_ssdi_last_receipt', j.receipt_id); } catch (e) {}
        succeed();
      });
    }).catch(fail);
  });
})();
