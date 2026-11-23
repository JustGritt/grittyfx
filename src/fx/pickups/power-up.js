import { rand } from '../../core/index.js';

const RINGS = [0.03, 0.13, 0.23, 0.33]; // when each ring leaves the feet, on the notes of the arpeggio

export const meta = {
  name: 'Power-up',
  desc: 'A power-up taken: a white pillar of light, rings that rise up the body one after another, a column of motes streaming up',
  tags: ['pickup', 'power-up', 'buff', 'level-up', 'collect', 'aura'],
  size: [48, 72],
  origin: [24, 64],
  duration: 1,
  loop: false,
  fps: 30,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'electric', seed: 1 },
  sound: [
    { t: 0, kind: 'whoosh', gain: 0.35, pitch: 0.8 }, // the column rushing up
    // a rising major arpeggio, a note per ring
    ...RINGS.map((t, i) => ({ t, kind: 'chime', gain: 0.45 + 0.05 * i, pitch: [1, 1.26, 1.5, 2][i] })),
  ],
};

const TAU = Math.PI * 2;
const F = 1 / 30; // a frame
const RISE = 46, LIFE = 0.45; // how high a ring rises, and in how long
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Half an ellipse as short segments: the front half is the one nearer the viewer, below its center.
function ellipse(p, y, rx, ry, front, c, a = 1) {
  const N = 36;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    if (Math.sin((a0 + a1) / 2) > 0 !== front) continue;
    p.line(Math.cos(a0) * rx, y + Math.sin(a0) * ry, Math.cos(a1) * rx, y + Math.sin(a1) * ry, c, a);
  }
}

function layer(p, t, o, front) {
  const C = o.palette, s = o.seed;

  if (t < 0.3) { // a flash ring on the floor, racing out
    const u = t / 0.3, rx = 8 + 14 * (1 - (1 - u) ** 2);
    ellipse(p, 0, rx, rx * 0.25, front, C[u < 0.3 ? 7 : front ? 6 : 4], 1 - u);
  }

  RINGS.forEach((t0, j) => { // rings rising up the body, narrowing, cooling and thinning out
    const v = (t - t0) / LIFE;
    if (v < 0 || v >= 1) return;
    const e = 1 - (1 - v) ** 1.5, y = -RISE * e, rx = 14 - 7 * e, ry = rx * 0.3; // they keep climbing, no pile-up
    const c = C[(v < 0.15 ? 7 : v < 0.45 ? 6 : 5) - (front ? 0 : 2)];
    ellipse(p, y, rx, ry, front, c, v < 0.45 ? 1 : (1 - v) / 0.55);
    if (v < 0.45 && front) ellipse(p, y + 1, rx, ry, true, C[v < 0.2 ? 5 : 4]); // a darker underside, a band of light
  });

  for (let j = 0; j < 24; j++) { // motes streaming up the column, faster and longer as they go
    const t0 = 0.02 + 0.55 * (j / 24) + 0.04 * rand(j, s), life = 0.28 + 0.14 * rand(j, s, 1), v = (t - t0) / life;
    if (v < 0 || v >= 1 || (rand(j, s, 2) < 0.4) === front) continue; // two in five behind the body
    const x = Math.round(((((j * 7) % 12) + rand(j, s, 3)) / 12 - 0.5) * 16 * (1 - 0.3 * v)); // each in its own lane
    const y = -2 - 8 * rand(j, s, 4) - 52 * v ** 1.5, len = 1 + 5 * v;
    const hot = front ? (v < 0.4 ? 7 : v < 0.75 ? 6 : 5) : v < 0.5 ? 5 : 4;
    p.line(x, y, x, y + len, q => C[q < 0.3 ? hot : hot - 2], v < 0.7 ? 1 : (1 - v) / 0.3);
    if (front) p.light(x, y, C[6], 0.4 * (1 - v));
  }
}

export function drawBack(p, t, o) {
  const C = o.palette;
  if (t < 0.85) p.glow(0, -22, 22, C[5], 0.55 * (1 - t / 0.85) ** 2 + 0.1 * smooth(0, 0.1, t) * (1 - t / 0.85));
  layer(p, t, o, false);
}

export function draw(p, t, o) {
  const C = o.palette;
  if (t < 3 * F) { // the flash: a pillar of light from the feet up, flared at the floor, thinning over three frames
    const k = [1, 0.55, 0.25][Math.floor(t / F)], H = 50 - 6 * (1 - k), W = 6 * k + 1;
    p.shade(-8, -H, 17, H, (x, y) => {
      const h = -(y + 0.5) / H, half = W * (0.45 + 0.55 * (1 - h) ** 3) * Math.min(1, (1 - h) / 0.12), d = Math.abs(x) / half;
      return d > 1 ? 0 : C[d < 0.45 ? 7 : d < 0.8 ? 6 : 5];
    });
    p.glowLine(0.5, -4, 0.5, -H, 10, C[6], 0.6 * k);
  }
  layer(p, t, o, true);
}
