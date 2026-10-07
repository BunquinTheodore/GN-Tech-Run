const MAX_DPR = 1.5;
const MOBILE_FPS_CAP = 30;
const WARMUP_FRAMES = 20;
const MEASURE_FRAMES = 90;
const MIN_FPS = 24;
const MIN_FPS_IN_APP = 30;
const RESIZE_DEBOUNCE_MS = 150;
const GRID_DESKTOP = { cols: 80, rows: 40 };
const GRID_MOBILE = { cols: 48, rows: 25 };
const IN_APP_UA = /FBAN|FBAV|Instagram/i;

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uScale;
  attribute float aSeed;
  varying float vMix;
  void main() {
    vec3 p = position;
    float wave = sin(p.x * 0.35 + uTime * 0.6) * 0.55 + cos(p.z * 0.45 + uTime * 0.45) * 0.45;
    p.y += wave + sin(aSeed * 40.0 + uTime * 0.8) * 0.08;
    vMix = clamp(0.5 + wave * 0.5, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.6 + aSeed * 1.8) * uScale * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vMix;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.15, d) * 0.55;
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), alpha);
  }
`;

let session = null;

const noop = () => {};

function setDebug(state, reason, fps) {
  if (!new URLSearchParams(location.search).has('debug')) return;
  window.__bg = { state, reason, fps: fps == null ? null : Math.round(fps * 10) / 10 };
}

function setMode(mode, reason, fps) {
  document.documentElement.dataset.bg = mode;
  setDebug(mode, reason, fps);
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Decide before importing three. Returns a reason string, or '' when 3D may run. */
function degradeReason() {
  const params = new URLSearchParams(location.search);
  if (params.get('bg') === 'off') return 'query-off';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced-motion';
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return 'low-cpu';
  if (navigator.deviceMemory && navigator.deviceMemory <= 4) return 'low-memory';
  if (!hasWebGL()) return 'no-webgl';
  return '';
}

function isMobileDevice() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

function buildPoints(THREE, grid, spacing) {
  const count = grid.cols * grid.rows;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  let i = 0;
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      positions[i * 3] = (c - grid.cols / 2) * spacing + (Math.random() - 0.5) * spacing * 0.6;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (r - grid.rows / 2) * spacing + (Math.random() - 0.5) * spacing * 0.6;
      seeds[i] = Math.random();
      i += 1;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return geometry;
}

async function start(canvas) {
  const THREE = await import('./three-subset.js');
  const { WebGLRenderer, Scene, PerspectiveCamera, ShaderMaterial, Points, Color } = THREE;

  const mobile = isMobileDevice();
  const inApp = IN_APP_UA.test(navigator.userAgent);
  const minFps = inApp ? MIN_FPS_IN_APP : MIN_FPS;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 7, 16);
  camera.lookAt(0, -1, 0);

  const geometry = buildPoints(THREE,mobile ? GRID_MOBILE : GRID_DESKTOP, mobile ? 1.1 : 0.8);
  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: dpr * 60 },
      uColorA: { value: new Color(0x4f9bff) },
      uColorB: { value: new Color(0x1d6fe8) },
    },
  });
  const points = new Points(geometry, material);
  scene.add(points);

  const state = { rafId: 0, paused: false, frames: 0, measureStart: 0, lastRender: 0, shown: false, disposed: false };
  const frameGap = 1000 / MOBILE_FPS_CAP;

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, RESIZE_DEBOUNCE_MS);
  };

  const cancelLoop = () => {
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  };

  const teardown = (reason, fps) => {
    if (state.disposed) return;
    state.disposed = true;
    cancelLoop();
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    scene.remove(points);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    setMode('static', reason, fps);
    session = null;
  };

  const frame = (now) => {
    state.rafId = requestAnimationFrame(frame);
    const measuring = state.frames < WARMUP_FRAMES + MEASURE_FRAMES;
    if (!measuring && mobile && now - state.lastRender < frameGap - 2) return;
    state.lastRender = now;
    material.uniforms.uTime.value = now / 1000;
    renderer.render(scene, camera);
    state.frames += 1;

    if (state.frames === WARMUP_FRAMES) state.measureStart = now;
    if (state.frames === 1 && !state.shown) {
      state.shown = true;
      setMode('3d', 'ok', null);
    }
    if (state.frames === WARMUP_FRAMES + MEASURE_FRAMES) {
      const fps = (MEASURE_FRAMES * 1000) / (now - state.measureStart);
      if (fps < minFps) teardown(inApp ? 'low-fps-in-app' : 'low-fps', fps);
      else setDebug('3d', 'ok', fps);
    }
  };

  const run = () => {
    if (state.disposed || state.paused || document.hidden || state.rafId) return;
    state.rafId = requestAnimationFrame(frame);
  };
  const stop = () => cancelLoop();

  function onVisibility() {
    if (document.hidden) {
      // rAF pauses while hidden: restart the FPS sample so hidden time is not counted as slow frames.
      if (state.frames < WARMUP_FRAMES + MEASURE_FRAMES) state.frames = 0;
      stop();
    } else run();
  }
  function onLost(event) {
    event.preventDefault();
    state.paused = true;
    stop();
  }
  function onRestored() {
    state.paused = false;
    run();
  }

  resize();
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  session = { dispose: () => teardown('disposed', null) };
  run();
}

export function initBackground3D() {
  const canvas = document.getElementById('bg3d');
  if (!canvas || session) return;
  const reason = degradeReason();
  if (reason) {
    setMode('static', reason, null);
    return;
  }
  start(canvas).catch(() => {
    if (session) session.dispose();
    setMode('static', 'init-error', null);
  });
}

export function disposeBackground3D() {
  (session ? session.dispose : noop)();
}
