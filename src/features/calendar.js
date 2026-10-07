import config from '../lib/config.js';
import { buildRegisterUrl, isInAppBrowser, parseDate } from '../lib/utm.js';

// Technical default only used when config has no endISO: a calendar entry needs an end.
const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

const toUtcStamp = (date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
const escapeText = (text) => String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

function fold(line) {
  const parts = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

export function getEventDetails(cfg = config) {
  const start = parseDate(cfg.event?.dateISO);
  if (!start) return null;
  const end = parseDate(cfg.event.endISO) || new Date(start.getTime() + DEFAULT_DURATION_MS);
  const venue = cfg.event.venue || {};
  const location = [venue.name, venue.address].filter(Boolean).join(', ');
  const link = buildRegisterUrl(cfg, '');
  const description = [cfg.event.tagline, link && `Register: ${link}`].filter(Boolean).join('\n');
  return { title: cfg.event.name || 'Tech Run', start, end, location, description };
}

export function buildIcs(details) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tech Run//Landing//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${toUtcStamp(details.start)}-techrun@${location.hostname || 'techrun'}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(details.start)}`,
    `DTEND:${toUtcStamp(details.end)}`,
    `SUMMARY:${escapeText(details.title)}`,
  ];
  if (details.location) lines.push(`LOCATION:${escapeText(details.location)}`);
  if (details.description) lines.push(`DESCRIPTION:${escapeText(details.description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function buildGoogleUrl(details) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${toUtcStamp(details.start)}/${toUtcStamp(details.end)}`,
  });
  if (details.location) params.set('location', details.location);
  if (details.description) params.set('details', details.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(details) {
  const blob = new Blob([buildIcs(details)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'tech-run.ics';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function initCalendar() {
  const icsButton = document.getElementById('cal-ics');
  const googleLink = document.getElementById('cal-google');
  const details = getEventDetails();
  if (!details) {
    [icsButton, googleLink].forEach((el) => {
      if (el) el.hidden = true;
    });
    return;
  }

  const googleUrl = buildGoogleUrl(details);
  if (googleLink) googleLink.href = googleUrl;
  if (!icsButton) return;

  const canDownload = typeof Blob === 'function' && typeof URL?.createObjectURL === 'function' && 'download' in document.createElement('a');
  icsButton.addEventListener('click', () => {
    if (isInAppBrowser() || !canDownload) {
      window.open(googleUrl, '_blank', 'noopener');
      return;
    }
    try {
      downloadIcs(details);
    } catch {
      window.open(googleUrl, '_blank', 'noopener');
    }
  });
}
