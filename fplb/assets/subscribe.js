/* FPLB signup: confirm only durable subscriber AND consent storage. No send is triggered here. */
(function () {
  document.querySelectorAll('form[data-fplb-signup]').forEach(function (form) {
    var busy = false, message = form.querySelector('[role="status"]'), button = form.querySelector('button');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      busy = true; button.disabled = true; message.textContent = 'Saving your signup…';
      try {
        var response = await fetch('https://affiliate-hub-tbks.onrender.com/subscribe', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: form.elements.email.value.trim(), source: location.origin + location.pathname, list: 'blue-journey'}),
          signal: AbortSignal.timeout(15000)
        });
        var receipt = await response.json();
        if (!response.ok || receipt.stored !== true || receipt.consent_stored !== true) throw new Error('not stored');
        message.textContent = 'You’re on Blue’s list. Thanks for joining!';
        form.reset();
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({event: 'fplb_signup', list: 'blue-journey'});
      } catch (_) {
        message.textContent = 'We couldn’t confirm your signup. Please try again later.';
      } finally { busy = false; button.disabled = false; }
    });
  });
})();
