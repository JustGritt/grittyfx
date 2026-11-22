import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composite } from 'grittyfx';
import { makeBundle, renderFrames } from '../tools/lib.mjs';
import { decodePng } from '../tools/png.mjs';

const mod = {
  meta: {
    size: [8, 6], origin: [4, 5], duration: 0.3, fps: 30, loop: false,
    ramps: { palette: 4, smoke: 3 }, options: { palette: 'fire', smoke: 'smoke', seed: 1 },
    act: { windup: 0.1, hits: [{ t: 0.066, freeze: 0.08, shake: 2 }] },
  },
  draw(p, t, o) {
    const u = t / 0.3;
    p.disc(0, -2, 3 * (1 - u), o.smoke[1], 0.6);
    p.px(Math.round(u * 3), -1, o.palette[3]);
    p.glow(0, -2, 4, o.palette[2], 1 - u);
  },
};

test('bundle JSON: Aseprite array layout plus meta.grittyfx', () => {
  const { json, files } = makeBundle('test/blob', mod);
  assert.equal(json.frames.length, 9);
  assert.deepEqual(json.frames.map(f => f.filename), ['0', '1', '2', '3', '4', '5', '6', '7', '8']);
  assert.deepEqual(json.frames[1].frame, { x: 8, y: 0, w: 8, h: 6 });
  assert.equal(json.frames[0].duration, 33);
  assert.deepEqual(json.frames[8].frame, { x: 0, y: 6, w: 8, h: 6 });
  assert.deepEqual(json.meta.size, { w: 64, h: 12 });
  assert.equal(json.meta.image, 'blob.png');
  assert.deepEqual(json.meta.frameTags, [{ name: 'blob', from: 0, to: 8, direction: 'forward' }]);
  const g = json.meta.grittyfx;
  assert.deepEqual(
    { id: g.id, fps: g.fps, frames: g.frames, frameSize: g.frameSize, columns: g.columns, pivot: g.pivot, loop: g.loop, end: g.end },
    { id: 'test/blob', fps: 30, frames: 9, frameSize: [8, 6], columns: 8, pivot: [4, 5], loop: false, end: 'remove' },
  );
  assert.deepEqual(g.ramps, [{ name: 'palette', from: 1, steps: 4 }, { name: 'smoke', from: 5, steps: 3 }]);
  assert.deepEqual(g.act.hits, [{ frame: 2, t: 0.066, freeze: 0.08, shake: 2 }]);
  assert.deepEqual([g.data, g.palette, g.sheet], [files.data, files.palette, files.sheet]);
});

test('decoding the data sheet through the palette gives the same pixels as composite', () => {
  const { png, json } = makeBundle('test/blob', mod);
  const { frames, fx } = renderFrames(mod);
  const data = decodePng(png.data), pal = decodePng(png.palette), sheet = decodePng(png.sheet);
  assert.deepEqual(pal.rgba, fx.palette);
  frames.forEach((f, i) => {
    const { x, y, w, h } = json.frames[i].frame, frame = { w, h, color: new Uint8Array(w * h * 2), light: new Uint8Array(w * h * 2) };
    const baked = new Uint8Array(w * h * 4);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const s = ((y + r) * data.w + x + c) * 4, d = r * w + c;
        frame.color.set([data.rgba[s], data.rgba[s + 1]], d * 2);
        frame.light.set([data.rgba[s + 2], data.rgba[s + 3]], d * 2);
        baked.set(sheet.rgba.subarray(s, s + 4), d * 4);
      }
    }
    const want = composite(f, fx.palette, new Uint8Array(w * h * 4));
    assert.deepEqual(composite(frame, pal.rgba, new Uint8Array(w * h * 4)), want, `frame ${i} from the data sheet`);
    assert.deepEqual(baked, want, `frame ${i} baked`);
  });
  assert.ok(frames.some(f => f.color.some(v => v)), 'the test effect draws something');
});
