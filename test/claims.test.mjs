import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publicDocuments = [
  '../index.html',
  '../404.html',
  '../projects/ppk076/index.html',
  '../projects/warehouse-optimization/index.html',
  '../projects/skill-evaluation-lab/index.html',
  '../projects/workspace-environment-vnext/index.html',
  '../projects/pythos/index.html'
];

function ppkVisibleText(markup) {
  return markup
    .replace(/<head\b[\s\S]*?<\/head>/gi, '')
    .replace(/<(?:script|style|template)\b[\s\S]*?<\/(?:script|style|template)>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|nbsp);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertNoPpkVisibleMetrics(text) {
  const metrics = [...text.matchAll(/(?<![\p{L}\p{N}])(176|22|222|26)(?![\p{L}\p{N}])/gu)].map((match) => match[1]);

  assert.deepEqual(metrics, [], `PPK visible text must not publish warehouse metrics: ${metrics.join(', ')}`);
}

test('PPK076 describes the supported local boundary without exposing inventory records or warehouse-optimization results', async () => {
  const ppk = await readFile(new URL('../projects/ppk076/index.html', import.meta.url), 'utf8');
  const visibleText = ppkVisibleText(ppk);

  for (const content of [
    /physical layout, storage, movement, and training/i,
    /disconnected records/i,
    /offline-capable browser-based Three\.js warehouse simulation/i,
    /walking and forklift interaction/i,
    /camera modes/i,
    /PWA support/i,
    /WebXR-compatible browser direction/i,
    /Electron packaging/i,
    /manual export/i,
    /local parsing/i,
    /no SAP return path/i,
    /top-down inset/i,
    /rack positions and floor-bin areas/i,
    /operational relationship/i,
    /inspectable/i,
    /Three\.js/i,
    /PWA and service worker/i,
    /Node build scripts/i,
    /simulation and decision\/training aid/i,
    /optional movement capture/i,
    /public verification surfaces/i
  ]) assert.match(visibleText, content);

  assertNoPpkVisibleMetrics(visibleText);
  assert.doesNotMatch(visibleText, /(?:material number|storage bin|inventory record)\s*[:|]/i);

  assert.throws(() => assertNoPpkVisibleMetrics(`${visibleText} 176 positions`), /176/);
  assert.throws(() => assertNoPpkVisibleMetrics(`${visibleText} 176/22 bins and 222 positions / 26 bins`), /176, 22, 222, 26/);
  assert.doesNotThrow(() => assertNoPpkVisibleMetrics(`${visibleText} CRC176F4C6E zone22alpha`));
  assert.doesNotThrow(() => assertNoPpkVisibleMetrics(ppkVisibleText(`${ppk}<script>const metric = 176;</script>`)));
});

test('homepage publishes only the approved evidence-led claims', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const publicHtml = await Promise.all(publicDocuments.map((document) => readFile(new URL(document, import.meta.url), 'utf8')));

  assert.match(home, /I BUILD SYSTEMS THAT HAVE TO ANSWER TO REALITY\./);
  assert.match(home, /VERIFIED WORK/);
  assert.match(home, /176 pallet positions recovered/i);
  assert.match(home, /22 storage bins freed/i);
  assert.doesNotMatch(publicHtml.join('\n'), /\+?222\b|\b26 (?:storage )?bins\b/i);
  assert.match(home, /313 verification markers/i);
  assert.match(home, /zero drops/i);
  assert.match(home, /176F4C6E/i);
  assert.match(home, /target-specific/i);
});

test('selected PythOS evidence band carries its target-specific metrics', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const pythosBand = home.match(/<article\b[^>]*class=["'][^"']*\bwork-piece--pythos\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? '';

  assert.match(pythosBand, /313 verification markers/i);
  assert.match(pythosBand, /zero drops/i);
  assert.match(pythosBand, /CRC 176F4C6E/i);
  assert.match(pythosBand, /target-specific physical evidence/i);
});
