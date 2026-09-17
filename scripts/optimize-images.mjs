import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const provenancePath = path.join(repositoryRoot, 'assets', 'evidence', 'provenance.json');
const diagramKinds = new Set(['diagram', 'document']);

function resolveRepositoryPath(relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) {
    throw new Error(`Expected a repository-relative path, received ${relativePath}`);
  }

  const resolvedPath = path.resolve(repositoryRoot, relativePath);
  const relative = path.relative(repositoryRoot, resolvedPath);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes the repository root: ${relativePath}`);
  }

  return resolvedPath;
}

async function assertNonEmpty(filePath) {
  const file = await stat(filePath);
  if (file.size === 0) throw new Error(`Generated an empty image: ${filePath}`);
}

export async function buildVariants({ inputPath, outputStem, widths, kind }) {
  const metadata = await sharp(inputPath).metadata();
  if (!metadata.width) throw new Error(`Could not determine source width: ${inputPath}`);

  await mkdir(path.dirname(outputStem), { recursive: true });
  for (const width of widths) {
    if (width > metadata.width) throw new Error(`Refusing to upscale ${inputPath}`);
    const pipeline = sharp(inputPath).rotate().resize({ width, withoutEnlargement: true });
    const avifPath = `${outputStem}-${width}w.avif`;
    const webpPath = `${outputStem}-${width}w.webp`;
    const quality = diagramKinds.has(kind) ? { avif: 65, webp: 90 } : { avif: 52, webp: 78 };

    await pipeline.clone().avif({ quality: quality.avif }).toFile(avifPath);
    await pipeline.clone().webp({ quality: quality.webp }).toFile(webpPath);
    await assertNonEmpty(avifPath);
    await assertNonEmpty(webpPath);
  }
}

async function optimizeImages() {
  const records = JSON.parse(await readFile(provenancePath, 'utf8'));
  for (const record of records) {
    const inputPath = resolveRepositoryPath(record.original);
    const outputStem = resolveRepositoryPath(record.outputStem);
    const metadata = await sharp(inputPath).metadata();
    if (metadata.width !== record.sourceWidth || metadata.height !== record.sourceHeight) {
      throw new Error(`Source dimensions do not match provenance: ${record.original}`);
    }
    await buildVariants({ inputPath, outputStem, widths: record.widths, kind: record.kind });
  }
}

await optimizeImages();
