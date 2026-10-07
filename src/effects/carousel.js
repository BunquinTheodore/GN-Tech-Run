import images from '../generated/images.json';

const RESUME_DELAY_MS = 2500;
const KEY_SCROLL_RATIO = 0.8;
const SIZES = '(min-width: 1024px) 20rem, 42vw';

function buildSource(type, srcset) {
  const source = document.createElement('source');
  source.type = type;
  source.srcset = srcset;
  source.sizes = SIZES;
  return source;
}

function buildSlide(item, { clone }) {
  const figure = document.createElement('figure');
  figure.className = 'strip__slide';
  const picture = document.createElement('picture');
  if (item.avifSrcset) picture.appendChild(buildSource('image/avif', item.avifSrcset));
  if (item.webpSrcset) picture.appendChild(buildSource('image/webp', item.webpSrcset));
  const img = document.createElement('img');
  img.src = item.src;
  img.width = item.width;
  img.height = item.height;
  img.alt = clone ? '' : item.alt || '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  picture.appendChild(img);
  figure.appendChild(picture);
  if (clone) {
    figure.setAttribute('aria-hidden', 'true');
    figure.setAttribute('inert', '');
  }
  return figure;
}

/** Pause/resume by toggling a class; CSS flips animation-play-state. No per-frame JS. */
function bindPause(viewport) {
  let timer = 0;
  const pause = () => {
    clearTimeout(timer);
    viewport.classList.add('is-paused');
  };
  const resumeSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!viewport.matches(':hover') && !viewport.matches(':focus-within')) viewport.classList.remove('is-paused');
    }, RESUME_DELAY_MS);
  };
  const isMouse = (e) => e.pointerType === 'mouse';

  viewport.addEventListener('pointerenter', (e) => isMouse(e) && pause());
  viewport.addEventListener('pointerleave', (e) => isMouse(e) && resumeSoon());
  viewport.addEventListener('pointerdown', pause);
  viewport.addEventListener('pointerup', resumeSoon);
  viewport.addEventListener('pointercancel', resumeSoon);
  viewport.addEventListener('touchstart', pause, { passive: true });
  viewport.addEventListener('touchend', resumeSoon, { passive: true });
  viewport.addEventListener(
    'scroll',
    () => viewport.classList.contains('is-paused') && !viewport.matches(':hover') && resumeSoon(),
    { passive: true }
  );
  viewport.addEventListener('focusin', pause);
  viewport.addEventListener('focusout', () => !viewport.matches(':hover') && resumeSoon());
}

function bindKeys(viewport) {
  viewport.addEventListener('keydown', (e) => {
    if (e.target !== viewport || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    viewport.scrollBy({ left: dir * viewport.clientWidth * KEY_SCROLL_RATIO, behavior: 'smooth' });
  });
}

export function initCarousel() {
  const section = document.getElementById('gallery');
  const viewport = document.getElementById('photo-strip');
  const track = document.getElementById('strip-track');
  if (!viewport || !track) return;

  const gallery = Array.isArray(images && images.gallery) ? images.gallery.filter((i) => i && i.src) : [];
  if (!gallery.length) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fragment = document.createDocumentFragment();
  gallery.forEach((item) => fragment.appendChild(buildSlide(item, { clone: false })));
  if (!reduced) gallery.forEach((item) => fragment.appendChild(buildSlide(item, { clone: true })));
  track.replaceChildren(fragment);
  track.style.setProperty('--strip-count', String(gallery.length));

  bindKeys(viewport);
  if (!reduced) bindPause(viewport);
}
