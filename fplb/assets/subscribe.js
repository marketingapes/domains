/* FPLB signup: confirm only durable subscriber AND consent storage. No send is triggered here. */
(function () {
  document.querySelectorAll('form[data-fplb-signup]').forEach(function (form) {
    var busy = false, message = form.querySelector('[role="status"]'), button = form.querySelector('button');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      busy = true; button.disabled = true; message.textContent = 'Saving your signup…';
      try {
        var query = new URLSearchParams(location.search);
        var payload = new URLSearchParams({email: form.elements.email.value.trim(), lead_id: crypto.randomUUID(),
          page_url: 'https://forpetslikeblue.com/', consent_text: form.querySelector('#blue-consent').textContent.trim(),
          consent_version: 'fplb-blue-journey-v1', consent_timestamp: new Date().toISOString(), source: 'website-newsletter',
          is_test: 'false', session_id: '', utm_source: query.get('utm_source') || '',
          utm_medium: query.get('utm_medium') || '', utm_campaign: query.get('utm_campaign') || ''});
        var response = await fetch('https://hook.us2.make.com/rja3ef7xwvelfcphav5numibd4wr9dh0', {
          method: 'POST', body: payload,
          signal: AbortSignal.timeout(15000)
        });
        var receipt = await response.json();
        if (!response.ok || receipt.stored !== true || receipt.consent_stored !== true || !receipt.receipt_id) throw new Error('not stored');
        message.textContent = 'You’re on Blue’s list. Thanks for joining!';
        form.reset();
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({event: 'fplb_signup', list: 'blue-journey'});
      } catch (_) {
        message.textContent = 'We couldn’t confirm your signup. Please try again later.';
      } finally { busy = false; button.disabled = false; }
    });
    // Enable only after the submit handler is attached; no-JS never sends an email in a URL.
    button.disabled = false;
  });
})();
