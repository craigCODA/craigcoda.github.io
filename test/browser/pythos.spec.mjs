import { expect, test } from '@playwright/test';

const pythosRoute = '/projects/pythos/';
const physicalResult = 'On the documented target-specific physical evidence path: 313 verification markers, zero drops, CRC 176F4C6E.';
const hardwareBoundary = 'This is not a claim of universal hardware support.';
const sourceUrl = 'https://github.com/craigCODA/pythos';
const docsUrl = 'https://craigcoda.github.io/pythos/';
const releaseUrl = 'https://github.com/craigCODA/pythos/releases/tag/milestone-1-physical-storage';

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const selector of ['.pythos-architecture', '.pythos-terminal-layout', '.pythos-document-pair']) {
    await expect.poll(() => page.locator(selector).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
}

async function expectVerticalDocumentPair(page) {
  const documents = page.locator('.pythos-document-pair figure');
  const [evidenceMap, claimBoundary] = await Promise.all([
    documents.nth(0).boundingBox(),
    documents.nth(1).boundingBox()
  ]);
  expect(evidenceMap).not.toBeNull();
  expect(claimBoundary).not.toBeNull();
  expect(claimBoundary.y).toBeGreaterThanOrEqual(evidenceMap.y + evidenceMap.height);
}

test('desktop PythOS route renders its physical evidence and vertically paired public boundary documents', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  const response = await page.goto(pythosRoute);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/PythOS — Technical Evidence Case Study/);
  await expect(page.getByText(physicalResult, { exact: true })).toBeVisible();
  await expect(page.getByText(hardwareBoundary, { exact: true })).toBeVisible();
  await expect(page.locator('.pythos-page img')).toHaveCount(4);
  await expect(page.locator('.pythos-terminal-band')).toHaveCSS('background-color', 'rgb(27, 29, 31)');

  const [architectureCopy, architectureFigure] = await Promise.all([
    page.locator('.pythos-architecture-copy').boundingBox(),
    page.locator('.pythos-architecture-figure').boundingBox()
  ]);
  expect(architectureCopy).not.toBeNull();
  expect(architectureFigure).not.toBeNull();
  expect(architectureFigure.x).toBeGreaterThan(architectureCopy.x + architectureCopy.width);

  await expectVerticalDocumentPair(page);
  for (const link of [
    ['Source repository', sourceUrl],
    ['Independent PythOS documentation', docsUrl],
    ['Milestone release: Physical Persistent Object Storage', releaseUrl]
  ]) {
    await expect(page.getByRole('link', { name: link[0] })).toHaveAttribute('href', link[1]);
  }

  for (let index = 0; index < 4; index += 1) {
    const image = page.locator('.pythos-page img').nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
  }

  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  const returnHome = page.getByRole('link', { name: 'Return home' });
  await expect(returnHome).toBeFocused();
  await expect(returnHome).toHaveCSS('outline-style', 'solid');
  await expect(returnHome).toHaveCSS('outline-width', '3px');
  expect(errors).toEqual([]);
});

test('mobile and 320-pixel PythOS route reflows without overflow and keeps claims and evidence visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  const response = await page.goto(pythosRoute);

  expect(response?.status()).toBe(200);
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(390);
  await expectNoHorizontalOverflow(page);
  await expectVerticalDocumentPair(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(320);
  await expectNoHorizontalOverflow(page);
  await expectVerticalDocumentPair(page);
  await expect(page.getByText(physicalResult, { exact: true })).toBeVisible();
  await expect(page.getByText(hardwareBoundary, { exact: true })).toBeVisible();

  const terminal = page.locator('.pythos-terminal-figure img');
  await terminal.scrollIntoViewIfNeeded();
  await expect.poll(() => terminal.evaluate((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
  expect(await terminal.evaluate((image) => image.naturalWidth / image.naturalHeight)).toBeCloseTo(1536 / 865, 2);
  expect(errors).toEqual([]);
});

test('PythOS documentation remains external rather than a locally served top-level route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const response = await page.goto('/pythos/');

  expect(response?.status()).toBe(404);
});
