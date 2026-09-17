import { expect, test } from '@playwright/test';
import { SITE_ROUTES } from '../../scripts/site-files.mjs';

const WIDTHS_BY_PROJECT = Object.freeze({
  desktop: [1440, 720],
  tablet: [834],
  mobile: [390, 320]
});

const APERTURE_STATES = Object.freeze([
  {
    duration: 4000,
    statement: 'I MODEL PHYSICAL SYSTEMS.',
    evidenceNames: [
      'First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment',
      'Matched warehouse camera before local inventory data is visualized, showing the modeled storage structure largely unpopulated',
      'Same warehouse camera after supported local inventory data is visualized as pallet loads throughout the modeled facility'
    ]
  },
  {
    duration: 3500,
    statement: 'I TURN OPERATIONS INTO DECISION SYSTEMS.',
    evidenceNames: ['Public-safe abstract grid beside the verified result: 176 pallet positions recovered and 22 storage bins freed']
  },
  {
    duration: 4000,
    statement: 'I TEST WHAT AGENTS ACTUALLY DO.',
    evidenceNames: ['Evidence map showing control, isolation, comparison, replication, and hash verification, with a captured saved-record status block']
  },
  {
    duration: 4000,
    statement: 'I RETHINK HOW THE COMPUTER CAN FEEL.',
    evidenceNames: ['Saved M2A room checkpoint with a spatial screen placeholder, table, brick objects, object panel, trusted controls, and connected state']
  },
  {
    duration: 4500,
    statement: 'I BUILD BELOW THE APPLICATION LAYER.',
    evidenceNames: [
      'PythOS evidence terminal running on a physical laptop, with enough screen bezel visible to establish the hardware context',
      'Architecture and evidence diagram separating governing design, Phase 13 verification, target-specific physical evidence, and later work'
    ]
  },
  {
    duration: 3000,
    statement: 'PHYSICAL SYSTEMS. SOFTWARE SYSTEMS. AI SYSTEMS. COMPUTER SYSTEMS.',
    evidenceNames: []
  }
]);

function captureRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectFocusedElementToBeVisible(page, { requireFullViewport = true } = {}) {
  const focus = await page.evaluate((mustFitViewport) => {
    const element = document.activeElement;
    const styles = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = styles.outlineColor;
    context.fillRect(0, 0, 1, 1);
    const outlineAlpha = context.getImageData(0, 0, 1, 1).data[3];
    return {
      label: element.href || element.id || element.textContent.trim(),
      outlineAlpha,
      outlineColor: styles.outlineColor,
      outlineStyle: styles.outlineStyle,
      outlineWidth: Number.parseFloat(styles.outlineWidth),
      visible: box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth,
      fullyInsideViewport: !mustFitViewport || (box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth)
    };
  }, requireFullViewport);

  expect(focus.visible).toBe(true);
  expect(focus.fullyInsideViewport, `${focus.label} must be fully inside the viewport`).toBe(true);
  expect(focus.outlineStyle, `${focus.label} needs a visible focus style`).not.toBe('none');
  expect(focus.outlineWidth, `${focus.label} needs a >=2px focus outline`).toBeGreaterThanOrEqual(2);
  expect(focus.outlineAlpha, `${focus.label} has a transparent ${focus.outlineColor} outline`).toBeGreaterThan(0);
}

async function enterAperture(page) {
  const aperture = page.locator('[data-aperture]');
  await aperture.scrollIntoViewIfNeeded();
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  return aperture;
}

async function expectApertureState(aperture, index, state) {
  await expect(aperture).toHaveAttribute('data-frame', String(index));
  const frames = aperture.locator('[data-aperture-frame]');
  const activeFrame = frames.nth(index);
  await expect(aperture.locator('[data-aperture-frame]:not([hidden])')).toHaveCount(1);
  await expect(activeFrame).not.toHaveAttribute('hidden', '');
  await expect(activeFrame.locator('.aperture-copy')).toContainText(state.statement);
  await expect(activeFrame.getByRole('img')).toHaveCount(state.evidenceNames.length);
  for (const name of state.evidenceNames) {
    await expect(activeFrame.getByRole('img', { name, exact: true })).toHaveCount(1);
  }
  for (let frameIndex = 0; frameIndex < APERTURE_STATES.length; frameIndex += 1) {
    if (frameIndex !== index) await expect(frames.nth(frameIndex).getByRole('img')).toHaveCount(0);
  }
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
    expect(await page.evaluate(() => {
      const main = document.querySelector('main');
      const banner = document.querySelector('header, [role="banner"]');
      const navigation = document.querySelector('nav, [role="navigation"]');
      const contentinfo = document.querySelector('footer, [role="contentinfo"]');
      const precedesMain = (element) => Boolean(element.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING);
      const followsMain = (element) => Boolean(main.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        bannerBeforeMain: precedesMain(banner),
        navigationBeforeMain: precedesMain(navigation),
        contentinfoAfterMain: followsMain(contentinfo),
        mainContainsBanner: main.contains(banner),
        mainContainsContentinfo: main.contains(contentinfo)
      };
    })).toEqual({
      bannerBeforeMain: true,
      navigationBeforeMain: true,
      contentinfoAfterMain: true,
      mainContainsBanner: false,
      mainContainsContentinfo: false
    });

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
    await expectFocusedElementToBeVisible(page, { requireFullViewport: false });

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

test('active aperture evidence has computed accessible names without exposing inactive duplicates', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'computed aperture accessibility is viewport-independent; desktop is the canonical pre-entry run');
  await page.goto('/');
  const aperture = page.locator('[data-aperture]');

  await expect(aperture).toHaveAttribute('data-play-count', '0');
  await expectApertureState(aperture, 0, APERTURE_STATES[0]);
});

test('mobile and reduced motion observe all six aperture states once in authored order', async ({ page }, testInfo) => {
  test.skip(!['mobile', 'reduced-motion'].includes(testInfo.project.name), 'state parity is required on mobile and reduced-motion projects');
  await page.clock.install({ time: new Date('2026-01-01T00:00:00.000Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00.000Z'));
  const aperture = await enterAperture(page);
  const observed = [];

  for (const [index, state] of APERTURE_STATES.entries()) {
    await expectApertureState(aperture, index, state);
    observed.push(Number(await aperture.getAttribute('data-frame')));
    if (testInfo.project.name === 'reduced-motion') {
      expect(await aperture.locator('*').evaluateAll((elements) => elements.every((element) => {
        const styles = getComputedStyle(element);
        return styles.animationDuration === '0s' && styles.transitionDuration === '0s' && styles.transform === 'none';
      })), `reduced-motion state ${index} must be a transform-free instant cut`).toBe(true);
    }
    await page.clock.fastForward(state.duration);
  }

  expect(observed).toEqual([0, 1, 2, 3, 4, 5]);
  await expect(aperture).toHaveAttribute('data-frame', '5');
  await expect(aperture).toHaveAttribute('data-status', 'complete');
  await expect(aperture).toHaveAttribute('data-play-count', '1');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await aperture.scrollIntoViewIfNeeded();
  await page.clock.fastForward(23000);
  await expect(aperture).toHaveAttribute('data-frame', '5');
  await expect(aperture).toHaveAttribute('data-status', 'complete');
  await expect(aperture).toHaveAttribute('data-play-count', '1');
});
