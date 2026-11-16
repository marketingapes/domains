/* FPLB signup: confirm only durable subscriber AND consent storage. No send is triggered here.
   Optional per-form data attributes (defaults = the homepage Blue journey form):
   data-source, data-list, data-consent-version, data-page-url, data-consent-selector, data-success. */
(function () {
  document.querySelectorAll('form[data-fplb-signup]').forEach(function (form) {
    var busy = false, message = form.querySelector('[role="status"]'), button = form.querySelector('button');
    var d = form.dataset || {};
    var list = d.list || 'blue-journey';
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      busy = true; button.disabled = true; message.textContent = 'Saving your signup…';
      try {
        var query = new URLSearchParams(location.search);
        var payload = new URLSearchParams({email: form.elements.email.value.trim(), lead_id: crypto.randomUUID(),
          page_url: d.pageUrl || 'https://forpetslikeblue.com/', consent_text: form.querySelector(d.consentSelector || '#blue-consent').textContent.trim(),
          consent_version: d.consentVersion || 'fplb-blue-journey-v1', consent_timestamp: new Date().toISOString(), source: d.source || 'website-newsletter', list: list,
          is_test: 'false', session_id: '', utm_source: query.get('utm_source') || '',
          utm_medium: query.get('utm_medium') || '', utm_campaign: query.get('utm_campaign') || ''});
        // First-party click IDs and visitor id from /assets/ee-click.js (ee_id, gclid, fbclid, fbc, fbp, utm_*).
        if (window.eeClick) { var ee = window.eeClick.fields(); for (var k in ee) { if (!payload.get(k)) payload.set(k, ee[k]); } }
        var response = await fetch('https://hook.us2.make.com/rja3ef7xwvelfcphav5numibd4wr9dh0', {
          method: 'POST', body: payload,
          signal: AbortSignal.timeout(15000)
        });
        var receipt = await response.json();
        if (!response.ok || receipt.stored !== true || receipt.consent_stored !== true || !receipt.receipt_id) throw new Error('not stored');
        message.textContent = d.success || 'You’re on Blue’s list. Thanks for joining!';
        form.reset();
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({event: 'fplb_signup', list: list});
      } catch (_) {
        message.textContent = 'We couldn’t confirm your signup. Please try again later.';
      } finally { busy = false; button.disabled = false; }
    });
    // Enable only after the submit handler is attached; no-JS never sends an email in a URL.
    button.disabled = false;
  });
})();
