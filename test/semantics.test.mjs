import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const baseCssUrl = new URL('../assets/css/base.css', import.meta.url);
const textLinkDocuments = [
  '../404.html',
  '../projects/ppk076/index.html',
  '../projects/warehouse-optimization/index.html',
  '../projects/skill-evaluation-lab/index.html',
  '../projects/workspace-environment-vnext/index.html',
  '../projects/pythos/index.html'
];

function linksByLabel(markup, label) {
  return [...markup.matchAll(/<a\b([^>]*)>([^<]+)<\/a>/g)]
    .filter((match) => match[2].trim() === label)
    .map((match) => ({
      href: match[1].match(/\bhref="([^"]+)"/)?.[1],
      rel: match[1].match(/\brel="([^"]+)"/)?.[1]
    }));
}

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
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? '';
  const canonicalHref = html.match(/<link\b(?=[^>]*\brel="canonical")[^>]*\bhref="([^"]+)"/)?.[1];
  const allHrefs = [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(canonicalHref, 'https://craigcoda.github.io/');
  assert.equal(allHrefs.filter((href) => href === 'https://craigcoda.github.io/').length, 1);
  assert.equal(allHrefs.filter((href) => href === 'https://github.com/craigCODA').length, 2);
  assert.equal(allHrefs.filter((href) => href === 'mailto:mistercraigr@gmail.com').length, 1);
  assert.equal(allHrefs.filter((href) => href === 'https://www.linkedin.com/in/Craig-Ramos').length, 1);
  assert.equal(allHrefs.filter((href) => href === 'https://github.com/craigCODA/craigcoda.github.io').length, 1);
  assert.deepEqual(linksByLabel(nav, 'GitHub'), [
    { href: 'https://github.com/craigCODA', rel: 'noopener noreferrer' }
  ]);
  assert.deepEqual(linksByLabel(footer, 'GitHub'), [
    { href: 'https://github.com/craigCODA', rel: 'noopener noreferrer' }
  ]);
  assert.deepEqual(linksByLabel(footer, 'Email'), [
    { href: 'mailto:mistercraigr@gmail.com', rel: undefined }
  ]);
  assert.deepEqual(linksByLabel(footer, 'LinkedIn'), [
    { href: 'https://www.linkedin.com/in/Craig-Ramos', rel: 'noopener noreferrer' }
  ]);
  assert.deepEqual(linksByLabel(footer, 'Portfolio source'), [
    { href: 'https://github.com/craigCODA/craigcoda.github.io', rel: 'noopener noreferrer' }
  ]);
});

test('every current text-link document loads its shared styles and marks its return control', async () => {
  await Promise.all(textLinkDocuments.map(async (relativePath) => {
    const html = await readFile(new URL(relativePath, import.meta.url), 'utf8');

    assert.match(html, /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\/assets\/css\/base\.css"/);
    assert.match(html, /<a\b(?=[^>]*\bclass="[^"]*\btext-link\b[^"]*")(?=[^>]*\bhref="\/"\s*)[^>]*>/);
  }));
});

test('narrow-screen styles give every current link control a 44-pixel touch target', async () => {
  const css = await readFile(baseCssUrl, 'utf8');
  const narrowStyles = css.match(/@media\s*\(max-width:\s*42rem\)\s*\{([\s\S]*)\}\s*$/i)?.[1] ?? '';

  assert.match(narrowStyles, /\.text-link\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*min-height:\s*2\.75rem;/i);
  assert.match(css, /\.skip-link\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*min-height:\s*2\.75rem;[^}]*transform:\s*translateY\(-200%\);/i);
  assert.match(css, /\.skip-link:focus\s*\{[^}]*transform:\s*translateY\(0\);/i);
  assert.match(css, /\.site-nav a,\s*\.site-footer a\s*\{[^}]*min-height:\s*2\.75rem;/i);
});
