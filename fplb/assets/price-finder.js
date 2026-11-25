/* For Pets Like Blue: Amazon price finder.
   Builds one Amazon search link from what the visitor typed, their pet and their budget,
   sorted by price, low to high. The Associates tag and the Amazon address come from the
   form (data-tag, data-amz), never from this file. No network calls. Nothing is recorded
   while typing: a search is noted only when the visitor asks for a link. */
(function () {
  var SORT = 'price-asc-rank';

  function clean(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }
  function cents(x) {
    var n = parseFloat(x);
    return n > 0 ? Math.round(n * 100) : '';
  }
  // "treats" + "dogs" -> "treats for dogs". A pet already named in the words is not repeated.
  function words(o) {
    var q = clean(o && o.q);
    var use = clean(o && o.use);
    if (!q) return '';
    if (!use) return q;
    var stem = use.replace(/s$/, '').toLowerCase();
    if (stem.length > 2 && new RegExp('\\b' + stem + 's?\\b', 'i').test(q)) return q;
    return q + ' for ' + use;
  }
  function link(o, tag, base) {
    var k = words(o);
    tag = clean(tag);
    if (!k || !tag || !base) return '';
    var p = new URLSearchParams();
    p.set('k', k);
    var lo = cents(o.min);
    var hi = cents(o.max);
    if (lo && hi && lo > hi) {
      var t = lo;
      lo = hi;
      hi = t;
    }
    if (lo || hi) p.set('rh', 'p_36:' + lo + '-' + hi);
    p.set('s', SORT);
    p.set('tag', tag);
    return base + '?' + p.toString();
  }
  function describe(o) {
    var lo = parseFloat(o.min);
    var hi = parseFloat(o.max);
    var bits = [];
    if (lo > 0 && hi > 0) bits.push('between $' + Math.min(lo, hi) + ' and $' + Math.max(lo, hi));
    else if (hi > 0) bits.push('up to $' + hi);
    else if (lo > 0) bits.push('from $' + lo);
    bits.push('sorted by price, low to high');
    return bits.join(', ');
  }
  // Email addresses and long digit runs never reach analytics.
  function scrub(s) {
    return String(s || '')
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
      .replace(/\d[\d\s().-]{5,}\d/g, '[number]')
      .slice(0, 100);
  }

  window.FPLB_PF = { words: words, link: link, describe: describe, scrub: scrub, sort: SORT };

  var f = document.getElementById('amz-form');
  if (!f) return;
  var TAG = clean(f.getAttribute('data-tag'));
  var BASE = f.getAttribute('data-amz');
  var box = document.getElementById('matches');
  var qEl = document.getElementById('m-query');
  var a = document.getElementById('m-amz');
  var err = document.getElementById('m-error');
  var chips = document.getElementById('pf-ex');

  function v(n) {
    var el = f.elements[n];
    return el && el.value != null ? clean(el.value) : '';
  }
  function now() {
    return { q: v('k'), use: v('use'), min: v('min'), max: v('max') };
  }
  function track(event, o, source) {
    try {
      var lo = parseFloat(o.min);
      var hi = parseFloat(o.max);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: event,
        tool: 'price_finder',
        page: location.pathname,
        search_term: scrub(words(o)),
        pet: o.use || 'any',
        budget_min: lo > 0 ? lo : '',
        budget_max: hi > 0 ? hi : '',
        search_source: source || 'typed'
      });
    } catch (x) {}
  }
  function run(scroll, source) {
    if (err) {
      err.hidden = true;
      err.textContent = '';
    }
    var o = now();
    var url = link(o, TAG, BASE);
    if (!url) {
      if (!TAG && err) {
        err.hidden = false;
        err.textContent = 'This search cannot run right now. Please try again later.';
      } else if (f.elements.k && f.elements.k.focus) f.elements.k.focus();
      if (box) box.hidden = true;
      return;
    }
    // ee-click.js keeps a link's first address in data-ee-orig and re-stamps from it on
    // every press. This one link is reused for every search, so drop that memory first.
    if (a.removeAttribute) a.removeAttribute('data-ee-orig');
    a.href = url;
    track('fplb_price_finder_search', o, source);
    if (qEl) {
      qEl.textContent = '';
      var b = document.createElement('b');
      b.textContent = words(o);
      qEl.appendChild(b);
      qEl.appendChild(document.createTextNode(', ' + describe(o)));
    }
    if (box) {
      box.hidden = false;
      // Replay the entrance each time so a new search is easy to notice.
      box.classList.remove('pf-pop');
      void box.offsetWidth;
      box.classList.add('pf-pop');
    }
    if (scroll) {
      var active = document.activeElement;
      if (active && active !== a && active.blur) active.blur();
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (a.focus) a.focus({ preventScroll: true });
    }
  }
  function fill(p) {
    f.reset();
    if (p.q != null && f.elements.k) f.elements.k.value = p.q;
    if (p.k != null && f.elements.k) f.elements.k.value = p.k;
    ['min', 'max', 'use'].forEach(function (n) {
      if (p[n] != null && f.elements[n]) f.elements[n].value = p[n];
    });
  }

  // Example chips follow the picked pet. The page ships a mixed set as plain links, so the
  // examples also work before this script loads.
  var sets = {};
  try {
    sets = JSON.parse((chips && chips.getAttribute('data-sets')) || '{}');
  } catch (x) {}
  function drawChips(pet) {
    if (!chips) return;
    var list = sets[pet] || sets[''];
    if (!list || !list.length) return;
    var label = chips.querySelector('span');
    chips.textContent = '';
    if (label) chips.appendChild(label);
    list.forEach(function (item, i) {
      var el = document.createElement('a');
      el.className = 'pf-chip';
      el.href = location.pathname + '?' + new URLSearchParams(item[1]).toString();
      el.setAttribute('data-fill', JSON.stringify(item[1]));
      el.style.animationDelay = i * 45 + 'ms';
      el.textContent = item[0];
      chips.appendChild(el);
    });
  }

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    run(true, 'typed');
  });
  f.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'use') drawChips(e.target.value);
  });
  if (chips) {
    chips.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-fill]') : null;
      if (!el) return;
      e.preventDefault();
      try {
        var p = JSON.parse(el.getAttribute('data-fill'));
        fill(p);
        drawChips(v('use'));
        run(true, 'example');
      } catch (x) {}
    });
  }
  if (a && a.addEventListener) {
    a.addEventListener('click', function () {
      track('fplb_price_finder_open', now(), 'open');
    });
  }

  // A link from an email or a post (/price-finder/?q=...&use=dogs&max=25) opens ready to go.
  var sp = new URLSearchParams(location.search);
  if (sp.get('q') || sp.get('k')) {
    var p = {};
    sp.forEach(function (val, key) {
      p[key] = val;
    });
    fill(p);
    drawChips(v('use'));
    run(false, 'link');
  }

  // Types example searches into the empty box so the page shows what to enter.
  // Stops for good on focus or input, and never runs with reduced motion.
  var q = document.getElementById('amz-q');
  var list = [];
  try {
    list = JSON.parse((q && q.getAttribute('data-rotate')) || '[]');
  } catch (x) {}
  if (!q || list.length < 2 || typeof setTimeout !== 'function') return;
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var word = 0;
  var at = list[0].length;
  var dir = -1;
  var stopped = false;
  function stop() {
    stopped = true;
    q.placeholder = 'e.g. ' + list[0];
  }
  function tick() {
    if (stopped) return;
    if (q.value) return stop();
    at += dir;
    var w = list[word];
    q.placeholder = 'e.g. ' + w.slice(0, Math.max(at, 0));
    var wait = dir > 0 ? 70 : 32;
    if (dir > 0 && at >= w.length) {
      dir = -1;
      wait = 1700;
    } else if (dir < 0 && at <= 0) {
      dir = 1;
      word = (word + 1) % list.length;
      wait = 260;
    }
    setTimeout(tick, wait);
  }
  q.addEventListener('focus', stop);
  q.addEventListener('input', stop);
  setTimeout(tick, 1800);
})();
