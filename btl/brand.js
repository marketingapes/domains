/* Evolution Engine — brand.js (STAGED)
 * One-prompt rebrand client. Every page fetches its domain's brand.json on
 * load and applies it: CSS custom properties, the logo mark, title/meta.
 * If the fetch fails, the baked-in FALLBACK (last approved brand) applies —
 * the page never renders unbranded.
 *
 * Wire-up per page:
 *   <html data-brand-url="./brand.json">
 *   <script src="./brand.js" defer></script>
 *   ...logo svg carries class "brand-logo"...
 */
(function () {
  'use strict';

  /* Baked-in fallback = BTL rev 3 (2026-09-27). Updated whenever Kyle
     approves a new brand; brand.update keeps this in sync. */
  var FALLBACK = {
    brand_id: 'btl',
    version: '2026-09-28-premium-v1',
    name: 'Best Tort Lawyers',
    tokens: {
      'brand': '#111827', 'brand-deep': '#0B1220', 'accent-soft': '#EEE7DA',
      'ink': '#111827', 'muted': '#626B78', 'bg': '#F6F1E7',
      'soft': '#ECE7DE', 'line': '#D9D2C5', 'cta': '#2457E6',
      'cta-call': '#17643A'
    },
    logo: {
      name: 'btl-monogram',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="22" fill="#111827"/><path d="M25 31h22c12 0 20 6 20 16 0 6-3 11-9 14 8 2 13 8 13 16 0 12-9 20-24 20H25V31zm20 25c7 0 11-3 11-8s-4-8-11-8H37v16h8zm2 31c8 0 12-4 12-10s-4-10-12-10H37v20h10z" fill="#F6F1E7"/><path d="M70 31h8v56h-8z" fill="#C6A15B"/></svg>'
    },
    seo: {
      title: 'Best Tort Lawyers — Start With Sofia',
      description: 'Tell Sofia what happened in your own words. Best Tort Lawyers helps identify whether you may potentially qualify for further claim review and the type of legal team that may fit.'
    },
    assistant: {
      name: 'Sofia',
      greeting: 'Hi, I\'m Sofia. Tell me what happened in your own words — you can keep it general.',
      voice_first_message: 'Hi, this is Sofia with Best Tort Lawyers. Tell me what happened in your own words and I\'ll help identify the right next step.',
      chat_theme: {
        'header-bg': '#1B59C3', 'header-text': '#ffffff',
        'bubble-bot-bg': '#E9EFFB', 'bubble-bot-text': '#1c1c1c',
        'bubble-user-bg': '#1B59C3', 'bubble-user-text': '#ffffff',
        'fab-bg': '#1B59C3'
      }
    }
  };

  var BRAND_URL = document.documentElement.getAttribute('data-brand-url') || '/brand.json';
  var uid = 0;

  function setVars(tokens) {
    var style = document.documentElement.style;
    Object.keys(tokens).forEach(function (k) {
      style.setProperty('--' + k, tokens[k]);
    });
  }

  /* Swap every svg.brand-logo with the brand's mark. Gradient ids are
     uniquified per instance so multiple lockups on one page don't clash. */
  function swapLogo(svg) {
    if (!svg) return;
    var nodes = document.querySelectorAll('svg.brand-logo');
    nodes.forEach(function (el) {
      uid += 1;
      var inst = svg.replace(/btlg/g, 'btlg' + uid);
      var tmp = document.createElement('div');
      tmp.innerHTML = inst;
      var node = tmp.firstElementChild;
      if (!node) return;
      node.setAttribute('class', (el.getAttribute('class') || '') + ' brand-applied');
      if (el.getAttribute('width')) node.setAttribute('width', el.getAttribute('width'));
      if (el.getAttribute('height')) node.setAttribute('height', el.getAttribute('height'));
      node.setAttribute('aria-hidden', 'true');
      el.replaceWith(node);
    });
    var fav = document.querySelector('link[rel="icon"]');
    if (fav) fav.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function setMeta(seo) {
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    var md = document.querySelector('meta[name="description"]');
    if (md && seo.description) md.setAttribute('content', seo.description);
  }

  /* AI touchpoints: theme the on-site Sofia chat widget from brand.json.
     Name, greeting, and chat colors flip with the brand. */
  function applyAssistant(a) {
    if (!a) return;
    var r = document.documentElement.style;
    var t = a.chat_theme || {};
    Object.keys(t).forEach(function (k) { r.setProperty('--chat-' + k, t[k]); });
    document.querySelectorAll('[data-chat-name]').forEach(function (el) {
      el.textContent = a.name || el.textContent;
    });
    document.querySelectorAll('[data-chat-greeting]').forEach(function (el) {
      el.textContent = a.greeting || el.textContent;
    });
    var fab = document.getElementById('sofiaFab');
    if (fab && a.name) fab.setAttribute('aria-label', 'Chat with ' + a.name);
  }

  function apply(brand) {
    try {
      if (brand.tokens) setVars(brand.tokens);
      if (brand.logo && brand.logo.svg) swapLogo(brand.logo.svg);
      if (brand.seo) setMeta(brand.seo);
      if (brand.assistant) applyAssistant(brand.assistant);
      document.documentElement.setAttribute('data-brand-applied', brand.version || 'fallback');
      window.__brandApplied = { version: brand.version || 'fallback', at: new Date().toISOString() };
    } catch (e) {
      /* Never break the page for branding. Baked-in CSS already rendered. */
      if (window.console) console.warn('brand.js apply failed, baked-in styles stand', e);
    }
  }

  function load() {
    fetch(BRAND_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('brand fetch HTTP ' + r.status);
        return r.json();
      })
      .then(apply)
      .catch(function () { apply(FALLBACK); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
