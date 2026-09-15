// Mobile nav + scroll-triggered fade-ins
document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  initFadeIns();
});

function initMobileNav() {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  function isOpen() {
    return nav.classList.contains('open');
  }

  // Prefer JS handler over inline onclick
  toggle.removeAttribute('onclick');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'main-nav');
  if (!nav.id) nav.id = 'main-nav';

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!isOpen());
  });

  // Close after choosing a link
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      setOpen(false);
    });
  });

  // Close when tapping outside the menu
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (nav.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Close if resizing up to desktop
  var mq = window.matchMedia('(min-width: 769px)');
  function onViewportChange(e) {
    if (e.matches) setOpen(false);
  }
  if (mq.addEventListener) {
    mq.addEventListener('change', onViewportChange);
  } else if (mq.addListener) {
    mq.addListener(onViewportChange);
  }
}

function initFadeIns() {
  var targets = document.querySelectorAll('.card, .philosophy-list, .section-title');
  if (!targets.length) return;

  // Skip animation when user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  targets.forEach(function (el) { el.classList.add('fade-in'); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

  targets.forEach(function (el) { observer.observe(el); });
}
