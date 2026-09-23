/* What Is Working Capital — small helpers. No network calls, no dependencies. */
(function () {
  'use strict';
  var fmt = function (n) {
    var s = Math.abs(Math.round(n)).toLocaleString('en-US');
    return (n < 0 ? '-$' : '$') + s;
  };
  var num = function (el) {
    var v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
    return isFinite(v) ? v : 0;
  };

  /* Working capital & current ratio calculator (home page) */
  var calc = document.getElementById('wc-calc');
  if (calc) {
    var ids = ['cash', 'ar', 'inv', 'oca', 'ap', 'std', 'ocl'];
    var inputs = {};
    ids.forEach(function (id) { inputs[id] = document.getElementById('c-' + id); });
    var out = {
      wc: document.getElementById('r-wc'), cr: document.getElementById('r-cr'),
      qr: document.getElementById('r-qr'), ca: document.getElementById('r-ca'),
      cl: document.getElementById('r-cl'), verdict: document.getElementById('r-verdict'),
      needle: document.getElementById('r-needle')
    };
    var run = function () {
      var v = {};
      ids.forEach(function (id) { v[id] = num(inputs[id]); });
      var ca = v.cash + v.ar + v.inv + v.oca;
      var cl = v.ap + v.std + v.ocl;
      var wc = ca - cl;
      out.wc.textContent = fmt(wc);
      out.ca.textContent = fmt(ca);
      out.cl.textContent = fmt(cl);
      if (cl <= 0) {
        out.cr.textContent = '—';
        out.qr.textContent = '—';
        out.needle.style.left = '96%';
        out.verdict.textContent = ca > 0
          ? 'No current liabilities entered, so the ratios cannot be calculated. Add what you owe in the next 12 months to see them.'
          : 'Enter a few numbers from your balance sheet to see your results.';
        return;
      }
      var cr = ca / cl;
      var qr = (v.cash + v.ar) / cl;
      out.cr.textContent = cr.toFixed(2);
      out.qr.textContent = qr.toFixed(2);
      var pos = Math.max(0, Math.min(3, cr)) / 3 * 100;
      out.needle.style.left = 'calc(' + pos + '% - 3px)';
      var msg;
      if (cr < 1) {
        msg = 'Current liabilities are larger than current assets. That can be normal for businesses paid up front (cafés, subscriptions), but for most firms it means bills due this year exceed what will turn into cash this year. Worth a closer look.';
      } else if (cr < 1.5) {
        msg = 'Assets cover liabilities, but the cushion is thin. Check the quick ratio: if it is well below 1, you are relying on selling inventory to pay upcoming bills.';
      } else if (cr <= 3) {
        msg = 'A comfortable cushion by most rules of thumb. The next question is quality: are receivables collectable and is inventory actually selling?';
      } else {
        msg = 'A very large cushion. Safe, but check whether cash or stock is sitting idle when it could be earning or be put to work.';
      }
      if (cr >= 1 && qr < 0.7 && v.inv > 0) {
        msg += ' Note: most of your cover is inventory, which takes time to turn into cash.';
      }
      out.verdict.textContent = msg;
    };
    calc.addEventListener('input', run);
    var reset = document.getElementById('c-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        ids.forEach(function (id) { inputs[id].value = inputs[id].getAttribute('data-example'); });
        run();
      });
    }
    run();
  }

  /* Cash conversion cycle mini calculator */
  var ccc = document.getElementById('ccc-calc');
  if (ccc) {
    var f = ['rev', 'cogs', 'inv', 'ar', 'ap'].map(function (k) { return document.getElementById('k-' + k); });
    var o = document.getElementById('k-out');
    var go = function () {
      var rev = num(f[0]), cogs = num(f[1]), inv = num(f[2]), ar = num(f[3]), ap = num(f[4]);
      if (rev <= 0 || cogs <= 0) { o.textContent = 'Enter annual revenue and cost of goods sold to see your cycle.'; return; }
      var dio = inv / cogs * 365, dso = ar / rev * 365, dpo = ap / cogs * 365;
      var c = dio + dso - dpo;
      o.textContent = 'DIO ' + dio.toFixed(1) + ' + DSO ' + dso.toFixed(1) + ' − DPO ' + dpo.toFixed(1) + ' = ' + c.toFixed(1) + ' days';
    };
    ccc.addEventListener('input', go);
    go();
  }
})();
