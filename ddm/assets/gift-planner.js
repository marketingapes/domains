(function(root){
  'use strict';
  var INTEREST_LABELS = {"cooking": "Cooking", "coffee": "Coffee and tea", "foodie": "Foodie", "sweets": "Sweets", "wine": "Wine (21+)", "plants": "Plants and flowers", "home": "Home", "tech": "Tech", "experiences": "Experiences", "kids": "Kids", "family": "Family and photos", "pets": "Pets", "cozy": "Cozy and socks", "crafts": "Crafts and sewing"};
  var HOUR = 36e5;

  function expired(d, now){ return d.ends && Date.parse(d.ends) <= now; }
  function minSpend(d){
    if ((d.conditions||[]).indexOf('min_spend') < 0) return 0;
    var m = (d.network_terms + ' ' + d.title).match(/\$\s?(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }
  function savings(d, budget){
    if (d.kind === 'pct' && d.pct) return {est: Math.round(budget * d.pct) / 100, label: (d.upto ? 'Up to ' : '') + d.pct + '% off', estimated: !d.upto};
    if (d.kind === 'usd' && d.usd) return {est: 0, label: (d.upto ? 'Up to $' : '$') + d.usd + ' off', estimated: false};
    if (d.kind === 'free_shipping') return {est: 0, label: 'Free shipping', estimated: false};
    return {est: 0, label: 'Gift bonus', estimated: false};
  }
  function trackedUrl(d){ return String(d.url).replace(/\?sid=ddm-finder$/, '?sid=ddm-planner'); }

  // Pure planner: feed + {budget, people:[{label, interests[], amount?}]} -> plan
  function plan(feed, input, now){
    now = now || Date.now();
    var budget = Math.max(0, +input.budget || 0);
    var people = (input.people || []).slice(0, 12);
    var fixed = 0, free = 0;
    people.forEach(function(p){ if (+p.amount > 0) fixed += +p.amount; else free++; });
    var each = free ? Math.max(0, (budget - fixed) / free) : 0;
    var live = (feed.deals || []).filter(function(d){ return !expired(d, now) && (d.gift_for || []).length; });
    var used = {};
    var out = people.map(function(p, i){
      var amt = +p.amount > 0 ? +p.amount : each;
      amt = Math.round(amt * 100) / 100;
      var wants = (p.interests || []).filter(function(x){ return INTEREST_LABELS[x]; });
      var scored = live.map(function(d){
        var hits = wants.filter(function(w){ return d.gift_for.indexOf(w) > -1; }).length;
        var ms = minSpend(d);
        if (ms && amt < ms) return null;
        if (wants.length && !hits) return null;
        var s = hits * 25 + d.score + (d.category === 'Gifts' ? 4 : 0) - (used[d.id] || 0) * 18;
        if (d.ends && Date.parse(d.ends) - now < 72 * HOUR) s += 3;
        return {d: d, s: s, hits: hits};
      }).filter(Boolean).sort(function(a, b){ return b.s - a.s || a.d.id.localeCompare(b.d.id); });
      var seenMerchant = {}, picks = [];
      for (var k = 0; k < scored.length && picks.length < 3; k++) {
        var c = scored[k];
        if (seenMerchant[c.d.merchant] && scored.length - k > 3 - picks.length) continue;
        seenMerchant[c.d.merchant] = 1;
        picks.push(c);
      }
      picks.forEach(function(c){ used[c.d.id] = (used[c.d.id] || 0) + 1; });
      var top = picks[0];
      return {
        label: (p.label || '').slice(0, 30) || ('Person ' + (i + 1)), budget: amt, interests: wants,
        picks: picks.map(function(c){
          var sv = savings(c.d, amt);
          return {id: c.d.id, merchant: c.d.merchant, title: c.d.title, url: trackedUrl(c.d), code: c.d.code || '',
                  ends: c.d.ends || '', score: c.d.score, image: c.d.image, image_alt: c.d.image_alt,
                  saving_label: sv.label, est_saving: sv.est, estimated: sv.estimated, matched: c.hits, min_spend: minSpend(c.d)};
        }),
        est_saving: top ? savings(top.d, amt).est : 0
      };
    });
    var est = out.reduce(function(a, r){ return a + r.est_saving; }, 0);
    return {budget: budget, allocated: Math.round((fixed + each * free) * 100) / 100, people: out,
            est_saving: Math.round(est * 100) / 100, checked_at: feed.checked_at, over_budget: fixed > budget};
  }

  var API = {plan: plan, minSpend: minSpend, INTERESTS: INTEREST_LABELS};
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  root.DDMGiftPlanner = API;

  // ---------- UI
  var doc = root.document, $ = function(s, r){ return (r || doc).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var form = $('#gp-form'); if (!form || !root.fetch) return;
  var list = $('#gp-people'), res = $('#gp-results'), budgetEl = $('#gp-budget'), FEED = null;
  var KEY = 'ddm-gift-plan-v1';
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function money(v){ return '$' + (Math.round(v * 100) / 100).toFixed(v % 1 ? 2 : 0); }
  function endText(iso){
    if (!iso) return 'No end date listed';
    var t = Date.parse(iso) - Date.now(); if (t < 48 * HOUR) return 'Ends in ' + Math.max(1, Math.round(t / HOUR)) + 'h';
    return 'Ends ' + new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  }
  function personRow(p){
    var wrap = doc.createElement('div'); wrap.className = 'gp-person';
    var chips = Object.keys(INTEREST_LABELS).map(function(k){
      return '<button type="button" class="gp-chip" data-int="' + k + '" aria-pressed="' + ((p.interests || []).indexOf(k) > -1) + '">' + esc(INTEREST_LABELS[k]) + '</button>';
    }).join('');
    wrap.innerHTML = '<div class="gp-person-top"><label class="sr-only">Who is this for</label><input class="gp-name" maxlength="30" placeholder="Who is it for? (e.g. Mom)" value="' + esc(p.label || '') + '">' +
      '<label class="sr-only">Their budget (optional)</label><input class="gp-amt" inputmode="decimal" placeholder="Auto $" value="' + (p.amount ? esc(p.amount) : '') + '">' +
      '<button type="button" class="gp-remove" aria-label="Remove this person">&times;</button></div><div class="gp-chips" role="group" aria-label="Interests">' + chips + '</div>';
    list.appendChild(wrap);
  }
  function read(){
    return {budget: parseFloat(String(budgetEl.value).replace(/[^0-9.]/g, '')) || 0,
      people: $$('.gp-person', list).map(function(w){
        return {label: $('.gp-name', w).value.trim(), amount: parseFloat(String($('.gp-amt', w).value).replace(/[^0-9.]/g, '')) || 0,
                interests: $$('.gp-chip[aria-pressed="true"]', w).map(function(b){ return b.getAttribute('data-int'); })};
      })};
  }
  function render(){
    if (!FEED) return;
    var input = read();
    try { root.localStorage.setItem(KEY, JSON.stringify(input)); } catch (e) {}
    if (!input.people.length) { res.innerHTML = '<p class="gp-empty">Add at least one person to build a plan.</p>'; return; }
    var p = plan(FEED, input);
    var html = '<div class="gp-sum"><div><small>Total budget</small><b>' + money(p.budget) + '</b></div><div><small>People</small><b>' + p.people.length + '</b></div><div><small>Estimated savings</small><b>' + money(p.est_saving) + '</b></div></div>';
    if (p.over_budget) html += '<p class="gp-empty">The amounts you set per person add up to more than your total budget. Lower one of them or raise the total.</p>';
    p.people.forEach(function(r){
      html += '<div class="gp-who"><h3>' + esc(r.label) + '</h3><span class="gp-note">' + money(r.budget) + ' budget</span></div>';
      if (!r.picks.length) { html += '<p class="gp-empty">No live deal matches these interests at this budget right now. Try another interest or a higher amount.</p>'; return; }
      r.picks.forEach(function(k, i){
        html += '<article class="gp-pick' + (i ? '' : ' is-top') + '"><img src="' + esc(k.image) + '" alt="' + esc(k.image_alt || '') + '" loading="lazy" width="72" height="72"><div>' +
          '<p><span class="gp-tag">' + (i ? 'Alternative' : 'Top pick') + '</span>' + esc(k.merchant) + ' &middot; Deal Score ' + k.score + '</p>' +
          '<h4>' + esc(k.title) + '</h4>' +
          '<p>' + esc(k.saving_label) + (k.estimated && k.est_saving ? ' (about ' + money(k.est_saving) + ' on ' + money(r.budget) + ')' : '') + ' &middot; ' + esc(endText(k.ends)) + (k.min_spend ? ' &middot; needs ' + money(k.min_spend) + '+ order' : '') + '</p>' +
          '<div class="gp-row">' + (k.code ? 'Code <code>' + esc(k.code) + '</code>' : '<span class="gp-note">No code needed</span>') +
          '<a class="btn btn-deal" rel="sponsored nofollow noopener" target="_blank" data-offer="' + esc(k.id) + '" href="' + esc(k.url) + '">Shop at ' + esc(k.merchant) + ' <span aria-hidden="true">&#8599;</span></a></div></div></article>';
      });
    });
    html += '<p class="gp-note">Savings are estimates from the advertised percentage applied to each person\'s budget. "Up to" and dollar-off deals are not counted in the total. Deals checked against the affiliate network ' + esc(new Date(p.checked_at).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})) + '. Confirm the final price at checkout.</p>';
    res.innerHTML = html;
  }
  list.addEventListener('click', function(e){
    var b = e.target.closest('.gp-chip'); if (b) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); render(); return; }
    var x = e.target.closest('.gp-remove'); if (x) { x.closest('.gp-person').remove(); render(); }
  });
  list.addEventListener('input', function(){ render(); });
  budgetEl.addEventListener('input', render);
  $$('.gp-quick button').forEach(function(b){ b.addEventListener('click', function(){ budgetEl.value = b.getAttribute('data-v'); render(); }); });
  $('#gp-add').addEventListener('click', function(){ if ($$('.gp-person', list).length < 12) { personRow({}); render(); } });
  $('#gp-reset').addEventListener('click', function(){ try { root.localStorage.removeItem(KEY); } catch (e) {} list.innerHTML = ''; budgetEl.value = 300; personRow({label: '', interests: ['cooking']}); personRow({label: '', interests: ['sweets']}); render(); });
  $('#gp-print').addEventListener('click', function(){ root.print(); });
  $('#gp-copy').addEventListener('click', function(){
    if (!FEED) return; var p = plan(FEED, read()), lines = ['My holiday gift plan (' + money(p.budget) + ')'];
    p.people.forEach(function(r){ lines.push('', r.label + ' (' + money(r.budget) + ')'); r.picks.forEach(function(k, i){ lines.push((i ? '  alt: ' : '  pick: ') + k.merchant + ', ' + k.title + (k.code ? ' [code ' + k.code + ']' : '') + ' ' + k.url); }); });
    var t = lines.join('\n'), btn = this; var done = function(){ btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = 'Copy plan'; }, 1600); };
    if (root.navigator.clipboard) root.navigator.clipboard.writeText(t).then(done, function(){}); else done();
  });
  form.addEventListener('submit', function(e){ e.preventDefault(); render(); res.scrollIntoView({behavior: 'smooth', block: 'start'}); });
  doc.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('.gp-pick a[rel~="sponsored"]');
    if (a) (root.dataLayer = root.dataLayer || []).push({event: 'affiliate_click', tool: 'gift-planner', offer: a.getAttribute('data-offer'), href: a.href});
  });
  var saved = null; try { saved = JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (saved && saved.people && saved.people.length) { budgetEl.value = saved.budget || 300; saved.people.forEach(personRow); }
  else { personRow({label: '', interests: ['cooking']}); personRow({label: '', interests: ['sweets']}); }
  fetch('/data/deals.json', {credentials: 'omit'}).then(function(r){ return r.json(); }).then(function(f){ FEED = f; render(); })
    .catch(function(){ res.innerHTML = '<p class="gp-empty">The deal list did not load. Refresh the page to try again.</p>'; });
})(typeof window !== 'undefined' ? window : this);
