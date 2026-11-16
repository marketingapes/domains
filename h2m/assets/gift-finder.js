/* Shared gift finder (FPLB, PX, H2M). One file, three skins.
   Reads only /data/gifts.json from the same site. Rule-based, no AI, no server, no cost per use.
   Edit tools/gift-finder/gift-finder.js, then run tools/gift-finder/build.py to copy it to each site. */
(function (root) {
  'use strict';

  function band(budget, bands) {
    for (var i = 0; i < bands.length; i++) if (bands[i].v === budget) return bands[i];
    return null;
  }

  // Pure ranking: catalog + answers -> ordered picks with reasons.
  function pick(cat, answers, limit) {
    answers = answers || {};
    limit = limit || 6;
    var qs = cat.questions || [];
    var b = band(answers.budget, cat.budgets || []);
    var out = [];
    (cat.products || []).forEach(function (p) {
      if (p.available === false) return;
      var score = 0, why = [], ok = true;
      qs.forEach(function (q) {
        var a = answers[q.id];
        if (!a || a === 'any') return;
        var tags = (p.tags && p.tags[q.id]) || [];
        var hit = tags.indexOf(a) > -1 || tags.indexOf('any') > -1;
        if (!hit && q.required) { ok = false; return; }
        if (hit) {
          score += tags.indexOf(a) > -1 ? (q.weight || 10) : Math.round((q.weight || 10) / 3);
          var opt = (q.options || []).filter(function (o) { return o.v === a; })[0];
          if (opt && tags.indexOf(a) > -1) why.push(opt.label);
        }
      });
      if (!ok) return;
      if (b) {
        if (p.price_from != null && p.price_from > b.max) return;
        if (p.price_from != null && p.price_from >= b.min) { score += 8; why.push(b.label); }
        else if (p.price_from == null) score += 2;
      }
      if (p.code) score += 2;
      out.push({ p: p, score: score + (p.boost || 0), why: why });
    });
    out.sort(function (x, y) { return y.score - x.score || ((x.p.price_from == null ? 1e9 : x.p.price_from) - (y.p.price_from == null ? 1e9 : y.p.price_from)) || (x.p.id < y.p.id ? -1 : 1); });
    var seen = {}, res = [], rest = [];
    out.forEach(function (o) { if (seen[o.p.merchant] >= 2) rest.push(o); else { seen[o.p.merchant] = (seen[o.p.merchant] || 0) + 1; res.push(o); } });
    return res.concat(rest).slice(0, limit);
  }

  var API = { pick: pick };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  root.GiftFinder = API;

  var doc = root.document;
  var el = doc.getElementById('gift-finder');
  if (!el || !root.fetch) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v) { return '$' + (v % 1 ? v.toFixed(2) : v); }
  var CAT = null, state = {};
  try { state = JSON.parse(root.sessionStorage.getItem('gf-' + el.getAttribute('data-site')) || '{}'); } catch (e) { state = {}; }

  function q(qq) {
    var opts = qq.options.map(function (o) {
      return '<button type="button" class="gf-opt" data-q="' + esc(qq.id) + '" data-v="' + esc(o.v) + '" aria-pressed="' + (state[qq.id] === o.v) + '">' + (o.icon ? '<span class="gf-ic" aria-hidden="true">' + esc(o.icon) + '</span>' : '') + esc(o.label) + '</button>';
    }).join('');
    return '<fieldset class="gf-q"><legend>' + esc(qq.label) + '</legend><div class="gf-opts">' + opts + '</div></fieldset>';
  }
  function card(o, i) {
    var p = o.p;
    var price = p.price_from != null ? (p.price_to && p.price_to !== p.price_from ? 'From ' + money(p.price_from) : money(p.price_from)) : (p.price_note || 'Store-wide offer');
    var img = p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.image_alt || p.name) + '" loading="lazy" width="320" height="320">' : '<div class="gf-mono" aria-hidden="true">' + esc(p.merchant.charAt(0)) + '</div>';
    return '<article class="gf-card' + (i === 0 ? ' is-top' : '') + '">' + '<div class="gf-media">' + img + (i === 0 ? '<span class="gf-badge">Best match</span>' : '') + '</div>' +
      '<div class="gf-body"><p class="gf-merchant">' + esc(p.merchant) + '</p><h3>' + esc(p.name) + '</h3><p class="gf-blurb">' + esc(p.blurb) + '</p>' +
      (o.why.length ? '<p class="gf-why">Good for: ' + esc(o.why.join(', ')) + '</p>' : '') +
      '<div class="gf-foot"><span class="gf-price">' + esc(price) + '</span>' + (p.code ? '<span class="gf-code">Code <code>' + esc(p.code) + '</code></span>' : '') + '</div>' +
      '<a class="gf-btn" href="' + esc(p.url) + '" rel="sponsored nofollow noopener" target="_blank" data-gift="' + esc(p.id) + '">Shop at ' + esc(p.merchant) + ' <span aria-hidden="true">&#8599;</span></a></div></article>';
  }
  function render() {
    if (!CAT) return;
    try { root.sessionStorage.setItem('gf-' + el.getAttribute('data-site'), JSON.stringify(state)); } catch (e) {}
    var picks = pick(CAT, state, 6);
    var budgetQ = { id: 'budget', label: CAT.budget_label || 'Budget', options: (CAT.budgets || []).map(function (b) { return { v: b.v, label: b.label }; }) };
    var form = (CAT.questions || []).map(q).join('') + q(budgetQ);
    var res = picks.length ? picks.map(card).join('') : '<p class="gf-empty">Nothing in our checked list fits every answer. Try a different budget or tap an answer again to clear it.</p>';
    var t = new Date(CAT.checked_at);
    el.innerHTML = '<div class="gf-grid"><form class="gf-form" onsubmit="return false"><p class="gf-step">Tap your answers. Tap again to clear.</p>' + form + '<button type="button" class="gf-reset">Start over</button></form>' +
      '<section class="gf-results" aria-live="polite"><h2 class="gf-h">' + esc(CAT.results_title || 'Gift ideas') + ' <small>' + picks.length + ' of ' + CAT.products.length + '</small></h2><div class="gf-cards">' + res + '</div>' +
      '<p class="gf-note">Prices and stock were checked on the store sites ' + esc(t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + '. Stores can change prices, so confirm at checkout.</p></section></div>';
  }
  el.addEventListener('click', function (e) {
    var b = e.target.closest('.gf-opt');
    if (b) { var k = b.getAttribute('data-q'), v = b.getAttribute('data-v'); state[k] = state[k] === v ? undefined : v; render(); return; }
    if (e.target.closest('.gf-reset')) { state = {}; render(); return; }
    var a = e.target.closest('a[data-gift]');
    if (a) (root.dataLayer = root.dataLayer || []).push({ event: 'affiliate_click', tool: 'gift-finder', offer: a.getAttribute('data-gift'), href: a.href });
  });
  fetch('/data/gifts.json', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (c) { CAT = c; render(); })
    .catch(function () { el.innerHTML = '<p class="gf-empty">The gift list did not load. Refresh the page to try again.</p>'; });
})(typeof window !== 'undefined' ? window : this);
