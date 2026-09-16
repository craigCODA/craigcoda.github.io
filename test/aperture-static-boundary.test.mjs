import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
const apertureCssUrl = new URL('../assets/css/aperture.css', import.meta.url);
const provenanceUrl = new URL('../assets/evidence/provenance.json', import.meta.url);
const expectedCopy = [
  ['I MODEL PHYSICAL SYSTEMS.', 'Physical operations, modeled in software.'],
  ['I TURN OPERATIONS INTO DECISION SYSTEMS.', '176 pallet positions recovered. 22 bins freed.'],
  ['I TEST WHAT AGENTS ACTUALLY DO.', 'Agents tested against preserved evidence.'],
  ['I RETHINK HOW THE COMPUTER CAN FEEL.', 'Spatial computing, persistent by design.'],
  ['I BUILD BELOW THE APPLICATION LAYER.', 'A from-scratch, verification-driven operating system.'],
  ['PHYSICAL SYSTEMS. SOFTWARE SYSTEMS. AI SYSTEMS. COMPUTER SYSTEMS.', 'I BUILD WHERE THOSE LAYERS MEET.']
];
const expectedTranscript = expectedCopy.map(([statement, support]) => `${statement} ${support}`);
const expectedDurations = ['4000', '3500', '4000', '4000', '4500', '3000'];

function parseAttributes(tag) {
  const attributes = new Map();
  const source = tag.replace(/^<[^\s>]+/, '').replace(/\/?>$/, '');

  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attributes;
}

function classTokens(attributes) {
  return new Set((attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
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

  throw new Error(`#${id} must have a closing section`);
}

function apertureFigure(markup) {
  const aperture = sectionBody(markup, 'aperture');
  const figures = [...aperture.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi)];

  assert.equal(figures.length, 1, '#aperture must have one figure');
  assert.equal(parseAttributes(`<figure${figures[0][1]}>`).has('data-aperture'), true);
  return { aperture, body: figures[0][2] };
}

function frames(markup) {
  const figure = apertureFigure(markup);
  const stateFrames = [...figure.body.matchAll(/(<article\b[^>]*>)([\s\S]*?)<\/article>/gi)]
    .map((match) => ({ attributes: parseAttributes(match[1]), body: match[2] }));

  assert.equal(stateFrames.length, 6, 'aperture must retain six authored states');
  return { ...figure, stateFrames };
}

function assertFrameOrder(stateFrames) {
  assert.deepEqual(
    stateFrames.map((frame) => frame.attributes.get('data-duration')),
    expectedDurations,
    'aperture frame order must preserve the authored durations'
  );
}

function normalizeText(markup) {
  return markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function copyContainer(frameBody) {
  const copies = [...frameBody.matchAll(/<div\b([^>]*)>([\s\S]*?)<\/div>/gi)]
    .filter((match) => classTokens(parseAttributes(`<div${match[1]}>`)).has('aperture-copy'));

  assert.equal(copies.length, 1, 'each aperture state needs one visible copy container');
  return { markup: copies[0][0], body: copies[0][2] };
}

function assertExactVisibleCopy(stateFrames) {
  for (const [index, frame] of stateFrames.entries()) {
    const copy = copyContainer(frame.body);
    const paragraphs = [...copy.body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => normalizeText(match[1]));
    const copyRemainder = copy.body.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, '').trim();
    const visibleLayers = [...frame.body.matchAll(/<div\b([^>]*)>([\s\S]*?)<\/div>/gi)]
      .filter((match) => classTokens(parseAttributes(`<div${match[1]}>`)).has('aperture-visuals'));
    const frameRemainder = normalizeText(visibleLayers.reduce((remaining, layer) => remaining.replace(layer[0], ''), frame.body).replace(copy.markup, ''));

    assert.deepEqual(paragraphs, expectedCopy[index], `frame ${index + 1} visible copy must be exact and ordered`);
    assert.equal(copyRemainder, '', `frame ${index + 1} copy container must not add visible copy`);
    assert.equal(frameRemainder, '', `frame ${index + 1} must not add visible copy outside its copy container`);
  }
}

function assertExactTranscript(figureBody) {
  const transcripts = [...figureBody.matchAll(/<ol\b([^>]*)>([\s\S]*?)<\/ol>/gi)]
    .filter((match) => classTokens(parseAttributes(`<ol${match[1]}>`)).has('aperture-transcript'));

  assert.equal(transcripts.length, 1, 'aperture must include one complete transcript');
  const entries = [...transcripts[0][2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => normalizeText(match[1]));
  const remainder = transcripts[0][2].replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, '').trim();

  assert.deepEqual(entries, expectedTranscript, 'transcript must preserve every state in exact order');
  assert.equal(remainder, '', 'transcript must not add unordered copy');
}

function openingTags(markup, tagName) {
  return [...markup.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))]
    .map((match) => ({ tag: match[0], attributes: parseAttributes(match[0]) }));
}

function responsiveCandidates(attributes) {
  assert.equal(attributes.has('srcset') && attributes.has('data-srcset'), false, 'a responsive source cannot be both live and deferred');
  const responsiveAttribute = attributes.has('srcset') ? 'srcset' : 'data-srcset';
  const value = attributes.get(responsiveAttribute);

  assert.ok(value, 'aperture evidence must declare a responsive candidate set');
  return value.split(',').map((candidate) => {
    const match = candidate.trim().match(/^(\/assets\/evidence\/optimized\/.+)-(\d+)w\.(avif|webp)\s+(\d+)w$/i);

    assert.ok(match, `invalid responsive evidence candidate: ${candidate.trim()}`);
    assert.equal(Number(match[2]), Number(match[4]), 'responsive width descriptor must match its filename');
    return { path: match[1], width: Number(match[2]), extension: match[3].toLowerCase() };
  });
}

function assertResponsiveEvidenceShape(figureBody, provenance) {
  const media = ['img', 'source'].flatMap((tagName) => openingTags(figureBody, tagName).map((entry) => ({ ...entry, tagName })));
  const images = openingTags(figureBody, 'img');
  const pictures = [...figureBody.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)];

  assert.equal(images.length, 8, 'aperture must retain its approved eight-image evidence set, including the PythOS hard-cut pair');
  for (const picture of pictures) assert.match(picture[1], /<img\b/i, 'every aperture picture must contain an image fallback');
  for (const { attributes, tagName } of media) {
    const candidates = responsiveCandidates(attributes);

    assert.match(attributes.get('sizes') ?? '', /(?:\d+(?:vw|px)|\([^)]*\))/i, 'aperture evidence needs a meaningful responsive sizes value');
    if (tagName === 'img') {
      const directAttribute = attributes.has('src') ? 'src' : 'data-src';
      const direct = attributes.get(directAttribute);

      assert.ok(direct, 'aperture evidence must retain a direct source or deferred direct source');
      assert.equal(attributes.get('alt')?.trim().length > 0, true, 'aperture evidence must retain meaningful alt text');
      assert.equal(attributes.get('decoding'), 'async', 'aperture evidence must decode asynchronously');
      assert.equal(attributes.get('loading'), 'lazy', 'aperture evidence must retain lazy loading');
      assert.match(direct, /^\/assets\/evidence\/optimized\/.+-(\d+)w\.(avif|webp)$/i, `invalid direct evidence source: ${direct}`);
      assert.equal(candidates.some((candidate) => `${candidate.path}-${candidate.width}w.${candidate.extension}` === direct), true, 'direct source must be one of the responsive candidates');

      const directCandidate = candidates.find((candidate) => `${candidate.path}-${candidate.width}w.${candidate.extension}` === direct);
      const evidence = provenance.get(directCandidate.path.slice(1));
      assert.equal(attributes.get('width'), String(evidence.sourceWidth), 'aperture image width must match registered provenance');
      assert.equal(attributes.get('height'), String(evidence.sourceHeight), 'aperture image height must match registered provenance');
    }

    for (const candidate of candidates) {
      const evidence = provenance.get(candidate.path.slice(1));
      assert.ok(evidence, `${candidate.path} must resolve to registered provenance`);
      assert.equal(evidence.widths.includes(candidate.width), true, `${candidate.path} must use a declared provenance width`);
      if (attributes.has('type')) assert.equal(attributes.get('type'), `image/${candidate.extension}`, 'source type must match candidate extension');
    }
  }

  const liveImages = images.slice(0, 3).map(({ attributes }) => attributes);
  const deferredImages = images.slice(3).map(({ attributes }) => attributes);
  assert.equal(liveImages.every((attributes) => attributes.has('src') && attributes.has('srcset')), true, 'only the first visual state may use live sources');
  assert.equal(deferredImages.every((attributes) => !attributes.has('src') && attributes.has('data-src') && attributes.has('data-srcset')), true, 'later visual states must retain deferred sources');

  return media.flatMap(({ attributes }) => responsiveCandidates(attributes));
}

async function assertEvidenceFiles(candidates) {
  await Promise.all(candidates.map(({ path, width, extension }) => access(new URL(`../${path.slice(1)}-${width}w.${extension}`, import.meta.url))));
}

function matchingBrace(source, openingBrace) {
  let depth = 1;

  for (let index = openingBrace + 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return index;
  }

  throw new Error('Unclosed CSS block');
}

function parseCssRules(css) {
  const rules = [];

  function visit(source) {
    let cursor = 0;
    while (cursor < source.length) {
      const openingBrace = source.indexOf('{', cursor);
      if (openingBrace === -1) break;
      const prelude = source.slice(cursor, openingBrace).trim();
      const closingBrace = matchingBrace(source, openingBrace);
      const block = source.slice(openingBrace + 1, closingBrace);

      if (prelude.startsWith('@')) visit(block);
      else if (prelude) {
        const declarations = block.split(';').map((entry) => entry.trim()).filter(Boolean).map((entry) => entry.split(':')[0].trim().toLowerCase());
        rules.push({ selectors: prelude.split(',').map((selector) => selector.trim()), declarations });
      }
      cursor = closingBrace + 1;
    }
  }

  visit(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  return rules;
}

function isApertureSelector(selector) {
  return /\.aperture(?:[\w-]|$)|\[data-aperture(?:-[\w-]+)?(?:[\]~|^$*]?=|\])/i.test(selector);
}

function prohibitedApertureMotionProperties(homeCss) {
  return parseCssRules(homeCss)
    .filter((rule) => rule.selectors.some(isApertureSelector))
    .flatMap((rule) => rule.declarations.filter((property) => /^(?:-(?:webkit|moz|ms|o)-)?(?:transition|animation)$|^(?:opacity|transform)$/.test(property)));
}

function assertRuntimeBoundary(markup, aperture, homeCss, apertureCss) {
  assert.equal(/<(?:a|button|form|input|select|textarea)\b/i.test(aperture), false, 'aperture must not include interactive controls');
  assert.equal(/\brole\s*=\s*["'](?:carousel|tab|tablist|tabpanel|listbox|option)["']/i.test(aperture), false, 'aperture must not include carousel roles');
  assert.equal(/\baria-(?:roledescription|controls|selected)\s*=/i.test(aperture), false, 'aperture must not include carousel ARIA patterns');
  assert.match(markup, /<link\b[^>]*href=["']\/assets\/css\/aperture\.css["']/i, 'homepage must load the aperture presentation');
  assert.match(markup, /<script\b[^>]*type=["']module["'][^>]*src=["']\/assets\/js\/aperture\.js["'][^>]*><\/script>/i, 'homepage may load only the aperture DOM adapter');
  assert.equal((markup.match(/<script\b/gi) ?? []).length, 1, 'homepage must keep the runtime boundary to one external module');
  assert.equal(/\b(?:autoplay|loop)\b/i.test(aperture), false, 'aperture must never opt into looping media');

  const motionProperties = prohibitedApertureMotionProperties(homeCss);
  assert.deepEqual(motionProperties, [], `home layout styles must not own aperture motion: ${motionProperties.join(', ')}`);
  assert.match(apertureCss, /\[data-aperture-frame\]/, 'aperture presentation must stay in its focused stylesheet');
}

function projectArticle(markup, modifier) {
  const work = sectionBody(markup, 'work');
  const match = new RegExp(`<article\\b[^>]*\\bclass=["'][^"']*\\b${modifier}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/article>`, 'i').exec(work);

  assert.ok(match, `work must include ${modifier}`);
  return match[1];
}

function assertScopedDisclosures(markup, stateFrames) {
  const skillScope = `${stateFrames[2].body} ${projectArticle(markup, 'work-piece--skill')}`;
  const workspaceScope = `${stateFrames[3].body} ${projectArticle(markup, 'work-piece--workspace')}`;

  assert.match(skillScope, /captured saved[- ]record/i, 'Skill saved-record disclosure must stay with its aperture frame or project content');
  assert.match(skillScope, /not a live repository-status display/i, 'Skill disclosure must retain its not-live boundary');
  assert.match(workspaceScope, /placeholder/i, 'Workspace placeholder disclosure must stay with its aperture frame or project content');
  assert.doesNotMatch(workspaceScope, /\bstream(?:ing)?\b/i, 'Workspace aperture frame and project content must not claim stream completion');
}

function swapFirstTwoFrames(markup) {
  const figure = apertureFigure(markup);
  const stateMarkup = [...figure.body.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)].map((match) => match[0]);
  const token = '__TASK_5_FIRST_FRAME__';
  const swapped = figure.body.replace(stateMarkup[0], token).replace(stateMarkup[1], stateMarkup[0]).replace(token, stateMarkup[1]);

  return markup.replace(figure.body, swapped);
}

function reorderFirstApertureImageAttributes(markup) {
  const figure = apertureFigure(markup);
  const [firstImage] = openingTags(figure.body, 'img');
  const order = ['alt', 'height', 'width', 'sizes', 'loading', 'decoding', 'srcset', 'src', 'class'];
  const reordered = `<img ${order.map((name) => `${name}="${firstImage.attributes.get(name)}"`).join(' ')}>`;

  return markup.replace(firstImage.tag, reordered);
}

test('aperture preserves its authored content, evidence, and narrowed runtime boundary', async () => {
  const [html, homeCss, apertureCss, provenanceEntries] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(apertureCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const provenance = new Map(provenanceEntries.map((entry) => [entry.outputStem, entry]));
  const { aperture, body, stateFrames } = frames(html);

  assertFrameOrder(stateFrames);
  assertExactVisibleCopy(stateFrames);
  assertExactTranscript(body);
  const candidates = assertResponsiveEvidenceShape(body, provenance);
  assertRuntimeBoundary(html, aperture, homeCss, apertureCss);
  assertScopedDisclosures(html, stateFrames);
  await assertEvidenceFiles(candidates);
  await Promise.all(['../assets/js/aperture-controller.js', '../assets/js/aperture.js'].map((relativePath) => access(new URL(relativePath, import.meta.url))));
});

test('aperture content and runtime-boundary contracts reject targeted mutations', async () => {
  const [html, homeCss, apertureCss, provenanceEntries] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(apertureCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const provenance = new Map(provenanceEntries.map((entry) => [entry.outputStem, entry]));
  const changedCopy = html.replace('I MODEL PHYSICAL SYSTEMS.', 'I MODEL VIRTUAL SYSTEMS.');
  const extraVisibleCopy = html.replace('Physical operations, modeled in software.</p>', 'Physical operations, modeled in software.</p><p>Unapproved visible copy.</p>');
  const changedTranscript = html.replace('I BUILD WHERE THOSE LAYERS MEET.</li>', 'I BUILD WHERE THOSE LAYERS DIFFER.</li>');
  const badCandidateFormat = html.replace('ppk076_first_person_forklift-640w.webp 640w', 'ppk076_first_person_forklift-640.webp 640w');
  const badCandidateWidth = html.replace('ppk076_first_person_forklift-640w.webp 640w', 'ppk076_first_person_forklift-640w.webp 641w');
  const badAlt = html.replace('alt="First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment"', 'alt=""');
  const badImageWidth = html.replace('width="1757" height="915"', 'width="1756" height="915"');
  const badImageHeight = html.replace('width="1757" height="915"', 'width="1757" height="914"');
  const badLoading = html.replace('loading="lazy" decoding="async"', 'loading="eager" decoding="async"');
  const badDecoding = html.replace('loading="lazy" decoding="async"', 'loading="lazy" decoding="sync"');
  const badSizes = html.replace('sizes="(max-width: 42rem) 100vw, 70vw"', 'sizes=""');
  const badControl = html.replace('</section>\n\n        <section class="systems-thesis"', '<button type="button">Next</button></section>\n\n        <section class="systems-thesis"');
  const badCarouselRole = html.replace('<figure class="aperture" data-aperture>', '<figure class="aperture" data-aperture role="tablist">');
  const badPageScript = html.replace('</body>', '<script type="module">void 0;</script></body>');
  const badSkillSavedRecord = html.replaceAll('captured saved-record status block', 'captured status block').replaceAll('Captured saved record;', 'Captured record;');
  const badSkillDisclosure = html.replace('not a live repository-status display.', 'a live repository-status display.');
  const badWorkspacePlaceholder = html.replaceAll('placeholder', 'completed checkpoint');
  const badWorkspaceFrameClaim = html.replace('Spatial computing, persistent by design.', 'Streaming is complete.');
  const badWorkspaceProjectClaim = html.replace('A room is an authority model, not a skin.', 'Streaming is complete.');

  const shapeMutations = [
    [badCandidateFormat, /invalid responsive evidence candidate/],
    [badCandidateWidth, /responsive width descriptor/],
    [badAlt, /meaningful alt text/],
    [badImageWidth, /image width must match/],
    [badImageHeight, /image height must match/],
    [badLoading, /lazy loading/],
    [badDecoding, /decode asynchronously/],
    [badSizes, /meaningful responsive sizes/]
  ];
  const runtimeMutations = [
    [badControl, /interactive controls/],
    [badCarouselRole, /carousel roles/],
    [badPageScript, /one external module/],
    [html.replace('/assets/js/aperture.js', '/assets/js/other.js'), /aperture DOM adapter/],
    ...['autoplay', 'loop'].map((api) => [html.replace('<figure', `<figure data-task-6-probe="${api}"`), /looping media/])
  ];
  const motionMutations = [
    [`${homeCss}\n.page-shell .aperture-frame { -webkit-transition: none; }`, /-webkit-transition/],
    [`${homeCss}\n.aperture-frame.aperture-frame--synthesis { -moz-animation: none; }`, /-moz-animation/],
    [`${homeCss}\n[data-aperture-frame][hidden] { opacity: 0; }`, /opacity/]
  ];

  assert.throws(() => assertFrameOrder(frames(swapFirstTwoFrames(html)).stateFrames), /frame order/);
  assert.throws(() => assertExactVisibleCopy(frames(changedCopy).stateFrames), /visible copy must be exact and ordered/);
  assert.throws(() => assertExactVisibleCopy(frames(extraVisibleCopy).stateFrames), /visible copy must be exact and ordered/);
  assert.throws(() => assertExactTranscript(frames(changedTranscript).body), /transcript must preserve every state in exact order/);
  for (const [markup, expectedError] of shapeMutations) assert.throws(() => assertResponsiveEvidenceShape(frames(markup).body, provenance), expectedError);
  for (const [markup, expectedError] of runtimeMutations) assert.throws(() => assertRuntimeBoundary(markup, apertureFigure(markup).aperture, homeCss, apertureCss), expectedError);
  for (const [css, expectedError] of motionMutations) assert.throws(() => assertRuntimeBoundary(html, apertureFigure(html).aperture, css, apertureCss), expectedError);
  assert.throws(() => assertScopedDisclosures(badSkillSavedRecord, frames(badSkillSavedRecord).stateFrames), /saved/);
  assert.throws(() => assertScopedDisclosures(badSkillDisclosure, frames(badSkillDisclosure).stateFrames), /not-live boundary/);
  assert.throws(() => assertScopedDisclosures(badWorkspacePlaceholder, frames(badWorkspacePlaceholder).stateFrames), /placeholder/);
  assert.throws(() => assertScopedDisclosures(badWorkspaceFrameClaim, frames(badWorkspaceFrameClaim).stateFrames), /must not claim stream completion/);
  assert.throws(() => assertScopedDisclosures(badWorkspaceProjectClaim, frames(badWorkspaceProjectClaim).stateFrames), /must not claim stream completion/);
  assert.doesNotThrow(() => assertResponsiveEvidenceShape(frames(reorderFirstApertureImageAttributes(html)).body, provenance), 'attribute order must not affect aperture evidence parsing');

  const candidates = assertResponsiveEvidenceShape(frames(html).body, provenance);
  await assert.rejects(
    assertEvidenceFiles([{ ...candidates[0], path: `${candidates[0].path}-missing` }]),
    /ENOENT/,
    'a provenance-shaped but missing asset must fail the filesystem branch'
  );
});
