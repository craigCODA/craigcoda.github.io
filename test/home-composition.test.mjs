import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexUrl = new URL('../index.html', import.meta.url);
const homeCssUrl = new URL('../assets/css/home.css', import.meta.url);
const apertureCssUrl = new URL('../assets/css/aperture.css', import.meta.url);

test('keeps every aperture statement outside its visual surface', async () => {
  const markup = await readFile(indexUrl, 'utf8');
  const frames = [...markup.matchAll(/<article\b[^>]*data-aperture-frame[^>]*>([\s\S]*?)<\/article>/gi)];

  assert.equal(frames.length, 6);
  for (const [, body] of frames) {
    assert.match(body, /class="[^"]*aperture-visuals\b/);
    assert.match(body, /class="aperture-copy"/);
    assert.ok(
      body.indexOf('class="aperture-copy"') > body.indexOf('</div>'),
      'the statement must be a sibling after the visual surface, not an image overlay'
    );
  }
});

test('uses raw evidence and live document compositions on the homepage', async () => {
  const markup = await readFile(indexUrl, 'utf8');

  assert.doesNotMatch(markup, /warehouse-optimization-verified-result\.(?:png|avif|webp)/);
  assert.doesNotMatch(markup, /skill-evaluation-lab-evidence-map\.(?:png|avif|webp)/);
  assert.doesNotMatch(markup, /pythos-architecture-evidence-boundary\.(?:png|avif|webp)/);
  assert.match(markup, /class="run-ledger"/);
  assert.match(markup, /class="warehouse-result"/);
});

test('defines distinct homepage compositions without giant dead-zone spacing', async () => {
  const [markup, homeCss, apertureCss] = await Promise.all([
    readFile(indexUrl, 'utf8'),
    readFile(homeCssUrl, 'utf8'),
    readFile(apertureCssUrl, 'utf8')
  ]);

  for (const composition of ['project--ppk', 'project--warehouse', 'project--skill', 'project--workspace', 'project--pythos']) {
    assert.match(markup, new RegExp(`class="[^"]*${composition}`));
    assert.match(homeCss, new RegExp(`\\.${composition}\\b`));
  }

  assert.doesNotMatch(homeCss, /13vw/);
  assert.doesNotMatch(homeCss, /15rem/);
  assert.match(apertureCss, /grid-template-columns:\s*minmax\(0,\s*1\.65fr\)\s+minmax\(16rem,\s*0\.65fr\)/);
});
