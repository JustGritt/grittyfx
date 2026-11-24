import { Rng, Particles, Lights, Bits, SPARK, DUST } from '../../core/index.js';

export const meta = {
  name: 'Heavy hit',
  desc: 'A crushing blow: a white hero frame, a broken shock ring, then a glowing crack splits the floor under the target and throws up debris and dust',
  tags: ['impact', 'hit', 'heavy', 'melee', 'crack', 'debris'],
  size: [104, 64],
  origin: [48, 38],
  duration: 0.9,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, debris: 4, dust: 5 },
  options: { palette: 'fire', debris: 'stone', dust: 'dust', seed: 1 },
  act: { windup: 0.2, hits: [{ t: 1 / 30, freeze: 0.14, shake: 4 }] },
  stage: { ground: 18 },
  sound: [
    { t: 1 / 30, kind: 'thump', pitch: 0.7 },
    { t: 1 / 30, kind: 'crack', gain: 0.8, pitch: 0.8 },
    { t: 0.08, kind: 'crack', gain: 0.4, pitch: 0.45 }, // the floor splitting
    { t: 0.4, kind: 'crack', gain: 0.12, pitch: 2.4 }, // debris landing
    { t: 0.55, kind: 'crack', gain: 0.08, pitch: 2.8 },
  ],
};

const HERO = 1 / 30; // the white frame, where the hit lands
const GROUND = 18; // the floor, below the contact point
const FLAT = 0.45; // the floor seen from a low angle: depth squashed to this
const REACH = 28; // how far the crack runs
const clamp01 = v => Math.max(0, Math.min(1, v));

// The crack: two lines that wander left and right over the floor from under the contact, with forks running off
// toward and away from the viewer. Each line knows how far along the crack it starts, so it grows out of its parent.
function crack(rng) {
  const lines = [];
  const grow = (x, z, base, len, from) => {
    const pts = [[x, z]], at = [from];
    for (let d = 0, a = base; d < len; ) {
      const s = rng.range(2.5, 4.5);
      a = base + (a - base) * 0.3 + rng.range(-1, 1); // zigzags, but keeps its heading
      x += Math.cos(a) * s;
      z = Math.max(-12, Math.min(12, z + Math.sin(a) * s));
      pts.push([x, z]);
      at.push(from + (d += s));
    }
    lines.push({ pts: pts.map(([x, z]) => [x, GROUND + z * FLAT]), at });
    return { pts, at };
  };
  for (const base of [0, Math.PI]) {
    const main = grow(0, 0, base + rng.range(-0.3, 0.3), rng.range(18, 26), 0);
    for (let i = 0; i < 2; i++) {
      const k = Math.min(rng.int(1 + i * 3, 3 + i * 3), main.pts.length - 1); // a short crack has as few as 5 points
      grow(...main.pts[k], base + rng.pick([-1, 1]) * rng.range(0.8, 1.3), rng.range(4, 8), main.at[k]);
    }
  }
  return lines;
}

// A crack line grown out to distance `reach`, the last segment cut where the front is.
function grown({ pts, at }, reach) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length && at[i - 1] < reach; i++) {
    const u = Math.min(1, (reach - at[i - 1]) / (at[i] - at[i - 1])), [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    out.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]);
  }
  return out;
}

// The flash: a contact star, the white hero star with a beam driven into the floor, then a shrinking colored star,
// and a shock ring cut off by the floor.
function flash(p, t, C) {
  if (t < HERO) {
    p.circle(0.5, 0.5, 3.2, C[7]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.line(0, 0, dx * 7, dy * 6, C[7]);
  } else if (t < HERO * 2) {
    p.circle(0.5, 0.5, 7, C[7]);
    p.beam(0.5, 0.5, 24, 0.5, 5, C[7]);
    p.beam(0.5, 0.5, -13, 0.5, 3, C[7]);
    p.beam(0.5, 0.5, 0.5, -15, 3, C[7]);
    p.beam(0.5, 0.5, 0.5, GROUND, 3, C[7]);
    for (const [dx, dy, l] of [[1, 1, 10], [1, -1, 11], [-1, 1, 7], [-1, -1, 7]]) p.line(0, 0, dx * l, dy * l, C[7]);
  } else if (t < 0.26) {
    const u = (t - HERO * 2) / (0.26 - HERO * 2), ease = 1 - (1 - u) ** 3, l = 14 * (1 - u) ** 1.6;
    p.circle(0.5, 0.5, 5 * (1 - u) ** 1.5, C[u < 0.25 ? 7 : 6]);
    for (const [dx, dy] of [[1.4, 0], [-0.9, 0], [0, 1], [0, -1]]) p.line(0, 0, dx * l, dy * l * 0.8, s => C[s < 0.5 ? 6 : 5]);
    if (u < 0.55) {
      // broken into arcs, cut off by the floor, thinning as it flies out
      const gaps = (dx, dy) => (dy < GROUND && Math.sin(Math.atan2(dy, dx) * 5 + 1) > -0.7 ? 1 : 0);
      p.ring(0.5, 0.5, 9 + ease * 26, 4 * (1 - u / 0.55) + 0.8, (dx, dy, e) => C[e > 0 ? 6 : 4], gaps);
    }
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, D = o.debris;
  const parts = new Particles({ rng, palette: C, dust: o.dust, ground: GROUND });
  const lights = new Lights();
  const bits = new Bits({
    rng,
    ground: GROUND,
    gravity: 520, // heavy chunks: a short hop, a hard landing
    onLand: b => {
      if (b.vy < 60 || b.age > 0.5) return; // a hard landing, early enough for its dust to settle
      parts.spawn(DUST, b.x, GROUND - 1, rng.range(-20, 20), rng.range(-10, -4), rng.range(0.25, 0.35), { size: rng.range(1.5, 2.2) });
    },
  });
  const lines = crack(rng);

  lights.add(0, 0, 18, C[7], 1, 0.12);
  lights.add(0, 0, 26, C[5], 0.85, 0.5, { delay: 0.06 });
  for (let i = 0; i < 18; i++) {
    const back = i >= 13; // most sparks fly with the hit, a few spray back
    const a = back ? rng.range(Math.PI * 0.6, Math.PI * 1.4) : rng.range(-1.4, 0.5);
    const v = back ? rng.range(40, 70) : rng.range(70, 135);
    parts.spawn(SPARK, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.2, back ? 0.3 : 0.45), { delay: HERO });
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      parts.spawn(DUST, side * rng.range(2, 8), GROUND - 1, side * rng.range(50, 110), rng.range(-12, -3), rng.range(0.4, 0.65), {
        size: rng.range(2, 3.5), delay: HERO + 0.02 + i * 0.01,
      });
    }
  }
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1, x = side * rng.range(1, 12);
    bits.spawn(x, GROUND - 1, x * 2 + side * rng.range(10, 32), -rng.range(80, 160), {
      c: i < 2 ? C[5] : D[rng.int(1, 3)], size: rng.range(2.5, 4), shard: i % 4 === 3, life: rng.range(0.6, 0.78), delay: HERO + 0.02,
    });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
      bits.update(dt);
    },
    drawBack(p) {
      const k = t - HERO;
      if (k < 0 || t > 0.86) return;
      const reach = REACH * (1 - (1 - clamp01(k / 0.12)) ** 3), a = clamp01((0.86 - t) / 0.2);
      // white hot, cooling through the ramp, then a dark split with a lit lip
      const hot = k < 0.04 ? 7 : k < 0.1 ? 6 : k < 0.17 ? 5 : k < 0.24 ? 4 : k < 0.3 ? 3 : 0;
      const split = (pts, c, dy = 0) => p.polyline(pts.map(([x, y]) => [x, y + dy]), c, a);
      const pit = (c, dy = 0) => p.ellipse(0.5, GROUND + 0.5 + dy, 3.5, 1.2, c, a); // the dent under the blow
      if (hot) pit(C[hot]);
      else pit(D[2], -1), pit(D[0]);
      for (const l of lines) {
        const pts = grown(l, reach);
        if (pts.length < 2) continue;
        if (hot) split(pts, C[hot]);
        else split(pts, D[2], -1), split(pts, D[0]);
      }
      const pool = clamp01(1 - k / 0.5) ** 2;
      if (k > 0.05 && pool > 0) p.glowLine(-reach * 0.8, GROUND, reach * 0.8, GROUND, 6, C[5], 0.6 * pool);
    },
    draw(p) {
      lights.draw(p);
      bits.draw(p);
      parts.draw(p);
      flash(p, t, C);
    },
  };
}
