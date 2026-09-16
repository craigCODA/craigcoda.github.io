import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const baseCssUrl = new URL('../assets/css/base.css', import.meta.url);
const tokensCssUrl = new URL('../assets/css/tokens.css', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
const provenanceUrl = new URL('../assets/evidence/provenance.json', import.meta.url);
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

function sectionBody(markup, id) {
  const opening = new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i').exec(markup);

  assert.ok(opening, `homepage must include #${id}`);
  const tags = new RegExp('</?section\\b[^>]*>', 'gi');
  tags.lastIndex = opening.index;
  let depth = 0;
  let tag;

  while ((tag = tags.exec(markup))) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return markup.slice(opening.index + opening[0].length, tag.index);
  }

  throw new Error(`#${id} must have a closing section tag`);
}

function articles(markup) {
  return [...markup.matchAll(/(<article\b[^>]*>)([\s\S]*?)<\/article>/gi)]
    .map((match) => ({ attributes: parseAttributes(match[1]), body: match[2] }));
}

function responsiveFallback(attrs) {
  const src = attrs.get('src') ?? '';
  const match = src.match(/^\/(assets\/evidence\/optimized\/.+)-(\d+)w\.webp$/);

  assert.ok(match, `${src || '<missing src>'} must be a registered responsive WebP fallback`);
  return { src, stem: match[1], width: Number(match[2]) };
}

function assertEvidenceImage(attrs, provenance) {
  const fallback = responsiveFallback(attrs);
  const evidence = provenance.get(fallback.stem);

  assert.ok(evidence, `${fallback.stem} must be registered evidence`);
  assert.equal(attrs.get('alt'), evidence.alt, `${fallback.src} must use the registered alt text`);
  assert.equal(attrs.get('width'), String(evidence.sourceWidth), `${fallback.src} must declare its source width`);
  assert.equal(attrs.get('height'), String(evidence.sourceHeight), `${fallback.src} must declare its source height`);
  assert.equal(evidence.widths.includes(fallback.width), true, `${fallback.src} must use a declared responsive width`);
  assert.equal(attrs.get('decoding'), 'async', `${fallback.src} must decode asynchronously`);
  assert.equal(attrs.get('loading'), 'lazy', `${fallback.src} is below the opening and aperture, so it must lazy-load`);

  return fallback.stem;
}

function hasSelector(rule, selector) {
  return rule.selectors.includes(selector);
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

test('homepage preserves the complete post-aperture physical-systems progression', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const thesis = html.match(/<section\b[^>]*class=["'][^"']*\bsystems-thesis\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? '';
  const renderedThesis = thesis.replaceAll('&gt;', '>').replace(/\s+/g, ' ').trim();

  assert.ok(renderedThesis.includes(
    'Mechanical work > structural work > electronics > warehouse operations > operational software > AI systems > spatial computing > operating systems'
  ));
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

test('homepage major sections resolve to 160–240 pixel fluid editorial gaps', async () => {
  const [tokensCss, homeCss] = await Promise.all([
    readFile(tokensCssUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8')
  ]);
  const sectionSpace = effectiveExactDeclarations(parseCssRules(tokensCss), ':root').get('--section-space');
  const resolvedRange = sectionSpace?.match(/^clamp\(\s*([\d.]+)rem\s*,\s*[\d.]+vw\s*,\s*([\d.]+)rem\s*\)$/);

  assert.ok(resolvedRange, '--section-space must be a fluid rem-based clamp');
  assert.equal(Number(resolvedRange[1]) * 16, 160);
  assert.equal(Number(resolvedRange[2]) * 16, 240);

  const homeRules = parseCssRules(homeCss);
  for (const selector of ['.aperture-shell', '.systems-thesis', '#work', '#verified-work', '.professional-engineering', '#background', '.direction', '.closing']) {
    assert.equal(
      effectiveExactDeclarations(homeRules, selector).get('margin-block'),
      'var(--section-space)',
      `${selector} must consume the fluid major-section gap`
    );
  }
});

test('work is exactly five semantic evidence articles bound to their routes and registered output stems', async () => {
  const [html, provenance] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const expectedProjects = [
    {
      route: '/projects/ppk076/',
      modifier: 'work-piece--ppk',
      stems: [
        'assets/evidence/optimized/ppk076/ppk076_first_person_forklift',
        'assets/evidence/optimized/ppk076/ppk076_inventory_baseline_before_import',
        'assets/evidence/optimized/ppk076/ppk076_inventory_populated_after_import'
      ]
    },
    {
      route: '/projects/warehouse-optimization/',
      modifier: 'work-piece--warehouse',
      stems: ['assets/evidence/optimized/warehouse/warehouse-optimization-verified-result']
    },
    {
      route: '/projects/skill-evaluation-lab/',
      modifier: 'work-piece--skill',
      stems: ['assets/evidence/optimized/skill-evaluation/skill-evaluation-lab-evidence-map']
    },
    {
      route: '/projects/workspace-environment-vnext/',
      modifier: 'work-piece--workspace',
      stems: ['assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint']
    },
    {
      route: '/projects/pythos/',
      modifier: 'work-piece--pythos',
      stems: ['assets/evidence/optimized/pythos/pythos_physical_evidence_terminal']
    }
  ];
  const workArticles = articles(sectionBody(html, 'work'));

  assert.equal(workArticles.length, 5, '#work must contain exactly five semantic project articles');
  assert.equal(new Set(expectedProjects.map(({ modifier }) => modifier)).size, expectedProjects.length);

  for (const expected of expectedProjects) {
    const article = workArticles.find(({ attributes }) => attributeTokens(attributes, 'class').has(expected.modifier));

    assert.ok(article, `#work must include the ${expected.modifier} composition`);
    assert.match(article.body, new RegExp(`<a\\b[^>]*\\bhref=["']${expected.route}["']`, 'i'));
    assert.deepEqual(
      openingTags(article.body, 'img').map(({ attributes }) => assertEvidenceImage(attributes, registeredEvidence)).sort(),
      expected.stems.slice().sort(),
      `${expected.modifier} must use its expected registered evidence output stem(s)`
    );
  }
});

test('every homepage evidence image resolves to provenance with its registered intrinsic contract', async () => {
  const [html, provenance] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const images = openingTags(html, 'img');

  assert.equal(images.length, 7, 'homepage evidence should remain the selected seven-image set');
  for (const { attributes } of images) assertEvidenceImage(attributes, registeredEvidence);
});

test('VERIFIED WORK contains its exact editorial heading and operational authority evidence', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const verifiedWork = sectionBody(html, 'verified-work');
  const rows = [...verifiedWork.matchAll(/<div\b[^>]*\bclass=["'][^"']*\bverification-row\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map((match) => match[1].replace(/\s+/g, ' ').trim());

  assert.match(verifiedWork, /<h2\b[^>]*\bid=["']verified-work-title["'][^>]*>\s*VERIFIED WORK\s*<\/h2>/i);
  assert.equal(rows.length, 2, 'VERIFIED WORK must use two editorial evidence rows');
  assert.match(rows[0], /PPK076 \+ warehouse decision support/i);
  assert.match(rows[0], /176 pallet positions recovered/i);
  assert.match(rows[0], /22 storage bins freed/i);
  assert.match(rows[0], /deterministic rule boundary/i);
  assert.match(rows[0], /human verification authority/i);
  assert.match(rows[1], /Systems \/ PythOS/i);
});

test('homepage styles preserve asymmetric editorial compositions without generic card treatment', async () => {
  const [html, homeCss] = await Promise.all([readFile(indexUrl, 'utf8'), readFile(homeCssUrl, 'utf8')]);
  const rules = parseCssRules(homeCss);
  const desktopRules = rules.filter((rule) => rule.atRules.length === 0);
  const narrowRules = rules.filter(isRequiredNarrowMediaRule);
  const compositionSelectors = [
    '.work-piece--ppk',
    '.work-piece--warehouse',
    '.work-piece--skill',
    '.work-piece--workspace',
    '.work-piece--pythos'
  ];

  for (const selector of compositionSelectors) {
    assert.match(effectiveExactDeclarations(desktopRules, selector).get('grid-template-columns') ?? '', /minmax\(/, `${selector} must keep its desktop split composition`);
    assert.equal(effectiveExactDeclarations(narrowRules, selector).get('grid-template-columns'), '1fr', `${selector} must stack as one column on narrow screens`);
  }

  assert.match(effectiveExactDeclarations(desktopRules, '.work-piece--ppk .work-piece__copy').get('padding-top') ?? '', /clamp\(/);
  assert.match(effectiveExactDeclarations(desktopRules, '.work-piece--skill .work-piece__copy').get('padding-top') ?? '', /clamp\(/);
  assert.equal(effectiveExactDeclarations(desktopRules, '.work-piece--pythos').get('margin-inline'), 'calc(var(--gutter) * -1)');
  assert.equal(effectiveExactDeclarations(desktopRules, '.work-piece--pythos').get('background'), 'var(--charcoal)');

  const workPieceBackgrounds = rules
    .filter((rule) => rule.selectors.some((selector) => /^\.work-piece--/.test(selector)))
    .filter((rule) => hasDeclaration(rule, 'background'));
  assert.deepEqual(workPieceBackgrounds.flatMap((rule) => rule.selectors).filter((selector) => /^\.work-piece--/.test(selector)), ['.work-piece--pythos']);
  assert.equal(/\bcard\b/i.test(html), false, 'homepage markup must not introduce generic card classes');
  assert.equal(/box-shadow\s*:/i.test(homeCss), false, 'homepage must not use card shadows');
  assert.equal(/(?:linear|radial|conic)-gradient\s*\(/i.test(homeCss), false, 'homepage must not use gradients');
  assert.equal(/border-radius\s*:/i.test(homeCss), false, 'homepage must not use rounded-card treatment');
});

test('homepage evidence contracts reject targeted fixture mutations', async () => {
  const [html, homeCss, provenance] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const missingPythosModifier = html.replace('work-piece--pythos', 'work-piece--removed');
  const eagerBelowFoldImage = html.replace('loading="lazy"', 'loading="eager"');
  const renamedVerificationHeading = html.replace('VERIFIED WORK', 'VERIFIED SUMMARY');
  const lightPythosBand = homeCss.replace('background: var(--charcoal)', 'background: var(--paper)');
  const gradientHomepage = `${homeCss}\n.opening { background: linear-gradient(red, blue); }`;

  assert.throws(
    () => assert.ok(articles(sectionBody(missingPythosModifier, 'work')).some(({ attributes }) => attributeTokens(attributes, 'class').has('work-piece--pythos'))),
    /work-piece--pythos/
  );
  assert.throws(
    () => assertEvidenceImage(openingTags(eagerBelowFoldImage, 'img')[0].attributes, registeredEvidence),
    /must lazy-load/
  );
  assert.throws(
    () => assert.match(sectionBody(renamedVerificationHeading, 'verified-work'), /<h2\b[^>]*>\s*VERIFIED WORK\s*<\/h2>/i),
    /VERIFIED WORK/
  );
  assert.throws(
    () => assert.equal(effectiveExactDeclarations(parseCssRules(lightPythosBand), '.work-piece--pythos').get('background'), 'var(--charcoal)'),
    /Expected values to be strictly equal/
  );
  assert.throws(
    () => assert.equal(/(?:linear|radial|conic)-gradient\s*\(/i.test(gradientHomepage), false),
    /Expected values to be strictly equal/
  );
});
