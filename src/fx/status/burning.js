import { tileFbm, loopNoise, rand } from '../../core/index.js';

export const meta = {
  name: 'Burning',
  desc: 'A burn status over a body: small flame tongues flare up and die down all over it, embers rise, a little smoke',
  tags: ['status', 'fire', 'burn', 'debuff', 'dot'],
  size: [44, 56],
  origin: [22, 50],
  duration: 1.5,
  loop: true,
  fps: 16,
  views: ['side'],
  ramps: { palette: 8, smoke: 6 },
  options: { palette: 'fire', smoke: 'smoke', seed: 1 },
  sound: [{ t: 0, kind: 'crackle', gain: 0.5, pitch: 1.2 }], // smaller fires crackle higher
};

const TAU = Math.PI * 2;
// Flames: lane x, highest and lowest base y, tallest height, lives per loop, phase, behind the body. Each life it
// catches somewhere else in its lane, flares up fast and dies down slowly. The back ones peek over the silhouette.
const FLAMES = [
  [-7, -30, -22, 12, 2, 0, true],
  [7, -32, -22, 13, 2, 0.5, true],
  [0, -36, -32, 11, 1, 0.25, true],
  [-5, -28, -10, 9, 2, 0.15, false],
  [5, -26, -8, 9, 2, 0.65, false],
  [-1, -20, -4, 8, 3, 0.4, false],
  [8, -18, -6, 7, 3, 0.8, false],
  [-8, -16, -4, 7, 2, 0.9, false],
];
const drop = h => (h <= -0.22 || h >= 1 ? 0 : (Math.sqrt(h + 0.22) * (1 - h) ** 1.3) / 0.494); // teardrop, widest = 1
const BANDS = [[0.86, 7], [0.7, 6], [0.53, 5], [0.37, 4], [0.23, 3], [0.1, 2]];

function flames(ph, s, back) {
  const list = [];
  FLAMES.forEach(([lane, y0, y1, H, k, off, b], j) => {
    if (b !== back) return;
    const v = ph * k + off, u = v % 1, c = Math.floor(v) % k;
    const size = u < 0.15 ? u / 0.15 : 1 - ((u - 0.15) / 0.85) ** 2; // flares up fast, dies down slowly
    const lick = 0.85 + 0.15 * Math.sin(TAU * (ph * 4 + j * 0.37)), h = H * size * lick; // whole cycles per loop
    if (h < 2.5) return; // any smaller, it would be a smudge
    list.push({ j, x: lane + (rand(j, c, s) - 0.5) * 3, y: y0 + (y1 - y0) * rand(j, c, s + 1), h, w: 1.4 + 2.1 * size });
  });
  return list.sort((a, b) => a.y - b.y); // lower flames in front of higher ones
}

function flame(p, C, f, ph, s, cool) {
  const { j, x, y, h, w } = f;
  p.shade(Math.floor(x - w - 3), Math.floor(y - h - 1), Math.ceil(2 * w + 6), Math.ceil(h + 3), (px, py) => {
    const cx = px + 0.5, cy = py + 0.5, v = (y - cy) / h;
    const sway = (loopNoise(cy * 0.2, ph * 3, 3, s + j * 17) - 0.5) * 5 * Math.max(0, v);
    const half = w * drop(v);
    if (half <= 0) return 0;
    const e = 1 - Math.abs(cx - x - sway) / half;
    if (e <= 0) return 0;
    const n = tileFbm(cy * 0.25 + ph * 8, cx * 0.25, 8, 2, s), rise = v > 0.1 ? 1.05 - 0.6 * (v - 0.1) : 1.05 - 2.5 * (0.1 - v);
    const heat = e * rise - (n - 0.4) * (0.15 + 1.1 * v * v) - cool;
    const band = BANDS.find(([min]) => heat > min);
    return band ? C[band[1]] : 0;
  });
  p.glow(x, y - h * 0.35, h * 0.9, C[5], 0.25);
}

export function drawBack(p, t, o) {
  const C = o.palette, S = o.smoke, s = o.seed, ph = t / meta.duration;
  const flick = 0.5 + 0.25 * Math.sin(TAU * (ph * 3 + 0.2)) + 0.25 * Math.sin(TAU * (ph * 7 + 0.6));
  p.glow(0, -20, 20, C[4], 0.22 + 0.08 * flick);
  p.glowLine(-12, 0, 12, 0, 5, C[4], (u, d) => (0.2 + 0.06 * flick) * Math.sin(Math.PI * u) * (1 - d) ** 2); // the floor, lit
  for (let j = 0; j < 4; j++) { // a little smoke off the top
    const u = (ph + j / 4) % 1, r = 1.8 + u * 2.7;
    const x = (j % 2 ? 4 : -4) + Math.sin(TAU * (u + j * 0.3)) * 2 + u * 3, y = -30 - u * 14;
    p.disc(x, y, r, (dx, dy) => S[dx + dy < -r * 0.4 ? 3 : 2], (dx, dy, d) => 0.35 * Math.sin(Math.PI * u) ** 1.5 * (1 - d * d));
  }
  for (const f of flames(ph, s, true)) flame(p, C, f, ph, s, 0.1);
}

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration;
  for (const f of flames(ph, s, false)) flame(p, C, f, ph, s, 0);
  for (let j = 0; j < 10; j++) { // embers, cooling as they rise
    const k = 1 + (j % 2), u = (ph * k + rand(j, s)) % 1;
    if (u > 0.8) continue;
    const x = (rand(j, s, 1) - 0.5) * 18 + Math.sin(TAU * (u * 2 + rand(j, s, 2))) * 2, y = -8 - rand(j, s, 3) * 20 - u * 20;
    const cool = u / 0.8 + (rand(j, Math.floor(u * 12), s) < 0.25 ? 0.3 : 0);
    p.px(x, y, C[cool < 0.3 ? 7 : cool < 0.6 ? 6 : cool < 0.9 ? 5 : 4]);
    p.light(x, y, C[5], 0.3 * (1 - u));
  }
}
