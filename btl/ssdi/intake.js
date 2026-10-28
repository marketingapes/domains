/* BTL-SSDI-001 intake (shared by the form, the quiz and the Sofia callback panel).
   Mirrors the role of /paraquat/intake.js:
   - renders per-channel consent checkboxes (NEVER prechecked) into #consentBox
   - pushes only non-identifying events to dataLayer (page_id, campaign_id, tenant_id) —
     names, phone numbers, emails, states and answers are NEVER pushed
   - builds the lead payload and "delivers" it

   Delivery: each page sets window.EE_INTAKE_ENDPOINT (the campaign-kit intake, Make 6777650) before this
   script. The wire contract is btl.intake.web/v1, form-encoded (payload=<json>&submission_id=<uuid>) so Make
   receives it without a CORS preflight. Success shows only when the webhook answers 2xx with
   {status: received|duplicate, receipt_id}; the intake stores the lead before it answers.
   The submission_id survives retries (sessionStorage), so a resend dedupes to the same receipt.
   ?test=1 on the URL marks the lead synthetic: stored as lead.test, never emailed or dialed.
   With no endpoint set, nothing leaves the browser (payload kept in sessionStorage 'ee_ssdi_last_lead').

   TrustedForm: window.EE_TRUSTEDFORM = true loads the script; its cert URL joins the payload. */
(function () {
  'use strict';
  var CAMPAIGN = 'BTL-SSDI-001';
  var TENANT = 'btl'; /* the buyer's firm is never named on the site */
  var form = document.getElementById('leadForm');
  if (!form) return;
  var pageId = form.getAttribute('data-page-id') || 'btl-ssdi-unknown';
  var synthetic = !window.EE_INTAKE_ENDPOINT;
  var isTest = /(?:^|[?&])test=1(?:&|$)/.test(location.search);
  var SK = 'ee_sub_' + pageId;
  function sid() {
    try { var v = sessionStorage.getItem(SK); if (v) return v; } catch (e) {}
    var u = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    try { sessionStorage.setItem(SK, u); } catch (e) {}
    return u;
  }
  function e164(raw) { var d = raw.replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? '+1' + d : ''; }

  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: pageId, campaign_id: CAMPAIGN, tenant_id: TENANT };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    window.dataLayer.push(o);
  }
  push('ee_page_view');

  /* ---- consent (per-channel, never prechecked) ---- */
  var box = document.getElementById('consentBox');
  if (box) {
    box.innerHTML =
      '<span class="c-title">How may we contact you? Boxes start unchecked.</span>' +
      '<label><input type="checkbox" id="consent_calls" name="consent_calls" value="yes"><span><b>Calls (required).</b> I agree that Best Tort Lawyers, including Sofia, its AI voice assistant, and a participating law firm may call me at the number I provided about my disability inquiry, including with automated technology and artificial or prerecorded voice. Calls are recorded. Consent is not a condition of any purchase or service.</span></label>' +
      '<label><input type="checkbox" id="consent_sms" name="consent_sms" value="yes"><span><b>Text messages.</b> I agree to receive text messages about my inquiry at the number I provided. Message and data rates may apply. Reply STOP to end.</span></label>';
  }

  /* ---- TrustedForm (go-live only; dormant in the reference build) ---- */
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
  function fieldErr(id, msg) { var e = document.getElementById(id + '-e'); if (e) e.textContent = msg || ''; }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var status = document.getElementById('formStatus');
    var btn = document.getElementById('submitBtn');
    var ok = true;
    ['full_name', 'phone'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.hasAttribute('required') && !val(id)) { fieldErr(id, 'Required.'); ok = false; } else fieldErr(id, '');
    });
    var phone = val('phone').replace(/\D/g, '');
    if (phone && phone.length < 10) { fieldErr('phone', 'Please enter a valid phone number.'); ok = false; }
    var callsBox = document.getElementById('consent_calls');
    if (phone && callsBox && !callsBox.checked) {
      if (status) { status.className = 'status err'; status.textContent = 'Please check the “Calls” box so Sofia can call the number you provided.'; }
      ok = false;
    }
    if (!ok) { push('ee_lead_submit_error', { reason: 'validation' }); return; }

    var scorer = window.BTL_SSDI || window.BTL_SSDI_QUIZ;
    var answers = scorer ? scorer.answers() : {};
    var R = window.SSDI_RULES, now = new Date();
    var full = val('full_name'), parts = full.split(/\s+/);
    var consentText = (document.querySelector('#consentBox label') || {}).textContent || '';
    var tfEl = form.querySelector('[name="xxTrustedFormCertUrl"]');
    var payload = {
      schema: 'btl.intake.web/v1', submission_id: sid(),
      tenant_id: TENANT, domain_id: 'btl', campaign_id: CAMPAIGN, page_id: pageId,
      door: form.getAttribute('data-kind') || 'form',
      request_type: answers.web_outcome ? 'screened_inquiry' : 'callback_request',
      submitted_at: now.toISOString(),
      contact: { full_name: full, first_name: parts[0] || '', last_name: parts.slice(1).join(' '), phone_e164: e164(val('phone')), state: val('state') || answers.state || null },
      screening: { web_outcome: answers.web_outcome || null, criteria_version: answers.criteria_version || (R && R.version) || null, answers: answers },
      /* callback = Sofia screens on the call; the web outcome only exists for the form and quiz */
      routing: { route: answers.web_outcome && R ? R.route(answers.web_outcome) : 'sofia_screen', transfer_window: R && R.inHours(now) ? 'open' : 'closed' },
      consent: {
        version: 'btl-ssdi-001-consent-2026-10-27', captured_at: now.toISOString(), text: consentText,
        calls: { granted: !!(callsBox && callsBox.checked) },
        sms: { granted: !!(document.getElementById('consent_sms') || {}).checked }
      },
      trustedform_cert_url: tfEl && tfEl.value ? tfEl.value : null,
      page_url: location.origin + location.pathname,
      attribution: tracking(),
      test: { synthetic: isTest }
    };

    push('ee_lead_submit_attempt');
    if (btn) { btn.disabled = true; }
    if (status) { status.className = 'status'; status.textContent = 'Checking…'; }

    /* After a submit every door gets the same thank-you: when Sofia will call. */
    function thanks() {
      return window.SSDI_RULES && window.SSDI_RULES.inHours()
        ? 'Thank you. Sofia will call you in the next few minutes.'
        : 'Thank you. Sofia will call you during business hours (' + (window.SSDI_RULES ? window.SSDI_RULES.hours.label : 'Monday–Friday') + ').';
    }
    function succeed() {
      if (btn) { btn.disabled = false; }
      push('ee_lead_submit_success');
      form.dispatchEvent(new CustomEvent('ee:lead-saved', { detail: { message: thanks() } }));
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
        try { sessionStorage.removeItem(SK); sessionStorage.setItem('ee_ssdi_last_receipt', j.receipt_id); } catch (e) {}
        succeed();
      });
    }).catch(fail);
  });
})();
