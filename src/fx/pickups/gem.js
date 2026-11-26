import { rand } from '../../core/index.js';

export const meta = {
  name: 'Gem',
  desc: 'A gem pickup: a cut gem pops up and turns, its facets catching the light, then flashes white as it is taken and bursts into glints',
  tags: ['pickup', 'gem', 'jewel', 'crystal', 'collect', 'sparkle', 'reward'],
  size: [56, 56],
  origin: [28, 32],
  duration: 0.85,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'arcane', seed: 1 },
  stage: { ground: 12, x: 16 }, // floating at the knight's side, chest high
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.2, pitch: 2.6 }, // the pop up
    { t: 0.2, kind: 'chime', gain: 0.15, pitch: 3 }, // a glint
    { t: 0.4, kind: 'chime', gain: 0.5, pitch: 2.25 }, // taken: two bright tings, a fourth apart
    { t: 0.45, kind: 'chime', gain: 0.55, pitch: 3 },
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30; // a frame
const TAKE = 12 * F; // the flash
const N = 8; // facets round the gem
const TURN = 0.9; // seconds a turn
const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const back = u => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2; // overshoots, then settles at 1

// The gem's half width at height y (px, its center at 0): a flat table on top, the crown widening to the girdle, the
// pavilion narrowing to a point. 0 outside it. Also which part y is in.
function half(y) {
  if (y < -6.5 || y > 6.5) return [0];
  if (y < -5.5) return [3.5, 'table'];
  if (y < -2.5) return [3.5 + (y + 5.5), 'crown'];
  if (y < -1.5) return [6.5, 'girdle'];
  return [6.5 * (6.5 - y) / 8, 'pavilion'];
}

// The gem at (cx, cy), scaled k, turned th radians: each pixel takes its facet's light, from up-left. white: the flash.
function gem(p, C, cx, cy, k, th, white = false) {
  p.shade(Math.floor(cx - 8 * k - 2), Math.floor(cy - 8 * k - 2), Math.ceil(16 * k) + 5, Math.ceil(16 * k) + 5, (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, [R, part] = half(dy / k);
    if (Math.abs(dx) >= R * k) return half(dy / (k + 0.15))[0] * (k + 0.15) + 1 > Math.abs(dx) && Math.abs(dy) < 6.5 * k + 1 ? C[white ? 5 : 1] : 0;
    if (white) return C[7];
    if (part === 'table') return C[(Math.floor(dx) + Math.floor(th * 4)) % 3 ? 6 : 7];
    const phi = Math.asin(Math.max(-1, Math.min(1, dx / (R * k)))), f = Math.floor((phi + th) / (TAU / N));
    const mu = (f + 0.5) * (TAU / N) - th, b = 0.5 + 0.5 * Math.cos(mu + 0.7); // the facet's normal against the light
    const v = part === 'crown' ? 0.3 + 0.7 * b : part === 'girdle' ? 0.5 + 0.3 * b : 0.75 * b - 0.03 * dy / k;
    return C[Math.max(2, Math.min(7, Math.round(1 + 6 * v)))];
  });
}

// A four-armed glint, arms L px long.
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
  const C = o.palette, s = o.seed, f = Math.floor(t / F + 1e-6);

  if (t < TAKE) { // pops up, overshoots, then hovers and turns
    const k = 0.4 + 0.6 * back(Math.min(1, t / (3 * F)));
    const y = Math.round(5 * (1 - out(t, 0.04)) - Math.sin(TAU * Math.max(0, t - 3 * F) / (TAKE - 3 * F)));
    p.glow(0, y, 14, C[5], 0.35 * Math.min(1, t / (2 * F)));
    gem(p, C, 0.5, y + 0.5, k, (TAU * t) / TURN);
    if (f === 6 || f === 7) glint(p, C, -3, y - 5, f === 6 ? 3 : 1, f === 6); // the light catches the crown
  } else if (f === 12) { // the hero frame: a white gem, a size up, and a star
    p.glow(0, -1, 22, C[5], 0.6);
    gem(p, C, 0.5, -1.5, 1.25, 0, true);
    for (const [dx, dy, l] of [[1, 0, 13], [-1, 0, 13], [0, 1, 12], [0, -1, 14]]) p.line(dx * 9, dy * 9 - 1, dx * l, dy * l - 1, C[7]);
  } else if (f === 13) p.glow(0, -1, 16, C[6], 0.45);

  const u = (t - 13 * F) / 0.16; // a ring bursts out, thins and breaks up, inside the flung glints
  if (u >= 0 && u < 1) {
    const r = 4 + 6 * out(u, 0.3) / out(1, 0.3);
    p.ring(0.5, -0.5, r, 2 * (1 - u) + 0.7, (dx, dy, e) => C[u < 0.3 ? 7 : e < 0 ? 6 : 5], u < 0.45 ? 1 : (1 - u) / 0.55);
  }

  for (let j = 0; j < 8; j++) { // glints flung out all round, slowing, drifting up, winking out one by one
    const delay = 13 * F + 0.025 * ((j * 3) % 8) / 8, life = 0.24 + 0.12 * rand(j, s, 2), v = (t - delay) / life;
    if (v < 0 || v >= 1) continue;
    const a = ((j + 0.5 * rand(j, s, 3)) / 8) * TAU, speed = 60 + 80 * rand(j, s, 4);
    const tt = t - delay, d = 10 + speed * 0.15 * out(tt, 0.15), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8 - 12 * tt;
    const L = Math.round(2.5 * (v < 0.2 ? 1 : 1 - (v - 0.2) / 0.8)), wink = v > 0.4 && (v * 6 + rand(j, s, 5)) % 1 < 0.25;
    if (v > 0.8) p.px(Math.round(x), Math.round(y), C[4]); // a last dim speck
    else glint(p, C, x, y, L - (wink ? 1 : 0), v < 0.3);
  }
}
