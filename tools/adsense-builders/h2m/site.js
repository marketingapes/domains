/* Hair 2 Makeup: article filter + event-day prep timeline builder. No network calls. */
(function () {
  // ---- article topic filter
  var chips = document.querySelectorAll('.chip[data-cat]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', x === c); });
      document.querySelectorAll('.grid-item[data-cat]').forEach(function (g) {
        g.hidden = !(c.dataset.cat === 'all' || g.dataset.cat === c.dataset.cat);
      });
    });
  });

  // ---- timeline builder
  var form = document.getElementById('tl-form');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var out = $('tl-out');

  function fmt(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'pm' : 'am';
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    var ready = ($('tl-ready').value || '13:00').split(':');
    var readyMin = (+ready[0]) * 60 + (+ready[1] || 0);
    var n = Math.max(1, Math.min(12, parseInt($('tl-people').value, 10) || 1));
    var service = $('tl-service').value;
    var two = $('tl-artists').value === '2';
    var detailed = $('tl-look').value === 'detailed';
    var buffer = Math.max(0, Math.min(120, parseInt($('tl-buffer').value, 10) || 0));
    var hasMain = $('tl-main').checked;
    var SETUP = 15, DRESS = 20;

    // people in order: guests first, guest of honour second-to-last, one guest last as a hidden buffer
    var people = [];
    for (var i = 0; i < n; i++) people.push({ name: 'Person ' + (i + 1), main: false });
    if (hasMain) {
      var mainIdx = n >= 3 ? n - 2 : n - 1;
      people.splice(mainIdx, 0, { name: 'Guest of honour', main: true });
      people.pop();
      var k = 1; people.forEach(function (p) { if (!p.main) p.name = 'Person ' + (k++); });
    }
    people.forEach(function (p) {
      p.tasks = [];
      var hair = p.main ? (detailed ? 75 : 60) : (detailed ? 50 : 35);
      var makeup = p.main ? 60 : 40;
      if (service !== 'makeup') p.tasks.push({ kind: 'hair', dur: hair });
      if (service !== 'hair') p.tasks.push({ kind: 'makeup', dur: makeup });
      p.free = 0;
    });

    // simple list scheduler, forward from t=0
    var artists = two
      ? [{ name: 'Hair stylist', does: ['hair'], free: 0 }, { name: 'Makeup artist', does: ['makeup'], free: 0 }]
      : [{ name: 'Artist', does: ['hair', 'makeup'], free: 0 }];
    var slots = [], guard = 0;
    while (people.some(function (p) { return p.tasks.length; }) && guard++ < 200) {
      var a = artists.slice().sort(function (x, y) { return x.free - y.free; })[0];
      var best = null, bestStart = Infinity;
      people.forEach(function (p) {
        p.tasks.forEach(function (t) {
          if (a.does.indexOf(t.kind) < 0) return;
          // guest of honour: hair first so makeup is freshest for photos
          if (p.main && t.kind === 'makeup' && p.tasks.some(function (x) { return x.kind === 'hair'; })) return;
          var st = Math.max(a.free, p.free);
          if (st < bestStart) { best = { p: p, t: t }; bestStart = st; }
        });
      });
      if (!best) { a.free = Infinity; continue; }
      slots.push({ start: bestStart, end: bestStart + best.t.dur, who: best.p.name, what: best.t.kind, artist: a.name, main: best.p.main });
      best.p.tasks.splice(best.p.tasks.indexOf(best.t), 1);
      best.p.free = bestStart + best.t.dur; a.free = best.p.free;
    }
    var span = Math.max.apply(null, slots.map(function (s) { return s.end; }));
    var endStyling = readyMin - buffer - DRESS;
    var shift = endStyling - span;
    slots.forEach(function (s) { s.start += shift; s.end += shift; });
    slots.sort(function (x, y) { return x.start - y.start || (x.artist > y.artist ? 1 : -1); });
    var first = slots[0].start;

    var rows = '<li class="ev"><time>' + fmt(first - SETUP) + '</time><span>Artist' + (two ? 's arrive and set up' : ' arrives and sets up') + ' (have a table near a window ready)</span></li>';
    slots.forEach(function (s) {
      rows += '<li><time>' + fmt(s.start) + '</time><span><span class="who">' + esc(s.who) + '</span>: ' + s.what + (two ? ' with the ' + s.artist.toLowerCase() : '') + ' (until ' + fmt(s.end) + ')' + '</span></li>';
    });
    rows += '<li class="ev"><time>' + fmt(endStyling) + '</time><span>Get dressed, accessories on (' + DRESS + ' min)</span></li>';
    if (buffer) rows += '<li class="ev"><time>' + fmt(endStyling + DRESS) + '</time><span>Buffer: touch-ups, photos, breathing (' + buffer + ' min)</span></li>';
    rows += '<li class="ev"><time>' + fmt(readyMin) + '</time><span><strong>Everyone ready!</strong></span></li>';

    var total = readyMin - (first - SETUP);
    out.innerHTML = '<h3>Your draft timeline</h3><p class="tl-sum">Start at <strong>' + fmt(first - SETUP) +
      '</strong>, about ' + Math.floor(total / 60) + ' h ' + (total % 60) + ' min before your ready-by time. ' +
      (two ? 'Two artists work in parallel.' : 'One artist works through everyone in turn.') +
      ' Planning estimates only: confirm real timings with your stylist.</p><ol class="tl-list">' + rows + '</ol>' +
      '<p class="small">Want the reasoning? Read our <a href="/articles/event-day-prep-timeline/">prep timeline guide</a>.</p>';
  }
  $('tl-go').addEventListener('click', build);
  form.addEventListener('change', build);
  build();
})();
