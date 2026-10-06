/* Phillips Law Group — AZ MVA/PI three-path test intake (PLG-AZ-MVA-3PATH-2026-10).
 * Shared by A (form + call), B (Sofia: call / callback) and C (claim-check chat).
 * Ported from the BTL Paraquat intake (Codex 2026-10-04) — same rules:
 *  - Success shows ONLY after the intake endpoint returns 2xx JSON with a receipt id. No endpoint => fail closed.
 *    There is no timing or honeypot shortcut to a success message: a filled honeypot is sent and flagged, never dropped.
 *  - Accident timeline (rule: less than one year) is captured on every path and sent in screening, never used to drop a lead.
 *  - One submission_id per fill, reused on retry (backend dedupes). Button locks while in flight.
 *  - Consent text sent with the record is the exact text shown on the page.
 *  - dataLayer gets non-identifying funnel events only (never name/phone/email/answers).
 */
(function () {
  'use strict';

  // ---- Operator config (the only values to change) -------------------------------------------
  var CONFIG = {
    campaign_id: 'PLG-AZ-MVA-3PATH-2026-10',
    tenant_id: 'BTL', buyer_id: 'phillips', domain_id: 'besttortlawyers.com',
    // Human-only intake (Kyle 2026-10-06): production relay → Make 6525665 → BigQuery raw event; no calls, texts,
    // email or buyer delivery. Used only on the production hosts below; anywhere else stays empty = fail closed.
    endpoint: '',
    production_endpoint: 'https://btl-plg-az-mva-intake.onrender.com/intake',
    production_hosts: ['besttortlawyers.com', 'www.besttortlawyers.com'],
    // Safe staging only: the Render relay keeps the Make webhook secret, accepts synthetic tests only,
    // and cannot trigger calls, texts, email, buyer delivery or ad events.
    synthetic_endpoint: 'https://btl-plg-az-mva-intake-stage-20261005.onrender.com/intake',
    // Phillips PI/MVA intake DID (legal-web-lead/config/phillips-lane/routes.json, confirmed 2026-09-07).
    firm_phone: { e164: '+16022003976', display: '(602) 200-3976' },
    // BTL Sofia line (Vapi phone 4d07e1e8 -> assistant d2b58eeb, Kyle 2026-10-06). Sofia screens Arizona
    // accident callers and transfers qualified callers to firm_phone. Path B's main button dials it.
    sofia_phone: { e164: '+16026931461', display: '(602) 693-1461', verified: true },
    consent_version: 'plg-azmva-consent-2026-10-06-v2', // verbatim 2026-08-07 Phillips package
    timeout_ms: 15000
  };
  window.PLG = { firm: CONFIG.firm_phone, sofia: CONFIG.sofia_phone };
  // The Claim Check chat (path C) listens for submit outcomes and shows them as messages.
  function emit(state, detail) { try { document.dispatchEvent(new CustomEvent('plg:submit', { detail: Object.assign({ state: state }, detail || {}) })); } catch (e) {} }

  var params = new URLSearchParams(location.search);
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var isProd = CONFIG.production_hosts.indexOf(location.hostname) >= 0;
  if (isProd) CONFIG.endpoint = CONFIG.production_endpoint;
  // Synthetic tests are flagged and fully suppressed (no contact, no delivery) on every host, production included.
  var SYNTHETIC = params.get('ee_test') === 'synthetic' && (isLocal || isProd || /\.onrender\.com$/.test(location.hostname));
  if (SYNTHETIC && /\.onrender\.com$/.test(location.hostname)) CONFIG.endpoint = CONFIG.synthetic_endpoint;
  if (SYNTHETIC && isLocal && params.get('ee_endpoint')) CONFIG.endpoint = params.get('ee_endpoint');

  var form = document.getElementById('leadForm');
  var PAGE_ID = (form && form.getAttribute('data-page-id')) || document.body.getAttribute('data-page-id') || 'plg-azmva';
  var KIND = form ? form.getAttribute('data-kind') : 'none'; // inquiry | callback | check
  var CONSENT_MODE = form ? form.getAttribute('data-consent') : 'standard'; // standard | ai

  // ---- Non-identifying analytics ---------------------------------------------------------------
  var fired = {};
  function track(name, once, extra) {
    if (once && fired[name]) return; fired[name] = 1;
    try {
      window.dataLayer = window.dataLayer || [];
      var o = { event: name, page_id: PAGE_ID, campaign_id: CONFIG.campaign_id, tenant_id: CONFIG.tenant_id, buyer_id: CONFIG.buyer_id, test: SYNTHETIC || undefined };
      if (extra) for (var k in extra) o[k] = extra[k];
      window.dataLayer.push(o);
    } catch (e) {}
  }
  window.PLG.track = track;
  track('ee_page_view', true);

  // ---- Every firm call button on the page ------------------------------------------------------
  document.querySelectorAll('[data-call="firm"]').forEach(function (a) {
    a.href = 'tel:' + CONFIG.firm_phone.e164;
    a.addEventListener('click', function () { track('ee_call_click', false, { call_target: 'firm', placement: a.getAttribute('data-placement') || '' }); });
  });
  document.querySelectorAll('[data-firm-num]').forEach(function (el) { el.textContent = CONFIG.firm_phone.display; });

  // ---- Sofia call button (B) -------------------------------------------------------------------
  var sofiaBtn = document.getElementById('callSofia');
  if (sofiaBtn) {
    if (CONFIG.sofia_phone.verified && CONFIG.sofia_phone.e164) {
      sofiaBtn.href = 'tel:' + CONFIG.sofia_phone.e164;
      document.getElementById('callSub').textContent = CONFIG.sofia_phone.display;
      sofiaBtn.addEventListener('click', function () { track('ee_call_click', false, { call_target: 'sofia' }); });
    } else {
      document.getElementById('callSub').textContent = 'A person from the intake team calls you back';
      var cb2 = document.getElementById('openCb'); if (cb2) cb2.hidden = true; // one button until Sofia has her own line
      sofiaBtn.addEventListener('click', function (e) { e.preventDefault(); openCallback(); });
    }
  }
  var openCb = document.getElementById('openCb'), panel = document.getElementById('cbPanel');
  function openCallback() {
    if (!panel) return;
    panel.hidden = false; if (openCb) openCb.setAttribute('aria-expanded', 'true');
    track('ee_callback_open', true);
    setTimeout(function () { var f = form.querySelector('input:not([type=hidden])'); if (f) f.focus(); panel.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30);
  }
  if (openCb) openCb.addEventListener('click', openCallback);
  if (panel && params.get('callback') === '1') openCallback();

  if (!form) return;

  // ---- Consent (shown under the submit button; submit = agreement) -----------------------------
  var PRIV = '<a href="https://besttortlawyers.com/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>';
  var TERMS = '<a href="https://besttortlawyers.com/terms-and-conditions/" target="_blank" rel="noopener">Terms</a>';
  var SMS = '<a href="https://besttortlawyers.com/sms-terms/" target="_blank" rel="noopener">SMS Terms</a>';
  var btnLabel = (document.getElementById('submitBtn') || {}).textContent || 'Submit';
  btnLabel = btnLabel.trim();
  // TCPA consent: verbatim from the AZ MVA package sent to Phillips (Olivia Lemorrocco) on 2026-08-07, led by the exact button name.
  // Human callbacks only: no artificial, prerecorded or AI voice is promised or used (Phillips Indemnification Agreement).
  var PLG_PRIV = '<a href="https://www.phillipslaw.com/disclaimer/" target="_blank" rel="noopener">Privacy Policy</a>';
  var PLG_TERMS = '<a href="https://www.phillipslaw.com/disclaimer/" target="_blank" rel="noopener">Terms of Use</a>';
  var CONSENT_BODY = 'By providing your phone number, you agree to receive calls and transactional SMS messages about your potential claim from Phillips Law Group and its agents, including Best Tort Lawyers. Message frequency may vary. Message & data rates may apply. Reply STOP to opt out at any time. Consent is not a condition of service. No attorney-client relationship is formed by submitting this form.';
  var CONSENT_TEXT = 'By tapping “' + btnLabel + ',” I agree to the Privacy Policy & Terms of Use. ' + CONSENT_BODY;
  var box = document.getElementById('consentBox');
  if (box) box.innerHTML = '<p class="legal-sm" id="consentT">By tapping “' + btnLabel + ',” I agree to the ' + PLG_PRIV + ' &amp; ' + PLG_TERMS + '. ' + CONSENT_BODY + '</p>';

  // ---- Validation ------------------------------------------------------------------------------
  function normPhone(v) { var d = (v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? '+1' + d : null; }
  function clean(v) { return (v || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function setErr(id, msg) {
    var el = document.getElementById(id), e = document.getElementById(id + '-e');
    if (el) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
    if (e) e.textContent = msg || '';
  }
  function validate() {
    var bad = [], v = {};
    v.full_name = clean(form.full_name.value);
    if (v.full_name.length < 2) { setErr('full_name', 'Enter your name.'); bad.push('full_name'); } else setErr('full_name');
    v.phone = normPhone(form.phone.value);
    if (!v.phone) { setErr('phone', 'Enter a 10-digit US phone number.'); bad.push('phone'); } else setErr('phone');
    if (form.email) {
      v.email = clean(form.email.value);
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) { setErr('email', 'Check the email, or leave it blank.'); bad.push('email'); } else setErr('email');
    }
    if (form.what_happened) v.what_happened = clean(form.what_happened.value).slice(0, 600);
    form.querySelectorAll('fieldset[data-q]').forEach(function (fs) {
      var name = fs.getAttribute('data-q'), r = form.querySelector('input[name="' + name + '"]:checked');
      v[name] = r ? r.value : '';
      if (!v[name] && fs.hasAttribute('data-required')) { fs.setAttribute('aria-invalid', 'true'); document.getElementById(name + '-e').textContent = 'Choose one — “Not sure” is fine.'; bad.push(name); }
      else { fs.removeAttribute('aria-invalid'); var e = document.getElementById(name + '-e'); if (e) e.textContent = ''; }
    });
    // Honeypot: recorded as a signal for review, never a reason to drop or fake-confirm a request.
    v.hp = form.website ? form.website.value : '';
    return { ok: !bad.length, v: v, first: bad[0] };
  }
  form.addEventListener('input', function () { track('ee_form_start', true); }, { once: true });
  form.addEventListener('change', function () { if (form.getAttribute('data-tried')) validate(); });
  // A and B: "More than a year ago" is still sent — the intake team reviews the date on the callback.
  var whenNote = document.getElementById('accident_when-note');
  if (whenNote) form.addEventListener('change', function (e) { if (e.target && e.target.name === 'accident_when') whenNote.hidden = e.target.value !== 'over_1y'; });
  // Timeline rule (Kyle + Michael, PLG): accident less than one year ago. Downstream review enforces it from these fields.
  var UNDER_1Y = ['under_30d', '1_6m', '6_12m'];
  function timelineCheck(when) { return UNDER_1Y.indexOf(when) >= 0 ? 'under_1y' : when === 'over_1y' ? 'over_1y' : 'unknown'; }

  // ---- Submit ----------------------------------------------------------------------------------
  function uuid() { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  var SK = 'plg_sub_' + PAGE_ID;
  function submissionId(fp) {
    try { var s = JSON.parse(sessionStorage.getItem(SK) || 'null'); if (s && s.fp === fp) return s.id; var id = uuid(); sessionStorage.setItem(SK, JSON.stringify({ fp: fp, id: id })); return id; }
    catch (e) { return form._sid || (form._sid = uuid()); }
  }
  function attribution() {
    var a = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid'].forEach(function (k) { var x = params.get(k); if (x) a[k] = x.slice(0, 200); });
    a.landing_path = location.pathname;
    try { a.referrer_host = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { a.referrer_host = ''; }
    return a;
  }
  var btn = document.getElementById('submitBtn'), status = document.getElementById('formStatus'), inFlight = false;
  function say(msg, cls) { status.className = 'status' + (cls ? ' ' + cls : ''); status.textContent = msg; }
  function busy(on) { inFlight = on; btn.disabled = on; btn.setAttribute('data-busy', on ? '1' : '0'); btn.querySelector('.lbl').textContent = on ? 'Sending…' : btnLabel; }
  var pf = document.getElementById('previewFlag');
  if (pf && SYNTHETIC) pf.hidden = false;
  else if (pf && !CONFIG.endpoint) { pf.textContent = 'Preview — online requests not connected yet'; pf.hidden = false; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (inFlight) return;
    form.setAttribute('data-tried', '1');
    var r = validate();
    if (!r.ok) { emit('invalid', { field: r.first }); say('Please fix the highlighted fields.', 'err'); var f = form.querySelector('[aria-invalid="true"]'); if (f) (f.tagName === 'FIELDSET' ? f.querySelector('input') : f).focus(); return; }
    var v = r.v;
    track('ee_lead_submit_attempt');
    if (!CONFIG.endpoint) {
      say('Online requests aren’t connected yet, so nothing was sent or saved. Please call ' + CONFIG.firm_phone.display + '.', 'warn');
      emit('not_connected');
      return;
    }
    var screening = KIND === 'check' && window.PLG_CHECK ? window.PLG_CHECK.answers() : {};
    ['accident_type', 'injured', 'accident_when', 'what_happened'].forEach(function (k) { if (v[k]) screening[k] = v[k]; });
    if (!screening.accident_when && screening.when) screening.accident_when = screening.when; // path C names it "when"
    screening.timeline_rule = 'under_1y';
    screening.timeline_check = timelineCheck(screening.accident_when);
    var fp = [PAGE_ID, v.phone, v.full_name.toLowerCase()].join('|');
    var payload = {
      schema: 'plg.intake.web/v1',
      submission_id: submissionId(fp),
      tenant_id: CONFIG.tenant_id, buyer_id: CONFIG.buyer_id, domain_id: CONFIG.domain_id,
      campaign_id: CONFIG.campaign_id, page_id: PAGE_ID, entry_path: document.body.getAttribute('data-path'),
      vertical: 'mva_pi', geo: 'AZ',
      request_type: KIND === 'callback' ? 'callback_request' : KIND === 'check' ? 'claim_check' : 'web_inquiry',
      contact: { full_name: v.full_name, phone_e164: v.phone, email: v.email || null },
      screening: screening,
      consent: { version: CONFIG.consent_version, mode: CONSENT_MODE, method: 'submit_button_disclosure', captured_at: new Date().toISOString(), page_url: location.origin + location.pathname, text: CONSENT_TEXT, trustedform_cert_url: (form.xxTrustedFormCertUrl && form.xxTrustedFormCertUrl.value) || null },
      attribution: attribution(),
      signals: v.hp ? { honeypot_filled: true } : undefined,
      test: SYNTHETIC ? { synthetic: true, suppress: ['outbound_calls', 'sms', 'email', 'buyer_delivery', 'ad_events'] } : undefined
    };
    busy(true); say(''); emit('sending');
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, CONFIG.timeout_ms);
    fetch(CONFIG.endpoint, {
      method: 'POST', body: new URLSearchParams({ payload: JSON.stringify(payload), submission_id: payload.submission_id }),
      signal: ctl ? ctl.signal : undefined, credentials: 'omit'
    }).then(function (res) { return res.json().catch(function () { return null; }).then(function (b) { return { res: res, b: b || {} }; }); })
      .then(function (x) {
        clearTimeout(timer);
        var receipt = x.b.receipt_id || x.b.lead_id;
        if (x.res.ok && receipt && /^(received|accepted|duplicate)$/.test(x.b.status || '')) { track('ee_lead_submit_success', true); showReceipt(receipt); emit('received', { ref: refChip(receipt) }); }
        else throw new Error('no_receipt');
      }).catch(function () {
        clearTimeout(timer); track('ee_lead_submit_error'); busy(false);
        say('We couldn’t confirm your request was received. Please try again (it won’t create a duplicate) — or call ' + CONFIG.firm_phone.display + '.', 'err');
        emit('error');
        btn.focus();
      });
  });

  function refChip(receipt) { return 'PLG·' + String(receipt).replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase(); }
  window.PLG.normPhone = function (v) { return normPhone(v); };
  function showReceipt(receipt) {
    var body = document.getElementById('formBody');
    var ai = CONSENT_MODE === 'ai';
    body.innerHTML = '';
    var w = document.createElement('div'); w.className = 'receipt'; w.setAttribute('tabindex', '-1');
    w.innerHTML = '<div class="tick" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>' +
      '<h2>Got it. Keep your phone close.</h2><p></p><dl><dt>Reference</dt><dd><span class="ref-chip"></span></dd></dl>' +
      '<a class="btn-call" href="tel:' + CONFIG.firm_phone.e164 + '" data-placement="receipt"><span>Rather talk now? Call ' + CONFIG.firm_phone.display + '</span></a>';
    w.querySelector('p').textContent = ai
      ? 'A person from Phillips Law Group’s Arizona intake team will call you back. Requests received overnight are returned starting at 8 AM Arizona time.'
      : 'A person from Phillips Law Group’s Arizona intake team will call you back. Requests received overnight are returned starting at 8 AM Arizona time.';
    w.querySelector('.ref-chip').textContent = refChip(receipt);
    w.querySelector('.btn-call').addEventListener('click', function () { track('ee_call_click', false, { call_target: 'firm', placement: 'receipt' }); });
    body.appendChild(w); w.focus();
    try { sessionStorage.removeItem(SK); } catch (e) {}
  }
})();
