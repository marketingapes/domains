/* GLASSMAN-SSDI-002 thank-you pages. intake.js sends every saved request here after its conversions fired on the form page,
   leaving {kind, time, receipt, real, at} in sessionStorage 'ee_ssdi_thanks' (no contact or screening data).
   This script shows the requested time, then deletes the record, so a reload or a shared link shows the general text.
   It pushes one non-identifying dataLayer event, ee_thank_you_view; fresh = true only on the first view right after a real,
   first-time request of either kind (never a reload, ?test=1 or a duplicate). Conversions are NOT re-sent here.
   It also fills the network tools slot from network.js when that page's entry is set (empty by default). */
(function () {
  'use strict';
  var main = document.querySelector('main[data-thank-you]');
  if (!main) return;
  var kind = main.getAttribute('data-thank-you');
  var test = /(?:^|[?&])test=1(?:&|$)/.test(location.search);
  var rec = null;
  try {
    rec = JSON.parse(sessionStorage.getItem('ee_ssdi_thanks') || 'null');
    sessionStorage.removeItem('ee_ssdi_thanks');
  } catch (e) { rec = null; }
  if (!rec || rec.kind !== kind || !(Date.now() - rec.at < 10 * 60 * 1000)) rec = null;

  var time = document.getElementById('tyTime');
  if (rec && time && typeof rec.time === 'string' && rec.time.length < 80) {
    time.textContent = 'Your requested time: ' + rec.time + '.';
    time.hidden = false;
  }
  var flag = document.getElementById('previewFlag'); if (flag && test) flag.hidden = false;

  var o = { event: 'ee_thank_you_view', page_id: 'glassman-ssdi-thank-you' + (kind === 'other_options' ? '-other-options' : ''),
    campaign_id: 'GLASSMAN-SSDI-002', tenant_id: 'glassman', thank_you: kind, fresh: !!(rec && rec.real === true && !test) };
  if (o.fresh && typeof rec.receipt === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(rec.receipt)) o.lead_id = rec.receipt;
  (window.dataLayer = window.dataLayer || []).push(o);

  var slot = document.getElementById('networkTools');
  var html = window.GLASSMAN_SSDI_NETWORK && window.GLASSMAN_SSDI_NETWORK[kind];
  if (slot && typeof html === 'string' && html.trim()) { slot.innerHTML = html; slot.hidden = false; }
})();
