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

test('desktop PPK076 route keeps its opening evidence fully visible and publishes the spatial sequence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
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
  await expect(page.getByRole('link', { name: 'Source repository' })).toHaveAttribute('rel', /noopener/);
  await expect(page.getByRole('link', { name: 'Live demo' })).toHaveAttribute('rel', /noreferrer/);
});

test('mobile PPK076 route stacks the matched evidence pair with both comparison captions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
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
});
