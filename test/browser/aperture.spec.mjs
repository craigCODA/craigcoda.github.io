import { expect, test } from '@playwright/test';

async function enterAperture(page) {
  await page.locator('[data-aperture]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-play-count', '1');
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

test('keeps deferred evidence unloaded until the runtime activates its active and next frames', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const requests = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image') requests.push(request.url());
  });
  await page.goto('/');
  expect(requests.some((url) => url.includes('skill-evaluation-lab-evidence-map'))).toBe(false);
  expect(requests.some((url) => url.includes('pythos-architecture-evidence-boundary'))).toBe(false);

  await enterAperture(page);
  await expect.poll(() => requests.some((url) => url.includes('warehouse-optimization-verified-result')), { timeout: 1000 }).toBe(true);
  expect(requests.some((url) => url.includes('pythos-architecture-evidence-boundary'))).toBe(false);
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
