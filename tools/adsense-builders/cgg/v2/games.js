/* Crazy Golf Game: side-game score helpers. Runs entirely in the browser; nothing is sent anywhere. */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function el(t, a, h) { var e = document.createElement(t); if (a) for (var k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e; }
  function names(v, n) {
    var a = (v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    while (a.length < n) a.push('Player ' + (a.length + 1));
    return a.slice(0, n);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(i) { var v = parseInt(i && i.value, 10); return isNaN(v) ? null : v; }
  function holes(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; }

  /* --- grid of score inputs: rows = holes, cols = players --- */
  function scoreGrid(box, ps, extraCols, onChange) {
    var wrap = $('.tbl', box); wrap.innerHTML = '';
    var t = el('table'); var hr = '<tr><th>Hole</th>' + (extraCols || []).map(function (c) { return '<th>' + c + '</th>'; }).join('') +
      ps.map(function (p) { return '<th>' + esc(p) + '</th>'; }).join('') + '</tr>';
    t.innerHTML = '<thead>' + hr + '</thead>';
    var tb = el('tbody');
    holes(18).forEach(function (h) {
      var r = '<tr><th>' + h + '</th>' + (extraCols || []).map(function (c, j) { return '<td><input type="number" min="1" max="15" inputmode="numeric" data-h="' + h + '" data-x="' + j + '" aria-label="' + c + ' hole ' + h + '"></td>'; }).join('') +
        ps.map(function (p, i) { return '<td><input type="number" min="1" max="15" inputmode="numeric" data-h="' + h + '" data-p="' + i + '" aria-label="' + esc(p) + ' hole ' + h + '"></td>'; }).join('') + '</tr>';
      tb.insertAdjacentHTML('beforeend', r);
    });
    t.appendChild(tb); wrap.appendChild(t);
    t.addEventListener('input', onChange);
  }
  function cell(box, h, p) { return num($('input[data-h="' + h + '"][data-p="' + p + '"]', box)); }
  function xcell(box, h, x) { return num($('input[data-h="' + h + '"][data-x="' + x + '"]', box)); }

  var tools = {
    skins: function (box) {
      function build() {
        var ps = names($('[name=players]', box).value, +$('[name=count]', box).value);
        scoreGrid(box, ps, null, calc); calc();
        function calc() {
          var won = ps.map(function () { return 0; }), carry = 1, log = [];
          holes(18).forEach(function (h) {
            var s = ps.map(function (_, i) { return cell(box, h, i); });
            if (s.some(function (v) { return v === null; })) return;
            var lo = Math.min.apply(null, s), who = s.reduce(function (a, v, i) { return v === lo ? a.concat(i) : a; }, []);
            if (who.length === 1) { won[who[0]] += carry; log.push('H' + h + ': ' + esc(ps[who[0]]) + ' wins ' + carry); carry = 1; }
            else { carry += 1; }
          });
          $('.out', box).innerHTML = ps.map(function (p, i) { return esc(p) + ': <b>' + won[i] + '</b>'; }).join(' &middot; ') +
            (carry > 1 ? '<br>Carrying over: ' + (carry - 1) + ' skin(s) to the next hole' : '') +
            (log.length ? '<br><span class="note">' + log.join(' | ') + '</span>' : '');
        }
      }
      box.addEventListener('change', function (e) { if (e.target.name === 'players' || e.target.name === 'count') build(); });
      build();
    },
    nassau: function (box) {
      var tb = $('.tbl', box), A = $('[name=a]', box), B = $('[name=b]', box);
      function build() {
        var a = A.value || 'Side A', b = B.value || 'Side B';
        var t = '<table><thead><tr><th>Hole</th><th>Result</th></tr></thead><tbody>' + holes(18).map(function (h) {
          return '<tr><th>' + h + '</th><td><select data-h="' + h + '" aria-label="Hole ' + h + ' result"><option value="">&mdash;</option><option value="1">' + esc(a) + ' wins</option><option value="0">Halved</option><option value="-1">' + esc(b) + ' wins</option></select></td></tr>';
        }).join('') + '</tbody></table>';
        tb.innerHTML = t; calc();
      }
      function status(from, to, a, b) {
        var n = 0, played = 0;
        for (var h = from; h <= to; h++) { var v = $('select[data-h="' + h + '"]', box).value; if (v !== '') { n += +v; played++; } }
        var left = (to - from + 1) - played;
        var s = n === 0 ? 'All square' : (n > 0 ? esc(a) : esc(b)) + ' ' + Math.abs(n) + ' up';
        if (Math.abs(n) > left && left >= 0 && played) s += ' (won ' + Math.abs(n) + '&amp;' + left + ')';
        return { txt: s + (played ? ' after ' + played : ''), n: n };
      }
      function calc() {
        var a = A.value || 'Side A', b = B.value || 'Side B';
        var f = status(1, 9, a, b), k = status(10, 18, a, b), o = status(1, 18, a, b);
        var press = (Math.abs(f.n) >= 2 || Math.abs(k.n) >= 2) ? '<br><span class="note">A side is 2 down: if you play automatic 2-down presses, a new bet starts on the next hole.</span>' : '';
        $('.out', box).innerHTML = 'Front 9: ' + f.txt + '<br>Back 9: ' + k.txt + '<br>Overall: ' + o.txt + press;
      }
      box.addEventListener('change', function (e) { if (e.target === A || e.target === B) build(); else calc(); });
      build();
    },
    vegas: function (box) {
      function build() {
        var ps = names($('[name=players]', box).value, 4);
        scoreGrid(box, ps, ['Par'], calc); calc();
        function teamNum(x, y, flip) { var lo = Math.min(x, y), hi = Math.max(x, y); return flip ? +(String(hi) + String(lo)) : +(String(lo) + String(hi)); }
        function calc() {
          var tot = 0, rows = [];
          holes(18).forEach(function (h) {
            var par = xcell(box, h, 0), s = [0, 1, 2, 3].map(function (i) { return cell(box, h, i); });
            if (par === null || s.some(function (v) { return v === null; })) return;
            var t1b = s[0] < par || s[1] < par, t2b = s[2] < par || s[3] < par;
            var n1 = teamNum(s[0], s[1], t2b), n2 = teamNum(s[2], s[3], t1b);
            tot += n2 - n1; rows.push('H' + h + ': ' + n1 + ' v ' + n2);
          });
          var t1 = esc(ps[0]) + ' &amp; ' + esc(ps[1]), t2 = esc(ps[2]) + ' &amp; ' + esc(ps[3]);
          $('.out', box).innerHTML = (tot === 0 ? 'Level' : (tot > 0 ? t1 : t2) + ' lead by <b>' + Math.abs(tot) + '</b> points') +
            (rows.length ? '<br><span class="note">' + rows.join(' | ') + '</span>' : '');
        }
      }
      box.addEventListener('change', function (e) { if (e.target.name === 'players') build(); });
      build();
    },
    wolf: function (box) {
      function build() {
        var ps = names($('[name=players]', box).value, 4), last = $('[name=order]', box).value === 'last';
        var rows = holes(18).map(function (h) {
          var order = ps.slice((h - 1) % 4).concat(ps.slice(0, (h - 1) % 4));
          var wolf = last ? order[3] : order[0];
          if (h >= 17) wolf = 'Last place (house rule)';
          return '<tr><th>' + h + '</th><td><b>' + esc(wolf) + '</b></td><td>' + order.map(esc).join(' &rarr; ') + '</td>' +
            ps.map(function (_, i) { return '<td><input type="number" inputmode="numeric" data-h="' + h + '" data-p="' + i + '" aria-label="points"></td>'; }).join('') + '</tr>';
        }).join('');
        $('.tbl', box).innerHTML = '<table><thead><tr><th>Hole</th><th>Wolf</th><th>Tee order</th>' + ps.map(function (p) { return '<th>' + esc(p) + ' pts</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>';
        calc();
        function calc() {
          var t = ps.map(function (_, i) { var s = 0; holes(18).forEach(function (h) { s += cell(box, h, i) || 0; }); return s; });
          $('.out', box).innerHTML = 'Points: ' + ps.map(function (p, i) { return esc(p) + ' <b>' + t[i] + '</b>'; }).join(' &middot; ');
        }
        $('.tbl', box).oninput = calc;
      }
      box.addEventListener('change', function (e) { if (e.target.name === 'players' || e.target.name === 'order') build(); });
      build();
    },
    snake: function (box) {
      function build() {
        var ps = names($('[name=players]', box).value, +$('[name=count]', box).value);
        $('.tbl', box).innerHTML = '<table><thead><tr><th>Hole</th><th>Three-putt (last one on the hole)</th></tr></thead><tbody>' + holes(18).map(function (h) {
          return '<tr><th>' + h + '</th><td><select data-h="' + h + '"><option value="">nobody</option>' + ps.map(function (p, i) { return '<option value="' + i + '">' + esc(p) + '</option>'; }).join('') + '</select></td></tr>';
        }).join('') + '</tbody></table>';
        calc();
      }
      function calc() {
        var ps = names($('[name=players]', box).value, +$('[name=count]', box).value), holder = null, n = 0;
        holes(18).forEach(function (h) { var v = $('select[data-h="' + h + '"]', box); if (v && v.value !== '') { holder = +v.value; n++; } });
        var stake = parseFloat($('[name=stake]', box).value) || 0;
        $('.out', box).innerHTML = holder === null ? 'No snake yet. Keep it that way.' :
          'Holding the snake: <b>' + esc(ps[holder]) + '</b> &middot; snakes so far: ' + n + (stake ? ' &middot; pot if it grows by the stake each time: ' + (n * stake).toFixed(2) : '');
      }
      box.addEventListener('change', function (e) { if (e.target.name === 'players' || e.target.name === 'count') build(); else calc(); });
      build();
    },
    bbb: function (box) {
      function build() {
        var ps = names($('[name=players]', box).value, +$('[name=count]', box).value);
        var opt = '<option value="">&mdash;</option>' + ps.map(function (p, i) { return '<option value="' + i + '">' + esc(p) + '</option>'; }).join('');
        $('.tbl', box).innerHTML = '<table><thead><tr><th>Hole</th><th>Bingo (first on green)</th><th>Bango (closest once all on)</th><th>Bongo (first in hole)</th></tr></thead><tbody>' +
          holes(18).map(function (h) { return '<tr><th>' + h + '</th>' + [0, 1, 2].map(function (k) { return '<td><select data-h="' + h + '" data-k="' + k + '">' + opt + '</select></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
        calc();
        function calc() {
          var t = ps.map(function () { return 0; });
          box.querySelectorAll('select[data-k]').forEach(function (s) { if (s.value !== '') t[+s.value]++; });
          $('.out', box).innerHTML = 'Points: ' + ps.map(function (p, i) { return esc(p) + ' <b>' + t[i] + '</b>'; }).join(' &middot; ');
        }
        $('.tbl', box).onchange = calc;
      }
      box.addEventListener('change', function (e) { if (e.target.name === 'players' || e.target.name === 'count') build(); });
      build();
    }
  };
  document.querySelectorAll('[data-tool]').forEach(function (b) { var f = tools[b.getAttribute('data-tool')]; if (f) f(b); });
  document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* Newsletter: UI only until a consented list endpoint is approved. Nothing is collected or sent. */
  document.querySelectorAll('form[data-newsletter]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = f.parentNode.querySelector('.msg');
      if (m) m.textContent = 'Sign-ups are not open yet, and nothing was saved. Follow @crazygolfgame on X in the meantime.';
    });
  });
})();
