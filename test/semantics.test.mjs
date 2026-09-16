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
  const declarations = [];

  for (const source of block.split(';')) {
    const separator = source.indexOf(':');
    if (separator === -1) continue;

    const property = source.slice(0, separator).trim().toLowerCase();
    const rawValue = source.slice(separator + 1).trim();
    const important = /\s*!important\s*$/i.test(rawValue);
    const value = rawValue.replace(/\s*!important\s*$/i, '').trim();
    declarations.push({ property, value, important });
  }

  return declarations;
}

function matchingBrace(source, openingBrace) {
  let depth = 1;

  for (let index = openingBrace + 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return index;
  }

  throw new Error('Unclosed CSS block in test fixture');
}

function parseCssRules(css) {
  const rules = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  function visit(source, atRules = []) {
    let cursor = 0;

    while (cursor < source.length) {
      const openingBrace = source.indexOf('{', cursor);
      if (openingBrace === -1) break;

      const prelude = source.slice(cursor, openingBrace).trim();
      const closingBrace = matchingBrace(source, openingBrace);
      const block = source.slice(openingBrace + 1, closingBrace);

      if (prelude.startsWith('@')) {
        visit(block, [...atRules, prelude]);
      } else if (prelude) {
        rules.push({
          selectors: prelude.split(',').map((selector) => selector.trim()),
          declarations: parseDeclarations(block),
          atRules
        });
      }

      cursor = closingBrace + 1;
    }
  }

  visit(withoutComments);
  return rules;
}

// This is intentionally not a general CSS cascade implementation. The site contract
// permits transforms only on these exact skip-link selectors; the companion guard
// below rejects alternate selectors that could otherwise win through specificity.
function effectiveExactDeclarations(rules, targetSelector) {
  const effective = new Map();

  for (const rule of rules) {
    if (!rule.selectors.includes(targetSelector)) continue;

    for (const declaration of rule.declarations) {
      const current = effective.get(declaration.property);
      if (!current?.important || declaration.important) {
        effective.set(declaration.property, declaration);
      }
    }
  }

  return new Map([...effective].map(([property, declaration]) => [property, declaration.value]));
}

function hasDeclaration(rule, property) {
  return rule.declarations.some((declaration) => declaration.property === property);
}

function isRequiredNarrowMediaRule(rule) {
  return rule.atRules.some((atRule) => /^@media\s*\(\s*max-width\s*:\s*42rem\s*\)$/i.test(atRule));
}

function assertNoAlternateSkipLinkTransforms(rules) {
  const permittedSelectors = new Set(['.skip-link', '.skip-link:focus']);
  const alternateSelectors = rules
    .filter((rule) => hasDeclaration(rule, 'transform'))
    .flatMap((rule) => rule.selectors)
    .filter((selector) => /\.skip-link\b/.test(selector) && !permittedSelectors.has(selector));

  assert.deepEqual(alternateSelectors, [], 'skip-link transforms must use a permitted exact selector');
}

test('homepage exposes one accessible publication shell', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const skipLinks = openingTags(html, 'a')
    .filter(({ attributes }) => attributes.get('href') === '#main-content')
    .filter(({ attributes }) => attributeTokens(attributes, 'class').has('skip-link'));

  assert.equal((html.match(/<main\b/gi) ?? []).length, 1);
  assert.equal(skipLinks.length, 1);
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

test('homepage presents the evidence-led narrative landmarks in editorial order', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const landmarks = [
    /I BUILD SYSTEMS THAT HAVE TO ANSWER TO REALITY\./,
    /<section\b[^>]*id=["']aperture["']/i,
    /I learned physical systems before I learned to abstract them\./,
    /<section\b[^>]*id=["']work["'][^>]*>/i,
    /<section\b[^>]*id=["']verified-work["'][^>]*>/i,
    /Professional engineering/i,
    /<section\b[^>]*id=["']background["'][^>]*>/i,
    /What I am building toward/i,
    /Software \/ AI \/ Systems Engineering/
  ];
  let previousOffset = -1;

  for (const landmark of landmarks) {
    const match = landmark.exec(html);
    assert.ok(match, `homepage must include ${landmark}`);
    assert.ok(match.index > previousOffset, `homepage landmark ${landmark} must follow the prior landmark`);
    previousOffset = match.index;
  }
});

test('homepage work section links to all five case-study routes', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const work = html.match(/<section\b[^>]*id=["']work["'][^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? '';

  for (const href of [
    '/projects/ppk076/',
    '/projects/warehouse-optimization/',
    '/projects/skill-evaluation-lab/',
    '/projects/workspace-environment-vnext/',
    '/projects/pythos/'
  ]) {
    assert.match(work, new RegExp(`<a\\b[^>]*href=["']${href}["']`, 'i'));
  }
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
  const rules = parseCssRules(css);
  const narrowRules = rules.filter(isRequiredNarrowMediaRule);
  const textLink = effectiveExactDeclarations(narrowRules, '.text-link');
  const skipLink = effectiveExactDeclarations(rules, '.skip-link');
  const focusedSkipLink = effectiveExactDeclarations(rules, '.skip-link:focus');
  const navLink = effectiveExactDeclarations(rules, '.site-nav a');
  const footerLink = effectiveExactDeclarations(rules, '.site-footer a');

  assertNoAlternateSkipLinkTransforms(rules);

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
