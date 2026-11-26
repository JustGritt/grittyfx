import { rand } from '../../core/index.js';

export const meta = {
  name: 'Footsteps',
  desc: 'Dust scuffed up while running, a loop of two steps: each foot strikes, kicks a couple of small puffs back and a speck of grit, and the dust thins as the next foot lands',
  tags: ['dust', 'footstep', 'run', 'step', 'movement'],
  size: [32, 14],
  origin: [20, 12],
  duration: 0.5,
  loop: true,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'dust', seed: 1 },
  stage: { at: 'aside', x: -26, cast: 'knight', pose: 'run' }, // under the knight's feet as he runs on the spot
  sound: [
    { t: 0, kind: 'thump', gain: 0.22, pitch: 2.2 }, // a foot, then the other
    { t: 0, kind: 'crack', gain: 0.05, pitch: 3 },
    { t: 0.25, kind: 'thump', gain: 0.2, pitch: 2 },
    { t: 0.25, kind: 'crack', gain: 0.05, pitch: 2.7 },
  ],
};

const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const STEPS = [[0, -2], [0.25, 2]]; // [when, where]: the back foot, then the front one
const LIFE = 0.32;

// A puff lit from up-left: a highlight, the body, a darker rim down-right, soft at the edge.
function puff(p, C, x, y, r, a, tone) {
  p.disc(x, y, r, (dx, dy) => {
    if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.6) return C[Math.min(7, tone + 2)];
    return C[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.92 ? tone - 1 : tone];
  }, (dx, dy, d) => a * smooth(1, 0.65, d));
}

// Each step's age at t, wrapping round the loop so a step near the end carries on into the start.
const ages = t => STEPS.map(([at, x], k) => [k, x, (((t - at) % meta.duration) + meta.duration) % meta.duration]);

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;
  for (const [k, x, age] of ages(t)) {
    if (age >= LIFE) continue;
    if (age < 1 / 30) p.line(x - 3, -0.5, x + 2, -0.5, C[6]); // the foot strikes
    // [how far back, lift, size]: one rolling low along the floor, a smaller one at the heel
    [[8, 0, 2.4], [3, 1.5, 1.8]].forEach(([far, up, size], j) => {
      const life = LIFE - 0.06 * j - 0.04 * rand(k * 2 + j, s), u = age / life;
      if (u >= 1) return;
      const e = smooth(0.3, 1, u), r = size * (0.5 + 0.5 * out(age, 0.04)) * (1 + 0.35 * e);
      const d = (far + rand(k * 2 + j, s, 1)) * out(age, 0.05) + 5 * age;
      puff(p, C, x - 1 - d, -0.8 * r - up * out(age, 0.08), r, 0.85 * (1 - e), age < 0.05 ? 6 : 5);
    });
    // a speck of grit hopping back
    const u = age / 0.22;
    if (u < 1) p.px(x - 2 - 12 * out(age, 0.08), -1 - 18 * u * (1 - u), C[u < 0.5 ? 6 : 5]);
  }
}
