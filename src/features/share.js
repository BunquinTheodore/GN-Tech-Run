import config from '../lib/config.js';

const TOAST_MS = 2000;
let toastTimer = 0;

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), TOAST_MS);
}

function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

async function copyLink(url) {
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) ok = legacyCopy(url);
  showToast(ok ? 'Link copied' : url);
}

async function share() {
  const url = config.siteUrl || location.href;
  const data = { title: config.seo?.title || config.event?.name || document.title, text: config.seo?.description || '', url };
  if (typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }
  }
  await copyLink(url);
}

export function initShare() {
  const button = document.getElementById('share-btn');
  if (!button) return;
  button.addEventListener('click', () => {
    share().catch(() => {});
  });
}
