import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hex, fit, ramp, paletteTable, PAL } from '../src/core/color.js';

test('hex parses short, long and alpha forms', () => {
  assert.deepEqual(hex('#f80'), [255, 136, 0, 255]);
  assert.deepEqual(hex('#ff8800'), [255, 136, 0, 255]);
  assert.deepEqual(hex('#ff880080'), [255, 136, 0, 128]);
  assert.throws(() => hex('red'), /not a color/);
});

test('fit keeps both ends, down and up, and turns bright-to-dark ramps around', () => {
  const r = ramp('fire');
  for (const n of [2, 5, 8, 13]) {
    const f = fit('fire', n);
    assert.equal(f.length, n);
    assert.deepEqual(f[0], r[0]);
    assert.deepEqual(f[n - 1], r[r.length - 1]);
  }
  assert.ok(fit('fire', 5).every(c => r.some(o => o.join() === c.join())), 'fewer steps pick existing colors');
  assert.deepEqual(fit([...PAL.ice].reverse(), 8), ramp('ice'));
});

test('palette table: palette first from index 1, stable, 255 entries at most', () => {
  const a = paletteTable({ smoke: fit('smoke', 5), palette: fit('fire', 8) });
  assert.deepEqual(a.ramps, [{ name: 'palette', from: 1, steps: 8 }, { name: 'smoke', from: 9, steps: 5 }]);
  assert.deepEqual(a.index.smoke, [9, 10, 11, 12, 13]);
  assert.deepEqual([...a.table.subarray(0, 4)], [0, 0, 0, 0]);
  assert.deepEqual([...a.table.subarray(4, 8)], ramp('fire')[0]);
  assert.deepEqual(paletteTable({ smoke: fit('smoke', 5), palette: fit('fire', 8) }), a);
  assert.throws(() => paletteTable({ palette: fit('fire', 200), smoke: fit('smoke', 56) }), /table holds 255/);
});
