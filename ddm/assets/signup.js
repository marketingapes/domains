// Discount Deal Me email sign-up. Sends one form-encoded POST (no CORS preflight)
// to a private Make webhook that appends a row to the DDM Subscribers sheet.
(function () {
  var forms = document.querySelectorAll('form[data-signup]');
  if (!forms.length) return;
  function track(ev, p) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, p || {})); }
  forms.forEach(function (form) {
    var msg = form.querySelector('.signup-msg');
    var btn = form.querySelector('button[type=submit]');
    var sent = false;
    function say(t, err) { msg.textContent = t; msg.classList.toggle('is-err', !!err); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sent) return;
      var email = form.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('Please enter a valid email address.', true); form.elements.email.focus(); return; }
      if (!form.elements.consent.checked) { say('Please tick the box to confirm you want our emails.', true); return; }
      if (form.elements.website.value) { say('Thanks!'); return; }
      var q = new URLSearchParams(location.search);
      var body = new URLSearchParams(new FormData(form));
      body.set('email', email);
      body.set('consent', 'yes');
      body.set('consent_text', form.querySelector('[data-consent-text]').textContent.trim());
      body.set('page_url', location.href);
      body.set('referrer', document.referrer || '');
      body.set('user_agent', navigator.userAgent || '');
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) body.set(k, q.get(k)); });
      sent = true; btn.disabled = true; say('Signing you up…');
      fetch(form.action, { method: 'POST', body: body, keepalive: true })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .then(function () {
          track('email_signup', { form: form.elements.form.value });
          form.querySelector('.signup-row').hidden = true;
          form.querySelector('.signup-consent').hidden = true;
          say('You\u2019re on the list. Watch your inbox for our next deal email.');
        })
        .catch(function () { sent = false; btn.disabled = false; say('That didn\u2019t go through. Please try again in a moment.', true); });
    });
  });
})();
