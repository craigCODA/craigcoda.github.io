import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
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

  assert.equal(images.length, 7, 'aperture must retain its approved seven-image evidence set');
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

function assertStaticBoundary(markup, aperture, homeCss) {
  assert.equal(/<(?:a|button|form|input|select|textarea)\b/i.test(aperture), false, 'Task 5 aperture must not include interactive controls');
  assert.equal(/\brole\s*=\s*["'](?:carousel|tab|tablist|tabpanel|listbox|option)["']/i.test(aperture), false, 'Task 5 aperture must not include carousel roles');
  assert.equal(/\baria-(?:roledescription|controls|selected)\s*=/i.test(aperture), false, 'Task 5 aperture must not include carousel ARIA patterns');
  assert.equal(/<script\b/i.test(markup), false, 'Task 5 static boundary prohibits page scripts');
  assert.equal(/assets\/js\/(?:aperture(?:-controller)?\.js)/i.test(markup), false, 'Task 5 static boundary prohibits runtime controller files');
  assert.equal(/\b(?:setTimeout|setInterval|requestAnimationFrame|IntersectionObserver|matchMedia|autoplay|loop)\b/i.test(markup), false, 'Task 5 static boundary prohibits runtime timeline APIs');

  const motionProperties = parseCssRules(homeCss)
    .filter((rule) => rule.selectors.some(isApertureSelector))
    .flatMap((rule) => rule.declarations.filter((property) => ['transition', 'animation', 'opacity', 'transform'].includes(property)));
  assert.deepEqual(motionProperties, [], 'Task 5 aperture selectors must not add motion or opacity-hidden sequencing');
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

  assert.match(skillScope, /captured saved[- ]record/i, 'Skill disclosure must stay with its aperture frame or project content');
  assert.match(skillScope, /not a live repository-status display/i, 'Skill disclosure must retain its not-live boundary');
  assert.match(workspaceScope, /placeholder/i, 'Workspace disclosure must stay with its aperture frame or project content');
  assert.doesNotMatch(stateFrames[3].body, /\bstream(?:ing)?\b/i, 'Workspace aperture state must not claim stream completion');
}

test('Task 5 static aperture has exact copy, registered responsive evidence, and scoped disclosures', async () => {
  const [html, homeCss, provenanceEntries] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const provenance = new Map(provenanceEntries.map((entry) => [entry.outputStem, entry]));
  const { aperture, body, stateFrames } = frames(html);

  assertExactVisibleCopy(stateFrames);
  assertExactTranscript(body);
  const candidates = assertResponsiveEvidenceShape(body, provenance);
  assertStaticBoundary(html, aperture, homeCss);
  assertScopedDisclosures(html, stateFrames);
  await Promise.all(candidates.map(({ path, width, extension }) => access(new URL(`../${path.slice(1)}-${width}w.${extension}`, import.meta.url))));
  await Promise.all(['../assets/js/aperture-controller.js', '../assets/js/aperture.js'].map(async (relativePath) => {
    await assert.rejects(access(new URL(relativePath, import.meta.url)), /ENOENT/, 'Task 5 must not introduce runtime controller files');
  }));
});

test('Task 5 static-boundary contracts reject targeted mutations', async () => {
  const [html, homeCss, provenanceEntries] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(provenanceUrl, 'utf8').then(JSON.parse)
  ]);
  const provenance = new Map(provenanceEntries.map((entry) => [entry.outputStem, entry]));
  const changedCopy = html.replace('I MODEL PHYSICAL SYSTEMS.', 'I MODEL VIRTUAL SYSTEMS.');
  const changedTranscript = html.replace('I BUILD WHERE THOSE LAYERS MEET.</li>', 'I BUILD WHERE THOSE LAYERS DIFFER.</li>');
  const badSource = html.replace('ppk076_first_person_forklift-640w.webp 640w', 'ppk076_first_person_forklift-641w.webp 641w');
  const runtimeMarkup = html.replace('</section>\n\n        <section class="systems-thesis"', '<button type="button">Next</button></section>\n\n        <section class="systems-thesis"');
  const badCss = `${homeCss}\n.page-shell [data-aperture-frame] { opacity: 0; transition: opacity 1s; }`;
  const badSkillDisclosure = html.replace('not a live repository-status display.', 'a live repository-status display.');
  const badWorkspaceClaim = html.replace('Spatial computing, persistent by design.', 'Streaming is complete.');

  assert.throws(() => assertExactVisibleCopy(frames(changedCopy).stateFrames), /visible copy must be exact and ordered/);
  assert.throws(() => assertExactTranscript(frames(changedTranscript).body), /transcript must preserve every state in exact order/);
  assert.throws(() => assertResponsiveEvidenceShape(frames(badSource).body, provenance), /provenance width|direct source must be one of the responsive candidates/);
  assert.throws(() => assertStaticBoundary(runtimeMarkup, apertureFigure(runtimeMarkup).aperture, homeCss), /interactive controls/);
  assert.throws(() => assertStaticBoundary(html, apertureFigure(html).aperture, badCss), /motion or opacity-hidden sequencing/);
  assert.throws(() => assertScopedDisclosures(badSkillDisclosure, frames(badSkillDisclosure).stateFrames), /not-live boundary/);
  assert.throws(() => assertScopedDisclosures(badWorkspaceClaim, frames(badWorkspaceClaim).stateFrames), /stream completion/);
});
