import { rand } from '../../core/index.js';

export const meta = {
  name: 'Syringe dart',
  desc: "A medic's healing dart: a glass barrel of glowing green liquid with a bubble running through it, a steel needle, a little finned tail, green sparkles streaming off behind",
  tags: ['projectile', 'heal', 'dart', 'syringe', 'medic', 'military', 'physical'],
  size: [56, 20],
  origin: [50, 10],
  duration: 0.6,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, steel: 6 },
  options: { palette: 'heal', steel: 'stone', seed: 1 },
  sound: [
    // a soft whistle of air, and a faint glassy chime from the dose
    { t: 0, kind: 'whoosh', gain: 0.25, pitch: 2 },
    { t: 0.3, kind: 'whoosh', gain: 0.18, pitch: 2.2 },
    { t: 0.1, kind: 'chime', gain: 0.12, pitch: 1.6 },
  ],
};

const TAU = Math.PI * 2;
// The dart, needle tip at (0, 0), from x = X0 back at the tail: F, B the fins above and below, r the spine, c the
// barrel's cap and finger flange, k the plunger's stopper, g, G the glass above and below, l the dose, e the glass's
// front end, h the needle's hub, n the needle and N its point.
const X0 = -21, Y0 = -3;
const MAP = [
  'FF.....c..............',
  '.FFF...cgggggggg......',
  '..FFF..cklllllleh.....',
  'rrrrrrrckllllllehnnnnN',
  '..BBB..cklllllleh.....',
  '.BBB...cGGGGGGGG......',
  'BB.....c..............',
];
const at = (x, y) => MAP[y - Y0]?.[x - X0] ?? '.';
const SPARKLES = 10;

export function draw(p, t, o) {
  const C = o.palette, S = o.steel, s = o.seed, ph = t / meta.duration, pulse = Math.sin(TAU * ph * 2);
  const bubble = -7 - Math.floor(((ph * 2 + 1e-6) % 1) * 6.999); // a bubble running back through the dose, twice a loop
  const glint = -6 - Math.floor(ph * 16 + 1e-6) % 8; // a glint running back along the glass
  const shiver = Math.sin(TAU * ph * 4 + 0.5) > 0 ? 1 : 0; // the fins' tips shiver in the air

  p.glow(-10, 0, 9, C[5], 0.3 + 0.08 * pulse);
  p.glowLine(-36, 0, -14, 0, 4, C[4], (u, d) => 0.3 * u * (1 - d) ** 2);

  // sparkles shed off the tail, streaming back and spreading, cooling as they go; a few twinkle into a cross
  for (let j = 0; j < SPARKLES; j++) {
    const k = 1 + (j % 2), u = (ph * k + (j + 0.7 * rand(j, s)) / SPARKLES) % 1, cycle = Math.floor(ph * k + (j + 0.7 * rand(j, s)) / SPARKLES);
    if (u > 0.9) continue;
    const r = rand(j, cycle, s), x = -16 - 30 * u ** 0.8, y = (r - 0.5) * (2 + 7 * u) + Math.sin(TAU * (u * 1.5 + r)) * 1.2 * u;
    const tw = rand(j, Math.floor(u * 8), s + cycle) < 0.2 && u < 0.5;
    if (tw) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[4]);
    p.px(x, y, C[tw ? 7 : u < 0.3 ? 5 : u < 0.6 ? 4 : 3]);
    p.light(x, y, C[6], 0.4 * (1 - u));
  }

  // the dart, lit from above
  p.shade(X0, Y0, -X0 + 1, 7, (x, y) => {
    const X = Math.round(x), Y = Math.round(y), k = Math.abs(Y) === 3 && X < -15 ? at(X + shiver, Y) : at(X, Y);
    switch (k) {
      case 'F': return C[Y === -1 ? 6 : 5];
      case 'B': return C[3];
      case 'r': return S[3];
      case 'c': return S[Y < 0 ? 4 : Y > 0 ? 2 : 3];
      case 'k': return S[1];
      case 'g': return S[X === glint ? 5 : X % 2 && X < -7 && X > -12 ? 3 : 4]; // marks along the barrel
      case 'G': return S[2];
      case 'l': return X === bubble && Y === -1 ? C[7] : C[Y < 0 ? 6 : Y > 0 ? 4 : 5];
      case 'e': return S[Y < 0 ? 4 : 3];
      case 'h': return S[Y > 0 ? 2 : 3];
      case 'n': return S[4];
      case 'N': return S[5];
      default: return 0;
    }
  });
}
