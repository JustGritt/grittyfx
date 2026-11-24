// The stage acts effects out: a swordsman winds up for the effect's act.windup, the effect plays where its role puts it,
// the game freezes and shakes on each hit while a training dummy flinches, then both recover. A move chains effects.
// The gallery's Stage toggle and `render --stage` use it. It is not part of the package's API: games bring their own
// characters. Side view only.
//
// role(meta, id)         where and how an effect is acted: meta.stage over its tags, then its category
// plan(steps)            when and where each step plays, the hits, the dummy's flinches, the swordsman's poses
// createStage(steps, o)  { size, fps, duration, loop, hits, draw(t, rgba, bg, flip) }; o: effect options for every step
// realtime(hits, d, fps) the frames a game shows at fps, with hit-stop and shake: [{ t, dx, dy }]
import { createFx, createFrame, clearFrame, Painter } from '../core/index.js';
import { actorPalette, POSES, drawHero, drawBase, drawDummy, outline, flash } from './actors.js';

export const FPS = 30;
export const PLACES = ['target', 'caster', 'ground', 'path', 'above', 'aside'];
const BY_TAG = { projectile: 'path', aura: 'caster', buff: 'caster', pickup: 'caster', status: 'above', nova: 'ground', ambient: 'aside' };
const BY_CATEGORY = { projectiles: 'path', status: 'above', pickups: 'caster' };
export const HIT = 14; // the bullseye on the dummy's chest, px above the floor: where blows land
const HEAD = 29; // the top of the dummy's head, where a status over it anchors
const TIP = 15; // the sword's tip in front of the swordsman at a cast, where projectiles leave
export const NEAR = 26, FAR = 76; // the swordsman's feet to the dummy's: a sword's reach, or room for a projectile
const SPEED = 200; // px/s of a looping projectile
const LEAD = 0.4; // idle before the first wind-up
const PLAY = 1.6; // a loop plays at least this long, then fades out
const FADE = 0.3; // fx.stop()'s fade
const SETTLE = 0.9; // the dummy wobbles this long after a hit
const WINDUP = { strike: 0.15, point: 0.3, raise: 0.3, hop: 0.4 }; // when act.windup is left out
const SHAKE = 0.2, JIGGLE = [[1, 0], [-1, 1], [1, -1], [-1, 0]]; // as in the gallery

/**
 * Where and how an effect is acted: { at, pose, x, ground, speed }. `at` is one of PLACES, from meta.stage.at, else its
 * tags (projectile: path, aura, buff, pickup: caster, status: above, nova: ground, ambient: aside), else its category,
 * else target. `ground` is the floor's y in the effect's own coordinates (how high its anchor sits), `x` shifts it
 * toward the dummy, `speed` is a looping projectile's in px/s. `pose` is how the swordsman acts it: strike (a melee
 * effect on the target), hop (landing or jump on the ground), raise (on himself), point (anything else), none (aside).
 */
export function role(meta, id = '') {
  const tags = meta.tags ?? [], s = meta.stage ?? {};
  const at = s.at ?? BY_TAG[tags.find(t => BY_TAG[t])] ?? BY_CATEGORY[id.split('/')[0]] ?? 'target';
  const pose = at === 'aside' ? null
    : at === 'ground' && (tags.includes('landing') || tags.includes('jump')) ? 'hop'
    : at === 'caster' || at === 'ground' ? 'raise'
    : at === 'target' && (tags.includes('melee') || tags.includes('slash')) ? 'strike' : 'point';
  const ground = s.ground ?? (at === 'target' || at === 'path' ? HIT : at === 'above' ? HEAD : 0);
  return { at, pose, x: s.x ?? 0, ground, speed: s.speed ?? SPEED };
}

const snap = t => Math.round(t * FPS) / FPS; // hits land on a frame, as in a bundle
const IO = u => u * u * (3 - 2 * u), OUT = u => 1 - (1 - u) ** 2, IN = u => u * u, LINEAR = u => u;
// The swordsman's keys for one acted step: [t, pose, ease into it], from its start s, first contact c and wind-up w.
const ACTING = {
  strike: (s, c, w) => [[s - w * 0.5, 'ready', OUT], [s, 'ready'], [c, 'swing', LINEAR], [c + 0.1, 'swing'], [c + 0.22, 'follow', OUT], [c + 0.6, 'idle', IO]],
  point: (s, c, w) => [[s - w * 0.6, 'gather', OUT], [s, 'gather'], [s + 1 / FPS, 'point', LINEAR], [Math.max(c, s + 0.2) + 0.15, 'point'], [Math.max(c, s + 0.2) + 0.55, 'idle', IO]],
  raise: (s, c, w) => [[s - w * 0.6, 'crouch', OUT], [s, 'crouch'], [s + 1 / FPS, 'raise', LINEAR], [Math.max(c, s + 0.3) + 0.2, 'raise'], [Math.max(c, s + 0.3) + 0.6, 'idle', IO]],
  hop: (s, c, w) => [[s - w * 0.8, 'crouch', OUT], [s - w * 0.4, 'air', OUT], [s, 'crouch', IN], [s + 0.15, 'crouch'], [s + 0.45, 'idle', IO]],
};

/** The swordsman's pose at t from keys [[t, pose, ease], ...]: idle before the first. */
export function poseAt(keys, t) {
  const k = keys.findIndex(key => key[0] > t);
  if (k === 0 || !keys.length) return POSES.idle;
  if (k < 0) return keys.at(-1)[1];
  const [t0, a] = keys[k - 1], [t1, b, ease = IO] = keys[k], u = ease((t - t0) / (t1 - t0));
  return Object.fromEntries(Object.keys(a).map(n => [n, a[n] + (b[n] - a[n]) * u]));
}

/**
 * When and where each step plays. steps: [{ mod, id, on }]; a step starts once the one before it ends, after its own
 * wind-up, or with `on: 'hit'` so that its first hit lands with the previous step's first contact. Positions are in px
 * with the swordsman's feet at (0, 0), the dummy's at (D, 0), y down. Returns { D, acts, hits, flinches, keys, duration,
 * loop }: acts [{ mod, role, start, end, stop, travel, from, to, contact }], hits [{ t, freeze, shake }] merged where
 * they coincide, the dummy's flinches [{ t, k }] and the swordsman's pose keys.
 */
export function plan(steps) {
  const roles = steps.map(s => role(s.mod.meta, s.id));
  const acting = roles.filter((r, i) => r.pose && !(i && steps[i].on === 'hit'));
  const D = acting.length && acting.every(r => r.pose === 'strike') ? NEAR : FAR;
  const acts = [], hits = [], flinches = [], keys = [];
  steps.forEach((s, i) => {
    const r = roles[i], { meta } = s.mod, own = meta.act?.hits ?? [], prev = acts[i - 1], ride = prev && s.on === 'hit';
    const windup = ride || !r.pose ? 0 : meta.act?.windup ?? WINDUP[r.pose];
    const start = snap(ride ? prev.contact - (own[0]?.t ?? 0) : (prev ? prev.end : LEAD) + windup);
    const from = [{ target: D, above: D, caster: 0, ground: 0, path: TIP, aside: D / 2 }[r.at] + r.x, -r.ground];
    const to = r.at === 'path' ? [D + r.x, -r.ground] : from;
    // a projectile arrives on its first hit, or at its end, or (a loop) after flying the distance
    const travel = r.at === 'path' ? own[0]?.t ?? (meta.loop ? (to[0] - from[0]) / r.speed : meta.duration) : 0;
    const contact = snap(start + (r.at === 'path' ? travel : own[0]?.t ?? 0));
    const play = meta.loop ? (r.at === 'path' ? travel : r.at === 'aside' ? Infinity : Math.max(PLAY, meta.duration)) : meta.duration;
    const end = start + play, stop = meta.loop && r.at !== 'path' ? end + FADE : end;
    acts.push({ mod: s.mod, opts: s.opts, role: r, start, end, stop, travel, from, to, contact });

    const struck = ['target', 'path', 'above'].includes(r.at), kick = shake => Math.min(0.5, 0.22 + 0.06 * shake);
    for (const h of own) {
      hits.push({ t: snap(start + h.t), freeze: h.freeze ?? 0, shake: h.shake ?? 0 });
      if (struck) flinches.push({ t: snap(start + h.t), k: kick(h.shake ?? 0) });
    }
    if (r.at === 'path' && !own.length) flinches.push({ t: contact, k: kick(1) });
    if (r.pose && !ride) {
      const t0 = start - windup, now = poseAt(keys, t0);
      while (keys.length && keys.at(-1)[0] >= t0) keys.pop();
      keys.push([t0, now], ...ACTING[r.pose](start, contact, windup).map(([t, name, ease]) => [t, POSES[name], ease]));
    }
  });
  hits.sort((a, b) => a.t - b.t);
  const merged = hits.reduce((out, h) => {
    const last = out.at(-1);
    if (last && Math.abs(last.t - h.t) < 1e-6) (last.freeze = Math.max(last.freeze, h.freeze)), (last.shake = Math.max(last.shake, h.shake));
    else out.push({ ...h });
    return out;
  }, []);
  const loop = acts.some(a => a.end === Infinity), d = acts.find(a => a.end === Infinity)?.mod.meta.duration;
  const duration = loop
    ? Math.ceil(2 / d) * d
    : Math.max(...acts.map(a => a.stop), ...flinches.map(f => f.t + SETTLE), keys.at(-1)?.[0] ?? 0) + 0.2;
  return { D, acts, hits: merged, flinches, keys, duration, loop };
}

/** The dummy's tilt (radians, back from the swordsman) and hit flash at t: a kick on each hit that wobbles back. */
export function dummyAt(flinches, t) {
  let tilt = 0, hit = false;
  for (const f of flinches) {
    const u = t - f.t;
    if (u < -1e-6) continue;
    tilt += f.k * Math.exp(-5 * u) * Math.cos(18 * u);
    hit ||= u < 1 / FPS - 1e-6;
  }
  return { tilt, hit };
}

// Composites a frame over an opaque RGBA image at (X0, Y0), as composite() does over a background.
function over(out, W, H, f, pal, X0, Y0) {
  for (let y = Math.max(0, -Y0); y < f.h && Y0 + y < H; y++) {
    for (let x = Math.max(0, -X0); x < f.w && X0 + x < W; x++) {
      const i = (y * f.w + x) * 2, ca = f.color[i + 1] / 255, lk = f.light[i + 1] / 255;
      if (!ca && !lk) continue;
      const ci = f.color[i] * 4, li = f.light[i] * 4, o = ((Y0 + y) * W + X0 + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = pal[ci + c] * ca + pal[li + c] * lk + out[o + c] * (1 - ca);
    }
  }
}

/**
 * A stage acting out `steps` ([{ mod, id, on, opts }], see plan); `o` (palette, seed...) goes to every effect, over a
 * step's own opts. draw(t, rgba, bg, flip) paints stage time t (seconds, never going back) into a Uint8ClampedArray of
 * size[0] x size[1] pixels over bg ([r, g, b]), mirrored with flip.
 */
export function createStage(steps, o = {}) {
  const P = plan(steps), first = P.acts.find(a => a.role.pose) ?? P.acts[0];
  const pal = actorPalette(o.palette ?? first.opts?.palette ?? first.mod.meta.options?.palette ?? 'holy'), C = pal.index;
  // the canvas holds both actors (a raised, glowing sword; a tilted dummy) and every effect at each place it goes
  const boxes = [[-20, -48, 26, 3], [P.D - 16, -38, P.D + 22, 3]];
  for (const a of P.acts) {
    const { size: [w, h], origin: [ox, oy] } = a.mod.meta;
    for (const [x, y] of [a.from, a.to]) boxes.push([x - ox, y - oy, x - ox + w, y - oy + h]);
  }
  const x0 = Math.floor(Math.min(...boxes.map(b => b[0]))) - 2, y0 = Math.floor(Math.min(...boxes.map(b => b[1]))) - 2;
  const W = Math.ceil(Math.max(...boxes.map(b => b[2]))) + 2 - x0, H = Math.ceil(Math.max(...boxes.map(b => b[3]))) + 2 - y0;
  const hero = createFrame(56, 64, 26, 54), dummy = createFrame(56, 52, 28, 46);
  const live = P.acts.map(a => ({ ...a, fx: null, frame: createFrame(...a.mod.meta.size, ...a.mod.meta.origin) }));

  const shadow = (p, x, r) => { for (let i = -r; i <= r; i++) p.blend(x + i, 0, C.stone[0], Math.abs(i) === r ? 0.2 : 0.4); };

  return {
    size: [W, H], fps: FPS, duration: P.duration, loop: P.loop, hits: P.hits, plan: P,
    draw(t, out, bg = [27, 29, 38], flip = false) {
      for (let i = 0; i < W * H * 4; i += 4) out.set([bg[0], bg[1], bg[2], 255], i);
      const shown = [];
      for (const a of live) {
        const local = t - a.start;
        if (local < 0 || t >= a.stop) continue;
        a.fx ??= createFx(a.mod, { ...a.opts, ...o });
        const fps = a.mod.meta.fps ?? 30;
        a.fx.update(Math.floor(local * fps + 1e-6) / fps - a.fx.t);
        if (t >= a.end) a.fx.stop();
        const u = a.travel ? Math.min(1, local / a.travel) : 0, [fx, fy] = a.from, [tx, ty] = a.to;
        shown.push([a, Math.round(fx + (tx - fx) * u) - a.frame.ox - x0, Math.round(fy + (ty - fy) * u) - a.frame.oy - y0]);
      }
      const layer = name => shown.forEach(([a, X, Y]) => {
        clearFrame(a.frame);
        a.fx.draw(a.frame, name);
        over(out, W, H, a.frame, a.fx.palette, X, Y);
      });
      layer('back');

      const q = { ...poseAt(P.keys, t) }, busy = P.keys.length && t >= P.keys[0][0] && t <= P.keys.at(-1)[0];
      if (!busy) q.crouch += Math.floor(t / 0.6) % 2; // breathing
      drawHero(new Painter(clearFrame(hero)), q, C);
      outline(hero, C.stone[0]);
      shadow(new Painter(hero), Math.round(q.x), q.lift > 4 ? 3 : 5);
      const d = dummyAt(P.flinches, t);
      drawBase(new Painter(clearFrame(dummy)), C);
      drawDummy(new Painter(dummy).place(dummy.ox, dummy.oy, false, d.tilt), C);
      if (d.hit) flash(dummy, C.holy[7]); // the hit frame: a white silhouette, outlined
      outline(dummy, C.stone[0]);
      shadow(new Painter(dummy), 0, 6);
      over(out, W, H, hero, pal.table, -hero.ox - x0, -hero.oy - y0);
      over(out, W, H, dummy, pal.table, P.D - dummy.ox - x0, -dummy.oy - y0);
      layer('front');
      if (flip) for (let y = 0; y < H; y++) for (let a = y * W * 4, b = a + (W - 1) * 4; a < b; a += 4, b -= 4) for (let c = 0; c < 4; c++) [out[a + c], out[b + c]] = [out[b + c], out[a + c]];
      return out;
    },
  };
}

/**
 * The frames a game shows at `fps` while the stage plays, with hit-stop and shake as the gallery plays them: each hit
 * holds its frame for `freeze` seconds and shakes the view by `shake` px, dying down over 0.2 s. [{ t, dx, dy }], t on
 * the stage clock.
 */
export function realtime(hits, duration, fps = FPS) {
  const out = [], dt = 1 / fps;
  let clock = 0, next = 0, freeze = 0, shake = null;
  while (clock < duration) {
    let dx = 0, dy = 0;
    if (shake && (shake.left -= dt) > 0) {
      const k = Math.ceil((shake.px * shake.left) / SHAKE), [sx, sy] = JIGGLE[shake.n++ % 4];
      (dx = sx * k), (dy = sy * k);
    }
    out.push({ t: Math.floor(clock * fps + 1e-6) / fps, dx, dy });
    if (freeze > 1e-9) freeze -= dt; // a freeze of 3 frames is 3 frames, not 4 by a rounding error
    else if (hits[next] && clock + dt >= hits[next].t) {
      clock = hits[next].t;
      freeze = hits[next].freeze;
      shake = { px: hits[next++].shake, left: SHAKE + dt, n: 0 };
    } else clock += dt;
  }
  return out;
}
