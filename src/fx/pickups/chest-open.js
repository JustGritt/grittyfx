import { rand } from '../../core/index.js';

export const meta = {
  name: 'Chest open',
  desc: 'A treasure chest: it rattles, its lid pops open, light pours out of it in rays with glints rising, then it fades away',
  tags: ['pickup', 'chest', 'treasure', 'loot', 'open', 'reward', 'gold'],
  size: [64, 72],
  origin: [32, 64],
  duration: 1.5,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8, wood: 6 },
  options: { palette: 'gold', wood: ['#1e1008', '#3a2010', '#5a3418', '#7c4a22', '#9c6230', '#c08048'], seed: 1 },
  stage: { ground: 0, x: 20 }, // on the floor beside the knight
  sound: [
    { t: 0.06, kind: 'crack', gain: 0.25, pitch: 1.4 }, // the lid rattles twice
    { t: 0.16, kind: 'crack', gain: 0.25, pitch: 1.2 },
    { t: 0.267, kind: 'thump', gain: 0.6, pitch: 1.3 }, // it flips open
    { t: 0.27, kind: 'chime', gain: 0.45, pitch: 1 }, // and the treasure rings out, rising
    { t: 0.37, kind: 'chime', gain: 0.4, pitch: 1.5 },
    { t: 0.5, kind: 'chime', gain: 0.35, pitch: 2 },
    { t: 1.05, kind: 'whoosh', gain: 0.2, pitch: 1.6 }, // it fades away
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30; // a frame
const OPEN = 8 * F; // the lid flips open: the hero frame
const GONE = 1.1; // the chest starts to fade
const out = (t, k) => 1 - Math.exp(-t / k);

// Bitmaps 18 px wide, the bottom row on the floor, x from -9. Wood: k outline, d m w l dark to light. Gold (the
// palette): b band, B band highlight, g gold, G white-gold.
const BODY = ['kllbbllgBBgllbbllk', 'kwwbbwwgkkgwwbbwwk', 'kwwbbwwgBkgwwbbwwk', 'kmmbbmmmggmmmbbmmk',
  'kddbbddddddddbbddk', 'kwwbbwwwwwwwwbbwwk', 'kmmbbmmmmmmmmbbmmk', 'kkkkkkkkkkkkkkkkkk'];
const LID = ['..kkkkkkkkkkkkkk..', '.klBBllllllllBBlk.', 'kwwbbwwwwwwwwbbwwk', 'kwwbbwwwwwwwwbbwwk',
  'kmmbbmmmggmmmbbmmk', 'kddbbdddBBdddbbddk'];
const AJAR = [LID[0], LID[1], 'kddbbddddddddbbddk', 'kgGGGGGGGGGGGGGGgk', 'kgGGGGGGGGGGGGGGgk', 'kgGGGGGGGGGGGGGGgk', ...BODY];
const OPENED = ['..kkkkkkkkkkkkkk..', '.kwbbwwwwwwwwbbwk.', '.kddddddddddddddk.', '.kdmmmmmmmmmmmmdk.',
  '.kdmmmmmmmmmmmmdk.', '.kdmmmmmmmmmmmmdk.', 'kkkkkkkkkkkkkkkkkk', 'kgGggGggggGggGgggk', 'kggGggggGgggggGggk', ...BODY];

// rows drawn with their last one dy px above the floor (0 on it), shifted dx, at alpha a.
function chest(p, o, rows, dx, dy, a = 1) {
  const W = o.wood, C = o.palette;
  const ink = { k: W[0], d: W[1], m: W[2], w: W[3], l: W[4], b: C[3], B: C[5], g: C[6], G: C[7] };
  rows.forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && p.dot(i - 9 + dx, j - rows.length - dy, ink[ch], a)));
}

// Light pouring up out of the open chest: rays fanning from just under the opening, drifting, fading with height.
function rays(p, C, t, k) {
  const ray = (x, y) => {
    const h = -10 - y, hw = 8 + h * 0.5;
    if (h < 0 || Math.abs(x + 0.5) > hw) return 0;
    const a = Math.atan2(x + 0.5, h + 8), band = 0.5 + 0.5 * Math.cos(a * 16 + 1.2 * Math.sin(TAU * t * 0.7));
    return k * (1 - h / 44) ** 2 * (0.25 + 0.75 * band ** 3) * (1 - (Math.abs(x + 0.5) / hw) ** 2);
  };
  p.shade(-30, -56, 60, 47, (x, y) => { const v = ray(x, y); return C[v > 0.6 ? 7 : v > 0.3 ? 6 : 5]; }, (x, y) => Math.max(0, ray(x, y)));
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, f = Math.floor(t / F + 1e-6);
  const fade = t < GONE ? 1 : Math.max(0, 1 - (t - GONE) / 0.25);

  if (t < OPEN) { // closed; it rattles twice, light leaking from under the lid
    const lift = f === 2 || f === 5 ? 1 : 0; // the lid jumps up a px and askew, the body the other way
    chest(p, o, BODY, lift, 0);
    chest(p, o, LID, -lift, BODY.length + lift);
    if (lift) {
      p.line(-8, -9, 7, -9, C[7]);
      p.glowLine(-8, -9, 7, -9, 6, C[6], 0.6);
    }
    return;
  }

  const k = t < 11 * F ? 1 : 0.9 * Math.max(0, 1 - (t - 11 * F) / 0.75) ** 1.5; // the light, held, then dying away
  if (k > 0) p.glow(0, -18, 24, C[6], 0.75 * k);
  if (f === 8) chest(p, o, AJAR, 0, 0); // the lid flipping up, light bursting from the gap
  else if (fade > 0) chest(p, o, OPENED, 0, 0, fade);
  if (k > 0) rays(p, C, t, f === 8 ? 1.3 : k);

  for (let j = 0; j < 12; j++) { // glints rising out of the chest, slowing, swaying, winking out
    const t0 = OPEN + 0.05 * j + 0.03 * rand(j, s), life = 0.45 + 0.15 * rand(j, s, 1), v = (t - t0) / life;
    if (v < 0 || v >= 1) continue;
    const x = (rand(j, s, 2) - 0.5) * 12 + 2 * Math.sin(TAU * (v + rand(j, s, 3))), y = -19 - 34 * out(t - t0, 0.35) * (0.7 + 0.5 * rand(j, s, 4)); // from over the lid
    const L = v < 0.15 ? 2 : v < 0.55 ? 1 : 0;
    if (v > 0.5 && (v * 6 + rand(j, s, 5)) % 1 < 0.3) continue;
    const X = Math.round(x), Y = Math.round(y);
    if (L) {
      p.line(X - L, Y, X + L, Y, C[5]);
      p.line(X, Y - L, X, Y + L, C[5]);
    }
    p.px(X, Y, C[v < 0.4 ? 7 : 6]);
    p.light(X, Y, C[6], 0.4 * (1 - v));
  }

  for (let j = 0; j < 10 && t >= GONE; j++) { // motes lifting off the chest as it fades
    const t0 = GONE + 0.015 * j, v = (t - t0) / 0.25;
    if (v < 0 || v >= 1) continue;
    p.px(Math.round((rand(j, s, 6) - 0.5) * 16), Math.round(-2 - 12 * rand(j, s, 7) - 14 * v), C[v < 0.5 ? 6 : 4]);
  }
}
