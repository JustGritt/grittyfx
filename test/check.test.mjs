import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEffect } from '../tools/check.mjs';

const meta = { name: 'T', size: [16, 16], origin: [8, 8], duration: 0.5, fps: 20, ramps: { palette: 4 }, options: { palette: 'fire' } };
const good = { meta, draw: (p, t, o) => t < 0.5 && p.disc(0, 0, 4 * (1 - t / 0.5), o.palette[2], 0.8) };

test('a clean effect has no problems', () => {
  assert.deepEqual(checkEffect('t/good', good, 'p.disc(0, 0, 4)'), []);
});

test('outside writes, non-index colors and a one-shot that does not end empty', () => {
  const bad = { meta, draw: (p, t, o) => { p.px(20, 0, o.palette[1]); p.px(0, 0, 0xff8800); p.px(1, 1, o.palette[1]); } };
  const lines = checkEffect('t/bad', bad);
  assert.equal(lines.length, 3, lines.join('\n'));
  assert.match(lines[0], /^t\/bad: frame 0: draws outside the 16x16 canvas at \(28, 8\), in 10 of 10 frames$/);
  assert.match(lines[1], /color 16746496 at \(8, 8\) is not a palette index \(1 to 4\)/);
  assert.match(lines[2], /one-shot must draw nothing at its end/);
});

test('not deterministic, Math.random in the source, act out of order', () => {
  let calls = 0;
  const mod = { meta: { ...meta, act: { windup: 0.2, hits: [{ t: 0.3 }, { t: 0.1 }, { t: 0.9 }] } }, draw: (p, t, o) => t < 0.5 && p.px(calls++ % 3, 0, o.palette[1]) };
  const lines = checkEffect('t/flaky', mod, 'const r = Math.random(); // Date in a comment is fine');
  assert.ok(lines.some(l => /not deterministic/.test(l)), lines.join('\n'));
  assert.ok(lines.some(l => /uses Math.random/.test(l)));
  assert.ok(lines.some(l => /hit 1 comes before hit 0/.test(l)));
  assert.ok(lines.some(l => /hit 2 at t = 0.9 is outside/.test(l)));
});

test('an unknown stage place', () => {
  assert.deepEqual(checkEffect('t/stage', { ...good, meta: { ...meta, stage: { at: 'target', ground: 0 } } }), []);
  assert.match(checkEffect('t/stage', { ...good, meta: { ...meta, stage: { at: 'head' } } }).join(), /stage.at is "head": one of target, caster/);
  assert.match(checkEffect('t/stage', { ...good, meta: { ...meta, stage: { cast: 'bard' } } }).join(), /stage.cast is "bard": one of knight, mage, priest, archer, kunoichi/);
  assert.match(checkEffect('t/stage', { ...good, meta: { ...meta, stage: { scenery: 'tree' } } }).join(), /stage.scenery is "tree": one of sconce, posts, pool/);
  assert.match(checkEffect('t/stage', { ...good, meta: { ...meta, stage: { pose: 'dance' } } }).join(), /stage.pose is "dance": one of strike, /);
});

test('a loop that jumps back is a seam; a periodic one is not', () => {
  const loop = { ...meta, loop: true, duration: 1 };
  const slide = { meta: loop, draw: (p, t, o) => p.disc(-6 + t * 12, 0, 2, o.palette[3]) };
  const swing = { meta: loop, draw: (p, t, o) => p.disc(Math.sin(t * Math.PI * 2) * 5, 0, 2, o.palette[3]) };
  assert.match(checkEffect('t/slide', slide).join(), /a seam/);
  assert.deepEqual(checkEffect('t/swing', swing), []);
});

test('other seeds are swept: drawing outside the canvas or crashing on a seed is reported once', () => {
  const m = { ...meta, options: { ...meta.options, seed: 1 } };
  const drift = { meta: m, draw: (p, t, o) => t < 0.5 && p.px(o.seed * 2, 0, o.palette[1]) }; // seed 4 reaches x = 8 + 8
  assert.deepEqual(checkEffect('t/drift', drift), ['t/drift: frame 0 (seed 4): draws outside the 16x16 canvas at (16, 8), in 10 of 10 frames']);
  const fragile = { meta: m, draw: (p, t, o) => { if (o.seed === 3) throw new Error('seed 3'); } };
  assert.match(checkEffect('t/fragile', fragile).join(), /^t\/fragile: seed 3: error: Error: seed 3/);
});

test('sound: unknown kinds, cues outside the effect, a bad gain or pitch', () => {
  const sound = [{ t: 0.1, kind: 'boing' }, { t: 0.7, kind: 'thump' }, { t: 0, kind: 'zap', pitch: 0 }];
  const lines = checkEffect('t/sound', { ...good, meta: { ...meta, sound } });
  assert.equal(lines.length, 3, lines.join('\n'));
  assert.match(lines[0], /^t\/sound: sound: cue 0 has an unknown kind "boing" \(thump, crack, whoosh, crackle, zap, chime\)$/);
  assert.match(lines[1], /cue 1 at t = 0.7 is outside the effect \(0 to 0.5\)/);
  assert.match(lines[2], /cue 2 needs a gain of 0 or more and a pitch over 0/);
  assert.match(checkEffect('t/sound', { ...good, meta: { ...meta, sound: 'boom' } }).join(), /must be a list of cues/);
  assert.deepEqual(checkEffect('t/sound', { ...good, meta: { ...meta, sound: [{ t: 0.1, kind: 'chime' }] } }), []);
  const loop = { ...meta, loop: true, duration: 1, sound: [{ t: 0.9, kind: 'crackle' }, { t: 0.95, kind: 'chime' }] };
  assert.deepEqual(checkEffect('t/loop', { meta: loop, draw: (p, t, o) => p.disc(Math.sin(t * Math.PI * 2) * 5, 0, 2, o.palette[3]) }), []);
});

test('top views are checked at every heading, and --seeds sweeps other seeds', () => {
  const top = { ...meta, views: ['side', 'top'], top: { size: [16, 16], directions: 8 } };
  // (7, -8) is the corner pixel heading east; at the four diagonals it leaves the canvas
  const corner = { meta: top, draw: (p, t, o) => t < 0.5 && p.px(7, -8, o.palette[1]) };
  assert.deepEqual(checkEffect('t/corner', corner), ['t/corner: top SE frame 0: draws outside the 16x16 canvas at (18, 8), in 40 of 80 frames']);
  const late = { meta: { ...top, top: { size: [16, 16] } }, draw: (p, t, o) => (t < 0.5 || o.view === 'top') && p.px(0, 0, o.palette[1]) };
  assert.deepEqual(checkEffect('t/late', late), ['t/late: top t = 0.5: a one-shot must draw nothing at its end']);
  assert.match(checkEffect('t/four', { meta: { ...top, top: { directions: 4 } }, draw() {} })[0], /top.directions is 4: 1 \(radial\) or 8/);
  const wild = { meta, draw: (p, t, o) => t < 0.5 && p.px(o.seed === 3 ? 9 : 0, 0, o.palette[1]) };
  assert.deepEqual(checkEffect('t/wild', wild, '', { seeds: 2 }), []);
  assert.match(checkEffect('t/wild', wild, '', { seeds: 3 }).join(), /^t\/wild: frame 0 \(seed 3\): draws outside/);
});

test('missing meta and thrown errors are reported, not crashes', () => {
  assert.match(checkEffect('t/empty', { meta: {} })[0], /meta: missing name/);
  assert.match(checkEffect('t/throws', { meta, draw: () => { throw new Error('boom'); } })[0], /error: Error: boom/);
});
