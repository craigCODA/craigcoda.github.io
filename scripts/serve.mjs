import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const [rootArgument = 'dist'] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag === -1 ? 4173 : process.argv[portFlag + 1]);
const root = path.resolve(rootArgument);
const mimeTypes = {
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function outputFile(response, file, status = 200) {
  response.writeHead(status, { 'content-type': mimeTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}

http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    await access(file);
    outputFile(response, file);
  } catch {
    const fallback = path.join(root, '404.html');
    try {
      await access(fallback);
      outputFile(response, fallback, 404);
    } catch {
      response.writeHead(404).end('Not found');
    }
  }
}).listen(port, '127.0.0.1', () => console.log(`Previewing ${root} at http://127.0.0.1:${port}`));
