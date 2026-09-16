import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROTECTED_FILE_HASHES, SITE_ROUTES } from './site-files.mjs';

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs']);
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const forbiddenText = [
  ['warehouse SVG filename', 'warehouse_wh1_bin_map_high_quality.svg'],
  ['warehouse restricted count', '+222'],
  ['warehouse restricted count', /\b26 bins\b/i]
];
const expectedLinks = new Map([
  ['index.html', [
    'https://craigcoda.github.io/',
    'https://github.com/craigCODA',
    'https://github.com/craigCODA/craigcoda.github.io',
    'https://www.linkedin.com/in/Craig-Ramos'
  ]],
  ['projects/ppk076/index.html', ['https://github.com/craigCODA/ppk076', 'https://craigcoda.github.io/ppk076/']],
  ['projects/skill-evaluation-lab/index.html', [
    'https://github.com/craigCODA/Skill-Evaluation-Lab',
    'https://github.com/craigCODA/Skill-Evaluation-Lab/releases/tag/evidence-0001-0015'
  ]],
  ['projects/workspace-environment-vnext/index.html', ['https://github.com/craigCODA/workspace-environment-vnext']],
  ['projects/pythos/index.html', [
    'https://github.com/craigCODA/pythos',
    'https://github.com/craigCODA/pythos/releases/tag/milestone-1-physical-storage',
    'https://craigcoda.github.io/pythos/'
  ]]
]);

function displayPath(file) {
  return file.replaceAll('\\', '/');
}

function fail(file, rule) {
  throw new Error(`${displayPath(file)}: ${rule}`);
}

async function walk(directory, relativeRoot = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath, relativeRoot));
    if (entry.isFile()) files.push({ absolutePath, relativePath: displayPath(path.relative(relativeRoot, absolutePath)) });
  }
  return files;
}

function isExternal(value) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value);
}

function localReference(value) {
  const reference = value.trim();
  if (!reference || isExternal(reference)) return undefined;
  return reference.split(/[?#]/, 1)[0];
}

async function assertReference(root, sourceFile, reference, rule) {
  const local = localReference(reference);
  if (!local) return;
  const target = local.startsWith('/')
    ? path.resolve(root, `.${local}`)
    : path.resolve(path.dirname(sourceFile), local);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(sourceFile, `${rule} escapes public output: ${reference}`);
  try {
    await stat(target);
  } catch {
    fail(sourceFile, `${rule} does not resolve: ${reference}`);
  }
}

function attributeValues(markup, attribute) {
  const expression = new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi');
  return [...markup.matchAll(expression)].map((match) => match[1] ?? match[2] ?? match[3]);
}

async function auditHtml(root, file, relativePath, markup, provenanceStems) {
  for (const attribute of ['href', 'src', 'data-src']) {
    for (const reference of attributeValues(markup, attribute)) await assertReference(root, file, reference, attribute);
  }
  for (const attribute of ['srcset', 'data-srcset']) {
    for (const srcset of attributeValues(markup, attribute)) {
      for (const candidate of srcset.split(',')) await assertReference(root, file, candidate.trim().split(/\s+/, 1)[0], attribute);
    }
  }
  for (const match of markup.matchAll(/<img\b([^>]*)>/gi)) {
    const attributes = match[1];
    const alt = attributeValues(attributes, 'alt')[0]?.trim();
    const width = attributeValues(attributes, 'width')[0];
    const height = attributeValues(attributes, 'height')[0];
    const loading = attributeValues(attributes, 'loading')[0];
    if (!alt) fail(relativePath, 'img has empty alt text');
    if (!/^\d+$/.test(width ?? '')) fail(relativePath, 'img width must be numeric');
    if (!/^\d+$/.test(height ?? '')) fail(relativePath, 'img height must be numeric');
    if (!/^(?:lazy|eager)$/i.test(loading ?? '')) fail(relativePath, 'img must declare loading behavior');
    const source = attributeValues(attributes, 'src')[0] ?? attributeValues(attributes, 'data-src')[0];
    if (source && imageExtensions.has(path.extname(source.split(/[?#]/, 1)[0]).toLowerCase())) {
      const normalized = source.split(/[?#]/, 1)[0].replace(/^\//, '').replace(/-\d+w\.(?:avif|webp)$/i, '');
      if (!provenanceStems.has(normalized)) {
        fail(relativePath, `public image is missing provenance: ${source}`);
      }
    }
  }
  for (const [plannedFile, links] of expectedLinks) {
    if (relativePath !== plannedFile) continue;
    for (const link of links) if (!markup.includes(link)) fail(relativePath, `confirmed link is missing: ${link}`);
  }
}

async function auditCss(root, file, markup) {
  for (const match of markup.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi)) {
    await assertReference(root, file, match[1] ?? match[2] ?? match[3], 'CSS url');
  }
}

async function auditJavaScript(root, file, markup) {
  for (const match of markup.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*["']([^"']+)["']/g)) {
    await assertReference(root, file, match[1], 'JavaScript module');
  }
}

async function auditProtectedFiles(root) {
  for (const [relativePath, expectedHash] of Object.entries(PROTECTED_FILE_HASHES)) {
    const contents = await readFile(path.join(root, relativePath));
    const actualHash = createHash('sha256').update(contents).digest('hex').toUpperCase();
    if (actualHash !== expectedHash) fail(relativePath, 'protected SHA-256 hash does not match');
  }
}

export async function auditPublicOutput(outputRoot) {
  const root = path.resolve(outputRoot);
  const files = await walk(root);
  const filePaths = new Set(files.map(({ relativePath }) => relativePath));
  try {
    await stat(path.join(root, 'pythos'));
    fail('pythos', 'top-level PythOS directory is forbidden');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (filePaths.has('service-worker.js')) fail('service-worker.js', 'root service worker is forbidden');

  const provenance = JSON.parse(await readFile(path.join(root, 'assets/evidence/provenance.json'), 'utf8'));
  const provenanceStems = new Set(provenance.map(({ outputStem }) => outputStem));
  for (const { absolutePath, relativePath } of files) {
    const extension = path.extname(relativePath).toLowerCase();
    if (path.basename(relativePath) === 'warehouse_wh1_bin_map_high_quality.svg') fail(relativePath, 'warehouse SVG filename');
    if (!textExtensions.has(extension)) continue;
    const content = await readFile(absolutePath, 'utf8');
    for (const [rule, pattern] of forbiddenText) if (typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content)) fail(relativePath, rule);
    if (/serviceWorker\.register|service-worker\.js/i.test(content)) fail(relativePath, 'service worker registration is forbidden');
    if (extension === '.html') await auditHtml(root, absolutePath, relativePath, content, provenanceStems);
    if (extension === '.css') await auditCss(root, absolutePath, content);
    if (extension === '.js' || extension === '.mjs') await auditJavaScript(root, absolutePath, content);
  }

  for (const route of SITE_ROUTES) {
    const relativePath = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
    if (!filePaths.has(relativePath)) fail(relativePath, 'registered route is missing built index.html');
  }
  const warehouse = await readFile(path.join(root, 'projects/warehouse-optimization/index.html'), 'utf8');
  for (const text of ['176 pallet positions recovered', '22 storage bins freed']) {
    if (!warehouse.includes(text)) fail('projects/warehouse-optimization/index.html', `missing exact warehouse result: ${text}`);
  }
  const workspace = await readFile(path.join(root, 'projects/workspace-environment-vnext/index.html'), 'utf8');
  const workspaceSentence = 'The large application screen is a placeholder in this saved M2A room checkpoint; live generic Windows surface streaming was not complete at this checkpoint.';
  if (!workspace.includes(workspaceSentence)) fail('projects/workspace-environment-vnext/index.html', 'missing Workspace placeholder sentence');
  const pythos = await readFile(path.join(root, 'projects/pythos/index.html'), 'utf8');
  for (const text of ['target-specific physical evidence', 'not a claim of universal hardware support']) {
    if (!pythos.includes(text)) fail('projects/pythos/index.html', `missing target-specific PythOS language: ${text}`);
  }
  await auditProtectedFiles(root);

  const bytes = (await Promise.all(files.map(({ absolutePath }) => stat(absolutePath).then(({ size }) => size)))).reduce((total, size) => total + size, 0);
  return { assetCount: files.filter(({ relativePath }) => relativePath.startsWith('assets/')).length, bytes, fileCount: files.length, routeCount: SITE_ROUTES.length };
}

const invokedPath = process.argv[1] && path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const summary = await auditPublicOutput(process.argv[2] ?? 'dist');
  console.log(`Audit passed: ${summary.routeCount} routes, ${summary.assetCount} assets, ${summary.bytes} bytes.`);
}
