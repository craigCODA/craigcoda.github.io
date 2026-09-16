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

function parseAttributes(tag) {
  const attributes = new Map();
  const source = tag.replace(/^<[^\s>]+/, '').replace(/\/?>$/, '');

  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attributes;
}

function openingTags(markup, tagName) {
  return [...markup.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))]
    .map((match) => ({ tag: match[0], attributes: parseAttributes(match[0]) }));
}

function linksByLabel(markup, label) {
  return [...markup.matchAll(/(<a\b[^>]*>)([^<]+)<\/a>/gi)]
    .filter((match) => match[2].trim() === label)
    .map((match) => parseAttributes(match[1]));
}

function attributeTokens(attributes, name) {
  return new Set((attributes.get(name) ?? '').toLowerCase().split(/\s+/).filter(Boolean));
}

function assertLink(markup, label, href, { safeExternal = false } = {}) {
  const links = linksByLabel(markup, label);

  assert.equal(links.length, 1);
  assert.equal(links[0].get('href'), href);

  if (safeExternal) {
    const relTokens = attributeTokens(links[0], 'rel');
    assert.equal(relTokens.has('noopener'), true);
    assert.equal(relTokens.has('noreferrer'), true);
  }
}

function parseDeclarations(block) {
  const declarations = new Map();

  for (const source of block.split(';')) {
    const separator = source.indexOf(':');
    if (separator === -1) continue;

    const property = source.slice(0, separator).trim().toLowerCase();
    const rawValue = source.slice(separator + 1).trim();
    const important = /\s*!important\s*$/i.test(rawValue);
    const value = rawValue.replace(/\s*!important\s*$/i, '').trim();
    declarations.set(property, { value, important });
  }

  return declarations;
}

function effectiveDeclarations(css, targetSelector) {
  const effective = new Map();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  for (const rule of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1].split(',').map((selector) => selector.trim());
    if (!selectors.includes(targetSelector)) continue;

    for (const [property, declaration] of parseDeclarations(rule[2])) {
      const current = effective.get(property);
      if (!current?.important || declaration.important) effective.set(property, declaration);
    }
  }

  return new Map([...effective].map(([property, declaration]) => [property, declaration.value]));
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
  const documentLinks = [...openingTags(html, 'link'), ...openingTags(html, 'a')];
  const canonicalLinks = openingTags(html, 'link')
    .filter(({ attributes }) => attributeTokens(attributes, 'rel').has('canonical'));
  const allHrefs = documentLinks.map(({ attributes }) => attributes.get('href'));

  assert.equal(canonicalLinks.length, 1);
  assert.equal(canonicalLinks[0].attributes.get('href'), 'https://craigcoda.github.io/');
  assert.equal(allHrefs.filter((href) => href === 'https://craigcoda.github.io/').length, 1);
  assert.equal(allHrefs.filter((href) => href === 'https://github.com/craigCODA').length, 2);
  assert.equal(allHrefs.filter((href) => href === 'mailto:mistercraigr@gmail.com').length, 1);
  assert.equal(allHrefs.filter((href) => href === 'https://www.linkedin.com/in/Craig-Ramos').length, 1);
  assert.equal(allHrefs.filter((href) => href === 'https://github.com/craigCODA/craigcoda.github.io').length, 1);
  assertLink(nav, 'GitHub', 'https://github.com/craigCODA', { safeExternal: true });
  assertLink(footer, 'GitHub', 'https://github.com/craigCODA', { safeExternal: true });
  assertLink(footer, 'Email', 'mailto:mistercraigr@gmail.com');
  assertLink(footer, 'LinkedIn', 'https://www.linkedin.com/in/Craig-Ramos', { safeExternal: true });
  assertLink(footer, 'Portfolio source', 'https://github.com/craigCODA/craigcoda.github.io', { safeExternal: true });
});

test('every current text-link document loads its shared styles and marks its return control', async () => {
  await Promise.all(textLinkDocuments.map(async (relativePath) => {
    const html = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    const stylesheetLinks = openingTags(html, 'link')
      .filter(({ attributes }) => attributeTokens(attributes, 'rel').has('stylesheet'));
    const returnControls = openingTags(html, 'a')
      .filter(({ attributes }) => attributes.get('href') === '/');

    assert.equal(stylesheetLinks.some(({ attributes }) => attributes.get('href') === '/assets/css/base.css'), true);
    assert.equal(returnControls.length, 1);
    assert.equal(attributeTokens(returnControls[0].attributes, 'class').has('text-link'), true);
  }));
});

test('narrow-screen styles give every current link control a 44-pixel touch target', async () => {
  const css = await readFile(baseCssUrl, 'utf8');
  const textLink = effectiveDeclarations(css, '.text-link');
  const skipLink = effectiveDeclarations(css, '.skip-link');
  const focusedSkipLink = effectiveDeclarations(css, '.skip-link:focus');
  const navLink = effectiveDeclarations(css, '.site-nav a');
  const footerLink = effectiveDeclarations(css, '.site-footer a');

  assert.equal(textLink.get('display'), 'inline-flex');
  assert.equal(textLink.get('align-items'), 'center');
  assert.equal(textLink.get('min-height'), '2.75rem');
  assert.equal(skipLink.get('display'), 'inline-flex');
  assert.equal(skipLink.get('align-items'), 'center');
  assert.equal(skipLink.get('min-height'), '2.75rem');
  assert.equal(skipLink.get('transform'), 'translateY(-200%)');
  assert.equal(focusedSkipLink.get('transform'), 'translateY(0)');
  assert.equal(navLink.get('min-height'), '2.75rem');
  assert.equal(footerLink.get('min-height'), '2.75rem');
});
