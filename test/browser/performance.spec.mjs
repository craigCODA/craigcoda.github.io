import { expect, test } from '@playwright/test';

const KB = 1024;
const APERTURE_DURATIONS = Object.freeze([4000, 3500, 4000, 4000, 4500, 3000]);

test('homepage stays within CSS, JavaScript, aperture-media, and layout-stability budgets', async ({ page }, testInfo) => {
  test.skip(!['desktop', 'mobile'].includes(testInfo.project.name), 'budgets are defined for desktop and mobile first loads');
  test.setTimeout(45000);
  const initialEvidenceResponses = [];
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname;
    if (response.request().resourceType() === 'image' && pathname.startsWith('/assets/evidence/original/')) {
      initialEvidenceResponses.push(response);
    }
  });
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
    return {
      css: await total(styles),
      js: await total(scripts)
    };
  });
  const initialEvidence = await Promise.all(initialEvidenceResponses.map(async (response) => ({
    pathname: new URL(response.url()).pathname,
    bytes: (await response.body()).byteLength
  })));
  const uniqueInitialEvidence = [...new Map(initialEvidence.map((entry) => [entry.pathname, entry])).values()];
  const initialEvidenceBytes = uniqueInitialEvidence.reduce((sum, entry) => sum + entry.bytes, 0);
  expect(bytes.css).toBeLessThan(100 * KB);
  expect(bytes.js).toBeLessThan(50 * KB);
  expect(uniqueInitialEvidence.map(({ pathname }) => pathname), 'only the opening evidence may transfer before meaningful entry').toEqual([
    '/assets/evidence/original/ppk076/ppk076_first_person_forklift.png'
  ]);
  expect(initialEvidenceBytes).toBeLessThan(1024 * KB);

  const preEntry = await page.locator('[data-aperture] img[data-src]').evaluateAll((elements) => {
    const parseCandidates = (value, isSrcset) => {
      if (!value) return [];
      const entries = isSrcset ? value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]) : [value];
      return entries.map((candidate) => new URL(candidate, location.href).href);
    };
    return elements.map((element) => ({
      tag: element.tagName.toLowerCase(),
      currentSrc: element.currentSrc || '',
      materialized: ['src', 'srcset'].filter((attribute) => element.hasAttribute(attribute)),
      deferred: ['data-src', 'data-srcset'].filter((attribute) => element.hasAttribute(attribute)),
      candidates: ['src', 'data-src', 'srcset', 'data-srcset'].flatMap((attribute) => (
        parseCandidates(element.getAttribute(attribute), attribute.endsWith('srcset'))
      ))
    }));
  });
  const deferredCandidates = [...new Set(preEntry.flatMap((element) => element.candidates))];
  expect(preEntry).toHaveLength(4);
  expect(preEntry.every((element) => element.tag === 'img' && element.deferred.join() === 'data-src')).toBe(true);
  expect(preEntry.every((element) => element.materialized.length === 0 && element.currentSrc === '')).toBe(true);
  expect(deferredCandidates.length).toBeGreaterThan(0);

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

test('deferred aperture raw evidence promotes only its registered original', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'raw-source promotion is viewport-independent');
  const imageRequests = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'image') imageRequests.push(new URL(request.url()).pathname);
  });
  await page.addInitScript(() => {
    window.__imagePromotions = [];
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...descriptor,
      set(value) {
        if (String(value).includes('workspace_m2a_room_checkpoint')) window.__imagePromotions.push(`img:${value}`);
        descriptor.set.call(this, value);
      }
    });
  });
  await page.clock.install();
  await page.goto('/');
  await page.locator('#work img').evaluateAll((images) => images.forEach((image) => image.remove()));

  const deferredFrame = page.locator('[data-aperture-frame]').nth(3);
  expect(await deferredFrame.evaluate((frame) => ({
    sourceCount: frame.querySelectorAll('source').length,
    image: (() => {
      const image = frame.querySelector('img');
      return {
        live: image.hasAttribute('src'),
        deferred: image.hasAttribute('data-src'),
        currentSrc: image.currentSrc
      };
    })()
  }))).toEqual({
    sourceCount: 0,
    image: { live: false, deferred: true, currentSrc: '' }
  });

  const aperture = page.locator('[data-aperture]');
  await aperture.scrollIntoViewIfNeeded();
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  await page.clock.fastForward(7500);
  await expect.poll(() => deferredFrame.locator('img').evaluate((image) => (
    image.currentSrc ? new URL(image.currentSrc).pathname : ''
  ))).toBe('/assets/evidence/original/workspace/workspace_m2a_room_checkpoint.png');
  expect(await page.evaluate(() => window.__imagePromotions)).toEqual([
    'img:/assets/evidence/original/workspace/workspace_m2a_room_checkpoint.png'
  ]);
  expect(imageRequests.filter((pathname) => pathname.endsWith('/assets/evidence/original/workspace/workspace_m2a_room_checkpoint.png'))).toHaveLength(1);
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

  const deferredMatchedEvidence = page.locator('#work img[data-lazy-evidence]');
  await expect(deferredMatchedEvidence).toHaveCount(2);
  expect(await deferredMatchedEvidence.evaluateAll((images) => images.every((image) => (
    image.hasAttribute('data-src') && !image.hasAttribute('src') && image.currentSrc === ''
  )))).toBe(true);
  await deferredMatchedEvidence.first().scrollIntoViewIfNeeded();
  await expect.poll(() => deferredMatchedEvidence.evaluateAll((images) => images.every((image) => (
    image.hasAttribute('src') && !image.hasAttribute('data-src') && image.complete && image.naturalWidth > 0
  )))).toBe(true);
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
