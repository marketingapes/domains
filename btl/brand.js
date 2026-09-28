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
    version: '2026-09-27-rev3',
    name: 'Best Tort Lawyers',
    tokens: {
      'brand': '#1B59C3', 'brand-deep': '#0F3D91', 'accent-soft': '#E9EFFB',
      'ink': '#1c1c1c', 'muted': '#5c5c5c', 'bg': '#ffffff',
      'soft': '#f5f6f8', 'line': '#e2e5ea', 'cta': '#1B59C3',
      'cta-call': '#1d7a3d'
    },
    logo: {
      name: 'momentum-shield',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="btlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B8BF0"/><stop offset="1" stop-color="#1B59C3"/></linearGradient></defs><path d="M50 5 L85 18 V50 C85 74 68 88 50 95 C32 88 15 74 15 50 V18 Z" fill="url(#btlg)"/><polygon points="50,26 68,52 59,52 59,80 41,80 41,52 32,52" fill="#fff"/></svg>'
    },
    seo: {
      title: 'Best Tort Lawyers — Free, Confidential Case Review | Talk to Sofia',
      description: 'Best Tort Lawyers: talk to Sofia now for a free, confidential case review. Answer a few quick questions and find out if you may potentially qualify. Call (202) 932-9700.'
    },
    assistant: {
      name: 'Sofia',
      greeting: 'Hi, I\'m Sofia — I can help you find out if you may potentially qualify for a free case review. What\'s going on?',
      voice_first_message: 'Hi, this is Sofia with Best Tort Lawyers. I can help you find out if you may potentially qualify for a free case review. What happened?',
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
