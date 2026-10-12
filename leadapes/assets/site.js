/* Lead Apes v1.2 draft (lead gen OS, Softía at the center). Request form posts to the same Make lead hook the Marketing Apes
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


  // Rotating Softía demo exchanges (illustrative examples, not real calls).
  var DEMOS = [
    { label: 'Example: home services inquiry', lines: [
      ['ai', 'Thanks for calling. What can we help with today?'],
      ['caller', "My AC stopped working and it's hot in here."],
      ['ai', "Sorry to hear that. What's your ZIP code, and do you own the home?"]] },
    { label: 'Example: dental inquiry', lines: [
      ['ai', 'Hi, thanks for reaching out. Are you looking for a new dentist or a specific treatment?'],
      ['caller', "I'm missing a tooth and asking about implants."],
      ['ai', 'Got it. Have you had a consultation before, and which days work best for you?']] },
    { label: 'Example: insurance inquiry', lines: [
      ['ai', 'Thanks for calling. Are you shopping for new coverage or reviewing a current policy?'],
      ['caller', 'New life insurance. I just had a baby.'],
      ['ai', 'Congratulations. Which state are you in, and roughly what coverage are you thinking about?']] }
  ];
  var tr = document.getElementById('transcript'), lab = document.getElementById('demo-label');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(t) { var x = document.createElement('div'); x.textContent = t; return x.innerHTML; }
  function render(i) {
    var d = DEMOS[i];
    lab.textContent = d.label;
    tr.innerHTML = d.lines.map(function (l) {
      return '<li class="' + l[0] + '"><b>' + (l[0] === 'ai' ? 'Softía' : 'Caller') + '</b>' + esc(l[1]) + '</li>';
    }).join('');
  }
  if (tr && lab && !reduce) {
    var di = 0;
    setInterval(function () {
      tr.classList.add('fade');
      setTimeout(function () { di = (di + 1) % DEMOS.length; render(di); tr.classList.remove('fade'); }, 350);
    }, 6000);
  }

  function collect() {
    var d = {};
    new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); });
    return d;
  }
  function summary(d) {
    return [
      'Industry / what they sell: ' + (d.industry || ''),
      'Market: ' + (d.market || ''),
      'Monthly volume: ' + (d.monthly_volume || ''),
      'Wants: ' + (d.want || ''),
      'Buyer type: ' + (d.buyer_type || ''),
      'Name: ' + (d.name || ''),
      'Company: ' + (d.company || ''),
      'Email: ' + (d.email || ''),
      'Phone: ' + (d.phone || ''),
      'Notes: ' + (d.notes || '')
    ].join('\n');
  }
  function mailto(d) {
    return 'mailto:' + TO + '?subject=' + encodeURIComponent('Lead Apes demo request: ' + (d.industry || '') + ' / ' + (d.market || '')) +
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
      product: 'lead-gen-os',
      type: 'os_demo_request',
      buyer_name: d.company || d.name,
      contact_name: d.name,
      notify_email: TO,
      source_url: location.href,
      current_url: location.href,
      referrer: document.referrer || '',
      notes: 'LEAD APES OS DEMO REQUEST (business inquiry, not a consumer lead) | ' + summary(d).replace(/\n/g, ' | '),
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
        btn.disabled = false; btn.textContent = 'Get the OS: request a demo';
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
