import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  hasUnapprovedWarehouseClaim,
  warehouseSensitiveDetailPattern,
  warehouseSvgReferencePattern
} from '../scripts/public-output-boundaries.mjs';

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.txt']);

export { hasUnapprovedWarehouseClaim, warehouseSensitiveDetailPattern, warehouseSvgReferencePattern };

function displayPath(filePath) {
  return filePath.replaceAll('\\', '/');
}

export function assertWarehouseBoundaryEntries(entries) {
  for (const entry of entries) {
    const entryPath = displayPath(entry.path);
    assert.notEqual(path.extname(entryPath).toLowerCase(), '.svg', `${entryPath} must not be an SVG file`);
  }
}

export function assertWarehouseDisclosureEntries(entries) {
  for (const entry of entries) {
    const entryPath = displayPath(entry.path);
    assert.notEqual(path.extname(entryPath).toLowerCase(), '.svg', `${entryPath} must not be an SVG file`);
    if (typeof entry.content !== 'string') continue;
    assert.equal(hasUnapprovedWarehouseClaim(entry.content), false, `${entryPath} must not disclose restricted warehouse counts`);
    assert.doesNotMatch(entry.content, warehouseSensitiveDetailPattern, `${entryPath} must not disclose sensitive warehouse details`);
    assert.doesNotMatch(entry.content, warehouseSvgReferencePattern, `${entryPath} must not reference SVG evidence`);
  }
}

async function collectFiles(root, relativeRoot = root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath, relativeRoot));
    if (entry.isFile()) files.push({ absolutePath, path: path.relative(relativeRoot, absolutePath) });
  }

  return files;
}

export async function readWarehouseBoundaryEntries(repositoryRoot, { built = false } = {}) {
  const boundaryRoots = built
    ? [
      'dist/projects/warehouse-optimization',
      'dist/assets/css/projects/warehouse.css',
      'dist/assets/evidence/optimized/warehouse',
      'dist/assets/evidence/provenance.json'
    ]
    : [
      'projects/warehouse-optimization',
      'assets/css/projects/warehouse.css',
      'assets/evidence/optimized/warehouse',
      'assets/evidence/provenance.json'
    ];
  const files = [];

  for (const boundaryRoot of boundaryRoots) {
    const absoluteRoot = path.join(repositoryRoot, boundaryRoot);
    const rootEntries = (await stat(absoluteRoot)).isDirectory()
      ? await collectFiles(absoluteRoot, repositoryRoot)
      : [{ absolutePath: absoluteRoot, path: path.relative(repositoryRoot, absoluteRoot) }];
    for (const entry of rootEntries) {
      const extension = path.extname(entry.absolutePath).toLowerCase();
      files.push({
        path: entry.path,
        content: textExtensions.has(extension) ? await readFile(entry.absolutePath, 'utf8') : undefined
      });
    }
  }

  return files;
}
