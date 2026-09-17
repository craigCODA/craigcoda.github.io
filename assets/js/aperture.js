import { createApertureController } from './aperture-controller.js';

export function hydrateFrame(frameElement) {
  for (const source of frameElement.querySelectorAll('source[data-srcset]')) {
    source.srcset = source.dataset.srcset;
    delete source.dataset.srcset;
  }
  for (const image of frameElement.querySelectorAll('img[data-src]')) {
    image.src = image.dataset.src;
    delete image.dataset.src;
  }
}

const aperture = document.querySelector('[data-aperture]');

if (aperture) {
  const frames = [...aperture.querySelectorAll('[data-aperture-frame]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let enteredMeaningfulView = false;
  let inViewport = false;
  let reconciliationAttached = false;
  let disposed = false;

  const syncMotion = () => {
    aperture.dataset.motion = reducedMotion.matches ? 'reduced' : 'full';
  };
  const render = (index, state) => {
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.hidden = !active;
      frame.setAttribute('aria-hidden', String(!active));
    });
    aperture.dataset.frame = String(index);
    aperture.dataset.status = state.status;
    aperture.dataset.playCount = String(state.playCount);
    hydrateFrame(frames[index]);
    if (frames[index + 1]) hydrateFrame(frames[index + 1]);
  };
  const syncState = (state) => {
    aperture.dataset.status = state.status;
    aperture.dataset.playCount = String(state.playCount);
  };
  const controller = createApertureController({
    durations: frames.map((frame) => Number(frame.dataset.duration)),
    onFrame: render,
    onComplete: () => dispose(),
    onState: syncState,
    schedule: window.setTimeout.bind(window),
    cancel: window.clearTimeout.bind(window),
    now: () => performance.now()
  });

  syncMotion();
  aperture.dataset.frame = '0';
  aperture.dataset.status = 'idle';
  aperture.dataset.playCount = '0';
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
  const detachReconciliation = () => {
    if (!reconciliationAttached) return;
    reconciliationAttached = false;
    entryObserver.disconnect();
    viewportObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.removeEventListener('change', syncMotion);
  };
  const attachReconciliation = () => {
    if (reconciliationAttached || disposed) return;
    reconciliationAttached = true;
    reducedMotion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', onVisibilityChange);
    entryObserver.observe(aperture);
    viewportObserver.observe(aperture);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    detachReconciliation();
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
  const onPageHide = (event) => {
    if (event.persisted) {
      controller.pause();
      detachReconciliation();
      return;
    }
    controller.stop();
    dispose();
  };
  const onPageShow = (event) => {
    if (!event.persisted) return;
    attachReconciliation();
    syncMotion();
    reconcile();
  };

  attachReconciliation();
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
}
