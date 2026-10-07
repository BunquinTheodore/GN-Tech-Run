# Tech Run landing page

Single-page, mobile-first landing page for Tech Run (co-presented with iRun PH). One job: send visitors to register on Monno. Vite + vanilla JS + plain CSS. Spec: [CLAUDE.md](CLAUDE.md). File ownership and DOM contract: [CONTRACT.md](CONTRACT.md).

## Run and build
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview    # serve dist/ locally
```

## Edit event data
Everything lives in `event.config.json`: date (ISO with `+08:00`), venue, categories, fee, deadline, inclusions, `registration.monnoUrl`, `video.driveFileId`, `tracking.metaPixelId`, socials, FAQ answers, `siteUrl`, and `registrationOpen`.
- Empty values show "To be announced" or hide the item. FAQ items with an empty answer are hidden.
- `registrationOpen: false` turns every Register button into "Registration closed" and hides the countdown and sticky bar. An empty `monnoUrl` shows "Opening soon".
- Set `siteUrl` (for example `https://your-domain.com`) for canonical and social preview tags. On Vercel it falls back to the production domain.
- Calendar end time uses `event.endISO`, or start + 4 hours when empty.

## Replace assets
Drop real files in `assets/` (gitignored, never committed):
```
assets/logos/techrun-logo.(svg|png)   assets/logos/irunph-logo.(svg|png)
assets/photos/*.jpg|png               (hero.* is the hero, otherwise the first file; optional alt.json maps filename to alt text)
assets/cursor/icons8-cursor.svg
```
Then `npm run optimize-assets`, check `src/generated/images.json` has `"placeholder": false`, and commit `public/` and `src/generated/`. Without real files it generates labeled placeholders.

## Google Drive video
Set `video.driveFileId` to the file ID from the Drive share link. The file must be shared "Anyone with the link can view". The video is never stored in the repo; the iframe is only injected when the modal opens.

## Deploy on Vercel
Dashboard, Add New Project, import `GN-Tech-Run`, framework Vite, build `npm run build`, output `dist`. Every push to `main` redeploys. `vercel.json` sets cache and security headers (including the CSP for Meta Pixel and the Drive iframe).

## Run PageSpeed
Open https://pagespeed.web.dev, enter the live URL, check the Mobile tab. Budgets are in CLAUDE.md.
