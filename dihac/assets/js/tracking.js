/**
 * Evolution Engine — Unified Tracking & Webhook Helper
 * Shared across: doihaveaclaim.ai, nearestinjurylawyers.com, besttortlawyers.com, lawfirmmarketingapes.com
 * v2: click IDs persist 90 days (first + last touch), gbraid/wbraid + Meta _fbc/_fbp, lead_id + visitor_id,
 *     tort slug, and hidden click-ID fields injected into every form so the lead carries its source.
 *
 * Handles: UTM capture, session tracking, webhook dispatch, event firing, click-to-call tracking
 */
(function () {
  'use strict';

  const WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/2296909/unfhmjw/';
  const PHONE_NUMBER = '6197360356';
  const PHONE_DISPLAY = '(619) 736-0356';
  const PHONE_TEL = 'tel:+16197360356';
  const FOOTER_LINK = 'https://marketingapes.com';

  /* ───── UTM / Session Capture ───── */
  var SIG_KEY = 'ee_sig', SIG_DAYS = 90;
  var CLICK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id'];

  function getCookie(n) { var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; }
  function setCookie(n, v) { document.cookie = n + '=' + encodeURIComponent(v) + ';path=/;max-age=' + SIG_DAYS * 86400 + ';SameSite=Lax'; }
  function newId() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2); }

  function loadSig() {
    var sig = {};
    try { sig = JSON.parse(localStorage.getItem(SIG_KEY) || '{}'); } catch (e) { }
    if (sig.expires && Date.now() > sig.expires) sig = { visitor_id: sig.visitor_id };
    return sig;
  }

  function getUTMParams() {
    var params = new URLSearchParams(window.location.search);
    var sig = loadSig(), fresh = {};
    CLICK_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) fresh[k] = v;
      else { try { var s = sessionStorage.getItem('ee_' + k); if (s && !sig.last) fresh[k] = s; } catch (e) { } }
    });
    if (params.get('fbclid') && getCookie('_fbc').indexOf(params.get('fbclid')) === -1) {
      setCookie('_fbc', 'fb.1.' + Date.now() + '.' + params.get('fbclid'));
    }
    if (!sig.visitor_id) sig.visitor_id = newId();
    if (Object.keys(fresh).length) {
      var touch = Object.assign({ ts: new Date().toISOString(), landing: window.location.pathname }, fresh);
      if (!sig.first) sig.first = touch;
      sig.last = touch;
      sig.expires = Date.now() + SIG_DAYS * 86400000;
    }
    try { localStorage.setItem(SIG_KEY, JSON.stringify(sig)); } catch (e) { }
    var result = Object.assign({}, (sig.last || {}));
    delete result.ts; delete result.landing;
    CLICK_KEYS.forEach(function (k) { if (sig.first && sig.first[k]) result['first_' + k] = sig.first[k]; });
    result.visitor_id = sig.visitor_id;
    result.fbc = getCookie('_fbc');
    result.fbp = getCookie('_fbp');
    result.tort = getTort();
    return result;
  }

  function getTort() {
    var meta = document.querySelector('meta[name="ee-tort"]');
    if (meta) return meta.getAttribute('content');
    var m = window.location.pathname.match(/\/campaigns\/([^\/]+)/);
    return m ? m[1] : '';
  }

  /* Inject click IDs + lead_id as hidden fields so any form backend / CRM / intake bot gets the source. */
  function stampForms() {
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      var data = getUTMParams();
      data.lead_id = form._eeLeadId || (form._eeLeadId = newId());
      Object.keys(data).forEach(function (k) {
        if (!data[k]) return;
        var input = form.querySelector('input[name="' + k + '"]');
        if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = k; form.appendChild(input); }
        input.value = data[k];
      });
      pushEvent('lead_submit', { form_name: form.getAttribute('data-ee-form') || form.id || '', lead_id: data.lead_id, tort: data.tort });
    }, true);
  }

  function getSessionMeta() {
    return {
      page_url: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      language: navigator.language || ''
    };
  }

  function getBrand() {
    var host = window.location.hostname || '';
    if (host.indexOf('doihaveaclaim') !== -1) return 'doihaveaclaim.ai';
    if (host.indexOf('nearestinjurylawyers') !== -1) return 'nearestinjurylawyers.com';
    if (host.indexOf('besttortlawyers') !== -1) return 'besttortlawyers.com';
    if (host.indexOf('lawfirmmarketingapes') !== -1 || host.indexOf('marketingapes') !== -1) return 'lawfirmmarketingapes.com';
    // Fallback: check meta tag
    var meta = document.querySelector('meta[name="ee-brand"]');
    if (meta) return meta.getAttribute('content');
    return 'unknown';
  }

  function getPageType() {
    var meta = document.querySelector('meta[name="ee-page-type"]');
    if (meta) return meta.getAttribute('content');
    var path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'homepage';
    if (path.indexOf('thank') !== -1) return 'thank_you';
    if (path.indexOf('qualify') !== -1) return 'qualification';
    if (path.indexOf('contact') !== -1) return 'contact';
    if (path.indexOf('faq') !== -1) return 'faq';
    if (path.indexOf('about') !== -1) return 'about';
    if (path.indexOf('service') !== -1) return 'services';
    if (path.indexOf('privacy') !== -1) return 'privacy';
    if (path.indexOf('terms') !== -1) return 'terms';
    return 'page';
  }

  /* ───── Webhook Dispatch ───── */
  function sendToWebhook(eventType, formName, contactFields, extraData) {
    var payload = Object.assign({},
      {
        brand: getBrand(),
        site_domain: window.location.hostname,
        page_url: window.location.href,
        page_type: getPageType(),
        form_name: formName || '',
        event_type: eventType || 'unknown'
      },
      getUTMParams(),
      getSessionMeta(),
      contactFields || {},
      extraData || {}
    );

    // Fire via navigator.sendBeacon for reliability, fallback to fetch
    var json = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(WEBHOOK_URL, new Blob([json], { type: 'application/json' }));
    } else {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true
      }).catch(function () { });
    }

    return payload;
  }

  /* ───── GTM DataLayer Push ───── */
  function pushEvent(eventName, data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, data || {}));
  }

  /* ───── TikTok Pixel Helper ───── */
  function fireTikTok(eventName, data) {
    if (typeof ttq !== 'undefined' && typeof ttq.track === 'function') {
      try { ttq.track(eventName, data || {}); } catch (e) { }
    }
  }

  /* ───── Click-to-Call Tracking ───── */
  function trackCallClicks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="tel:"]');
      if (link) {
        pushEvent('click_to_call', { phone_number: link.href.replace('tel:', '') });
        fireTikTok('Contact', { content_type: 'click_to_call' });
        sendToWebhook('click_to_call', '', { phone_clicked: link.href.replace('tel:', '') }, { call_click_intent: true });
      }
    });
  }

  /* ───── CTA Click Tracking ───── */
  function trackCTAClicks() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ee-cta]');
      if (btn) {
        var ctaName = btn.getAttribute('data-ee-cta');
        pushEvent('cta_click', { cta_name: ctaName });
        fireTikTok('ClickButton', { content_name: ctaName });
        sendToWebhook('cta_click', '', {}, { cta_name: ctaName });
      }
    });
  }

  /* ───── Form Tracking ───── */
  function trackForms() {
    document.addEventListener('focusin', function (e) {
      var form = e.target.closest('form[data-ee-form]');
      if (form && !form._eeStarted) {
        form._eeStarted = true;
        var formName = form.getAttribute('data-ee-form');
        pushEvent('form_start', { form_name: formName });
      }
    });
  }

  /* ───── Thank-You Page Detection ───── */
  function trackThankYou() {
    if (getPageType() === 'thank_you') {
      pushEvent('thank_you_view', { brand: getBrand() });
      fireTikTok('SubmitForm', { content_name: 'thank_you', content_category: getBrand() });
      sendToWebhook('thank_you_view', '', {}, {});
    }
  }

  /* ───── Scroll Depth Tracking ───── */
  function trackScroll() {
    var milestones = [25, 50, 75, 90];
    var fired = {};
    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) return;
      var pct = Math.round((scrollTop / docHeight) * 100);
      milestones.forEach(function (m) {
        if (pct >= m && !fired[m]) {
          fired[m] = true;
          pushEvent('scroll_depth', { percent: m });
        }
      });
    }, { passive: true });
  }

  /* ───── Init on DOM Ready ───── */
  function init() {
    getUTMParams(); // Capture/restore UTMs
    trackCallClicks();
    trackCTAClicks();
    trackForms();
    stampForms();
    trackThankYou();
    trackScroll();
    pushEvent('page_view', { brand: getBrand(), page_type: getPageType() });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ───── Public API ───── */
  window.EE = {
    sendToWebhook: sendToWebhook,
    pushEvent: pushEvent,
    fireTikTok: fireTikTok,
    getUTMParams: getUTMParams,
    getSessionMeta: getSessionMeta,
    getBrand: getBrand,
    getTort: getTort,
    PHONE_NUMBER: PHONE_NUMBER,
    PHONE_DISPLAY: PHONE_DISPLAY,
    PHONE_TEL: PHONE_TEL,
    WEBHOOK_URL: WEBHOOK_URL,
    FOOTER_LINK: FOOTER_LINK
  };

})();
