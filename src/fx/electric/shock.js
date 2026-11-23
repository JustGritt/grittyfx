import { Rng, Particles, SPARK, rand } from '../../core/index.js';

export const meta = {
  name: 'Shock',
  desc: 'A target takes a jolt: a white flash with bolts bursting off its outline, then crackling arcs that hop around the body, fewer and dimmer, spitting sparks',
  tags: ['electric', 'shock', 'hit', 'impact', 'status', 'zap'],
  size: [76, 68],
  origin: [38, 34], // the middle of a body about 20 x 32 px
  duration: 0.72,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  act: { hits: [{ t: 1 / 30, freeze: 0.08, shake: 2 }] },
  sound: [
    { t: 1 / 30, kind: 'crack', gain: 0.8, pitch: 1.8 }, // the jolt
    { t: 1 / 30, kind: 'zap', gain: 0.8 },
    { t: 1 / 30, kind: 'thump', gain: 0.4, pitch: 1.4 },
    { t: 0.1, kind: 'crackle', gain: 0.2, pitch: 2 }, // the body crackling after
    { t: 0.24, kind: 'zap', gain: 0.35, pitch: 1.3 },
    { t: 0.42, kind: 'zap', gain: 0.2, pitch: 1.7 },
  ],
};

const TAU = Math.PI * 2;
const HIT = 1 / 30; // the white flash
const F = 1 / 30;
const RX = 10, RY = 16; // the body the arcs crawl over
const FEET = RY; // sparks land at the feet
const CRACKLE = 0.62; // the arcs die out by then

const on = (a, k = 1) => [Math.cos(a) * RX * k, Math.sin(a) * RY * k]; // a point on (k = 1) or off the outline

// A crackle: a jagged arc that runs part way round the outline, kinking in and out, with a fork that jumps off it.
function crackle(r) {
  const a0 = TAU * r(0), span = (0.6 + 0.9 * r(1)) * (r(2) < 0.5 ? -1 : 1), pts = [];
  for (let i = 0; i <= 4; i++) pts.push(on(a0 + (span * i) / 4, 1 + (i % 4 ? (r(i + 3) - 0.5) * 0.4 : 0)));
  const [x, y] = pts[2], out = on(a0 + span / 2, 1);
  const fork = [pts[2], [x + out[0] * 0.25 + (r(9) - 0.5) * 4, y + out[1] * 0.18 + (r(10) - 0.5) * 4]];
  return { pts, fork };
}

// A bolt straight across the body, from one side of the outline to the other.
function across(r) {
  const a = TAU * r(20), b = a + Math.PI + (r(21) - 0.5) * 1.2, [x0, y0] = on(a), [x1, y1] = on(b), pts = [[x0, y0]];
  for (let i = 1; i < 5; i++) pts.push([x0 + ((x1 - x0) * i) / 5 + (r(22 + i) - 0.5) * 5, y0 + ((y1 - y0) * i) / 5 + (r(28 + i) - 0.5) * 3]);
  pts.push([x1, y1]);
  return pts;
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, s = o.seed;
  const parts = new Particles({ rng, palette: C, ground: FEET });
  for (let i = 0; i < 14; i++) { // thrown off the outline by the jolt
    const a = rng.range(0, TAU), [x, y] = on(a), v = rng.range(40, 75);
    parts.spawn(SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8 - 30, rng.range(0.18, 0.36), { delay: HIT });
  }
  for (let i = 0; i < 8; i++) { // spat off the crackles after
    const a = rng.range(0, TAU), [x, y] = on(a), v = rng.range(30, 60);
    parts.spawn(SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v - 25, rng.range(0.15, 0.25), { delay: HIT + rng.range(0.1, CRACKLE - 0.2) });
  }
  // the hero frame's outline and the bolts that burst off it
  const ring = Array.from({ length: 21 }, (_, i) => on((i / 20) * TAU, 1 + (i % 20 ? rng.range(-0.12, 0.12) : 0)));
  const bursts = Array.from({ length: 6 }, (_, i) => {
    const a = ((i + rng.range(0.2, 0.8)) / 6) * TAU, [x, y] = on(a), l = rng.range(7, 12), pts = [[x, y]];
    for (let j = 1; j <= 3; j++) pts.push([x + Math.cos(a) * l * (j / 3) + rng.range(-2, 2), y + Math.sin(a) * l * (j / 3) + rng.range(-2, 2)]);
    return pts;
  });

  let n = 0, t = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed, so the flash lands exactly on its frame
      parts.update(dt);
    },
    draw(p) {
      const sk = t - HIT, f = Math.floor(sk / F + 1e-6);
      if (sk < 0) {
        // the contact: a spark and a first thread of current
        p.glow(0, 0, 8, C[5], 0.4);
        p.polyline([[-3, -2], [-1, 1], [1, -1], [3, 1]], C[6]);
        p.px(0, 0, C[7]);
        return;
      }
      if (f === 0) {
        // the hero frame: the whole body lit white, bolts bursting off it
        p.glow(0, 0, 26, C[7], 0.85);
        p.polyline(ring.map(([x, y]) => [x * 1.08, y * 1.05]), C[3]); // a dark rim: it holds on a light background
        p.polyline(ring.map(([x, y]) => [x * 1.04, y * 1.025]), C[5]);
        p.polyline(ring, C[7]);
        for (const b of bursts) {
          p.polyline(b.map(([x, y]) => [x + 1, y + 1]), C[3]);
          p.polyline(b, u => C[u > 0.7 ? 6 : 7]);
        }
        return;
      }
      parts.draw(p);
      const v = sk / CRACKLE;
      if (v >= 1) return;
      // crackles: re-formed every other frame, hopping round the body, fewer and dimmer as the charge drains
      const slot = (f - 1) >> 1, fresh = (f - 1) % 2 === 0, count = Math.ceil(4 * (1 - v) ** 1.3);
      const flick = fresh ? 1 : 0.55;
      p.glow(0, 0, 18, C[5], 0.45 * (1 - v) ** 1.5 * flick);
      for (let k = 0; k < count; k++) {
        const r = j => rand(slot * 3 + k, j, s), c = crackle(r), hot = fresh && v < 0.6;
        p.polyline(c.pts.map(([x, y]) => [x, y + 1]), C[2]); // a dark underside: it holds on a light background
        p.polyline(c.pts, C[hot ? 7 : fresh ? 6 : 5]);
        if (fresh) p.polyline(c.fork, C[hot ? 6 : 4]);
        if (k === 0 && fresh && r(19) < 0.45 - 0.4 * v) p.polyline(across(r), u => C[Math.abs(u - 0.5) < 0.3 ? 6 : 5]);
      }
      // late on, the last of the charge: single sparkles on the outline
      if (v > 0.5) for (let k = 0; k < 3; k++) if (rand(f, k + 40, s) < 0.6) p.px(...on(TAU * rand(f, k + 50, s)), C[rand(f, k + 60, s) < 0.4 ? 7 : 5]);
    },
  };
}
