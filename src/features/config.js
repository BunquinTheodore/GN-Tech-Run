import config from '../lib/config.js';
import { buildRegisterUrl, formatEventDate, getRegistrationState, parseDate } from '../lib/utm.js';

const MAX_FAQ = 5;
const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };

const byId = (id) => document.getElementById(id);
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setText(id, text) {
  const node = byId(id);
  if (!node) return;
  node.textContent = text;
  node.hidden = !text;
}

function bindHero(tba) {
  const { event } = config;
  const date = formatEventDate(event.dateISO, { withTime: true });
  const venue = clean(event.venue?.name);
  setText('hero-date', date || tba);
  setText('hero-venue', venue);
  setText('hero-tagline', clean(event.tagline));
  setText('about-text', clean(event.about));
}

function detailCard(label, wide) {
  const card = el('div', `detail-card${wide ? ' detail-card--wide' : ''}`);
  card.setAttribute('data-reveal', '');
  card.appendChild(el('h3', 'detail-card__label', label));
  return card;
}

function valueCard(label, value, tba) {
  const card = detailCard(label);
  card.appendChild(el('p', value ? 'detail-card__value' : 'detail-card__value is-tba', value || tba));
  return card;
}

function venueCard(tba) {
  const venue = config.event.venue || {};
  const name = clean(venue.name);
  const card = detailCard('Venue');
  const value = el('p', name ? 'detail-card__value' : 'detail-card__value is-tba');
  if (name && clean(venue.mapUrl)) {
    const link = el('a', '', name);
    link.href = venue.mapUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    value.appendChild(link);
  } else {
    value.textContent = name || tba;
  }
  card.appendChild(value);
  if (name && clean(venue.address)) card.appendChild(el('p', 'detail-card__note', venue.address));
  return card;
}

function chipCard(label, chips, rowClass) {
  const card = detailCard(label, true);
  const row = el('ul', rowClass);
  chips.forEach((text) => row.appendChild(el('li', 'chip', text)));
  card.appendChild(row);
  return card;
}

function renderDetails(tba) {
  const grid = byId('details-grid');
  if (!grid) return;
  const { event } = config;
  const cards = [
    valueCard('Date', formatEventDate(event.dateISO, { withTime: true }), tba),
    venueCard(tba),
    valueCard('Fee', clean(event.fee), tba),
    valueCard('Deadline', formatEventDate(event.deadlineISO), tba),
  ];
  const categories = (event.categories || [])
    .map((c) => [clean(c?.label), clean(c?.distance)].filter(Boolean).join(' · '))
    .filter(Boolean);
  if (categories.length) cards.push(chipCard('Categories', categories, 'chip-row chip-row--wrap'));
  const inclusions = (event.inclusions || []).map(clean).filter(Boolean);
  if (inclusions.length) cards.push(chipCard('Inclusions', inclusions, 'chip-row chip-row--swipe'));
  grid.replaceChildren(...cards);
}

function renderFaq() {
  const list = byId('faq-list');
  const section = byId('faq');
  if (!list) return;
  const items = (config.faq || []).filter((item) => clean(item?.q) && clean(item?.a)).slice(0, MAX_FAQ);
  list.replaceChildren(
    ...items.map((item) => {
      const details = el('details', 'faq__item');
      details.setAttribute('data-reveal', '');
      details.appendChild(el('summary', '', item.q));
      details.appendChild(el('p', 'faq__answer', item.a));
      return details;
    })
  );
  if (section) section.hidden = items.length === 0;
}

function renderSocials() {
  const list = byId('social-links');
  if (!list) return;
  const items = Object.entries(SOCIAL_LABELS)
    .filter(([key]) => clean(config.socials?.[key]))
    .map(([key, label]) => {
      const item = el('li');
      const link = el('a', '', label);
      link.href = config.socials[key];
      link.target = '_blank';
      link.rel = 'noopener';
      item.appendChild(link);
      return item;
    });
  list.replaceChildren(...items);
  list.hidden = items.length === 0;
}

function bindRegister(state) {
  const url = buildRegisterUrl();
  const ui = config.ui || {};
  document.querySelectorAll('.js-register').forEach((link) => {
    if (state === 'open') {
      link.textContent = ui.registerLabel || 'Register Now';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.removeAttribute('aria-disabled');
    } else {
      link.textContent = state === 'closed' ? ui.closedLabel : ui.soonLabel;
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.setAttribute('aria-disabled', 'true');
    }
  });
}

function bindDeadline(state) {
  const deadline = formatEventDate(config.event.deadlineISO);
  setText('deadline-text', state === 'open' && deadline ? `Register by ${deadline}.` : '');
}

function bindDisclaimer() {
  setText('disclaimer', clean(config.ui?.disclaimer));
}

function injectJsonLd() {
  const { event, siteUrl } = config;
  const start = parseDate(event.dateISO);
  if (!start || !event.name || !clean(event.venue?.name) || !clean(siteUrl) || byId('jsonld')) return;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    startDate: event.dateISO,
    location: { '@type': 'Place', name: event.venue.name, address: clean(event.venue.address) || event.venue.name },
    url: siteUrl,
  };
  if (parseDate(event.endISO)) data.endDate = event.endISO;
  if (clean(config.seo?.description)) data.description = config.seo.description;
  const script = el('script');
  script.id = 'jsonld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function initConfig() {
  const tba = clean(config.ui?.tbaLabel) || 'To be announced';
  const state = getRegistrationState();
  document.documentElement.dataset.registration = state;
  bindHero(tba);
  renderDetails(tba);
  renderFaq();
  renderSocials();
  bindRegister(state);
  bindDeadline(state);
  bindDisclaimer();
  injectJsonLd();
  const drive = byId('video-drive-link');
  const id = clean(config.video?.driveFileId);
  if (drive && id) drive.href = `https://drive.google.com/file/d/${id}/view`;
}
