import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { listIds } from '../tools/lib.mjs';

test('serves the repo read-only with module types and the manifest, and refuses traversal', async () => {
  const server = serve(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const js = await fetch(`${base}/src/core/index.js`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /^text\/javascript/);
    assert.match(await js.text(), /export \* from '\.\/fx\.js'/);

    for (const path of ['/src/..%2f..%2fLICENSE', '/..%5c..%5cLICENSE', '/.git/HEAD']) {
      assert.equal((await fetch(base + path)).status, 403, path);
    }
    assert.equal((await fetch(`${base}/package.json`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/nope.js`)).status, 404);

    const list = await fetch(`${base}/gallery/fx-list.json`);
    assert.match(list.headers.get('content-type'), /^application\/json/);
    const entries = await list.json();
    assert.deepEqual(entries.map(e => e.id), listIds());
    for (const { meta } of entries) assert.ok(meta.name && meta.size && meta.duration > 0);
  } finally {
    server.close();
    server.closeAllConnections();
  }
});

test('moves to the next port when the one asked for is taken', async () => {
  const taken = serve(0);
  await once(taken, 'listening');
  const port = taken.address().port;
  const child = spawn(process.execPath, [fileURLToPath(new URL('../tools/serve.mjs', import.meta.url)), '--port', String(port)]);
  try {
    const [line] = await once(child.stdout, 'data');
    const url = new URL(String(line).trim());
    assert.ok(Number(url.port) > port, String(line));
    assert.equal((await fetch(url)).status, 200);
  } finally {
    child.kill();
    taken.close();
  }
});
