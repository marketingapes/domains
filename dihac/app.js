(function () {
  'use strict';

  const config = window.DIHAC_CONFIG || {};
  const integrations = config.integrations || {};
  const attributionKeys = [
    'lead_id', 'claim_id', 'campaign_id',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'fbclid', 'gclid', 'ttclid'
  ];
  const params = new URLSearchParams(window.location.search);

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return prefix + '_' + window.crypto.randomUUID();
    }
    const bytes = new Uint32Array(4);
    window.crypto.getRandomValues(bytes);
    return prefix + '_' + Array.from(bytes, function (part) { return part.toString(16); }).join('');
  }

  function getSessionId() {
    const key = 'dihac_session_id';
    try {
      let value = window.sessionStorage.getItem(key);
      if (!value) {
        value = makeId('session');
        window.sessionStorage.setItem(key, value);
      }
      return value;
    } catch (_error) {
      return makeId('session');
    }
  }

  function getStoredAttribution() {
    const key = 'dihac_attribution';
    const current = {};
    attributionKeys.forEach(function (name) {
      const value = params.get(name);
      if (value) current[name] = value.slice(0, 300);
    });

    try {
      const stored = JSON.parse(window.sessionStorage.getItem(key) || '{}');
      const merged = Object.assign({}, stored, current);
      window.sessionStorage.setItem(key, JSON.stringify(merged));
      return merged;
    } catch (_error) {
      return current;
    }
  }

  const context = Object.freeze(Object.assign({
    domain_id: config.domainId || 'doihaveaclaim.ai',
    session_id: getSessionId()
  }, getStoredAttribution()));

  function pushEvent(eventName, safeDetails) {
    if (!integrations.analyticsEnabled) return;
    window.dataLayer = window.dataLayer || [];
    const payload = Object.assign({}, context, {
      event: eventName,
      event_id: makeId('event'),
      event_timestamp: new Date().toISOString(),
      consent_state: integrations.consentState || 'unknown'
    }, safeDetails || {});
    window.dataLayer.push(payload);
  }

  window.DIHAC_CONTEXT = context;
  window.DIHAC_TRACKING = Object.freeze({
    chatStarted: function (surface) {
      pushEvent('ee_chat_started', { chat_surface: String(surface || 'website').slice(0, 60) });
    },
    chatMessage: function (messageNumber) {
      pushEvent('ee_chat_message', { message_number: Math.max(1, Number(messageNumber) || 1) });
    },
    formStarted: function (formId) {
      pushEvent('ee_form_start', { form_id: String(formId || 'unknown').slice(0, 80) });
    },
    formSubmitted: function (formId) {
      pushEvent('ee_form_submit', { form_id: String(formId || 'unknown').slice(0, 80) });
    }
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  pushEvent('ee_page_view', {
    page_type: 'sofia_homepage',
    page_path: window.location.pathname
  });

  const phoneLink = document.querySelector('[data-sofia-phone]');
  if (phoneLink) phoneLink.addEventListener('click', function () {
    pushEvent('ee_phone_click', {
      cta_id: 'sofia_call_primary',
      contact_channel: 'phone',
      page_type: 'sofia_homepage'
    });
  });

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('data-sofia-phone')) return;
    const href = link.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return;
    const destination = new URL(href, window.location.href);
    if (destination.origin === window.location.origin) return;
    pushEvent('ee_outbound_click', {
      link_domain: destination.hostname,
      link_id: link.id || link.dataset.trackingId || 'outbound_link'
    });
  });
})();
