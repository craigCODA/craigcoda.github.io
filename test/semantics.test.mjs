import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const indexUrl = new URL('../index.html', import.meta.url);
const baseCssUrl = new URL('../assets/css/base.css', import.meta.url);
const tokensCssUrl = new URL('../assets/css/tokens.css', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
const apertureCssUrl = new URL('../assets/css/aperture.css', import.meta.url);
const provenanceUrl = new URL('../assets/evidence/provenance.json', import.meta.url);
const ppkUrl = new URL('../projects/ppk076/index.html', import.meta.url);
const ppkCssUrl = new URL('../assets/css/projects/ppk076.css', import.meta.url);
const warehouseCssUrl = new URL('../assets/css/projects/warehouse.css', import.meta.url);
const skillLabCssUrl = new URL('../assets/css/projects/skill-lab.css', import.meta.url);
const skillLabUrl = new URL('../projects/skill-evaluation-lab/index.html', import.meta.url);
const builtSkillLabUrl = new URL('../dist/projects/skill-evaluation-lab/index.html', import.meta.url);
const workspaceCssUrl = new URL('../assets/css/projects/workspace.css', import.meta.url);
const workspaceUrl = new URL('../projects/workspace-environment-vnext/index.html', import.meta.url);
const builtWorkspaceUrl = new URL('../dist/projects/workspace-environment-vnext/index.html', import.meta.url);
const pythosCssUrl = new URL('../assets/css/projects/pythos.css', import.meta.url);
const pythosUrl = new URL('../projects/pythos/index.html', import.meta.url);
const mandatoryWorkspaceBoundary = 'The large application screen is a placeholder in this saved M2A room checkpoint; live generic Windows surface streaming was not complete at this checkpoint.';
const sharedCaseStudyHeadings = [
  'Problem',
  'What I built',
  'Architecture / decisions',
  'Evidence',
  'Result',
  'Technologies',
  'Current boundary / unfinished work',
  'Source / demo / verification'
];
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

function isHomepageNarrowMediaRule(rule) {
  return rule.atRules.some((atRule) => /^@media\s*\(\s*max-width\s*:\s*48rem\s*\)$/i.test(atRule));
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

function originalFallback(attrs, provenance) {
  const live = attrs.get('src');
  const deferred = attrs.get('data-src');

  assert.notEqual(Boolean(live), Boolean(deferred), 'evidence fallback must use exactly one live or deferred original source');
  assert.equal(attrs.has('srcset'), false, 'responsive candidates belong on picture sources, not the original fallback');
  assert.equal(attrs.has('data-srcset'), false, 'deferred responsive candidates belong on picture sources, not the original fallback');
  const src = live ?? deferred ?? '';
  const evidence = [...provenance.values()].find((entry) => `/${entry.original}` === src);

  assert.ok(evidence, `${src || '<missing source>'} must be the exact registered original fallback`);
  return { src, stem: evidence.outputStem, evidence, deferred: Boolean(deferred) };
}

function assertEvidenceImage(attrs, provenance) {
  const fallback = originalFallback(attrs, provenance);
  const { evidence } = fallback;

  assert.equal(attrs.get('alt'), evidence.alt, `${fallback.src} must use the registered alt text`);
  assert.equal(attrs.get('width'), String(evidence.sourceWidth), `${fallback.src} must declare its source width`);
  assert.equal(attrs.get('height'), String(evidence.sourceHeight), `${fallback.src} must declare its source height`);
  assert.equal(attrs.get('decoding'), 'async', `${fallback.src} must decode asynchronously`);
  assert.equal(attrs.get('loading'), 'lazy', `${fallback.src} is below the opening and aperture, so it must lazy-load`);

  return fallback.stem;
}

function assertResponsiveEvidenceImage(attrs, provenance, { opening = false } = {}) {
  const fallback = originalFallback(attrs, provenance);
  const { evidence } = fallback;

  assert.equal(attrs.get('alt'), evidence.alt, `${fallback.src} must use the registered alt text`);
  assert.equal(attrs.get('width'), String(evidence.sourceWidth), `${fallback.src} must declare its source width`);
  assert.equal(attrs.get('height'), String(evidence.sourceHeight), `${fallback.src} must declare its source height`);
  assert.equal(attrs.get('decoding'), 'async', `${fallback.src} must decode asynchronously`);
  assert.equal(attrs.get('loading'), opening ? 'eager' : 'lazy', `${fallback.src} must use the correct evidence loading priority`);

  return fallback.stem;
}

function assertResponsiveSourceSet(attrs, provenance, expectedStem, { deferred = false } = {}) {
  const extension = attrs.get('type')?.match(/^image\/(avif|webp)$/i)?.[1]?.toLowerCase();
  const live = attrs.get('srcset');
  const deferredSourceSet = attrs.get('data-srcset');
  assert.notEqual(Boolean(live), Boolean(deferredSourceSet), 'preferred source must use exactly one live or deferred candidate set');
  assert.equal(Boolean(deferredSourceSet), deferred, `preferred source must be ${deferred ? 'deferred' : 'live'}`);
  const srcset = live ?? deferredSourceSet ?? '';
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
  const deferred = images[0].attributes.has('data-src');
  assert.deepEqual(sources.map(({ attributes }) => attributes.get('type')), ['image/avif', 'image/webp'], 'picture sources must be ordered AVIF then WebP');
  const candidates = sources.flatMap(({ attributes }) => assertResponsiveSourceSet(attributes, provenance, stem, { deferred }));

  return { stem, candidates };
}

async function assertResponsiveCandidateFiles(candidates) {
  await Promise.all(candidates.map(({ path }) => access(new URL(`..${path}`, import.meta.url))));
}

function assertPpkPublicLinks(markup) {
  assertLink(markup, 'Source repository', 'https://github.com/craigCODA/ppk076', { safeExternal: true });
  assertLink(markup, 'Live demo', 'https://craigcoda.github.io/ppk076/', { safeExternal: true });
}

function visibleText(markup) {
  return markup
    .replace(/<head\b[\s\S]*?<\/head>/gi, '')
    .replace(/<(?:script|style|template)\b[\s\S]*?<\/(?:script|style|template)>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|nbsp);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readBuiltOutputAfterBuild(url) {
  let lastError;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await readFile(url, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      lastError = error;
      await delay(25);
    }
  }

  throw lastError;
}

function assertSkillLabDocumentContract(markup, provenance) {
  const headings = [...markup.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const boundary = markup.match(/<section\b[^>]*\bskill-lab-boundary\b[^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? '';
  const boundaryText = visibleText(boundary);

  assert.deepEqual(headings, sharedCaseStudyHeadings);
  assert.match(markup, /<link rel=["']stylesheet["'] href=["']\/assets\/css\/projects\/skill-lab\.css["']>/i);
  assertLink(markup, 'Source repository', 'https://github.com/craigCODA/Skill-Evaluation-Lab', { safeExternal: true });
  assertLink(markup, 'Evidence release: evidence-0001-0015', 'https://github.com/craigCODA/Skill-Evaluation-Lab/releases/tag/evidence-0001-0015', { safeExternal: true });
  assert.match(boundaryText, /0031 block is a captured saved record/i);
  assert.match(boundaryText, /public evidence release records runs 0001–0015/i);
  assert.match(boundaryText, /not live or current repository status for the public repository/i);

  const skillPictures = pictures(markup);
  assert.equal(skillPictures.length, 1, 'Skill Evaluation Lab must use one responsive evidence map');
  const pictureEvidence = assertResponsivePictureEvidence(skillPictures[0], provenance);
  assert.equal(pictureEvidence.stem, 'assets/evidence/optimized/skill-evaluation/skill-evaluation-lab-evidence-map');

  return pictureEvidence.candidates;
}

function assertWorkspaceDocumentContract(markup, provenance) {
  const headings = [...markup.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const sourceLinks = linksByLabel(markup, 'Source repository');
  const externalLinks = openingTags(markup, 'a')
    .map(({ attributes }) => attributes)
    .filter((attributes) => /^https?:\/\//i.test(attributes.get('href') ?? ''));
  const visible = visibleText(markup);

  assert.deepEqual(headings, sharedCaseStudyHeadings);
  assert.match(markup, /<link rel=["']stylesheet["'] href=["']\/assets\/css\/projects\/workspace\.css["']>/i);
  assertLink(markup, 'Source repository', 'https://github.com/craigCODA/workspace-environment-vnext', { safeExternal: true });
  assert.equal(sourceLinks[0].get('rel'), 'noopener noreferrer');
  assert.equal(externalLinks.length, 1, 'Workspace must expose only its confirmed source URL');
  assert.equal(linksByLabel(markup, 'Live demo').length, 0, 'Workspace must not invent a live demo');
  assert.equal(externalLinks.some((attributes) => /demo/i.test(attributes.get('href') ?? '')), false, 'Workspace must not link a demo');
  assert.equal(visible.split(mandatoryWorkspaceBoundary).length - 1, 1, 'Workspace must publish the exact mandatory boundary once');

  const images = openingTags(markup, 'img');
  assert.equal(images.length, 1, 'Workspace must use only the saved room checkpoint visual');
  assert.equal(
    assertEvidenceImage(images[0].attributes, provenance),
    'assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint'
  );
  const workspacePictures = pictures(markup);
  assert.equal(workspacePictures.length, 1, 'Workspace must use one responsive room checkpoint picture');
  const pictureEvidence = assertResponsivePictureEvidence(workspacePictures[0], provenance);
  assert.equal(pictureEvidence.stem, 'assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint');
  const sources = openingTags(workspacePictures[0], 'source');
  const sourceByType = new Map(sources.map(({ attributes }) => [attributes.get('type'), attributes]));
  assert.equal(
    sourceByType.get('image/avif').get('srcset'),
    '/assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-640w.avif 640w, /assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-1080w.avif 1080w, /assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-1760w.avif 1760w'
  );
  assert.equal(
    sourceByType.get('image/webp').get('srcset'),
    '/assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-640w.webp 640w, /assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-1080w.webp 1080w, /assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-1760w.webp 1760w'
  );
  for (const { attributes } of sources) {
    assert.equal(attributes.get('sizes'), '(max-width: 42rem) 100vw, 72vw');
  }

  return pictureEvidence.candidates;
}

function assertWorkspaceVisualBoundary(css) {
  assert.doesNotMatch(css, /(?:box-shadow|border-radius|gradient|animation|backdrop-filter)/i);
  assert.doesNotMatch(css, /(?:background-image\s*:|url\s*\()/i, 'Workspace CSS must not inject an alternate visual asset');
}

function assertPythosDocumentContract(markup, provenance) {
  const headings = [...markup.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const visible = visibleText(markup);
  const expectedStems = [
    'assets/evidence/optimized/pythos/pythos_physical_evidence_terminal',
    'assets/evidence/optimized/pythos/pythos-architecture-evidence-boundary',
    'assets/evidence/optimized/pythos/pythos_public_evidence_map',
    'assets/evidence/optimized/pythos/pythos_claim_boundary'
  ];

  assert.deepEqual(headings, sharedCaseStudyHeadings);
  assert.match(markup, /<link rel=["']stylesheet["'] href=["']\/assets\/css\/projects\/pythos\.css["']>/i);
  assertLink(markup, 'Source repository', 'https://github.com/craigCODA/pythos', { safeExternal: true });
  assertLink(markup, 'Independent PythOS documentation', 'https://craigcoda.github.io/pythos/', { safeExternal: true });
  assertLink(markup, 'Milestone release: Physical Persistent Object Storage', 'https://github.com/craigCODA/pythos/releases/tag/milestone-1-physical-storage', { safeExternal: true });
  assert.match(visible, /Governing architecture/i);
  assert.match(visible, /Verified implementation/i);
  assert.match(visible, /Physical evidence/i);
  assert.match(visible, /Current boundary \/ unfinished work/i);

  const pythosPictures = pictures(markup);
  assert.equal(pythosPictures.length, 4, 'PythOS must use the four registered evidence assets');
  const stems = pythosPictures.map((picture) => assertResponsivePictureEvidence(picture, provenance).stem).sort();
  assert.deepEqual(stems, expectedStems.slice().sort());

  return pythosPictures.flatMap((picture) => assertResponsivePictureEvidence(picture, provenance).candidates);
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
    /I learned systems through materials, machines, failure, movement, and consequence before I learned to express them in code\./,
    /<section\b[^>]*id=["']work["'][^>]*>/i,
    /Five systems\. Five different kinds of proof\./,
    /<section\b[^>]*id=["']verified-work["'][^>]*>/i,
    /The credential supports the evidence\. It never replaces it\./,
    /<section\b[^>]*id=["']background["'][^>]*>/i,
    /The software came after the systems\./,
    /I am building toward software that understands more than screens/i,
    /<section\b[^>]*id=["']contact["'][^>]*>/i,
    /Let the work answer first\./
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
    ['3500', 'I TURN OPERATIONS INTO DECISION SYSTEMS.', '176 pallet positions recovered. 22 storage bins freed.'],
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
    [],
    [],
    ['assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint'],
    ['assets/evidence/optimized/pythos/pythos_physical_evidence_terminal'],
    []
  ];
  for (const [index, images] of frameImages.entries()) {
    const stems = images.map((attributes) => {
      const src = attributes.get('src') ?? attributes.get('data-src') ?? '';
      const evidence = [...registeredEvidence.values()].find((entry) => `/${entry.original}` === src);
      assert.ok(evidence, `frame ${index + 1} evidence must be provenance-traced`);
      assert.equal(attributes.get('alt'), evidence.alt, `frame ${index + 1} must retain its registered alt text`);
      assert.equal(attributes.get('width'), String(evidence.sourceWidth));
      assert.equal(attributes.get('height'), String(evidence.sourceHeight));
      return evidence.outputStem;
    });
    assert.deepEqual(stems.sort(), expectedStems[index].slice().sort(), `frame ${index + 1} must use its approved evidence`);
  }

  const frameSources = frames.map(({ body }) => openingTags(body, 'source').map(({ attributes }) => attributes));
  assert.equal(frameImages[0][0].has('src') && !frameImages[0][0].has('data-src'), true, 'the opening physical-systems evidence must retain its live original');
  assert.equal(frameImages[0].slice(1).every((attributes) => !attributes.has('src') && attributes.has('data-src')), true, 'matched-camera evidence must remain deferred until aperture entry');
  assert.equal(frameImages.slice(1, 3).flat().length, 0, 'warehouse and agent states must use live HTML proof compositions');
  assert.equal(frameImages.slice(3, 5).flat().every((attributes) => !attributes.has('src') && attributes.has('data-src') && !attributes.has('data-srcset')), true, 'later image states must retain deferred original evidence');
  assert.equal(frameSources.flat().length, 0, 'aperture raw evidence must not introduce responsive picture sources');
  assert.match(frames[1].body, /class=["'][^"']*warehouse-result\b/i, 'warehouse state must render its measured result as live HTML');
  assert.match(frames[2].body, /class=["'][^"']*run-ledger\b/i, 'agent state must render its preserved run ledger as live HTML');
  assert.match(frames[5].body, /class=["'][^"']*aperture-visuals--synthesis\b[^"']*["'][^>]*aria-hidden=["']true["']/i, 'synthesis visual must remain decorative');
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

test('homepage preserves the complete post-aperture systems thesis', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const thesis = html.match(/<section\b[^>]*class=["'][^"']*\bthesis\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? '';
  const renderedThesis = visibleText(thesis);

  assert.match(renderedThesis, /materials, machines, failure, movement, and consequence/i);
  assert.match(renderedThesis, /State has to correspond to something\./);
  assert.match(renderedThesis, /Authority has to belong somewhere\./);
  assert.match(renderedThesis, /Evidence has to survive the demo\./);
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
  const contact = sectionBody(html, 'contact');
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
  assertLink(contact, 'GitHub', 'https://github.com/craigCODA', { safeExternal: true });
  assertLink(contact, 'Email', 'mailto:mistercraigr@gmail.com');
  assertLink(contact, 'LinkedIn', 'https://www.linkedin.com/in/Craig-Ramos', { safeExternal: true });
  assertLink(contact, 'Source', 'https://github.com/craigCODA/craigcoda.github.io', { safeExternal: true });
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

test('homepage raw evidence and all case-study pictures use exact registered originals', async () => {
  const provenanceEntries = JSON.parse(await readFile(provenanceUrl, 'utf8'));
  const registeredEvidence = new Map(provenanceEntries.map((entry) => [entry.outputStem, entry]));
  const homepage = await readFile(indexUrl, 'utf8');
  const homepageImages = openingTags(homepage, 'img').filter(({ attributes }) => (
    (attributes.get('src') ?? attributes.get('data-src') ?? '').startsWith('/assets/evidence/')
  ));
  const documents = [
    { url: ppkUrl, count: 10, eagerPicture: 0 },
    { url: new URL('../projects/warehouse-optimization/index.html', import.meta.url), count: 1 },
    { url: skillLabUrl, count: 1 },
    { url: workspaceUrl, count: 1 },
    { url: pythosUrl, count: 4 }
  ];
  const candidates = [];
  let caseStudyImageCount = 0;

  assert.equal(homepageImages.length, 10, 'homepage must retain its approved ten-image raw evidence set');
  assert.equal(pictures(homepage).length, 0, 'homepage must use raw evidence and live HTML proof compositions without picture wrappers');
  for (const [index, { attributes }] of homepageImages.entries()) {
    assertResponsiveEvidenceImage(attributes, registeredEvidence, { opening: index === 0 });
    assert.equal(attributes.has('fetchpriority'), index === 0, 'only the opening aperture image may receive fetch priority');
  }

  for (const { url, count, eagerPicture } of documents) {
    const markup = await readFile(url, 'utf8');
    const evidenceImages = openingTags(markup, 'img').filter(({ attributes }) => (
      (attributes.get('src') ?? attributes.get('data-src') ?? '').startsWith('/assets/evidence/')
    ));
    const evidencePictures = pictures(markup);

    assert.equal(evidenceImages.length, count, `${url.pathname} must retain its approved evidence image count`);
    assert.equal(evidencePictures.length, count, `${url.pathname} must wrap every evidence image in exactly one picture`);
    for (const [index, picture] of evidencePictures.entries()) {
      const pictureEvidence = assertResponsivePictureEvidence(picture, registeredEvidence, { opening: index === eagerPicture });
      candidates.push(...pictureEvidence.candidates);
    }
    caseStudyImageCount += evidenceImages.length;
  }

  assert.equal(caseStudyImageCount, 17);
  await assertResponsiveCandidateFiles(candidates);
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
  const derivativeOpeningFallback = ppk.replace(
    '/assets/evidence/original/ppk076/ppk076_full_facility_oblique.png" alt=',
    '/assets/evidence/optimized/ppk076/ppk076_full_facility_oblique-1759w.webp" alt='
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
    () => assertResponsivePictureEvidence(pictures(derivativeOpeningFallback)[0], registeredPpkEvidence, { opening: true }),
    /must be the exact registered original fallback/
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

test('homepage link controls retain 44-pixel touch targets and keyboard skip behavior', async () => {
  const [baseCss, homeCss] = await Promise.all([readFile(baseCssUrl, 'utf8'), readFile(homeCssUrl, 'utf8')]);
  const baseRules = parseCssRules(baseCss);
  const homeNarrowRules = parseCssRules(homeCss).filter(isHomepageNarrowMediaRule);
  const skipLink = effectiveExactDeclarations(baseRules, '.skip-link');
  const focusedSkipLink = effectiveExactDeclarations(baseRules, '.skip-link:focus');
  const navLink = effectiveExactDeclarations(baseRules, '.site-nav a');
  const projectLink = effectiveExactDeclarations(homeNarrowRules, '.project-link');
  const closingLink = effectiveExactDeclarations(homeNarrowRules, '.closing-links a');
  const openingCue = effectiveExactDeclarations(homeNarrowRules, '.opening-cue');

  assertNoAlternateSkipLinkTransforms(baseRules);

  assert.equal(skipLink.get('min-height'), '2.75rem');
  assert.equal(skipLink.get('transform'), 'translateY(-200%)');
  assert.equal(focusedSkipLink.get('transform'), 'translateY(0)');
  assert.equal(navLink.get('min-height'), '2.75rem');
  for (const declarations of [projectLink, closingLink, openingCue]) {
    assert.equal(declarations.get('display'), 'inline-flex');
    assert.equal(declarations.get('align-items'), 'center');
    assert.equal(declarations.get('min-height'), '2.75rem');
  }
});

test('homepage major sections resolve to 88–144 pixel fluid editorial rhythm', async () => {
  const [tokensCss, homeCss, apertureCss] = await Promise.all([
    readFile(tokensCssUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(apertureCssUrl, 'utf8')
  ]);
  const sectionSpace = effectiveExactDeclarations(parseCssRules(tokensCss), ':root').get('--section-space');
  const resolvedRange = sectionSpace?.match(/^clamp\(\s*([\d.]+)rem\s*,\s*[\d.]+vw\s*,\s*([\d.]+)rem\s*\)$/);

  assert.ok(resolvedRange, '--section-space must be a fluid rem-based clamp');
  assert.equal(Number(resolvedRange[1]) * 16, 88);
  assert.equal(Number(resolvedRange[2]) * 16, 144);

  const homeRules = parseCssRules(homeCss);
  assert.equal(effectiveExactDeclarations(parseCssRules(apertureCss), '.aperture-shell').get('margin-block'), '0 var(--section-space)');
  for (const selector of ['.thesis', '.verified-work', '.background', '.closing']) {
    assert.equal(
      effectiveExactDeclarations(homeRules, selector).get('padding-block'),
      'var(--section-space)',
      `${selector} must consume the fluid major-section gap`
    );
  }
  assert.equal(effectiveExactDeclarations(homeRules, '.selected-work').get('padding-top'), 'var(--section-space)');
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
      stems: [],
      proofClass: 'warehouse-proof'
    },
    {
      route: '/projects/skill-evaluation-lab/',
      modifier: 'work-piece--skill',
      stems: [],
      proofClass: 'run-ledger--project'
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

    assert.equal(attributeTokens(article.attributes, 'class').has('project'), true, `${expected.modifier} must retain the shared project composition`);
    assert.match(article.body, new RegExp(`<a\\b[^>]*\\bhref=["']${expected.route}["']`, 'i'));
    if (expected.proofClass) assert.match(article.body, new RegExp(`class=["'][^"']*\\b${expected.proofClass}\\b`, 'i'));
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
  const derivativeFallback = warehouse.replace(
    '/assets/evidence/original/warehouse/warehouse-optimization-verified-result.png" alt=',
    '/assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-1800w.webp" alt='
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
    () => assertResponsivePictureEvidence(pictures(derivativeFallback)[0], registeredEvidence),
    /must be the exact registered original fallback/
  );
});

test('Skill Evaluation Lab authored and built routes preserve ordered evidence-record contracts', async () => {
  const [skillLab, builtSkillLab, skillLabCss, provenance] = await Promise.all([
    readFile(skillLabUrl, 'utf8'),
    readBuiltOutputAfterBuild(builtSkillLabUrl),
    readFile(skillLabCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const sourceCandidates = assertSkillLabDocumentContract(skillLab, registeredEvidence);
  const builtCandidates = assertSkillLabDocumentContract(builtSkillLab, registeredEvidence);
  await assertResponsiveCandidateFiles([...sourceCandidates, ...builtCandidates]);

  const reorderedHeadings = skillLab
    .replace('<h2 id="problem-title">Problem</h2>', '<h2 id="problem-title">What I built</h2>')
    .replace('<h2 id="built-title">What I built</h2>', '<h2 id="built-title">Problem</h2>');
  const missingSavedRecordBoundary = skillLab.replaceAll('not live or current repository status for the public repository', 'current repository status');
  assert.throws(
    () => assertSkillLabDocumentContract(reorderedHeadings, registeredEvidence),
    /strictly deep-equal/
  );
  assert.throws(
    () => assertSkillLabDocumentContract(missingSavedRecordBoundary, registeredEvidence),
    /not live or current repository status for the public repository/
  );

  const rules = parseCssRules(skillLabCss);
  const desktopChain = effectiveExactDeclarations(rules.filter((rule) => rule.atRules.length === 0), '.skill-evidence-chain');
  const narrowChain = effectiveExactDeclarations(rules.filter(isRequiredNarrowMediaRule), '.skill-evidence-chain');
  assert.match(desktopChain.get('grid-template-columns') ?? '', /repeat\(5,/i);
  assert.equal(narrowChain.get('grid-template-columns'), '1fr');
  assert.match(skillLabCss, /counter-reset:\s*evidence-step/i);
  assert.match(skillLabCss, /\.skill-evidence-chain li::before[\s\S]*?content:\s*counter\(evidence-step/i);
  assert.doesNotMatch(skillLabCss, /(?:chart|dashboard|box-shadow|border-radius|gradient)/i);
});

test('Workspace Environment vNext authored and built routes keep their complete evidence and authority contract', async () => {
  const [workspace, builtWorkspace, workspaceCss, provenance] = await Promise.all([
    readFile(workspaceUrl, 'utf8'),
    readBuiltOutputAfterBuild(builtWorkspaceUrl),
    readFile(workspaceCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const sourceCandidates = assertWorkspaceDocumentContract(workspace, registeredEvidence);
  const builtCandidates = assertWorkspaceDocumentContract(builtWorkspace, registeredEvidence);
  await assertResponsiveCandidateFiles([...sourceCandidates, ...builtCandidates]);

  for (const mutation of [
    workspace.replace('<h2 id="problem-title">Problem</h2>', '<h2 id="problem-title">Workspace</h2>'),
    workspace.replace('Saved M2A room checkpoint with a spatial screen placeholder, table, brick objects, object panel, trusted controls, and connected state', 'Unregistered alternate screen'),
    workspace.replace('width="1760"', 'width="1600"'),
    workspace.replace('/assets/evidence/optimized/workspace/workspace_m2a_room_checkpoint-1080w.avif 1080w, ', ''),
    workspace.replace('(max-width: 42rem) 100vw, 72vw', '100vw'),
    workspace.replace('loading="lazy"', 'loading="eager"'),
    workspace.replace('https://github.com/craigCODA/workspace-environment-vnext', 'https://example.invalid/workspace'),
    workspace.replace('rel="noopener noreferrer"', 'rel="noopener"'),
    workspace.replace('</ul>', '<li><a href="https://demo.example.invalid">Live demo</a></li></ul>'),
    workspace.replace(mandatoryWorkspaceBoundary, 'The screen boundary is unspecified.'),
    workspace.replace('</picture>', '</picture><img src="/alternate-screen.webp" alt="Alternate application screenshot">')
  ]) {
    assert.throws(() => assertWorkspaceDocumentContract(mutation, registeredEvidence));
  }

  const rules = parseCssRules(workspaceCss);
  const desktopRules = rules.filter((rule) => rule.atRules.length === 0);
  const narrowRules = rules.filter(isRequiredNarrowMediaRule);
  assert.match(effectiveExactDeclarations(desktopRules, '.workspace-evidence-layout').get('grid-template-columns') ?? '', /minmax\(/);
  assert.equal(effectiveExactDeclarations(narrowRules, '.workspace-evidence-layout').get('grid-template-columns'), '1fr');
  assert.match(effectiveExactDeclarations(desktopRules, '.workspace-authority-column').get('margin-top') ?? '', /clamp\(/);
  assert.equal(effectiveExactDeclarations(narrowRules, '.workspace-authority-column').get('margin-top'), '0');
  assert.equal(effectiveExactDeclarations(desktopRules, '.workspace-room-plane img').get('height'), 'auto');
  assertWorkspaceVisualBoundary(workspaceCss);
  for (const cssMutation of [
    `${workspaceCss}\n.workspace-room-plane { background-image: url('/alternate-application-screen.webp'); }`,
    `${workspaceCss}\n.workspace-authority-column::before { content: ''; background: url('data:image/svg+xml,fake'); }`
  ]) {
    assert.throws(() => assertWorkspaceVisualBoundary(cssMutation), /alternate visual/i);
  }
  assert.doesNotMatch(workspace, /<script\b/i);
});

test('PythOS preserves its registered evidence, external documentation boundary, and light-document treatment', async () => {
  const [pythos, pythosCss, provenance] = await Promise.all([
    readFile(pythosUrl, 'utf8'),
    readFile(pythosCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const candidates = assertPythosDocumentContract(pythos, registeredEvidence);

  await assertResponsiveCandidateFiles(candidates);
  assert.match(pythosCss, /\.pythos-terminal-band\s*\{[\s\S]*?background:\s*var\(--charcoal\)/i);
  assert.match(pythosCss, /\.pythos-document-pair\s*\{[\s\S]*?grid-template-columns/i);
  assert.doesNotMatch(pythosCss, /(?:box-shadow|border-radius|gradient)/i);
});

test('every selected work evidence image resolves to provenance with its registered intrinsic contract', async () => {
  const [html, provenance] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const registeredEvidence = new Map(provenance.map((entry) => [entry.outputStem, entry]));
  const images = openingTags(sectionBody(html, 'work'), 'img');

  assert.equal(images.length, 5, 'work evidence should remain the selected five-image set');
  for (const { attributes } of images) assertEvidenceImage(attributes, registeredEvidence);
});

test('VERIFIED WORK contains its exact editorial heading and operational authority evidence', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const verifiedWork = sectionBody(html, 'verified-work');
  const rows = [...verifiedWork.matchAll(/<dl\b[^>]*>[\s\S]*?<\/dl>/gi)][0]?.[0]
    .matchAll(/<div\b[^>]*>([\s\S]*?)<\/div>/gi);
  const rowText = [...(rows ?? [])]
    .map((match) => match[1].replace(/\s+/g, ' ').trim());

  assert.match(verifiedWork, /<h2\b[^>]*\bid=["']verified-work-title["'][^>]*>\s*VERIFIED WORK\s*<\/h2>/i);
  assert.match(verifiedWork, /The credential supports the evidence\. It never replaces it\./i);
  assert.equal(rowText.length, 3, 'VERIFIED WORK must use three evidence-context rows');
  assert.match(rowText[0], /Operational systems/i);
  assert.match(rowText[0], /176 pallet positions recovered/i);
  assert.match(rowText[0], /22 storage bins freed/i);
  assert.match(rowText[1], /Physical systems/i);
  assert.match(rowText[1], /313 verification markers/i);
  assert.match(rowText[1], /target-specific physical evidence/i);
  assert.match(rowText[2], /Professional practice/i);
  assert.match(rowText[2], /React, Node, Git\/PR workflows/i);
});

test('homepage styles preserve asymmetric editorial compositions without generic card treatment', async () => {
  const [html, homeCss] = await Promise.all([readFile(indexUrl, 'utf8'), readFile(homeCssUrl, 'utf8')]);
  const rules = parseCssRules(homeCss);
  const desktopRules = rules.filter((rule) => rule.atRules.length === 0);
  const narrowRules = rules.filter(isHomepageNarrowMediaRule);
  const compositionSelectors = [
    '.project--ppk',
    '.project--warehouse',
    '.project--skill',
    '.project--workspace',
    '.project--pythos'
  ];

  for (const selector of compositionSelectors) {
    assert.match(effectiveExactDeclarations(desktopRules, selector).get('grid-template-columns') ?? '', /minmax\(/, `${selector} must keep its desktop split composition`);
    assert.equal(effectiveExactDeclarations(narrowRules, selector).get('grid-template-columns'), '1fr', `${selector} must stack as one column on narrow screens`);
  }

  assert.equal(effectiveExactDeclarations(desktopRules, '.project--ppk .project-copy').get('padding-top'), '1rem');
  assert.equal(effectiveExactDeclarations(desktopRules, '.project--warehouse').get('background'), 'var(--industrial)');
  assert.match(effectiveExactDeclarations(desktopRules, '.project--skill').get('gap') ?? '', /^clamp\(/);
  assert.equal(effectiveExactDeclarations(desktopRules, '.project--workspace').get('background'), '#d6d9d6');
  assert.equal(effectiveExactDeclarations(desktopRules, '.pythos-machine').get('background'), '#25221e');

  assert.equal(/\bcard\b/i.test(html), false, 'homepage markup must not introduce generic card classes');
  const shadowSelectors = rules.filter((rule) => hasDeclaration(rule, 'box-shadow')).flatMap((rule) => rule.selectors);
  assert.deepEqual(shadowSelectors, ['.run-ledger'], 'only the live evidence ledger may use a document shadow');
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
    'class="project project--skill work-piece--skill"',
    'class="project project--skill work-piece--skill work-piece--pythos"'
  );
  const twoExpectedModifiers = html.replace(
    'class="project project--workspace work-piece--workspace"',
    'class="project project--workspace work-piece--workspace work-piece--skill"'
  );
  const unknownProjectModifier = html.replace(
    'class="project project--ppk work-piece--ppk"',
    'class="project project--ppk work-piece--ppk work-piece--experimental"'
  );
  const eagerBelowFoldImage = html.replace(
    'alt="First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment" loading="lazy"',
    'alt="First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment" loading="eager"'
  );
  const missingWarehouseProof = html.replace('class="warehouse-proof"', 'class="proof-removed"');
  const missingProjectLedger = html.replace('class="run-ledger run-ledger--project"', 'class="run-ledger"');
  const renamedVerificationHeading = html.replace('VERIFIED WORK', 'VERIFIED SUMMARY');
  const lightPythosMachine = homeCss.replace('background: #25221e', 'background: var(--paper)');
  const genericCardShadow = `${homeCss}\n.project { box-shadow: 0 1rem 2rem rgba(0,0,0,.2); }`;
  const roundedHomepage = `${homeCss}\n.project { border-radius: 1rem; }`;
  const gradientHomepage = `${homeCss}\n.opening { background: linear-gradient(red, blue); }`;
  const shadowSelectors = (css) => parseCssRules(css)
    .filter((rule) => hasDeclaration(rule, 'box-shadow'))
    .flatMap((rule) => rule.selectors);

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
    () => assertEvidenceImage(openingTags(sectionBody(eagerBelowFoldImage, 'work'), 'img')[0].attributes, registeredEvidence),
    /must lazy-load/
  );
  assert.throws(
    () => assert.match(sectionBody(missingWarehouseProof, 'work'), /class=["'][^"']*\bwarehouse-proof\b/),
    /warehouse-proof/
  );
  assert.throws(
    () => assert.match(sectionBody(missingProjectLedger, 'work'), /class=["'][^"']*\brun-ledger--project\b/),
    /run-ledger--project/
  );
  assert.throws(
    () => assert.match(sectionBody(renamedVerificationHeading, 'verified-work'), /<h2\b[^>]*>\s*VERIFIED WORK\s*<\/h2>/i),
    /VERIFIED WORK/
  );
  assert.throws(
    () => assert.equal(effectiveExactDeclarations(parseCssRules(lightPythosMachine), '.pythos-machine').get('background'), '#25221e'),
    /Expected values to be strictly equal/
  );
  assert.throws(
    () => assert.deepEqual(shadowSelectors(genericCardShadow), ['.run-ledger']),
    /Expected values to be strictly deep-equal/
  );
  assert.throws(
    () => assert.equal(/border-radius\s*:/i.test(roundedHomepage), false),
    /Expected values to be strictly equal/
  );
  assert.throws(
    () => assert.equal(/(?:linear|radial|conic)-gradient\s*\(/i.test(gradientHomepage), false),
    /Expected values to be strictly equal/
  );
});
