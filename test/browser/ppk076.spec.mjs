import { expect, test } from '@playwright/test';

const ppkRoute = '/projects/ppk076/';
const sharedHeadings = [
  'Problem',
  'What I built',
  'Architecture / decisions',
  'Evidence',
  'Result',
  'Technologies',
  'Current boundary / unfinished work',
  'Source / demo / verification'
];

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('desktop PPK076 route keeps its opening evidence fully visible and publishes the spatial sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(ppkRoute);

  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h2')).toHaveText(sharedHeadings);
  const opening = page.locator('.ppk-opening-evidence img');
  await expect.poll(() => opening.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(opening).toBeVisible();
  await expect(opening).toHaveCSS('max-height', 'none');
  await expect(opening).toHaveCSS('object-fit', 'fill');

  const box = await opening.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width / box.height).toBeCloseTo(1759 / 916, 2);
  await expect(page.locator('.ppk-matched-pair .evidence-figure')).toHaveCount(2);
  const comparisonImages = page.locator('.ppk-matched-pair img');
  await expect(comparisonImages).toHaveCount(2);
  await expect(comparisonImages.nth(0)).toHaveCSS('object-position', '50% 50%');
  await expect(comparisonImages.nth(1)).toHaveCSS('object-position', '50% 50%');
  const [beforeComparison, afterComparison] = await Promise.all([comparisonImages.nth(0).boundingBox(), comparisonImages.nth(1).boundingBox()]);
  expect(beforeComparison).not.toBeNull();
  expect(afterComparison).not.toBeNull();
  expect(beforeComparison.width).toBeCloseTo(afterComparison.width, 2);
  expect(beforeComparison.height).toBeCloseTo(afterComparison.height, 2);
  await expect(page.getByRole('link', { name: 'Source repository' })).toHaveAttribute('rel', /noopener/);
  await expect(page.getByRole('link', { name: 'Live demo' })).toHaveAttribute('rel', /noreferrer/);
  expect(errors).toEqual([]);
});

test('mobile PPK076 route stacks the matched evidence pair with both comparison captions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  await page.goto(ppkRoute);

  const pair = page.locator('.ppk-matched-pair .evidence-figure');
  await expect(pair).toHaveCount(2);
  await expect(pair.nth(0)).toContainText('Before local import visualization');
  await expect(pair.nth(1)).toContainText('After supported local import visualization');
  const [before, after] = await Promise.all([pair.nth(0).boundingBox(), pair.nth(1).boundingBox()]);

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(before.width).toBeGreaterThan(300);
  expect(after.width).toBeGreaterThan(300);
  expect(after.y).toBeGreaterThan(before.y + before.height);
  const images = pair.locator('img');
  await expect(images.nth(0)).toHaveCSS('object-position', '50% 50%');
  await expect(images.nth(1)).toHaveCSS('object-position', '50% 50%');
  const [beforeImage, afterImage] = await Promise.all([images.nth(0).boundingBox(), images.nth(1).boundingBox()]);
  expect(beforeImage.width).toBeCloseTo(afterImage.width, 2);
  expect(beforeImage.height).toBeCloseTo(afterImage.height, 2);
  expect(errors).toEqual([]);
});

test('PPK076 reflows at a 320 CSS-pixel viewport, the layout width at 200 percent browser zoom', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  // Browser zoom doubles CSS pixels per physical pixel. A 640px browser at 200% therefore
  // presents a 320 CSS-pixel layout viewport; setting that viewport exercises reflow rather
  // than CDP pageScaleFactor's visual-only pinch scaling.
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(ppkRoute);
  const pair = page.locator('.ppk-matched-pair');
  const frames = pair.locator('.evidence-figure');

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(320);
  await expect.poll(() => page.evaluate(() => matchMedia('(max-width: 42rem)').matches)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(pair).toBeVisible();
  const [firstFrame, secondFrame] = await Promise.all([frames.nth(0).boundingBox(), frames.nth(1).boundingBox()]);
  expect(secondFrame.y).toBeGreaterThan(firstFrame.y + firstFrame.height);
  expect(errors).toEqual([]);
});

test('PPK076 keyboard users reach skip, main, and return control with visible focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(ppkRoute);

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  const skipBox = await skip.boundingBox();
  expect(skipBox.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  const returnHome = page.getByRole('link', { name: 'Return home' });
  await expect(returnHome).toBeFocused();
  await expect(returnHome).toHaveCSS('outline-style', 'solid');
  await expect(returnHome).toHaveCSS('outline-width', '3px');
  expect(errors).toEqual([]);
});

test('PPK076 lazy comparison and boundary evidence decodes after scrolling', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  await page.goto(ppkRoute);
  const lazyEvidence = page.locator('.ppk-page img[loading="lazy"]');

  await expect(lazyEvidence).toHaveCount(9);
  await expect(lazyEvidence.evaluateAll((images) => images.map((image) => image.getAttribute('loading')))).resolves.toEqual(Array(9).fill('lazy'));
  for (let index = 0; index < 9; index += 1) {
    const image = lazyEvidence.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
    await expect(image.evaluate(async (element) => {
      await element.decode();
      return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
    })).resolves.toBe(true);
  }
  expect(errors).toEqual([]);
});
