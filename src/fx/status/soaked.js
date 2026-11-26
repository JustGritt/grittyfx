import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 2.4;
// Drips: x, where the drop starts running and where it lets go, when in the loop it starts. Each runs down the body,
// hangs, falls to the puddle and rings out once a loop.
const DRIPS = [[-7, -19, -12, 0], [3, -15, -8, 0.17], [-2, -21, -15, 0.35], [6, -9, -3, 0.5], [-4, -11, -5, 0.68], [1, -20, -11, 0.84]];
const RUN = 0.42, HANG = 0.56, FALL = 0.64; // of a drip's cycle: running until RUN, hanging until HANG, falling until FALL
// The puddle round the feet, row by row from its far edge to its near one: [y, from x, to x, step].
const POOL = [[-2, -7, 10, 5], [-1, -12, 13, 4], [0, -14, 14, 3], [1, -10, 11, 2]];
const PL = -13, PR = 13; // where ripples stay inside it
// Sheen: points of the wet body that catch the light, and when they glint.
const SHEEN = [[-5, -19, 0.1], [1, -15, 0.45], [3, -9, 0.7], [-3, -6, 0.9]];

const cycle = (ph, off) => (((ph - off) % 1) + 1) % 1;
// When a drip lands, as a phase of the loop.
const lands = DRIPS.map(([, , , off]) => (off + FALL) % 1);

export const meta = {
  name: 'Soaked',
  desc: 'A drenched status over a body: drops running down it, hanging and falling into a puddle round the feet that rings with ripples, a wet sheen glinting on it',
  tags: ['status', 'water', 'soaked', 'wet', 'drench', 'drip', 'debuff'],
  size: [44, 40],
  origin: [22, 34],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'water', seed: 1 },
  stage: { at: 'target', ground: 0 }, // over the whole body, from its feet
  // a soft plip as each drop lands
  sound: lands.map((ph, i) => ({ t: ph * DURATION, kind: 'thump', gain: 0.18 + 0.05 * (i % 2), pitch: 4 + 0.6 * ((i * 3) % 4) })),
};

// The puddle: a thin pool, its far side lit by the sky, its near edge dark, glints drifting over it.
function puddle(p, C, ph) {
  for (const [y, x0, x1, k] of POOL) p.line(x0, y, x1, y, u => C[u < 0.1 || u > 0.9 ? k - 1 : k]);
  for (let j = 0; j < 2; j++) {
    const u = (ph + j / 2) % 1, x = -10 + 20 * u, a = Math.sin(Math.PI * u);
    p.line(x - 1, -1, x, -1, C[a > 0.7 ? 7 : 6], a);
  }
}

// A ripple where a drop landed: a flattened ring spreading over the puddle, its near crest bright, fading.
function ripple(p, C, x, u) {
  const r = 1 + 8 * (1 - (1 - u) ** 2), a = (1 - u) ** 1.5;
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * TAU, a1 = ((i + 1) / 24) * TAU, front = Math.sin((a0 + a1) / 2) > 0;
    const x0 = x + Math.cos(a0) * r, x1 = x + Math.cos(a1) * r;
    if (Math.min(x0, x1) < PL || Math.max(x0, x1) > PR) continue; // it stays on the puddle
    p.line(x0, -0.5 + Math.sin(a0) * r * 0.2, x1, -0.5 + Math.sin(a1) * r * 0.2, C[front ? (u < 0.4 ? 7 : 6) : 5], a * (front ? 1 : 0.6));
  }
}

export function drawBack(p, t, o) {
  puddle(p, o.palette, t / DURATION);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION;
  for (const [j, [x0, y0, y1, off]] of DRIPS.entries()) {
    const u = cycle(ph, off), x = x0 + Math.round(rand(j, s) - 0.5);
    if (u < RUN) { // running down the body, slow then quicker, a wet streak behind it
      const k = u / RUN, y = Math.round(y0 + (y1 - y0) * k ** 1.8);
      if (y > y0) p.line(x, y0, x, y - 1, v => C[v > 0.6 ? 5 : 4], v => 0.3 + 0.5 * v);
      p.px(x, y, C[7]);
      p.px(x, y + 1, C[6]);
      p.light(x, y, C[6], 0.2);
    } else if (u < HANG) { // hanging, swelling, the streak drying above it
      const k = (u - RUN) / (HANG - RUN);
      p.line(x, y0, x, y1, C[4], v => (0.3 + 0.5 * v) * (1 - k));
      p.px(x, y1, C[7]);
      p.px(x, y1 + 1, C[k > 0.4 ? 6 : 5]);
      if (k > 0.6) p.px(x, y1 + 2, C[4]); // it sags, about to let go
      p.light(x, y1, C[6], 0.3 * k);
    } else if (u < FALL) { // falling ever faster, a streak behind it
      const k = (u - HANG) / (FALL - HANG), y = y1 + 2 + (-y1 - 2) * k * k;
      p.line(x, y - 1 - 3 * k, x, y - 1, v => C[v > 0.5 ? 5 : 4]);
      p.px(x, y, C[7]);
      p.light(x, y, C[6], 0.3);
    } else { // the splash: a crown, droplets hopping out, a ripple spreading over the puddle
      const k = (u - FALL) / (1 - FALL);
      ripple(p, C, x + 0.5, Math.min(1, k * 1.25));
      if (k < 0.22) {
        const d = 1 + 6 * k, hop = 3 * Math.sin((Math.PI * k) / 0.22);
        p.px(x - d, -hop, C[6]);
        p.px(x + d, -hop * 0.7, C[6]);
        if (k < 0.08) (p.px(x, -1, C[7]), p.px(x, -2, C[6]));
      }
    }
  }
  // the wet sheen: highlights on the body that glint one after another
  for (const [x, y, t0] of SHEEN) {
    const u = cycle(ph, t0), g = u < 0.22 ? Math.sin((Math.PI * u) / 0.22) : 0;
    if (g <= 0) continue;
    if (g > 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[5]);
    p.px(x, y, C[g > 0.6 ? 7 : 6]);
    p.light(x, y, C[7], 0.6 * g);
  }
}
