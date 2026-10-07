import config from '../lib/config.js';
import images from '../generated/images.json';

const DRIVE_ID = /^[\w-]+$/;

export function initVideoModal() {
  const openButton = document.getElementById('watch-video');
  const modal = document.getElementById('video-modal');
  const stage = document.getElementById('video-stage');
  const play = document.getElementById('video-play');
  const closeButton = document.getElementById('video-close');
  const driveLink = document.getElementById('video-drive-link');
  const id = String(config.video?.driveFileId || '').trim();

  if (!DRIVE_ID.test(id)) {
    if (openButton) openButton.hidden = true;
    return;
  }
  if (!openButton || !modal || !stage || !play) return;

  if (driveLink) driveLink.href = `https://drive.google.com/file/d/${id}/view`;
  const hero = images?.hero?.src;
  if (hero) play.style.backgroundImage = `url("${hero}")`;

  let frame = null;
  let lastFocus = null;

  const removeFrame = () => {
    if (frame) frame.remove();
    frame = null;
    play.hidden = false;
  };
  const loadFrame = () => {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.src = `https://drive.google.com/file/d/${id}/preview`;
    frame.allow = 'autoplay';
    frame.loading = 'lazy';
    frame.title = `${config.event?.name || 'Event'} video`;
    frame.allowFullscreen = true;
    stage.appendChild(frame);
    play.hidden = true;
  };
  const open = () => {
    lastFocus = document.activeElement;
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    play.focus({ preventScroll: true });
  };
  const close = () => {
    if (typeof modal.close === 'function' && modal.open) modal.close();
    else modal.removeAttribute('open');
    onClosed();
  };
  const onClosed = () => {
    removeFrame();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  };

  openButton.addEventListener('click', open);
  play.addEventListener('click', loadFrame);
  if (closeButton) closeButton.addEventListener('click', close);
  modal.addEventListener('close', onClosed);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
}
