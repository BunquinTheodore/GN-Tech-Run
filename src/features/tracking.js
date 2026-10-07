import config from '../lib/config.js';

const PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
const FIRST_INTERACTION = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

function defineStub(win) {
  if (win.fbq) return;
  const fbq = function () {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
    else fbq.queue.push(arguments);
  };
  if (!win._fbq) win._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  win.fbq = fbq;
}

export function initTracking() {
  const id = String(config.tracking?.metaPixelId || '').trim();
  if (!/^\d{5,20}$/.test(id)) return;

  defineStub(window);

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('.js-register') : null;
    if (link && link.getAttribute('aria-disabled') !== 'true') window.fbq('track', 'Lead');
  });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    FIRST_INTERACTION.forEach((name) => window.removeEventListener(name, start));
    const script = document.createElement('script');
    script.async = true;
    script.src = PIXEL_SRC;
    document.head.appendChild(script);
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  };
  FIRST_INTERACTION.forEach((name) => window.addEventListener(name, start, { once: true, passive: true }));
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 2500);
}
