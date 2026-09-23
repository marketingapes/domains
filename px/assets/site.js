/* Pillow Exchange: home-page pillow matcher. Runs locally, sends nothing. */
(function () {
  var form = document.getElementById('pillow-matcher');
  if (!form) return;
  var LOFT = ['Very low', 'Low', 'Low-medium', 'Medium', 'Medium-high', 'High', 'Extra high'];
  var GUIDES = {
    side: ['/articles/side-sleeper-pillows/', 'side sleeper guide'],
    back: ['/articles/back-sleeper-pillows/', 'back sleeper guide'],
    stomach: ['/articles/stomach-sleeper-pillows/', 'stomach sleeper guide'],
    combo: ['/articles/combination-sleeper-pillows/', 'combination sleeper guide']
  };
  function val(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function update() {
    var pos = val('pos') || 'side', sh = val('sh'), mat = val('mat');
    var hot = !!val('hot'), quiet = !!val('quiet');
    var base = { side: 4.5, back: 3, stomach: 0.5, combo: 3.5 }[pos];
    var shAdj = pos === 'side' ? 1 : pos === 'stomach' ? 0 : 0.5;
    if (sh === 'broad') base += shAdj;
    if (sh === 'narrow') base -= shAdj;
    if (pos !== 'stomach') {
      if (mat === 'soft') base -= 0.5;
      if (mat === 'firm') base += 0.5;
    }
    var idx = Math.max(0, Math.min(6, Math.round(base)));
    var firm = { side: 'medium-firm to firm', back: 'medium', stomach: 'soft', combo: 'medium, quick to bounce back' }[pos];
    var fills = {
      side: ['adjustable shredded foam or latex', 'solid or contoured latex', 'firm down-and-feather', 'buckwheat'],
      back: ['buckwheat you can shape', 'contoured foam or latex', 'medium down or feather', 'adjustable shredded foam'],
      stomach: ['soft down or down alternative', 'soft polyester fibre', 'shredded foam with most fill removed'],
      combo: ['adjustable shredded latex or foam', 'latex', 'fibre clusters', 'medium down']
    }[pos].slice();
    if (hot) fills = fills.filter(function (f) { return !/solid/.test(f); });
    if (quiet) fills = fills.filter(function (f) { return !/buckwheat/.test(f); });
    if (hot) fills.unshift(pos === 'stomach' ? 'breathable down' : 'loose, breathable fills such as latex, down' + (quiet ? '' : ' or buckwheat'));
    var seen = {}; fills = fills.filter(function (f) { if (seen[f]) return false; seen[f] = 1; return true; }).slice(0, 3);
    var extra = [];
    if (hot) extra.push('pair it with a percale, linen or lyocell case');
    if (pos === 'side') extra.push('try a pillow between your knees');
    if (pos === 'back') extra.push('a pillow under the knees can ease the lower back');
    if (pos === 'stomach') extra.push('a thin pillow under the hips can help');
    document.getElementById('result-main').textContent = LOFT[idx] + ' loft · ' + firm;
    document.getElementById('result-fills').textContent = 'Look at: ' + fills.join('; ') + '.' + (extra.length ? ' Tip: ' + extra.join(', and ') + '.' : '');
    var g = GUIDES[pos];
    var link = document.getElementById('result-link');
    link.innerHTML = '';
    var a = document.createElement('a');
    a.href = hot ? '/articles/pillows-for-hot-sleepers/' : g[0];
    a.textContent = 'Read the ' + (hot ? 'hot sleeper guide' : g[1]) + ' →';
    link.appendChild(a);
    document.getElementById('loft-bar').style.width = Math.round((idx + 1) / 7 * 100) + '%';
  }
  form.addEventListener('change', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update();
})();
