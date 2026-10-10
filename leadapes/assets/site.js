/* Lead Apes v1 draft. Request form posts to the same Make lead hook the Marketing Apes
   and LFMA forms use, with notify_email = kyleg@marketingapes.com. On failure it falls
   back to a pre-filled mailto. */
(function () {
  'use strict';
  var HOOK = 'https://hook.us2.make.com/dwzmtn5xbkdrt6pjvli9jgy3auppobbi';
  var TO = 'kyleg@marketingapes.com';
  var form = document.getElementById('request-form');
  var ok = document.getElementById('form-ok');
  var err = document.getElementById('form-err');
  var dock = document.getElementById('dock');
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'ee_page_context', tenant_id: 'LEADAPES', domain: 'leadapes.com', page_type: 'home' });

  document.querySelectorAll('[data-cta]').forEach(function (a) {
    a.addEventListener('click', function () {
      window.dataLayer.push({ event: 'ee_cta_click', tenant_id: 'LEADAPES', cta: a.getAttribute('data-cta') });
    });
  });

  function collect() {
    var d = {};
    new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); });
    return d;
  }
  function summary(d) {
    return [
      'Tort/case type: ' + (d.tort || ''),
      'States: ' + (d.states || ''),
      'Monthly volume: ' + (d.monthly_volume || ''),
      'Buyer type: ' + (d.buyer_type || ''),
      'Name: ' + (d.name || ''),
      'Company: ' + (d.company || ''),
      'Email: ' + (d.email || ''),
      'Phone: ' + (d.phone || ''),
      'Notes: ' + (d.notes || '')
    ].join('\n');
  }
  function mailto(d) {
    return 'mailto:' + TO + '?subject=' + encodeURIComponent('Lead Apes lead request: ' + (d.tort || '') + ' / ' + (d.states || '')) +
      '&body=' + encodeURIComponent(summary(d));
  }

  var fb = document.getElementById('mailto-fallback');
  if (fb) fb.addEventListener('click', function () { fb.href = mailto(collect()); });

  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var d = collect();
    if (d.company_website) return; // honeypot
    delete d.company_website;
    var btn = form.querySelector('button[type=submit]');
    var payload = Object.assign({}, d, {
      tenant_id: 'LEADAPES',
      product: 'lead-request',
      type: 'lead_buyer_request',
      buyer_name: d.company || d.name,
      contact_name: d.name,
      notify_email: TO,
      source_url: location.href,
      current_url: location.href,
      referrer: document.referrer || '',
      notes: 'LEAD APES LEAD REQUEST (buyer inquiry, not a claimant) | ' + summary(d).replace(/\n/g, ' | '),
      lead_summary: summary(d)
    });
    btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true;
    fetch(HOOK, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(payload) })
      .then(function () {
        window.dataLayer.push({ event: 'ee_form_submit', tenant_id: 'LEADAPES', domain: 'leadapes.com', form_id: 'lead-request', buyer_type: d.buyer_type });
        Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
        btn.textContent = 'Sent';
        ok.hidden = false;
        if (dock) dock.classList.add('away');
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Request leads';
        document.getElementById('form-err-mail').href = mailto(d);
        err.hidden = false;
      });
  });

  if (dock && 'IntersectionObserver' in window) {
    var target = document.getElementById('request');
    new IntersectionObserver(function (es) {
      es.forEach(function (x) { dock.classList.toggle('away', x.isIntersecting); });
    }, { threshold: 0.15 }).observe(target);
  }
})();
