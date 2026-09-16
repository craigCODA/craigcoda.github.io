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
  let inMeaningfulView = false;

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
  const controller = createApertureController({
    durations: frames.map((frame) => Number(frame.dataset.duration)),
    onFrame: render,
    onComplete: (state) => {
      aperture.dataset.status = state.status;
      aperture.dataset.playCount = String(state.playCount);
    },
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
    if (document.hidden || !inMeaningfulView) {
      controller.pause();
    } else if (status === 'idle') {
      controller.start();
    } else {
      controller.resume();
    }
  };

  const observer = new IntersectionObserver(([entry]) => {
    inMeaningfulView = entry.isIntersecting && entry.intersectionRatio >= 0.55;
    reconcile();
  }, { threshold: 0.55, rootMargin: '0px 0px -10% 0px' });

  document.addEventListener('visibilitychange', reconcile);
  observer.observe(aperture);
}
