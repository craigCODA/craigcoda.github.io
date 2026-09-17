import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { PROTECTED_FILE_HASHES } from '../scripts/site-files.mjs';

const expectedHashes = {
  '.nojekyll': 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
  '.well-known/assetlinks.json': 'BFBBE4F4B583EF45CF0BFA48E0C954CA333AFD861E5FF72F5F3BAD5196624D1E'
};

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex').toUpperCase();

test('protected GitHub Pages files retain their approved SHA-256 hashes', async () => {
  for (const [file, expectedHash] of Object.entries(expectedHashes)) {
    const contents = await readFile(new URL(`../${file}`, import.meta.url));

    assert.equal(sha256(contents), expectedHash);
    assert.equal(PROTECTED_FILE_HASHES[file], expectedHash);
  }
});

test('protected asset links check out with the approved CRLF bytes on every platform', async () => {
  const attributes = await readFile(new URL('../.gitattributes', import.meta.url), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });

  assert.match(attributes, /^\.well-known\/assetlinks\.json text eol=crlf$/m);
});

test('.nojekyll remains empty', async () => {
  const contents = await readFile(new URL('../.nojekyll', import.meta.url));

  assert.equal(contents.length, 0);
});

test('asset links retain the approved Android package', async () => {
  const contents = await readFile(new URL('../.well-known/assetlinks.json', import.meta.url), 'utf8');
  const assetLinks = JSON.parse(contents);

  assert.equal(assetLinks[0].target.package_name, 'io.github.craigcoda.twa');
});
