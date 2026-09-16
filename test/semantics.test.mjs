import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const baseCssUrl = new URL('../assets/css/base.css', import.meta.url);
const tokensCssUrl = new URL('../assets/css/tokens.css', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
const provenanceUrl = new URL('../assets/evidence/provenance.json', import.meta.url);
const ppkUrl = new URL('../projects/ppk076/index.html', import.meta.url);
const ppkCssUrl = new URL('../assets/css/projects/ppk076.css', import.meta.url);
const warehouseCssUrl = new URL('../assets/css/projects/warehouse.css', import.meta.url);
const expectedWorkModifiers = [
  'work-piece--ppk',
  'work-piece--warehouse',
  'work-piece--skill',
  'work-piece--workspace',
  'work-piece--pythos'
];
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

function pictures(markup) {
  return [...markup.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)].map((match) => match[1]);
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

function assertResponsiveEvidenceImage(attrs, provenance, { opening = false } = {}) {
  const fallback = responsiveFallback(attrs);
  const evidence = provenance.get(fallback.stem);

  assert.ok(evidence, `${fallback.stem} must be registered responsive evidence`);
  assert.equal(attrs.get('alt'), evidence.alt, `${fallback.src} must use the registered alt text`);
  assert.equal(attrs.get('width'), String(evidence.sourceWidth), `${fallback.src} must declare its source width`);
  assert.equal(attrs.get('height'), String(evidence.sourceHeight), `${fallback.src} must declare its source height`);
  assert.equal(evidence.widths.includes(fallback.width), true, `${fallback.src} must use a declared responsive width`);
  assert.equal(attrs.get('decoding'), 'async', `${fallback.src} must decode asynchronously`);
  assert.equal(attrs.get('loading'), opening ? 'eager' : 'lazy', `${fallback.src} must use the correct evidence loading priority`);

  return fallback.stem;
}

function assertResponsiveSourceSet(attrs, provenance, expectedStem) {
  const extension = attrs.get('type')?.match(/^image\/(avif|webp)$/i)?.[1]?.toLowerCase();
  const srcset = attrs.get('srcset') ?? '';
  const sizes = attrs.get('sizes') ?? '';
  const evidence = provenance.get(expectedStem);

  assert.ok(extension, 'preferred source must declare an AVIF or WebP type');
  assert.ok(srcset, 'preferred source must declare a srcset');
  assert.ok(sizes, 'preferred source must declare sizes');
  assert.ok(evidence, `${expectedStem} must be registered responsive evidence`);

  const candidates = [];

  for (const candidate of srcset.split(',')) {
    const match = candidate.trim().match(/^\/(assets\/evidence\/optimized\/.+)-(\d+)w\.(avif|webp)\s+(\d+)w$/i);

    assert.ok(match, `${candidate.trim() || '<empty candidate>'} must be a responsive evidence candidate`);
    const [, stem, fileWidth, fileExtension, descriptorWidth] = match;

    assert.equal(fileExtension.toLowerCase(), extension, `${candidate.trim()} must match its declared image type`);
    assert.equal(Number(fileWidth), Number(descriptorWidth), `${candidate.trim()} must use a matching width descriptor`);
    assert.equal(stem, expectedStem, `${candidate.trim()} must use the same evidence stem as its fallback image`);
    assert.equal(
      candidate.trim(),
      `/${expectedStem}-${fileWidth}w.${extension} ${descriptorWidth}w`,
      `${candidate.trim()} must use the exact registered responsive path`
    );
    candidates.push({ path: `/${expectedStem}-${fileWidth}w.${extension}`, width: Number(fileWidth) });
  }

  assert.deepEqual(
    candidates.map(({ width }) => width).sort((left, right) => left - right),
    evidence.widths.slice().sort((left, right) => left - right),
    `${expectedStem} ${extension} candidates must match every registered responsive width`
  );

  return candidates;
}

function assertResponsivePictureEvidence(picture, provenance, { opening = false } = {}) {
  const images = openingTags(picture, 'img');
  const sources = openingTags(picture, 'source');

  assert.equal(images.length, 1, 'each responsive picture must include one fallback image');
  assert.equal(sources.length, 2, 'each responsive picture must include AVIF and WebP preferred sources');
  const stem = assertResponsiveEvidenceImage(images[0].attributes, provenance, { opening });
  const fallback = responsiveFallback(images[0].attributes);
  const evidence = provenance.get(stem);
  assert.deepEqual(sources.map(({ attributes }) => attributes.get('type')).sort(), ['image/avif', 'image/webp']);
  assert.equal(fallback.width, Math.max(...evidence.widths), `${fallback.src} must use the largest registered fallback`);
  const candidates = sources.flatMap(({ attributes }) => assertResponsiveSourceSet(attributes, provenance, stem));

  return { stem, candidates };
}

async function assertResponsiveCandidateFiles(candidates) {
  await Promise.all(candidates.map(({ path }) => access(new URL(`..${path}`, import.meta.url))));
}

function assertPpkPublicLinks(markup) {
  assertLink(markup, 'Source repository', 'https://github.com/craigCODA/ppk076', { safeExternal: true });
  assertLink(markup, 'Live demo', 'https://craigcoda.github.io/ppk076/', { safeExternal: true });
}

function projectModifierTokens(attributes) {
  return [...attributeTokens(attributes, 'class')].filter((token) => token.startsWith('work-piece--'));
}

function assertWorkArticleCount(workArticles, expectedModifiers) {
  assert.equal(workArticles.length, expectedModifiers.length, '#work must contain exactly five semantic project articles');
}

function assertEveryExpectedModifierOccursOnce(workArticles, expectedModifiers) {
  for (const modifier of expectedModifiers) {
    assert.equal(
      workArticles.filter(({ attributes }) => projectModifierTokens(attributes).includes(modifier)).length,
      1,
      `#work must contain exactly one ${modifier} article`
    );
  }
}

function assertEachArticleHasOneExpectedModifier(workArticles, expectedModifiers) {
  for (const article of workArticles) {
    const modifiers = projectModifierTokens(article.attributes);

    assert.equal(modifiers.length, 1, 'each work article must have exactly one project modifier');
    assert.equal(expectedModifiers.includes(modifiers[0]), true, `article modifier ${modifiers[0]} must be expected`);
  }
}

function assertNoUnknownProjectModifiers(workArticles, expectedModifiers) {
  for (const article of workArticles) {
    for (const modifier of projectModifierTokens(article.attributes)) {
      assert.equal(expectedModifiers.includes(modifier), true, `unexpected work modifier ${modifier}`);
    }
  }
}

function assertWorkArticleModifiers(workArticles, expectedModifiers) {
  assertWorkArticleCount(workArticles, expectedModifiers);
  assertEveryExpectedModifierOccursOnce(workArticles, expectedModifiers);
  assertEachArticleHasOneExpectedModifier(workArticles, expectedModifiers);
  assertNoUnknownProjectModifiers(workArticles, expectedModifiers);
}

function isDarkBackground(declaration) {
  return ['background', 'background-color'].includes(declaration.property)
    && /var\(--(?:charcoal|ink)\)|#(?:111213|1b1d1f)\b/i.test(declaration.value);
}

function affectsWorkComposition(selector) {
  return /(?:^|[\s>+~])(?:body|main)\b|\.(?:page-shell|page-main|work-index|work-piece)\b|#(?:main-content|work)\b/.test(selector);
}

// This deliberately models only source order and !important for identical selector/context
// background declarations. It is a homepage source contract, not a general CSS cascade engine.
function effectiveBackgroundDeclarations(rules) {
  const effective = new Map();

  for (const rule of rules) {
    for (const selector of rule.selectors) {
      for (const declaration of rule.declarations) {
        if (!['background', 'background-color'].includes(declaration.property)) continue;

        const key = `${rule.atRules.join('\u0000')}\u0000${selector}`;
        const current = effective.get(key);
        if (!current || !current.declaration.important || declaration.important) {
          effective.set(key, { selector, atRules: rule.atRules, declaration });
        }
      }
    }
  }

  return [...effective.values()];
}

function assertOnlyPythosHasDarkWorkBackground(rules) {
  const darkWorkBackgrounds = effectiveBackgroundDeclarations(rules)
    .filter(({ selector, declaration }) => affectsWorkComposition(selector) && isDarkBackground(declaration));

  assert.ok(darkWorkBackgrounds.some(({ selector }) => selector === '.work-piece--pythos'), 'PythOS must retain its dark evidence band');
  for (const { selector } of darkWorkBackgrounds) {
    assert.equal(selector, '.work-piece--pythos', `${selector} must not darken non-PythOS work`);
  }
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

test('aperture publishes the six authored evidence states without carousel controls or motion code', async () => {
  const [html, provenance, homeCss] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse),
    readFile(homeCssUrl, 'utf8')
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const aperture = sectionBody(html, 'aperture');
  const figures = [...aperture.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi)];
  const expectedFrames = [
    ['4000', 'I MODEL PHYSICAL SYSTEMS.', 'Physical operations, modeled in software.'],
    ['3500', 'I TURN OPERATIONS INTO DECISION SYSTEMS.', '176 pallet positions recovered. 22 bins freed.'],
    ['4000', 'I TEST WHAT AGENTS ACTUALLY DO.', 'Agents tested against preserved evidence.'],
    ['4000', 'I RETHINK HOW THE COMPUTER CAN FEEL.', 'Spatial computing, persistent by design.'],
    ['4500', 'I BUILD BELOW THE APPLICATION LAYER.', 'A from-scratch, verification-driven operating system.'],
    ['3000', 'PHYSICAL SYSTEMS. SOFTWARE SYSTEMS. AI SYSTEMS. COMPUTER SYSTEMS.', 'I BUILD WHERE THOSE LAYERS MEET.']
  ];

  assert.equal(figures.length, 1, '#aperture must contain one aperture figure');
  assert.equal(parseAttributes(`<figure${figures[0][1]}>`).has('data-aperture'), true);

  const frames = articles(figures[0][2]);
  assert.equal(frames.length, expectedFrames.length, 'aperture must retain all six authored states');
  for (const [index, [duration, statement, supportingCopy]] of expectedFrames.entries()) {
    const frame = frames[index];
    assert.equal(frame.attributes.has('data-aperture-frame'), true, `frame ${index + 1} must be an aperture state`);
    assert.equal(frame.attributes.get('data-duration'), duration, `frame ${index + 1} must preserve its authored duration`);
    assert.match(frame.body, new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(frame.body, new RegExp(supportingCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const frameImages = frames.map(({ body }) => openingTags(body, 'img').map(({ attributes }) => attributes));
  assert.equal(frameImages[0].length, 3, 'physical-systems state must retain forklift plus matched-camera transition evidence');
  assert.equal(frameImages[5].length, 0, 'the synthesis state must remain text-only');

  const expectedStems = [
    [
      'assets/evidence/optimized/ppk076/ppk076_first_person_forklift',
      'assets/evidence/optimized/ppk076/ppk076_inventory_baseline_before_import',
      'assets/evidence/optimized/ppk076/ppk076_inventory_populated_after_import'
    ],
    ['assets/evidence/optimized/warehouse/warehouse-optimization-verified-result'],
    ['assets/evidence/optimized/skill-evaluation/skill-evaluation-lab-evidence-map'],
    ['assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint'],
    [
      'assets/evidence/optimized/pythos/pythos_physical_evidence_terminal',
      'assets/evidence/optimized/pythos/pythos-architecture-evidence-boundary'
    ],
    []
  ];
  for (const [index, images] of frameImages.entries()) {
    const stems = images.map((attributes) => {
      const src = attributes.get('src') ?? attributes.get('data-src') ?? '';
      const match = src.match(/^\/(assets\/evidence\/optimized\/.+)-(\d+)w\.webp$/);
      assert.ok(match, `frame ${index + 1} must use an optimized WebP evidence candidate`);
      const evidence = registeredEvidence.get(match[1]);
      assert.ok(evidence, `frame ${index + 1} evidence must be provenance-traced`);
      assert.equal(attributes.get('alt'), evidence.alt, `frame ${index + 1} must retain its registered alt text`);
      assert.equal(attributes.get('width'), String(evidence.sourceWidth));
      assert.equal(attributes.get('height'), String(evidence.sourceHeight));
      return match[1];
    });
    assert.deepEqual(stems.sort(), expectedStems[index].slice().sort(), `frame ${index + 1} must use its approved evidence`);
  }

  assert.equal(frameImages[0].every((attributes) => attributes.has('src') && attributes.has('srcset')), true, 'the initial physical-systems state must have live responsive sources');
  assert.equal(frameImages.slice(1, 5).flat().every((attributes) => !attributes.has('src') && attributes.has('data-src') && attributes.has('data-srcset')), true, 'later visual states must retain deferred responsive candidates');
  assert.match(aperture, /<ol\b[^>]*\bclass=["'][^"']*\baperture-transcript\b[^"']*["'][^>]*>/i, 'aperture must include its complete visually hidden transcript');
  assert.equal(/\baria-live\s*=/i.test(aperture), false, 'aperture must not repeatedly announce state changes');
  assert.equal(/\b(?:carousel|previous|next|arrow|dot|loop)\b/i.test(aperture), false, 'aperture is authored evidence, not a user-controlled carousel');
  assert.equal(/<script\b/i.test(aperture), false, 'static aperture content must not embed behavior code');

  const apertureDeclarations = parseCssRules(homeCss)
    .filter((rule) => rule.selectors.some((selector) => selector.startsWith('.aperture')))
    .flatMap((rule) => rule.declarations.map((declaration) => declaration.property));
  for (const property of ['animation', 'transition', 'transform', 'opacity']) {
    assert.equal(apertureDeclarations.includes(property), false, `static aperture styles must not depend on ${property}`);
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

test('PPK076 renders its ten registered PPK evidence records with traced preferred sources and safe public links', async () => {
  const [ppk, provenance] = await Promise.all([
    readFile(ppkUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredPpkEvidence = new Map(provenance
    .filter((entry) => entry.project === 'ppk076')
    .map((entry) => [entry.outputStem, entry]));
  const ppkPictures = pictures(ppk);

  assert.equal(ppkPictures.length, 10);
  const pictureEvidence = ppkPictures.map((picture, index) => assertResponsivePictureEvidence(picture, registeredPpkEvidence, { opening: index === 0 }));

  assert.deepEqual(
    pictureEvidence.map(({ stem }) => stem).sort(),
    [...registeredPpkEvidence.keys()].sort()
  );
  assert.equal(
    pictureEvidence[0].stem,
    'assets/evidence/optimized/ppk076/ppk076_full_facility_oblique'
  );
  await assertResponsiveCandidateFiles(pictureEvidence.flatMap(({ candidates }) => candidates));
  assertPpkPublicLinks(ppk);

  const unregisteredSource = ppk.replace(
    'ppk076_full_facility_oblique-640w.avif',
    'unregistered-640w.avif'
  );
  const unsafeSourceLink = ppk.replace('rel="noopener noreferrer"', 'rel="noopener"');
  const missingSizes = ppk.replace('sizes="100vw"', '');
  const missingAvifCandidate = ppk.replace('/assets/evidence/optimized/ppk076/ppk076_full_facility_oblique-1080w.avif 1080w, ', '');
  const missingWebpCandidate = ppk.replace('/assets/evidence/optimized/ppk076/ppk076_full_facility_oblique-1080w.webp 1080w, ', '');
  const smallerOpeningFallback = ppk.replace(
    'ppk076_full_facility_oblique-1759w.webp" alt=',
    'ppk076_full_facility_oblique-640w.webp" alt='
  );

  assert.throws(
    () => assertResponsivePictureEvidence(pictures(unregisteredSource)[0], registeredPpkEvidence, { opening: true }),
    /must use the same evidence stem as its fallback image/
  );
  assert.throws(
    () => assertPpkPublicLinks(unsafeSourceLink),
    /Expected values to be strictly equal/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(missingSizes)[0], registeredPpkEvidence, { opening: true }),
    /must declare sizes/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(smallerOpeningFallback)[0], registeredPpkEvidence, { opening: true }),
    /must use the largest registered fallback/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(missingAvifCandidate)[0], registeredPpkEvidence, { opening: true }),
    /candidates must match every registered responsive width/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(missingWebpCandidate)[0], registeredPpkEvidence, { opening: true }),
    /candidates must match every registered responsive width/
  );
  await assert.rejects(
    assertResponsiveCandidateFiles([{ path: '/assets/evidence/optimized/ppk076/missing-640w.avif' }]),
    /ENOENT/
  );
});

test('PPK076 opening evidence preserves its native ratio without a crop cap', async () => {
  const rules = parseCssRules(await readFile(ppkCssUrl, 'utf8'));
  const openingImage = effectiveExactDeclarations(rules, '.ppk-opening-evidence img');

  assert.equal(openingImage.get('height'), 'auto');
  assert.equal(openingImage.has('max-height'), false);
  assert.equal(openingImage.has('min-height'), false);
  assert.equal(openingImage.has('object-fit'), false);
});

test('PPK076 matched comparison frames share one aspect and presentation contract', async () => {
  const rules = parseCssRules(await readFile(ppkCssUrl, 'utf8'));
  const frameRules = rules.filter((rule) => rule.selectors.includes('.ppk-matched-pair .evidence-figure'));
  const imageRules = rules.filter((rule) => rule.selectors.includes('.ppk-matched-pair img'));
  const frame = effectiveExactDeclarations(rules, '.ppk-matched-pair .evidence-figure');
  const image = effectiveExactDeclarations(rules, '.ppk-matched-pair img');

  assert.equal(frameRules.length, 1, 'comparison frames must use one shared rule');
  assert.equal(imageRules.length, 1, 'comparison images must use one shared rule');
  assert.equal(frame.get('aspect-ratio'), '16 / 9');
  assert.equal(image.get('width'), '100%');
  assert.equal(image.get('height'), '100%');
  assert.equal(image.get('object-fit'), 'cover');
  assert.equal(image.get('object-position'), '50% 50%');
});

test('warehouse styles reflow the title and decision-flow labels at a true 320-pixel breakpoint', async () => {
  const rules = parseCssRules(await readFile(warehouseCssUrl, 'utf8'));
  const narrowestRules = rules.filter((rule) => rule.atRules.some((atRule) => /^@media\s*\(\s*max-width\s*:\s*22rem\s*\)$/i.test(atRule)));
  const title = effectiveExactDeclarations(narrowestRules, '.warehouse-page .project-header .display');
  const flowRow = effectiveExactDeclarations(narrowestRules, '.warehouse-flow li');

  assert.match(title.get('font-size') ?? '', /^clamp\(/, 'warehouse title needs a narrow reflow scale');
  assert.equal(title.get('max-width'), '100%');
  assert.equal(title.get('overflow-wrap'), 'anywhere');
  assert.equal(flowRow.get('grid-template-columns'), '1fr');
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

  assertWorkArticleModifiers(workArticles, expectedWorkModifiers);

  for (const expected of expectedProjects) {
    const [article] = workArticles.filter(({ attributes }) => projectModifierTokens(attributes).includes(expected.modifier));

    assert.match(article.body, new RegExp(`<a\\b[^>]*\\bhref=["']${expected.route}["']`, 'i'));
    assert.deepEqual(
      openingTags(article.body, 'img').map(({ attributes }) => assertEvidenceImage(attributes, registeredEvidence)).sort(),
      expected.stems.slice().sort(),
      `${expected.modifier} must use its expected registered evidence output stem(s)`
    );
  }
});

test('warehouse route provides the shared case-study sections and its public-safe evidence figure', async () => {
  const [warehouse, provenance] = await Promise.all([
    readFile(new URL('../projects/warehouse-optimization/index.html', import.meta.url), 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const expectedHeadings = [
    'Problem',
    'What I built',
    'Architecture / decisions',
    'Evidence',
    'Result',
    'Technologies',
    'Current boundary / unfinished work',
    'Source / demo / verification'
  ];

  assert.match(warehouse, /<link rel=["']stylesheet["'] href=["']\/assets\/css\/projects\/warehouse\.css["']>/i);
  for (const heading of expectedHeadings) {
    assert.match(warehouse, new RegExp(`<h2\\b[^>]*>\\s*${heading}\\s*<\\/h2>`, 'i'));
  }

  const images = openingTags(warehouse, 'img');
  assert.equal(images.length, 1, 'warehouse route must use one public-safe result visual');
  assert.equal(
    assertEvidenceImage(images[0].attributes, registeredEvidence),
    'assets/evidence/optimized/warehouse/warehouse-optimization-verified-result'
  );

  const warehousePictures = pictures(warehouse);
  assert.equal(warehousePictures.length, 1, 'warehouse route must use one responsive result picture');
  const pictureEvidence = assertResponsivePictureEvidence(warehousePictures[0], registeredEvidence);
  assert.equal(pictureEvidence.stem, 'assets/evidence/optimized/warehouse/warehouse-optimization-verified-result');
  await assertResponsiveCandidateFiles(pictureEvidence.candidates);

  const unregisteredSource = warehouse.replace(
    'warehouse-optimization-verified-result-720w.avif',
    'warehouse-optimization-unregistered-720w.avif'
  );
  const missingAvifCandidate = warehouse.replace(
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1200w.avif 1200w, ',
    ''
  );
  const missingWebpCandidate = warehouse.replace(
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1200w.webp 1200w, ',
    ''
  );
  const smallerFallback = warehouse.replace(
    'warehouse-optimization-verified-result-1800w.webp" alt=',
    'warehouse-optimization-verified-result-1200w.webp" alt='
  );

  assert.throws(
    () => assertResponsivePictureEvidence(pictures(unregisteredSource)[0], registeredEvidence),
    /must use the same evidence stem as its fallback image/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(missingAvifCandidate)[0], registeredEvidence),
    /candidates must match every registered responsive width/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(missingWebpCandidate)[0], registeredEvidence),
    /candidates must match every registered responsive width/
  );
  assert.throws(
    () => assertResponsivePictureEvidence(pictures(smallerFallback)[0], registeredEvidence),
    /must use the largest registered fallback/
  );
});

test('every selected work evidence image resolves to provenance with its registered intrinsic contract', async () => {
  const [html, provenance] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const images = openingTags(sectionBody(html, 'work'), 'img');

  assert.equal(images.length, 7, 'work evidence should remain the selected seven-image set');
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

  assertOnlyPythosHasDarkWorkBackground(rules);
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
  const fourWorkArticles = articles(sectionBody(html, 'work')).slice(0, 4);
  const missingPythosModifier = html.replace('work-piece--pythos', 'work-piece--removed');
  const duplicatePythosModifier = html.replace(
    'class="work-piece work-piece--skill"',
    'class="work-piece work-piece--skill work-piece--pythos"'
  );
  const twoExpectedModifiers = html.replace(
    'class="work-piece work-piece--workspace"',
    'class="work-piece work-piece--workspace work-piece--skill"'
  );
  const unknownProjectModifier = html.replace(
    'class="work-piece work-piece--ppk"',
    'class="work-piece work-piece--ppk work-piece--experimental"'
  );
  const eagerBelowFoldImage = html.replace('loading="lazy"', 'loading="eager"');
  const renamedVerificationHeading = html.replace('VERIFIED WORK', 'VERIFIED SUMMARY');
  const lightPythosBand = homeCss.replace('background: var(--charcoal)', 'background: var(--paper)');
  const genericDarkWorkBand = `${homeCss}\n.work-piece { background: var(--charcoal); }`;
  const importantDarkWorkBand = `${homeCss}\n.work-piece { background: var(--charcoal) !important; }\n.work-piece { background: var(--paper); }`;
  const laterDarkWorkBand = `${homeCss}\n.work-piece { background: var(--paper); }\n.work-piece { background: var(--charcoal); }`;
  const bodyDarkBand = `${homeCss}\nbody { background: var(--charcoal); }`;
  const workBackgroundColor = `${homeCss}\n#work { background-color: var(--charcoal); }`;
  const compoundAncestorDarkBand = `${homeCss}\n.page-shell .page-main { background: var(--charcoal); }`;
  const overriddenDarkAncestor = `${homeCss}\n.page-main { background: var(--charcoal); }\n.page-main { background: var(--paper); }`;
  const repeatedPythosDarkBand = `${homeCss}\n.work-piece--pythos { background: var(--charcoal); }\n.work-piece--pythos { background: var(--charcoal) !important; }`;
  const unrelatedDarkFooter = `${homeCss}\n.site-footer { background: var(--charcoal); }`;
  const gradientHomepage = `${homeCss}\n.opening { background: linear-gradient(red, blue); }`;

  assert.throws(
    () => assertWorkArticleCount(fourWorkArticles, expectedWorkModifiers),
    /#work must contain exactly five semantic project articles/
  );
  assert.throws(
    () => assertEveryExpectedModifierOccursOnce(articles(sectionBody(missingPythosModifier, 'work')), expectedWorkModifiers),
    /exactly one work-piece--pythos article/
  );
  assert.throws(
    () => assertEveryExpectedModifierOccursOnce(articles(sectionBody(duplicatePythosModifier, 'work')), expectedWorkModifiers),
    /exactly one work-piece--pythos article/
  );
  assert.throws(
    () => assertEachArticleHasOneExpectedModifier(articles(sectionBody(twoExpectedModifiers, 'work')), expectedWorkModifiers),
    /exactly one project modifier/
  );
  assert.throws(
    () => assertNoUnknownProjectModifiers(articles(sectionBody(unknownProjectModifier, 'work')), expectedWorkModifiers),
    /unexpected work modifier work-piece--experimental/
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
    () => assertOnlyPythosHasDarkWorkBackground(parseCssRules(genericDarkWorkBand)),
    /work-piece must not darken non-PythOS work/
  );
  assert.throws(
    () => assertOnlyPythosHasDarkWorkBackground(parseCssRules(importantDarkWorkBand)),
    /work-piece must not darken non-PythOS work/
  );
  assert.throws(
    () => assertOnlyPythosHasDarkWorkBackground(parseCssRules(laterDarkWorkBand)),
    /work-piece must not darken non-PythOS work/
  );
  assert.throws(
    () => assertOnlyPythosHasDarkWorkBackground(parseCssRules(bodyDarkBand)),
    /body must not darken non-PythOS work/
  );
  assert.throws(
    () => assertOnlyPythosHasDarkWorkBackground(parseCssRules(workBackgroundColor)),
    /#work must not darken non-PythOS work/
  );
  assert.throws(
    () => assertOnlyPythosHasDarkWorkBackground(parseCssRules(compoundAncestorDarkBand)),
    /page-shell \.page-main must not darken non-PythOS work/
  );
  assert.doesNotThrow(() => assertOnlyPythosHasDarkWorkBackground(parseCssRules(overriddenDarkAncestor)));
  assert.doesNotThrow(() => assertOnlyPythosHasDarkWorkBackground(parseCssRules(repeatedPythosDarkBand)));
  assert.doesNotThrow(() => assertOnlyPythosHasDarkWorkBackground(parseCssRules(unrelatedDarkFooter)));
  assert.throws(
    () => assert.equal(/(?:linear|radial|conic)-gradient\s*\(/i.test(gradientHomepage), false),
    /Expected values to be strictly equal/
  );
});
