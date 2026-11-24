import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFrame, composite, createFx, layout, HEADINGS, STEP } from 'grittyfx';

const pal = new Uint8Array(256 * 4);
pal.set([200, 100, 0, 255], 4); // index 1
pal.set([0, 0, 255, 255], 8); // index 2

test('composite: color over a background, light added on top', () => {
  const f = createFrame(1, 1);
  f.color.set([1, 128]);
  f.light.set([2, 51]);
  const ca = 128 / 255, lk = 51 / 255;
  const [r, g, b, a] = composite(f, pal, undefined, [10, 20, 30]);
  assert.equal(r, Math.round(200 * ca + 10 * (1 - ca)));
  assert.equal(g, Math.round(100 * ca + 20 * (1 - ca)));
  assert.equal(b, Math.round(255 * lk + 30 * (1 - ca)));
  assert.equal(a, 255);
  const [, , b2] = composite(f, pal, undefined, [10, 20, 30], 2);
  assert.equal(b2, Math.round(255 * lk * 2 + 30 * (1 - ca)));
});

test('composite over a background image: each pixel over its own', () => {
  const f = createFrame(2, 1);
  f.color.set([1, 255, 0, 0]);
  assert.deepEqual([...composite(f, pal, undefined, [1, 2, 3, 255, 4, 5, 6, 255])], [200, 100, 0, 255, 4, 5, 6, 255]);
});

test('composite without a background: straight alpha, light alone becomes color with alpha', () => {
  const f = createFrame(2, 1);
  f.color.set([1, 255, 0, 0]);
  f.light.set([0, 0, 2, 102]);
  assert.deepEqual([...composite(f, pal)], [200, 100, 0, 255, 0, 0, 255, 102]);
});

const sim = {
  meta: { duration: 1, loop: false, options: { seed: 1 } },
  create: () => ({ n: 0, update(dt) { assert.equal(dt, STEP); this.n++; }, draw(p) { p.n = this.n; } }),
};

test('simulations step at 120 Hz whatever the frame rate', () => {
  for (const fps of [30, 60, 7, 144]) {
    const fx = createFx(sim);
    for (let i = 0; i < fps; i++) fx.update(1 / fps);
    assert.equal(fx.draw(createFrame(1, 1)).n, 120, `${fps} fps`);
  }
});

test('a one-shot is done at its duration; a stopped loop fades out over 0.3 s', () => {
  const shot = createFx(sim);
  shot.update(0.99);
  assert.equal(shot.done(), false);
  shot.update(0.01);
  assert.equal(shot.done(), true);

  const seen = [];
  const loop = createFx({ meta: { duration: 0.5, loop: true, options: {} }, draw: (p, t) => seen.push([t, p.fade]) });
  loop.update(0.7);
  loop.draw(createFrame(1, 1));
  loop.stop();
  loop.update(0.15);
  loop.draw(createFrame(1, 1));
  assert.ok(Math.abs(seen[0][0] - 0.2) < 1e-9, 'loops see t wrapped to their duration');
  assert.equal(seen[0][1], 1);
  assert.ok(Math.abs(seen[1][1] - 0.5) < 1e-9);
  assert.equal(loop.done(), false);
  loop.update(0.15);
  assert.equal(loop.done(), true);
});

test('ramps from meta.ramps become palette indices; options override them', () => {
  const mod = { meta: { duration: 1, loop: true, ramps: { palette: 4, smoke: 3 }, options: { palette: 'fire', smoke: 'smoke' } } };
  const fx = createFx(mod, { palette: 'ice' });
  assert.deepEqual(fx.o.palette, [1, 2, 3, 4]);
  assert.deepEqual(fx.o.smoke, [5, 6, 7]);
  assert.deepEqual(fx.ramps.map(r => r.name), ['palette', 'smoke']);
  assert.deepEqual([...fx.palette.subarray(4, 7)], [0x0c, 0x14, 0x28]); // ice's darkest
});

test('layout: side is meta.size; top is meta.top, or a square that holds the side canvas at any heading', () => {
  const meta = { size: [50, 28], origin: [36, 14] };
  assert.deepEqual(layout(meta), { size: [50, 28], origin: [36, 14], directions: 1 });
  assert.deepEqual(layout({ ...meta, top: { size: [40, 30] } }, 'top'), { size: [40, 30], origin: [20, 15], directions: 1 });
  const { size: [w, h], origin: [ox, oy], directions } = layout({ ...meta, top: { directions: 8 } }, 'top');
  assert.deepEqual([w, h, ox, oy, directions], [74, 74, 37, 37, 8]);
  // the whole side canvas, filled, stays inside the top one at every heading
  const fx = createFx({ meta: { ...meta, duration: 1, options: {} }, draw: (p, t, o) => p.shade(-36, -14, 50, 28, 1) }, { view: 'top' });
  assert.equal(fx.o.view, 'top');
  for (let d = 0; d < 8; d++) {
    fx.angle = (d * Math.PI) / 4;
    const p = fx.draw(createFrame(w, h, ox, oy));
    assert.equal(p.outside, 0, HEADINGS[d]);
  }
});
