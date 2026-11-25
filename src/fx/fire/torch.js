import { tileFbm, loopNoise, rand } from '../../core/index.js';

export const meta = {
  name: 'Torch',
  desc: 'A wall torch: a flame licking up in tongues, white-hot core, drifting embers, a warm pool of light',
  tags: ['fire', 'light', 'prop', 'ambient'],
  size: [24, 32],
  origin: [12, 25],
  duration: 1,
  loop: true,
  fps: 16,
  views: ['side'],
  ramps: { palette: 8 },
  options: { palette: 'fire', seed: 1 },
  stage: { ground: 24, scenery: 'sconce' }, // on a wall
  sound: [{ t: 0, kind: 'crackle', gain: 0.7 }],
};

const TAU = Math.PI * 2;
const H = 15; // tallest flame above the torch head: a third of a 40 px character
// The main tongue and two side licks: offset, height, width, pulses per loop, phase.
const TONGUES = [[0, 1, 3, 2, 0], [-1.6, 0.6, 1.8, 3, 0.3], [1.7, 0.68, 1.7, 2, 0.65]];
// A teardrop's half-width at relative height h (-0.22 at the round bottom, 0.12 widest, 1 at the tip), widest = 1.
const drop = h => (h <= -0.22 || h >= 1 ? 0 : (Math.sqrt(h + 0.22) * (1 - h) ** 1.3) / 0.494);
const BANDS = [[0.86, 7], [0.7, 6], [0.53, 5], [0.37, 4], [0.23, 3], [0.1, 2]];

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  const flick = 0.5 + 0.25 * Math.sin(TAU * (ph * 3 + 0.2)) + 0.25 * Math.sin(TAU * (ph * 7 + 0.6)); // whole cycles per loop

  p.glow(0, -6, 10, C[4], 0.4 + 0.12 * flick);
  p.glow(0, -3, 4, C[6], 0.35);

  const tongues = TONGUES.map(([x, hh, w, k, phase], i) => ({
    x, w, top: H * hh * (0.86 + 0.14 * Math.sin(TAU * (ph * k + phase))), seed: s + i * 17,
  }));
  p.shade(-6, -H - 2, 12, H + 6, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5;
    let e = 0;
    for (const g of tongues) {
      const h = -cy / g.top, sway = (loopNoise(cy * 0.24, ph * 3, 3, g.seed) - 0.5) * 3.5 * Math.max(0, h);
      const half = g.w * drop(h);
      if (half > 0) e = Math.max(e, 1 - Math.abs(cx - g.x - sway) / half);
    }
    if (e <= 0) return 0;
    const h = -cy / H, n = tileFbm(cy * 0.3 + ph * 6, cx * 0.3, 6, 2, s); // scrolls up one whole tile per loop
    const rise = h > 0.08 ? 1.05 - 0.6 * (h - 0.08) : 1.05 - 2.6 * (0.08 - h); // hottest just above the head
    const heat = e * rise - (n - 0.4) * (0.12 + 1.1 * h * h);
    const band = BANDS.find(([min]) => heat > min);
    return band ? C[band[1]] : 0;
  });

  for (let j = 0; j < 5; j++) {
    const k = 1 + (j % 2), u = (ph * k + rand(j, s)) % 1; // each ember rises k times a loop
    if (u > 0.8) continue;
    const x = (rand(j, s, 1) - 0.5) * 5 + Math.sin(TAU * (u * 2 + rand(j, s, 2))), y = -8 - u * 14;
    const cool = u / 0.8 + (rand(j, Math.floor(u * 12), s) < 0.25 ? 0.3 : 0); // cools as it rises, with a blink
    p.px(x, y, C[cool < 0.3 ? 6 : cool < 0.6 ? 5 : cool < 0.9 ? 4 : 3]);
    p.light(x, y, C[5], 0.3 * (1 - u));
  }
}
