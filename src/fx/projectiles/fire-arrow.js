import { tileFbm, rand } from '../../core/index.js';
import { draw as arrow, meta as plain } from './arrow.js';

export const meta = {
  name: 'Fire arrow',
  desc: 'A burning arrow in flight: flames streaming back off a wrap behind the broadhead over the shaft, lighting it, embers peeling off into a trail that drifts up and cools',
  tags: ['projectile', 'arrow', 'bow', 'fire', 'burning', 'physical'],
  size: [60, 22],
  origin: [53, 12],
  duration: 0.4, // the arrow's, so its shaft loops with the flames
  loop: true,
  fps: 20,
  views: ['side', 'top'],
  top: { directions: 8 },
  ramps: { palette: 8, fletch: 8, wood: 6, steel: 6 },
  options: { palette: 'fire', fletch: 'blood', wood: 'dust', steel: 'stone', seed: 1 },
  sound: [...plain.sound, { t: 0, kind: 'crackle', gain: 0.4, pitch: 1.4 }], // the arrow's whistle over a small fire
};

const TAU = Math.PI * 2;
const WRAP = -5; // the burning wrap's center, behind the broadhead
const L = 12; // the longest tongue, back from the wrap
// Tongues off the back of the fire: rise at their end (seen from above, half of it, to either side), length, width
// at the root, waves per loop, phase, heat.
const TONGUES = [[-5, 1, 2.4, 2, 0, 0.95], [-2, 0.8, 1.8, 3, 0.4, 0.9], [1.5, 0.5, 1.3, 2, 0.7, 0.8]];
const BANDS = [[0.92, 7], [0.74, 6], [0.56, 5], [0.4, 4], [0.26, 3], [0.15, 2]];

export function draw(p, t, o) {
  const C = o.palette, s = o.seed, ph = t / meta.duration, top = o.view === 'top';
  const flick = 0.5 + 0.3 * Math.sin(TAU * (ph * 3 + 0.2)) + 0.2 * Math.sin(TAU * (ph * 5 + 0.6));

  p.glowLine(WRAP - L, -2, WRAP, 0, 6, C[5], (u, d) => 0.35 * u * (1 - d) ** 2);
  p.glow(WRAP, -1, 10, C[5], 0.4 + 0.15 * flick);

  arrow(p, t, { ...o, palette: o.fletch });

  // the fire: a ball round the wrap, rounder in front, drawn out behind, and tongues licking back off it with a wave
  // running down each; licks torn off their ends; noise streaming back two whole tiles a loop
  const wisps = [0, 1].map(j => {
    const u = (ph * 2 + j / 2) % 1;
    return { x: WRAP - 8 - u * 9, y: (top ? (j ? 2 : -2) : -2 - j) - u * (top ? 0 : 2), r: 1.8 * (1 - u) };
  });
  p.shade(WRAP - L - 4, -8, L + 7, 12, (x, y) => {
    const cx = x + 0.5, cy = y + 0.5, v = (WRAP - cx) / L, r = 3 + 0.3 * flick;
    let e = 1 - Math.hypot((cx - WRAP) / (cx > WRAP ? 0.7 : 1.4), (cy + 1) / 1.1) / r;
    for (const [rise, len, w, k, phase, hot] of TONGUES) {
      const u = v / len;
      if (u <= 0 || u >= 1) continue;
      const dy = top ? 0.5 * rise : rise, mid = -1 + dy * u ** 1.4 + Math.sin(TAU * (u * 1.2 - ph * k + phase)) * 1.1 * u;
      const half = w * (1 - u) ** 1.1;
      if (half > 0.55) e = Math.max(e, hot * (1 - Math.abs(cy - mid) / half));
    }
    for (const q of wisps) if (q.r > 0.9) e = Math.max(e, 0.9 * (1 - Math.hypot(cx - q.x, cy - q.y) / q.r));
    if (e <= 0) return 0;
    const n = tileFbm(cx * 0.2 + ph * 10, cy * 0.5, 5, 2, s);
    const heat = e * (1.2 - 0.6 * Math.max(0, v)) - (n - 0.45) * 0.35 * Math.min(1, e * 4);
    const band = BANDS.find(([min]) => heat > min);
    return band ? C[band[1]] : 0;
  });

  // embers peeling off the flames' ends: drag slows them in the air, so they fall back ever faster, rising and cooling
  for (let j = 0; j < 9; j++) {
    const u = (ph * (1 + (j % 2)) + rand(j, s)) % 1;
    if (u > 0.85) continue;
    const side = top ? (rand(j, s, 1) < 0.5 ? -1 : 1) : -1, wob = Math.sin(TAU * (u * 2 + rand(j, s, 2))) * 0.8;
    const x = WRAP - 6 - 36 * u ** 1.5, y = side * (1 + rand(j, s, 3) * 2 + 4 * u) + wob;
    const c = C[u < 0.2 ? 7 : u < 0.4 ? 6 : u < 0.65 ? 5 : 4];
    if (u < 0.25) p.line(x, y, x + 1, y, c);
    else p.dot(x, y, c, 1 - Math.max(0, u - 0.6) / 0.25);
    p.light(x, y, C[5], 0.4 * (1 - u));
  }
}
