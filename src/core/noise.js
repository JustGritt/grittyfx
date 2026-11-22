// Smooth value noise in [0, 1], one lattice cell per unit, with variants that loop in time or tile in x.
import { rand } from './rng.js';

const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (i, n) => (n ? ((i % n) + n) % n : i);

// wx, wy > 0 make the lattice repeat every wx, wy cells.
function vnoise(x, y, wx, wy, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = ease(x - ix), fy = ease(y - iy);
  const v = (i, j) => rand(wrap(ix + i, wx), wrap(iy + j, wy), seed);
  const a = v(0, 0) + (v(1, 0) - v(0, 0)) * fx;
  const b = v(0, 1) + (v(1, 1) - v(0, 1)) * fx;
  return a + (b - a) * fy;
}

function octaves(n, sample) {
  let sum = 0, norm = 0;
  for (let o = 0, amp = 1; o < n; o++, amp /= 2) {
    sum += amp * sample(2 ** o, o);
    norm += amp;
  }
  return sum / norm;
}

export const noise2 = (x, y, seed = 0) => vnoise(x, y, 0, 0, seed);

/** Fractal noise: `n` octaves, each twice the frequency and half the weight of the last. */
export const fbm = (x, y, n = 4, seed = 0) => octaves(n, (f, o) => vnoise(x * f, y * f, 0, 0, seed + o));

/** Noise that repeats in t every `period` (t and period in noise units): the same at t = 0 and t = period. */
export function loopNoise(x, t, period, seed = 0) {
  const cells = Math.max(1, Math.round(period));
  return vnoise(x, (t / period) * cells, 0, cells, seed);
}

/** fbm that tiles in x every `w` units, for scrolling flames and water. */
export function tileFbm(x, y, w, n = 4, seed = 0) {
  const cells = Math.max(1, Math.round(w));
  return octaves(n, (f, o) => vnoise((x / w) * cells * f, y * f, cells * f, 0, seed + o));
}
