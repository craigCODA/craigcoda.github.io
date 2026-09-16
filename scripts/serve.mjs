import { createReadStream } from 'node:fs';
import { access, realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const [rootArgument = 'dist'] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag === -1 ? 4173 : process.argv[portFlag + 1]);
const root = await realpath(path.resolve(rootArgument));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be an integer from 1 through 65535');
const mimeTypes = {
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function outputFile(response, file, status = 200) {
  response.writeHead(status, { 'content-type': mimeTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}

async function containedFile(candidate) {
  const resolved = await realpath(candidate);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('escape');
  if (!(await stat(resolved)).isFile()) throw new Error('not-file');
  return resolved;
}

http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = path.resolve(root, `.${relative}`);
  const withinRoot = path.relative(root, file);
  if (withinRoot.startsWith('..') || path.isAbsolute(withinRoot)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    outputFile(response, await containedFile(file));
  } catch (error) {
    if (error.message === 'escape') { response.writeHead(403).end('Forbidden'); return; }
    const fallback = path.join(root, '404.html');
    try {
      await access(fallback);
      outputFile(response, await containedFile(fallback), 404);
    } catch {
      response.writeHead(404).end('Not found');
    }
  }
}).listen(port, '127.0.0.1', () => console.log(`Previewing ${root} at http://127.0.0.1:${port}`));
