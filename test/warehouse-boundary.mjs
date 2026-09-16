import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.txt']);

export const warehouseDisclosurePattern = /(?<![\p{L}\p{N}+])\+?(?:222|26)(?![\p{L}\p{N}])/u;
export const warehouseSensitiveDetailPattern = /(?:\braw\s+(?:sap(?:\s+(?:records?|data))?|records?|data)\b|\bconfidential\s+(?:roster|data)\b|\bfacility\s+(?:address|identifier|label)\b|\binternal\s+(?:bin(?:\s+(?:id|identifier))?|label|record)\b|\b(?:operator|employee|personnel)\s+(?:name|e-?mail|id)\b|\b(?:material\s+number|inventory\s+record)\s*:|\b(?:WH\d+|[A-Z]\d{2})\b|\b(?:credentials?|api\s*keys?|secrets?|passwords?)\b|\btokens?\b(?!\.css\b))/iu;
export const warehouseSvgReferencePattern = /\.svg\b/i;

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
    assert.doesNotMatch(entry.content, warehouseDisclosurePattern, `${entryPath} must not disclose restricted warehouse counts`);
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
