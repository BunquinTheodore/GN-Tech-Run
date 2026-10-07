const WORD_STAGGER_MS = 35;
const SETTLE_FALLBACK_MS = 1200;
const SPLIT_SELECTOR = '[data-split]';
const REVEAL_SELECTOR = '[data-reveal]';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Wraps each word in an aria-hidden span; the heading keeps its text via aria-label. */
function splitHeading(heading) {
  if (heading.dataset.splitDone) return;
  const text = heading.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return;
  heading.setAttribute('aria-label', text);
  heading.dataset.splitDone = '1';
  const fragment = document.createDocumentFragment();
  text.split(' ').forEach((word, index) => {
    if (index > 0) fragment.appendChild(document.createTextNode(' '));
    const span = document.createElement('span');
    span.className = 'split-word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', String(index));
    span.textContent = word;
    fragment.appendChild(span);
  });
  heading.textContent = '';
  heading.appendChild(fragment);
}

/** Drops will-change once the transition is over. */
function settleWhenDone(el) {
  const done = () => el.classList.add('is-settled');
  el.addEventListener('transitionend', (e) => e.target === el && done(), { once: true });
  setTimeout(done, SETTLE_FALLBACK_MS);
}

export function initReveal() {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const headings = [...document.querySelectorAll(SPLIT_SELECTOR)];
  headings.forEach(splitHeading);
  const targets = [...headings, ...document.querySelectorAll(REVEAL_SELECTOR)];
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        entry.target.classList.add('is-revealed');
        settleWhenDone(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );

  const root = document.documentElement;
  root.style.setProperty('--word-stagger', `${WORD_STAGGER_MS}ms`);
  root.classList.add('js-reveal');
  targets.forEach((el) => observer.observe(el));
}
