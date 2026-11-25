import { rand } from '../../core/index.js';

export const meta = {
  name: 'Heart',
  desc: 'A heart pickup: it pops up and bobs, squashes as it is taken, flashes white, and bursts into small hearts that float up and wink out',
  tags: ['pickup', 'heart', 'health', 'heal', 'collect', 'life'],
  size: [56, 56],
  origin: [28, 34],
  duration: 0.9,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'blood', seed: 1 },
  stage: { ground: 12, x: 16 }, // floating at the knight's side, chest high
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.2, pitch: 2.4 }, // the pop up
    { t: 0.3, kind: 'chime', gain: 0.45, pitch: 1.33 }, // taken: a rising fifth, warm
    { t: 0.37, kind: 'chime', gain: 0.55, pitch: 2 },
  ],
};

const F = 1 / 30; // a frame
const TAKE = 9 * F; // the squash; the flash two frames later
const K = 4.8; // px per unit of the heart curve: 11 px wide
const out = (t, k) => 1 - Math.exp(-t / k); // fast out, slow settle
const back = u => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2; // overshoots, then settles at 1

// The heart curve, y up: (x² + y² - 1)³ - x² y³ <= 0 inside. Lobes reach y 1.23, the tip y -1.
const heartIn = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0;

// The heart at (cx, cy), scaled sx, sy: a dark rim, lit up-left, a glint on the left lobe.
function heart(p, C, cx, cy, sx, sy) {
  const w = 7 * sx + 2, h = 7 * sy + 2;
  p.shade(Math.floor(cx - w), Math.floor(cy - h), Math.ceil(2 * w) + 1, Math.ceil(2 * h) + 1, (x, y) => {
    const ux = (x + 0.5 - cx) / (K * sx), uy = -(y + 0.5 - cy) / (K * sy) + 0.12;
    if (!heartIn(ux, uy)) {
      const rx = (x + 0.5 - cx) / (K * sx + 1), ry = -(y + 0.5 - cy) / (K * sy + 1) + 0.12;
      return heartIn(rx, ry) ? C[2] : 0;
    }
    if ((ux + 0.55) ** 2 + (uy - 0.62) ** 2 < 0.07) return C[7];
    const n = uy * 0.6 - ux * 0.45;
    return C[n > 0.45 ? 6 : n > -0.45 ? 5 : 4];
  });
}

// The flash: a white heart drawn by hand, 15 x 13 px, so its cleft holds, rimmed one step down. Its top-left at (x, y).
const BIG = ['..####...####..', '.######.######.', '###############', '###############', '###############',
  '.#############.', '..###########..', '...#########...', '....#######....', '.....#####.....', '......###......', '.......#.......'];
function flash(p, C, x, y) {
  const at = (i, j) => BIG[j]?.[i] === '#';
  for (let j = -1; j <= BIG.length; j++) for (let i = -1; i <= 15; i++) {
    if (at(i, j)) p.px(x + i, y + j, C[7]);
    else if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) p.px(x + i, y + j, C[5]);
  }
}

// A small heart, 5 x 4 px, its top-left at (x, y).
const SMALL = ['.#.#.', '#####', '.###.', '..#..'];
function small(p, C, x, y, hot) {
  SMALL.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && p.px(x + i, y + j, C[hot && j === 1 && i < 2 ? 7 : hot ? 6 : 5])));
  p.light(x + 2, y + 1, C[6], 0.35);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, f = Math.floor(t / F + 1e-6);

  if (t < TAKE) { // pops up from a little lower, overshoots, then bobs once
    const u = Math.min(1, t / (3 * F)), k = 0.35 + 0.65 * back(u);
    const y = 6 * (1 - out(t, 0.04)) - 1.5 * Math.sin(Math.PI * Math.max(0, t - 3 * F) / (TAKE - 3 * F));
    p.glow(0, y, 12, C[5], 0.3 * Math.min(1, t / (2 * F)));
    heart(p, C, 0.5, Math.round(y) + 0.5, k, k);
    if (f === 5 || f === 6) { // a glint winks on the right lobe
      const gy = Math.round(y) - 5, L = f === 5 ? 2 : 1;
      p.line(4 - L, gy, 4 + L, gy, C[7]);
      p.line(4, gy - L, 4, gy + L, C[7]);
      p.light(4, gy, C[7], 0.6);
    }
  } else if (f === 9) { // taken: squashed flat
    p.glow(0, 1, 13, C[5], 0.4);
    heart(p, C, 0.5, 1.5, 1.2, 0.8);
  } else if (f === 10) { // springs up, thin and tall
    p.glow(0, -3, 13, C[6], 0.5);
    heart(p, C, 0.5, -2.5, 0.85, 1.2);
  } else if (f === 11) { // the hero frame: a white heart, bigger
    p.glow(0, -2, 20, C[5], 0.5); // softer than the shape, so the lobes hold
    flash(p, C, -7, -8);
  } else if (f === 12) p.glow(0, -2, 16, C[6], 0.45);

  const u = (t - 11 * F) / 0.16; // a ring bursts out of the flash, thins and breaks up, inside the flung hearts
  if (u >= 0 && u < 1) {
    const r = 5 + 6 * out(u, 0.3) / out(1, 0.3);
    p.ring(0.5, -1.5, r, 2 * (1 - u) + 0.7, (dx, dy, e) => C[u < 0.3 ? 7 : e < 0 ? 6 : 5], u < 0.45 ? 1 : (1 - u) / 0.55);
  }

  for (let j = 0; j < 6; j++) { // small hearts flung out and up, slowing, floating, winking out one by one
    const delay = 12 * F + 0.03 * ((j * 4) % 6) / 6, life = 0.32 + 0.12 * rand(j, s, 2), v = (t - delay) / life;
    if (v < 0 || v >= 1) continue;
    const a = -Math.PI / 2 + ((j + 0.5) / 6 - 0.5) * 3 + (rand(j, s, 3) - 0.5) * 0.25, speed = 80 + 30 * rand(j, s, 4);
    const tt = t - delay, d = 9 + speed * 0.16 * out(tt, 0.16), x = Math.cos(a) * d, y = Math.sin(a) * d - 2 - 18 * tt;
    if (v > 0.55 && (v * 7 + rand(j, s, 5)) % 1 < 0.3) continue; // winks before it goes
    if (v > 0.75) p.px(Math.round(x), Math.round(y), C[5]); // shrunk to a dot
    else small(p, C, Math.round(x) - 2, Math.round(y) - 2, v < 0.35);
  }
}
