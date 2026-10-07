# Tech Run landing page: standing rules

## Project
Single-page landing page for Tech Run (co-presented with iRun PH). One job: get visitors to register on Monno. Mobile-first. Most traffic comes from Facebook/Instagram in-app browsers on mid-range Philippine phones, often on slow connections.

## Stack
Vite + vanilla JS + plain CSS. No React/Next. Three.js is tree-shaken and lazy-loaded. Deployed on Vercel from `main`.

## Data lives in event.config.json
Date (ISO with +08:00 offset), venue, categories, fee, deadline, inclusions, Monno URL, Drive video ID, Meta Pixel ID, social links, FAQ answers, `registrationOpen` flag. Never hardcode these in HTML or JS. If `registrationOpen` is false, every Register CTA becomes a "Registration closed" state and the countdown and sticky bar hide.

## Design
- Palette: white + shades of blue only, as CSS custom properties: --white #FFFFFF, --blue-50 #F0F7FF, --blue-100 #DCEBFF, --blue-200 #B9D7FF, --blue-400 #4F9BFF, --blue-600 #1D6FE8, --blue-800 #0B3A8C, --blue-950 #061C47. Refine to match the Tech Run logo but stay in white + blue. All text/background pairs meet WCAG AA.
- Font: Poppins only. Self-hosted WOFF2, Latin subset, 400/600/700, font-display: swap, primary weight preloaded. No Google Fonts request.
- Titles on one line wherever possible: clamp() sizing tuned for 360px, white-space: nowrap on short headings. If a title can't fit, text-wrap: balance, never an orphan word.
- Paragraphs: max-width 60-65ch, line-height 1.6-1.7, text-wrap: pretty, left-aligned, 2-4 lines on mobile.
- Nothing under 14px anywhere, body 16px minimum on mobile, buttons at least 48px tall. No tiny gray text.
- Use dvh/svh units, never plain 100vh (in-app browsers break it). Respect env(safe-area-inset-*).

## Page length (strict)
About 4-5 screens on mobile, 3-4 on desktop, never more than 5 on mobile. Merge sections, keep copy tight (About = 2-3 short sentences). Lists become compact cards (2 columns) or a swipe row. ALL images move sideways, never stacked vertically.

## Page structure
1. Sticky header: Tech Run logo, iRun PH logo, mute toggle, Register Now
2. Hero (~1 screen): best photo, event name on one line, date + venue, one-line pitch, Register CTA visible without scrolling, countdown (one line), Watch video button
3. About + event details (merged): 2-3 sentences, compact detail cards, "Add to calendar" and "Share" buttons
4. Photo strip: one horizontal auto-drifting gallery (CSS transform loop, swipeable, pauses on touch/hover/focus, edge fade, reduced-motion = manual swipe only)
5. FAQ: collapsed accordion (native <details>), 5 items max
6. Final CTA + footer: Register with deadline, logos in one row, socials, disclaimer, "Cursor by Icons8" credit (14px+)
Plus a mobile-only sticky bottom Register bar.

## Effects
- Splash: shows on every open/refresh, ~1s, "Tech Run" title with a text animation, then fades and is removed from the DOM. Inline HTML/CSS, CSS does the fade, JS only removes the node. Must not block LCP or cause layout shift.
- Text animations: split-text on headings, soft reveals on paragraphs/cards (IntersectionObserver, once). Only transform and opacity, 200-600ms.
- Three.js background: fixed canvas, pointer-events: none, blue particles or low-poly wave, loaded on idle after first paint. DPR cap 1.5, antialias off on mobile, 30 FPS cap on mobile, pause when hidden. Auto-degrade to a static CSS blue gradient and dispose the renderer if hardwareConcurrency <= 4, deviceMemory <= 4, reduced motion, no WebGL, or FPS < ~24. Also use the gradient fallback inside Facebook/Instagram in-app browsers (UA contains FBAN, FBAV or Instagram) if FPS can't hold 30.
- SFX: Web Audio synthesized tick (~50-80ms) on every click/tap, AudioContext created only after the first gesture, low volume, mute toggle saved in localStorage (try/catch). Audio must never delay navigation.
- Everything respects prefers-reduced-motion.

## Custom cursor (CSS only)
Use icons8-cursor.svg site-wide via native CSS cursor, no JS follower. Must explicitly cover links, buttons, summary, label, video, modal and carousel. Resize to 32x32, keep under 2KB, hotspot at the arrow tip (about 8,3), 64px PNG for 2x. Scope to @media (hover: hover) and (pointer: fine).

## Conversion features
- Sticky bottom Register bar (mobile only): appears once the hero CTA scrolls out of view, 56px tall, safe-area padding, adds bottom padding to the page so it never covers content.
- Every Register link: same Monno URL, target="_blank" rel="noopener", UTM params appended (utm_source=techrun-site, utm_medium=landing, utm_campaign=techrun-2026), and any incoming UTM/fbclid params passed through.
- Meta Pixel (ID from config, loaded on idle or first interaction): PageView, plus a "Lead" event on every Register click, fired without delaying the link opening. If no Pixel ID is set, do nothing.
- Countdown: counts down to the event date from config in Asia/Manila time, one interval, paused when offscreen or the tab is hidden, shows "Registration closed" or "Event started" when appropriate.
- Add to calendar: generate an .ics client-side (Blob) from config, plus an "Add to Google Calendar" link. In-app browsers can block downloads, so fall back to the Google Calendar link.
- Share: use navigator.share when available, otherwise copy the link to the clipboard with a small toast ("Link copied"). Do not assume navigator.share exists.
- FAQ: kit pickup, route/start time, parking, refunds, what to bring. Answers come ONLY from event.config.json. If an answer is empty, hide that item. Never invent answers.

## Video (Google Drive)
Not stored in the repo. Config holds the Drive file ID. The Watch video button opens a modal and ONLY THEN injects an iframe with https://drive.google.com/file/d/{ID}/preview. Remove the iframe on close so it stops loading and playing. Modal thumbnail uses a hero photo. Include an "Open on Drive" fallback link in case the embed fails. No autoplay.

## Performance budget (mobile)
Lighthouse/PageSpeed: Performance >= 90 (aim 95+), Accessibility >= 95, Best Practices >= 95, SEO >= 95. LCP < 2.5s, INP < 200ms, CLS < 0.1, TBT < 200ms, FCP < 1.8s. Initial transfer under about 500KB, excluding below-the-fold gallery images. WebP/AVIF with srcset and explicit dimensions, hero preloaded with fetchpriority="high", everything else lazy. Inline critical CSS, no render-blocking resources, non-critical JS deferred. If an effect costs the budget, simplify or cut it and say so.

## SEO
Title, meta description, Open Graph + Twitter tags (hero photo as og:image), favicon from the Tech Run logo, semantic landmarks, alt text on all images, visible focus states, canonical URL placeholder.

## Git rules
Push to `main`. Conventional commit messages. Never force-push, rewrite history, change global git config, or commit secrets, .env, node_modules, raw originals (/assets-raw) or any file over 50MB. No video files in the repo.

## Do not
Invent event details, prices, dates, sponsors, FAQ answers or testimonials. Add forms or payment flows (registration lives on Monno). Use colors outside white + blue or fonts other than Poppins. Use stock photos in place of real ones without telling me. Build a JS cursor. Let parallel agents edit the same file.
