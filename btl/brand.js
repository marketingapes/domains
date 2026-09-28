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
    version: '2026-09-28-institutional-v2',
    name: 'Best Tort Lawyers',
    tokens: {
      'brand': '#111827', 'brand-deep': '#0B1220', 'accent-soft': '#EEE7DA',
      'ink': '#111827', 'muted': '#626B78', 'bg': '#F6F1E7',
      'soft': '#ECE7DE', 'line': '#D9D2C5', 'cta': '#2457E6',
      'cta-call': '#17643A'
    },
    logo: {
      name: 'btl-institutional-seal',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="btlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D7B56E"/><stop offset="1" stop-color="#A98137"/></linearGradient></defs><circle cx="80" cy="80" r="70" fill="#111827"/><circle cx="80" cy="80" r="58" fill="none" stroke="url(#btlg)" stroke-width="2.5"/><path d="M46 48h35c17 0 29 9 29 23 0 8-4 15-11 19 10 4 16 12 16 22 0 18-14 29-35 29H46V48zm31 35c10 0 16-4 16-12s-6-12-16-12H62v24h15zm3 46c12 0 19-5 19-15s-7-15-19-15H62v30h18z" fill="#F6F1E7"/><path d="M111 48h7v93h-7z" fill="url(#btlg)"/><circle cx="80" cy="22" r="3.5" fill="#D7B56E"/><circle cx="80" cy="138" r="3.5" fill="#D7B56E"/></svg>'
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
