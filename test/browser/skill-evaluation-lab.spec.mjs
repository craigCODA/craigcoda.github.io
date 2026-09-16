import { expect, test } from '@playwright/test';

const skillLabRoute = '/projects/skill-evaluation-lab/';
const intermediateWidths = [673, 720, 768];

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
  for (const selector of ['.skill-lab-architecture', '.skill-lab-evidence', '.skill-lab-result-layout']) {
    await expect.poll(() => page.locator(selector).evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
}

async function expectStacked(page, firstSelector, secondSelector) {
  const [first, second] = await Promise.all([
    page.locator(firstSelector).boundingBox(),
    page.locator(secondSelector).boundingBox()
  ]);

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
}

async function expectSplit(page, firstSelector, secondSelector) {
  const [first, second] = await Promise.all([
    page.locator(firstSelector).boundingBox(),
    page.locator(secondSelector).boundingBox()
  ]);

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second.x).toBeGreaterThan(first.x + first.width);
}

for (const width of intermediateWidths) {
  test(`${width}-pixel Skill Evaluation Lab route stacks wide-track sections without overflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    const errors = capturePageErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(skillLabRoute);

    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
    await expectNoHorizontalOverflow(page);
    await expectStacked(page, '.skill-lab-architecture > div', '.skill-lab-architecture > .skill-evidence-chain');
    await expectStacked(page, '.skill-lab-evidence > .skill-lab-evidence-copy', '.skill-lab-evidence > .skill-lab-visual');
    await expectStacked(page, '.skill-lab-result-layout > h2', '.skill-lab-result-layout > .serif-lede');
    expect(errors).toEqual([]);
  });
}

test('Skill Evaluation Lab keeps its wide split and narrow vertical compositions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(skillLabRoute);

  await expectSplit(page, '.skill-lab-architecture > div', '.skill-lab-architecture > .skill-evidence-chain');
  await expectSplit(page, '.skill-lab-evidence > .skill-lab-evidence-copy', '.skill-lab-evidence > .skill-lab-visual');
  await expectSplit(page, '.skill-lab-result-layout > h2', '.skill-lab-result-layout > .serif-lede');

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await expectStacked(page, '.skill-lab-architecture > div', '.skill-lab-architecture > .skill-evidence-chain');
  await expectStacked(page, '.skill-lab-evidence > .skill-lab-evidence-copy', '.skill-lab-evidence > .skill-lab-visual');
  await expectStacked(page, '.skill-lab-result-layout > h2', '.skill-lab-result-layout > .serif-lede');
  const [firstStep, secondStep] = await Promise.all([
    page.locator('.skill-evidence-chain li').nth(0).boundingBox(),
    page.locator('.skill-evidence-chain li').nth(1).boundingBox()
  ]);
  expect(secondStep.y).toBeGreaterThanOrEqual(firstStep.y + firstStep.height);
  expect(errors).toEqual([]);
});

test('Skill Evaluation Lab keyboard users reach skip, main, and return control with visible focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const errors = capturePageErrors(page);
  await page.goto(skillLabRoute);

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press('Tab');
  const returnHome = page.getByRole('link', { name: 'Return home' });
  await expect(returnHome).toBeFocused();
  await expect(returnHome).toHaveCSS('outline-style', 'solid');
  await expect(returnHome).toHaveCSS('outline-width', '3px');
  expect(errors).toEqual([]);
});
