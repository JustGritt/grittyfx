import { loopNoise, rand } from '../../core/index.js';

export const meta = {
  name: 'Candle',
  desc: 'A wax candle: a small flame swaying on its wick and guttering now and then, a white-hot heart, a drip of wax running down, a warm pool of light',
  tags: ['fire', 'light', 'prop', 'ambient', 'candle'],
  size: [32, 44],
  origin: [16, 24],
  duration: 2,
  loop: true,
  fps: 16,
  views: ['side'],
  ramps: { palette: 8, wax: 5 },
  options: { palette: 'fire', wax: ['#3a2a28', '#7a6458', '#bca88e', '#e4d6b8', '#fbf4e2'], seed: 1 },
  stage: { ground: 14 }, // the wick's foot, on a candle 14 px tall
  sound: [{ t: 0, kind: 'crackle', gain: 0.2, pitch: 2.2 }],
};

const TAU = Math.PI * 2;
const H = 9; // the flame's height over the wick
const BODY = 12, R = 3.5; // the candle under the wick: height, half-width
// A teardrop's half-width at relative height h (-0.25 at the round bottom, 1 at the tip), widest = 1.
const drop = h => (h <= -0.25 || h >= 1 ? 0 : (Math.sqrt(h + 0.25) * (1 - h) ** 1.4) / 0.5);

export function draw(p, t, o) {
  const C = o.palette, Wx = o.wax, s = o.seed, ph = t / meta.duration;
  // a gutter once a loop: the flame ducks, dims and leans, then stands back up
  const g = ph > 0.62 && ph < 0.82 ? Math.sin((Math.PI * (ph - 0.62)) / 0.2) : 0;
  const flick = 0.5 + 0.3 * Math.sin(TAU * (ph * 3 + 0.1)) + 0.2 * Math.sin(TAU * (ph * 5 + 0.7)); // whole cycles
  const top = H * (0.92 + 0.08 * flick) * (1 - 0.4 * g);

  p.glow(0, -5, 15, C[4], 0.34 + 0.06 * flick - 0.16 * g);
  p.glow(0, -4, 5, C[6], 0.3 - 0.12 * g);
  p.glowLine(-6, BODY + 2, 6, BODY + 2, 3, C[3], 0.18 - 0.06 * g); // light on the floor round the foot

  // the candle: lit on the left, shadowed on the right, a rim of soft wax at the top
  p.shade(-R, 1, 2 * R, BODY + 1, (x, y) => {
    const u = (x + 0.5 + R) / (2 * R); // 0 left edge, 1 right
    return Wx[y === 1 ? (u < 0.3 || u > 0.8 ? 3 : 4) : u < 0.25 ? 3 : u < 0.6 ? 2 : u < 0.85 ? 1 : 0];
  });
  // a drip forms on the rim, runs down the shadowed side, slows and sets into the body
  const dx = 1, dy = 1 + (BODY - 3) * (1 - (1 - ph) ** 2.5);
  p.line(dx, 1, dx, dy, Wx[3], Math.min(1, (1 - ph) / 0.15)); // set, it dithers into the body
  if (ph < 0.85) p.line(dx, dy, dx, dy + 1, Wx[4]); // the bead at its tip
  p.line(-R - 1, BODY + 1, R, BODY + 1, Wx[1]); // a holder's dish
  p.line(-R - 1, BODY + 2, R, BODY + 2, Wx[0]);

  // after the gutter, a thin curl of smoke from the tip
  const u = (ph - 0.7) / 0.3;
  if (u > 0) for (let k = 0; k < 7; k++) {
    p.blend(Math.sin(k * 0.8 - u * 4) * 1.3, -top - 2 - k - u * 8, Wx[1], 0.7 * (1 - k / 7) * Math.sin(Math.PI * u));
  }

  // the flame: a slender teardrop over the wick, swaying, leaning on the gutter
  const lean = (loopNoise(0, ph * 4, 4, s) - 0.5) * 1.6 + 1.2 * g, base = -1.5;
  p.shade(-5, base - H - 2, 10, H + 4, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5, h = (base - cy) / top;
    const half = 1.9 * drop(h);
    if (half <= 0) return 0;
    const sway = lean * Math.max(0, h) ** 1.5 + (loopNoise(cy * 0.3, ph * 6, 6, s + 3) - 0.5) * Math.max(0, h);
    const e = 1 - Math.abs(cx - sway) / half; // 1 on the axis, 0 at the edge
    if (e <= 0) return 0;
    const heat = e * (h < 0.08 ? 0.55 : 1.08 - 0.6 * h) * (1 - 0.25 * g); // a dim foot round the wick, hottest low in the body
    return C[heat > 0.72 ? 7 : heat > 0.54 ? 6 : heat > 0.36 ? 5 : heat > 0.2 ? 4 : 3];
  });
  p.line(0, 0, 0, -2, Wx[0]); // the wick, dark in the flame's foot
}
