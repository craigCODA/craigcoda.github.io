import { expect, test } from '@playwright/test';

async function enterAperture(page) {
  await page.locator('[data-aperture]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-play-count', '1');
}

async function topmostPpkEvidenceClass(page) {
  return page.locator('[data-aperture]').evaluate((aperture) => {
    const box = aperture.getBoundingClientRect();
    const element = document.elementFromPoint(box.left + box.width * 0.82, box.top + box.height * 0.2);
    return element?.className ?? '';
  });
}

async function seekPpkEvidenceAnimations(page, elapsed) {
  await page.locator('.aperture-layer--forklift, .aperture-layer--before, .aperture-layer--after').evaluateAll((layers, currentTime) => {
    for (const layer of layers) {
      for (const animation of layer.getAnimations()) {
        animation.pause();
        animation.currentTime = currentTime;
      }
    }
  }, elapsed);
}

test('plays once only after meaningful viewport entry without carousel controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.clock.install();
  await page.goto('/');

  const aperture = page.locator('[data-aperture]');
  await expect(aperture).toHaveAttribute('data-play-count', '0');
  await expect(page.locator('[data-aperture] button, [data-aperture] [aria-roledescription="carousel"], [data-aperture] [class*="dot"]')).toHaveCount(0);

  await enterAperture(page);
  await expect(aperture).toHaveAttribute('data-status', 'playing');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(aperture).toHaveAttribute('data-status', 'paused');
  await enterAperture(page);
  await expect(aperture).toHaveAttribute('data-status', 'playing');
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  for (const duration of [4000, 3500, 4000, 4000, 4500, 3000]) await page.clock.fastForward(duration);
  await expect(aperture).toHaveAttribute('data-status', 'complete');
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  expect(errors).toEqual([]);
});

test('uses the authored desktop aperture ratio', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  const box = await page.locator('[data-aperture]').boundingBox();

  expect(box.width / box.height).toBeGreaterThan(2.05);
  expect(box.width / box.height).toBeLessThan(2.35);
});

test('binds the runtime schedule to the six homepage frame durations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  const durations = await page.locator('[data-aperture-frame]').evaluateAll((frames) => frames.map((frame) => Number(frame.dataset.duration)));

  expect(durations).toEqual([4000, 3500, 4000, 4000, 4500, 3000]);
  expect(durations.reduce((total, duration) => total + duration, 0)).toBe(23000);
});

test('uses the authored tablet aperture ratio', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet');
  await page.goto('/');
  const box = await page.locator('[data-aperture]').boundingBox();

  expect(box.width / box.height).toBeGreaterThan(1.55);
  expect(box.width / box.height).toBeLessThan(1.65);
});

test('keeps mobile aperture vertical and native scrolling', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  const aperture = page.locator('[data-aperture]');
  const box = await aperture.boundingBox();
  const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflowY);

  expect(box.width / box.height).toBeGreaterThan(0.72);
  expect(box.width / box.height).toBeLessThan(0.92);
  expect(overflow).not.toBe('hidden');
  await enterAperture(page);
  expect(await aperture.locator('.aperture-layer--before, .aperture-layer--after').evaluateAll((layers) => (
    layers.map((layer) => {
      const styles = getComputedStyle(layer);
      return { animationName: styles.animationName, fullyClipped: styles.clipPath.includes('100%') };
    })
  ))).toEqual([
    { animationName: 'none', fullyClipped: true },
    { animationName: 'none', fullyClipped: true }
  ]);
});

test('uses the PPK forklift as the static first-frame evidence on mobile and reduced motion', async ({ page }, testInfo) => {
  test.skip(!['mobile', 'reduced-motion'].includes(testInfo.project.name));
  await page.goto('/');
  await enterAperture(page);

  expect(await topmostPpkEvidenceClass(page)).toContain('aperture-layer--forklift');
});

test('uses six actual instant reduced-motion cuts with PythOS still parity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion');
  await page.clock.install();
  await page.goto('/');

  const aperture = page.locator('[data-aperture]');
  await expect(aperture).toHaveAttribute('data-motion', 'reduced');
  await expect(aperture.locator('.aperture-transcript li')).toHaveCount(6);
  const durations = await aperture.locator('[data-aperture] *').evaluateAll((elements) => elements.map((element) => {
    const styles = getComputedStyle(element);
    return { animation: styles.animationDuration, transition: styles.transitionDuration, transform: styles.transform };
  }));

  expect(durations.every(({ animation, transition, transform }) => animation === '0s' && transition === '0s' && transform === 'none')).toBe(true);
  await enterAperture(page);
  const statements = [
    'I MODEL PHYSICAL SYSTEMS.',
    'I TURN OPERATIONS INTO DECISION SYSTEMS.',
    'I TEST WHAT AGENTS ACTUALLY DO.',
    'I RETHINK HOW THE COMPUTER CAN FEEL.',
    'I BUILD BELOW THE APPLICATION LAYER.'
  ];
  for (const [index, duration] of [4000, 3500, 4000, 4000, 4500].entries()) {
    await expect(aperture).toHaveAttribute('data-frame', String(index));
    await expect(aperture.locator('[data-aperture-frame]:not([hidden]) .aperture-copy')).toContainText(statements[index]);
    if (index === 4) {
      await expect(page.locator('.aperture-layer--pythos-terminal')).toHaveCSS('opacity', '1');
      await expect(page.locator('.aperture-layer--pythos-architecture')).toHaveCSS('opacity', '1');
    }
    await page.clock.fastForward(duration);
  }
  await expect(aperture).toHaveAttribute('data-frame', '5');
  await expect(aperture.locator('[data-aperture-frame]:not([hidden]) .aperture-copy')).toContainText('PHYSICAL SYSTEMS. SOFTWARE SYSTEMS. AI SYSTEMS. COMPUTER SYSTEMS.');
  await page.clock.fastForward(3000);
  await expect(aperture).toHaveAttribute('data-status', 'complete');
});

test('hard swaps PythOS terminal evidence to its registered architecture artifact at runtime', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await enterAperture(page);
  await page.waitForTimeout(15500);
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-frame', '4');
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-status', 'playing');

  const terminal = page.locator('.aperture-layer--pythos-terminal');
  const architecture = page.locator('.aperture-layer--pythos-architecture');
  await expect(terminal).toHaveCount(1);
  await expect(architecture).toHaveCount(1);
  await expect(terminal).toHaveCSS('opacity', '1');
  await expect(architecture).toHaveCSS('opacity', '0');
  await expect(terminal).toHaveCSS('transition-duration', '0s');
  await expect(architecture).toHaveCSS('transition-duration', '0s');

  await page.waitForTimeout(2300);
  await expect(terminal).toHaveCSS('opacity', '0');
  await expect(architecture).toHaveCSS('opacity', '1');
});

test('runs and pauses the authored PPK matched-camera cut', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await enterAperture(page);

  const aperture = page.locator('[data-aperture]');
  const forklift = page.locator('.aperture-layer--forklift');
  const before = page.locator('.aperture-layer--before');
  const after = page.locator('.aperture-layer--after');
  await expect(aperture).toHaveAttribute('data-frame', '0');
  await expect(aperture).toHaveAttribute('data-status', 'playing');
  await expect(forklift).toHaveCSS('animation-name', 'aperture-image-drift');
  await expect(before).toHaveCSS('animation-name', 'aperture-ppk-before-cut');
  await expect(after).toHaveCSS('animation-name', 'aperture-ppk-after-cut');
  await expect(before).toHaveCSS('animation-play-state', 'running');
  await expect(after).toHaveCSS('animation-play-state', 'running');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(aperture).toHaveAttribute('data-status', 'paused');
  await expect(before).toHaveCSS('animation-play-state', 'paused');
  await expect(after).toHaveCSS('animation-play-state', 'paused');
  const pausedClips = await Promise.all([
    before.evaluate((element) => getComputedStyle(element).clipPath),
    after.evaluate((element) => getComputedStyle(element).clipPath)
  ]);
  await page.waitForTimeout(2200);
  expect(await Promise.all([
    before.evaluate((element) => getComputedStyle(element).clipPath),
    after.evaluate((element) => getComputedStyle(element).clipPath)
  ])).toEqual(pausedClips);

  await enterAperture(page);
  await expect(before).toHaveCSS('animation-play-state', 'running');
  await expect(after).toHaveCSS('animation-play-state', 'running');
  await expect.poll(() => before.evaluate((element) => getComputedStyle(element).clipPath), { timeout: 2500 }).not.toBe(pausedClips[0]);
  const cutClips = await Promise.all([
    before.evaluate((element) => getComputedStyle(element).clipPath),
    after.evaluate((element) => getComputedStyle(element).clipPath)
  ]);
  expect(cutClips[0]).not.toBe(pausedClips[0]);
  expect(cutClips[1]).toBe(pausedClips[1]);
  await expect.poll(() => after.evaluate((element) => getComputedStyle(element).clipPath), { timeout: 2500 }).not.toBe(pausedClips[1]);
  expect(errors).toEqual([]);
});

test('stages the PPK forklift before the matched-camera before and after evidence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await enterAperture(page);

  await seekPpkEvidenceAnimations(page, 0);
  await expect.poll(() => topmostPpkEvidenceClass(page)).toContain('aperture-layer--forklift');
  await seekPpkEvidenceAnimations(page, 1500);
  await expect.poll(() => topmostPpkEvidenceClass(page)).toContain('aperture-layer--before');
  await seekPpkEvidenceAnimations(page, 3000);
  await expect.poll(() => topmostPpkEvidenceClass(page)).toContain('aperture-layer--after');
});

test('keeps deferred evidence unloaded until the runtime activates its active and next frames', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const requests = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image') requests.push(request.url());
  });
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    window.__deferredPromotions = [];
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...descriptor,
      set(value) {
        if (String(value).includes('skill-evaluation-lab-evidence-map')) {
          window.__deferredPromotions.push({
            frame: this.closest('[data-aperture]')?.dataset.frame ?? null,
            url: String(value)
          });
        }
        descriptor.set.call(this, value);
      }
    });
  });
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  expect(requests.some((url) => url.includes('skill-evaluation-lab-evidence-map'))).toBe(false);
  expect(requests.some((url) => url.includes('pythos-architecture-evidence-boundary'))).toBe(false);
  await page.locator('#work img').evaluateAll((images) => images.forEach((image) => image.remove()));

  const aperture = page.locator('[data-aperture]');
  await enterAperture(page);
  await expect.poll(() => requests.some((url) => url.includes('warehouse-optimization-verified-result')), { timeout: 1000 }).toBe(true);
  await expect(aperture).toHaveAttribute('data-frame', '0');
  expect(requests.some((url) => url.includes('skill-evaluation-lab-evidence-map'))).toBe(false);
  expect(requests.some((url) => url.includes('pythos-architecture-evidence-boundary'))).toBe(false);
  expect(await page.evaluate(() => window.__deferredPromotions)).toEqual([]);

  await page.clock.fastForward(3999);
  await expect(aperture).toHaveAttribute('data-frame', '0');
  expect(requests.some((url) => url.includes('skill-evaluation-lab-evidence-map'))).toBe(false);
  expect(await page.evaluate(() => window.__deferredPromotions)).toEqual([]);

  await page.clock.fastForward(1);
  await expect(aperture).toHaveAttribute('data-frame', '1');
  await expect.poll(() => requests.some((url) => url.includes('skill-evaluation-lab-evidence-map'))).toBe(true);
  expect(await page.evaluate(() => window.__deferredPromotions.map(({ frame }) => frame))).toEqual(['1']);
  expect(requests.some((url) => url.includes('pythos-architecture-evidence-boundary'))).toBe(false);
});

test('restores a BFCache pagehide sequence after an ordinary visibility pause', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.addInitScript(() => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    window.__setApertureHidden = (next) => {
      hidden = next;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    window.__dispatchPageLifecycle = (type, persisted) => {
      const event = new Event(type);
      Object.defineProperty(event, 'persisted', { value: persisted });
      window.dispatchEvent(event);
    };
  });
  await page.goto('/');
  const aperture = page.locator('[data-aperture]');
  await enterAperture(page);
  await page.evaluate(() => window.__setApertureHidden(true));
  await expect(aperture).toHaveAttribute('data-status', 'paused');
  await page.evaluate(() => window.__dispatchPageLifecycle('pagehide', true));
  await page.evaluate(() => {
    window.__setApertureHidden(false);
    window.__dispatchPageLifecycle('pageshow', true);
  });

  await expect(aperture).toHaveAttribute('data-status', 'playing');
  await expect(aperture).toHaveAttribute('data-play-count', '1');
});

test('stops a non-persisted pagehide and removes reconciliation hooks', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.addInitScript(() => {
    const NativeObserver = window.IntersectionObserver;
    const nativeMatchMedia = window.matchMedia;
    const remove = EventTarget.prototype.removeEventListener;
    window.__pagehideCleanup = { disconnects: 0, removed: [], mediaRemoved: 0 };
    window.IntersectionObserver = class extends NativeObserver {
      disconnect() {
        window.__pagehideCleanup.disconnects += 1;
        return super.disconnect();
      }
    };
    window.matchMedia = (...args) => {
      const query = nativeMatchMedia(...args);
      const removeListener = query.removeEventListener.bind(query);
      query.removeEventListener = (type, listener, options) => {
        if (type === 'change') window.__pagehideCleanup.mediaRemoved += 1;
        return removeListener(type, listener, options);
      };
      return query;
    };
    EventTarget.prototype.removeEventListener = function(type, ...args) {
      if (type === 'visibilitychange' || type === 'pagehide' || type === 'pageshow') window.__pagehideCleanup.removed.push(type);
      return remove.call(this, type, ...args);
    };
    window.__dispatchPageLifecycle = (type, persisted) => {
      const event = new Event(type);
      Object.defineProperty(event, 'persisted', { value: persisted });
      window.dispatchEvent(event);
    };
  });
  await page.goto('/');
  await enterAperture(page);
  await page.evaluate(() => window.__dispatchPageLifecycle('pagehide', false));
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-status', 'stopped');
  const cleanup = await page.evaluate(() => window.__pagehideCleanup);

  expect(cleanup.disconnects).toBe(2);
  expect(cleanup.mediaRemoved).toBe(1);
  expect(cleanup.removed).toEqual(expect.arrayContaining(['visibilitychange', 'pagehide', 'pageshow']));
});

test('cleans up observer and lifecycle listeners after completing the one-shot sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.addInitScript(() => {
    const NativeObserver = window.IntersectionObserver;
    const remove = EventTarget.prototype.removeEventListener;
    window.__apertureCleanup = { disconnects: 0, removed: [] };
    window.IntersectionObserver = class extends NativeObserver {
      disconnect() {
        window.__apertureCleanup.disconnects += 1;
        return super.disconnect();
      }
    };
    EventTarget.prototype.removeEventListener = function(type, ...args) {
      if (type === 'visibilitychange' || type === 'pagehide') window.__apertureCleanup.removed.push(type);
      return remove.call(this, type, ...args);
    };
  });
  await page.clock.install();
  await page.goto('/');
  await enterAperture(page);
  for (const duration of [4000, 3500, 4000, 4000, 4500, 3000]) await page.clock.fastForward(duration);
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-status', 'complete');
  const cleanup = await page.evaluate(() => window.__apertureCleanup);

  expect(cleanup.disconnects).toBe(2);
  expect(cleanup.removed).toEqual(expect.arrayContaining(['visibilitychange', 'pagehide']));
});
