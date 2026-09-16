import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEPLOY_ENTRIES } from './site-files.mjs';
import { auditPublicOutput } from './audit-public-output.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const dist = path.resolve(root, 'dist');

if (dist !== path.join(root, 'dist')) {
  throw new Error('refusing to build outside the repository dist directory');
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all(DEPLOY_ENTRIES.map((entry) => cp(path.join(root, entry), path.join(dist, entry), { recursive: true })));
const summary = await auditPublicOutput(dist);
console.log(`Built ${summary.routeCount} routes, ${summary.assetCount} assets, ${summary.bytes} bytes.`);
