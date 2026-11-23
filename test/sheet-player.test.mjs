import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { composite, fit } from 'grittyfx';
import { createPlayer, decodePng, loadBundle } from 'grittyfx/runtime/sheet-player';
import { makeBundle, renderFrames, loadEffect } from '../tools/lib.mjs';
import { encodePng, decodePng as decodeNode } from '../tools/png.mjs';

// A bundle with no pixels worth looking at, for timing: n frames at fps.
function fake({ frames = 10, fps = 10, loop = false, end = loop ? 'loop' : 'remove', hits = [] } = {}) {
  const g = { fps, frames, frameSize: [1, 1], pivot: [0, 1], loop, end, light_gain: 1, ramps: [], act: { hits: hits.map(frame => ({ frame, freeze: frame / 100, shake: 1 })) } };
  return { json: { frames: Array.from({ length: frames }, () => ({ frame: { x: 0, y: 0, w: 1, h: 1 } })), meta: { grittyfx: g } }, data: { w: 1, h: 1, rgba: new Uint8Array(4) }, palette: new Uint8Array(1024) };
}

function record(bundle) {
  const log = [];
  const p = createPlayer(bundle, { onHit: (i, freeze, shake) => log.push(['hit', i, freeze, shake]), onFinished: () => log.push(['finished']) });
  return { p, log };
}

test('a frame-0 hit fires on play(); later hits fire in order, even when a big dt skips their frames', () => {
  const { p, log } = record(fake({ hits: [0, 2, 5, 5] }));
  p.play();
  assert.deepEqual(log, [['hit', 0, 0, 1]]);
  p.update(0.15);
  assert.equal(p.index, 1);
  assert.equal(log.length, 1);
  p.update(0.05); // frame 2 is shown now
  assert.deepEqual(log.at(-1), ['hit', 1, 0.02, 1]);
  p.update(5);
  assert.deepEqual(log.slice(2), [['hit', 2, 0.05, 1], ['hit', 3, 0.05, 1], ['finished']]);
});

test('frames step at floor(t * fps) without float drift', () => {
  const p = createPlayer(fake({ frames: 20, fps: 10 })).play();
  for (let i = 1; i < 20; i++) {
    p.update(0.1); // ten of them sum to 0.9999999999999999
    assert.equal(p.index, i);
  }
});

test('loops fire their hits every cycle, one cycle at most per update, and never finish', () => {
  const { p, log } = record(fake({ frames: 4, loop: true, hits: [0, 2] }));
  p.play();
  p.update(0.4); // frames 1 to 4: hit 1 at frame 2, then hit 0 again at frame 4 (0 of the next cycle)
  assert.deepEqual(log.map(e => e[1]), [0, 1, 0]);
  p.update(10);
  assert.deepEqual(log.slice(3).map(e => e[1]), [1, 0]);
  assert.equal(p.index, 0);
  assert.ok(p.active && !p.finished);
});

test('end: "remove" stops drawing, "hold" keeps the last frame, "loop" wraps; finished fires once', () => {
  const remove = record(fake({ frames: 3 }));
  remove.p.play().update(0.3);
  remove.p.update(1);
  assert.deepEqual(remove.log, [['finished']]);
  assert.equal(remove.p.index, -1);
  assert.equal(remove.p.frame(), null);

  const hold = record(fake({ frames: 3, end: 'hold' }));
  hold.p.play().update(0.3);
  hold.p.update(1);
  assert.deepEqual(hold.log, [['finished']]);
  assert.ok(hold.p.active);
  assert.equal(hold.p.index, 2);
  assert.ok(hold.p.frame());

  const loop = record(fake({ frames: 3, end: 'loop' }));
  loop.p.play().update(0.4);
  assert.equal(loop.p.index, 1);
  assert.deepEqual(loop.log, []);
});

test('stop() fades color and light out over 0.3 s, then finishes once and stops drawing', () => {
  for (const opts of [{ loop: true }, { end: 'hold', frames: 2 }]) {
    const { p, log } = record(fake(opts));
    p.play().update(0.5);
    p.stop();
    p.update(0.15);
    assert.ok(Math.abs(p.fade - 0.5) < 1e-9, `fade ${p.fade}`);
    p.update(0.1);
    assert.ok(p.active);
    p.update(0.05);
    assert.equal(p.fade, 0);
    assert.ok(!p.active);
    assert.equal(log.filter(e => e[0] === 'finished').length, 1, JSON.stringify(log));
    assert.equal(p.frame(), null);
  }
});

// A 5 x 2 frame whose pixels all have different colors, pivot at x = 2.
function pixels() {
  const b = fake({ frames: 1 }), w = 5, h = 2, rgba = new Uint8Array(w * h * 4), palette = new Uint8Array(1024);
  for (let i = 0; i < w * h; i++) rgba.set([i + 1, 255, 0, 0], i * 4), palette.set([i * 20, 0, 255 - i * 20, 255], (i + 1) * 4);
  Object.assign(b.json.meta.grittyfx, { frameSize: [w, h], pivot: [2, 2] });
  b.json.frames[0].frame = { x: 0, y: 0, w, h };
  return Object.assign(b, { data: { w, h, rgba }, palette });
}

test('flip mirrors about the pivot: local x lands on -x - 1', () => {
  const p = createPlayer(pixels()).play(), plain = p.frame();
  p.flip = true;
  const flipped = p.frame();
  assert.equal(flipped.oy, plain.oy);
  for (let y = 0; y < plain.h; y++) {
    for (let c = 0; c < plain.w; c++) {
      const x = c - plain.ox, f = -x - 1 + flipped.ox; // where local x lands in the flipped image
      const at = (fr, col) => [...fr.color.subarray((y * fr.w + col) * 4, (y * fr.w + col) * 4 + 4)];
      assert.deepEqual(at(flipped, f), at(plain, c), `local x ${x}, row ${y}`);
    }
  }
});

test('recolor by ramp name matches fit(), is per instance, and rebuilds the frame', () => {
  const b = pixels();
  b.json.meta.grittyfx.ramps = [{ name: 'palette', from: 1, steps: 4 }, { name: 'smoke', from: 5, steps: 3 }];
  const p = createPlayer(b).play(), other = createPlayer(b).play(), before = p.frame();
  p.recolor({ palette: 'ice', smoke: ['#ffffff', '#000000'] });
  const want = Uint8Array.from(b.palette);
  fit('ice', 4).forEach((c, i) => want.set(c, (1 + i) * 4));
  fit(['#ffffff', '#000000'], 3).forEach((c, i) => want.set(c, (5 + i) * 4));
  assert.deepEqual(p.palette, want);
  assert.deepEqual(other.palette, Uint8Array.from(b.palette));
  const after = p.frame();
  assert.notEqual(after, before);
  assert.deepEqual([...after.color.subarray(0, 3)], [...want.subarray(4, 7)]);
  assert.throws(() => p.recolor({ fire: 'ice' }), /no ramp "fire"/);
  assert.throws(() => p.recolor(new Uint8Array(4)), /1024/);
  p.recolor(new Uint8Array(1024).fill(7));
  assert.deepEqual([...p.frame().color.subarray(0, 4)], [7, 7, 7, 255]);
});

// What draw() does on a canvas filled with bg: the color layer source-over, then the light layer, premultiplied, 'lighter'.
function overCanvas(f, bg) {
  const out = new Uint8Array(f.w * f.h * 4);
  for (let i = 0; i < f.w * f.h; i++) {
    const a = f.color[i * 4 + 3] / 255, light = k => Math.round((f.light[i * 4 + k] * f.light[i * 4 + 3]) / 255);
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.min(255, Math.round(f.color[i * 4 + k] * a + bg[k] * (1 - a)) + light(k));
    out[i * 4 + 3] = 255;
  }
  return out;
}

async function realBundle(id, view) {
  const mod = await loadEffect(id), b = makeBundle(id, mod, { view });
  return { mod, b, bundle: { json: b.json, data: await decodePng(b.png.data), palette: (await decodePng(b.png.palette)).rgba } };
}

test('angle picks a top-down row: the nearest of E, SE, S, ... NE, screen space with y down', async () => {
  const { mod, bundle } = await realBundle('fire/fireball', 'top'), { frames, n } = renderFrames(mod, { view: 'top' });
  const p = createPlayer(bundle, { angle: Math.PI / 2 }).play(), deg = Math.PI / 180;
  // the rendered frame 0 whose color alpha the player shows
  const row = () => frames.findIndex((f, k) => k % n === 0 && f.color.every((v, j) => j % 2 === 0 || v === p.frame().color[(j >> 1) * 4 + 3]));
  assert.equal(row(), 2 * n, 'PI / 2 is south');
  for (const [a, d] of [[0, 0], [22 * deg, 0], [23 * deg, 1], [Math.atan2(1, -1), 3], [-Math.PI / 2, 6], [-Math.PI, 4], [7 * Math.PI, 4], [-10 * deg, 0], [-30 * deg, 7]]) {
    p.angle = a;
    assert.equal(row(), d * n, `${a / deg} degrees`);
  }
  const side = createPlayer((await realBundle('fire/fireball')).bundle).play(), plain = side.frame();
  side.angle = 2;
  assert.equal(side.frame(), plain, 'a side bundle ignores the angle');
});

test('a real bundle drawn by the player over a background equals composite() over it', async () => {
  for (const id of ['fire/torch', 'impacts/hit-spark', 'explosions/small-explosion']) {
    const { mod, bundle } = await realBundle(id), { frames, fx } = renderFrames(mod), lit = { color: 0, light: 0, bare: 0 };
    for (const gain of [1, 2]) {
      const p = createPlayer(bundle, { gain }).play();
      frames.forEach((src, i) => {
        if (i) p.update(1 / bundle.json.meta.grittyfx.fps);
        const f = p.frame();
        assert.equal(p.index, i);
        for (const bg of [[27, 29, 38], [200, 200, 208]]) {
          const got = overCanvas(f, bg), want = composite(src, fx.palette, new Uint8Array(src.w * src.h * 4), bg, gain);
          // The canvas keeps 8 bits per layer, composite rounds once: off by one at most.
          const worst = got.reduce((m, v, k) => Math.max(m, Math.abs(v - want[k])), 0);
          assert.ok(worst <= 1, `${id} frame ${i} gain ${gain}: off by ${worst}`);
        }
        // On a transparent canvas a light-only pixel keeps the light layer's alpha: composite()'s, not opaque.
        const bare = composite(src, fx.palette, undefined, null, gain);
        for (let k = 3; k < bare.length; k += 4) {
          if (f.color[k]) continue;
          assert.ok(Math.abs(f.light[k] - bare[k]) <= 1, `${id} frame ${i} gain ${gain} pixel ${k >> 2}: alpha ${f.light[k]}, want ${bare[k]}`);
          if (f.light[k]) lit.bare++;
        }
        lit.color += f.color.filter((v, k) => k % 4 === 3 && v).length;
        lit.light += f.light.filter((v, k) => k % 4 === 3 && v).length;
      });
    }
    assert.ok(lit.color && lit.light && lit.bare, `${id} draws color, light and light-only pixels`);
  }
});

test('loadBundle fetches the JSON and both PNGs next to it', async () => {
  const { b } = await realBundle('impacts/hit-spark'), saved = globalThis.fetch;
  const files = { 'hit-spark.json': JSON.stringify(b.json), 'hit-spark_data.png': b.png.data, 'hit-spark_pal.png': b.png.palette };
  globalThis.fetch = async u => {
    const name = String(u).split('/').pop();
    return files[name] ? new Response(files[name]) : new Response('', { status: 404 });
  };
  try {
    const got = await loadBundle('https://example.test/fx/hit-spark.json');
    assert.deepEqual(got.json, b.json);
    assert.deepEqual(got.data, decodeNode(b.png.data));
    assert.deepEqual(got.palette, decodeNode(b.png.palette).rgba);
    delete files['hit-spark_pal.png'];
    await assert.rejects(loadBundle('https://example.test/fx/hit-spark.json'), /hit-spark_pal.png: HTTP 404/);
  } finally {
    globalThis.fetch = saved;
  }
});

const CRC = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc = buf => ~buf.reduce((c, b) => CRC[(c ^ b) & 255] ^ (c >>> 8), ~0) >>> 0;
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc(body), body.length + 4);
  return out;
};
const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

// A PNG whose row y uses filter (y + shift) % 5, its data split over two IDAT chunks.
function filteredPng(w, h, rgba, shift) {
  const stride = w * 4, raw = new Uint8Array(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    const ft = (y + shift) % 5;
    raw[y * (stride + 1)] = ft;
    for (let x = 0; x < stride; x++) {
      const at = (dx, dy) => (x >= dx && y >= dy ? rgba[(y - dy) * stride + x - dx] : 0);
      const a = at(4, 0), b = at(0, 1), c = at(4, 1);
      raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x] - [0, a, b, (a + b) >> 1, paeth(a, b, c)][ft];
    }
  }
  const z = deflateSync(raw), head = encodePng(w, h, rgba).subarray(0, 33); // signature and IHDR
  return Buffer.concat([head, chunk('IDAT', z.subarray(0, 10)), chunk('IDAT', z.subarray(10)), chunk('IEND', Buffer.alloc(0))]);
}

test('decodePng reads encodePng output and every filter type, byte for byte', async () => {
  const w = 7, h = 6, rgba = Uint8Array.from({ length: w * h * 4 }, (_, i) => (i * 97 + (i >> 3) * 31) & 255);
  rgba[3] = 0; // RGB under zero alpha must survive (a 2D canvas would wipe it)
  assert.deepEqual(await decodePng(encodePng(w, h, rgba)), { w, h, rgba });
  for (let shift = 0; shift < 5; shift++) assert.deepEqual(await decodePng(filteredPng(w, h, rgba, shift)), { w, h, rgba }, `shift ${shift}`);
  const { b } = await realBundle('fire/torch');
  assert.deepEqual(await decodePng(b.png.data), decodeNode(b.png.data));
  await assert.rejects(decodePng(new Uint8Array(40)), /not a PNG/);
});

test('decodePng says so when a PNG is truncated or damaged, and ignores bytes after IEND', async () => {
  const w = 4, h = 4, rgba = new Uint8Array(w * h * 4).fill(9), png = encodePng(w, h, rgba);
  for (const n of [3, 30, png.length >> 1, png.length - 1]) await assert.rejects(decodePng(png.subarray(0, n)), n < 8 ? /not a PNG/ : /truncated/, `${n} bytes`);
  assert.deepEqual(await decodePng(Buffer.concat([png, Buffer.from([1, 2, 3])])), { w, h, rgba });
  const bad = Buffer.from(png);
  bad[41] = 0; // the zlib header, first byte of the IDAT data
  await assert.rejects(decodePng(bad), /bad or truncated image data/);
});
