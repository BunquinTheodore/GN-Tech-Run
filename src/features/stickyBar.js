import { getRegistrationState } from '../lib/utm.js';

const HIDE_DELAY_MS = 250;

export function initStickyBar() {
  const bar = document.getElementById('sticky-bar');
  const heroCta = document.getElementById('hero-register');
  if (!bar || !heroCta || !('IntersectionObserver' in window)) return;
  if (getRegistrationState() !== 'open') {
    bar.hidden = true;
    return;
  }

  const mobile = window.matchMedia('(max-width: 767px)');
  let ctaVisible = true;
  let hideTimer = 0;

  const apply = () => {
    const show = !ctaVisible && mobile.matches;
    clearTimeout(hideTimer);
    if (show) {
      bar.hidden = false;
      document.body.classList.add('has-sticky-bar');
      requestAnimationFrame(() => bar.classList.add('is-visible'));
    } else {
      bar.classList.remove('is-visible');
      document.body.classList.remove('has-sticky-bar');
      hideTimer = setTimeout(() => {
        bar.hidden = true;
      }, HIDE_DELAY_MS);
    }
  };

  new IntersectionObserver((entries) => {
    ctaVisible = entries[entries.length - 1].isIntersecting;
    apply();
  }).observe(heroCta);
  if (mobile.addEventListener) mobile.addEventListener('change', apply);
}
