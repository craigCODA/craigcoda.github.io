import { execFile } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  hasUnapprovedWarehouseClaim,
  publicSensitiveDetailPattern,
  warehouseInternalLabelPattern,
  warehouseSvgReferencePattern
} from './public-output-boundaries.mjs';

const execFileAsync = promisify(execFile);

const exactClassifications = new Map([
  ['.gitattributes', 'development'],
  ['.gitignore', 'development'],
  ['.nojekyll', 'runtime'],
  ['.well-known/assetlinks.json', 'runtime'],
  ['404.html', 'runtime'],
  ['README.md', 'development'],
  ['index.html', 'runtime'],
  ['package-lock.json', 'development'],
  ['package.json', 'development'],
  ['playwright.config.mjs', 'development']
]);

const prefixClassifications = [
  [/^\.github\/workflows\/[^/]+\.ya?ml$/, 'development'],
  [/^assets\/css\/(?:[^/]+\/)*[^/]+\.css$/, 'runtime'],
  [/^assets\/evidence\/(?:[^/]+\/)*[^/]+$/, 'runtime'],
  [/^assets\/js\/(?:[^/]+\/)*[^/]+\.js$/, 'runtime'],
  [/^docs\/superpowers\/plans\/[^/]+\.md$/, 'development'],
  [/^projects\/[^/]+\/index\.html$/, 'runtime'],
  [/^scripts\/[^/]+\.mjs$/, 'development'],
  [/^test\/(?:[^/]+\/)*[^/]+\.mjs$/, 'development']
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.yaml', '.yml']);
const extensionlessTextPaths = new Set(['.gitattributes', '.gitignore', '.nojekyll']);
const safeExtensions = {
  development: new Set(['.json', '.md', '.mjs', '.yaml', '.yml']),
  runtime: new Set(['.avif', '.css', '.html', '.jpeg', '.jpg', '.js', '.json', '.png', '.webp'])
};
const developmentSensitiveDetailPattern = /(?:\braw\s+(?:sap(?:\s+(?:records?|data))?|records?|data)\b|\bconfidential(?:\s+|:\s*)(?:roster|data)\b|\bfacility(?:\s+|:\s*)(?:address|identifier|label)\b|\binternal\s+(?:bin(?:\s+(?:id|identifier))?|label|record)\b|\b(?:operator|employee|personnel)(?:\s+|:\s*)(?:name|e-?mail|id)\b|\b(?:material\s+number|inventory\s+record)(?:\s*:\s*\S|\s+\S))/iu;
const warehouseDisclosureIdentifierSource = String.raw`(?:deprecated|historical|restricted|excluded|internal)[\p{L}\p{N}_]*(?:warehouse|pallet|position|bin|facility|label|map)[\p{L}\p{N}_]*`;
const developmentWarehouseReconstructionPattern = new RegExp(
  String.raw`\b(?:const|let|var)\s+${warehouseDisclosureIdentifierSource}\s*=\s*[^;\r\n]*(?:\d[\d_]*\s*[+*/-]\s*\d|\.(?:join|padStart)\s*\()`,
  'iu'
);
const sensitiveIdentifierSource = String.raw`(?:api[\s_-]*keys?|credentials?|secrets?|passwords?|tokens?|[\p{L}\p{N}_-]+(?:api[\s_-]*key|credential|secret|password|token)|client[\s_-]*secrets?|access[\s_-]*tokens?|db[\s_-]*passwords?|service[\s_-]*credentials?)`;
const developmentSecretAssignmentPatterns = [
  new RegExp(String.raw`(?<![\p{L}\p{N}_-])${sensitiveIdentifierSource}(?![\p{L}\p{N}_-])[\t ]*=[\t ]*`, 'gimu'),
  new RegExp(String.raw`(?:^|[\r\n{,])[\t ]*["']?${sensitiveIdentifierSource}["']?[\t ]*:[\t ]*`, 'gimu')
];
const obviousPlaceholderValuePattern = /^(?<quote>["'])?__[A-Z\d_]+__\k<quote>$/u;
const obviousEnvironmentReferencePattern = /^process\.env\.[A-Z_][A-Z\d_]*$/iu;
const obviousTemplateReferencePattern = /^(?:\$\{[A-Z_][A-Z\d_]*\}|\$\{\{\s*secrets\.[A-Z_][A-Z\d_]*\s*\}\})$/iu;
const trailingReferenceCommentPattern = /(?:[\t ]*\/\/.*|[\t ]+#.*)$/u;

function normalizedPath(relativePath) {
  return relativePath.replaceAll('\\', '/');
}

function classifyTrackedPath(relativePath) {
  const normalized = normalizedPath(relativePath);
  const exact = exactClassifications.get(normalized);
  if (exact) return exact;
  return prefixClassifications.find(([pattern]) => pattern.test(normalized))?.[1];
}

function fail(relativePath, rule) {
  throw new Error(`${normalizedPath(relativePath)}: ${rule}`);
}

function assignedExpression(content, start) {
  let braceDepth = 0;
  let escaped = false;
  let quote = '';
  let end = start;

  for (; end < content.length; end += 1) {
    const character = content[end];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '{') {
      braceDepth += 1;
    } else if (character === '}') {
      if (braceDepth === 0) break;
      braceDepth -= 1;
    } else if (braceDepth === 0 && (character === ',' || character === ';' || character === '\r' || character === '\n')) {
      break;
    }
  }

  return content.slice(start, end).trim();
}

function hasDevelopmentSecretAssignment(content) {
  for (const pattern of developmentSecretAssignmentPatterns) {
    for (const match of content.matchAll(pattern)) {
      const value = assignedExpression(content, match.index + match[0].length);
      if (!value) continue;
      if (obviousPlaceholderValuePattern.test(value)) continue;
      const referenceValue = value.replace(trailingReferenceCommentPattern, '').trimEnd();
      const quote = referenceValue[0];
      const unquoted = (quote === '"' || quote === "'") && referenceValue.at(-1) === quote
        ? referenceValue.slice(1, -1)
        : referenceValue;
      if (obviousTemplateReferencePattern.test(unquoted)) continue;
      if (unquoted === referenceValue && obviousEnvironmentReferencePattern.test(referenceValue)) continue;
      return true;
    }
  }
  return false;
}

function assertTextBoundaries(relativePath, content, classification) {
  if (hasUnapprovedWarehouseClaim(content)) fail(relativePath, 'restricted warehouse counts');
  const sensitivePattern = classification === 'runtime' ? publicSensitiveDetailPattern : developmentSensitiveDetailPattern;
  if (sensitivePattern.test(content) || warehouseInternalLabelPattern.test(content)) {
    fail(relativePath, 'sensitive warehouse details');
  }
  if (classification === 'development' && hasDevelopmentSecretAssignment(content)) {
    fail(relativePath, 'sensitive credential assignment');
  }
  if (classification === 'development' && developmentWarehouseReconstructionPattern.test(content)) {
    fail(relativePath, 'warehouse disclosure reconstruction');
  }
  if (classification === 'runtime' && relativePath.toLowerCase().includes('warehouse') && warehouseSvgReferencePattern.test(content)) {
    fail(relativePath, 'warehouse SVG reference');
  }
}

async function trackedPaths(root) {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 }
  );
  return stdout.toString('utf8').split('\0').filter(Boolean).map(normalizedPath).sort();
}

export async function auditPagesSource(sourceRoot) {
  const root = path.resolve(sourceRoot);
  const paths = await trackedPaths(root);
  const counts = { development: 0, runtime: 0 };
  for (const relativePath of paths) {
    const classification = classifyTrackedPath(relativePath);
    if (!classification) fail(relativePath, 'tracked path is not classified for legacy Pages');
    const extension = path.extname(relativePath).toLowerCase();
    if (!extensionlessTextPaths.has(relativePath) && !safeExtensions[classification].has(extension)) {
      fail(relativePath, 'unsafe file type for legacy Pages');
    }
    const file = path.join(root, relativePath);
    const fileStat = await lstat(file);
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) fail(relativePath, 'tracked path must be a regular file');
    if (extensionlessTextPaths.has(relativePath) || textExtensions.has(extension)) {
      const content = await readFile(file, 'utf8');
      if (content.includes('\0')) fail(relativePath, 'classified text file contains binary data');
      assertTextBoundaries(relativePath, content, classification);
    }
    counts[classification] += 1;
  }
  return { counts, fileCount: paths.length };
}

const invokedPath = process.argv[1] && path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const summary = await auditPagesSource(process.argv[2] ?? '.');
    console.log(`Pages source audit passed: ${summary.fileCount} tracked files (${summary.counts.runtime} runtime, ${summary.counts.development} development).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
