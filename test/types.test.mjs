import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listIds, loadEffect } from '../tools/lib.mjs';

// The values a .d.ts declares (functions, consts, classes), to compare with what the JS exports.
const declared = f => [...readFileSync(new URL(f, import.meta.url), 'utf8').matchAll(/^export (?:declare )?(?:function|const|class) (\w+)/gm)].map(m => m[1]).sort();

test('the .d.ts files declare exactly what the modules export', async () => {
  assert.deepEqual(declared('../src/core/index.d.ts'), Object.keys(await import('../src/core/index.js')).sort());
  assert.deepEqual(declared('../runtime/sheet-player.d.ts'), Object.keys(await import('../runtime/sheet-player.js')).sort());
  const effect = declared('../src/core/effect.d.ts');
  for (const id of listIds()) for (const name of Object.keys(await loadEffect(id))) assert.ok(effect.includes(name), `${id} exports ${name}`);
});
