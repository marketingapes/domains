/* ee-click v1: first-party click-ID capture for Marketing Apes domains (CORE-capture-web).
   Source of truth: marketingapes/domains tools/ee-click/ee-click.js. Copies in <site>/assets/
   must stay byte-identical (tests/ee-click.test.mjs).
   - Stores gclid, gbraid, wbraid, fbclid, ttclid, msclkid and utm_* in a first-party cookie
     (ee_attr, 90 days) plus localStorage, and a first-party visitor id (ee_id, 1 year).
   - Builds Meta's _fbc from fbclid and a first-party _fbp when missing. No third-party pixel.
   - Stamps ee_id plus a source flag into affiliate sub-ID fields without dropping existing tags:
     CJ sid, Awin clickref2/clickref3, Impact subId2/subId3, Amazon ascsubtag,
     ShareASale afftrack, Rakuten u1.
   - Adds the same fields as hidden inputs to non-search forms at submit time, and exposes
     window.eeClick.fields() for scripts that build their own payload.
   Add data-ee-forms="off" on the script tag to skip form fields. */
(function () {
  'use strict';
  if (window.eeClick) return;
  var CLICK = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid'];
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var DAY = 864e5;
  var me = document.currentScript;
  var formsOff = me && me.getAttribute('data-ee-forms') === 'off';
  var host = location.hostname.replace(/^www\./, '');
  var parts = host.split('.');
  var rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : host;
  var site = (me && me.getAttribute('data-site')) || parts[0].slice(0, 12);

  function getCookie(n) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + n.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(n, v, days) {
    var d = /\./.test(rootDomain) && location.hostname !== 'localhost' ? '; domain=.' + rootDomain : '';
    document.cookie = n + '=' + encodeURIComponent(v) + '; max-age=' + Math.round(days * 86400) + '; path=/' + d + '; samesite=lax' + (location.protocol === 'https:' ? '; secure' : '');
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function clean(v, max) { return String(v || '').replace(/[^\w.\-~%+]/g, '').slice(0, max || 250); }
  function rid(n) {
    var s = '', a = '0123456789abcdefghijklmnopqrstuvwxyz', r;
    try { r = crypto.getRandomValues(new Uint8Array(n)); } catch (e) { r = null; }
    for (var i = 0; i < n; i++) s += a[(r ? r[i] : Math.floor(Math.random() * 256)) % 36];
    return s;
  }

  // Visitor id: cookie first, localStorage as backup, new one otherwise.
  var id = clean(getCookie('ee_id') || lsGet('ee_id'), 16);
  if (!/^[a-z0-9]{10,16}$/.test(id)) id = rid(10);
  setCookie('ee_id', id, 365); lsSet('ee_id', id);

  var attr = {};
  try { attr = JSON.parse(getCookie('ee_attr') || lsGet('ee_attr') || '{}') || {}; } catch (e) { attr = {}; }
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { q = { get: function () { return null; } }; }
  var now = Date.now();
  var fresh = {};
  CLICK.concat(UTM).forEach(function (k) { var v = q.get(k); if (v) fresh[k] = clean(v, k.indexOf('utm_') === 0 ? 100 : 250); });
  if (Object.keys(fresh).length) {
    // A new ad click or campaign replaces the last touch; keep the first touch separately.
    if (!attr.first_ts) { attr.first_ts = now; attr.first_source = fresh.utm_source || flagOf(fresh); }
    CLICK.concat(UTM).forEach(function (k) { delete attr[k]; });
    for (var k in fresh) attr[k] = fresh[k];
    attr.ts = now;
    attr.landing = (location.origin + location.pathname).slice(0, 200);
    attr.ref = clean(document.referrer, 200);
  } else if (!attr.ts) {
    attr.ts = now; attr.first_ts = now; attr.first_source = document.referrer ? 'referral' : 'direct';
    attr.landing = (location.origin + location.pathname).slice(0, 200);
    attr.ref = clean(document.referrer, 200);
  }
  if (attr.ts && now - attr.ts > 90 * DAY) { CLICK.concat(UTM).forEach(function (k) { delete attr[k]; }); }

  // Meta browser IDs, first-party (same format Meta's own pixel writes).
  var fbc = getCookie('_fbc');
  if (fresh.fbclid && (!fbc || fbc.split('.').slice(3).join('.') !== fresh.fbclid)) { fbc = 'fb.1.' + now + '.' + fresh.fbclid; setCookie('_fbc', fbc, 90); }
  var fbp = getCookie('_fbp');
  if (!fbp) { fbp = 'fb.1.' + now + '.' + String(Math.floor(Math.random() * 9e9) + 1e9); setCookie('_fbp', fbp, 90); }

  var json = JSON.stringify(attr);
  setCookie('ee_attr', json, 90); lsSet('ee_attr', json);

  function flagOf(a) {
    a = a || attr;
    if (a.gclid) return 'g'; if (a.gbraid) return 'gb'; if (a.wbraid) return 'wb';
    if (a.fbclid) return 'f'; if (a.ttclid) return 't'; if (a.msclkid) return 'm';
    if (a.utm_source) return 'u'; return 'o';
  }
  var token = id + '_' + flagOf();
  function slug() {
    var p = location.pathname.replace(/index\.html$/, '').replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return (site + '-' + (p || 'home')).slice(0, 40);
  }

  var CJ = /(^|\.)(anrdoezrs\.net|dpbolvw\.net|jdoqocy\.com|kqzyfj\.com|tkqlhce\.com|emjcd\.com|qksrv\.net|awltovhc\.com|ftjcfx\.com|lduhtrp\.net|tqlkg\.com|yceml\.net|afcyhf\.com|apmebf\.com)$/;
  var IMPACT_HOST = /(^|\.)(sjv\.io|pxf\.io|evyy\.net|7eer\.net|ojrq\.net|i\d+\.net)$/;
  var AMAZON = /(^|\.)amazon\.(com|ca|co\.uk|de|fr|it|es|com\.au|co\.jp|in)$/;
  function stampBase(v) { return String(v || '').replace(/_[a-z0-9]{10,16}_(g|gb|wb|f|t|m|u|o)$/, ''); }

  function tag(href) {
    var u;
    try { u = new URL(href, location.href); } catch (e) { return href; }
    var h = u.hostname.toLowerCase(), p = u.searchParams;
    if (CJ.test(h)) {
      var m = u.pathname.match(/\/sid\/([^/]*)\//);
      if (m) {
        u.pathname = u.pathname.replace(/\/sid\/[^/]*\//, '/sid/' + cjSid(decodeURIComponent(m[1])) + '/');
      } else if (/\/type\/dlg\//.test(u.pathname)) {
        u.pathname = u.pathname.replace('/type/dlg/', '/type/dlg/sid/' + cjSid('') + '/');
      } else {
        p.set('sid', cjSid(p.get('sid')));
      }
    } else if (/(^|\.)awin1\.com$/.test(h)) {
      if (!p.get('clickref')) p.set('clickref', slug());
      p.set('clickref2', id); p.set('clickref3', flagOf());
    } else if (IMPACT_HOST.test(h) || /^\/c\/\d+\/\d+\/\d+/.test(u.pathname) && !/(^|\.)(google|facebook|amazon)\./.test(h)) {
      if (!/^\/c\/\d+\/\d+\/\d+/.test(u.pathname)) return href;
      if (!p.get('subId1')) p.set('subId1', slug());
      p.set('subId2', id); p.set('subId3', flagOf());
    } else if (AMAZON.test(h) && p.get('tag')) {
      p.set('ascsubtag', (stampBase(p.get('ascsubtag')) || slug()).slice(0, 40) + '_' + token);
    } else if (/(^|\.)shareasale\.com$/.test(h) && /r\.cfm/.test(u.pathname)) {
      p.set('afftrack', (stampBase(p.get('afftrack')) || slug()).slice(0, 40) + '_' + token);
    } else if (/(^|\.)linksynergy\.com$/.test(h)) {
      p.set('u1', (stampBase(p.get('u1')) || slug()).slice(0, 40) + '_' + token);
    } else {
      return href;
    }
    return u.toString();
  }
  function cjSid(v) {
    var base = stampBase(v) || slug();
    return base.slice(0, Math.max(8, 64 - token.length - 1)) + '_' + token;
  }

  function stamp(a) {
    if (!a || !a.href || a.getAttribute('data-ee') === 'skip') return;
    var cur = a.getAttribute('href');
    var orig = a.getAttribute('data-ee-orig');
    // A page script changed the address since the last stamp (one <a> reused for many searches):
    // the current address is the new original, not the stored one.
    if (orig && cur !== orig && cur !== tag(orig)) { a.removeAttribute('data-ee-orig'); orig = ''; }
    if (!orig) { orig = cur; if (!orig || /^(#|mailto:|tel:|javascript:)/i.test(orig)) return; }
    var next = tag(orig);
    if (next !== orig) {
      if (a.getAttribute('data-ee-orig') !== orig) a.setAttribute('data-ee-orig', orig);
      if (cur !== next) a.setAttribute('href', next);
    }
  }
  function stampAll(root) {
    var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('a[href]') : [];
    for (var i = 0; i < list.length; i++) stamp(list[i]);
  }
  function linkOf(t) { while (t && t.nodeType === 1) { if (t.tagName === 'A') return t; t = t.parentNode; } return null; }
  ['mousedown', 'touchstart', 'keydown', 'click', 'auxclick', 'contextmenu'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { stamp(linkOf(e.target)); }, { capture: true, passive: true });
  });

  function fields() {
    var o = { ee_id: id, ee_source: flagOf() };
    CLICK.concat(UTM).forEach(function (k) { if (attr[k]) o[k] = attr[k]; });
    if (fbc) o.fbc = fbc;
    if (fbp) o.fbp = fbp;
    if (attr.landing) o.ee_landing = attr.landing;
    if (attr.first_source) o.ee_first_source = attr.first_source;
    return o;
  }
  function isSearch(f) {
    return (f.getAttribute('method') || '').toLowerCase() === 'get' || f.getAttribute('role') === 'search' ||
      !!f.querySelector('input[type="search"]') || f.getAttribute('data-ee') === 'skip';
  }
  function fillForm(f) {
    if (formsOff || !f || f.tagName !== 'FORM' || isSearch(f)) return;
    var o = fields();
    for (var k in o) {
      if (f.elements[k] && !f.elements[k].hasAttribute('data-ee')) continue; // the form already has its own field
      var i = f.querySelector('input[data-ee="' + k + '"]');
      if (!i) { i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.setAttribute('data-ee', k); f.appendChild(i); }
      i.value = o[k];
    }
  }
  document.addEventListener('submit', function (e) { fillForm(e.target); }, true);

  window.eeClick = { id: id, attribution: function () { return JSON.parse(JSON.stringify(attr)); }, fields: fields, tag: tag, stampAll: stampAll, fillForm: fillForm, version: 1 };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'ee_click_ids', ee_id: id, ee_source: flagOf(), ee_has_gclid: !!attr.gclid, ee_has_fbclid: !!attr.fbclid });
  function watch() {
    stampAll();
    // Tools like the gift finder render links later; stamp them as they appear.
    if (window.MutationObserver && document.body) {
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
          var n = ms[i].addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'A') stamp(n); else stampAll(n);
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
