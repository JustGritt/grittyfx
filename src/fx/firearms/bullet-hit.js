import { Rng, Particles, Lights, Bits, SPARK, DUST } from '../../core/index.js';

export const meta = {
  name: 'Bullet hit',
  desc: 'A rifle round striking a body: a tiny hard flash, sparks and dark specks thrown back toward the shooter, a puff of dust',
  tags: ['impact', 'hit', 'firearm', 'military', 'bullet', 'gunshot', 'shot', 'wound', 'rifle', 'gun'],
  size: [48, 32],
  origin: [32, 18],
  duration: 0.36,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, dust: 6 },
  options: { palette: 'fire', dust: 'dust', seed: 1 },
  act: { windup: 0.12, hits: [{ t: 1 / 30, freeze: 0.04, shake: 1 }] },
  sound: [
    { t: 1 / 30, kind: 'crack', gain: 0.85, pitch: 2 },
    { t: 1 / 30, kind: 'thump', gain: 0.5, pitch: 1.6 },
  ],
};

const HERO = 1 / 30; // the white frame, where the round lands
const GROUND = 11; // the floor, below the impact point
const BACK = Math.PI; // toward the shooter
const AT = HERO - 1 / 240; // spawn delay: half a step early, so what flares on the hero frame is there on it

// The flash: the round arriving, the white hero star, its spikes longest back along the round's line, then a
// shrinking star.
function flash(p, t, C) {
  if (t < HERO) {
    p.line(-6, 0, 0, 0, u => C[u < 0.5 ? 5 : 7]);
  } else if (t < HERO * 2) {
    p.circle(0.5, 0.5, 1.8, C[7]);
    for (const [dx, dy] of [[-7, 0], [3, 0], [0, -4], [0, 4], [-4, -3], [-4, 3]]) p.line(0, 0, dx, dy, u => C[u < 0.6 ? 7 : 6]); // yellow tips: it holds on a light ground
  } else if (t < 0.13) {
    const u = (t - HERO * 2) / (0.13 - HERO * 2), l = (1 - u) ** 1.5;
    p.px(0, 0, C[u < 0.4 ? 7 : 6]);
    for (const [dx, dy] of [[-6, 0], [0, -3], [0, 3]]) p.line(0, 0, dx * l, dy * l, s => C[s < 0.4 ? 6 : 5]);
  }
}

export function create(o) {
  const rng = new Rng(o.seed), C = o.palette, D = o.dust;
  const parts = new Particles({ rng, palette: C, dust: D, ground: GROUND });
  const bits = new Bits({ rng, ground: GROUND, gravity: 360 });
  const lights = new Lights();
  lights.add(0, 0, 10, C[6], 0.8, 0.13, { delay: AT });
  for (let i = 0; i < 7; i++) { // sparks, sprayed back in a fan, most of them up, fast and short-lived
    const a = BACK + (0.15 + 0.85 * (i / 6)) * (i % 3 ? 1 : -1) * rng.range(0.8, 1.1), v = rng.range(90, 180);
    parts.spawn(SPARK, Math.cos(a) * 2, Math.sin(a) * 2, Math.cos(a) * v, Math.sin(a) * v, rng.range(0.08, 0.14), { delay: HERO + (i % 2 ? 1 / 240 : 1 / 40) });
  }
  for (let i = 0; i < 6; i++) { // specks: dark red and dust, thrown back, falling
    const a = BACK + rng.range(-0.1, 0.7) * (i % 2 ? -1 : 1), v = rng.range(40, 85);
    bits.spawn(0, 0, Math.cos(a) * v, Math.sin(a) * v, { c: i < 4 ? C[2] : D[3], size: 2, life: rng.range(0.16, 0.24), delay: HERO + 1 / 240 });
  }
  parts.spawn(DUST, -1, 0, -45, -8, 0.3, { size: 3, delay: AT, ramp: D.slice(2) }); // the puff, blown back, pale
  parts.spawn(DUST, -3, -1, -30, -16, 0.26, { size: 1.8, delay: HERO + 1 / 60, ramp: D.slice(2) });
  let t = 0, n = 0;
  return {
    update(dt) {
      t = ++n * dt; // counted, not summed: a sum of 1/120 steps drifts below the frame times
      parts.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    draw(p) {
      lights.draw(p);
      bits.draw(p);
      flash(p, t, C);
      parts.draw(p);
    },
  };
}
