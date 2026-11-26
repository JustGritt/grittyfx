// node tools/check.mjs [id | category | glob]... [--seeds N]: the quality gate. One line per problem; exits 1 if there
// is any. No ids checks every effect. Every view is checked, a top view at each of its headings. Seeds 2 to N (16 by
// default) are also checked for crashes, drawing outside the canvas, bad colors and a one-shot that doesn't end empty.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { createFx, composite, layout, HEADINGS, soundCues, synth, SOUNDS } from '../src/core/index.js';
import { PLACES, SCENERY, ACTS } from '../src/stage/stage.js';
import { CASTERS } from '../src/stage/actors.js';
import { listIds, matchIds, loadEffect, drawAt, views } from './lib.mjs';

const BUDGET_MS = Number(process.env.GRITTYFX_BUDGET_MS) || 2; // CI raises it: shared runners are slower than a desk
const SEEDS = 16; // users pick seeds: this many are swept

const lit = f => f.color.some((v, i) => i % 2 && v) || f.light.some((v, i) => i % 2 && v);
const same = (f, g) => f.color.every((v, i) => v === g.color[i]) && f.light.every((v, i) => v === g.light[i]);
const rgb = (f, pal) => composite(f, pal, new Uint8Array(f.w * f.h * 4), [0, 0, 0]);
const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);

/**
 * Every problem with an effect module, as "id: where: what" lines. `source` is its code, for the Math.random check.
 * Where is "frame 3" in the side view, "top frame 3" or "top SW frame 3" in the top one, with "(seed 4)" from `seeds`.
 */
export function checkEffect(id, mod, source = '', { seeds = SEEDS } = {}) {
  const out = [], say = (where, what) => out.push(`${id}: ${where}: ${what}`);
  const meta = mod.meta ?? {};
  for (const k of ['name', 'size', 'origin', 'duration']) if (meta[k] === undefined) say('meta', `missing ${k}`);
  for (const view of views(meta)) if (view !== 'side' && view !== 'top') say('meta', `unknown view "${view}" (side or top)`);
  if (![1, 8].includes(meta.top?.directions ?? 1)) say('meta', `top.directions is ${meta.top.directions}: 1 (radial) or 8 (directional)`);
  if (meta.stage?.at !== undefined && !PLACES.includes(meta.stage.at)) say('meta', `stage.at is "${meta.stage.at}": one of ${PLACES.join(', ')}`);
  if (meta.stage?.cast !== undefined && !CASTERS[meta.stage.cast]) say('meta', `stage.cast is "${meta.stage.cast}": one of ${Object.keys(CASTERS).join(', ')}`);
  if (![undefined, null, ...ACTS].includes(meta.stage?.pose)) say('meta', `stage.pose is "${meta.stage.pose}": one of ${ACTS.join(', ')}, or null`);
  if (meta.stage?.scenery !== undefined && !SCENERY[meta.stage.scenery]) say('meta', `stage.scenery is "${meta.stage.scenery}": one of ${Object.keys(SCENERY).join(', ')}`);
  if (out.length) return out;
  try {
    const { duration, loop } = meta, fps = meta.fps ?? 30, n = Math.max(1, Math.round(duration * fps));
    for (const view of views(meta)) {
      const v = layout(meta, view), [w, h] = v.size, dirs = v.directions;
      const where = (d, what, seed) => [view === 'top' && 'top', dirs > 1 && HEADINGS[d], what, seed > 1 && `(seed ${seed})`].filter(Boolean).join(' ');
      const pass = seed => {
        const fx = createFx(mod, { view, ...(seed > 1 && { seed }) }), frames = [];
        for (let i = 0; i < n; i++) {
          for (let d = 0; d < dirs; d++) {
            const t0 = performance.now(), r = drawAt(fx, i / fps, v, d);
            frames.push({ ...r, i, d, ms: performance.now() - t0 });
          }
        }
        return { fx, frames };
      };
      // drawing outside, bad colors and the one-shot end, for one seed
      const bounds = seed => {
        const a = pass(seed), once = {}; // first frame and frame count of each kind of bad write
        a.frames.forEach(({ painters, i, d }, k) => {
          for (const p of painters) {
            for (const [kind, at] of [['outside', p.outsideAt], ['bad', p.badAt]]) {
              if (!p[kind]) continue;
              once[kind] ??= { i, d, at, frames: new Set() };
              once[kind].frames.add(k);
            }
          }
        });
        if (once.outside) {
          const { i, d, at, frames } = once.outside;
          say(where(d, `frame ${i}`, seed), `draws outside the ${w}x${h} canvas at (${at.join(', ')}), in ${frames.size} of ${n * dirs} frames`);
        }
        if (once.bad) {
          const { i, d, at: [x, y, col], frames } = once.bad;
          say(where(d, `frame ${i}`, seed), `color ${col} at (${x}, ${y}) is not a palette index (1 to ${a.fx.ramps.reduce((s, r) => s + r.steps, 0)}), in ${frames.size} of ${n * dirs} frames`);
        }
        for (let d = 0; d < dirs && !loop; d++) if (lit(drawAt(a.fx, duration, v, d).frame)) say(where(d, `t = ${duration}`, seed), 'a one-shot must draw nothing at its end');
        return a;
      };
      const a = bounds(1), b = pass(), c = pass();
      // Only the first broken seed is reported, and only when the default seed is clean, so one bug isn't reported twice.
      for (let seed = 2; seed <= seeds && !out.length; seed++) {
        try {
          bounds(seed);
        } catch (e) {
          say(`seed ${seed}`, `error: ${e.stack.split('\n').slice(0, 2).join(' ')}`);
        }
      }

      const changed = a.frames.find((f, k) => !same(f.frame, b.frames[k].frame));
      if (changed) say(where(changed.d, `frame ${changed.i}`), 'differs between two renders: not deterministic');

      const ms = a.frames.map((_, k) => Math.min(b.frames[k].ms, c.frames[k].ms)), slow = ms.indexOf(Math.max(...ms)), s = a.frames[slow];
      if (ms[slow] > BUDGET_MS) say(where(s.d, `frame ${s.i}`), `takes ${ms[slow].toFixed(2)} ms to draw, over the ${BUDGET_MS} ms budget`);

      for (let d = 0; d < dirs && loop && n > 2; d++) {
        const imgs = a.frames.filter(f => f.d === d).map(f => rgb(f.frame, a.fx.palette)), steps = imgs.slice(1).map((img, i) => diff(imgs[i], img));
        const wrap = diff(imgs[n - 1], imgs[0]), most = Math.max(...steps);
        if (wrap > most * 1.5 + 255) say(where(d, 'loop'), `the last frame jumps to the first (change ${wrap}, other frames at most ${most}): a seam`);
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
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { seeds: { type: 'string', default: String(SEEDS) } } });
  const ids = positionals.length ? matchIds(positionals) : listIds();
  let failed = 0;
  for (const id of ids) {
    const url = new URL(`../src/fx/${id}.js`, import.meta.url);
    const problems = checkEffect(id, await loadEffect(id), readFileSync(fileURLToPath(url), 'utf8'), { seeds: Number(values.seeds) });
    problems.forEach(p => console.log(p));
    if (problems.length) failed++;
  }
  console.log(`${ids.length} effects checked, ${failed} with problems`);
  process.exitCode = failed ? 1 : 0;
}
