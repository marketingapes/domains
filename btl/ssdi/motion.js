/* BTL-SSDI-001 scroll reveal. Sections fade up once as they enter view; skipped for reduced motion. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-motion');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
})();
