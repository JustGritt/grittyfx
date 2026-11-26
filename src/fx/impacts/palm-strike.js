import { Rng, Particles, Lights, DUST } from '../../core/index.js';

export const meta = {
  name: 'Palm strike',
  desc: 'Both palms driven into the target at once: two white flashes and a wall of force, then a shockwave that bursts out of its back and rolls on, crescent after crescent, with streaks of air and dust swept along the floor',
  tags: ['palm', 'unarmed', 'melee', 'impact', 'hit', 'shockwave', 'knockback'],
  size: [84, 60],
  origin: [28, 30],
  duration: 0.6,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, dust: 5 },
  options: { palette: 'wind', dust: 'dust', seed: 1 },
  // the palms land, then the wave bursts out of the target's back and shoves it
  act: { windup: 0.3, hits: [{ t: 1 / 30, freeze: 0.12, shake: 3 }, { t: 4 / 30, freeze: 0.05, shake: 6 }] },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.4, pitch: 2.2 }, // the palms coming in
    { t: 1 / 30, kind: 'thump', gain: 0.9, pitch: 0.75 },
    { t: 1 / 30, kind: 'crack', gain: 0.4, pitch: 1.1 },
    { t: 0.03, kind: 'whoosh', gain: 0.6, pitch: 1.1 }, // the air rushing out with the wave
    { t: 4 / 30, kind: 'crack', gain: 0.7, pitch: 0.45 }, // the burst
    { t: 4 / 30, kind: 'thump', gain: 0.6, pitch: 0.55 },
  ],
};

const HIT = 1 / 30; // the palms land
const WAVE = 4 / 30; // the front bursts out of the target's back
const PALMS = [[-8, -5], [-8, 5]]; // one hand over the other, on the target's front
const CX = -16; // the crescents are arcs of rings centered behind the palms
const FLOOR = 11; // below the chest
const clamp01 = v => Math.max(0, Math.min(1, v));

// A crescent's radius k seconds after it leaves the palms: fast through the target, slowing as it rolls on.
const radius = k => 15 + 43 * (1 - (1 - clamp01(k / 0.4)) ** 1.2);
// How tall it stands at radius r, as the half angle of its arc: it spreads as it goes, though less than a ring would.
const span = r => Math.asin(Math.min(0.95, Math.min(22, 9 + 0.45 * (r - 10)) / r));

// The waves: the front, and two weaker ones behind it.
const WAVES = [{ delay: 0, w: 5, hot: 7, life: 0.36 }, { delay: 0.05, w: 3, hot: 6, life: 0.32 }, { delay: 0.1, w: 2, hot: 5, life: 0.26 }];

// The crescents: white as they leave the palms and as the front bursts out of the target, cooling and thinning after,
// faded out over their last quarter.
function waves(p, t, C) {
  for (const { delay, w, hot, life } of WAVES) {
    const k = t - HIT - delay;
    if (k < 0 || k >= life) continue;
    const u = k / life, r = radius(k), s = span(r), white = k < 1 / 30 || (!delay && Math.abs(t - WAVE) < 1 / 60);
    const width = w * (1 - u) ** 0.8 + 0.6, top = white ? 7 : Math.max(3, hot - Math.floor(u * 4));
    p.arc(CX, 0, r, -s, s, width, (q, e) => (e > 0 ? C[top] : C[Math.max(1, top - 2)]), clamp01((1 - u) / 0.25));
  }
}

// Dust swept along the floor under the wave: skids that shoot out from under the target and slow, thinning.
function skids(p, t, D, lanes) {
  const k = t - WAVE;
  if (k < 0 || k >= 0.3) return;
  const u = k / 0.3;
  for (const l of lanes) {
    const x1 = l.x + l.reach * (1 - (1 - u) ** 2), x0 = x1 - l.len * (1 - u);
    if (x1 - x0 > 1) p.line(x0, FLOOR - l.y, x1, FLOOR - l.y, q => D[q > 0.6 ? 4 : 2], q => Math.min(1, q * 2.5) * clamp01((1 - u) / 0.4));
  }
}

// The palms: two small hot points closing in with their speed lines, two white flashes on the hit (the front's crescent
// born just ahead of them), then two glowing marks that cool.
function palms(p, t, C) {
  if (t < HIT) {
    for (const [x, y] of PALMS) {
      p.circle(x + 0.5, y + 0.5, 1.5, C[7]);
      for (const dy of [-1, 1]) p.line(x - 14, y + dy, x - 3, y + dy, q => C[q > 0.6 ? 6 : 4], q => q);
    }
    return;
  }
  const k = t - HIT;
  if (k < 1 / 30) {
    for (const [x, y] of PALMS) p.ellipse(x - 0.5, y + 0.5, 3, 4, C[7]);
    return;
  }
  if (k < 0.2) {
    const u = (k - 1 / 30) / (0.2 - 1 / 30);
    for (const [x, y] of PALMS) p.ellipse(x + 0.5, y + 0.5, 2 * (1 - u) + 0.5, 3 * (1 - u) + 0.5, C[u < 0.3 ? 7 : u < 0.6 ? 6 : 5]);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, dust: o.dust, ground: FLOOR });
  const lights = new Lights();
  lights.add(-6, 0, 12, C[7], 1, 0.1, { delay: HIT });
  lights.add(8, 0, 22, C[5], 0.8, 0.32, { delay: WAVE });
  for (let i = 0; i < 3; i++) {
    parts.spawn(DUST, rng.range(2, 12), FLOOR - 1, rng.range(30, 70), rng.range(-22, -10), rng.range(0.2, 0.28), { size: rng.range(1.6, 2.4), delay: WAVE + i * 0.03 });
  }
  const lanes = [1, 1, 2, 1, 3, 2].map((y, i) => ({ y, x: rng.range(-4, 8), reach: rng.range(24, 44), len: rng.range(6, 12) + i }));

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      const k = t - HIT;
      if (k >= 0 && k < 0.4) p.glow(CX + radius(k) - 3, 0, 12, C[5], 0.45 * (1 - k / 0.4));
      parts.draw(p);
      skids(p, t, o.dust, lanes);
      waves(p, t, C);
      palms(p, t, C);
    },
  };
}
