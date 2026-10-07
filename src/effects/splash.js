const FALLBACK_MS = 1500;

/** CSS owns the fade (index.html #splash-css). JS only removes the node. */
export function initSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const remove = () => splash.remove();
  splash.addEventListener('animationend', (e) => {
    if (e.target === splash && e.animationName === 'splash-out') remove();
  });
  setTimeout(remove, FALLBACK_MS);
}
