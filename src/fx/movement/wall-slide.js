import { rand } from '../../core/index.js';

export const meta = {
  name: 'Wall slide',
  desc: 'Scraping down a wall, a loop: grit and sparks spat out from where the hand drags on the wall, a bright scrape mark left above it, puffs of dust peeling off',
  tags: ['dust', 'wall', 'slide', 'scrape', 'spark', 'movement'],
  size: [34, 44],
  origin: [26, 20],
  duration: 0.6,
  loop: true,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'dust', seed: 1 },
  // the kunoichi clinging: her hand's edge (13 px ahead of her feet, 19 up) on the anchor, at POSES.cling's lift of 10
  stage: { at: 'aside', ground: 29, x: -13, cast: 'kunoichi', pose: 'cling', scenery: 'wall' },
  sound: [
    { t: 0, kind: 'crackle', gain: 0.25, pitch: 2.6 }, // the grind
    { t: 0.15, kind: 'crack', gain: 0.06, pitch: 3.2 },
    { t: 0.45, kind: 'crack', gain: 0.05, pitch: 2.8 },
  ],
};

const TAU = Math.PI * 2;
const D = meta.duration, G = 700;
const out = (t, k) => 1 - Math.exp(-t / k);
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
// Element j's age at t when it comes round n times a loop, at its own phase: [age, which round].
const cycle = (t, n, j, s) => {
  const c = (t / D) * n + rand(j, s, 50);
  return [(c % 1) * (D / n), Math.floor(c) % n];
};

export function drawBack(p, t, o) {
  const C = o.palette, s = o.seed;
  // dust peeling off the wall, left behind as the hand slides down: it rises, drifts out and thins
  for (let j = 0; j < 3; j++) {
    const [age, n] = cycle(t, 2, j, s), life = 0.5, u = age / life;
    if (u >= 1) continue;
    const k = j * 3 + n, r = (1.6 + rand(k, s, 1)) * (0.5 + 0.5 * out(age, 0.06)) * (1 + 0.6 * u);
    const x = -r - 4 * out(age, 0.15) - 2 * rand(k, s, 2), y = -3 - 18 * age - 2 * rand(k, s, 3);
    p.disc(x, y, r, (dx, dy) => C[dx + dy < -r * 0.4 ? 5 : 4], (dx, dy, d) => 0.75 * (1 - u) * smooth(1, 0.6, d));
  }
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, flick = 0.5 + 0.15 * Math.sin((TAU * 5 * t) / D) + 0.1 * Math.sin((TAU * 7 * t) / D);
  p.glow(-1, 0, 7, C[6], 0.45 * flick);
  // the scrape mark on the wall face, scrolling up as the hand goes down, cooling as it goes
  for (let j = 0; j < 3; j++) {
    const [age] = cycle(t, 3, j + 10, 0), u = age / (D / 3), y0 = -2 - 16 * u, y1 = y0 + 3 + 2 * rand(j, s, 4);
    p.line(0, y0, 0, Math.min(0, y1), v => C[Math.max(2, Math.round(6 - 4 * u - v))]);
  }
  p.line(0, -2, 0, 1, C[7]); // the contact, white hot
  // grit and sparks spat up and out from the contact, falling away
  for (let j = 0; j < 6; j++) {
    const [age, n] = cycle(t, 3, j, s), k = j * 3 + n, life = 0.18 + 0.1 * rand(k, s, 5);
    if (age >= life) continue;
    const vx = 50 + 45 * rand(k, s, 6), vy = 20 + 45 * rand(k, s, 7), h = 1 - age / life;
    const x = -1 - vx * age, y = -vy * age + (G * age * age) / 2, dx = vx * 0.03, dy = (-vy + G * age) * 0.03;
    const hot = j < 4; // sparks streak; grit is a dark speck
    if (hot) p.line(Math.min(-1, x + dx), y - dy, x, y, C[Math.round(4 + 3 * h)], Math.min(1, h / 0.3)); // not into the wall
    else p.px(x, y, C[h > 0.5 ? 4 : 3]);
  }
}
