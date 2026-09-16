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
