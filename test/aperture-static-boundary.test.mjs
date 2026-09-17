import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
const apertureCssUrl = new URL('../assets/css/aperture.css', import.meta.url);
const provenanceUrl = new URL('../assets/evidence/provenance.json', import.meta.url);
const expectedCopy = [
  ['01 / PPK076', 'I MODEL PHYSICAL SYSTEMS.', 'Physical operations, modeled in software.'],
  ['02 / Warehouse optimization', 'I TURN OPERATIONS INTO DECISION SYSTEMS.', '176 pallet positions recovered. 22 storage bins freed.'],
  ['03 / Skill Evaluation Lab', 'I TEST WHAT AGENTS ACTUALLY DO.', 'Agents tested against preserved evidence.'],
  ['04 / Workspace Environment', 'I RETHINK HOW THE COMPUTER CAN FEEL.', 'Spatial computing, persistent by design.'],
  ['05 / PythOS', 'I BUILD BELOW THE APPLICATION LAYER.', 'A from-scratch, verification-driven operating system.'],
  ['06 / Synthesis', 'PHYSICAL SYSTEMS. SOFTWARE SYSTEMS. AI SYSTEMS. COMPUTER SYSTEMS.', 'I BUILD WHERE THOSE LAYERS MEET.']
];
const expectedTranscript = [
  'I model physical systems. Physical operations, modeled in software.',
  'I turn operations into decision systems. 176 pallet positions recovered. 22 storage bins freed.',
  'I test what agents actually do. Agents tested against preserved evidence.',
  'I rethink how the computer can feel. Spatial computing, persistent by design.',
  'I build below the application layer. A from-scratch, verification-driven operating system.',
  'Physical systems. Software systems. AI systems. Computer systems. I build where those layers meet.'
];
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

function elementMarkupByClass(markup, tagName, className) {
  const tags = new RegExp(`</?${tagName}\\b[^>]*>`, 'gi');
  const matches = [...markup.matchAll(tags)];
  const openings = matches.filter((match) => (
    !match[0].startsWith('</')
    && classTokens(parseAttributes(match[0])).has(className)
  ));

  assert.equal(openings.length, 1, `expected one .${className} container`);
  const opening = openings[0];
  tags.lastIndex = opening.index;
  let depth = 0;
  let tag;

  while ((tag = tags.exec(markup))) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return markup.slice(opening.index, tags.lastIndex);
  }

  throw new Error(`.${className} must have a closing ${tagName}`);
}

function assertExactVisibleCopy(stateFrames) {
  for (const [index, frame] of stateFrames.entries()) {
    const copy = copyContainer(frame.body);
    const paragraphs = [...copy.body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => normalizeText(match[1]));
    const copyRemainder = copy.body.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, '').trim();
    const visualMarkup = elementMarkupByClass(frame.body, 'div', 'aperture-visuals');
    const frameRemainder = normalizeText(frame.body.replace(visualMarkup, '').replace(copy.markup, ''));

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

function assertEvidenceShape(figureBody, provenance) {
  const images = openingTags(figureBody, 'img');
  const pictures = [...figureBody.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi)];
  const sources = openingTags(figureBody, 'source');
  const originals = [];

  assert.equal(images.length, 5, 'aperture must retain its five raw evidence images');
  assert.equal(pictures.length, 0, 'aperture must not wrap raw evidence in responsive pictures');
  assert.equal(sources.length, 0, 'aperture must not introduce responsive source elements');
  for (const [index, { attributes }] of images.entries()) {
    const deferred = index >= 1;

    assert.equal(attributes.has('src'), !deferred, 'only the opening evidence may be live');
    assert.equal(attributes.has('data-src'), deferred, 'all non-opening image evidence must remain deferred');
    assert.equal(attributes.has('srcset') || attributes.has('data-srcset'), false, 'aperture must use exact raw originals without responsive candidates');
    const direct = attributes.get(deferred ? 'data-src' : 'src');
    const evidence = [...provenance.values()].find((entry) => `/${entry.original}` === direct);

    assert.ok(evidence, `${direct ?? '<missing source>'} must be an exact registered original`);
    assert.equal(attributes.get('alt')?.trim().length > 0, true, 'aperture evidence must retain meaningful alt text');
    assert.equal(attributes.get('alt'), evidence.alt, 'aperture evidence must retain its registered alt text');
    assert.equal(attributes.get('decoding'), 'async', 'aperture evidence must decode asynchronously');
    assert.equal(attributes.get('loading'), index === 0 ? 'eager' : 'lazy', 'aperture evidence must retain its intended eager/lazy delivery');
    assert.equal(attributes.has('fetchpriority'), index === 0, 'only the opening evidence may receive fetch priority');
    if (index === 0) assert.equal(attributes.get('fetchpriority'), 'high', 'opening evidence must keep high fetch priority');
    assert.equal(attributes.get('width'), String(evidence.sourceWidth), 'aperture image width must match registered provenance');
    assert.equal(attributes.get('height'), String(evidence.sourceHeight), 'aperture image height must match registered provenance');
    originals.push(direct);
  }

  return originals;
}

async function assertEvidenceFiles(originals) {
  await Promise.all(originals.map((path) => access(new URL(`../${path.slice(1)}`, import.meta.url))));
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

  assert.match(skillScope, /preserved failures/i, 'Skill evidence must retain the preserved-failure boundary');
  assert.match(skillScope, /claims narrowed when effects do not reproduce/i, 'Skill disclosure must retain its reproduction boundary');
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
  const order = ['alt', 'height', 'width', 'loading', 'decoding', 'src', 'fetchpriority', 'class']
    .filter((name) => firstImage.attributes.has(name));
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
  const originals = assertEvidenceShape(body, provenance);
  assertRuntimeBoundary(html, aperture, homeCss, apertureCss);
  assertScopedDisclosures(html, stateFrames);
  await assertEvidenceFiles(originals);
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
  const changedTranscript = html.replace('I build where those layers meet.</li>', 'I build where those layers differ.</li>');
  const badOriginal = html.replace('/assets/evidence/original/ppk076/ppk076_first_person_forklift.png', '/assets/evidence/original/ppk076/unregistered.png');
  const badAlt = html.replace('alt="First-person view inside the modeled Plant 076 production floor with a forklift, pallet load, safety rails, and equipment"', 'alt=""');
  const badImageWidth = html.replace('width="1757" height="915"', 'width="1756" height="915"');
  const badImageHeight = html.replace('width="1757" height="915"', 'width="1757" height="914"');
  const badLoading = html.replace('loading="lazy" decoding="async"', 'loading="eager" decoding="async"');
  const badDecoding = html.replace('loading="lazy" decoding="async"', 'loading="lazy" decoding="sync"');
  const badOpeningDelivery = html.replace('loading="eager" fetchpriority="high"', 'loading="lazy" fetchpriority="high"');
  const badDeferredDelivery = html.replace('data-src="/assets/evidence/original/workspace/workspace_m2a_room_checkpoint.png"', 'src="/assets/evidence/original/workspace/workspace_m2a_room_checkpoint.png"');
  const badResponsiveCandidate = html.replace('class="aperture-layer aperture-layer--forklift"', 'class="aperture-layer aperture-layer--forklift" srcset="/assets/evidence/original/ppk076/ppk076_first_person_forklift.png 1757w"');
  const badControl = html.replace('<ol class="aperture-transcript"', '<button type="button">Next</button><ol class="aperture-transcript"');
  const badCarouselRole = html.replace('<figure class="aperture" data-aperture>', '<figure class="aperture" data-aperture role="tablist">');
  const badPageScript = html.replace('</body>', '<script type="module">void 0;</script></body>');
  const badSkillSavedRecord = html.replace('Preserved failures.', 'Removed failures.');
  const badSkillDisclosure = html.replace('Claims narrowed when effects do not reproduce.', 'Claims accepted without reproduction.');
  const badWorkspacePlaceholder = html.replaceAll('placeholder', 'completed checkpoint');
  const badWorkspaceFrameClaim = html.replace('Spatial computing, persistent by design.', 'Streaming is complete.');
  const badWorkspaceProjectClaim = html.replace('Persistent objects, spatial software surfaces, durable identity, and explicit host authority inside a navigable room.', 'Streaming is complete.');

  const shapeMutations = [
    [badOriginal, /exact registered original/],
    [badAlt, /meaningful alt text/],
    [badImageWidth, /image width must match/],
    [badImageHeight, /image height must match/],
    [badLoading, /eager\/lazy delivery/],
    [badDecoding, /decode asynchronously/],
    [badOpeningDelivery, /eager\/lazy delivery/],
    [badDeferredDelivery, /opening evidence may be live/],
    [badResponsiveCandidate, /raw originals without responsive candidates/]
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
  for (const [markup, expectedError] of shapeMutations) assert.throws(() => assertEvidenceShape(frames(markup).body, provenance), expectedError);
  for (const [markup, expectedError] of runtimeMutations) assert.throws(() => assertRuntimeBoundary(markup, apertureFigure(markup).aperture, homeCss, apertureCss), expectedError);
  for (const [css, expectedError] of motionMutations) assert.throws(() => assertRuntimeBoundary(html, apertureFigure(html).aperture, css, apertureCss), expectedError);
  assert.throws(() => assertScopedDisclosures(badSkillSavedRecord, frames(badSkillSavedRecord).stateFrames), /preserved-failure boundary/);
  assert.throws(() => assertScopedDisclosures(badSkillDisclosure, frames(badSkillDisclosure).stateFrames), /reproduction boundary/);
  assert.throws(() => assertScopedDisclosures(badWorkspacePlaceholder, frames(badWorkspacePlaceholder).stateFrames), /placeholder/);
  assert.throws(() => assertScopedDisclosures(badWorkspaceFrameClaim, frames(badWorkspaceFrameClaim).stateFrames), /must not claim stream completion/);
  assert.throws(() => assertScopedDisclosures(badWorkspaceProjectClaim, frames(badWorkspaceProjectClaim).stateFrames), /must not claim stream completion/);
  assert.doesNotThrow(() => assertEvidenceShape(frames(reorderFirstApertureImageAttributes(html)).body, provenance), 'attribute order must not affect aperture evidence parsing');

  const originals = assertEvidenceShape(frames(html).body, provenance);
  await assert.rejects(
    assertEvidenceFiles([`${originals[0]}.missing`]),
    /ENOENT/,
    'a provenance-shaped but missing asset must fail the filesystem branch'
  );
});
