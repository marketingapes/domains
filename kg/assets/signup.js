/* Brand-tagged website opt-in. Posts one form-encoded request (no CORS preflight)
   to the existing Make webhook pattern (sheet only, no send). */
(function () {
  var forms = document.querySelectorAll('form[data-signup]');
  if (!forms.length) return;
  function track(ev, p) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, p || {})); }
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  forms.forEach(function (form) {
    var msg = form.querySelector('[role="status"], .signup-msg');
    var btn = form.querySelector('button[type=submit]');
    var sent = false;
    function say(t, err) {
      if (!msg) return;
      msg.textContent = t;
      msg.classList.toggle('is-err', !!err);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sent) return;
      var email = (form.elements.email.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('Please enter a valid email address.', true); form.elements.email.focus(); return; }
      if (!form.elements.consent || !form.elements.consent.checked) { say('Please tick the box to confirm you want these emails.', true); return; }
      if (form.elements.website && form.elements.website.value) { say('Thanks!'); return; }
      var q = new URLSearchParams(location.search);
      var body = new URLSearchParams(new FormData(form));
      body.set('email', email);
      body.set('consent', 'yes');
      var consentEl = form.querySelector('[data-consent-text]');
      body.set('consent_text', consentEl ? consentEl.textContent.trim() : '');
      body.set('page_url', location.origin + location.pathname);
      body.set('referrer', document.referrer || '');
      body.set('user_agent', navigator.userAgent || '');
      body.set('lead_id', uuid());
      body.set('session_id', '');
      body.set('is_test', q.get('signup_test') === '1' ? 'true' : 'false');
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) body.set(k, q.get(k)); });
      // First-party click IDs and visitor id from /assets/ee-click.js (ee_id, gclid, fbclid, fbc, fbp, utm_*).
      if (window.eeClick) { var ee = window.eeClick.fields(); for (var ek in ee) { if (!body.get(ek)) body.set(ek, ee[ek]); } }
      sent = true;
      if (btn) btn.disabled = true;
      say('Saving your signup…');
      fetch(form.action, { method: 'POST', body: body, keepalive: true, signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text().then(function (t) {
            try { return JSON.parse(t); } catch (e) { return { ok: true }; }
          });
        })
        .then(function (receipt) {
          if (receipt && receipt.stored === false) throw new Error('not stored');
          track('email_signup', { form: (form.elements.form && form.elements.form.value) || form.getAttribute('data-signup'), brand: (form.elements.brand && form.elements.brand.value) || '' });
          form.classList.add('is-done');
          var hide = form.querySelectorAll('.signup-row, .row, .signup-consent, .signup-fine, button[type=submit]');
          hide.forEach(function (el) { el.hidden = true; });
          say(form.getAttribute('data-success') || 'You are on the list. Watch your inbox.');
        })
        .catch(function () {
          sent = false;
          if (btn) btn.disabled = false;
          say('That did not go through. Please try again in a moment.', true);
        });
    });
    if (btn) btn.disabled = false;
  });
})();
