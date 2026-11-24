import { rand } from '../../core/index.js';

export const meta = {
  name: 'Coin collect',
  desc: 'A coin picked up: a white flash, a gold ring that bursts out, glints and sparkles that fly up and wink out',
  tags: ['pickup', 'coin', 'collect', 'sparkle', 'gold', 'reward'],
  size: [48, 52],
  origin: [24, 34],
  duration: 0.5,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'gold', seed: 1 },
  stage: { ground: 12 }, // the coin at the swordsman's chest
  sound: [
    // two bright tings, a fourth apart
    { t: 0, kind: 'chime', gain: 0.5, pitch: 2 },
    { t: 0.07, kind: 'chime', gain: 0.6, pitch: 2.67 },
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30; // a frame
const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle

// A four-armed glint, arms L px long: a white heart, warm tips.
function glint(p, C, x, y, L, hot) {
  x = Math.round(x);
  y = Math.round(y);
  if (L >= 1) {
    p.line(x - L, y, x + L, y, d => C[Math.abs(d - 0.5) < 0.2 ? 6 : 4]);
    p.line(x, y - L, x, y + L, d => C[Math.abs(d - 0.5) < 0.2 ? 6 : 4]);
  }
  p.px(x, y, C[hot ? 7 : 6]);
  p.light(x, y, C[6], 0.5);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed;

  if (t < 0.25) p.glow(0, 0, 16, C[6], 0.85 * (1 - t / 0.25) ** 2);

  if (t < F) { // the hero frame: a white star edged in gold, so it holds on a light background too
    const rays = [[1, 0, 9], [-1, 0, 9], [0, 1, 7], [0, -1, 10]];
    p.circle(0.5, 0.5, 4.6, C[5]);
    for (const [dx, dy, l] of rays) p.beam(0.5, 0.5, 0.5 + dx * (l + 1), 0.5 + dy * (l + 1), 3.6, C[5]);
    p.circle(0.5, 0.5, 3.6, C[7]);
    for (const [dx, dy, l] of rays) p.beam(0.5, 0.5, 0.5 + dx * l, 0.5 + dy * l, 2, C[7]);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.line(0, 0, dx * 4, dy * 4, C[7]);
  } else if (t < 3 * F) { // a hot heart inside the ring for two more frames
    p.circle(0.5, 0.5, t < 2 * F ? 1.2 : 0.5, C[7]);
  }

  const u = (t - F) / 0.2; // the ring bursts out, thins and breaks up
  if (u >= 0 && u < 1) {
    const r = 4.5 + 6.5 * out(u, 0.3) / out(1, 0.3);
    p.ring(0.5, 0.5, r, 2.2 * (1 - u) + 0.7, (dx, dy, e) => C[u < 0.25 ? 7 : e < 0 && u < 0.6 ? 6 : 5], u < 0.5 ? 1 : (1 - u) / 0.5);
  }

  for (let j = 0; j < 8; j++) { // streaks thrown out from the flash
    const v = (t - F) / 0.15;
    if (v < 0 || v >= 1) break;
    const a = ((j + 0.5 * rand(j, s)) / 8) * TAU, head = 6 + 12 * out(v, 0.25), tail = Math.max(4, head - 6 * (1 - v));
    const c = Math.cos(a), sn = Math.sin(a);
    p.line(c * tail, sn * tail, c * head, sn * head, q => C[q > 0.6 ? 7 : 5]);
  }

  for (let j = 0; j < 6; j++) { // sparkles flung upward, slowing and floating, winking out one by one
    const delay = 0.02 + 0.08 * ((j * 2) % 6) / 6, life = 0.26 + 0.1 * rand(j, s, 2), v = (t - delay) / life;
    if (v < 0 || v >= 1) continue;
    const a = -Math.PI / 2 + ((j + 0.5) / 6 - 0.5) * 2.3 + (rand(j, s, 3) - 0.5) * 0.4, speed = 80 + 60 * rand(j, s, 4);
    const tt = t - delay, d = speed * 0.18 * out(tt, 0.18), x = Math.cos(a) * d, y = Math.sin(a) * d - 3 - 14 * tt;
    const k = v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85, wink = (v * 5 + rand(j, s, 5)) % 1 < 0.25;
    glint(p, C, x, y, Math.round(2.4 * k) - (wink ? 1 : 0), v < 0.3);
  }
}
