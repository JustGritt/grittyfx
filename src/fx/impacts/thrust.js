import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Thrust',
  desc: 'A straight stab from the wielder at the anchor: a lance of light shoots forward with speed lines, a sharp star bursts where the point lands, sparks spray on through, and the lance pulls back as it fades',
  tags: ['thrust', 'stab', 'melee', 'sword', 'spear', 'impact'],
  size: [64, 40],
  origin: [10, 20],
  duration: 0.34,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [104, 104], directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  act: { windup: 0.12, hits: [{ t: 2 / 30, freeze: 0.06, shake: 1 }] },
  stage: { x: -22, pose: 'thrust' }, // the wielder, 22 px before the target
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.6, pitch: 2.4 }, // the lunge, short and high
    { t: 2 / 30, kind: 'crack', gain: 0.8, pitch: 2.6 }, // the point going in
    { t: 2 / 30, kind: 'thump', gain: 0.35, pitch: 1.6 },
  ],
};

const HIT = 2 / 30; // the point lands
const R = 22; // the target is at (R, 0)
const PRE = 0.045; // the lunge is already under way on the first frame
const clamp01 = v => Math.max(0, Math.min(1, v));

// The point: accelerating out to the target, overshooting a little, then pulled back.
function tip(t) {
  if (t < HIT) return 4 + (R - 4) * ((t + PRE) / (HIT + PRE)) ** 1.6;
  const u = (t - HIT) / 0.04;
  if (u < 1) return R + 3 * Math.sin(Math.PI * 0.5 * u);
  return R + 3 - 11 * (1 - (1 - clamp01((t - HIT - 0.04) / 0.16)) ** 2);
}

// The flash where the point lands: a small star, the white hero star stretched along the thrust, then a shrinking
// star and a shock crescent running on ahead.
function flash(p, t, C) {
  const k = t - HIT;
  if (k < 0) return;
  if (k < 1 / 30) {
    p.circle(R + 0.5, 0.5, 3.5, C[7]);
    p.beam(R + 0.5, 0.5, R + 16, 0.5, 3, C[7]);
    p.beam(R + 0.5, 0.5, R - 7, 0.5, 2, C[7]);
    p.beam(R + 0.5, 0.5, R + 0.5, -8, 2, C[7]);
    p.beam(R + 0.5, 0.5, R + 0.5, 9, 2, C[7]);
    for (const [dx, dy, l] of [[1, 1, 7], [1, -1, 7], [-1, 1, 4], [-1, -1, 4]]) p.line(R, 0, R + dx * l, dy * l, C[7]);
  } else if (k < 0.16) {
    const u = (k - 1 / 30) / (0.16 - 1 / 30), l = 10 * (1 - u) ** 1.5;
    p.circle(R + 0.5, 0.5, 2.5 * (1 - u), C[u < 0.3 ? 7 : 6]);
    for (const [dx, dy] of [[1.5, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) p.line(R, 0, R + dx * l, dy * l, s => C[s < 0.5 ? 6 : 5]);
    if (u < 0.55) p.arc(R, 0, 6 + u * 18, -0.7, 0.7, 2.2 * (1 - u) + 0.4, (s, e) => C[e > 0 ? 6 : 4]);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, top = o.view === 'top';
  const parts = new Particles({ rng, palette: C, ground: top ? Infinity : 11, top }); // the floor 11 px below the chest
  const lights = new Lights();
  lights.add(R, 0, 9, C[7], 1, 0.08, { delay: HIT });
  lights.add(R, 0, 15, C[5], 0.8, 0.26, { delay: HIT });
  for (let i = 0; i < 15; i++) {
    const back = i >= 12, a = back ? Math.PI + rng.range(-0.9, 0.9) : -0.75 + (1.3 * i) / 12 + rng.range(-0.08, 0.08); // spread over the cone
    const v = back ? rng.range(30, 50) : rng.range(65, 140);
    parts.spawn(SPARK, R + 1, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.1, back ? 0.16 : 0.24), { delay: HIT });
  }
  const lanes = [-4, 4, -6, 6].map((y, i) => ({ y, lag: 3 + i * 2 + rng.range(0, 2), len: rng.range(8, 13) }));

  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      const x = tip(t), fade = clamp01((t - HIT) / 0.24), hero = t >= HIT && t < HIT + 1 / 30;
      if (fade < 1) {
        // the lance: a wedge of lines tapering to the point, white down its middle, dim toward the wielder; it thins
        // to its core line as it is pulled back
        const tail = Math.min(x - 4, 2 + 12 * fade), rows = hero ? 3 : fade < 0.3 ? 2 : fade < 0.6 ? 1 : 0;
        for (let r = -rows; r <= rows; r++) {
          const d = Math.abs(r), end = x - [0, 3, 7, 11][d], start = tail + d * 3;
          if (end - start < 2) continue;
          p.line(start, r, end, r, s => C[Math.max(1, Math.min(7, Math.round(3 + 4 * s - d - 3 * fade)))], s => Math.min(1, 0.15 + 1.3 * s) * (1 - fade * fade));
        }
        p.glowLine(tail, 0, x, 0, 7, C[5], (s, d) => 0.55 * s * (1 - d) ** 2 * (1 - fade));
      }
      if (t < HIT + 0.1) {
        // speed lines streaming behind the point
        const k = clamp01((t - HIT) / 0.1);
        for (const l of lanes) if (x - l.lag > -4) p.line(Math.max(-6, x - l.lag - l.len), l.y, x - l.lag, l.y, s => C[s > 0.6 ? 5 : 3], s => s * (1 - k));
      }
      flash(p, t, C);
      parts.draw(p);
    },
  };
}
