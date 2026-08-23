/**
 * Evolution Engine — Unified Tracking & Webhook Helper
 * Shared across: doihaveaclaim.ai, nearestinjurylawyers.com, lawfirmmarketingapes.com
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
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'fbclid', 'msclkid', 'ttclid'];
    const result = {};
    keys.forEach(function (k) {
      const v = params.get(k);
      if (v) {
        result[k] = v;
        try { sessionStorage.setItem('ee_' + k, v); } catch (e) { }
      } else {
        try { const s = sessionStorage.getItem('ee_' + k); if (s) result[k] = s; } catch (e) { }
      }
    });
    return result;
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
    PHONE_NUMBER: PHONE_NUMBER,
    PHONE_DISPLAY: PHONE_DISPLAY,
    PHONE_TEL: PHONE_TEL,
    WEBHOOK_URL: WEBHOOK_URL,
    FOOTER_LINK: FOOTER_LINK
  };

})();
