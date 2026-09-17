import { expect, test } from '@playwright/test';
import { SITE_ROUTES } from '../../scripts/site-files.mjs';

const PROJECT_LINKS = Object.freeze({
  '/projects/ppk076/': [
    ['Source repository', 'https://github.com/craigCODA/ppk076'],
    ['Live demo', 'https://craigcoda.github.io/ppk076/']
  ],
  '/projects/skill-evaluation-lab/': [
    ['Source repository', 'https://github.com/craigCODA/Skill-Evaluation-Lab'],
    ['Evidence release: evidence-0001-0015', 'https://github.com/craigCODA/Skill-Evaluation-Lab/releases/tag/evidence-0001-0015']
  ],
  '/projects/workspace-environment-vnext/': [
    ['Source repository', 'https://github.com/craigCODA/workspace-environment-vnext']
  ],
  '/projects/pythos/': [
    ['Source repository', 'https://github.com/craigCODA/pythos'],
    ['Independent PythOS documentation', 'https://craigcoda.github.io/pythos/'],
    ['Milestone release: Physical Persistent Object Storage', 'https://github.com/craigCODA/pythos/releases/tag/milestone-1-physical-storage']
  ]
});

function captureFailures(page) {
  const failures = [];
  page.on('requestfailed', (request) => failures.push(`request: ${request.url()} (${request.failure()?.errorText})`));
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4173') && response.status() >= 400) {
      failures.push(`response: ${response.status()} ${response.url()}`);
    }
  });
  return failures;
}

for (const route of SITE_ROUTES) {
  test(`${route} supports direct production navigation and reload without request or console failures`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'navigation behavior is viewport-independent; desktop is the canonical run');
    const failures = captureFailures(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    const reload = await page.reload();
    expect(reload?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    expect(failures).toEqual([]);
  });
}

test('home project links and project return-home links navigate to the exact registered routes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'link destinations are viewport-independent; desktop is the canonical run');
  const projectRoutes = SITE_ROUTES.filter((route) => route !== '/');

  for (const route of projectRoutes) {
    await page.goto('/');
    const link = page.locator(`a[href="${route}"]`);
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}$`));
    await page.getByRole('link', { name: 'Return home' }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});

test('source, demo, and documentation links navigate to their exact external targets', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'external-link destinations are viewport-independent; desktop is the canonical run');
  await context.route(/^https:\/\/(github\.com|craigcoda\.github\.io)\//, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>External target</title>'
  }));

  for (const [projectRoute, links] of Object.entries(PROJECT_LINKS)) {
    for (const [name, target] of links) {
      await page.goto(projectRoute);
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', target);
      if (await link.getAttribute('target') === '_blank') {
        const popupPromise = context.waitForEvent('page');
        await link.click();
        const popup = await popupPromise;
        await expect.poll(() => popup.url()).toBe(target);
        await popup.close();
      } else {
        await link.click();
        await expect(page).toHaveURL(target);
      }
    }
  }
});

test('PythOS documentation ownership remains the exact independent external URL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'URL ownership is viewport-independent; desktop is the canonical run');
  await page.goto('/projects/pythos/');
  await expect(page.getByRole('link', { name: 'Independent PythOS documentation' })).toHaveAttribute('href', 'https://craigcoda.github.io/pythos/');
  expect(SITE_ROUTES).not.toContain('/pythos/');
});
