import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeAseprite, decodeAseprite, BLEND } from '../tools/aseprite.mjs';
import { ROOT, asepriteFile, fromAseprite, makeBundle, loadEffect, warp } from '../tools/lib.mjs';
import { decodePng } from '../tools/png.mjs';
import { SAMPLE_RATE } from 'grittyfx';

const ID = 'impacts/hit-spark'; // a hit on frame 1, sound cues on and after it
const mod = await loadEffect(ID);
// An index whose alpha is 0 draws nothing and has no color in a file to come back from.
const data = b => decodePng(b.png.data).rgba.map((v, i, d) => (i % 2 === 0 && !d[i + 1] ? 0 : v));

test('.aseprite: encode and decode round-trip layers, cels, links, tags, palette and user data', () => {
  const px = (...rgba) => Uint8Array.from(rgba);
  const sprite = {
    w: 3, h: 2,
    layers: [{ name: 'color', userData: '{"a":1}' }, { name: 'light', blend: BLEND.addition, opacity: 128 }],
    frames: [
      { duration: 33, cels: [{ x: 1, y: -1, w: 1, h: 2, opacity: 200, rgba: px(1, 2, 3, 4, 5, 6, 7, 8) }, null] },
      { duration: 100, cels: [{ link: 0 }, { x: 0, y: 0, w: 1, h: 1, rgba: px(9, 9, 9, 255) }] },
    ],
    tags: [{ from: 1, to: 1, name: 'hit freeze=0.1' }],
    palette: [[0, 0, 0, 0], [255, 128, 0, 255]],
  };
  const s = decodeAseprite(encodeAseprite(sprite));
  assert.deepEqual([s.w, s.h, s.frames.map(f => f.duration)], [3, 2, [33, 100]]);
  assert.deepEqual(s.layers.map(l => [l.name, l.blend, l.opacity, l.userData]), [['color', 0, 255, '{"a":1}'], ['light', 16, 128, undefined]]);
  assert.deepEqual(s.frames[0].cels[0], { x: 1, y: -1, w: 1, h: 2, opacity: 200, rgba: px(1, 2, 3, 4, 5, 6, 7, 8) });
  assert.equal(s.frames[0].cels[1], null);
  assert.equal(s.frames[1].cels[0], s.frames[0].cels[0], 'a linked cel is its frame\'s cel');
  assert.deepEqual(s.tags, sprite.tags);
  assert.deepEqual(s.palette, sprite.palette);
  assert.throws(() => decodeAseprite(Buffer.alloc(128)), /not an \.aseprite file/);
});

test('an unedited file bundles back to the rendered bundle: data, hits and sound', async () => {
  const file = asepriteFile(ID, mod), ase = decodeAseprite(file);
  assert.deepEqual(ase.layers.map(l => [l.name, l.blend]), [['color', 0], ['light', BLEND.addition]]);
  assert.deepEqual(JSON.parse(ase.layers[0].userData), { grittyfx: ID, fps: 30, opts: {} });
  assert.deepEqual(ase.tags, [{ from: 1, to: 1, name: 'hit freeze=0.08 shake=2' }]);
  const { id, bundle, warnings } = await fromAseprite(file, 'hit-spark'), ref = makeBundle(ID, mod);
  assert.deepEqual([id, warnings], [ID, []]);
  assert.deepEqual(data(bundle), data(ref));
  assert.deepEqual(bundle.json, ref.json);
  assert.deepEqual(bundle.wav, ref.wav);
});

test('durations hold frames, hit tags move hits and the sound, and the file name names the bundle', async () => {
  const ase = decodeAseprite(asepriteFile(ID, mod)), ref = makeBundle(ID, mod), n = ref.json.meta.grittyfx.frames;
  ase.frames[0].duration = 100; // 3 frames at 30 fps: two more before the hit
  ase.frames[1].duration = 50; // not a whole number of frames
  ase.tags[0].name = 'hit freeze=0.2 shake=5 t=9 frame=0'; // only freeze and shake are read
  const { id, bundle, warnings } = await fromAseprite(encodeAseprite(ase), 'hit-spark-heavy'), g = bundle.json.meta.grittyfx;
  assert.equal(id, 'impacts/hit-spark-heavy');
  assert.deepEqual(warnings, ['frame 2 lasts 50 ms, played as 2 frame(s) at 30 fps: 67 ms']);
  assert.equal(g.frames, n + 3);
  assert.deepEqual(g.act.hits, [{ frame: 3, t: 0.1, freeze: 0.2, shake: 5 }]);
  // frame i of a data sheet of 56 x 40 frames, 8 to a row
  const cell = (png, i) => Array.from({ length: 40 }, (_, y) => {
    const at = ((Math.floor(i / 8) * 40 + y) * png.w + (i % 8) * 56) * 4;
    return png.rgba.slice(at, at + 56 * 4);
  });
  const [got, want] = [decodePng(bundle.png.data), decodePng(ref.png.data)];
  for (const [i, from] of [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 2]]) assert.deepEqual(cell(got, i), cell(want, from), `frame ${i} shows frame ${from}`);
  assert.equal(bundle.wav.length - ref.wav.length, Math.round(0.1 * SAMPLE_RATE) * 2, 'the sound is 3 frames (0.1 s) longer');
  const onset = wav => (wav.findIndex((_, i) => i >= 44 && i % 2 === 0 && wav.readInt16LE(i) !== 0) - 44) / 2; // the first cue's first sample
  assert.equal(onset(bundle.wav) - onset(ref.wav), Math.round(0.1 * SAMPLE_RATE) - Math.round(SAMPLE_RATE / 30), 'the impact sound starts on the moved hit');
});

test('cues follow the hits: shifted before, stretched between, extended after', () => {
  const anchors = [[0, 0], [0.2, 0.3], [0.8, 0.9]];
  assert.deepEqual([0, 0.1, 0.2, 0.5, 0.8, 1].map(t => +warp(anchors, t).toFixed(6)), [0, 0.15, 0.3, 0.6, 0.9, 1.1]);
  assert.equal(warp([[0, 0], [0, 0.1], [1, 1.1]], 0), 0.1, 'a hit at 0 moves the cues at 0');
});

test('fromAseprite refuses colors off the palette, stray layers, other canvases and unknown effects', async () => {
  const edit = async (change, name = 'x') => {
    const ase = decodeAseprite(asepriteFile(ID, mod));
    change(ase);
    return fromAseprite(encodeAseprite(ase), name);
  };
  await assert.rejects(edit(a => a.frames[1].cels[1].rgba.set([1, 2, 3, 255], (5 * 56 + 4) * 4)), /1 pixel\(s\) use colors outside the effect's palette.*frame 2, light \(4, 5\) #010203/);
  await assert.rejects(edit(a => a.layers.push({ name: 'details', flags: 3, type: 0 })), /layer "details": only the color and light layers/);
  await edit(a => a.layers.push({ name: 'ref', flags: 64, type: 0 })); // a reference layer is skipped
  await assert.rejects(edit(a => (a.w = 64)), /the canvas is 64 x 40 but impacts\/hit-spark is 56 x 40/);
  await assert.rejects(edit(a => (a.layers[0].userData = '{"grittyfx":"../../tools/serve","fps":30}')), /isn't an effect here/);
  await assert.rejects(edit(a => (a.layers[0].userData = undefined)), /not a grittyfx file/);
  await assert.rejects(edit(a => (a.layers[0].userData = `{"grittyfx":"${ID}"}`)), /not a grittyfx file/);
});

test('export bundles an edited file into --out, named after the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grittyfx-ase-'));
  try {
    const file = join(dir, 'spark-big.aseprite');
    writeFileSync(file, asepriteFile(ID, mod));
    const r = spawnSync(process.execPath, ['tools/export.mjs', file, '--out', join(dir, 'out')], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const out = join(dir, 'out', 'impacts', 'spark-big');
    assert.deepEqual(readdirSync(out).sort(), ['spark-big.json', 'spark-big.png', 'spark-big.wav', 'spark-big_data.png', 'spark-big_pal.png']);
    assert.equal(JSON.parse(readFileSync(join(out, 'spark-big.json'), 'utf8')).meta.grittyfx.id, 'impacts/spark-big');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('render --aseprite writes into the given folder and never over an existing file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grittyfx-ase-')), file = join(dir, 'art', 'hit-spark.aseprite');
  const render = () => spawnSync(process.execPath, ['tools/render.mjs', ID, '--aseprite', join(dir, 'art')], { cwd: ROOT, encoding: 'utf8' });
  try {
    let r = render();
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(readFileSync(file), asepriteFile(ID, mod));
    writeFileSync(file, 'my edits');
    r = render();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /kept: it exists/);
    assert.equal(readFileSync(file, 'utf8'), 'my edits');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
