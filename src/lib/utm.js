import config from './config.js';

const TZ = 'Asia/Manila';
const PASS_THROUGH = /^(utm_[a-z0-9_]+|fbclid)$/i;

/** Effective registration state per CONTRACT: 'open' | 'closed' | 'soon'. */
export function getRegistrationState(cfg = config) {
  if (!cfg.registrationOpen) return 'closed';
  return cfg.registration?.monnoUrl ? 'open' : 'soon';
}

/** Monno URL with default UTMs (never overwriting existing) and incoming utm_*, fbclid (incoming wins). '' when no URL. */
export function buildRegisterUrl(cfg = config, search = typeof location !== 'undefined' ? location.search : '') {
  const base = cfg.registration?.monnoUrl;
  if (!base) return '';
  let url;
  try {
    url = new URL(base);
  } catch {
    return '';
  }
  const utm = cfg.registration.utm || {};
  [['utm_source', utm.source], ['utm_medium', utm.medium], ['utm_campaign', utm.campaign]].forEach(([key, value]) => {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  });
  new URLSearchParams(search).forEach((value, key) => {
    if (PASS_THROUGH.test(key)) url.searchParams.set(key, value);
  });
  return url.toString();
}

export function parseDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const formatter = (options) => {
  try {
    return new Intl.DateTimeFormat('en-PH', { timeZone: TZ, ...options });
  } catch {
    return new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options });
  }
};

/** "Sat, Mar 14, 2026" (+ ", 5:00 AM" when withTime), Asia/Manila. '' when invalid. */
export function formatEventDate(iso, { withTime = false } = {}) {
  const date = parseDate(iso);
  if (!date) return '';
  const day = formatter({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  if (!withTime) return day;
  return `${day}, ${formatter({ hour: 'numeric', minute: '2-digit' }).format(date)}`;
}

export const isInAppBrowser = () => /FBAN|FBAV|Instagram/i.test(navigator.userAgent || '');
