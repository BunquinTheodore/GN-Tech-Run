import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/cursor.css';
import './styles/motion.css';
import './styles/bg.css';

import { initSplash } from './effects/splash.js';
import { initConfig } from './features/config.js';
import { initTracking } from './features/tracking.js';
import { initCountdown } from './features/countdown.js';
import { initCalendar } from './features/calendar.js';
import { initShare } from './features/share.js';
import { initStickyBar } from './features/stickyBar.js';
import { initVideoModal } from './features/videoModal.js';
import { initReveal } from './effects/reveal.js';
import { initCarousel } from './effects/carousel.js';
import { initSfx } from './effects/sfx.js';
import { initBackground3D } from './effects/background3d.js';

const safely = (init) => {
  try {
    init();
  } catch (error) {
    console.error(`[${init.name}] failed`, error);
  }
};

const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));

// Order matters: initConfig renders DOM that the rest bind to.
[initSplash, initConfig, initTracking, initCountdown, initCalendar, initShare, initStickyBar, initVideoModal, initReveal, initCarousel, initSfx].forEach(safely);

const startBackground = () => whenIdle(() => safely(initBackground3D));
if (document.readyState === 'complete') startBackground();
else window.addEventListener('load', startBackground, { once: true });
