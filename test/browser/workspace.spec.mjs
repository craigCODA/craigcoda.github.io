import { expect, test } from '@playwright/test';

const workspaceRoute = '/projects/workspace-environment-vnext/';
const mandatoryBoundary = 'The large application screen is a placeholder in this saved M2A room checkpoint; live generic Windows surface streaming was not complete at this checkpoint.';
const sourceUrl = 'https://github.com/craigCODA/workspace-environment-vnext';

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
  for (const selector of ['.workspace-evidence-layout', '.workspace-authority-flow']) {
    await expect.poll(() => page.locator(selector).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
}

async function expectEvidenceStacked(page) {
  const [room, authority] = await Promise.all([
    page.locator('.workspace-room-plane').boundingBox(),
    page.locator('.workspace-authority-column').boundingBox()
  ]);

  expect(room).not.toBeNull();
  expect(authority).not.toBeNull();
  expect(authority.y).toBeGreaterThanOrEqual(room.y + room.height);
}

test('desktop Workspace route preserves its split room plane and offset authority column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(workspaceRoute);

  const [room, authority] = await Promise.all([
    page.locator('.workspace-room-plane').boundingBox(),
    page.locator('.workspace-authority-column').boundingBox()
  ]);
  expect(room).not.toBeNull();
  expect(authority).not.toBeNull();
  expect(authority.x).toBeGreaterThan(room.x + room.width);
  expect(authority.y).toBeGreaterThan(room.y);

  const boundary = page.getByText(mandatoryBoundary, { exact: true });
  await boundary.scrollIntoViewIfNeeded();
  await expect(boundary).toBeVisible();

  const image = page.locator('.workspace-room-plane img');
  await expect(page.locator('.workspace-page img')).toHaveCount(1);
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('width', '1760');
  await expect(image).toHaveAttribute('height', '990');
  await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
  await expect(image.evaluate(async (element) => {
    await element.decode();
    return element.naturalWidth / element.naturalHeight;
  })).resolves.toBeCloseTo(1760 / 990, 2);
  const imageBox = await image.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(imageBox.width / imageBox.height).toBeCloseTo(1760 / 990, 2);

  const source = page.getByRole('link', { name: 'Source repository' });
  await expect(source).toHaveAttribute('href', sourceUrl);
  await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  expect(errors).toEqual([]);
});

test('390-pixel Workspace route stacks the evidence and keeps its mandatory boundary visible without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  await page.goto(workspaceRoute);

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(390);
  await expectNoHorizontalOverflow(page);
  await expectEvidenceStacked(page);
  const boundary = page.getByText(mandatoryBoundary, { exact: true });
  await boundary.scrollIntoViewIfNeeded();
  await expect(boundary).toBeVisible();
  expect(errors).toEqual([]);
});

test('Workspace route truly reflows at 320 CSS pixels without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(workspaceRoute);

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(320);
  await expectNoHorizontalOverflow(page);
  await expectEvidenceStacked(page);
  const [header, title] = await Promise.all([
    page.locator('.project-header').boundingBox(),
    page.locator('.project-header .display').boundingBox()
  ]);
  expect(header).not.toBeNull();
  expect(title).not.toBeNull();
  expect(title.x).toBeGreaterThanOrEqual(header.x);
  expect(title.x + title.width).toBeLessThanOrEqual(header.x + header.width);
  await expect(page.getByText(mandatoryBoundary, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Workspace keyboard users reach skip, main, and return controls with visible focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(workspaceRoute);

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  const skipBox = await skip.boundingBox();
  expect(skipBox).not.toBeNull();
  expect(skipBox.y).toBeGreaterThanOrEqual(0);
  await expect(skip).toHaveCSS('outline-style', 'solid');
  await expect(skip).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  const returnHome = page.getByRole('link', { name: 'Return home' });
  await expect(returnHome).toBeFocused();
  await expect(returnHome).toHaveCSS('outline-style', 'solid');
  await expect(returnHome).toHaveCSS('outline-width', '3px');
  expect(errors).toEqual([]);
});
