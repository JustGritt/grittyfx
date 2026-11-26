import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Punch',
  desc: 'A short, heavy fist blow on the target: speed lines close in, a round white flash lands, and a ring of impact lines bursts out round it with a shock ring, a few sparks knocked on through',
  tags: ['punch', 'unarmed', 'melee', 'impact', 'hit'],
  size: [60, 48],
  origin: [26, 24],
  duration: 0.3,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  act: { windup: 0.15, hits: [{ t: 1 / 30, freeze: 0.11, shake: 3 }] },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.35, pitch: 2.8 }, // the fist coming in
    { t: 1 / 30, kind: 'thump', gain: 1, pitch: 1 },
    { t: 1 / 30, kind: 'crack', gain: 0.55, pitch: 1.3 },
  ],
};

const TAU = Math.PI * 2;
const HIT = 1 / 30; // the white frame, where the fist lands
const SPOKES = 14; // the impact lines round the flash

// The impact lines: a ring of spokes clear of the flash, alternating long and short, that fly out, shorten and cool.
function spokes(p, t, C, ring) {
  const k = t - HIT;
  if (k < 0 || k >= 0.16) return;
  const u = k / 0.16, hero = k < 1 / 30;
  for (const { a, len, gap } of ring) {
    const r0 = gap + 7 * (1 - (1 - u) ** 3), l = len * (1 - u) ** 1.3, x = Math.cos(a), y = Math.sin(a);
    if (l < 1) continue;
    const c = hero ? C[7] : C[u < 0.35 ? 6 : u < 0.65 ? 5 : 4];
    if (hero && len > 6) p.beam(x * r0, y * r0, x * (r0 + l * 0.55), y * (r0 + l * 0.55), 2.2, c); // a wedge, thick inside
    p.line(x * r0, y * r0, x * (r0 + l), y * (r0 + l), c);
  }
}

// The flash: a small hot point with the fist's speed lines closing in, the round white hero flash, then a shrinking
// core and a shock ring that thins and breaks up as it spreads.
function flash(p, t, C) {
  if (t < HIT) {
    p.circle(0.5, 0.5, 1.8, C[7]);
    for (const y of [-3, 0, 3]) p.line(-18 + Math.abs(y), y, -4, y, s => C[s > 0.6 ? 6 : 4], s => s);
    return;
  }
  const k = t - HIT;
  if (k < 1 / 30) {
    p.ellipse(0.5, 0.5, 4.5, 6, (dx, dy, d) => C[d > 0.85 ? 6 : 7]); // squashed across the blow
    return;
  }
  if (k < 0.16) {
    const u = (k - 1 / 30) / (0.16 - 1 / 30);
    p.circle(0.5, 0.5, 3.5 * (1 - u) ** 0.8, C[u < 0.4 ? 7 : 6]);
  }
  if (k >= 2 / 30 && k < 0.15) {
    // a tight shock ring, broken from the start, gone before the spokes
    const u = (k - 2 / 30) / (0.15 - 2 / 30), ease = 1 - (1 - u) ** 2;
    const gaps = (dx, dy) => (Math.sin(Math.atan2(dy, dx) * 3 + 0.6) > -0.45 ? 1 : 0);
    p.ring(0.5, 0.5, 6 + ease * 6, 2 * (1 - u) + 0.6, (dx, dy, e) => C[e > 0 ? 6 : 4], gaps);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, ground: 11 }); // the floor 11 px below the chest
  const lights = new Lights();
  lights.add(0, 0, 8, C[7], 1, 0.1, { delay: HIT });
  lights.add(0, 0, 18, C[5], 0.9, 0.24, { delay: HIT });
  // irregular, as drawn by hand: longer on through the target than back toward the fist
  const ring = Array.from({ length: SPOKES }, (_, i) => {
    const a = (i / SPOKES) * TAU + rng.range(-0.15, 0.15);
    return { a, len: ((i % 2 ? 3.5 : 7) + rng.range(-1, 2.5)) * (1 + 0.35 * Math.cos(a)), gap: rng.range(7, 9) };
  });
  for (let i = 0; i < 9; i++) {
    const back = i >= 7, a = back ? Math.PI + rng.range(-0.8, 0.8) : rng.range(-0.9, 0.6), v = back ? rng.range(30, 50) : rng.range(60, 105);
    parts.spawn(SPARK, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.1, back ? 0.14 : 0.2), { delay: HIT });
  }

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      if (t < HIT) p.glow(-2, 0, 8, C[5], 0.6);
      parts.draw(p);
      spokes(p, t, C, ring);
      flash(p, t, C);
    },
  };
}
