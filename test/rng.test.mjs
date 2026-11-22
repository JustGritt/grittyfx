import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng, rand } from '../src/core/rng.js';
import { noise2, fbm, loopNoise, tileFbm } from '../src/core/noise.js';

test('same seed, same sequence; different seed, different sequence', () => {
  const seq = seed => { const r = new Rng(seed); return Array.from({ length: 20 }, () => r.next()); };
  assert.deepEqual(seq(7), seq(7));
  assert.notDeepEqual(seq(7), seq(8));
  assert.ok(seq(1).every(v => v >= 0 && v < 1));
});

test('int covers both ends', () => {
  const r = new Rng(3), seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(r.int(2, 4));
  assert.deepEqual([...seen].sort(), [2, 3, 4]);
});

test('rand is stateless', () => {
  assert.equal(rand(5, 2), rand(5, 2));
  assert.notEqual(rand(5, 2), rand(6, 2));
});

test('noise stays in [0, 1]', () => {
  for (let i = 0; i < 500; i++) {
    const x = i * 0.37 - 50, y = i * 0.11;
    for (const v of [noise2(x, y), fbm(x, y), loopNoise(x, y, 4), tileFbm(x, y, 16)]) assert.ok(v >= 0 && v <= 1, v);
  }
});

test('loopNoise matches at t = 0 and t = period', () => {
  for (const x of [0, 1.3, 7.9]) for (const p of [1, 3, 4.5]) assert.equal(loopNoise(x, 0, p, 2), loopNoise(x, p, p, 2));
});

test('tileFbm tiles in x', () => {
  for (const x of [0, 2.4, 11.1]) assert.ok(Math.abs(tileFbm(x, 3.3, 16) - tileFbm(x + 16, 3.3, 16)) < 1e-9);
});
