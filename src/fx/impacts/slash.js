import { Rng, Particles, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Slash',
  desc: 'A blade swing from the wielder at the anchor: a crescent sweeps down through the target in front, flashes as it cuts, and leaves a trail that cools and fades',
  tags: ['slash', 'melee', 'sword', 'impact', 'arc'],
  size: [60, 60],
  origin: [16, 30],
  duration: 0.3,
  loop: false,
  fps: 30,
  views: ['side', 'top'],
  top: { size: [80, 80], directions: 8 },
  ramps: { palette: 8 },
  options: { palette: 'ice', seed: 1 },
  act: { windup: 0.1, hits: [{ t: 2 / 30, freeze: 0.05, shake: 1 }] },
};

const HIT = 2 / 30; // the arc passes the target
const R = 22; // the blade tip's path; the target is at (R, 0)
const W = 10; // the crescent's widest point
const A0 = -1.9, A1 = 1.2; // the swing, clockwise from up behind to down in front (radians, 0 is straight ahead)
const PRE = 0.03; // the swing is already under way on the first frame
const SWING = (HIT + PRE) / (1 - Math.sqrt(A1 / (A1 - A0))); // eased out, timed to pass the target at HIT
const LAG = 0.12; // the crescent's tail follows the head this far behind
const clamp01 = v => Math.max(0, Math.min(1, v));
const head = t => A0 + (A1 - A0) * (1 - (1 - clamp01((t + PRE) / SWING)) ** 2);

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, top: o.view === 'top' }); // from above, sparks fly flat, not falling
  for (let i = 0; i < 8; i++) {
    const a = i < 6 ? rng.range(0.1, 1.2) : rng.range(-0.9, -0.4), v = rng.range(50, 90);
    parts.spawn(SPARK, R, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.1, 0.2), { delay: HIT });
  }

  let t = 0;
  return {
    update(dt) {
      t += dt;
      parts.update(dt);
    },
    draw(p) {
      const h = head(t), tail = head(t - LAG), back = head(t - 2 * LAG), cool = clamp01((t - HIT) / 0.22);
      // the afterimage: the blade's path, lingering as a thin line after the crescent has gone
      if (h - back > 0.03 && cool < 1) p.arc(0, 0, R - 0.5, back, h, 1, C[4], 1 - cool);
      if (h - tail > 0.03 && cool < 1) {
        // the outer edge is the blade's path; the crescent grows inward, white at the edge and toward the head, frays
        // into streaks toward its tail, and thins as the tail catches up
        const k = 2 * W * Math.min(1, (h - tail) / 1.4), w = s => k * Math.sin(Math.PI * s ** 1.5);
        const c = (s, e) => {
          if (e > 0 || (s < 0.45 && Math.floor(-e * w(s) * 0.5) % 2)) return 0;
          return C[Math.max(1, Math.min(7, Math.round(7 * (0.2 + 0.5 * s + 0.45 * (1 + e) - 0.5 * cool))))];
        };
        p.arc(0, 0, R, tail, h, w, c, s => Math.min(1, s / 0.3));
        p.glow(Math.cos(h) * R * 0.85, Math.sin(h) * R * 0.85, 10, C[5], 0.5 * (1 - cool));
      }
      if (t >= HIT && t < HIT + 0.1) {
        const u = (t - HIT) / 0.1, l = 6 + 12 * u, dy = l * 0.25;
        p.beam(R - l, dy, R + l, -dy, 1.5 * (1 - u) + 0.5, C[u < 0.3 ? 7 : 6], 1 - u * u);
        p.glow(R, 0, 12, C[5], 0.7 * (1 - u));
      }
      parts.draw(p);
    },
  };
}
