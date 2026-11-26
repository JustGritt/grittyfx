import { loopNoise, rand } from '../../core/index.js';

export const meta = {
  name: 'Fireflies',
  desc: 'A few fireflies drifting over the ground on their own lazy paths, each blinking on its own beat: a hot point, a soft halo lighting the air, a dim body between blinks',
  tags: ['nature', 'firefly', 'light', 'night', 'ambient', 'prop'],
  size: [64, 46],
  origin: [32, 42],
  duration: 4,
  loop: true,
  fps: 12,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'poison', seed: 1 },
  stage: { x: 12 }, // clear of the caster
  // a faint twinkle as the brightest ones light
  sound: [0.4, 1.7, 2.9].map((t, i) => ({ t, kind: 'chime', gain: 0.12, pitch: 2.2 + 0.3 * i })),
};

const TAU = Math.PI * 2;
const N = 7;

// Firefly j at loop phase ph: a slow wander made of whole cycles per loop, so it is where it started at the end.
function fly(j, ph, s) {
  const r = k => rand(j, s, k), kx = 1 + (j % 2), ky = 2 + (j % 3 === 0 ? 1 : 0);
  const lane = (j + 0.5) / N; // each keeps to its own stretch of the air, so they don't pile up
  const x = (lane - 0.5) * 36 + 6 * Math.sin(TAU * (kx * ph + r(1))) + 3 * (loopNoise(j * 3, ph * 2, 2, s) - 0.5);
  const y = -9 - 18 * r(2) - 4 * Math.sin(TAU * (ky * ph + r(3))) - 2 * (loopNoise(j * 3 + 1, ph * 3, 3, s) - 0.5);
  return [x, y];
}

// When each lights first: odd ones blink twice a loop, so the ten blinks fall a tenth of a loop apart and the air is
// never all dark or all lit.
const START = [0, 0.1, 0.2, 0.3, 0.5, 0.4, 0.7];

// Its glow, 0 to 1: quick to light, slower to go out.
function blink(j, ph, s) {
  const k = 1 + (j % 2), u = ((((ph - START[j]) * k + 0.03 * rand(j, s, 4)) % 1) + 1) % 1;
  return u < 0.04 ? u / 0.04 : u < 0.22 ? 1 - ((u - 0.04) / 0.18) ** 1.6 : 0;
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  for (let j = 0; j < N; j++) {
    const [x, y] = fly(j, ph, s), b = blink(j, ph, s);
    if (b > 0.05) {
      p.glow(x + 0.5, y + 0.5, 5 + 4 * b, C[5], 0.75 * b);
      const [x1, y1] = fly(j, ph - 0.012, s), [x2, y2] = fly(j, ph - 0.024, s); // where it was: a short lit trail
      p.dot(x2, y2, C[3], 0.8 * b);
      p.dot(x1, y1, C[4], b);
    }
    if (b > 0.5) {
      p.px(x, y, C[7]);
      p.px(x, y + 1, C[6]); // the lantern under its body
    } else if (b > 0.15) {
      p.px(x, y, C[6]);
      p.px(x, y + 1, C[4]);
    } else p.px(x, y, C[2]); // the dim body between blinks
  }
}
