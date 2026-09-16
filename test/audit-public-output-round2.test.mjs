import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { auditPublicOutput } from '../scripts/audit-public-output.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);
const knownImage = 'assets/evidence/optimized/warehouse/warehouse-optimization-verified-result-720w.webp';
async function fixture(context) { await execFileAsync(process.execPath, ['scripts/build.mjs'], { cwd: repositoryRoot }); const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-audit-round2-')); await cp(path.join(repositoryRoot, 'dist'), root, { recursive: true }); context.after(() => rm(root, { recursive: true, force: true })); return root; }
async function appendHome(root, markup) { const home = path.join(root, 'index.html'); await writeFile(home, (await readFile(home, 'utf8')).replace('</body>', `${markup}</body>`)); }

test('audit rejects a stray optimized image that is not in provenance', async (context) => {
  const root = await fixture(context); const stray = 'assets/evidence/optimized/warehouse/stray-output.webp'; await cp(path.join(root, knownImage), path.join(root, stray));
  await assert.rejects(auditPublicOutput(root), /stray-output\.webp: shipped image is not in the provenance allowlist/);
});
test('audit rejects CSS and deferred image references outside provenance', async (context) => {
  const root = await fixture(context); const cssStray = 'assets/evidence/optimized/warehouse/css-stray.webp'; const deferredStray = 'assets/evidence/optimized/warehouse/deferred-stray.webp'; for (const target of [cssStray, deferredStray]) await cp(path.join(root, knownImage), path.join(root, target));
  await writeFile(path.join(root, 'assets', 'css', 'round2.css'), `.round2 { background-image: url('/${cssStray}'); }`); await assert.rejects(auditPublicOutput(root), /assets\/css\/round2\.css: public image is missing provenance/);
  await rm(path.join(root, 'assets', 'css', 'round2.css')); await rm(path.join(root, cssStray)); await appendHome(root, `<img src="/${knownImage}" data-src="/${deferredStray}" alt="Registered image with forbidden deferred source" width="1800" height="1000" loading="lazy">`); await assert.rejects(auditPublicOutput(root), /index\.html: public image is missing provenance/);
});
test('audit rejects confidential HTML and raw text exports', async (context) => {
  const root = await fixture(context); const disclosure = '<p>facility address: confidential operator name material number: 12345 SAP credential</p>'; await appendHome(root, disclosure); await assert.rejects(auditPublicOutput(root), /index\.html: sensitive warehouse details/);
  const home = path.join(root, 'index.html'); await writeFile(home, (await readFile(home, 'utf8')).replace(disclosure, '')); const exportPath = path.join(root, 'assets', 'warehouse-export.csv'); await writeFile(exportPath, 'operator,material\nAlice,12345\n'); await assert.rejects(auditPublicOutput(root), /assets\/warehouse-export\.csv: public file type is not allowlisted/);
});
test('audit rejects extra route documents and directory references', async (context) => {
  const root = await fixture(context); const secretRoute = path.join(root, 'projects', 'secret'); await mkdir(secretRoute); await writeFile(path.join(secretRoute, 'index.html'), '<!doctype html><title>Private</title>'); await assert.rejects(auditPublicOutput(root), /projects\/secret: unregistered built route directory/);
  await rm(secretRoute, { recursive: true }); await appendHome(root, '<a href="/projects/">Directory</a>'); await assert.rejects(auditPublicOutput(root), /href does not resolve: \/projects\//);
  const home = path.join(root, 'index.html'); await writeFile(home, (await readFile(home, 'utf8')).replace('href="/projects/"', 'href="/projects"')); await assert.rejects(auditPublicOutput(root), /href targets a directory: \/projects/);
});
test('audit requires actual exact external anchor destinations', async (context) => {
  const root = await fixture(context); const ppk = path.join(root, 'projects', 'ppk076', 'index.html'); const markup = await readFile(ppk, 'utf8'); await writeFile(ppk, markup.replace('href="https://github.com/craigCODA/ppk076"', 'href="https://github.com/craigCODA/ppk076-extra"').replace('</body>', '<!-- https://github.com/craigCODA/ppk076 --><a data-href="https://github.com/craigCODA/ppk076">Not an anchor destination</a></body>'));
  await assert.rejects(auditPublicOutput(root), /projects\/ppk076\/index\.html: (?:required external anchor is missing|unexpected external anchor)/);
});

for (const [label, mutate] of [
  ['removed real anchor', (markup) => markup.replace('href="https://github.com/craigCODA/ppk076"', 'href="/"')],
  ['comment-only URL', (markup) => markup.replace('href="https://github.com/craigCODA/ppk076"', 'href="/"').replace('</body>', '<!-- https://github.com/craigCODA/ppk076 --></body>')],
  ['data-href-only URL', (markup) => markup.replace('href="https://github.com/craigCODA/ppk076"', 'data-href="https://github.com/craigCODA/ppk076"')],
  ['prefix release URL', (markup) => markup.replace('href="https://github.com/craigCODA/ppk076"', 'href="https://github.com/craigCODA/ppk076/releases/tag/evidence"')]
]) test(`audit rejects ${label} external-link substitution`, async (context) => {
  const root = await fixture(context); const file = path.join(root, 'projects', 'ppk076', 'index.html'); await writeFile(file, mutate(await readFile(file, 'utf8')));
  await assert.rejects(auditPublicOutput(root), /projects\/ppk076\/index\.html: (?:required external anchor is missing|unexpected external anchor)/);
});

for (const extension of ['.txt', '.csv', '']) test(`audit rejects confidential extensionless or ${extension || 'extensionless'} export`, async (context) => {
  const root = await fixture(context); const file = path.join(root, 'assets', `confidential-export${extension}`); await writeFile(file, 'facility address: restricted\noperator name: private\nmaterial number: 12345\n');
  await assert.rejects(auditPublicOutput(root), new RegExp(`assets/confidential-export\\${extension}: (?:sensitive warehouse details|public file type is not allowlisted)`));
});
