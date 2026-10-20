/* SSDI-PILOT-001 intake (shared by the form door and the Sofia callback panel).
   Mirrors the role of /paraquat/intake.js:
   - renders per-channel consent checkboxes (NEVER prechecked) into #consentBox
   - pushes only non-identifying events to dataLayer (page_id, campaign_id, tenant_id) —
     names, phone numbers, emails, states and answers are NEVER pushed
   - builds the lead payload and "delivers" it

   REFERENCE-BUILD SAFETY: delivery is SYNTHETIC unless a production endpoint is wired at go-live
   by setting window.EE_INTAKE_ENDPOINT before this script loads. In synthetic mode nothing
   leaves the browser: the payload is kept in sessionStorage ('ee_ssdi_last_lead') so the
   Perspective demo can show the test lead truthfully, labeled as local-only.

   TrustedForm: at go-live, set window.EE_TRUSTEDFORM = true and the account script below loads
   and the cert URL joins the payload. It is intentionally NOT loaded in this reference build. */
(function () {
  'use strict';
  var CAMPAIGN = 'SSDI-PILOT-001';
  var TENANT = 'your-brand-here'; /* SWAP-IN: adopting firm's tenant slug */
  var form = document.getElementById('leadForm');
  if (!form) return;
  var pageId = form.getAttribute('data-page-id') || 'btl-ssdi-unknown';
  var synthetic = !window.EE_INTAKE_ENDPOINT;

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
      '<span class="c-title">How may the reviewing firm contact you? (Optional unless required below — boxes start unchecked.)</span>' +
      '<label><input type="checkbox" id="consent_calls" name="consent_calls" value="yes"><span><b>Calls.</b> I agree that YOUR BRAND HERE and the independent law firm reviewing my inquiry may call me at the number I provided about my inquiry. [Example language — counsel approves final text before any live run.]</span></label>' +
      '<label><input type="checkbox" id="consent_sms" name="consent_sms" value="yes"><span><b>Text messages.</b> I agree to receive text messages about my inquiry at the number I provided. Message and data rates may apply; reply STOP to end. [Example language — counsel approves final text before any live run.]</span></label>' +
      '<label><input type="checkbox" id="consent_email" name="consent_email" value="yes"><span><b>Email.</b> I agree to receive email about my inquiry at the address I provided, if I provided one. [Example language — counsel approves final text before any live run.]</span></label>';
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
      if (status) { status.className = 'status err'; status.textContent = 'Please check the “Calls” consent box so the reviewing firm may call the number you provided.'; }
      ok = false;
    }
    if (!ok) { push('ee_lead_submit_error', { reason: 'validation' }); return; }

    var scorer = window.BTL_SSDI || window.BTL_SSDI_QUIZ;
    var answers = scorer ? scorer.answers() : {};
    var payload = {
      campaign_id: CAMPAIGN, page_id: pageId, tenant_id: TENANT, door: form.getAttribute('data-kind') || 'form',
      submitted_at: new Date().toISOString(),
      contact: { full_name: val('full_name'), phone: val('phone'), state: val('state') || null },
      answers: answers,
      consent: {
        calls: !!(callsBox && callsBox.checked),
        sms: !!(document.getElementById('consent_sms') || {}).checked,
        email: !!(document.getElementById('consent_email') || {}).checked
      },
      trustedform_cert_url: null /* populated at go-live when EE_TRUSTEDFORM is enabled */
    };

    push('ee_lead_submit_attempt');
    if (btn) { btn.disabled = true; }
    if (status) { status.className = 'status'; status.textContent = 'Checking…'; }

    function succeed() {
      if (btn) { btn.disabled = false; }
      push('ee_lead_submit_success');
      if (synthetic) {
        try { sessionStorage.setItem('ee_ssdi_last_lead', JSON.stringify(payload)); } catch (e) {}
        var flag = document.getElementById('previewFlag'); if (flag) flag.hidden = false;
        if (status) {
          status.className = 'status ok';
          status.textContent = (scorer && scorer.resultText ? scorer.resultText() + ' ' : '') +
            'Preview mode: this was a test — nothing was sent and no lead was delivered. In production, this submission becomes the lead receipt shown in Perspective.';
        }
      } else if (status) {
        status.className = 'status ok';
        status.textContent = scorer && scorer.resultText ? scorer.resultText() : 'Thank you — your inquiry was received.';
      }
    }
    function fail() {
      if (btn) { btn.disabled = false; }
      push('ee_lead_submit_error', { reason: 'delivery' });
      if (status) { status.className = 'status err'; status.textContent = 'Something went wrong sending your inquiry. Please try again, or call the number on this page.'; }
    }

    if (synthetic) { setTimeout(succeed, 500); return; }
    fetch(window.EE_INTAKE_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) { r.ok ? succeed() : fail(); }).catch(fail);
  });
})();
