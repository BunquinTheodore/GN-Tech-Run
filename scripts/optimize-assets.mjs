// Asset pipeline: reads ./assets (or --assets <dir>), writes public/** and src/generated/images.json.
// Anything missing is replaced by a clearly labeled white + blue PLACEHOLDER. Idempotent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argIdx = process.argv.indexOf('--assets');
const ASSETS = path.resolve(argIdx > -1 ? process.argv[argIdx + 1] : path.join(ROOT, 'assets'));
const PUBLIC = path.join(ROOT, 'public');
const IMG = path.join(PUBLIC, 'img');
const CURSOR_DIR = path.join(PUBLIC, 'cursor');
const JSON_OUT = path.join(ROOT, 'src', 'generated', 'images.json');
const CURSOR_FALLBACK = 'C:/Users/THEODORE VON JOSHUA/Downloads/icons8-cursor.svg';

const HERO_WIDTHS = [480, 768, 1080, 1600];
const GALLERY_WIDTHS = [480, 800, 1200];
const MAX_GALLERY = 12;
const PLACEHOLDER_PHOTOS = 7;
const WEBP_Q = 72;
const AVIF_Q = 55;
const RASTER_EXT = /\.(jpe?g|png|webp|avif|tiff?)$/i;

const report = [];
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
const exists = (p) => fs.existsSync(p);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

function track(file, note = '') {
  report.push({ file: rel(file), size: fs.statSync(file).size, note });
}

function cleanDir(dir, keep = () => false) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (!keep(f)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
}

function minifySvg(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function svgSize(svg) {
  const w = /<svg[^>]*\swidth="([\d.]+)/.exec(svg);
  const h = /<svg[^>]*\sheight="([\d.]+)/.exec(svg);
  if (w && h) return { width: Math.round(+w[1]), height: Math.round(+h[1]) };
  const vb = /viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/.exec(svg);
  return vb ? { width: Math.round(+vb[1]), height: Math.round(+vb[2]) } : { width: 160, height: 48 };
}

// ---------- logos ----------
function placeholderLogo(text, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${text} (placeholder)"><rect width="${w}" height="${h}" rx="10" fill="#fff" stroke="#1D6FE8" stroke-width="2"/><text x="${w / 2}" y="${h * 0.58}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${h * 0.42}" fill="#0B3A8C">${text}</text><text x="${w / 2}" y="${h * 0.86}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${Math.max(8, h * 0.15)}" letter-spacing="1.5" fill="#4F9BFF">PLACEHOLDER</text></svg>`;
}

async function buildLogo({ key, outBase, srcBase, text, w, h, alt }) {
  const svgSrc = path.join(ASSETS, 'logos', `${srcBase}.svg`);
  const pngSrc = path.join(ASSETS, 'logos', `${srcBase}.png`);
  let placeholder = false;
  let outFile;
  let size;
  let svgText = null;
  if (exists(svgSrc)) {
    svgText = minifySvg(fs.readFileSync(svgSrc, 'utf8'));
    outFile = path.join(IMG, `${outBase}.svg`);
    fs.writeFileSync(outFile, svgText);
    size = svgSize(svgText);
  } else if (exists(pngSrc)) {
    outFile = path.join(IMG, `${outBase}.png`);
    const buf = await sharp(pngSrc).resize({ width: 600, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer();
    fs.writeFileSync(outFile, buf);
    const m = await sharp(buf).metadata();
    size = { width: m.width, height: m.height };
  } else {
    placeholder = true;
    svgText = placeholderLogo(text, w, h);
    outFile = path.join(IMG, `${outBase}.svg`);
    fs.writeFileSync(outFile, svgText);
    size = { width: w, height: h };
  }
  track(outFile, placeholder ? 'PLACEHOLDER' : '');
  const ext = path.extname(outFile);
  return { key, placeholder, svgText, entry: { src: `/img/${outBase}${ext}`, ...size, alt } };
}

// ---------- photos ----------
function placeholderPhotoSvg(n) {
  const w = 1600, h = 1067;
  const shade = ['#0B3A8C', '#1D6FE8', '#061C47', '#4F9BFF'][n % 4];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0F7FF"/><stop offset="0.55" stop-color="#B9D7FF"/><stop offset="1" stop-color="${shade}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${300 + n * 110}" cy="260" r="190" fill="#fff" fill-opacity="0.35"/><rect x="${w - 640}" y="${h - 420}" width="520" height="300" rx="36" fill="#1D6FE8" fill-opacity="0.45"/><polygon points="0,${h} 520,${h - 330} 980,${h}" fill="#0B3A8C" fill-opacity="0.55"/><text x="${w / 2}" y="${h / 2 + 30}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="110" fill="#fff" stroke="#061C47" stroke-width="2">PLACEHOLDER PHOTO ${n}</text></svg>`;
}

function listRealPhotos() {
  const dir = path.join(ASSETS, 'photos');
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => RASTER_EXT.test(f) && !/^placeholder-/i.test(f)).sort();
}

async function encodeSet(input, prefix, widths) {
  const meta = await sharp(input).rotate().metadata();
  const sw = meta.width;
  const made = widths.filter((w) => w <= sw);
  if (!made.length || !made.includes(Math.min(sw, widths[widths.length - 1]))) {
    // never upscale: if source is narrower than the smallest/largest target, also emit its own width
    if (!made.includes(sw) && sw < widths[widths.length - 1]) made.push(sw);
  }
  made.sort((a, b) => a - b);
  for (const w of made) {
    const base = () => sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    const webp = path.join(IMG, `${prefix}-${w}.webp`);
    const avif = path.join(IMG, `${prefix}-${w}.avif`);
    await base().webp({ quality: WEBP_Q, effort: 5 }).toFile(webp);
    await base().avif({ quality: AVIF_Q, effort: 4 }).toFile(avif);
    track(webp);
    track(avif);
  }
  const top = made[made.length - 1];
  const topMeta = await sharp(path.join(IMG, `${prefix}-${top}.webp`)).metadata();
  const list = (ext) => made.map((w) => `/img/${prefix}-${w}.${ext} ${w}w`).join(', ');
  const mid = made.includes(1080) ? 1080 : made.includes(800) ? 800 : top;
  return {
    src: `/img/${prefix}-${mid}.webp`,
    avifSrcset: list('avif'),
    webpSrcset: list('webp'),
    width: topMeta.width,
    height: topMeta.height,
  };
}

// ---------- cursor ----------
async function buildCursor() {
  const local = path.join(ASSETS, 'cursor', 'icons8-cursor.svg');
  const srcPath = exists(local) ? local : exists(CURSOR_FALLBACK) ? CURSOR_FALLBACK : null;
  fs.mkdirSync(CURSOR_DIR, { recursive: true });
  if (!srcPath) {
    console.warn('! cursor source not found; skipping cursor');
    return null;
  }
  const raw = fs.readFileSync(srcPath, 'utf8');
  const d = [...raw.matchAll(/\sd="([^"]+)"/g)]
    .map((m) => m[1])
    .join(' ')
    .replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10))
    .replace(/\s+/g, ' ');
  const vb = /viewBox="([^"]+)"/.exec(raw)?.[1] ?? '0 0 100 100';
  const path1 = `<path d="${d}"/>`;
  const hotspotSvg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="32" height="32">${path1.replace('<path', `<path fill="${fill}"`)}</svg>`;
  // Dark-blue glyph + white halo (paint-order stroke) so it reads on white and on dark-blue.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="32" height="32"><path fill="#061C47" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" d="${d}"/></svg>`;
  const out32 = path.join(CURSOR_DIR, 'cursor-32.svg');
  fs.writeFileSync(out32, svg);
  const out64 = path.join(CURSOR_DIR, 'cursor-64.png');
  await sharp(Buffer.from(svg.replace('width="32" height="32"', 'width="64" height="64"'))).resize(64, 64).png({ compressionLevel: 9 }).toFile(out64);
  track(out32, `${fs.statSync(out32).size < 2048 ? 'under 2KB' : 'OVER 2KB'}`);
  track(out64);

  // Hotspot: topmost, then leftmost opaque pixel of the glyph itself (no halo), rasterized at 32px.
  const { data, info } = await sharp(Buffer.from(hotspotSvg('#000'))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let hot = null;
  outer: for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 60) { hot = { x, y }; break outer; }
    }
  }
  const hotText = hot ? `${hot.x} ${hot.y}` : '8 3';
  fs.writeFileSync(path.join(CURSOR_DIR, 'HOTSPOT.txt'), `${hotText}\n`);
  return hot;
}

// ---------- favicons / og ----------
function faviconSvg(logo) {
  if (logo && !logo.placeholder && logo.svgText && Buffer.byteLength(logo.svgText) < 4096) return logo.svgText;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1D6FE8"/><text x="32" y="42" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="30" fill="#fff">TR</text></svg>';
}

async function buildIcons(logo, heroInput) {
  const fav = path.join(PUBLIC, 'favicon.svg');
  const svg = faviconSvg(logo);
  fs.writeFileSync(fav, svg);
  const mark = Buffer.from(faviconSvg(null));
  const f32 = path.join(PUBLIC, 'favicon-32.png');
  const apple = path.join(PUBLIC, 'apple-touch-icon.png');
  await sharp(mark, { density: 300 }).resize(32, 32).png({ compressionLevel: 9 }).toFile(f32);
  await sharp(mark, { density: 600 }).resize(180, 180).flatten({ background: '#1D6FE8' }).png({ compressionLevel: 9 }).toFile(apple);
  const og = path.join(PUBLIC, 'og.jpg');
  await sharp(heroInput).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }).toFile(og);
  [fav, f32, apple, og].forEach((f) => track(f));
}

// ---------- main ----------
async function main() {
  console.log(`assets dir: ${ASSETS}${exists(ASSETS) ? '' : ' (absent, using placeholders)'}`);
  cleanDir(IMG);
  cleanDir(CURSOR_DIR);
  for (const f of ['og.jpg', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']) fs.rmSync(path.join(PUBLIC, f), { force: true });

  const techrun = await buildLogo({ key: 'logoTechrun', outBase: 'logo-techrun', srcBase: 'techrun-logo', text: 'TECH RUN', w: 160, h: 48, alt: 'Tech Run' });
  const irun = await buildLogo({ key: 'logoIrun', outBase: 'logo-irunph', srcBase: 'irunph-logo', text: 'iRun PH', w: 120, h: 48, alt: 'iRun PH' });

  const real = listRealPhotos();
  let placeholder = techrun.placeholder || irun.placeholder;
  let sources;
  if (real.length) {
    const photoDir = path.join(ASSETS, 'photos');
    const hero = real.find((f) => /^hero\./i.test(f)) ?? real[0];
    const rest = real.filter((f) => f !== hero).slice(0, MAX_GALLERY);
    sources = [hero, ...rest].map((f) => ({ input: path.join(photoDir, f), name: f }));
  } else {
    placeholder = true;
    sources = [];
    for (let n = 1; n <= PLACEHOLDER_PHOTOS; n++) {
      sources.push({ input: Buffer.from(placeholderPhotoSvg(n)), name: `placeholder-${n}`, ph: n });
    }
  }
  const altMapPath = path.join(ASSETS, 'photos', 'alt.json');
  const altMap = exists(altMapPath) ? JSON.parse(fs.readFileSync(altMapPath, 'utf8')) : {};
  const altFor = (s, i) => altMap[s.name] ?? (s.ph ? `PLACEHOLDER photo ${s.ph}` : `Tech Run event photo ${i + 1}`);

  // Rasterize placeholder SVGs to a lossless PNG buffer once so every encoder sees the same pixels.
  for (const s of sources) if (s.ph) s.input = await sharp(s.input, { density: 144 }).resize(1600, 1067).png().toBuffer();

  const heroSet = await encodeSet(sources[0].input, 'hero', HERO_WIDTHS);
  const hero = { ...heroSet, alt: altFor(sources[0], 0) };
  const gallery = [];
  for (let i = 1; i < sources.length; i++) {
    const set = await encodeSet(sources[i].input, `g${i}`, GALLERY_WIDTHS);
    gallery.push({ ...set, alt: altFor(sources[i], i) });
  }

  await buildIcons(techrun, sources[0].input);
  const hot = await buildCursor();

  const images = { hero, logoTechrun: techrun.entry, logoIrun: irun.entry, gallery, placeholder };
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(images, null, 2)}\n`);

  console.log('\nFile'.padEnd(34) + 'Size'.padStart(10) + '  Note');
  let total = 0;
  for (const r of report) {
    total += r.size;
    console.log(r.file.padEnd(33) + kb(r.size).padStart(10) + `  ${r.note}`);
  }
  console.log(`\nTotal generated: ${kb(total)} | placeholder: ${placeholder} | cursor hotspot (32px): ${hot ? `${hot.x} ${hot.y}` : 'n/a'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
