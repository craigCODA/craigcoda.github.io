import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { DEPLOY_ENTRIES } from './site-files.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = fileURLToPath(new URL('../dist/', import.meta.url));

if (!dist.startsWith(root) || dist !== `${root}dist${process.platform === 'win32' ? '\\' : '/'}`) {
  throw new Error('refusing to build outside the repository dist directory');
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all(DEPLOY_ENTRIES.map((entry) => cp(`${root}${entry}`, `${dist}${entry}`, { recursive: true })));
console.log(`Built ${DEPLOY_ENTRIES.length} deploy entries in dist.`);
