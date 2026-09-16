import { createApertureController } from './aperture-controller.js';

export function hydrateFrame(frameElement) {
  for (const image of frameElement.querySelectorAll('img[data-src]')) {
    image.src = image.dataset.src;
    image.srcset = image.dataset.srcset;
    delete image.dataset.src;
    delete image.dataset.srcset;
  }
}

const aperture = document.querySelector('[data-aperture]');

if (aperture) {
  const frames = [...aperture.querySelectorAll('[data-aperture-frame]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let enteredMeaningfulView = false;
  let inViewport = false;
  let cleanedUp = false;

  const syncMotion = () => {
    aperture.dataset.motion = reducedMotion.matches ? 'reduced' : 'full';
  };
  const render = (index, state) => {
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.hidden = !active;
      frame.setAttribute('aria-hidden', String(!active));
    });
    hydrateFrame(frames[index]);
    if (frames[index + 1]) hydrateFrame(frames[index + 1]);
    aperture.dataset.frame = String(index);
    aperture.dataset.status = state.status;
    aperture.dataset.playCount = String(state.playCount);
  };
  const syncState = (state) => {
    aperture.dataset.status = state.status;
    aperture.dataset.playCount = String(state.playCount);
  };
  const controller = createApertureController({
    durations: frames.map((frame) => Number(frame.dataset.duration)),
    onFrame: render,
    onComplete: () => cleanup(),
    onState: syncState,
    schedule: window.setTimeout.bind(window),
    cancel: window.clearTimeout.bind(window),
    now: () => performance.now()
  });

  syncMotion();
  aperture.dataset.frame = '0';
  aperture.dataset.status = 'idle';
  aperture.dataset.playCount = '0';
  reducedMotion.addEventListener('change', syncMotion);

  const reconcile = () => {
    const { status } = controller.state();
    if (!enteredMeaningfulView || status === 'complete' || status === 'stopped') return;
    if (document.hidden || !inViewport) {
      controller.pause();
    } else if (status === 'idle') {
      controller.start();
    } else {
      controller.resume();
    }
  };

  const entryObserver = new IntersectionObserver(([entry]) => {
    if (!(entry.isIntersecting && entry.intersectionRatio >= 0.55)) return;
    enteredMeaningfulView = true;
    inViewport = true;
    reconcile();
  }, { threshold: 0.55, rootMargin: '0px 0px -10% 0px' });
  const viewportObserver = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    reconcile();
  }, { threshold: 0 });
  const onVisibilityChange = () => reconcile();
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    entryObserver.disconnect();
    viewportObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', cleanup);
    reducedMotion.removeEventListener('change', syncMotion);
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', cleanup, { once: true });
  entryObserver.observe(aperture);
  viewportObserver.observe(aperture);
}
