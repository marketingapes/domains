export function clamp(i, n = 8) {
  const v = Number(i);
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(n, Math.trunc(v)));
}

export function parseHash(hash) {
  const m = String(hash || '').match(/^#(\d+)$/);
  return m ? clamp(m[1]) : 1;
}

function track(name, extra) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(Object.assign({
    event: name,
    tenant_id: 'MA',
    domain: 'marketingapes.com',
    page_path: location.pathname
  }, extra || {}));
}

function ready() {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('[data-go]')];
  const live = document.getElementById('slide-live');
  const indexEl = document.getElementById('slide-index');
  if (!slides.length) return;
  let current = parseHash(location.hash);

  function show(n) {
    current = clamp(n, slides.length);
    slides.forEach((slide, i) => {
      const on = i + 1 === current;
      slide.toggleAttribute('hidden', !on);
      slide.setAttribute('aria-hidden', on ? 'false' : 'true');
      slide.classList.toggle('is-current', on);
    });
    dots.forEach((dot, i) => {
      if (i + 1 === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (indexEl) indexEl.textContent = String(current).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    if (live) live.textContent = 'Slide ' + current + ' of ' + slides.length;
    if (location.hash !== '#' + current) history.replaceState(null, '', '#' + current);
    track('ee_slide_view', {slide: current, slide_count: slides.length});
  }

  document.getElementById('prev-slide')?.addEventListener('click', () => show(current - 1));
  document.getElementById('next-slide')?.addEventListener('click', () => show(current + 1));
  dots.forEach((dot) => {
    dot.addEventListener('click', () => show(dot.getAttribute('data-go')));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(current - 1); }
    if (e.key === 'Home') { e.preventDefault(); show(1); }
    if (e.key === 'End') { e.preventDefault(); show(slides.length); }
  });
  window.addEventListener('hashchange', () => show(parseHash(location.hash)));

  let x0 = null;
  const deck = document.getElementById('deck');
  deck?.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  deck?.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (dx < -50) show(current + 1);
    if (dx > 50) show(current - 1);
  });

  document.querySelectorAll('a[href]').forEach((a) => {
    a.addEventListener('click', () => {
      track('ee_cta_click', {
        cta_text: (a.textContent || '').trim().slice(0, 60),
        destination: a.getAttribute('href') || ''
      });
    });
  });
  document.querySelectorAll('video').forEach((video) => {
    const seen = {25: false, 50: false, 75: false};
    video.addEventListener('play', () => track('ee_video_start', {video_title: 'tex-pitch'}));
    video.addEventListener('ended', () => track('ee_video_complete', {video_title: 'tex-pitch'}));
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const pct = (video.currentTime / video.duration) * 100;
      [25, 50, 75].forEach((mark) => {
        if (pct >= mark && !seen[mark]) {
          seen[mark] = true;
          track('ee_video_progress', {percent: mark, video_title: 'tex-pitch'});
        }
      });
    });
  });
  show(current);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
}
