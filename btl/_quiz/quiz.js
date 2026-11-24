/* BTL quiz-only template (v1): quiz -> contact -> submit -> thank-you. One page, form only (no calls, no Sofia).
   Config: window.BTL_CAMPAIGN (set inline on each campaign page). See btl/site/_quiz/README.md.
   Wire contract: btl.intake.web/v1, form-encoded payload=<json>&submission_id=<uuid>, to the Campaign Kit intake
   (Make 6777650), which stores to BigQuery BEFORE it answers {status, receipt_id}.
   request_type is 'quiz_submission' / 'quiz_not_qualified' on purpose: the intake's Sofia-callback branch only matches
   callback_request / screened_inquiry, so this page never triggers a call.
   dataLayer gets ONLY non-identifying events (quiz_start, quiz_step, quiz_qualified, quiz_not_qualified, lead_submit_*),
   with campaign_id, tenant_id, page_id and step. Never names, phone, email, state or answers.
   The lead conversion fires on the thank-you page (generate_lead + lead_id), once, for a real first-time lead. */
(function () {
  'use strict';
  var C = window.BTL_CAMPAIGN; if (!C) return;
  var $ = function (id) { return document.getElementById(id); };
  var isTest = /(?:^|[?&])test=1(?:&|$)/.test(location.search) || location.hostname !== 'besttortlawyers.com';
  window.dataLayer = window.dataLayer || [];
  function push(evt, extra) {
    var o = { event: evt, page_id: C.page_id, campaign_id: C.campaign_id, tenant_id: C.tenant_id };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---- attribution: UTMs, click ids, platform ad ids (90 days), first-party cookies. IDs only. ---- */
  var AK = 'btl_attr_v1', CLICK = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','fbclid','gclid','gbraid','wbraid','ttclid'],
      ADIDS = ['campaign_id','adset_id','adgroup_id','ad_id'];
  function okId(v) { return typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(v) && !/^__|__$|^\{/.test(v); }
  (function remember() {
    var q = new URLSearchParams(location.search), o = {};
    CLICK.forEach(function (k) { var v = q.get(k); if (v) o[k] = v.slice(0, 250); });
    ADIDS.forEach(function (k) { var v = q.get(k); if (okId(v)) o[k === 'ad_id' ? 'ad_id' : 'ad_' + k] = v; });
    if (Object.keys(o).length) try { localStorage.setItem(AK, JSON.stringify({ o: o, at: Date.now(), page: location.pathname, ref: document.referrer.slice(0, 250) })); } catch (e) {}
  })();
  function cookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); try { return m ? decodeURIComponent(m[1]).slice(0, 250) : ''; } catch (e) { return ''; } }
  function attribution() {
    var s = null, o = {};
    try { s = JSON.parse(localStorage.getItem(AK) || 'null'); } catch (e) {}
    if (s && s.o && Date.now() - s.at < 90 * 864e5) { for (var k in s.o) o[k] = s.o[k]; o.landing_page = s.page; o.landed_at = new Date(s.at).toISOString(); o.referrer = s.ref || ''; }
    else o.referrer = document.referrer.slice(0, 250);
    var fbp = cookie('_fbp'), fbc = cookie('_fbc'), ttp = cookie('_ttp'), gcl = cookie('_gcl_aw'), ga = cookie('_ga').split('.');
    if (!fbc && o.fbclid && s) fbc = 'fb.1.' + s.at + '.' + o.fbclid;
    if (fbp) o.fbp = fbp; if (fbc) o.fbc = fbc; if (ttp) o.ttp = ttp; if (gcl) o.gcl_aw = gcl;
    if (ga.length >= 4) o.ga_client_id = ga.slice(-2).join('.');
    o.source_site = location.hostname;
    return o;
  }

  /* ---- quiz ---- (two looks: 'card' = Glassman pages.css markup; 'chat' = BTL friendly.css thread/dock markup) */
  var Q = C.questions, idx = 0, A = {}, started = false, result = null;
  var chat = !!$('thread'), contact = $('contactWrap');
  var body = $('qBody'), count = $('qCount') || $('chatCount'), bar = $('qProg') || $('meterFill'), thread = $('thread'), dock = $('dock');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Every question must have an allowed answer; anything missing or not in the option list is INCOMPLETE (never QUALIFIED). */
  function allowed(q) { return q.type === 'state' ? C.states : q.opts.map(function (p) { return p[0]; }); }
  function outcome() {
    var dq = false, rv = false, bad = false;
    Q.forEach(function (q) { var v = A[q.key];
      if (typeof v !== 'string' || allowed(q).indexOf(v) < 0) { bad = true; return; }
      if ((q.dq || []).indexOf(v) >= 0) dq = true; if ((q.review || []).indexOf(v) >= 0) rv = true; });
    return bad ? 'INCOMPLETE' : dq ? 'NOT_A_FIT' : rv ? 'FIRM_REVIEW' : 'QUALIFIED';
  }
  function progress() {
    if (bar) bar.style.width = Math.round(idx / Q.length * 100) + '%';
    if (count) count.textContent = idx < Q.length ? (chat ? 'Question ' : '') + (idx + 1) + ' of ' + Q.length : 'Done';
  }
  function choose(v, label) {
    if (!started) { started = true; push('quiz_start'); }
    A[Q[idx].key] = v; push('quiz_step', { step: idx + 1 });
    if (chat) { dock.innerHTML = ''; bubble(label, 'u'); }
    idx++; render(true);
  }
  function optionsInto(box, q, cls) {
    if (q.type === 'state') {
      var sel = el('select', chat ? 'chip-select' : ''); sel.setAttribute('aria-label', 'Your state');
      sel.innerHTML = '<option value="">Choose your state</option>' + C.states.map(function (x) { return '<option' + (A.state === x ? ' selected' : '') + '>' + x + '</option>'; }).join('');
      sel.addEventListener('change', function () { if (sel.value) choose(sel.value, sel.value); });
      box.appendChild(sel);
    } else q.opts.forEach(function (p) { var b = el('button', cls, p[1]); b.type = 'button'; b.addEventListener('click', function () { choose(p[0], p[1]); }); box.appendChild(b); });
  }
  /* chat look */
  function bubble(text, who) { var d = el('div', 'b ' + (who || 's'), text); thread.appendChild(d); thread.scrollTop = thread.scrollHeight; return d; }
  function say(lines, then) {
    var t = el('div', 'b s typing'); t.setAttribute('aria-hidden', 'true'); t.innerHTML = '<i></i><i></i><i></i>'; thread.appendChild(t); thread.scrollTop = thread.scrollHeight;
    setTimeout(function () { t.remove(); lines.forEach(function (l) { bubble(l[0], l[1]); }); if (then) then(); }, reduced ? 0 : 550);
  }
  function render(focus) {
    if (idx >= Q.length) return finish();
    var q = Q[idx]; progress();
    if (chat) {
      say(q.why ? [[q.text, 's'], [q.why, 'why']] : [[q.text, 's']], function () {
        var chips = el('div', 'chips'); optionsInto(chips, q, 'chip'); dock.appendChild(chips);
        if (idx > 0) dock.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
      });
      return;
    }
    var w = el('div', 'q'), h = el('h2', 'qh', q.text), opts = el('div', 'opts');
    h.tabIndex = -1; w.appendChild(h);
    if (q.why) { var why = el('p', 'qs'); why.appendChild(el('b', '', 'Why we ask: ')); why.appendChild(document.createTextNode(q.why)); w.appendChild(why); }
    optionsInto(opts, q, ''); w.appendChild(opts);
    if (idx > 0) { var row = el('p', 'backrow'), bk = el('button', 'back', '← Back'); bk.type = 'button';
      bk.addEventListener('click', function () { contact.hidden = true; idx--; render(true); }); row.appendChild(bk); w.appendChild(row); }
    body.innerHTML = ''; body.appendChild(w);
    if (focus) h.focus({ preventScroll: true });
  }
  function setButton(label) { var b = $('submitBtn'); if (b && b.firstChild) b.firstChild.nodeValue = label + ' '; if ($('tfSubmitText')) $('tfSubmitText').textContent = label; }
  function finish() {
    result = outcome(); progress();
    if (result === 'INCOMPLETE') { idx = 0; A = {}; result = null; if (chat) { thread.innerHTML = ''; dock.innerHTML = ''; } render(true); return; }
    var nf = result === 'NOT_A_FIT';
    push(nf ? 'quiz_not_qualified' : 'quiz_qualified', { result: result });
    setButton(nf ? C.copy.nf_button : C.copy.ok_button);
    function showForm(anchor) {
      contact.hidden = false; var c = $('chat'); if (c) c.classList.add('has-contact');
      if (!anchor) {
        var f = $('first_name') || $('full_name'); if (f) f.focus({ preventScroll: true });
        contact.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      /* Card mode: bring the result into view once, below any sticky header, so it is never hidden under the nav. */
      var off = 12, hd = document.querySelector('header.nav, .nav, header');
      if (hd) { var cs = getComputedStyle(hd); if (cs.position === 'sticky' || cs.position === 'fixed') off += hd.getBoundingClientRect().height; }
      var top = anchor.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - off;
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
    }
    if (chat) { say([[nf ? C.copy.nf_title : C.copy.ok_title, nf ? 's' : 'note'], [nf ? C.copy.nf_text : C.copy.ok_text, 's']], showForm); return; }
    body.innerHTML = '';
    var r = el('div', nf ? 'result' : 'result good'); r.tabIndex = -1;
    r.appendChild(el('b', '', nf ? C.copy.nf_title : C.copy.ok_title)); r.appendChild(el('p', '', nf ? C.copy.nf_text : C.copy.ok_text));
    body.appendChild(r);
    var row = el('p', 'backrow'), bk = el('button', 'back', '← Change an answer'); bk.type = 'button';
    bk.addEventListener('click', function () { contact.hidden = true; idx = Q.length - 1; render(true); }); row.appendChild(bk); body.appendChild(row);
    showForm(r); r.focus({ preventScroll: true });
  }

  /* ---- submit ---- */
  function e164(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? '+1' + d : ''; }
  function val(id) { var e = $(id); return e ? e.value.trim() : ''; }
  function err(id, m) { var e = $(id + '-e'), i = $(id); if (e) e.textContent = m || ''; if (i) { if (m) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); } }
  function sid() { var k = 'btl_sid_' + C.campaign_id; try { var v = sessionStorage.getItem(k); if (v) return v; } catch (e) {}
    var u = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 3 | 8).toString(16); }));
    try { sessionStorage.setItem(k, u); } catch (e) {} return u; }
  var pending = false, done = false, form = $('leadForm');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault(); if (pending || done || !result || outcome() !== result || result === 'INCOMPLETE') return;
    var ok = true, st = $('formStatus'); st.className = 'status'; st.textContent = '';
    var full = !!$('full_name'), nm = full ? val('full_name').split(/\s+/) : [val('first_name'), val('last_name')];
    var first = nm[0] || '', last = full ? nm.slice(1).join(' ') : nm[1];
    (full ? ['full_name', 'email', 'phone'] : ['first_name', 'last_name', 'email', 'phone']).forEach(function (id) { if (!val(id)) { err(id, 'Required.'); ok = false; } else err(id, ''); });
    if (full && val('full_name') && !last) { err('full_name', 'Please enter your first and last name.'); ok = false; }
    if (val('email') && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(val('email'))) { err('email', 'Please enter a valid email.'); ok = false; }
    if (val('phone') && !e164(val('phone'))) { err('phone', 'Please enter a 10-digit US mobile number.'); ok = false; }
    if (!ok) { push('lead_submit_error', { reason: 'validation' }); var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    var nf = result === 'NOT_A_FIT', now = new Date().toISOString(), disc = $('disclosure').textContent.replace(/\s+/g, ' ').trim();
    var answers = {}; for (var k in A) answers[k] = A[k]; answers.web_outcome = result;
    var tf = form.querySelector('[name="xxTrustedFormCertUrl"]');
    var payload = {
      schema: 'btl.intake.web/v1', submission_id: sid(), tenant_id: C.tenant_id, domain_id: 'btl', campaign_id: C.campaign_id,
      page_id: C.page_id, door: 'quiz', request_type: nf ? 'quiz_not_qualified' : 'quiz_submission', submitted_at: now,
      contact: { full_name: first + ' ' + last, first_name: first, last_name: last, email: val('email'), phone_e164: e164(val('phone')), state: A.state || null },
      screening: { web_outcome: result, criteria_version: C.criteria_version, answers: answers },
      routing: { route: nf ? 'hold' : 'firm_review', transfer_window: 'n/a' },
      consent: { version: C.consent_version, captured_at: now, text: disc, method: 'clickwrap_submit',
        calls: { granted: true, text: disc, version: C.consent_version + '-calls', method: 'clickwrap_submit', captured_at: now },
        sms: { granted: true, text: disc, version: C.consent_version + '-sms', method: 'clickwrap_submit', captured_at: now } },
      trustedform_cert_url: tf && tf.value ? tf.value : null,
      page_url: location.origin + location.pathname, callback: { window: '', label: '' },
      attribution: attribution(), test: { synthetic: isTest }
    };
    pending = true; var btn = $('submitBtn'); btn.disabled = true; push('lead_submit_attempt');
    fetch(C.endpoint, { method: 'POST', body: new URLSearchParams({ payload: JSON.stringify(payload), submission_id: payload.submission_id }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j || !j.receipt_id) throw new Error('bad'); return j; }); })
      .then(function (j) {
        done = true; push('lead_submit_success', { result: result });
        /* kind: 'lead' (QUALIFIED) is the only kind that fires the conversion; 'review' (FIRM_REVIEW) is stored and
           routed for firm review without a conversion. A 'duplicate' answer still counts as real: if the first response
           was lost, the retry is the only chance to fire, and the thank-you page fires each receipt at most once per
           browser (event_id = lead_id lets the platforms dedupe across browsers). */
        try { sessionStorage.setItem('btl_ty', JSON.stringify({ campaign_id: C.campaign_id,
          kind: nf ? 'not_qualified' : result === 'FIRM_REVIEW' ? 'review' : 'lead',
          receipt: j.receipt_id, real: !isTest && j.mode !== 'test', at: Date.now() })); } catch (e) {}
        location.assign(C.thank_you + (isTest ? '?test=1' : ''));
      })
      .catch(function () {
        pending = false; btn.disabled = false; push('lead_submit_error', { reason: 'network' });
        st.className = 'status err'; st.textContent = 'Something went wrong sending your details. Please try again.';
      });
  });

  /* staging / preview: no Tag Manager, so load TrustedForm directly */
  if (location.hostname !== 'besttortlawyers.com') {
    var p = $('previewFlag'); if (p) p.hidden = false;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://api.trustedform.com/trustedform.js?field=xxTrustedFormCertUrl&use_tagged_consent=true&l=' + Date.now() + Math.random();
    document.head.appendChild(s);
  }
  render(false);
})();
