import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_RATE, SOUNDS, soundCues, synth } from 'grittyfx';
import { encodeWav } from '../tools/sfx.mjs';
import { makeBundle, manifest, loadEffect } from '../tools/lib.mjs';

const mean = s => s.reduce((a, v) => a + v, 0) / s.length;
const peak = s => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = s => Math.sqrt(mean(s.map(v => v * v)));
const crossings = s => s.reduce((n, v, i) => n + (i > 0 && v >= 0 !== s[i - 1] >= 0), 0) / 2 / (s.length / SAMPLE_RATE); // ~ Hz
const at = (s, t0, t1) => s.subarray(Math.round(t0 * SAMPLE_RATE), Math.round(t1 * SAMPLE_RATE));
const alone = (kind, pitch = 1, duration = 1.2) => synth({ duration, sound: [{ t: 0, kind, pitch }] });
// The seam step against the steps 10 ms either side of it, as check.mjs measures a click.
function seam(s) {
  const n = s.length, step = i => Math.abs(s[(i + 1) % n] - s[i]);
  let near = 0;
  for (let i = n - 221; i < n + 220; i++) if (i !== n - 1) near = Math.max(near, step((i + n) % n));
  return { jump: step(n - 1), near };
}

test('every recipe at three pitches: finite, no clipping, no DC offset, starts and ends at 0', () => {
  for (const kind of Object.keys(SOUNDS)) {
    for (const pitch of [0.5, 1, 2]) {
      const s = alone(kind, pitch), what = `${kind} at pitch ${pitch}`;
      assert.equal(s.length, Math.round(1.2 * SAMPLE_RATE), what);
      assert.ok(s.every(Number.isFinite), `${what}: finite`);
      assert.ok(peak(s) > 0.7 && peak(s) <= 0.9, `${what}: peak ${peak(s)}`);
      assert.ok(rms(s) > 0.05, `${what}: rms ${rms(s)}`);
      assert.ok(Math.abs(mean(s)) < 0.002, `${what}: DC ${mean(s)}`);
      assert.ok(Math.abs(s[0]) < 0.01 && s.at(-1) === 0, `${what}: starts at ${s[0]}, ends at ${s.at(-1)}`);
    }
  }
});

test('recipes sound like their names, measured', () => {
  // thump: a click, then a low tone that falls silent
  const thump = alone('thump');
  assert.ok(crossings(at(thump, 0.03, 0.25)) < 120, `thump is low: ${crossings(at(thump, 0.03, 0.25))} Hz`);
  assert.ok(rms(at(thump, 0, 0.05)) > 5 * rms(at(thump, 0.3, 0.4)), 'thump decays');
  // crack: bright and short; lower pitch is duller and longer
  const crack = alone('crack'), low = alone('crack', 0.5);
  assert.ok(crossings(at(crack, 0, 0.1)) > 1500, `crack is bright: ${crossings(at(crack, 0, 0.1))} Hz`);
  assert.ok(crossings(at(low, 0, 0.1)) < crossings(at(crack, 0, 0.1)) * 0.7, 'pitch 0.5 is duller');
  assert.ok(rms(at(low, 0.3, 0.4)) > 3 * rms(at(crack, 0.3, 0.4)), 'pitch 0.5 rings longer');
  // whoosh: swells to its loudest about a third of the way in, brightest there too
  const whoosh = alone('whoosh'), windows = Array.from({ length: 12 }, (_, i) => rms(at(whoosh, i * 0.03, (i + 1) * 0.03)));
  const loudest = windows.indexOf(Math.max(...windows));
  assert.ok(loudest >= 2 && loudest <= 5, `whoosh peaks at ${loudest * 30} ms`);
  assert.ok(crossings(at(whoosh, 0.09, 0.15)) > 1.5 * crossings(at(whoosh, 0.3, 0.36)), 'its band sweeps up, then down');
  // crackle: sustained, never silent, with pops well above its bed
  const crackle = alone('crackle'), levels = Array.from({ length: 10 }, (_, i) => rms(at(crackle, 0.1 + i * 0.1, 0.2 + i * 0.1)));
  assert.ok(Math.min(...levels) > 0.05, `crackle never drops out: ${levels.map(v => v.toFixed(2))}`);
  assert.ok(peak(crackle) > 3 * rms(crackle), 'crackle pops');
  // zap: a buzz in the low hundreds of Hz, gone by half a second
  const zap = alone('zap');
  assert.ok(rms(at(zap, 0, 0.1)) > 0.15 && rms(at(zap, 0.42, 0.5)) < 1e-3, 'zap is loud, then over');
  // chime: rings at 880 Hz times its pitch
  for (const pitch of [1, 1.5]) {
    const hz = crossings(at(alone('chime', pitch), 0.1, 0.6));
    assert.ok(Math.abs(hz - 880 * pitch) < 880 * pitch * 0.03, `chime at pitch ${pitch} rings at ${hz} Hz`);
  }
});

test('cues: meta.sound, else a thump on each act hit; false or [] is silence', () => {
  const meta = { duration: 1, act: { hits: [{ t: 0.1, freeze: 0.05 }, { t: 0.5 }] } };
  assert.deepEqual(soundCues(meta), [{ gain: 1, pitch: 1, t: 0.1, kind: 'thump' }, { gain: 1, pitch: 1, t: 0.5, kind: 'thump' }]);
  assert.deepEqual(soundCues({ ...meta, sound: [{ t: 0.2, kind: 'zap', gain: 0.5 }] }), [{ gain: 0.5, pitch: 1, t: 0.2, kind: 'zap' }]);
  for (const sound of [false, []]) {
    assert.deepEqual(soundCues({ ...meta, sound }), []);
    assert.equal(synth({ ...meta, sound }), null);
  }
  assert.equal(synth({ duration: 1 }), null);
  assert.throws(() => synth({ duration: 1, sound: [{ t: 0, kind: 'boing' }] }), /unknown kind "boing"/);
});

test('loops repeat seamlessly, even with sounds that ring past the end', async () => {
  const sound = Object.keys(SOUNDS).map((kind, i) => ({ t: 0.75 + i * 0.04, kind }));
  const s = synth({ duration: 1, loop: true, sound });
  const { jump, near } = seam(s);
  assert.ok(jump <= 1.5 * near + 1e-3, `seam ${jump} against ${near} nearby`);
  assert.ok(rms(at(s, 0, 0.05)) > 0.05, 'the tails wrapped round to the start');
  for (const { id, meta } of await manifest()) {
    if (!meta.loop || !synth(meta)) continue;
    const { jump, near } = seam(synth(meta));
    assert.ok(jump <= 1.5 * near + 1e-3, `${id}: seam ${jump} against ${near} nearby`);
  }
});

test('the bundle WAV: 16-bit mono PCM at 22050 Hz, one effect long, the same bytes for the same seed', async () => {
  for (const { id, meta } of await manifest()) {
    const { wav, json, files } = makeBundle(id, await loadEffect(id));
    if (!wav) continue;
    const n = Math.round(meta.duration * SAMPLE_RATE);
    assert.equal(json.meta.grittyfx.sound, files.sound, id);
    assert.deepEqual([wav.toString('latin1', 0, 4), wav.toString('latin1', 8, 16), wav.toString('latin1', 36, 40)], ['RIFF', 'WAVEfmt ', 'data'], id);
    assert.deepEqual([wav.readUInt16LE(20), wav.readUInt16LE(22), wav.readUInt32LE(24), wav.readUInt16LE(34)], [1, 1, SAMPLE_RATE, 16], id);
    assert.equal(wav.readUInt32LE(40), 2 * n, `${id}: ${meta.duration} s of samples`);
    assert.equal(wav.readUInt32LE(4), wav.length - 8, id);
    // a loop says so in a smpl chunk (Godot reads it), from the first sample to the last
    assert.equal(wav.length, 44 + 2 * n + (meta.loop ? 68 : 0), id);
    if (meta.loop) assert.deepEqual([wav.toString('latin1', 44 + 2 * n, 48 + 2 * n), wav.readUInt32LE(48 + 2 * n + 44), wav.readUInt32LE(48 + 2 * n + 52)], ['smpl', 0, n - 1], id);
  }
  const mod = await loadEffect('impacts/hit-spark');
  assert.deepEqual(makeBundle('impacts/hit-spark', mod).wav, makeBundle('impacts/hit-spark', mod).wav);
  assert.notDeepEqual(makeBundle('impacts/hit-spark', mod, { opts: { seed: 2 } }).wav, makeBundle('impacts/hit-spark', mod).wav);
  assert.deepEqual(encodeWav(Float64Array.of(-2, -1, 0, 0.5, 1, 2)).subarray(44), Buffer.from(new Int16Array([-32767, -32767, 0, 16384, 32767, 32767]).buffer));
});

test('a silent effect has no sound in its bundle', async () => {
  const mod = await loadEffect('fire/torch'), b = makeBundle('fire/torch', { ...mod, meta: { ...mod.meta, sound: false } });
  assert.equal(b.wav, null);
  assert.equal(b.files.sound, undefined);
  assert.equal(b.json.meta.grittyfx.sound, undefined);
});
