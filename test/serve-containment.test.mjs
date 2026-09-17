import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function startServer(root) {
  const port = 43000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['scripts/serve.mjs', root, '--port', String(port)], { cwd: process.cwd() });
  await new Promise((resolve, reject) => {
    child.stdout.on('data', resolve);
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`preview exited ${code}`)));
  });
  return { child, port };
}

async function assertEscape(context, linkType) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-preview-root-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'portfolio-preview-outside-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  context.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(root, 'index.html'), 'safe');
  await writeFile(path.join(root, '404.html'), 'missing');
  await writeFile(path.join(outside, 'secret.txt'), 'outside');
  const escape = path.join(root, 'escape');
  try {
    await symlink(outside, escape, linkType);
  } catch (error) {
    context.skip(`${process.platform} link creation unavailable: ${error.code}`);
    return;
  }
  const { child, port } = await startServer(root);
  context.after(() => child.kill());
  const response = await fetch(`http://127.0.0.1:${port}/escape/secret.txt`);
  assert.equal(response.status, 403, `${process.platform} ${linkType} escape must be forbidden`);
  assert.notEqual(await response.text(), 'outside');
}

test('POSIX preview rejects a directory-symlink escape', async (context) => {
  if (process.platform === 'win32') return context.skip('POSIX symlink test skipped on Windows; Windows junction test provides local containment evidence');
  await assertEscape(context, 'dir');
});

test('Windows preview rejects a junction/reparse escape', async (context) => {
  if (process.platform !== 'win32') return context.skip('Windows junction test skipped on POSIX');
  await assertEscape(context, 'junction');
});
