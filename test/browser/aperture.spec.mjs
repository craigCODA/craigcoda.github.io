import { expect, test } from '@playwright/test';

async function enterAperture(page) {
  await page.locator('[data-aperture]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-aperture]')).toHaveAttribute('data-play-count', '1');
}

test('plays once only after meaningful viewport entry without carousel controls', async ({ page }) => {
  await page.goto('/');

  const aperture = page.locator('[data-aperture]');
  await expect(aperture).toHaveAttribute('data-play-count', '0');
  await expect(page.locator('[data-aperture] button, [data-aperture] [aria-roledescription="carousel"], [data-aperture] [class*="dot"]')).toHaveCount(0);

  await enterAperture(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#work').scrollIntoViewIfNeeded();
  await expect(aperture).toHaveAttribute('data-play-count', '1');
});

test('uses the authored desktop aperture ratio', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  const box = await page.locator('[data-aperture]').boundingBox();

  expect(box.width / box.height).toBeGreaterThan(2.05);
  expect(box.width / box.height).toBeLessThan(2.35);
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

test('uses immediate still cuts and retains the complete transcript in reduced motion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion');
  await page.goto('/');

  const aperture = page.locator('[data-aperture]');
  await expect(aperture).toHaveAttribute('data-motion', 'reduced');
  await expect(aperture.locator('.aperture-transcript li')).toHaveCount(6);
  const durations = await aperture.locator('[data-aperture-frame]').evaluateAll((frames) => frames.map((frame) => {
    const styles = getComputedStyle(frame);
    return { animation: styles.animationDuration, transition: styles.transitionDuration };
  }));

  expect(durations.every(({ animation, transition }) => animation === '0s' && transition === '0s')).toBe(true);
  await enterAperture(page);
});

test('hard swaps PythOS terminal evidence to its registered architecture artifact', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await page.locator('[data-aperture-frame]').evaluateAll((frames) => {
    frames.forEach((frame, index) => {
      frame.hidden = index !== 4;
      frame.setAttribute('aria-hidden', String(index !== 4));
    });
  });

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
