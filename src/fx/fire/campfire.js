import { tileFbm, loopNoise, rand } from '../../core/index.js';

export const meta = {
  name: 'Campfire',
  desc: 'Two crossed logs charring under licking flames, rising embers, a thin column of smoke and a warm pool of light',
  tags: ['fire', 'light', 'prop', 'camp', 'ambient'],
  size: [56, 64],
  origin: [28, 54],
  duration: 1.5,
  loop: true,
  fps: 16,
  views: ['side'],
  ramps: { palette: 8, smoke: 6, wood: 5 },
  options: { palette: 'fire', smoke: 'smoke', wood: 'dust', seed: 1 },
  sound: [{ t: 0, kind: 'crackle', pitch: 0.8 }],
};

const TAU = Math.PI * 2;
const H = 24; // tallest flame above its base
const BASE = -4; // where the flames leave the logs; the ground is y = 0
// Tongues across the bed: offset, height, width, pulses per loop, phase.
const TONGUES = [[0, 1, 6, 2, 0], [-5, 0.6, 4.5, 3, 0.3], [5.5, 0.76, 4, 2, 0.6], [-9.5, 0.36, 3.2, 3, 0.15], [9, 0.46, 3, 4, 0.8]];
const drop = h => (h <= -0.22 || h >= 1 ? 0 : (Math.sqrt(h + 0.22) * (1 - h) ** 1.3) / 0.494); // teardrop, widest = 1
const BANDS = [[0.86, 7], [0.7, 6], [0.53, 5], [0.37, 4], [0.23, 3], [0.1, 2]];
const LOGS = [[-12, -2, 11, -7], [-11, -7, 12, -2]]; // back, front

// A log: bark with a shadowed underside, a lit top edge that chars where the flames lick it, cut ends. `back` is one
// step darker, so the far log recedes.
function log(p, [x0, y0, x1, y1], W, C, ph, seed, back) {
  const b = back ? 0 : 1;
  p.beam(x0, y0, x1, y1, 5, W[b]);
  p.line(x0 + 1, y0 - 2, x1 - 1, y1 - 2, t => (Math.abs(t - 0.5) < 0.25 ? C[3] : W[b + 1]));
  p.line(x0 + 1, y0 + 2, x1 - 1, y1 + 2, W[0]);
  for (const [x, y] of [[x0, y0], [x1, y1]]) {
    p.ellipse(x + 0.5, y + 0.5, 1.6, 2.2, W[b + 1]);
    p.px(x, y, W[b + 2]);
  }
  for (let j = 0; j < 3; j++) { // glowing cracks
    const u = 0.35 + j * 0.15, on = 0.5 + 0.5 * Math.sin(TAU * (ph * (2 + j) + rand(j, seed)));
    p.px(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, C[on > 0.6 ? 5 : 4]);
  }
}

export function draw(p, t, o) {
  const C = o.palette, S = o.smoke, W = o.wood, s = o.seed, ph = t / meta.duration;
  const flick = 0.5 + 0.25 * Math.sin(TAU * (ph * 3 + 0.2)) + 0.25 * Math.sin(TAU * (ph * 7 + 0.6)); // whole cycles per loop

  p.glow(0, -12, 20, C[4], 0.38 + 0.1 * flick);
  p.glowLine(-18, -1, 18, -1, 7, C[4], 0.3 + 0.1 * flick);
  p.glow(0, -5, 8, C[6], 0.35);

  for (let j = 0; j < 6; j++) { // a thin column of smoke, leaning as it rises
    const u = (ph + j / 6) % 1, r = 1.5 + u * 3.5;
    const x = Math.sin(TAU * (u * 0.75 + j * 0.5)) * 1.5 + u * u * 6, y = -22 - u * 22;
    p.disc(x, y, r, S[u < 0.4 ? 3 : 2], 0.22 * Math.sin(Math.PI * u) ** 1.5);
  }

  log(p, LOGS[0], W, C, ph, s, true);

  const tongues = TONGUES.map(([x, hh, w, k, phase], i) => ({
    x, w, top: H * hh * (0.8 + 0.2 * Math.sin(TAU * (ph * k + phase))), seed: s + i * 17,
  }));
  p.shade(-14, BASE - H - 2, 28, H + 4, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5;
    let e = 0;
    for (const g of tongues) {
      const h = (BASE - cy) / g.top, sway = (loopNoise(cy * 0.12, ph * 4, 4, g.seed) - 0.5) * 7 * Math.max(0, h);
      const half = g.w * drop(h);
      if (half > 0) e = Math.max(e, 1 - Math.abs(cx - g.x - sway) / half);
    }
    if (e <= 0) return 0;
    const h = (BASE - cy) / H, n = tileFbm(cy * 0.17 + ph * 8, cx * 0.17, 8, 2, s); // scrolls up one whole tile per loop
    const rise = h > 0.08 ? 1.05 - 0.6 * (h - 0.08) : 1.05 - 2.6 * (0.08 - h);
    const heat = e * rise - (n - 0.4) * (0.12 + 1.1 * h * h);
    const band = BANDS.find(([min]) => heat > min);
    return band ? C[band[1]] : 0;
  });

  log(p, LOGS[1], W, C, ph, s + 1);

  for (let j = 0; j < 10; j++) {
    const k = 1 + (j % 2), u = (ph * k + rand(j, s)) % 1;
    if (u > 0.85) continue;
    const x = (rand(j, s, 1) - 0.5) * 14 + Math.sin(TAU * (u * 2 + rand(j, s, 2))) * 2.5, y = -10 - u * 34;
    const cool = u / 0.85 + (rand(j, Math.floor(u * 12), s) < 0.25 ? 0.3 : 0);
    p.px(x, y, C[cool < 0.3 ? 6 : cool < 0.6 ? 5 : cool < 0.9 ? 4 : 3]);
    p.light(x, y, C[5], 0.3 * (1 - u));
  }
}
