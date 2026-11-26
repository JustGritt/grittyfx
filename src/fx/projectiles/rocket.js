import { rand } from '../../core/index.js';

// Olive drab, dark to light: the warhead's paint. No named ramp is this grey a green.
const OLIVE = ['#1c211b', '#2a3227', '#3a4535', '#4d5a45', '#647358', '#808f6e'];

export const meta = {
  name: 'Rocket',
  desc: 'A rocket in flight: an olive warhead on a steel motor with swept fins, a flickering white-hot jet at the tail and a short trail of smoke puffing out behind and thinning',
  tags: ['projectile', 'rocket', 'missile', 'military', 'physical', 'launcher', 'bazooka', 'explosive'],
  size: [64, 18],
  origin: [60, 9],
  duration: 0.4,
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, smoke: 6, metal: 8, paint: 6 },
  options: { palette: 'fire', smoke: 'smoke', metal: 'stone', paint: OLIVE, seed: 1 },
  sound: [
    // the motor's hiss, twice a loop, wrapping round so it never stops
    { t: 0, kind: 'whoosh', gain: 0.35, pitch: 0.9 },
    { t: 0.2, kind: 'whoosh', gain: 0.3, pitch: 1 },
    { t: 0, kind: 'crackle', gain: 0.2, pitch: 0.6 }, // the motor's low roar under it
  ],
};

const TAU = Math.PI * 2;
const NOZZLE = -22; // the jet leaves here, behind the nose at 0
const FLICKER = [7, 5, 8, 6, 7, 4, 8, 6]; // the jet's length, frame by frame through a loop
const PUFFS = 10;
// The rocket, nose at x 0, from x -21: a row per y from -3, a char per x; digits are metal steps, letters paint steps
// (a darkest). Swept fins, a steel motor lit from above, a dark joint, then the olive warhead and a steel fuse.
const BODY = [
  '45....................',
  '.5544......eeee.......',
  '2555555552ddfffddd....',
  '0444444442dddddddddd56',
  '2222222221cccccccc....',
  '.3332......bbbb.......',
  '32....................',
];

export function draw(p, t, o) {
  const C = o.palette, S = o.smoke, M = o.metal, P = o.paint, s = o.seed, ph = t / meta.duration;
  const len = FLICKER[Math.floor(ph * FLICKER.length) % FLICKER.length], rise = o.view === 'top' ? 0 : 2.5;

  // smoke puffed out behind the jet: hot at first, then grey, swelling, rising a little and thinning out
  for (let j = 0; j < PUFFS; j++) {
    const u = (ph * 2 + j / PUFFS + 0.05 * rand(j, s)) % 1, r = 1.8 + 3 * u ** 0.7;
    const x = NOZZLE - 3 - 30 * u, y = 0.5 - rise * u + Math.sin(TAU * (u + rand(j, s, 1))) * 0.6;
    const a = 0.85 * (1 - u) ** 1.2 * Math.min(1, u / 0.06), hot = u < 0.12;
    p.disc(x, y, r, (dx, dy) => {
      if (hot) return C[Math.hypot(dx, dy) < r * 0.5 ? 4 : 3];
      if (Math.hypot(dx + r * 0.3, dy + r * 0.35) < r * 0.55) return S[u < 0.5 ? 4 : 3];
      return S[Math.hypot(dx + r * 0.2, dy + r * 0.25) > r * 0.9 ? 1 : u < 0.6 ? 3 : 2];
    }, (dx, dy, d) => a * Math.min(1, (1 - d) / 0.35));
  }

  // the jet: a white-hot core, a flame that tapers and flickers, light around it
  p.glow(NOZZLE - 2, 0.5, 7, C[5], 0.45);
  p.glowLine(NOZZLE, 0.5, NOZZLE - len - 2, 0.5, 4, C[6], (u, d) => 0.5 * (1 - u) * (1 - d) ** 2);
  p.shade(NOZZLE - 9, -2, 9, 5, (x, y) => {
    const v = (NOZZLE - x - 0.5) / len, half = 2 * (1 - v) ** 0.8;
    if (v < 0 || v >= 1 || Math.abs(y) > half) return 0;
    const heat = (1 - Math.abs(y) / (half + 0.4)) * (1.15 - v);
    return C[heat > 0.8 ? 7 : heat > 0.55 ? 6 : heat > 0.35 ? 5 : heat > 0.18 ? 4 : 3];
  });

  // embers flicked out of the jet, falling behind
  for (let j = 0; j < 2; j++) {
    const u = (ph * 2 + rand(j, s, 2)) % 1;
    if (u > 0.7) continue;
    const x = NOZZLE - 4 - 22 * u, y = (j ? 1 : -1) * (1 + 3 * u);
    p.px(x, y, C[u < 0.3 ? 6 : 4]);
    p.light(x, y, C[5], 0.4 * (1 - u));
  }

  // the rocket
  BODY.forEach((row, i) => {
    for (let k = 0; k < row.length; k++) {
      const ch = row[k];
      if (ch === '.') continue;
      p.px(k - 21, i - 3, ch >= 'a' ? P[ch.charCodeAt(0) - 97] : M[+ch]);
    }
  });
  p.glow(-6, -1.5, 3, M[6], 0.25 + 0.2 * Math.sin(TAU * ph)); // a glint on the warhead
}
