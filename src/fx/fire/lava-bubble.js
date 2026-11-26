import { fbm, rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 2.4;
// Each bubble keeps to its own lane of the pool: x, swells per loop, phase. Lanes keep them off each other.
const BUBBLES = [[-10, 1, 0.1], [-2, 2, 0.55], [7, 1, 0.6], [13, 2, 0.05]];
const POP = 0.55; // of a bubble's cycle: it swells until here, then bursts
// every pop's time in the loop, for the sound
const POPS = BUBBLES.flatMap(([, k, ph]) => Array.from({ length: k }, (_, n) => ((((POP - ph + n) / k) % 1) + 1) % 1 * DURATION)).sort((a, b) => a - b);

export const meta = {
  name: 'Lava bubble',
  desc: 'A pool of lava in a rock rim: a dark crust drifting over molten seams, bubbles swelling and popping in turn, spitting drops that arc and fall back, the air lit above it',
  tags: ['fire', 'lava', 'magma', 'pool', 'ambient', 'prop'],
  size: [56, 40],
  origin: [28, 30],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8, rock: 5 },
  options: { palette: 'fire', rock: 'stone', seed: 1 },
  stage: { ground: 0, x: 12 }, // sunk in the floor, clear of the caster
  sound: [
    { t: 0, kind: 'crackle', gain: 0.25, pitch: 0.45 }, // the low churn
    ...POPS.map((t, i) => ({ t, kind: 'thump', gain: 0.25, pitch: 2.4 + 0.3 * (i % 3) })), // a blub as each pops
  ],
};

const RX = 18, RY = 4; // the pool's surface, an ellipse seen from the side, level with the floor
// the near lip's rocks: x, radius
const ROCKS = [[-18.5, 2.5, 0], [-13, 1.5, 1], [-7.5, 2, 0.5], [-1, 2.5, 1], [5, 1.5, 0.5], [9.5, 2, 1], [15, 2.5, 0], [19.5, 1.5, -0.5]];

export function draw(p, t, o) {
  const C = o.palette, R = o.rock, s = o.seed, ph = t / meta.duration;
  const flick = 0.5 + 0.3 * Math.sin(TAU * (ph * 2 + 0.3)) + 0.2 * Math.sin(TAU * (ph * 5 + 0.1));

  p.glowLine(-12, -5, 12, -5, 13, C[4], 0.3 + 0.06 * flick); // the air lit over the pool

  p.ellipse(0, 0, RX + 2, RY + 1.5, R[1]); // the rock round the pool, its far lip in shadow
  // the surface: dark crust plates split by molten seams; two layers slosh against each other on whole cycles
  const a = Math.sin(TAU * ph), b = Math.sin(TAU * (ph + 0.3));
  p.ellipse(0, 0, RX, RY, (dx, dy, d) => {
    const n = 0.5 * fbm(dx * 0.11 + 0.8 * a, dy * 0.3, 2, s) + 0.5 * fbm(dx * 0.11 - 0.8 * b + 7, dy * 0.3 + 3, 2, s + 1);
    const seam = 1 - Math.abs(2 * n - 1) * 9 + 0.5 * (1 - d) ** 2; // 1 along a crack, hotter toward the middle
    return C[seam > 0.8 ? 6 : seam > 0.55 ? 5 : seam > 0.25 ? 3 : seam > 0 && d < 0.6 ? 2 : 1];
  });
  // the near lip: rocks lit on top by the lava, in shadow below
  for (const [x, r, dy] of ROCKS) p.circle(x, RY + dy, r, (dx, dy) => R[dy < -r * 0.4 ? 4 : dy < 0.3 ? 3 : 2]);

  BUBBLES.forEach(([bx, k, off], j) => {
    const u = (ph * k + off) % 1, x = bx + (rand(j, s) - 0.5) * 2, y0 = -1 + (j % 2);
    if (u < POP) { // swelling: a molten dome pushed up, a crust skin on its shadowed side, bright where it stretches thin
      const g = (u / POP) ** 1.3, r = 1 + 3.5 * g;
      p.ellipse(x, y0, r, r, (dx, dy, d) => (dy > 0.5 ? 0 : C[d > 0.78 ? 2 : dx + dy < -r * 0.55 ? 7 : dx > r * 0.3 ? 4 : 5]));
      p.glow(x, y0 - r, r + 4, C[5], 0.3 * g);
      return;
    }
    const v = (u - POP) / (1 - POP); // burst: a flash and a ring on the surface, drops thrown up that fall back
    if (v < 0.1) {
      p.ellipse(x, y0 - 1, 4.5, 2, C[7]);
      p.glow(x, y0 - 3, 10, C[6], 0.7 * (1 - v / 0.1));
    } else if (v < 0.3) p.ellipse(x, y0, 4 + 9 * v, 1.2 + 2.5 * v, (dx, dy, d) => (d > 0.65 ? C[6] : 0));
    for (let i = 0; i < 4; i++) {
      const vx = (rand(j, s, i + 1) - 0.5) * 24, vy = 36 + 24 * rand(j, s, i + 5), tau = (v * (1 - POP) * DURATION) / k;
      const y = y0 - vy * tau + 160 * tau * tau;
      if (y > y0 || v < 0.04) continue;
      const dx = x + vx * tau, cool = v < 0.35 ? 7 : v < 0.6 ? 6 : 5;
      p.px(dx, y, C[cool]);
      p.px(dx, y + (vy > 320 * tau ? 1 : -1), C[cool - 2]); // a tail behind it, below while it climbs, above as it falls
      p.light(dx, y, C[5], 0.45);
    }
  });
}
