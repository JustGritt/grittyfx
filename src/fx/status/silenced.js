import { rand } from '../../core/index.js';

const TAU = Math.PI * 2;
const DURATION = 2;
const FAIL = 0.32; // of the loop: the words try to come out until here, then the seal snaps them and they break up
const BX = -7, BY = -12; // the bubble's top left; the anchor is the top of the head, under its tail

// The speech bubble: '#' its edge, 'o' inside. The tail hangs down to the head.
const BUBBLE = [
  '..##########..',
  '.#oooooooooo#.',
  '#oooooooooooo#',
  '#oooooooooooo#',
  '#oooooooooooo#',
  '#oooooooooooo#',
  '.#oooooooooo#.',
  '..#oo#######..',
  '..#o#.........',
  '..##..........',
];
const DOTS = [[2, 3], [6, 3], [10, 3]]; // the words, three 2 x 2 dots inside it
// Broken glyph pieces, [dx, dy] each, and where each flies: angle (radians, 0 is right, y down) and how far.
const SHARDS = [
  [[[0, 0], [1, 0], [1, 1]], -2.6, 10],
  [[[0, 0], [0, 1], [1, 1]], -2.0, 9],
  [[[0, 0], [1, 1], [2, 2]], -1.5, 10],
  [[[0, 0], [1, 0], [2, 0]], -1.0, 11],
  [[[0, 0], [0, 1], [0, 2]], -0.4, 10],
  [[[1, 0], [0, 1], [1, 1], [2, 1]], -3.1, 9],
  [[[0, 0], [1, 0], [0, 1]], 0.3, 8],
];

export const meta = {
  name: 'Silenced',
  desc: 'A silence status over the head: a struck-through speech bubble pulses; words try to form in it, the seal flashes and they break into glyph shards that fizzle out',
  tags: ['status', 'debuff', 'silence', 'silenced', 'mute', 'seal', 'speech', 'magic'],
  size: [36, 32],
  origin: [16, 28],
  duration: DURATION,
  loop: true,
  fps: 15,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'arcane', seed: 1 },
  // a dull snap as the seal holds, the broken spell sputtering out under it
  sound: [
    { t: FAIL * DURATION, kind: 'crack', gain: 0.18, pitch: 0.45 },
    { t: FAIL * DURATION + 0.03, kind: 'zap', gain: 0.08, pitch: 0.5 },
  ],
};

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / DURATION, k = (ph - FAIL + 1) % 1; // k: 0 at the snap
  const snap = k < 0.04 ? 2 : k < 0.12 ? 1 : 0; // how bright the seal flashes
  const pulse = 0.5 + 0.5 * Math.cos(TAU * (k * 2)); // the seal throbs twice a loop, the first time at the snap
  const jolt = k < 0.12 ? [1, -1, 1, 0][Math.floor(k * 33)] ?? 0 : 0, x0 = BX + jolt, y0 = BY;

  p.glow(x0 + 7, y0 + 4, 12, C[4], 0.12 + 0.08 * pulse + 0.25 * (snap > 0));
  BUBBLE.forEach((row, i) => [...row].forEach((ch, j) => {
    if (ch === 'o') p.blend(x0 + j, y0 + i, C[1], 0.85);
    else if (ch === '#') p.px(x0 + j, y0 + i, C[Math.min(7, (i < 2 ? 5 : i > 5 ? 3 : 4) + (pulse > 0.6) + snap)]);
  }));

  // the words: a dot at a time they light up, trying to come out, until the snap breaks them; then they grow back, dim
  DOTS.forEach(([dx, dy], i) => {
    const on = ph < FAIL && ph > 0.06 + i * 0.07;
    if (ph >= FAIL && k < 0.7) return;
    p.shade(x0 + dx, y0 + dy, 2, 2, C[on ? 7 : 2]);
    if (on) p.glow(x0 + dx + 1, y0 + dy + 1, 3, C[6], 0.6);
  });

  // the strike across it, top left to bottom right: a bright edge over a darker one
  const hi = C[Math.min(7, 5 + (pulse > 0.5) + snap)], lo = C[Math.min(7, 3 + snap)];
  p.line(x0 + 1, y0 - 1, x0 + 15, y0 + 8, lo);
  p.line(x0, y0 - 1, x0 + 14, y0 + 8, hi);
  p.glowLine(x0, y0 - 0.5, x0 + 14.5, y0 + 8.5, 2.5, C[6], 0.08 + 0.08 * pulse + 0.35 * (snap > 0));

  // the shards of the broken words: they fly out, slow down, flicker, cool and shrink to a dot before they go
  if (k < 0.6) {
    const u = k / 0.6, d = 1 - (1 - u) ** 2, f = Math.floor(t * 15); // f: they flicker 15 times a second
    SHARDS.forEach(([pts, a, far], j) => {
      if (u > 0.25 && rand(j, f, s) < 0.05 + 0.4 * u) return; // fizzling
      const [dx, dy] = DOTS[j % 3], x = x0 + dx + Math.cos(a) * far * d, y = y0 + dy + Math.sin(a) * far * d + 3 * u * u;
      const col = C[u < 0.25 ? 7 : u < 0.5 ? 6 : u < 0.75 ? 5 : 4];
      for (const [px, py] of u < 0.8 ? pts : pts.slice(0, 1)) p.px(x + px, y + py, col);
      p.glow(x + 1, y + 1, 3, C[6], 0.5 * (1 - u));
    });
  }
}
