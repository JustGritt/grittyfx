// The stage acts effects out: a caster that fits the effect (a knight, a mage, a priest, an archer, a kunoichi, a soldier or a gunner) winds up for its
// act.windup, the effect plays where its role puts it, the game freezes and shakes on each hit while a goblin recoils,
// then both recover. The goblin only stands in for effects that strike it: a buff, a pickup or a prop plays with the
// caster alone. A move chains effects.
// The gallery (its Caster and Target toggles) and `render --stage` use it. It is not part of the package's API: games
// bring their own characters. Side view only.
//
// role(meta, id)         where and how an effect is acted: meta.stage over its tags, then its category; meta.stage.pose
//                        names one of ACTS
// plan(steps)            when and where each step plays, the hits, the goblin's flinches, the caster's poses
// createStage(steps, o, show, cast)  { size, floor, fps, duration, loop, hits, draw(t, rgba, bg, flip) }; o: effect
//                        options for every step, show: { caster, target }, the layers drawn, cast: { foe, tint }
// realtime(hits, d, fps) the frames a game shows at fps, with hit-stop and shake: [{ t, dx, dy }]
import { createFx, createFrame, clearFrame, Painter, rand } from '../core/index.js';
import { actorPalette, CAST, CASTERS, frameOf, runOf, frameAt, seconds, bounds, drawFrame, flash } from './actors.js';

export const FPS = 30;
export const PLACES = ['target', 'caster', 'ground', 'path', 'above', 'aside'];
const BY_TAG = { projectile: 'path', aura: 'caster', buff: 'caster', pickup: 'caster', status: 'above', nova: 'ground', ambient: 'aside' };
const BY_CATEGORY = { projectiles: 'path', status: 'above', pickups: 'caster' };
const STRUCK = ['target', 'path', 'above']; // the places that need the goblin
export const HIT = 11; // the goblin's chest, px above the floor: where blows land
const HEAD = -CAST.goblin.idle[0].y; // the top of the goblin's head, where a status over it anchors
export const NEAR = 26, FAR = 76; // the caster's feet to the goblin's: a sword's reach, or room for a projectile
const SPEED = 200; // px/s of a looping projectile
const LEAD = 0.4; // idle before the first wind-up
const PLAY = 1.6; // a loop plays at least this long, then fades out
const FADE = 0.3; // fx.stop()'s fade
const SETTLE = 0.9; // the goblin recovers this long after a hit
const WINDUP = { strike: 0.15, thrust: 0.15, uppercut: 0.15, spin: 0.15, point: 0.3, raise: 0.3, open: 0.3, slam: 0.3, dash: 0.25, hop: 0.4, leap: 0.25, airjump: 0.4, run: 0, cling: 0 }; // when act.windup is left out
const KNIGHT = ['melee', 'pickup']; // tags a knight acts; a projectile that isn't magic is the archer's
const ROGUE = ['slash', 'vanish', 'thrown']; // tags the kunoichi acts, and every shadow/ effect
const MELEE = ['strike', 'thrust', 'uppercut', 'spin'];
const DASH = 32, DASHING = 0.3; // px a dash carries the caster forward, in s
const LOOPS = ['run', 'cling']; // looks that loop, played from the start of the stage so that it loops too // acts in a sword's reach of the goblin

/**
 * The caster's poses, which each caster draws its own way (CASTERS in actors.js): x steps forward and lift raises the
 * feet (px), glow lights the tip in the spell's colors.
 */
export const POSES = Object.fromEntries(Object.entries({
  idle: [0, 0, 0], ready: [-1, 0, 0], swing: [2, 0, 0], follow: [2, 0, 0], gather: [-1, 0, 0.6],
  point: [1, 0, 1], raise: [0, 0, 1], crouch: [0, 0, 0], air: [0, 9, 0], aim: [-1, 0, 0], lunge: [3, 0, 0],
  low: [-1, 0, 0], rise: [1, 0, 0], spin: [0, 0, 0], run: [0, 0, 0], kneel: [0, 0, 0], open: [0, 0, 0],
  lift: [-1, 0, 0.6], slam: [0, 0, 1], dash: [0, 0, 0], high: [0, 18, 0], cling: [0, 10, 0],
}).map(([look, [x, lift, glow]]) => [look, { look, x, lift, glow }]));
// a pose that looks like another at another place: the dash's far end, and standing there after it
POSES.dashed = { ...POSES.dash, x: DASH };
POSES.arrived = { ...POSES.idle, x: DASH };
const PUSH = 6; // px a goblin is knocked back at most

// The set a prop stands in (meta.stage.scenery), drawn behind it from its anchor: put(x, y, rgb, k) blends px right and
// down of it. Fixed colors, like the floor's: char, wood, iron; a pool takes its water from the effect's first ramp.
const INK = { k: [36, 22, 15], w: [110, 68, 37], W: [160, 106, 56], i: [59, 63, 78], I: [107, 113, 134] };
const paint = (put, rows, x) => rows.forEach((row, y) => [...row].forEach((c, i) => c !== '.' && put(x + i - (row.length >> 1), y, INK[c])));
export const SCENERY = {
  // a wall torch's charred head, its stick and the iron band holding it to the wall, under fire/torch's flame (which
  // covers the top 6 rows)
  sconce: put => paint(put, ['.kkkkk.', '.kWWwk.', '.kWWwk.', '..kWk..', '..kWk..', '..kWk..', 'IiiiiiI', '.iIIIi.',
    '..kWk..', '..kWk..', '..kwk..', '..kwk..', '..kwk..', '...k...'], 0),
  // the two terminals electric/arc jumps between: iron rods from its contact points, 18 px either side, to the floor
  posts: (put, a) => [-18, 18].forEach(x => paint(put, Array.from({ length: a.role.ground }, (_, y) => (y < 2 ? '.iIi.' : y >= a.role.ground - 2 ? 'kiIik' : '.kik.')), x)),
  // a pool level with the floor round the anchor, as wide as the effect and deep enough for its lower half, rounded
  pool: (put, a) => {
    const [w, h] = a.mod.meta.size, { from, steps } = a.fx.ramps[0], depth = h - a.mod.meta.origin[1] + 1;
    const water = i => [...a.fx.palette.subarray(i * 4, i * 4 + 3)], deep = water(from + 1), top = water(from + (steps >> 1));
    for (let y = 0; y < depth; y++) {
      const half = Math.round((w / 2) * Math.sqrt(1 - (y / depth) ** 2));
      for (let x = -half; x < half; x++) put(x, y, y ? deep : top, y ? 0.6 : 0.9);
    }
  },
  // a rock face from the floor up to a ledge 58 px over it, for water/waterfall to pour off: a stepped outline flaring
  // into rubble at its foot, lit on its left, cracks either side of the water, the ledge jutting out on top
  cliff: put => {
    for (let y = -61; y < 0; y++) {
      const ledge = y < -57, w = ledge ? 15 : 11 + Math.max(0, y + 9) * 0.6;
      const l = Math.round(w + rand(y >> 2, 1) * 3), r = Math.round(w + rand(y >> 2, 2) * 3);
      const crack = !ledge && rand(y, 3) < 0.25 ? (rand(y, 4) < 0.5 ? -l + 2 : r - 6) : null;
      for (let x = -l; x < r; x++) {
        const rim = x === -l || x === r - 1 || y === -61, cut = crack !== null && x >= crack && x < crack + 3;
        put(x, y, INK[rim || cut ? 'k' : y === -60 || x < -l + 3 ? 'I' : 'i']);
      }
    }
  },
  // a brick wall for movement/wall-slide to scrape down: its face on the anchor's column (the scrape mark's), 12 px
  // thick to the right, from the floor up past the canvas top (which crops it), lit along its face
  wall: (put, a) => {
    for (let y = -80; y < a.role.ground; y++) {
      const v = a.role.ground - 1 - y, course = Math.floor(v / 6), joint = course % 2 ? 4 : 9;
      for (let x = 0; x < 12; x++) put(x, y, INK[x === 0 || v % 6 === 5 || x === joint ? 'k' : x < 3 ? 'I' : 'i']);
    }
  },
};
const SHAKE = 0.2, JIGGLE = [[1, 0], [-1, 1], [1, -1], [-1, 0]]; // as in the gallery

/**
 * Where and how an effect is acted: { at, pose, cast, x, ground, speed, scenery }, and meta.stage's other fields
 * (hold, hide, move, looks, waits: see plan). `at` is one of PLACES, from meta.stage.at,
 * else its tags (projectile: path, aura, buff, pickup: caster, status: above, nova: ground, ambient: aside), else its
 * category, else target. `ground` is the floor's y in the effect's own coordinates (how high its anchor sits), `x`
 * shifts it toward the goblin, `speed` is a looping projectile's in px/s, `arc` lifts a projectile's path into a
 * parabola that many px high at its middle (a lob: thrown things fall), `scenery` the SCENERY drawn behind it (a
 * prop's sconce, posts or pool). `pose` is how the caster acts it: strike (a
 * melee effect on the target), hop (a landing on the ground), leap (a jump: takes off from it), airjump (a jump tagged
 * air: kicks off it in mid-air), raise (on the caster), point (anything else), none
 * (aside). `cast` is who: meta.stage.cast, else the gunner for a military rocket and the soldier for any other military effect, else the kunoichi for a slash, a vanish, a thrown weapon or a shadow/ effect, a knight
 * for a strike, a hop, a leap or a pickup, the priest for a holy/ effect, an archer for a projectile that isn't magic or a
 * spell, else a mage.
 */
export function role(meta, id = '') {
  const tags = meta.tags ?? [], s = meta.stage ?? {};
  const at = s.at ?? BY_TAG[tags.find(t => BY_TAG[t])] ?? BY_CATEGORY[id.split('/')[0]] ?? 'target';
  const pose = s.pose !== undefined ? s.pose : at === 'aside' ? null
    : at === 'ground' && tags.includes('landing') ? 'hop'
    : at === 'ground' && tags.includes('jump') ? (tags.includes('air') ? 'airjump' : 'leap')
    : at === 'caster' || at === 'ground' ? 'raise'
    : at === 'target' && (tags.includes('melee') || tags.includes('slash')) ? 'strike' : 'point';
  const cast = s.cast ?? (tags.includes('military') ? (tags.includes('rocket') ? 'gunner' : 'soldier')
    : tags.some(t => ROGUE.includes(t)) || id.startsWith('shadow/') ? 'kunoichi'
    : MELEE.includes(pose) || pose === 'hop' || pose === 'leap' || pose === 'airjump' || tags.some(t => KNIGHT.includes(t)) || id.startsWith('pickups/') ? 'knight'
    : id.startsWith('holy/') ? 'priest'
    : at === 'path' && !tags.includes('magic') && !tags.includes('spell') ? 'archer' : 'mage');
  const ground = s.ground ?? (at === 'target' || at === 'path' ? HIT : at === 'above' ? HEAD : 0);
  return { ...s, at, pose, cast, x: s.x ?? 0, ground, speed: s.speed ?? SPEED, scenery: s.scenery };
}

const snap = t => Math.round(t * FPS) / FPS; // hits land on a frame, as in a bundle

/** Where an act is u (0 to 1) along its path: the straight line from `from` to `to`, lifted `arc` px at its middle. */
export const along = ({ from: [fx, fy], to: [tx, ty], role }, u) => [fx + (tx - fx) * u, fy + (ty - fy) * u - 4 * (role.arc ?? 0) * u * (1 - u)];
/** Its heading there, radians clockwise from +x: a projectile points where it flies, down its line or over its arc. */
export const heading = ({ from: [fx, fy], to: [tx, ty], role }, u) => Math.atan2(ty - fy - 4 * (role.arc ?? 0) * (1 - 2 * u), tx - fx);
const IO = u => u * u * (3 - 2 * u), OUT = u => 1 - (1 - u) ** 2, IN = u => u * u, LINEAR = u => u;
// The caster's keys for one acted step: [t, pose, ease into it], from its start s, first contact c, wind-up w and the
// time h a held pose lasts to (a beam's end). A cast lands on the frame its spell or shot appears.
const ACTING = {
  strike: (s, c, w) => [[s - w * 0.5, 'ready', OUT], [s, 'ready'], [c, 'swing', LINEAR], [c + 0.1, 'swing'], [c + 0.22, 'follow', OUT], [c + 0.6, 'idle', IO]],
  thrust: (s, c, w) => [[s - w * 0.5, 'aim', OUT], [s, 'aim'], [c, 'lunge', LINEAR], [c + 0.3, 'lunge'], [c + 0.65, 'idle', IO]],
  uppercut: (s, c, w) => [[s - w * 0.5, 'low', OUT], [s, 'low'], [c, 'rise', LINEAR], [c + 0.3, 'rise'], [c + 0.7, 'idle', IO]],
  spin: (s, c, w) => [[s - w * 0.5, 'aim', OUT], [s, 'aim'], [c, 'spin', LINEAR], [c + 0.47, 'spin'], [c + 0.8, 'idle', IO]],
  run: s => [[s, 'run', LINEAR]],
  cling: s => [[s, 'cling', LINEAR]], // on a wall to the right, held there while the loop runs
  open: (s, c, w) => [[s - w * 0.6, 'kneel', OUT], [Math.max(s - w * 0.6, s - 1 / FPS), 'kneel'], [s, 'open', LINEAR], [s + 0.9, 'open'], [s + 1.4, 'idle', IO]],
  slam: (s, c, w) => [[s - w * 0.6, 'lift', OUT], [Math.max(s - w * 0.6, s - 1 / FPS), 'lift'], [s, 'slam', LINEAR], [s + 0.5, 'slam'], [s + 0.9, 'idle', IO]],
  dash: (s, c, w) => [[s - w * 0.6, 'crouch', OUT], [Math.max(s - w * 0.6, s - 1 / FPS), 'crouch'], [s, 'dash', LINEAR], [s + DASHING, 'dashed', LINEAR], [s + DASHING + 0.15, 'arrived', OUT]],
  point: (s, c, w, h = 0) => {
    const k = Math.max(c + 0.15, s + 0.35, h);
    return [[s - w * 0.6, 'gather', OUT], [Math.max(s - w * 0.6, s - 1 / FPS), 'gather'], [s, 'point', LINEAR], [k, 'point'], [k + 0.4, 'idle', IO]];
  },
  raise: (s, c, w, h = 0) => [[s - w * 0.6, 'crouch', OUT], [Math.max(s - w * 0.6, s - 1 / FPS), 'crouch'], [s, 'raise', LINEAR], [Math.max(c, s + 0.3, h - 0.2) + 0.2, 'raise'], [Math.max(c, s + 0.3, h - 0.2) + 0.6, 'idle', IO]],
  hop: (s, c, w) => [[s - w * 0.8, 'crouch', OUT], [s - w * 0.4, 'air', OUT], [s, 'crouch', IN], [s + 0.15, 'crouch'], [s + 0.45, 'idle', IO]],
  leap: (s, c, w) => [[s - w * 0.7, 'crouch', OUT], [s, 'crouch'], [s + 0.14, 'air', OUT], [s + 0.28, 'air'], [s + 0.42, 'crouch', IN], [s + 0.55, 'crouch'], [s + 0.85, 'idle', IO]],
  // up off the floor in the wind-up, at the air pose's height on the effect, kicking higher off it, then down
  airjump: (s, c, w) => [[s - w * 0.8, 'crouch', OUT], [s - w * 0.55, 'crouch'], [s - w * 0.2, 'air', OUT], [s, 'air'], [s + 0.14, 'high', OUT], [s + 0.3, 'high'], [s + 0.56, 'crouch', IN], [s + 0.66, 'crouch'], [s + 0.96, 'idle', IO]],
};
export const ACTS = Object.keys(ACTING); // the ways to act an effect, for meta.stage.pose

// How far through a move to its key the look switches: halfway through an eased move, on the key itself for a cut
// (LINEAR: a strike's contact, a cast's release), so that the pose lands with the hit.
const switchAt = ease => {
  if (ease === LINEAR) return 1;
  let lo = 0, hi = 1;
  while (hi - lo > 1e-9) {
    const m = (lo + hi) / 2;
    ease(m) < 0.5 ? (lo = m) : (hi = m);
  }
  return hi;
};

/** The caster's pose at t from keys [[t, pose, ease], ...]: idle before the first; numbers ease, the look switches at switchAt. */
export function poseAt(keys, t) {
  const k = keys.findIndex(key => key[0] > t);
  if (k === 0 || !keys.length) return POSES.idle;
  if (k < 0) return keys.at(-1)[1];
  const [t0, a] = keys[k - 1], [t1, b, ease = IO] = keys[k], r = (t - t0) / (t1 - t0), u = ease(r);
  return Object.fromEntries(Object.keys(a).map(n => [n, typeof a[n] === 'string' ? (r < switchAt(ease) ? a : b)[n] : a[n] + (b[n] - a[n]) * u]));
}

/** Where the caster's look changes, from pose keys: [{ look, t }], idle first, switching where poseAt does. */
export function looks(keys) {
  const out = [{ look: POSES.idle.look, t: -Infinity }];
  keys.forEach(([t1, b, ease = IO], k) => {
    const t0 = k ? keys[k - 1][0] : t1;
    if (b.look !== out.at(-1).look) out.push({ look: b.look, t: t0 + (t1 - t0) * switchAt(ease) });
  });
  return out;
}

const WINDUPS = ['ready', 'gather', 'crouch', 'aim', 'low', 'kneel', 'lift']; // looks that lead into an action

/**
 * Seconds into its run at t for the look `ls` (looks()) has then: a wind-up's run ends as the action after it comes in
 * (holding its first frame when it has longer), anything else's starts with the look.
 */
export function into(ls, t, run) {
  const i = ls.findLastIndex(l => l.t <= t + 1e-9), next = ls[i + 1];
  return WINDUPS.includes(ls[i].look) && next && next.look !== 'idle' ? seconds(run) - (next.t - t) : t - ls[i].t;
}

/**
 * When and where each step plays. steps: [{ mod, id, on, stage }]; a step starts once the one before it ends, after its
 * own wind-up, or with `on: 'hit'` so that its first hit lands with the previous step's first contact; `stage` places it
 * over its meta.stage. Positions are in px
 * with the caster's feet at (0, 0), the goblin's at (D, 0), y down. Returns { D, who, foe, acts, hits, flinches, keys,
 * duration, loop }: who acts (the first acted step's cast), whether the goblin is on stage (a step strikes it; a prop
 * aside stands NEAR the caster), acts [{ mod, role, start, end, stop, travel, from, to,
 * contact }], hits [{ t, freeze, shake }] merged where they coincide, the goblin's flinches [{ t, k }], the caster's
 * pose keys, hidden [[t0, t1]] (spans the caster is out of sight) and moves [[t, dx]] (px the caster steps forward at
 * t, for good). A projectile leaves from the caster's tip as it shoots. A step on hit acts nothing unless `acted`.
 * meta.stage acting fields, in the effect's seconds: hold (true: a cast keeps pointing, a raise stays up, to the effect's end), hide
 * ([t0, t1]: the caster is gone from t0 to t1, or for good), move ([t, dx]), looks ({ pose: tag or [tag, stand-in...] }:
 * the caster's own tags for this effect, the first it has drawn); waits (true: createStage shows its first frame from the stage's start until
 * it plays, the chest standing there).
 */
export function plan(steps) {
  const roles = steps.map(s => role(s.stage ? { ...s.mod.meta, stage: { ...s.mod.meta.stage, ...s.stage } } : s.mod.meta, s.id));
  const acting = roles.filter((r, i) => r.pose && !(i && steps[i].on === 'hit'));
  const foe = roles.some(r => STRUCK.includes(r.at));
  // in a sword's reach for blows, and for a charge or a buff on the caster before one
  const D = !foe || (acting.some(r => MELEE.includes(r.pose)) && acting.every(r => MELEE.includes(r.pose) || !STRUCK.includes(r.at))) ? NEAR : FAR;
  const who = (acting[0] ?? roles[0]).cast, tip = frameOf(who, 'point').tip;
  const acts = [], hits = [], flinches = [], keys = [], hidden = [], moves = [];
  steps.forEach((s, i) => {
    const r = roles[i], { meta } = s.mod, own = meta.act?.hits ?? [], prev = acts[i - 1], ride = prev && s.on === 'hit';
    const windup = ride || !r.pose ? 0 : meta.act?.windup ?? WINDUP[r.pose];
    const start = snap(ride ? prev.contact - (own[0]?.t ?? 0) : (prev ? prev.end : r.pose && !LOOPS.includes(r.pose) ? LEAD : 0) + windup); // a prop is there from the start
    const from = r.at === 'path' ? [tip[0] + POSES.point.x + r.x, tip[1]] : [{ target: D, above: D, caster: 0, ground: 0, aside: foe ? D / 2 : NEAR }[r.at] + r.x, -r.ground];
    const to = r.at === 'path' ? [D + r.x, -r.ground] : r.pose === 'dash' ? [from[0] + DASH, from[1]] : from; // a dash's trail goes with her
    // a projectile arrives on its first hit, or at its end, or (a loop) after flying the distance
    const travel = r.at === 'path' ? own[0]?.t ?? (meta.loop ? (to[0] - from[0]) / r.speed : meta.duration) : r.pose === 'dash' ? DASHING : 0;
    const contact = snap(start + (r.at === 'path' ? travel : own[0]?.t ?? 0));
    const play = meta.loop ? (r.at === 'path' ? travel : r.at === 'aside' ? Infinity : Math.max(PLAY, meta.duration)) : meta.duration;
    const end = start + play, stop = meta.loop && r.at !== 'path' ? end + FADE : end;
    acts.push({ mod: s.mod, opts: s.opts, role: r, start, end, stop, travel, from, to, contact });

    const struck = STRUCK.includes(r.at), kick = shake => Math.min(0.5, 0.22 + 0.06 * shake);
    for (const h of own) {
      hits.push({ t: snap(start + h.t), freeze: h.freeze ?? 0, shake: h.shake ?? 0 });
      if (struck) flinches.push({ t: snap(start + h.t), k: kick(h.shake ?? 0) });
    }
    if (r.at === 'path' && !own.length) flinches.push({ t: contact, k: kick(1) });
    if (r.pose && (!ride || s.acted)) {
      const t0 = start - windup, now = poseAt(keys, t0), tag = name => [r.looks?.[name]].flat().find(t => CAST[who][t]);
      const look = name => (tag(name) ? { ...POSES[name], look: tag(name) } : POSES[name]);
      while (keys.length && keys.at(-1)[0] >= t0) keys.pop();
      keys.push([t0, now], ...ACTING[r.pose](start, contact, windup, r.hold ? end : 0).map(([t, name, ease]) => [t, look(name), ease]));
    }
    if (r.hide) hidden.push([start + r.hide[0], start + (r.hide[1] ?? Infinity)]);
    if (r.move) moves.push([start + r.move[0], r.move[1]]);
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
  return { D, who, foe, acts, hits: merged, flinches, keys, hidden, moves, duration, loop };
}

/**
 * The goblin at t: dx, px knocked back from the caster by each hit and easing back; hit on a hit's frame (its white
 * flash); hurt for 0.3 s after one (its hurt pose).
 */
export function targetAt(flinches, t) {
  let push = 0, hit = false, hurt = false;
  for (const f of flinches) {
    const u = t - f.t;
    if (u < -1e-6) continue;
    push += f.k * Math.exp(-7 * u);
    hit ||= u < 1 / FPS - 1e-6;
    hurt ||= u < 0.3;
  }
  return { dx: Math.min(PUSH, Math.round(push * 8)), hit, hurt };
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

// Mirrors an RGBA image left to right, in place.
function mirror(out, W, H) {
  for (let y = 0; y < H; y++) for (let a = y * W * 4, b = a + (W - 1) * 4; a < b; a += 4, b -= 4) for (let c = 0; c < 4; c++) [out[a + c], out[b + c]] = [out[b + c], out[a + c]];
}

/**
 * A stage acting out `steps` ([{ mod, id, on, opts }], see plan); `o` (palette, seed...) goes to every effect, over a
 * step's own opts. draw(t, rgba, bg, flip) paints stage time t (seconds, never going back) into a Uint8ClampedArray of
 * size[0] x size[1] pixels over bg ([r, g, b], or an RGBA image of that size, which flip leaves unmirrored), mirrored
 * with flip. `floor` is the row the actors stand on. `show.caster` and `show.target` false leave that actor out; the
 * effects play the same. `cast.foe` takes the hits (the goblin, or the slime) and `cast.tint` recolors actors
 * ({ name: tint }, see tinted() in actors.js).
 */
export function createStage(steps, o = {}, show = {}, { foe = 'goblin', tint = {} } = {}) {
  const P = plan(steps), first = P.acts.find(a => a.role.pose) ?? P.acts[0], who = P.who, L = looks(P.keys);
  const pal = actorPalette(o.palette ?? first.opts?.palette ?? first.mod.meta.options?.palette ?? 'holy', [who, foe], tint), C = pal.index;
  // the canvas holds the actors in every pose (stepping, hopping, knocked back), whether shown or not, so switching
  // one off keeps the layout, and every effect at each place it goes
  const [cx0, cy0, cx1] = bounds(who), [gx0, gy0, gx1] = bounds(foe), hop = Math.max(0, ...P.keys.map(k => k[1].lift)), xs = P.keys.map(k => k[1].x);
  const stepped = t => P.moves.reduce((dx, m) => dx + (t >= m[0] ? m[1] : 0), 0), far = stepped(Infinity);
  const box = dx => [cx0 + Math.min(-2, ...xs.map(x => x - 1)) + dx, cy0 - hop - 1, cx1 + Math.max(4, ...xs.map(x => x + 1)) + dx, 3];
  const boxes = [box(0), box(far)];
  if (P.foe) boxes.push([P.D + gx0 - 1, gy0 - 1, P.D + gx1 + PUSH + 1, 3]);
  for (const a of P.acts) {
    const { size: [w, h], origin: [ox, oy] } = a.mod.meta;
    for (const [x, y] of [a.from, a.to, along(a, 0.5)]) boxes.push([x - ox, y - oy, x - ox + w, y - oy + h]); // its ends and its arc's peak
  }
  const x0 = Math.floor(Math.min(...boxes.map(b => b[0]))) - 2, y0 = Math.floor(Math.min(...boxes.map(b => b[1]))) - 2;
  const W = Math.ceil(Math.max(...boxes.map(b => b[2]))) + 2 - x0, H = Math.ceil(Math.max(...boxes.map(b => b[3]))) + 2 - y0;
  const hero = createFrame(72, 64, 36, 58), goblin = createFrame(72, 64, 36, 58);
  const live = P.acts.map(a => {
    const { size: [w, h], origin: [ox, oy] } = a.mod.meta, r = Math.ceil(Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)));
    // a projectile turns with its heading: its frame is the square its canvas sweeps round its origin
    return { ...a, fx: null, frame: a.role.at === 'path' ? createFrame(2 * r + 1, 2 * r + 1, r, r) : createFrame(w, h, ox, oy) };
  });

  const shadow = (p, x, r) => { for (let i = -r; i <= r; i++) p.blend(x + i, 0, C.ink[0], Math.abs(i) === r ? 0.2 : 0.4); };

  return {
    size: [W, H], floor: -y0, fps: FPS, duration: P.duration, loop: P.loop, hits: P.hits, plan: P,
    draw(t, out, bg = [27, 29, 38], flip = false) {
      if (bg.length > 4) {
        out.set(bg);
        if (flip) mirror(out, W, H); // turned back with the rest at the end
      } else for (let i = 0; i < W * H * 4; i += 4) out.set([bg[0], bg[1], bg[2], 255], i);
      const shown = [];
      for (const a of live) {
        const local = Math.max(0, t - a.start);
        if ((t < a.start && !a.role.waits) || t >= a.stop) continue; // waits: its first frame from the stage's start
        a.fx ??= createFx(a.mod, { ...a.opts, ...o });
        const fps = a.mod.meta.fps ?? 30;
        a.fx.update(Math.floor(local * fps + 1e-6) / fps - a.fx.t);
        if (t >= a.end) a.fx.stop();
        const u = a.travel ? Math.min(1, local / a.travel) : 0, [x, y] = along(a, u);
        if (a.role.at === 'path') a.fx.angle = heading(a, u);
        shown.push([a, Math.round(x) - a.frame.ox - x0, Math.round(y) - a.frame.oy - y0]);
      }
      for (const [a, X, Y] of shown) if (a.role.scenery) SCENERY[a.role.scenery]((x, y, rgb, k = 1) => {
        const px = X + a.frame.ox + x, py = Y + a.frame.oy + y, o = (py * W + px) * 4;
        if (px >= 0 && px < W && py >= 0 && py < H) for (let c = 0; c < 3; c++) out[o + c] += (rgb[c] - out[o + c]) * k;
      }, a);
      const layer = name => shown.forEach(([a, X, Y]) => {
        clearFrame(a.frame);
        a.fx.draw(a.frame, name);
        over(out, W, H, a.frame, a.fx.palette, X, Y);
      });
      layer('back');

      if (show.caster !== false && !P.hidden.some(([t0, t1]) => t >= t0 && t < t1)) {
        // each look plays its run; idle loops, holding its first frame while the caster acts
        const q = poseAt(P.keys, t), busy = P.keys.length && t >= P.keys[0][0] && t <= P.keys.at(-1)[0], run = runOf(who, q.look);
        const f = !busy ? frameAt(run, LOOPS.includes(q.look) ? t - L.at(-1).t : t, true) : q.look === 'idle' ? run[0] : frameAt(run, into(L, t, run)), x = Math.round(q.x), y = -Math.round(q.lift), p = new Painter(clearFrame(hero));
        drawFrame(hero, f, C[who], x, y);
        if (f.tip && q.glow > 0 && CASTERS[who].glow) { // the spell gathers at the tip in its own colors
          p.glow(x + f.tip[0], y + f.tip[1], 8, C.glow[5], 0.7 * q.glow);
          p.px(x + f.tip[0], y + f.tip[1], C.glow[7]);
        }
        shadow(p, x, q.lift > 4 ? 3 : 5);
        over(out, W, H, hero, pal.table, stepped(t) - hero.ox - x0, -hero.oy - y0);
      }
      if (P.foe && show.target !== false) {
        const g = targetAt(P.flinches, t);
        const since = t - Math.max(...P.flinches.filter(f => f.t <= t + 1e-9).map(f => f.t)); // the last hit, when hurt
        drawFrame(clearFrame(goblin), g.hurt ? frameAt(runOf(foe, 'hurt'), since) : frameAt(runOf(foe, 'idle'), t + 0.3, true), C[foe], g.dx);
        if (g.hit) flash(goblin, C.ink[1]); // the hit frame: a white silhouette
        shadow(new Painter(goblin), 0, 6);
        over(out, W, H, goblin, pal.table, P.D - goblin.ox - x0, -goblin.oy - y0);
      }
      layer('front');
      if (flip) mirror(out, W, H);
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
