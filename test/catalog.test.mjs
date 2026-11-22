import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { catalog } from '../tools/catalog.mjs';
import { listIds } from '../tools/lib.mjs';

test('the catalog is stable and lists every effect under its category', async () => {
  const md = await catalog();
  assert.equal(await catalog(), md);
  for (const id of listIds()) {
    const heading = md.indexOf(`## ${id.split('/')[0]}\n`);
    assert.ok(heading >= 0 && heading < md.indexOf(`| \`${id}\` |`), id);
  }
});

test('the committed docs/CATALOG.md is up to date (--check)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/catalog.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
