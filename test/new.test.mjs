import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { template } from '../tools/new.mjs';
import { checkEffect } from '../tools/check.mjs';

const core = new URL('../src/core/index.js', import.meta.url).href;

test('both templates pass check.mjs as generated', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'grittyfx-'));
  try {
    for (const loop of [false, true]) {
      const src = template('test/new-thing', loop), file = join(dir, `${loop}.mjs`);
      writeFileSync(file, src.replace("'../../core/index.js'", JSON.stringify(core)));
      const mod = await import(pathToFileURL(file).href);
      assert.equal(mod.meta.name, 'New thing');
      assert.deepEqual(checkEffect(`test/${loop ? 'loop' : 'one-shot'}`, mod, src), []);
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});
