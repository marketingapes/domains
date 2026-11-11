/* GLASSMAN-SSDI-002 intake (shared by the form, the quiz and the Sofia callback panel).
   Mirrors the role of /paraquat/intake.js:
   - renders one click-to-agree disclosure (calls and texts) under the button when #consentBox has
     data-consent="clickwrap"; otherwise a single consent checkbox that is NEVER prechecked
   - pushes only non-identifying events to dataLayer (page_id, campaign_id, tenant_id; generate_lead adds the receipt id) —
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
  var consentVersion = 'glassman-ssdi-002-consent-marketing-apes-2026-11-06-v1';
  /* One tap-to-agree disclosure covers calls and texts; there are no consent checkboxes on these pages. */
  var consentBody = 'you agree that Marketing Apes and Jeffrey Glassman Injury Lawyers, including Sofia, our AI assistant, may call and text you at the number provided about your request, including with automated technology and AI or prerecorded voice. Calls are recorded. Consent is not a condition of any purchase or service. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';
  function otherOptionsRequest() {
    return pageId === 'glassman-ssdi-quiz' && window.BTL_SSDI_QUIZ &&
      window.BTL_SSDI_QUIZ.answers().web_outcome === 'NOT_A_FIT';
  }
  function renderConsent() {
    if (!box) return;
    var otherOptions = otherOptionsRequest();
    var btnLabel = otherOptions ? 'Check other options' : (box.getAttribute('data-button') || 'Submit');
    var btn = document.getElementById('submitBtn');
    if (btn && pageId === 'glassman-ssdi-quiz') {
      btn.textContent = btnLabel + ' ';
      var arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
      btn.appendChild(arrow);
    }
    consentVersion = otherOptions ? 'glassman-ssdi-other-options-marketing-apes-2026-11-09-v1'
      : 'glassman-ssdi-002-consent-marketing-apes-2026-11-06-v1';
    var disclosure = otherOptions
      ? 'you agree that Marketing Apes, including Sofia, our AI assistant, may call and text you at the number provided about your request to check other options, including with automated technology and AI or prerecorded voice. Calls are recorded. Consent is not a condition of any purchase or service. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.'
      : consentBody;
    box.innerHTML = (clickwrap
        ? '<p id="callDisclosure">By tapping \u201c' + btnLabel + ',\u201d ' + disclosure + '</p>'
        : '<label class="channel-consent"><input type="checkbox" id="consent_calls" name="consent_calls" value="yes"><span id="callDisclosure">By checking this box, ' + disclosure + '</span></label>') +
      '<p>' + (otherOptions ? 'This optional request is handled by Marketing Apes. We will ask your permission before referring your inquiry to another law firm.' : 'Operated by Marketing Apes for Jeffrey Glassman Injury Lawyers.') +
      ' Not legal advice. <a href="#campaignPrivacy">How this campaign uses your information</a> \u00b7 <a href="https://besttortlawyers.com/sms-terms/">SMS Terms</a></p>';
  }
  renderConsent();
  form.addEventListener('ee:quiz-result', renderConsent);

  /* ---- best time to call (inside Glassman's intake hours: weekdays 8 AM–7:30 PM Eastern) ---- */
  var TIMES = [['asap', 'As soon as possible'], ['morning', 'Weekday morning (8 to noon Eastern)'], ['midday', 'Weekday midday (noon to 3 Eastern)'], ['afternoon', 'Weekday afternoon (3 to 7:30 PM Eastern)']];
  if (box && !document.getElementById('best_time')) {
    var bt = document.createElement('div'); bt.className = 'field';
    bt.innerHTML = '<label for="best_time">Best time to reach you</label><select id="best_time" name="best_time">' +
      TIMES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') +
      '</select><span class="why">Choose a preferred time for the team to review. This does not book an appointment.</span>';
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

  /* Ad click IDs and UTMs, kept for attribution and so a case that signs later can be matched back to its ad.
     The landing page's IDs are remembered in this browser for 90 days (a visitor who lands on the overview and then
     opens the quiz keeps them); a newer ad click replaces them. The platforms' own first-party cookie IDs
     (_fbp/_fbc, _ttp, _gcl_aw) and the GA client id are read at submit. IDs only: no contact or screening data. */
  var AK = 'ee_attr_glassman_ssdi';
  var CLICK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid'];
  function urlTracking() {
    var q = new URLSearchParams(location.search), o = {};
    CLICK_KEYS.forEach(function (k) { var v = q.get(k); if (v) o[k] = v.slice(0, 250); });
    return o;
  }
  (function rememberLanding() {
    var o = urlTracking();
    if (!Object.keys(o).length) return;
    try { localStorage.setItem(AK, JSON.stringify({ o: o, at: Date.now(), page: location.pathname })); } catch (e) {}
  })();
  function savedTracking() {
    try {
      var s = JSON.parse(localStorage.getItem(AK) || 'null');
      if (s && s.o && typeof s.at === 'number' && Date.now() - s.at < 90 * 864e5) return s;
    } catch (e) {}
    return null;
  }
  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    try { return m ? decodeURIComponent(m[1]).slice(0, 250) : ''; } catch (e) { return ''; }
  }
  function tracking() {
    var s = savedTracking(), o = {};
    if (s) {
      CLICK_KEYS.forEach(function (k) { if (typeof s.o[k] === 'string' && s.o[k]) o[k] = s.o[k].slice(0, 250); });
      o.landing_page = String(s.page || '').slice(0, 200);
      o.landed_at = new Date(s.at).toISOString();
    }
    var fbp = cookie('_fbp'), fbc = cookie('_fbc'), ttp = cookie('_ttp'), gclAw = cookie('_gcl_aw'), ga = cookie('_ga').split('.');
    if (!fbc && o.fbclid && s) fbc = 'fb.1.' + s.at + '.' + o.fbclid;
    if (fbp) o.fbp = fbp;
    if (fbc) o.fbc = fbc;
    if (ttp) o.ttp = ttp;
    if (gclAw) o.gcl_aw = gclAw;
    if (ga.length >= 4) o.ga_client_id = ga.slice(-2).join('.');
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
    var otherOptions = otherOptionsRequest();
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
    /* The intake needs a US number it can text and call; anything e164() can't read would arrive blank and be rejected. */
    if (phone && !e164(val('phone'))) { fieldErr('phone', 'Please enter a 10-digit US mobile number.'); ok = false; }
    var callsBox = document.getElementById('consent_calls');
    if (phone && callsBox && !callsBox.checked) {
      if (status) { status.className = 'status err'; status.textContent = 'Please check the box so the team can call or text the number you provided.'; }
      ok = false;
    }
    if (!ok) {
      push(otherOptions ? 'ee_other_options_submit_error' : 'ee_lead_submit_error', { reason: 'validation' });
      var invalid = form.querySelector('[aria-invalid="true"]'); if (invalid) invalid.focus();
      return;
    }

    var scorer = window.BTL_SSDI || window.BTL_SSDI_QUIZ;
    var answers = scorer ? scorer.answers() : {};
    var R = window.SSDI_RULES, now = new Date();
    var first = val('first_name'), last = val('last_name'), full = first + ' ' + last;
    var callDisclosure = document.getElementById('callDisclosure').textContent.trim();
    var consentText = callDisclosure;
    var agreed = clickwrap || !!(callsBox && callsBox.checked);
    var tfEl = form.querySelector('[name="xxTrustedFormCertUrl"]');
    var payload = {
      schema: 'btl.intake.web/v1', submission_id: sid(),
      tenant_id: TENANT, domain_id: 'btl', campaign_id: CAMPAIGN, page_id: pageId,
      door: form.getAttribute('data-kind') || 'form',
      request_type: otherOptions ? 'other_firm_review_request' : (answers.web_outcome ? 'screened_inquiry' : 'callback_request'),
      submitted_at: now.toISOString(),
      contact: { full_name: full, first_name: first, last_name: last, email: val('email'), phone_e164: e164(val('phone')), state: val('state') || answers.state || null },
      screening: { web_outcome: answers.web_outcome || null, criteria_version: answers.criteria_version || (R && R.version) || null, answers: answers },
      /* callback = Sofia screens on the call; the web outcome only exists for the form and quiz */
      routing: { route: answers.web_outcome && R ? R.route(answers.web_outcome) : 'sofia_screen', transfer_window: R && R.inHours(now) ? 'open' : 'closed' },
      consent: {
        version: consentVersion, captured_at: now.toISOString(), text: consentText,
        method: clickwrap ? 'clickwrap_submit' : 'checkbox',
        calls: { granted: agreed, text: callDisclosure,
          version: consentVersion + '-calls', method: clickwrap ? 'clickwrap_submit' : 'checkbox', captured_at: now.toISOString() },
        sms: { granted: agreed, text: callDisclosure,
          version: consentVersion + '-sms', method: clickwrap ? 'clickwrap_submit' : 'checkbox', captured_at: now.toISOString() }
      },
      trustedform_cert_url: tfEl && tfEl.value ? tfEl.value : null,
      page_url: location.origin + location.pathname,
      callback: { window: bestTime()[0], label: bestTime()[1] },
      attribution: tracking(),
      test: { synthetic: isTest }
    };

    if (otherOptions) {
      // A request for Marketing Apes to review options is not a referral or a qualified Glassman lead.
      payload.routing.route = 'hold';
      payload.followup_request = { type: 'other_firm_review', requested: true, referral_authorized: false };
    }

    /* Keep the exact original payload for an unchanged retry, including consent/submission time.
       An edited inquiry gets a new id; it must not overwrite an earlier stored submission. */
    // Channel timestamps share the submit capture time; exclude them from the edit fingerprint.
    var signature = JSON.stringify([payload.schema, payload.tenant_id, payload.domain_id, payload.campaign_id,
      payload.page_id, payload.door, payload.request_type, payload.page_url, payload.contact, payload.screening, { route: payload.routing.route },
      payload.consent.version, payload.consent.text, payload.consent.method, payload.consent.calls.granted, payload.consent.sms.granted,
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
        payload.consent.captured_at = restored.consent_captured_at;
        payload.consent.calls.captured_at = restored.consent_captured_at;
        payload.consent.sms.captured_at = restored.consent_captured_at;
        payload.trustedform_cert_url = restored.certificate_url;
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

    push(otherOptions ? 'ee_other_options_submit_attempt' : 'ee_lead_submit_attempt');
    if (btn) { btn.disabled = true; }
    if (status) { status.className = 'status'; status.textContent = 'Checking…'; }

    /* A receipt confirms storage of a request, not contact or a booked appointment. */
    function thanks() {
      if (otherOptions) return 'Your request to check other options was received by Marketing Apes. A match or callback is not guaranteed. We’ll ask your permission before sharing your information with another firm.';
      return 'Your callback request was received. The team will review it. Your requested time: ' + bestTime()[1] + '.';
    }

    function succeed(j) {
      pending = false; completed = true;
      if (btn) { btn.disabled = false; }
      if (!otherOptions) push('ee_lead_submit_success');
      /* The Meta ad set optimizes for the pixel's Lead event, and GTM maps generate_lead to Lead. Real first-time
         leads only: never a test (?test=1 / test mode) or a duplicate resubmission. lead_id is the receipt, not PII. */
      var conversion = !otherOptions && j && !isTest && j.mode !== 'test' && j.status !== 'duplicate';
      /* eventCallback tells the thank-you redirect (below) when GTM has finished the generate_lead tags. */
      if (otherOptions) push('ee_other_options_request_received');
      else if (conversion) push('generate_lead', { lead_id: j.receipt_id, eventCallback: function () { tagsDone = true; }, eventTimeout: 2000 });
      /* TikTok's web ad group optimizes for TikTok's standard SubmitForm event, but GTM forwards generate_lead to TikTok
         only under its own name. Same real-first-time-lead rule; event_id is the receipt; no contact or screening data. */
      if (!otherOptions && j && !isTest && j.mode !== 'test' && j.status !== 'duplicate' && window.ttq && typeof window.ttq.track === 'function') {
        try { window.ttq.track('SubmitForm', { content_name: CAMPAIGN }, { event_id: j.receipt_id }); } catch (e) {}
      }
      /* ChatGPT ads (OpenAI) conversion. The OpenAI SDK is loaded only here, at a real first-time lead — never on a page
         view, a test, a duplicate or an other-options request — and records lead_created with no contact or screening data. */
      if (!otherOptions && j && !isTest && j.mode !== 'test' && j.status !== 'duplicate') {
        try {
          if (typeof window.oaiq !== 'function') {
            var oq = function () { oq.q.push(arguments); }; oq.q = []; window.oaiq = oq;
            var os = document.createElement('script'); os.async = true; os.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
            document.head.appendChild(os);
            window.oaiq('init', { pixelId: 'QNfxrnZGsp74sFs5M93mJh' });
          }
          window.oaiq('measure', 'lead_created', { type: 'customer_action', amount: 0, currency: 'USD' });
        } catch (e) {}
      }
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
      thankYou(conversion, j);
    }

    /* Every saved request ends on a thank-you page: callback requests and quiz matches (QUALIFIED, FIRM_REVIEW) on
       /glassman/ssdi/thank-you/, quiz non-matches that asked to check other options on /glassman/ssdi/thank-you/other-options/.
       The conversions above fire on this page first: a real first-time lead waits for GTM's generate_lead callback
       (at least 1.5 s so the pixels and the ChatGPT-ads SDK can send, at most 2.5 s); anything else leaves after 0.4 s.
       The in-place confirmation shows meanwhile. The thank-you pages fire no conversions of their own. Only the kind,
       requested time and receipt go along, in sessionStorage — never contact or screening data. ?test=1 is carried over.
       A listener can cancel the 'ee:thank-you' event to stay on the page. */
    var tagsDone = false;
    function thankYou(conversion, j) {
      var url = '/glassman/ssdi/thank-you/' + (otherOptions ? 'other-options/' : '') + (isTest ? '?test=1' : '');
      try {
        sessionStorage.setItem('ee_ssdi_thanks', JSON.stringify({ kind: otherOptions ? 'other_options' : 'callback',
          time: bestTime()[1], receipt: j && j.receipt_id ? String(j.receipt_id).slice(0, 40) : null,
          real: !!(j && !isTest && j.mode !== 'test' && j.status !== 'duplicate'), at: Date.now() }));
      } catch (e) {}
      var started = Date.now(), gone = false;
      function go() {
        if (gone) return; gone = true;
        if (form.dispatchEvent(new CustomEvent('ee:thank-you', { cancelable: true, detail: { url: url } }))) location.assign(url);
      }
      if (!conversion) { setTimeout(go, 400); return; }
      (function wait() {
        var t = Date.now() - started;
        if (t >= 2500 || (tagsDone && t >= 1500)) go(); else setTimeout(wait, 100);
      })();
    }
    function fail() {
      pending = false;
      if (btn) { btn.disabled = false; }
      push(otherOptions ? 'ee_other_options_submit_error' : 'ee_lead_submit_error', { reason: 'delivery' });
      if (status) { status.className = 'status err'; status.textContent = 'Something went wrong sending your inquiry. Please try again in a moment.'; }
    }

    if (synthetic) { setTimeout(succeed, 500); return; }
    fetch(window.EE_INTAKE_ENDPOINT, {
      method: 'POST', body: new URLSearchParams({ payload: JSON.stringify(payload), submission_id: payload.submission_id })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok || !j || !j.receipt_id || ['received', 'accepted', 'duplicate'].indexOf(j.status) < 0) throw Error('no receipt');
        try { sessionStorage.removeItem(SK); sessionStorage.removeItem(RK); sessionStorage.setItem('ee_ssdi_last_receipt', j.receipt_id); } catch (e) {}
        succeed(j);
      });
    }).catch(fail);
  });
})();
