import config from '../lib/config.js';
import { getRegistrationState, parseDate } from '../lib/utm.js';

const TICK_MS = 1000;
const LABEL_REFRESH_MS = 60000;
const pad = (n) => String(n).padStart(2, '0');

export function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

export function initCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;
  const target = parseDate(config.event?.dateISO);
  if (!target || getRegistrationState() === 'closed') {
    el.hidden = true;
    return;
  }

  let timer = 0;
  let heroVisible = true;
  let lastLabel = 0;

  const stop = () => {
    clearInterval(timer);
    timer = 0;
  };
  const render = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      el.textContent = 'Event started';
      el.setAttribute('aria-label', 'Event started');
      stop();
      return;
    }
    el.textContent = formatRemaining(diff);
    const now = Date.now();
    if (now - lastLabel >= LABEL_REFRESH_MS) {
      lastLabel = now;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      el.setAttribute('aria-label', `Starts in ${days} days, ${hours} hours, ${minutes} minutes`);
    }
  };
  const sync = () => {
    if (target.getTime() <= Date.now()) render();
    const shouldRun = heroVisible && !document.hidden && target.getTime() > Date.now();
    if (shouldRun && !timer) {
      render();
      timer = setInterval(render, TICK_MS);
    } else if (!shouldRun && timer) {
      stop();
    }
  };

  el.hidden = false;
  render();
  document.addEventListener('visibilitychange', sync);
  const hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[entries.length - 1].isIntersecting;
      sync();
    }).observe(hero);
  }
  sync();
}
