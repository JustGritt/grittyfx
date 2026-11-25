import { tileFbm, rand } from '../../core/index.js';

export const meta = {
  name: 'Waterfall',
  desc: 'A narrow fall of water: it curls over a lip, pours down in streaks that race past, and churns into foam and drifting mist on a pool at its foot',
  tags: ['water', 'waterfall', 'cascade', 'ambient', 'prop'],
  size: [48, 72],
  origin: [24, 66],
  duration: 1,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'water', seed: 1 },
  stage: { x: 14, scenery: 'cliff' }, // pouring off a rock face, clear of the caster
  sound: [{ t: 0, kind: 'crackle', gain: 0.3, pitch: 2.6 }], // the rush, a fast fizzing roar
};

const TAU = Math.PI * 2;
const TOP = -58; // the lip
const HW = 5; // the sheet's half-width at the lip; it spreads a little as it falls
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;

  // the pool at its foot: a dark sheet of water with bright rings spreading from the churn
  p.ellipse(0, 0, 17, 3, (dx, dy, d) => C[d > 0.85 ? 2 : 3]);
  for (let j = 0; j < 2; j++) {
    const u = (ph + j / 2) % 1, r = 9 + 7 * u;
    p.ellipse(0, 0, r, r * 0.18, (dx, dy, d) => (d > 0.8 && dy > -0.5 ? C[5] : 0), 1 - u);
  }

  // the sheet: streaks scrolling down one whole tile a loop, a slower layer behind a faster one
  // its edges ragged, the raggedness falling with the water
  const half = (y, side) => HW + 2 * smooth(TOP + 10, 0, y) + 2.2 * (tileFbm(y * 0.12 - ph * 7, side * 5, 7, 1, s + 5) - 0.5);
  const fall = (x, y) => {
    const cy = y + 0.5, cx = x + 0.5, h = half(cy, cx < 0 ? 0 : 1), e = Math.abs(cx) / h; // 0 in the middle, 1 at the edge
    if (e > 1) return -1;
    const fast = tileFbm(cy * 0.08 - ph * 7, x * 0.6, 7, 2, s), slow = tileFbm(cy * 0.05 - ph * 4, x * 0.4 + 9, 4, 2, s + 1);
    return 0.62 * fast + 0.38 * slow - 0.2 * e * e;
  };
  p.shade(-HW - 5, TOP, 2 * HW + 10, -TOP - 1, (x, y) => {
    const v = fall(x, y);
    return v < 0 ? 0 : C[v > 0.63 ? 7 : v > 0.55 ? 6 : v > 0.47 ? 5 : v > 0.39 ? 4 : 3];
  }, (x, y) => (fall(x, y) < 0.39 ? 0.65 : 1)); // the dark gaps between streaks let the rock show through
  // the curl over the lip: a bright lit edge bulging out before it drops
  p.line(-HW + 1, TOP - 1, HW - 2, TOP - 1, u => C[Math.abs(u - 0.5) < 0.3 ? 7 : 6]);

  // foam churning where it lands: puffs welling up and rolling outward, each on its own beat
  for (let j = 0; j < 7; j++) {
    const u = (ph * 2 + rand(j, s)) % 1, side = j % 2 ? 1 : -1, x = side * (1 + 9 * u * rand(j, s, 1)) + (rand(j, s, 2) - 0.5) * 6;
    const r = 2 + 2.5 * Math.sin(Math.PI * u);
    p.disc(x, -2 - 2 * Math.sin(Math.PI * u), r, (dx, dy) => C[dx + dy < -r * 0.4 ? 7 : 6], (dx, dy, d) => 0.9 * (1 - d * d) * (1 - u * 0.5));
  }
  // mist: big faint puffs drifting up and out in front of the lower fall
  for (let j = 0; j < 4; j++) {
    const u = (ph + j / 4) % 1, side = j % 2 ? 1 : -1;
    p.disc(side * (5 + 9 * u), -5 - 14 * u, 4 + 5 * u, C[6], (dx, dy, d) => 0.2 * Math.sin(Math.PI * u) * (1 - d) ** 1.5);
  }
  // drops flung out of the churn, arcing and falling back
  for (let j = 0; j < 6; j++) {
    const u = (ph * 2 + j / 6 + 0.1 * rand(j, s, 3)) % 1, side = j % 2 ? 1 : -1, tau = u * 0.5;
    const x = side * (5 + 30 * tau * (0.6 + 0.4 * rand(j, s, 4))), y = -3 - 40 * tau + 140 * tau * tau;
    if (y < 0 && u > 0.05) p.px(x, y, C[u < 0.4 ? 7 : 6]);
  }
  p.glow(0, -3, 10, C[6], 0.18); // the churn's white catching the light
}
