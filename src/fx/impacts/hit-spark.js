import { Rng, Particles, Lights, SPARK } from '../../core/index.js';

export const meta = {
  name: 'Hit spark',
  desc: 'A sharp contact flash, a white hero frame, then a spray of sparks that streak, fall and bounce',
  tags: ['impact', 'hit', 'spark', 'melee'],
  size: [56, 40],
  origin: [18, 22],
  duration: 0.46,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  act: { windup: 0.12, hits: [{ t: 1 / 30, freeze: 0.08, shake: 2 }] },
};

const TAU = Math.PI * 2;
const GROUND = 14; // the floor, below the impact point
const HERO = 1 / 30; // the white frame, where the hit lands

// The flash: a small contact star, the white hero star, then a shrinking colored star and a shock crescent that
// runs ahead in the direction of the hit.
function flash(p, t, C) {
  if (t < HERO) {
    p.circle(0.5, 0.5, 2.2, C[7]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.line(0, 0, dx * 5, dy * 4, C[7]);
  } else if (t < HERO * 2) {
    p.circle(0.5, 0.5, 4.5, C[7]);
    p.beam(0.5, 0.5, 15, 0.5, 3, C[7]);
    p.beam(0.5, 0.5, -8, 0.5, 2, C[7]);
    p.beam(0.5, 0.5, 0.5, -9, 2, C[7]);
    p.beam(0.5, 0.5, 0.5, 8, 2, C[7]);
    for (const [dx, dy, l] of [[1, 1, 6], [1, -1, 7], [-1, 1, 4], [-1, -1, 4]]) p.line(0, 0, dx * l, dy * l, C[7]);
  } else if (t < 0.17) {
    const u = (t - HERO * 2) / (0.17 - HERO * 2), l = 9 * (1 - u) ** 1.5;
    p.circle(0.5, 0.5, 3 * (1 - u), C[u < 0.3 ? 7 : 6]);
    for (const [dx, dy] of [[1.3, 0], [-1, 0], [0, 1], [0, -1]]) p.line(0, 0, dx * l, dy * l * 0.8, s => C[s < 0.5 ? 6 : 5]);
    if (u < 0.75) p.arc(0, 0, 6 + u * 12, -0.9, 0.9, 3.5 * (1 - u) + 0.6, (s, e) => C[e > 0 ? 6 : 5]);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette;
  const parts = new Particles({ rng, palette: C, ground: GROUND });
  const lights = new Lights();
  lights.add(0, 0, 16, C[5], 0.9, 0.28);
  lights.add(0, 0, 9, C[7], 1, 0.1);
  for (let i = 0; i < 3; i++) {
    const a = rng.range(-0.7, 0.3), v = rng.range(120, 140); // quick streaks that flash out
    parts.spawn(SPARK, 0, 0, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.08, 0.13), { delay: HERO });
  }
  for (let i = 0; i < 16; i++) {
    const back = i >= 11; // most sparks fly with the hit, a few spray back
    const a = back ? rng.range(Math.PI * 0.55, Math.PI * 1.45) : rng.range(-1.45, 0.55);
    const v = back ? rng.range(30, 55) : rng.range(55, 95);
    parts.spawn(SPARK, Math.cos(a) * 2, Math.sin(a) * 2, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.16, back ? 0.26 : 0.4), { delay: HERO });
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
      flash(p, t, C);
      parts.draw(p);
    },
  };
}
