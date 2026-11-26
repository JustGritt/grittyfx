// node tools/serve.mjs [--port N]: serves the repo read-only on 127.0.0.1 for the gallery, with gallery/fx-list.json
// built from the effects on each request. A port in use moves it to the next free one (8000 by default).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { ROOT, listIds, manifest } from './lib.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.wav': 'audio/wav',
};

async function handle(req, res) {
  const send = (status, body, type = 'text/plain; charset=utf-8', headers = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-cache', ...headers });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'read-only\n', undefined, { allow: 'GET, HEAD' });
  const url = new URL(req.url, 'http://localhost');
  let path;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return send(400, 'bad path\n');
  }
  if (path === '/') return send(302, '', undefined, { location: '/gallery/' });
  if (path === '/gallery/fx-list.json') {
    // A broken effect fails the whole manifest (and Node keeps a failed import until restart), so fall back to ids:
    // the gallery imports each effect itself and shows the error on its card.
    const list = await manifest().catch(() => listIds().map(id => ({ id })));
    return send(200, JSON.stringify(list), TYPES['.json']);
  }
  let file = resolve(ROOT, `.${path}`);
  const rel = relative(ROOT, file);
  // Nothing outside the repo, and no dot paths (.git, .env): an encoded ..%2f or ..%5c lands here too.
  if (isAbsolute(rel) || rel.split(sep).some(s => s.startsWith('.'))) return send(403, 'forbidden\n');
  try {
    if ((await stat(file)).isDirectory()) {
      if (!path.endsWith('/')) return send(301, '', undefined, { location: `${url.pathname}/${url.search}` });
      file = join(file, 'index.html');
    }
    return send(200, await readFile(file), TYPES[extname(file)] ?? 'application/octet-stream');
  } catch {
    return send(404, 'not found\n');
  }
}

/** A read-only server for the repo on 127.0.0.1 (port 0 picks a free one). */
export function serve(port = 8000) {
  return createServer((req, res) => handle(req, res).catch(e => {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`${e.stack}\n`);
  })).listen(port, '127.0.0.1');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values: a } = parseArgs({ options: { port: { type: 'string', default: '8000' } } });
  let port = Number(a.port);
  const server = serve(port);
  server.on('listening', () => console.log(`http://127.0.0.1:${server.address().port}/gallery/`));
  server.on('error', e => {
    if (e.code === 'EADDRINUSE' && port < 65535) {
      console.error(`serve: port ${port} is in use, trying ${port + 1}`);
      return server.listen(++port, '127.0.0.1'); // taken: the next one up, as vite does
    }
    console.error(`serve: ${e.message}`);
    process.exitCode = 1;
  });
}
