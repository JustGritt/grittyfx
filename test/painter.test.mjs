import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Painter } from '../src/core/painter.js';
import { createFrame } from '../src/core/fx.js';

const O = 8; // anchor in the middle of a 16 x 16 frame
const fresh = () => new Painter(createFrame(16, 16, O, O));
// The written cells relative to the anchor, as sorted "x,y" strings.
const cells = p => {
  const out = [];
  for (let i = 0; i < p.frame.w * p.frame.h; i++) if (p.frame.color[i * 2 + 1]) out.push(`${(i % 16) - O},${Math.floor(i / 16) - O}`);
  return out.sort();
};
const L = [[0, 0], [1, 0], [2, 0], [0, 1]]; // an asymmetric shape
const map = (pts, fn) => pts.map(([x, y]) => fn(x, y).join()).sort();

test('flips and 90-degree turns map cells to whole cells, pixels and shapes alike', () => {
  const cases = [
    [false, 0, (x, y) => [x, y]],
    [true, 0, (x, y) => [-x - 1, y]],
    [false, Math.PI / 2, (x, y) => [-y - 1, x]],
    [false, Math.PI, (x, y) => [-x - 1, -y - 1]],
    [true, Math.PI / 2, (x, y) => [-y - 1, -x - 1]],
  ];
  for (const [flip, angle, fn] of cases) {
    const a = fresh().place(O, O, flip, angle);
    for (const [x, y] of L) a.px(x, y, 1);
    assert.deepEqual(cells(a), map(L, fn), `px flip=${flip} angle=${angle}`);
    const b = fresh().place(O, O, flip, angle);
    b.shade(0, 0, 3, 2, 1, (x, y) => (y === 0 || x === 0 ? 1 : 0));
    assert.deepEqual(cells(b), map(L, fn), `shade flip=${flip} angle=${angle}`);
  }
});

test('a line turned 45 degrees is a clean diagonal', () => {
  const p = fresh().place(O, O, false, Math.PI / 4);
  p.line(0, 0, 9, 0, 1);
  const c = cells(p).map(s => s.split(',').map(Number));
  assert.ok(c.length >= 6);
  assert.ok(c.every(([x, y]) => x === y), c.join(' '));
});

test('shade turned 45 degrees samples the exact position, like the shapes do, so no pixel doubles', () => {
  const a = fresh().place(O, O, false, Math.PI / 4), b = fresh().place(O, O, false, Math.PI / 4);
  a.circle(0, 0, 5, 1);
  b.shade(-6, -6, 12, 12, (x, y) => (Math.hypot(x + 0.5, y + 0.5) <= 5 ? 1 : 0));
  assert.deepEqual(cells(b), cells(a));
});

test('dot dithers: half alpha over a 4 x 4 block lights half the cells', () => {
  const p = fresh();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p.dot(x, y, 1, 0.5);
  assert.equal(cells(p).length, 8);
});

test('writes outside the frame are ignored and counted', () => {
  const p = fresh();
  p.px(40, 0, 1);
  p.circle(O, 0, 3, 1); // centered on the right edge: 32 cells, half of them outside
  assert.equal(p.outside, 1 + 16);
  assert.equal(cells(p).length, 16);
});

test('color 0 draws nothing and never erases; a non-index is counted, not written', () => {
  const p = fresh();
  p.px(0, 0, 5);
  p.px(0, 0, 0);
  p.blend(0, 0, 0, 1);
  assert.equal(p.frame.color[(O * 16 + O) * 2], 5);
  p.px(1, 0, 0xff8800);
  p.px(2, 0, 2.5);
  assert.equal(p.bad, 2);
  assert.deepEqual(cells(p), ['0,0']);
});

test('blend keeps the dominant index; light keeps the brighter index and adds up', () => {
  const p = fresh(), i = (O * 16 + O) * 2;
  p.blend(0, 0, 1, 0.9);
  p.blend(0, 0, 2, 0.1);
  assert.equal(p.frame.color[i], 1);
  assert.ok(Math.abs(p.frame.color[i + 1] - 0.91 * 255) <= 1); // bytes round at each write
  p.blend(0, 0, 3, 0.6);
  assert.equal(p.frame.color[i], 3);
  p.light(0, 0, 1, 0.3);
  p.light(0, 0, 2, 0.5);
  assert.equal(p.frame.light[i], 2);
  assert.ok(Math.abs(p.frame.light[i + 1] - 0.8 * 255) <= 1);
});

test('fade and lightK scale what is written', () => {
  const p = fresh(), i = (O * 16 + O) * 2;
  p.fade = 0.5;
  p.lightK = 0.5;
  p.blend(0, 0, 1, 1);
  p.light(0, 0, 1, 1);
  assert.equal(p.frame.color[i + 1], 128);
  assert.equal(p.frame.light[i + 1], 64);
});

test('shapes take the pixels whose centers are inside', () => {
  const even = fresh(), odd = fresh();
  even.circle(0, 0, 2, 1);
  odd.circle(0.5, 0.5, 2.5, 1);
  assert.equal(cells(even).length, 12); // 4 x 4 minus the corners
  assert.equal(cells(odd).length, 21); // 5 x 5 minus the corners
});
