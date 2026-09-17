import { expect, test } from '@playwright/test';

const KB = 1024;
const APERTURE_DURATIONS = Object.freeze([4000, 3500, 4000, 4000, 4500, 3000]);

test('homepage stays within CSS, JavaScript, aperture-media, and layout-stability budgets', async ({ page }, testInfo) => {
  test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'budgets are defined for desktop and mobile first loads');
  test.setTimeout(45000);
  await page.addInitScript(() => {
    window.__layoutShiftScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__layoutShiftScore += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const bytes = await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
    const styles = [...new Set(resources.filter((url) => new URL(url).pathname.endsWith('.css')))];
    const scripts = [...new Set(resources.filter((url) => new URL(url).pathname.endsWith('.js')))];
    async function total(urls) {
      const bodies = await Promise.all(urls.map(async (url) => (await fetch(url)).arrayBuffer()));
      return bodies.reduce((sum, body) => sum + body.byteLength, 0);
    }
    const firstApertureImage = document.querySelector('[data-aperture] img');
    return {
      css: await total(styles),
      js: await total(scripts),
      aperture: (await (await fetch(firstApertureImage.currentSrc)).arrayBuffer()).byteLength
    };
  });
  expect(bytes.css).toBeLessThan(100 * KB);
  expect(bytes.js).toBeLessThan(50 * KB);
  expect(bytes.aperture).toBeLessThan((testInfo.project.name === 'mobile' ? 180 : 450) * KB);

  const preEntry = await page.locator('[data-aperture-frame][hidden]').evaluateAll((frames) => {
    const parseCandidates = (value, isSrcset) => {
      if (!value) return [];
      const entries = isSrcset ? value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]) : [value];
      return entries.map((candidate) => new URL(candidate, location.href).href);
    };
    const elements = frames.flatMap((frame) => [...frame.querySelectorAll('picture source, picture img, img:not(picture img)')]);
    const materializedElsewhere = [...document.querySelectorAll('img, source')]
      .filter((element) => !element.closest('[data-aperture-frame][hidden]'))
      .flatMap((element) => ['src', 'srcset'].flatMap((attribute) => (
        parseCandidates(element.getAttribute(attribute), attribute === 'srcset')
      )));
    return {
      elements: elements.map((element) => ({
        tag: element.tagName.toLowerCase(),
        currentSrc: element.currentSrc || '',
        materialized: ['src', 'srcset'].filter((attribute) => element.hasAttribute(attribute)),
        deferred: ['data-src', 'data-srcset'].filter((attribute) => element.hasAttribute(attribute)),
        candidates: ['src', 'data-src', 'srcset', 'data-srcset'].flatMap((attribute) => (
          parseCandidates(element.getAttribute(attribute), attribute.endsWith('srcset'))
        ))
      })),
      materializedElsewhere
    };
  });
  const deferredCandidates = [...new Set(preEntry.elements.flatMap((element) => element.candidates))];
  const exclusivelyDeferredCandidates = deferredCandidates.filter((candidate) => !preEntry.materializedElsewhere.includes(candidate));
  const requestedBeforeEntry = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
  expect(preEntry.elements.length).toBeGreaterThan(0);
  expect(preEntry.elements.every((element) => element.deferred.length > 0)).toBe(true);
  expect(preEntry.elements.every((element) => element.materialized.length === 0 && element.currentSrc === '')).toBe(true);
  expect(deferredCandidates.length).toBeGreaterThan(0);
  expect(exclusivelyDeferredCandidates.length).toBeGreaterThan(0);
  expect(exclusivelyDeferredCandidates.filter((candidate) => requestedBeforeEntry.includes(candidate))).toEqual([]);

  const aperture = page.locator('[data-aperture]');
  await aperture.scrollIntoViewIfNeeded();
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  const layoutShiftScores = [];
  for (const [index, duration] of APERTURE_DURATIONS.entries()) {
    await expect(aperture).toHaveAttribute('data-frame', String(index));
    await page.waitForTimeout(duration + 50);
    layoutShiftScores.push(await page.evaluate(() => window.__layoutShiftScore));
  }
  await expect(aperture).toHaveAttribute('data-status', 'complete');
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  expect(APERTURE_DURATIONS.reduce((sum, duration) => sum + duration, 0)).toBe(23000);
  expect(layoutShiftScores.every((score) => score < 0.1)).toBe(true);
  expect(await page.evaluate(() => window.__layoutShiftScore)).toBeLessThan(0.1);
});

test('homepage gives only its first meaningful visual high priority and reserves media geometry', async ({ page }, testInfo) => {
  test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'image loading contracts are evaluated at desktop and mobile source selection');
  await page.goto('/');

  const highPriority = page.locator('img[fetchpriority="high"]');
  await expect(highPriority).toHaveCount(1);
  await expect(highPriority).toHaveAttribute('src', /ppk076_first_person_forklift/);
  expect(await page.locator('img').evaluateAll((images) => images.every((image) => {
    const width = Number(image.getAttribute('width'));
    const height = Number(image.getAttribute('height'));
    return (width > 0 && height > 0) || getComputedStyle(image).aspectRatio !== 'auto';
  }))).toBe(true);

  const belowFold = page.locator('#work img');
  expect(await belowFold.count()).toBeGreaterThan(0);
  expect(await belowFold.evaluateAll((images) => images.every((image) => image.loading === 'lazy'))).toBe(true);
});

test('homepage aperture keeps its authored desktop and mobile behavior', async ({ page }, testInfo) => {
  test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'aperture geometry has desktop and mobile acceptance targets');
  await page.goto('/');
  const aperture = page.locator('[data-aperture]');
  const box = await aperture.boundingBox();
  expect(box).not.toBeNull();

  if (testInfo.project.name === 'mobile') {
    expect(box.width / box.height).toBeGreaterThan(0.72);
    expect(box.width / box.height).toBeLessThan(0.92);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
  } else {
    expect(box.width / box.height).toBeGreaterThan(2.05);
    expect(box.width / box.height).toBeLessThan(2.35);
  }
});
