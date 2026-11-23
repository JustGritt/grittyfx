// node tools/check.mjs [id | category | glob]...: the quality gate. One line per problem; exits 1 if there is any.
// No arguments checks every effect.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createFx, composite, soundCues, synth, SOUNDS } from '../src/core/index.js';
import { listIds, matchIds, loadEffect, drawAt } from './lib.mjs';

const BUDGET_MS = 2;
const SEEDS = 16; // seeds swept for crashes, drawing outside the canvas and one-shots that don't end

const lit = f => f.color.some((v, i) => i % 2 && v) || f.light.some((v, i) => i % 2 && v);
const same = (f, g) => f.color.every((v, i) => v === g.color[i]) && f.light.every((v, i) => v === g.light[i]);
const rgb = (f, pal) => composite(f, pal, new Uint8Array(f.w * f.h * 4), [0, 0, 0]);
const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);

/** Every problem with an effect module, as "id: where: what" lines. `source` is its code, for the Math.random check. */
export function checkEffect(id, mod, source = '') {
  const out = [], say = (where, what) => out.push(`${id}: ${where}: ${what}`);
  const meta = mod.meta ?? {};
  for (const k of ['name', 'size', 'origin', 'duration']) if (meta[k] === undefined) say('meta', `missing ${k}`);
  if (out.length) return out;
  try {
    const { duration, loop } = meta, fps = meta.fps ?? 30, n = Math.max(1, Math.round(duration * fps)), [w, h] = meta.size;
    const pass = () => {
      const fx = createFx(mod), frames = [];
      for (let i = 0; i < n; i++) {
        const t0 = performance.now(), r = drawAt(fx, i / fps);
        frames.push({ ...r, ms: performance.now() - t0 });
      }
      return { fx, frames };
    };
    const a = pass(), b = pass(), c = pass();

    const once = {}; // first frame and frame count of each kind of bad write
    a.frames.forEach(({ painters }, i) => {
      for (const p of painters) {
        for (const [k, at] of [['outside', p.outsideAt], ['bad', p.badAt]]) {
          if (!p[k]) continue;
          once[k] ??= { i, at, frames: new Set() };
          once[k].frames.add(i);
        }
      }
    });
    if (once.outside) {
      const { i, at, frames } = once.outside;
      say(`frame ${i}`, `draws outside the ${w}x${h} canvas at (${at.join(', ')}), in ${frames.size} of ${n} frames`);
    }
    if (once.bad) {
      const { i, at: [x, y, col], frames } = once.bad;
      say(`frame ${i}`, `color ${col} at (${x}, ${y}) is not a palette index (1 to ${a.fx.ramps.reduce((s, r) => s + r.steps, 0)}), in ${frames.size} of ${n} frames`);
    }

    const changed = a.frames.findIndex((f, i) => !same(f.frame, b.frames[i].frame));
    if (changed >= 0) say(`frame ${changed}`, 'differs between two renders: not deterministic');

    const ms = a.frames.map((_, i) => Math.min(b.frames[i].ms, c.frames[i].ms)), slow = ms.indexOf(Math.max(...ms));
    if (ms[slow] > BUDGET_MS) say(`frame ${slow}`, `takes ${ms[slow].toFixed(2)} ms to draw, over the ${BUDGET_MS} ms budget`);

    if (!loop) {
      const end = drawAt(a.fx, duration).frame;
      if (lit(end)) say(`t = ${duration}`, 'a one-shot must draw nothing at its end');
    } else if (n > 2) {
      const imgs = a.frames.map(f => rgb(f.frame, a.fx.palette)), steps = imgs.slice(1).map((img, i) => diff(imgs[i], img));
      const wrap = diff(imgs[n - 1], imgs[0]), most = Math.max(...steps);
      if (wrap > most * 1.5 + 255) say('loop', `the last frame jumps to the first (change ${wrap}, other frames at most ${most}): a seam`);
    }

    // Users pick seeds: one more render per seed for what a seed can break. Only the first broken seed is reported,
    // and only when the default seed is clean, so one bug isn't reported twice.
    for (let seed = 1; seed <= SEEDS && !out.length; seed++) {
      if (seed === meta.options?.seed) continue;
      try {
        const fx = createFx(mod, { seed });
        const at = Array.from({ length: n }, (_, i) => drawAt(fx, i / fps).painters.find(p => p.outside)).findIndex(Boolean);
        if (at >= 0) say(`seed ${seed}`, `frame ${at}: draws outside the ${w}x${h} canvas (try seeds 1 to ${SEEDS} with --seed)`);
        else if (!loop && lit(drawAt(fx, duration).frame)) say(`seed ${seed}`, 'a one-shot must draw nothing at its end');
      } catch (e) {
        say(`seed ${seed}`, `error: ${e.stack.split('\n').slice(0, 2).join(' ')}`);
      }
    }

    if (/Math\.random|\bDate\b/.test(source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))) say('source', 'uses Math.random or Date; use the seeded Rng');

    const hits = meta.act?.hits ?? [];
    if (meta.act?.windup !== undefined && !(meta.act.windup >= 0)) say('act', 'windup must be 0 or more');
    hits.forEach((hit, i) => {
      if (!(hit.t >= 0 && hit.t <= duration)) say('act', `hit ${i} at t = ${hit.t} is outside the effect (0 to ${duration})`);
      if (i && hit.t < hits[i - 1].t) say('act', `hit ${i} comes before hit ${i - 1}: hits must be in time order`);
      if (hit.freeze < 0 || hit.shake < 0) say('act', `hit ${i} has a negative freeze or shake`);
    });

    if (![undefined, false].includes(meta.sound) && !Array.isArray(meta.sound)) say('sound', 'must be a list of cues, or false for silence');
    const cues = Array.isArray(meta.sound) || meta.sound === undefined ? soundCues(meta) : [];
    cues.forEach((cue, i) => {
      if (!SOUNDS[cue.kind]) say('sound', `cue ${i} has an unknown kind "${cue.kind}" (${Object.keys(SOUNDS).join(', ')})`);
      if (meta.sound && !(cue.t >= 0 && cue.t <= duration)) say('sound', `cue ${i} at t = ${cue.t} is outside the effect (0 to ${duration})`);
      if (!(cue.gain >= 0 && cue.pitch > 0)) say('sound', `cue ${i} needs a gain of 0 or more and a pitch over 0`);
    });
    if (cues.length && cues.every(cue => SOUNDS[cue.kind] && cue.pitch > 0)) {
      const s = synth(meta), n = s.length, step = i => Math.abs(s[(i + 1) % n] - s[i]);
      if (!s.every(Number.isFinite)) say('sound', 'has samples that are not numbers');
      if (loop) {
        // A click is a jump the samples around the seam (10 ms either side) never make.
        let near = 0;
        for (let i = n - 221; i < n + 220; i++) if (i !== n - 1) near = Math.max(near, step((i + n) % n));
        if (step(n - 1) > 1.5 * near + 1e-3) say('sound', `the end jumps to the start by ${step(n - 1).toFixed(3)} (at most ${near.toFixed(3)} nearby): a click at every loop`);
      }
    }
  } catch (e) {
    say('error', e.stack.split('\n').slice(0, 2).join(' '));
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), ids = args.length ? matchIds(args) : listIds();
  let failed = 0;
  for (const id of ids) {
    const url = new URL(`../src/fx/${id}.js`, import.meta.url);
    const problems = checkEffect(id, await loadEffect(id), readFileSync(fileURLToPath(url), 'utf8'));
    problems.forEach(p => console.log(p));
    if (problems.length) failed++;
  }
  console.log(`${ids.length} effects checked, ${failed} with problems`);
  process.exitCode = failed ? 1 : 0;
}
