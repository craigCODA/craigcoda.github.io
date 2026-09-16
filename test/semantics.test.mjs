import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const baseCssUrl = new URL('../assets/css/base.css', import.meta.url);

test('homepage exposes one accessible publication shell', async () => {
  const html = await readFile(indexUrl, 'utf8');

  assert.equal((html.match(/<main\b/gi) ?? []).length, 1);
  assert.match(html, /<a\b[^>]*href=["']#main-content["'][^>]*class=["'][^"']*skip-link/);
  assert.match(html, /<header\b/i);
  assert.match(html, /<nav\b[^>]*aria-label=["'][^"']+["']/i);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(html, /<footer\b/i);
});

test('homepage navigation presents the required editorial destinations in order', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/i)?.[1] ?? '';
  const labels = [...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/gi)].map((match) => match[1].trim());

  assert.deepEqual(labels, ['Work', 'Background', 'Verified Work', 'GitHub', 'Contact']);
});

test('homepage uses the registered public destinations and safe external link rel values', async () => {
  const html = await readFile(indexUrl, 'utf8');

  assert.match(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/craigcoda\.github\.io\/["']/i);
  assert.match(html, /<a\b[^>]*href=["']https:\/\/github\.com\/craigCODA["'][^>]*rel=["'][^"']*noopener[^"']*noreferrer[^"']*["'][^>]*>GitHub<\/a>/i);
  assert.match(html, /<a\b[^>]*href=["']mailto:mistercraigr@gmail\.com["'][^>]*>Email<\/a>/i);
  assert.match(html, /<a\b[^>]*href=["']https:\/\/www\.linkedin\.com\/in\/Craig-Ramos["'][^>]*rel=["'][^"']*noopener[^"']*noreferrer[^"']*["'][^>]*>LinkedIn<\/a>/i);
  assert.match(html, /<a\b[^>]*href=["']https:\/\/github\.com\/craigCODA\/craigcoda\.github\.io["'][^>]*rel=["'][^"']*noopener[^"']*noreferrer[^"']*["'][^>]*>Portfolio source<\/a>/i);
});

test('narrow-screen styles give every current link control a 44-pixel touch target', async () => {
  const css = await readFile(baseCssUrl, 'utf8');
  const narrowStyles = css.match(/@media\s*\(max-width:\s*42rem\)\s*\{([\s\S]*)\}\s*$/i)?.[1] ?? '';

  assert.match(narrowStyles, /\.text-link\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*min-height:\s*2\.75rem;/i);
  assert.match(css, /\.skip-link\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*min-height:\s*2\.75rem;/i);
  assert.match(css, /\.site-nav a,\s*\.site-footer a\s*\{[^}]*min-height:\s*2\.75rem;/i);
});
