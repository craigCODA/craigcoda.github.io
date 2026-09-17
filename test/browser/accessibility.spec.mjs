import { expect, test } from '@playwright/test';
import { SITE_ROUTES } from '../../scripts/site-files.mjs';

const WIDTHS_BY_PROJECT = Object.freeze({
  desktop: [1440, 720],
  tablet: [834],
  mobile: [390, 320]
});

function captureRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectFocusedElementToBeVisible(page) {
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const styles = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      label: element.href || element.id || element.textContent.trim(),
      outlineStyle: styles.outlineStyle,
      outlineWidth: Number.parseFloat(styles.outlineWidth),
      visible: box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0
    };
  });

  expect(focus.visible).toBe(true);
  expect(focus.outlineStyle, `${focus.label} needs a visible focus style`).not.toBe('none');
  expect(focus.outlineWidth, `${focus.label} needs a >=2px focus outline`).toBeGreaterThanOrEqual(2);
}

for (const route of SITE_ROUTES) {
  test(`${route} exposes complete semantics and a trap-free DOM-order keyboard path`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'semantic and keyboard behavior is viewport-independent; desktop is the canonical run');
    const errors = captureRuntimeErrors(page);
    const response = await page.goto(route);

    expect(response?.status()).toBe(200);
    for (const role of ['banner', 'navigation', 'main', 'contentinfo']) {
      await expect(page.getByRole(role)).toHaveCount(1);
    }

    const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((headings) => (
      headings.map((heading) => Number(heading.tagName.slice(1)))
    ));
    expect(headingLevels.filter((level) => level === 1)).toHaveLength(1);
    for (let index = 1; index < headingLevels.length; index += 1) {
      expect(headingLevels[index] - headingLevels[index - 1], `heading level at index ${index}`).toBeLessThanOrEqual(1);
    }

    const imageAlternatives = await page.locator('img').evaluateAll((images) => images.map((image) => ({
      src: image.currentSrc || image.dataset.src || image.src,
      alt: image.getAttribute('alt')
    })));
    for (const image of imageAlternatives) {
      expect(image.alt, `${image.src} must have an alt attribute`).not.toBeNull();
      expect(image.alt.trim(), `${image.src} is evidence, not decorative`).not.toBe('');
    }

    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toBeVisible();
    await expectFocusedElementToBeVisible(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    const expected = await page.locator('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])').evaluateAll((elements) => (
      elements.filter((element) => {
        const styles = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return styles.display !== 'none' && styles.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      }).map((element, index) => {
        element.dataset.acceptanceTabIndex = String(index);
        return String(index);
      })
    ));
    const visited = [];
    for (let presses = 0; visited.length < expected.length && presses < expected.length + 2; presses += 1) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement === document.body)) continue;
      await expectFocusedElementToBeVisible(page);
      visited.push(await page.evaluate(() => {
        const element = document.activeElement;
        return element.dataset.acceptanceTabIndex;
      }));
    }
    const rotationStart = expected.indexOf(visited[0]);
    expect(rotationStart).toBeGreaterThanOrEqual(0);
    expect(visited).toEqual([...expected.slice(rotationStart), ...expected.slice(0, rotationStart)]);
    expect(new Set(visited)).toHaveProperty('size', expected.length);
    expect(errors).toEqual([]);
  });

  test(`${route} has no horizontal overflow at the required responsive and 200-percent-reflow widths`, async ({ page }, testInfo) => {
    const widths = WIDTHS_BY_PROJECT[testInfo.project.name];
    test.skip(!widths, 'reduced-motion uses the desktop geometry; its behavior is checked separately');

    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), {
        message: `${route} must not overflow at ${width}px`
      }).toBe(true);
    }
  });
}

test('reduced motion preserves the six-state aperture transcript without transitions or transforms', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion', 'requires the reduced-motion Playwright project');
  await page.goto('/');
  const aperture = page.locator('[data-aperture]');

  await expect(aperture).toHaveAttribute('data-motion', 'reduced');
  await expect(aperture.locator('.aperture-transcript li')).toHaveCount(6);
  expect(await aperture.locator('*').evaluateAll((elements) => elements.every((element) => {
    const styles = getComputedStyle(element);
    return styles.animationDuration === '0s' && styles.transitionDuration === '0s' && styles.transform === 'none';
  }))).toBe(true);
});
