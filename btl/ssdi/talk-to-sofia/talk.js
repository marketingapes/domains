/* BTL-SSDI-001 Talk to Sofia page: the example call plays line by line when it scrolls into view,
   and a saved callback swaps the form for the confirmation. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lines = [].slice.call(document.querySelectorAll('#callLines li'));
  var demo = document.getElementById('callDemo');
  if (demo && lines.length && !reduced && 'IntersectionObserver' in window) {
    lines.forEach(function (li) { li.classList.add('wait'); });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      lines.forEach(function (li, n) { setTimeout(function () { li.classList.remove('wait'); }, 500 + n * 900); });
    }, { threshold: 0.35 });
    io.observe(demo);
  }

  var form = document.getElementById('leadForm');
  if (form) form.addEventListener('ee:lead-saved', function (ev) {
    document.getElementById('cbBody').hidden = true;
    var done = document.getElementById('cbDone');
    document.getElementById('cbDoneText').textContent = ev.detail.message;
    done.hidden = false;
    var h = done.querySelector('h2'); if (h) h.focus();
  });
})();
