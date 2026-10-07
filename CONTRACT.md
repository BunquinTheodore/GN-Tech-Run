# CONTRACT: file ownership, DOM, modules

CLAUDE.md is the binding spec. This file says who owns what so parallel agents never touch the same file.

## Ownership (edit ONLY your files)

| Owner | Files |
|---|---|
| Lead (done) | CLAUDE.md, CONTRACT.md, vite.config.js, vercel.json, package.json, .gitignore, event.config.json (structure), src/main.js, src/effects/splash.js, src/styles/tokens.css, src/styles/base.css, splash markup/CSS in index.html |
| Assets agent | `public/**`, `scripts/optimize-assets.mjs`, `src/generated/images.json` |
| Layout + features agent | rest of `index.html`, `src/styles/sections.css`, `src/styles/cursor.css`, `src/lib/*` (except config.js), `src/features/*.js` |
| Effects agent | `src/effects/{reveal,carousel,background3d,sfx}.js`, `src/styles/motion.css`, `src/styles/bg.css` |

Need a change in a file you don't own? Do NOT edit it. Put the request in your final summary; the lead integrates.
`npm install` is already done. Do not change package.json (lead adds deps; assets agent may `npm i -D` nothing, sharp is installed).

## Build-time tokens (vite.config.js)
`{{dotted.path}}` in index.html is replaced from `event.config.json` plus `img.*` from `src/generated/images.json`. `data-if="path"` on a tag removes it when empty. Empty values are warned at build. Never hardcode event data in HTML or JS.

## Config shape (event.config.json)
`registrationOpen`, `siteUrl`, `seo.{title,description}`, `event.{name,tagline,about,dateISO,endISO,venue{name,address,mapUrl},categories[],fee,deadlineISO,inclusions[]}`, `registration.{monnoUrl,utm{source,medium,campaign}}`, `video.driveFileId`, `tracking.metaPixelId`, `socials{facebook,instagram,tiktok,youtube}`, `faq[{id,q,a}]`, `ui.{registerLabel,closedLabel,soonLabel,tbaLabel,disclaimer}`.
`categories` items: `{ "label": string, "distance": string }`. Empty value means render `ui.tbaLabel` (details cards) or hide (FAQ items, socials, optional cards). Never invent.
Effective registration state: `open = registrationOpen && monnoUrl`. If `registrationOpen` is false: all `.js-register` show `ui.closedLabel` with `aria-disabled="true"`, no href, countdown + `#sticky-bar` hidden. If open flag true but `monnoUrl` empty: label `ui.soonLabel`, same disabled look, sticky bar hidden.

## Images contract (`src/generated/images.json`, written by Assets agent)
```
hero:  { src, avifSrcset, webpSrcset, width, height, alt }   // widths 480/768/1080/1600 in /img/
logoTechrun / logoIrun: { src, width, height, alt }          // /img/logo-techrun.(svg|png), /img/logo-irunph.(svg|png)
gallery: [ { src, avifSrcset, webpSrcset, width, height, alt } ]
placeholder: true | false   // true while any asset is a generated placeholder
```
Fixed public paths: `/fonts/poppins-{400,600,700}.woff2`, `/favicon.svg`, `/favicon-32.png`, `/apple-touch-icon.png`, `/og.jpg` (1200x630), `/cursor/cursor-32.svg`, `/cursor/cursor-64.png`.
Gallery is rendered by `initCarousel` from `import images from '../generated/images.json'`.

## DOM IDs / classes (index.html already has them; agents fill, don't rename)
Global: `#splash`, `.skip-link`, `#bg-fallback` (static gradient, always the base layer), `#bg3d` (canvas), `#toast`.
Header: `#site-header`, `#logo-techrun`, `#logo-irun`, `#mute-toggle` (button, `aria-pressed`, icon drawn by sfx/CSS), `#header-register`.
Hero: `#hero`, `#hero-img`, `#hero-title`, `#hero-date`, `#hero-venue`, `#hero-tagline`, `#hero-register`, `#watch-video`, `#countdown`.
About: `#about`, `#about-text`, `#details-grid`, `#cal-ics`, `#cal-google`, `#share-btn`.
Gallery: `#gallery`, `#photo-strip` (viewport), `#strip-track`.
FAQ: `#faq`, `#faq-list` (JS renders native `<details><summary>`), max 5, hide empty answers.
CTA: `#cta`, `#deadline-text`, `#final-register`.
Footer: `#site-footer`, `#social-links`, `#disclaimer`, Icons8 credit link.
Sticky: `#sticky-bar` (`hidden` attr toggled), `#sticky-register`.
Video: `#video-modal` (`<dialog>`), `#video-close`, `#video-stage`, `#video-play` (thumbnail button), `#video-drive-link`.
Hooks: every Register link has class `js-register`. Headings to split carry `data-split`. Blocks to soft-reveal carry `data-reveal` (generated elements from initConfig must add `data-reveal` themselves). Cards inside `#details-grid` use `.detail-card`.

## CSS variables
Defined in `tokens.css`: `--white --blue-50 --blue-100 --blue-200 --blue-400 --blue-600 --blue-800 --blue-950`, `--text --text-soft --surface --surface-alt --border --accent`, `--font`, `--fs-*`, `--space-*`, `--radius`, `--btn-h` (3rem), `--header-h`, `--sticky-h`, `--safe-*`, `--shadow`, `--ease`. Do not add colors outside white + blue. Base buttons `.btn .btn--primary|--ghost|--sm|--lg` and `.icon-btn` live in base.css; extend in sections.css only.
Class names to use in sections.css: `.site-header .header__inner .header__brand .header__actions .logo`, `.hero .hero__media .hero__content .hero__title .hero__meta .hero__pitch .hero__actions .countdown`, `.about .details-grid .detail-card .about__actions`, `.strip .strip__viewport .strip__track .strip__slide`, `.faq .faq__list`, `.final-cta`, `.site-footer .footer__inner .footer__logos .socials .footer__note`, `.sticky-bar`, `.modal .modal__panel .modal__close .modal__stage .modal__thumb .modal__fallback`, `.toast`.
Effects CSS: `bg.css` owns `.bg-fallback .bg3d`; `motion.css` owns `.split-word .split-char [data-reveal] .is-revealed .strip__track animation`.

## JS modules and init functions (called from main.js in this order)
1. `initSplash()` (effects/splash.js, lead, done)
2. `initConfig()` (features/config.js): bind config into DOM, render details cards, FAQ, socials, deadline text, set Register labels/state/hrefs via `src/lib/utm.js` `buildRegisterUrl()`, Drive link, `.js-register` closed state. Must be idempotent and safe on empty values.
3. `initTracking()` (features/tracking.js): Meta Pixel on idle or first interaction, PageView, Lead on every `.js-register` click via delegated listener, never `preventDefault`, no-op without Pixel ID.
4. `initCountdown()`, 5. `initCalendar()`, 6. `initShare()`, 7. `initStickyBar()`, 8. `initVideoModal()` (all features/)
9. `initReveal()` (effects/reveal.js): split-text on `[data-split]`, IntersectionObserver reveal on `[data-reveal]`, once, transform + opacity only, 200-600ms; no-op visuals under reduced motion (content must stay visible).
10. `initCarousel()` (effects/carousel.js)
11. `initSfx()` (effects/sfx.js): delegated click/tap tick on `a, button, summary, label, [role=button]`, AudioContext only after first gesture, mute toggle bound to `#mute-toggle`, localStorage in try/catch, never delays navigation.
12. `initBackground3D()` (effects/background3d.js): called on idle after `load`; lazy `import('three')` inside; degrade rules in CLAUDE.md; export a `dispose` path.

Each init must be wrapped to never throw into main.js and must tolerate missing DOM nodes.

## Register URL rule (src/lib/utm.js, features agent)
`buildRegisterUrl()`: start from `registration.monnoUrl`, set `utm_source/medium/campaign` from config (do not overwrite UTM already in the URL), then copy every incoming `utm_*` and `fbclid` from `location.search` (incoming wins). Returns '' when no monnoUrl. Links get `target="_blank" rel="noopener"`.

## Final summary format each agent returns
Under 15 lines: files created/changed, anything NOT done, any contract change requested from the lead, any measured sizes. No file dumps.
