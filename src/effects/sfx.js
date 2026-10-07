const STORAGE_KEY = 'techrun:muted';
const TARGET_SELECTOR = 'a, button, summary, label, [role="button"], .btn';
const TICK_GAIN = 0.05;
const TICK_SECONDS = 0.065;
const TICK_FREQ_START = 1320;
const TICK_FREQ_END = 880;
const POINTER_CLICK_WINDOW_MS = 800;

const ICON_ON =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICON_OFF =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';

let audioCtx = null;
let muted = false;
let lastPointerTick = 0;

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* storage blocked: preference lasts for this page view only */
  }
}

/** Created lazily, only from inside a user-gesture handler. */
function getContext() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

/** Resumes from a click, the activation iOS and in-app WebViews accept. */
function resumeContext() {
  try {
    if (!muted) getContext()?.resume?.();
  } catch {
    /* audio is optional */
  }
}

function tick() {
  if (muted) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(TICK_FREQ_START, t);
    osc.frequency.exponentialRampToValueAtTime(TICK_FREQ_END, t + TICK_SECONDS);
    gain.gain.setValueAtTime(TICK_GAIN, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + TICK_SECONDS);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + TICK_SECONDS + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {
    /* audio is optional: never surface errors */
  }
}

function paintToggle(button) {
  button.setAttribute('aria-pressed', String(muted));
  button.setAttribute('aria-label', 'Mute sound effects');
  button.innerHTML = muted ? ICON_OFF : ICON_ON;
}

function matchTarget(event, toggle) {
  const el = event.target instanceof Element ? event.target.closest(TARGET_SELECTOR) : null;
  if (!el || (toggle && toggle.contains(el))) return null;
  if (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return null;
  return el;
}

export function initSfx() {
  muted = readMuted();
  const toggle = document.getElementById('mute-toggle');

  if (toggle) {
    paintToggle(toggle);
    toggle.addEventListener('click', () => {
      muted = !muted;
      writeMuted(muted);
      paintToggle(toggle);
      if (!muted) tick();
    });
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button > 0 || !matchTarget(event, toggle)) return;
      lastPointerTick = performance.now();
      tick();
    },
    { capture: true, passive: true }
  );

  document.addEventListener(
    'click',
    (event) => {
      if (!matchTarget(event, toggle)) return;
      const fromPointer = event.detail !== 0 && performance.now() - lastPointerTick < POINTER_CLICK_WINDOW_MS;
      if (!fromPointer) tick();
      else resumeContext();
    },
    { capture: true, passive: true }
  );
}
