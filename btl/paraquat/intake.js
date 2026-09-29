/* BTL Paraquat consumer intake — shared by /paraquat/ (form-first) and /paraquat/talk-to-sofia/ (call-first).
 *
 * Rules this file enforces (PARAQUAT-PILOT-001):
 *  - Success is shown ONLY after the protected BTL intake endpoint returns 2xx JSON with a durable receipt id.
 *  - No endpoint configured  => fail closed: nothing is sent, visitor is told plainly.
 *  - One submission_id per form fill, reused on retry, so the backend can dedupe; the button locks while in flight.
 *  - Consent boxes are never prechecked; each channel is recorded separately with the exact text shown.
 *  - Browser analytics receive only non-identifying funnel events (no name, phone, email, state, answers).
 *  - The call button stays disabled until the BTL line is verified as routed to BTL Sofia.
 */
(function () {
  'use strict';

  // ---- Configuration (the only values an operator changes) -------------------------------------
  var CONFIG = {
    campaign_id: 'PARAQUAT-PILOT-001',
    tenant_id: 'BTL',
    domain_id: 'besttortlawyers.com',
    // Dedicated Paraquat intake: Make scenario 6437227 "BTL — Paraquat Web Intake → LegalCalls" (hook 2868930).
    // It dedupes on submission_id, writes the BigQuery intake row, emails LegalCalls and returns {status, receipt_id}.
    endpoint: 'https://hook.us2.make.com/f916v5eh4xccy9ytkancw7xa63g6v326',
    // Temporary inbound line (Kyle, 2026-09-28): the 213 Sofia line, forwarding to Kyle via transferCall.
    // Bound to "Sofia BTL Paraquat v4" (976d64df…) in Vapi on 2026-09-28; calls transfer via transferCall.
    // To revert: set verified:false (button falls back to the callback form).
    phone: { e164: '+12138787408', display: '(213) 878-7408', verified: true },
    consent_version: 'btl-paraquat-consent-2026-09-28-draft',
    timeout_ms: 15000
  };

  window.BTL_PHONE = CONFIG.phone;
  var params = new URLSearchParams(location.search);
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.(localhost|test)$/.test(location.hostname);
  // Synthetic QA mode: only honoured on local/preview hosts; marks the record test + suppresses all outbound.
  var SYNTHETIC = params.get('ee_test') === 'synthetic' && (isLocal || /\.onrender\.com$/.test(location.hostname));
  if (SYNTHETIC && params.get('ee_endpoint') && isLocal) CONFIG.endpoint = params.get('ee_endpoint');

  var form = document.getElementById('leadForm');
  if (!form) return;
  var PAGE_ID = form.getAttribute('data-page-id');
  var KIND = form.getAttribute('data-kind'); // inquiry | callback

  // ---- Browser analytics: non-identifying only --------------------------------------------------
  var fired = {};
  function track(name, once) {
    if (once && fired[name]) return;
    fired[name] = 1;
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: name, page_id: PAGE_ID, campaign_id: CONFIG.campaign_id, tenant_id: CONFIG.tenant_id, test: SYNTHETIC || undefined });
    } catch (e) {}
  }
  track('ee_page_view', true);

  // ---- Attribution (approved keys only; kept server-side, never sent to ad platforms from here) -
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'ttclid'];
  function attribution() {
    var a = {};
    ATTR_KEYS.forEach(function (k) { var v = params.get(k); if (v) a[k] = v.slice(0, 200); });
    a.landing_path = location.pathname;
    a.referrer_host = (function () { try { return document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { return ''; } })();
    return a;
  }

  // ---- Consent (channel-specific, unchecked) ----------------------------------------------------
  var CONSENT = {
    // Wording follows btl/sms-terms/ "TCPA disclosure", split by channel. Counsel sign-off still pending.
    calls: 'Calls: I agree to receive calls at the number above about my potential claim from Best Tort Lawyers — including Sofia, its AI assistant — and the law firm intake team it connects me with, including by automatic telephone dialing systems or prerecorded/artificial voice. Calls may be recorded. Consent is not a condition of any purchase or service.',
    sms: 'Texts: I agree to receive text messages at the number above about my potential claim from Best Tort Lawyers and the law firm intake team it connects me with, which may be sent using automated technology. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. See the SMS Terms.'
  };
  var NO_AI = form.getAttribute('data-consent') === 'no-ai';
  if (NO_AI) CONSENT.calls = 'Calls: I agree to receive calls at the number above about my potential claim from Best Tort Lawyers and the law firm intake team it connects me with, including by automatic telephone dialing systems or prerecorded/artificial voice. Calls may be recorded. Consent is not a condition of any purchase or service.';
  var consentBox = document.getElementById('consentBox');
  consentBox.innerHTML =
    '<p class="c-title" id="consentT">How may we contact you?</p>' +
    '<label class="chk"><input type="checkbox" name="consent_calls" id="consent_calls" aria-describedby="consentT consent-e"><span>' + CONSENT.calls + '</span></label>' +
    '<label class="chk"><input type="checkbox" name="consent_sms" id="consent_sms" aria-describedby="consentT"><span>' + CONSENT.sms.replace('SMS Terms', '<a href="/sms-terms/" target="_blank" rel="noopener">SMS Terms</a>') + '</span></label>' +
    '<span class="ferr" id="consent-e"></span>' +
    '<p class="legal-sm">By submitting, you agree to our <a href="/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms-and-conditions/" target="_blank" rel="noopener">Terms</a>. Best Tort Lawyers is not a law firm; submitting does not create an attorney-client relationship. Don’t include Social Security numbers, medical records or payment details.</p>';

  // ---- States ----------------------------------------------------------------------------------
  var STATES = 'AL Alabama|AK Alaska|AZ Arizona|AR Arkansas|CA California|CO Colorado|CT Connecticut|DE Delaware|DC District of Columbia|FL Florida|GA Georgia|HI Hawaii|ID Idaho|IL Illinois|IN Indiana|IA Iowa|KS Kansas|KY Kentucky|LA Louisiana|ME Maine|MD Maryland|MA Massachusetts|MI Michigan|MN Minnesota|MS Mississippi|MO Missouri|MT Montana|NE Nebraska|NV Nevada|NH New Hampshire|NJ New Jersey|NM New Mexico|NY New York|NC North Carolina|ND North Dakota|OH Ohio|OK Oklahoma|OR Oregon|PA Pennsylvania|RI Rhode Island|SC South Carolina|SD South Dakota|TN Tennessee|TX Texas|UT Utah|VT Vermont|VA Virginia|WA Washington|WV West Virginia|WI Wisconsin|WY Wyoming';
  var sel = document.getElementById('state');
  if (sel) STATES.split('|').forEach(function (s) { var o = document.createElement('option'); o.value = s.slice(0, 2); o.textContent = s.slice(3); sel.appendChild(o); });

  // ---- Call-first page: call + callback actions ------------------------------------------------
  var callBtn = document.getElementById('callSofia');
  if (callBtn) {
    var note = document.getElementById('callNote');
    if (CONFIG.phone.verified) {
      callBtn.href = 'tel:' + CONFIG.phone.e164;
      callBtn.removeAttribute('aria-disabled');
      callBtn.removeAttribute('role');
      callBtn.setAttribute('aria-label', 'Call Sofia now at ' + CONFIG.phone.display);
      document.getElementById('callSub').textContent = CONFIG.phone.display;
      var dln = document.getElementById('deskLine'); if (dln) dln.querySelector('b').textContent = CONFIG.phone.display;
      callBtn.addEventListener('click', function () { track('ee_call_click'); }); // a click is not a connected call
    } else {
      document.getElementById('callSub').textContent = 'Phone line opening soon — request a callback below';
      var dl = document.getElementById('deskLine'); if (dl) dl.hidden = true;
      note.innerHTML = '<b>Sofia’s phone line is still being verified.</b> You can request a callback instead.';
      callBtn.addEventListener('click', function (e) { e.preventDefault(); openCallback(); });
    }
  }
  function firstField() { return form.querySelector('input:not([type=hidden]),select'); }
  var openCb = document.getElementById('openCb');
  var panel = document.getElementById('cbPanel');
  function openCallback() {
    if (!panel) return;
    panel.hidden = false;
    openCb.setAttribute('aria-expanded', 'true');
    track('ee_callback_open', true);
    setTimeout(function () { firstField().focus(); panel.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30);
  }
  if (openCb) openCb.addEventListener('click', function () { panel.hidden ? openCallback() : firstField().focus(); });
  if (panel && params.get('callback') === '1') openCallback();

  // ---- Validation -------------------------------------------------------------------------------
  function digits(v) { return (v || '').replace(/\D/g, ''); }
  function normPhone(v) { var d = digits(v); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? '+1' + d : null; }
  function clean(v) { return (v || '').replace(/[\u0000-\u001f<>]/g, '').trim(); }
  function setErr(id, msg) {
    var el = document.getElementById(id);
    var holder = el && (el.tagName === 'FIELDSET' ? el : el);
    var e = document.getElementById(id + '-e');
    if (holder) { if (msg) holder.setAttribute('aria-invalid', 'true'); else holder.removeAttribute('aria-invalid'); }
    if (e) e.textContent = msg || '';
  }
  function radio(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function q(name) { return form.querySelector('fieldset[data-q="' + name + '"]'); }

  function validate() {
    var bad = [];
    var v = { phone: normPhone(form.phone.value) };
    function need(id, msg) { var el = form[id]; if (!el) return; v[id] = clean(el.value); if (!v[id]) { setErr(id, msg); bad.push(id); } else setErr(id); }
    need('full_name', 'Enter your name.');
    need('first_name', 'Enter your first name.');
    need('last_name', 'Enter your last name.');
    if (!v.phone) { setErr('phone', 'Enter a 10-digit US phone number.'); bad.push('phone'); } else setErr('phone');
    if (form.state) { v.state = form.state.value; if (!v.state) { setErr('state', 'Choose your state.'); bad.push('state'); } else setErr('state'); }
    if (form.email) {
      v.email = clean(form.email.value);
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) { setErr('email', 'Check the email address, or leave it blank.'); bad.push('email'); } else setErr('email');
    }
    if (KIND === 'inquiry') {
      ['diagnosis', 'exposure', 'represented'].forEach(function (k) {
        var fs = q(k), e = document.getElementById(k + '-e');
        v[k] = radio(k);
        if (!v[k]) { fs.setAttribute('aria-invalid', 'true'); e.textContent = 'Choose an answer — “Not sure” is fine.'; bad.push(k); }
        else { fs.removeAttribute('aria-invalid'); e.textContent = ''; }
      });
    }
    // Dropdown qualifier (/paraquat/): every visible qualifying select needs an answer ("Not sure" counts).
    form.querySelectorAll('select[data-q]').forEach(function (sel) {
      if (sel.closest('[hidden]')) return;
      var id = sel.id;
      if (!sel.value) { setErr(id, 'Choose an answer — “Not sure” is fine.'); bad.push(id); } else setErr(id);
    });
    v.consent_calls = form.consent_calls.checked; v.consent_sms = form.consent_sms.checked;
    var ce = document.getElementById('consent-e');
    // A callback is a phone call: it needs call consent. The inquiry form needs at least one channel so we can reply.
    if (KIND === 'callback' && !v.consent_calls) { ce.textContent = 'To receive a callback, check the box agreeing to calls from Sofia.'; bad.push('consent_calls'); }
    else if (KIND !== 'callback' && !v.consent_calls && !v.consent_sms && !v.email) { ce.textContent = 'Choose at least one way we may contact you (call, text or add an email).'; bad.push('consent_calls'); }
    else ce.textContent = '';
    return { ok: !bad.length, v: v, first: bad[0] };
  }
  form.addEventListener('input', function () { track('ee_form_start', true); }, { once: true });
  form.addEventListener('change', function (e) { if (e.target.name && form.getAttribute('data-tried')) validate(); });

  // ---- Submission -------------------------------------------------------------------------------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  var SK = 'btl_pq_sub_' + PAGE_ID;
  function submissionId(fingerprint) {
    // Same person + same form content on retry => same id (dedupe). New content => new id.
    try {
      var s = JSON.parse(sessionStorage.getItem(SK) || 'null');
      if (s && s.fp === fingerprint) return s.id;
      var id = uuid(); sessionStorage.setItem(SK, JSON.stringify({ fp: fingerprint, id: id })); return id;
    } catch (e) { return form._sid || (form._sid = uuid()); }
  }
  var btn = document.getElementById('submitBtn'), status = document.getElementById('formStatus'), inFlight = false;
  function say(msg, cls) { status.className = 'status' + (cls ? ' ' + cls : ''); status.textContent = msg; }
  function busy(on) { inFlight = on; btn.disabled = on; btn.setAttribute('data-busy', on ? '1' : '0'); btn.querySelector('.lbl').textContent = on ? 'Sending…' : (KIND === 'callback' ? 'Request my callback' : 'Submit my inquiry'); }

  var pf = document.getElementById('previewFlag');
  if (pf && SYNTHETIC) pf.hidden = false;
  else if (pf && !CONFIG.endpoint) { pf.textContent = 'Online requests open soon — not accepting submissions yet'; pf.hidden = false; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (inFlight) return;
    form.setAttribute('data-tried', '1');
    var r = validate();
    if (!r.ok) { say('Please fix the highlighted fields.', 'err'); var f = form.querySelector('[aria-invalid="true"]') || document.getElementById(r.first) || q(r.first); if (f) (f.querySelector ? (f.querySelector('input') || f) : f).focus(); return; }
    var v = r.v;
    track('ee_lead_submit_attempt');

    if (!CONFIG.endpoint) {
      say('Online requests aren’t connected yet, so nothing was sent or saved and no one will contact you from this page. ' + (KIND === 'callback' ? 'Please check back soon.' : 'You can also email Sofia@besttortlawyers.com.'), 'warn');
      return;
    }

    var fp = [PAGE_ID, v.phone, (v.full_name || v.first_name + ' ' + v.last_name).toLowerCase(), v.state || ''].join('|');
    var payload = {
      schema: 'btl.intake.web/v1',
      submission_id: submissionId(fp),
      tenant_id: CONFIG.tenant_id, domain_id: CONFIG.domain_id,
      campaign_id: CONFIG.campaign_id, page_id: PAGE_ID,
      request_type: KIND === 'callback' ? 'callback_request' : KIND === 'quiz' ? 'quiz_inquiry' : 'web_inquiry',
      contact: { full_name: v.full_name || null, first_name: v.first_name || null, last_name: v.last_name || null, phone_e164: v.phone, email: v.email || null, state: v.state || null },
      screening: KIND === 'inquiry' ? { parkinsons_diagnosis: v.diagnosis, paraquat_exposure: v.exposure, represented: v.represented }
        : KIND === 'quiz' && window.BTL_QUIZ ? window.BTL_QUIZ.answers() : null,
      callback: KIND === 'callback' ? { window: null, time_zone: null } : null,
      consent: {
        version: CONFIG.consent_version, captured_at: new Date().toISOString(), page_url: location.origin + location.pathname,
        calls: { granted: v.consent_calls, text: CONSENT.calls },
        sms: { granted: v.consent_sms, text: CONSENT.sms }
      },
      attribution: attribution(),
      test: SYNTHETIC ? { synthetic: true, suppress: ['outbound_calls', 'sms', 'email', 'buyer_delivery', 'ad_events'] } : undefined
    };

    busy(true); say('');
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, CONFIG.timeout_ms);
    fetch(CONFIG.endpoint, {
      // Form-encoded "simple" request: no CORS preflight (Make webhooks don't answer OPTIONS). Dedupe key is submission_id.
      method: 'POST', body: new URLSearchParams({ payload: JSON.stringify(payload), submission_id: payload.submission_id }),
      signal: ctl ? ctl.signal : undefined, credentials: 'omit'
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) { return { res: res, body: body }; });
    }).then(function (x) {
      clearTimeout(timer);
      var b = x.body || {};
      var receipt = b.receipt_id || b.lead_id;
      if (x.res.ok && receipt && (b.status === 'received' || b.status === 'accepted' || b.status === 'duplicate')) {
        track('ee_lead_submit_success', true);
        showReceipt(b, receipt);
      } else {
        throw new Error('no_receipt');
      }
    }).catch(function () {
      clearTimeout(timer);
      track('ee_lead_submit_error');
      busy(false);
      say('We couldn’t confirm your ' + (KIND === 'callback' ? 'callback request' : 'inquiry') + ' was received. Nothing is shown as submitted until it is. Please try again — retrying won’t create a duplicate.', 'err');
      btn.focus();
    });
  });

  function showReceipt(b, receipt) {
    var body = document.getElementById('formBody');
    var sched = b.callback && b.callback.scheduled_for && b.callback.status === 'scheduled';
    var next = b.next_step_label || (window.BTL_QUIZ && window.BTL_QUIZ.resultText ? window.BTL_QUIZ.resultText() + ' We’ll contact you only through the channels you agreed to.' : (KIND === 'callback'
      ? 'Your request is in the callback queue. A call time isn’t confirmed until it’s scheduled, and we’ll contact you only through the channels you agreed to.'
      : 'We’ll follow up using the contact method you chose to review your inquiry.'));
    body.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className = 'receipt'; wrap.setAttribute('tabindex', '-1');
    wrap.innerHTML = '<div class="tick" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>' +
      '<h2></h2><p class="nx"></p><p class="small" style="font-size:.86rem;color:var(--muted)">' + (KIND === 'callback' ? 'A callback request' : 'Receiving an inquiry') + ' is not a review decision. An independent law firm decides under its own criteria. You can opt out at any time by replying STOP to texts or ' + (NO_AI ? 'telling us' : 'telling Sofia') + '.</p><dl></dl>';
    wrap.querySelector('h2').textContent = KIND === 'callback' ? 'Your callback request was received.' : 'Your inquiry was received.';
    wrap.querySelector('.nx').textContent = next;
    var dl = wrap.querySelector('dl');
    function row(k, val) { var dt = document.createElement('dt'); dt.textContent = k; var dd = document.createElement('dd'); dd.textContent = val; dl.appendChild(dt); dl.appendChild(dd); }
    var dt0 = document.createElement('dt'); dt0.textContent = 'Reference'; var dd0 = document.createElement('dd');
    var chip = document.createElement('span'); chip.className = 'ref-chip'; chip.textContent = 'BTL·PQ·' + String(receipt).replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
    dd0.appendChild(chip); dl.appendChild(dt0); dl.appendChild(dd0);
    if (KIND === 'callback') row('Callback', sched ? new Date(b.callback.scheduled_for).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Requested — time not yet scheduled');
    body.appendChild(wrap);
    wrap.focus();
    try { sessionStorage.removeItem(SK); } catch (e) {}
  }
})();
