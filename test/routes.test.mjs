import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { DEPLOY_ENTRIES, SITE_ROUTES } from '../scripts/site-files.mjs';

const expectedRoutes = [
  '/',
  '/projects/ppk076/',
  '/projects/warehouse-optimization/',
  '/projects/skill-evaluation-lab/',
  '/projects/workspace-environment-vnext/',
  '/projects/pythos/'
];

test('site registry exposes the approved route set', () => {
  assert.deepEqual(SITE_ROUTES, expectedRoutes);
});

test('legacy root pythos route is not registered', () => {
  assert.equal(SITE_ROUTES.includes('/pythos/'), false);
});

test('deployment registry includes GitHub Pages protection entries', () => {
  assert.equal(DEPLOY_ENTRIES.includes('.nojekyll'), true);
  assert.equal(DEPLOY_ENTRIES.includes('.well-known'), true);
});

test('legacy top-level pythos directory is absent', async () => {
  await assert.rejects(access(new URL('../pythos/', import.meta.url)));
});

test('every registered route resolves to a static index document', async () => {
  await Promise.all(SITE_ROUTES.map((route) => {
    const relativePath = route === '/' ? '../index.html' : `..${route}index.html`;
    return access(new URL(relativePath, import.meta.url));
  }));
});

test('the static 404 document exists', async () => {
  await access(new URL('../404.html', import.meta.url));
});

test('PPK076 route provides one main landmark and the shared case-study sequence', async () => {
  const ppk = await readFile(new URL('../projects/ppk076/index.html', import.meta.url), 'utf8');
  const headings = [...ppk.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

  assert.equal((ppk.match(/<main\b/gi) ?? []).length, 1);
  assert.deepEqual(headings, [
    'Problem',
    'What I built',
    'Architecture / decisions',
    'Evidence',
    'Result',
    'Technologies',
    'Current boundary / unfinished work',
    'Source / demo / verification'
  ]);
});
