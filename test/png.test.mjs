import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePng, decodePng } from '../tools/png.mjs';

test('PNG round-trip keeps every byte', () => {
  const w = 5, h = 3;
  const rgba = Uint8Array.from({ length: w * h * 4 }, (_, i) => (i * 37) & 255);
  const png = encodePng(w, h, rgba);
  assert.deepEqual(png.subarray(1, 4).toString(), 'PNG');
  const out = decodePng(png);
  assert.equal(out.w, w);
  assert.equal(out.h, h);
  assert.deepEqual(out.rgba, rgba);
});

test('encodePng rejects a buffer of the wrong size', () => {
  assert.throws(() => encodePng(2, 2, new Uint8Array(15)), /expected 16 bytes/);
});

test('decodePng catches a corrupted chunk', () => {
  const png = encodePng(1, 1, new Uint8Array(4));
  png[20] ^= 1; // inside IHDR
  assert.throws(() => decodePng(png), /bad CRC/);
});
