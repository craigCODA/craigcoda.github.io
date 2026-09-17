import { expect, test } from '@playwright/test';

const warehouseRoute = '/projects/warehouse-optimization/';

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('desktop warehouse route preserves the split result and two-column decision ledger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(warehouseRoute);

  await expect(page.locator('.project-header .display')).toHaveText('Warehouse Optimization');
  const [metrics, visual] = await Promise.all([
    page.locator('.warehouse-metrics').boundingBox(),
    page.locator('.warehouse-result-visual').boundingBox()
  ]);
  expect(metrics).not.toBeNull();
  expect(visual).not.toBeNull();
  expect(visual.x).toBeGreaterThan(metrics.x + metrics.width);
  const [flowLabel, flowDescription] = await Promise.all([
    page.locator('.warehouse-flow strong').first().boundingBox(),
    page.locator('.warehouse-flow span').first().boundingBox()
  ]);
  expect(flowDescription.x).toBeGreaterThan(flowLabel.x + flowLabel.width);
  expect(errors).toEqual([]);
});

test('390-pixel warehouse route keeps decision labels paired with their descriptions without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  await page.goto(warehouseRoute);

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const [flowLabel, flowDescription] = await Promise.all([
    page.locator('.warehouse-flow strong').first().boundingBox(),
    page.locator('.warehouse-flow span').first().boundingBox()
  ]);
  expect(flowDescription.x).toBeGreaterThan(flowLabel.x + flowLabel.width);
  expect(errors).toEqual([]);
});

test('warehouse route truly reflows at 320 CSS pixels without title or decision-label overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  const errors = capturePageErrors(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(warehouseRoute);

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(320);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const [header, title] = await Promise.all([
    page.locator('.project-header').boundingBox(),
    page.locator('.project-header .display').boundingBox()
  ]);
  expect(title.x).toBeGreaterThanOrEqual(header.x);
  expect(title.x + title.width).toBeLessThanOrEqual(header.x + header.width);
  const labels = page.locator('.warehouse-flow strong');
  const descriptions = page.locator('.warehouse-flow span');
  await expect(labels).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    const [row, label, description] = await Promise.all([
      page.locator('.warehouse-flow li').nth(index).boundingBox(),
      labels.nth(index).boundingBox(),
      descriptions.nth(index).boundingBox()
    ]);
    expect(label.x).toBeGreaterThanOrEqual(row.x);
    expect(label.x + label.width).toBeLessThanOrEqual(row.x + row.width);
    expect(description.x).toBeGreaterThanOrEqual(row.x);
    expect(description.x + description.width).toBeLessThanOrEqual(row.x + row.width);
    expect(description.y).toBeGreaterThan(label.y);
  }
  expect(errors).toEqual([]);
});

test('warehouse keyboard users reach skip, main, and return control with visible focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(warehouseRoute);

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
